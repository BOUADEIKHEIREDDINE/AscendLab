/**
 * Friends and the meal feed, in Firestore:
 *  - `publicProfiles/{uid}`: name, friend code and friend list.
 *  - `friendCodes/{code}`: points a friend code to its owner, so a code is all you need to add someone.
 *  - `posts/{id}`: one logged meal or workout, readable by its `audience` (the author and
 *    their friends at posting time; see firestore.rules).
 */
import {
  arrayRemove, arrayUnion, collection, deleteDoc, doc, DocumentSnapshot, getDoc, getDocs, increment,
  limit, onSnapshot, orderBy, query, runTransaction, setDoc, Timestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { auth, background, currentUid, db } from '../lib/firebase';
import { firestoreMessage, friendly } from '../lib/errors';
import { createLive, createStore } from '../lib/store';
import { hasEverythingForPlan, PlanCalculator } from './profile';
import { profileStore } from './profileRepo';
import { Comment, Days, FeedPost, isMeal, MealType, postFromMap, PublicProfile } from './social';
import { StatsRepository } from './statsRepo';
import { WorkoutInfo } from './training';

const PROFILES = 'publicProfiles';
const CODES = 'friendCodes';
const POSTS = 'posts';
export const MAX_FRIENDS = 30;
const FEED_DAYS = 7;
const RETRY_MS = 15_000;
// No 0/O or 1/I, so codes read out loud or typed by hand don't get mixed up.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** The feed as the screen sees it: posts, or why they couldn't be loaded. */
export interface FeedState { posts: FeedPost[]; loading: boolean; error: string | null }

/** The signed-in person's public profile. */
export const meStore = createStore<PublicProfile | null>(null);

function toProfile(d: DocumentSnapshot): PublicProfile {
  const friends = d.get('friends');
  return {
    uid: d.id,
    name: d.get('name') ?? 'Someone',
    code: d.get('code') ?? '',
    friends: Array.isArray(friends) ? friends.filter((x) => typeof x === 'string') : [],
  };
}

function defaultName(): string {
  const user = auth.currentUser;
  const display = user?.displayName?.trim();
  if (display) return display.slice(0, 30);
  const local = (user?.email ?? '').split('@')[0].replace(/[._\-0-9]+/g, ' ').trim();
  const words = local.split(' ').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  return (words || 'Ascender').slice(0, 30);
}

async function reserveCode(owner: string): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
    const ref = doc(db, CODES, code);
    const taken = await runTransaction(db, async (tx) => {
      if ((await tx.get(ref)).exists()) return true;
      tx.set(ref, { uid: owner });
      return false;
    });
    if (!taken) return code;
  }
  throw new Error("Couldn't create a friend code. Please try again.");
}

function postsFrom(docs: { id: string; data(): Record<string, unknown> }[]): FeedPost[] {
  return docs.flatMap((d) => {
    const p = postFromMap(d.id, d.data());
    return p ? [p] : [];
  });
}

/** Live feed: the last week of posts from the signed-in person and their friends, newest first. */
export const feedLive = createLive<FeedState>({ posts: [], loading: true, error: null }, (emit) => {
  const uid = currentUid();
  if (!uid) { emit({ posts: [], loading: false, error: null }); return () => undefined; }
  const since = Timestamp.fromMillis(Date.now() - FEED_DAYS * 24 * 3600 * 1000);
  const q = query(collection(db, POSTS), where('audience', 'array-contains', uid),
    where('createdAt', '>=', since), orderBy('createdAt', 'desc'), limit(200));
  let unsubscribe: (() => void) | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let last: FeedPost[] = [];
  // A failed listener stops for good, so it is restarted after a pause (e.g. while the
  // server index is still building, or after a network hiccup).
  const listen = () => {
    unsubscribe = onSnapshot(q, (snap) => {
      last = postsFrom(snap.docs);
      emit({ posts: last, loading: false, error: null });
    }, (e) => {
      emit({ posts: last, loading: false, error: firestoreMessage(e) });
      retry = setTimeout(listen, RETRY_MS);
    });
  };
  listen();
  return () => { if (retry) clearTimeout(retry); unsubscribe?.(); };
});

