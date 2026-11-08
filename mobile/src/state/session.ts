/** State that lives for the app session rather than one page. */
import { onAuthStateChanged } from 'firebase/auth';
import { AuthRepository } from '../data/authRepo';
import { emptyProfile, hasEverythingForPlan, isEmptyProfile, PlanCalculator, UserProfile } from '../data/profile';
import { ProfileRepository, profileStore } from '../data/profileRepo';
import { SocialRepository } from '../data/socialRepo';
import { StatsRepository } from '../data/statsRepo';
import { auth } from '../lib/firebase';
import { createStore } from '../lib/store';
import { Nav } from '../navigation/types';

// ---------------------------------------------------------------- Onboarding draft

/**
 * Holds the answers while someone moves through onboarding, so going back to a
 * previous page never loses what they typed. Saved to the account after each page,
 * so leaving the app halfway resumes where they stopped.
 */
export const draftStore = createStore<UserProfile>(emptyProfile());

// A different account must never see the previous person's answers.
let draftOwner: string | null = auth.currentUser?.uid ?? null;
onAuthStateChanged(auth, (user) => {
  const uid = user?.uid ?? null;
  if (uid !== draftOwner) {
    draftOwner = uid;
    draftStore.set(emptyProfile());
  }
});

export const Onboarding = {
  update(change: (p: UserProfile) => UserProfile) {
    draftStore.update(change);
  },
  /** Starts from what is already saved, e.g. a person who left onboarding halfway. */
  resumeFrom(saved: UserProfile | null) {
    if (saved && isEmptyProfile(draftStore.get())) draftStore.set(saved);
  },
  async saveProgress() {
    await ProfileRepository.save(draftStore.get());
  },
  async finish() {
    draftStore.update((p) => ({ ...p, onboardingComplete: true }));
    await ProfileRepository.save(draftStore.get());
  },
};

// ---------------------------------------------------------------- Feed side effects

let feedPrepared = false;
/** Run once per sign-in by the pages that show the feed (Home, Food, Profile). */
export async function prepareFeed(): Promise<void> {
  if (feedPrepared) return;
  feedPrepared = true;
  if (!profileStore.get()) await ProfileRepository.load();
  await SocialRepository.refreshMe().catch(() => null);
  if (!StatsRepository.syncedThisSession) {
    StatsRepository.syncedThisSession = true;
    await StatsRepository.syncMine().catch(() => undefined);
  }
}

/** Today's calorie and protein goals from the person's plan, or 0 if the profile isn't complete. */
export function targetsNow(p: UserProfile | null) {
  if (!hasEverythingForPlan(p)) return { calories: 0, protein: 0 };
  const t = PlanCalculator.nutrition(p);
  return { calories: t.calories, protein: t.proteinG };
}

// ---------------------------------------------------------------- Start and sign-out

export type StartPage = 'Welcome' | 'Main' | 'ChooseVersion';

/** Where a person lands when the app opens, from what is known about them. */
export function startFor(profile: UserProfile | null): StartPage {
  if (!AuthRepository.isSignedIn) return 'Welcome';
  if (profile?.onboardingComplete) return 'Main';
  return 'ChooseVersion'; // signed in but setup unfinished: resume it
}

/** Signs out and returns to Welcome with nothing behind it. */
export async function signOut(nav: Nav): Promise<void> {
  await AuthRepository.signOut();
  feedPrepared = false;
  draftStore.set(emptyProfile());
  nav.reset({ index: 0, routes: [{ name: 'Welcome' }] });
}