/** The signed-in person's posts, newest first (for the profile grid); null while loading. */
export const myPostsLive = createLive<FeedPost[] | null>(null, (emit) => {
  const uid = currentUid();
  if (!uid) { emit([]); return () => undefined; }
  // Sorted on the phone: ordering in the query would need another server index.
  const q = query(collection(db, POSTS), where('uid', '==', uid), limit(90));
  return onSnapshot(q, (snap) => {
    emit(postsFrom(snap.docs).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
  }, () => emit([]));
});

/** One post by id (live), for posts older than the feed's window. */
export function listenPost(postId: string, emit: (p: FeedPost | null) => void): () => void {
  return onSnapshot(doc(db, POSTS, postId), (snap) => {
    const data = snap.data();
    emit(data ? postFromMap(snap.id, data) : null);
  }, () => emit(null));
}

export function listenComments(postId: string, emit: (c: Comment[] | null) => void): () => void {
  const q = query(collection(db, POSTS, postId, 'comments'), orderBy('createdAt'), limit(300));
  return onSnapshot(q, (snap) => {
    emit(snap.docs.flatMap((d) => {
      const uid = d.get('uid');
      if (typeof uid !== 'string') return [];
      const created = d.get('createdAt');
      return [{
        id: d.id,
        uid,
        authorName: d.get('authorName') ?? 'Someone',
        text: d.get('text') ?? '',
        photo: d.get('photo') ?? null,
        createdAt: created instanceof Timestamp ? created.toDate() : new Date(),
      }];
    }));
  }, () => emit([]));
}

export const SocialRepository = {
  get uid() { return currentUid(); },

  /** Loads (or on first use creates) the signed-in person's public profile and friend code. */
  async ensureMe(): Promise<PublicProfile | null> {
    const uid = currentUid();
    if (!uid) return null;
    const cached = meStore.get();
    if (cached && cached.uid === uid) return cached;
    const existing = await getDoc(doc(db, PROFILES, uid));
    if (existing.exists()) {
      const p = toProfile(existing);
      meStore.set(p);
      return p;
    }
    const code = await reserveCode(uid);
    const profile: PublicProfile = { uid, name: defaultName(), code, friends: [] };
    await setDoc(doc(db, PROFILES, uid), { name: profile.name, code, friends: [] });
    meStore.set(profile);
    return profile;
  },

  async rename(name: string): Promise<void> {
    const me = await SocialRepository.ensureMe();
    if (!me) return;
    const clean = name.trim().slice(0, 30);
    if (!clean) return;
    await updateDoc(doc(db, PROFILES, me.uid), { name: clean });
    meStore.set({ ...me, name: clean });
  },

  /** Adds a friend from their code. Friendship goes both ways, in a single write. Returns an error or null. */
  addFriend(rawCode: string): Promise<string | null> {
    return friendly(async () => {
      const me = await SocialRepository.ensureMe();
      if (!me) return "You're not signed in.";
      const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (code.length !== 6) return 'A friend code has 6 characters.';
      if (code === me.code) return "That's your own code. Share it with a friend instead.";
      if (me.friends.length >= MAX_FRIENDS) return `You can have up to ${MAX_FRIENDS} friends.`;
      const friendUid = (await getDoc(doc(db, CODES, code))).get('uid');
      if (typeof friendUid !== 'string') return 'No one has this code. Check it and try again.';
      if (me.friends.includes(friendUid)) return "You're already friends.";
      const batch = writeBatch(db);
      batch.update(doc(db, PROFILES, me.uid), { friends: arrayUnion(friendUid) });
      batch.update(doc(db, PROFILES, friendUid), { friends: arrayUnion(me.uid) });
      await batch.commit();
      meStore.set({ ...me, friends: [...me.friends, friendUid] });
      return null;
    });
  },

  async removeFriend(friendUid: string): Promise<void> {
    const me = await SocialRepository.ensureMe();
    if (!me) return;
    const batch = writeBatch(db);
    batch.update(doc(db, PROFILES, me.uid), { friends: arrayRemove(friendUid) });
    batch.update(doc(db, PROFILES, friendUid), { friends: arrayRemove(me.uid) });
    await batch.commit();
    meStore.set({ ...me, friends: me.friends.filter((f) => f !== friendUid) });
  },

  /** Re-reads the friend list, since friends can add or remove us from their side. */
  async refreshMe(): Promise<PublicProfile | null> {
    const uid = currentUid();
    if (!uid) return null;
    const snap = await getDoc(doc(db, PROFILES, uid)).catch(() => null);
    if (!snap || !snap.exists()) return SocialRepository.ensureMe();
    const p = toProfile(snap);
    meStore.set(p);
    return p;
  },

  async friendProfiles(): Promise<PublicProfile[]> {
    const me = await SocialRepository.refreshMe();
    if (!me) return [];
    const loaded = await Promise.all(me.friends.map((id) => getDoc(doc(db, PROFILES, id)).catch(() => null)));
    return loaded.filter((d): d is DocumentSnapshot => !!d && d.exists()).map(toProfile)
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  },

  /**
   * Logs a meal and shares it with friends. The write goes to the local cache at once,
   * so the post appears instantly and syncs when the phone is online.
   */
  logMeal(type: MealType, description: string, calories: number, protein: number, carbs: number, fat: number, photo: string | null): Promise<string | null> {
    return friendly(async () => {
      const me = await SocialRepository.refreshMe();
      if (!me) return "You're not signed in.";
      const p = profileStore.get();
      const plan = hasEverythingForPlan(p) ? PlanCalculator.nutrition(p) : null;
      const ref = doc(collection(db, POSTS));
      background(setDoc(ref, {
        uid: me.uid,
        authorName: me.name,
        audience: [me.uid, ...me.friends],
        dayKey: Days.key(),
        mealType: type,
        description: description.trim(),
        calories,
        target: plan?.calories ?? 0,
        protein,
        proteinTarget: plan?.proteinG ?? 0,
        carbs,
        fat,
        photo,
        likes: [],
        createdAt: Timestamp.now(),
      }));
      StatsRepository.addCalories(Days.key(), calories);
      return null;
    });
  },

  /** Shares a finished workout with friends. */
  publishWorkout(info: WorkoutInfo, caption: string): Promise<string | null> {
    return friendly(async () => {
      const me = await SocialRepository.refreshMe();
      if (!me) return "You're not signed in.";
      background(setDoc(doc(collection(db, POSTS)), {
        kind: 'workout',
        uid: me.uid,
        authorName: me.name,
        audience: [me.uid, ...me.friends],
        dayKey: Days.key(),
        title: info.title.slice(0, 60),
        description: caption.trim().slice(0, 300),
        durationSec: Math.trunc(info.durationSec),
        volumeKg: Math.trunc(info.volumeKg),
        sets: info.sets,
        records: info.records,
        exercises: info.exercises.slice(0, 40).map((x) => ({ name: x.name.slice(0, 60), sets: x.sets, best: x.best.slice(0, 30) })),
        likes: [],
        createdAt: Timestamp.now(),
      }));
      return null;
    });
  },

  /** Adds a comment and bumps the post's comment count in one write. Returns an error or null. */
  addComment(post: FeedPost, text: string, photo: string | null): Promise<string | null> {
    return friendly(async () => {
      const me = await SocialRepository.ensureMe();
      if (!me) return "You're not signed in.";
      const postRef = doc(db, POSTS, post.id);
      const batch = writeBatch(db);
      batch.set(doc(collection(postRef, 'comments')), {
        uid: me.uid,
        authorName: me.name,
        text: text.trim().slice(0, 500),
        photo,
        createdAt: Timestamp.now(),
      });
      batch.update(postRef, { commentCount: increment(1) });
      background(batch.commit());
      return null;
    });
  },

  deleteComment(post: FeedPost, comment: Comment): void {
    const postRef = doc(db, POSTS, post.id);
    const batch = writeBatch(db);
    batch.delete(doc(postRef, 'comments', comment.id));
    batch.update(postRef, { commentCount: increment(-1) });
    background(batch.commit());
  },

  toggleLike(post: FeedPost): void {
    const uid = currentUid();
    if (!uid) return;
    const change = post.likes.includes(uid) ? arrayRemove(uid) : arrayUnion(uid);
    background(updateDoc(doc(db, POSTS, post.id), { likes: change }));
  },

  deletePost(post: FeedPost): void {
    background(deleteDoc(doc(db, POSTS, post.id)));
    if (isMeal(post) && post.uid === currentUid()) StatsRepository.addCalories(post.dayKey, -post.calories);
  },

  /** Removes everything social about the signed-in person (used when deleting the account). */
  async deleteCurrent(): Promise<void> {
    const uid = currentUid();
    if (!uid) return;
    const mine = await getDocs(query(collection(db, POSTS), where('uid', '==', uid)));
    for (let i = 0; i < mine.docs.length; i += 400) {
      const batch = writeBatch(db);
      mine.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    const profileDoc = await getDoc(doc(db, PROFILES, uid));
    if (profileDoc.exists()) {
      const me = toProfile(profileDoc);
      for (const friend of me.friends) {
        await updateDoc(doc(db, PROFILES, friend), { friends: arrayRemove(uid) }).catch(() => undefined);
      }
      await deleteDoc(doc(db, CODES, me.code)).catch(() => undefined);
      await deleteDoc(profileDoc.ref);
    }
    meStore.set(null);
  },

  clearSession(): void {
    meStore.set(null);
  },
};
