import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, View } from 'react-native';
import { profileStore } from '../../../data/profileRepo';
import { Days, FeedPost, isMeal } from '../../../data/social';
import { feedLive, meStore, SocialRepository } from '../../../data/socialRepo';
import { createStore, useNow, useStore } from '../../../lib/store';
import { useNav } from '../../../navigation/types';
import { prepareFeed, targetsNow } from '../../../state/session';
import { palette, Gutter, space, tone } from '../../theme';
import { Avatar, EmptyState, Icon, IconButton, PressableScale, Screen, SkeletonCard, T, Tile } from '../../components/core';
import { StoryRing } from '../../components/progress';
import { ExpressiveShape } from '../../shapes/ExpressiveShape';
import { BottomSheet } from '../../components/overlays';
import { PostCard, RaceCard } from '../../components/feed';

/** Posts already watched as stories in this session, so their ring turns grey. */
export const storySeen = createStore<Set<string>>(new Set());
export const markStorySeen = (id: string) => {
  if (!storySeen.get().has(id)) storySeen.set(new Set([...storySeen.get(), id]));
};

const DAY_MS = 24 * 3600 * 1000;

/** Someone in the stories row: their posts from the last 24 hours and how their day is going. */
interface StoryPerson { uid: string; name: string; posts: FeedPost[]; eaten: number; target: number; avatarName: string }

export function HomeScreen() {
  const nav = useNav();
  const feed = useStore(feedLive);
  const me = useStore(meStore);
  const profile = useStore(profileStore); // re-render when the goal changes
  const seen = useStore(storySeen);
  const [raceOpen, setRaceOpen] = useState(false);
  const myUid = me?.uid ?? SocialRepository.uid;
  const now = useNow();
  const today = Days.key(new Date(now));
  const myTarget = targetsNow(profile).calories;

  useEffect(() => { prepareFeed(); }, []);

  const standings = useMemo(() => Days.standings(feed.posts, today), [feed.posts, today]);
  const yesterday = useMemo(() => Days.standings(feed.posts, Days.yesterday()), [feed.posts]);

  // Stories: you first, then friends who posted in the last 24 hours, most recent first.
  const stories = useMemo<StoryPerson[]>(() => {
    const cutoff = now - DAY_MS;
    const byUid = new Map<string, FeedPost[]>();
    feed.posts.filter((p) => p.createdAt.getTime() >= cutoff).forEach((p) => byUid.set(p.uid, [...(byUid.get(p.uid) ?? []), p]));
    const asc = (list: FeedPost[]) => [...list].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const eatenToday = (list: FeedPost[]) => list.filter((p) => isMeal(p) && p.dayKey === today).reduce((a, p) => a + p.calories, 0);
    const mine: StoryPerson[] = myUid ? [{
      uid: myUid, name: 'Your story', posts: asc(byUid.get(myUid) ?? []),
      eaten: eatenToday(feed.posts.filter((p) => p.uid === myUid)), target: myTarget, avatarName: me?.name ?? 'You',
    }] : [];
    const others = [...byUid.entries()].filter(([uid]) => uid !== myUid).map(([uid, posts]) => ({
      uid, name: posts[0].authorName, posts: asc(posts), eaten: eatenToday(posts),
      target: Math.max(...posts.map((p) => p.target)), avatarName: posts[0].authorName,
    })).sort((a, b) => b.posts[b.posts.length - 1].createdAt.getTime() - a.posts[a.posts.length - 1].createdAt.getTime());
    return [...mine, ...others];
  }, [feed.posts, myUid, myTarget, me?.name, today, now]);

  const header = (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: Gutter, paddingRight: Gutter - 4, paddingTop: 10, paddingBottom: 4, gap: 6 }}>
        <Image source={require('../../../../assets/logo.png')} style={{ height: 24, width: 24 * (1200 / 219) }} resizeMode="contain" accessibilityLabel="AscendLab" />
        <View style={{ flex: 1 }} />
        <IconButton variant="tonal" name="add" label="Log a meal" onPress={() => nav.navigate('CreatePost')} />
        <IconButton variant="tonal" name="mc:trophy-outline" label="Today's race" onPress={() => setRaceOpen(true)} />
        <IconButton variant="tonal" name="person-add-alt" label="Friends" onPress={() => nav.navigate('Friends')} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Gutter - 4, paddingVertical: 10, gap: 12 }}>
        {stories.map((p) => (
          <StoryBubble
            key={p.uid}
            person={p}
            isMe={p.uid === myUid}
            allSeen={p.posts.length > 0 && p.posts.every((x) => seen.has(x.id))}
            onPress={() => (p.posts.length === 0 ? nav.navigate('CreatePost') : nav.navigate('Story', { uid: p.uid }))}
            onAdd={() => nav.navigate('CreatePost')}
          />
        ))}
      </ScrollView>
      {me != null && me.friends.length === 0 && (
        <Tile span="2x1" onPress={() => nav.navigate('Friends')} label="Find your friends"
          style={{ marginHorizontal: Gutter, marginVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <ExpressiveShape shape="clover" size={48} fill={tone(palette.lime, 0.16)}>
            <Icon name="person-add-alt" color={palette.lime} />
          </ExpressiveShape>
          <View style={{ flex: 1 }}>
            <T v="titleS">Find your friends</T>
            <T v="bodyS" color={palette.textMuted}>See their meals and workouts here, and race to your goals.</T>
          </View>
          <Icon name="chevron-right" color={palette.textMuted} />
        </Tile>
      )}
      {feed.error && <T color={palette.error} style={{ paddingHorizontal: Gutter, paddingVertical: 12 }}>{feed.error}</T>}
      {feed.loading && <><SkeletonCard /><SkeletonCard /></>}
      {!feed.loading && feed.posts.length === 0 && !feed.error && (
        <EmptyState icon="dynamic-feed" shape="clover" title="Welcome to your feed" hint="Meals and workouts from you and your friends show up here." />
      )}
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={feed.loading ? [] : feed.posts}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            myUid={myUid}
            onLike={() => SocialRepository.toggleLike(item)}
            onDelete={() => SocialRepository.deletePost(item)}
            onComment={() => nav.navigate('Comments', { postId: item.id })}
            style={{ marginTop: space.tileGap }}
          />
        )}
      />
      <BottomSheet visible={raceOpen} onDismiss={() => setRaceOpen(false)}>
        <RaceCard today={standings} yesterdayWinner={yesterday.length > 1 ? yesterday[0] : null} myUid={myUid} />
        <T v="bodyS" color={palette.textMuted} style={{ paddingHorizontal: Gutter, paddingVertical: 12 }}>
          Whoever ends the day closest to their own calorie goal wins.
        </T>
      </BottomSheet>
    </Screen>
  );
}

/**
 * A story circle. The ring fills with how close the person is to today's calorie goal and
 * turns grey once you've watched all their posts. Yours has a + to log a meal.
 */
function StoryBubble({ person, isMe, allSeen, onPress, onAdd }: {
  person: StoryPerson; isMe: boolean; allSeen: boolean; onPress: () => void; onAdd: () => void;
}) {
  const progress = person.target > 0 ? Math.min(person.eaten / person.target, 1) : 0;
  const fresh = person.target > 0 && person.eaten > person.target ? palette.ember : palette.lime;
  return (
    <View style={{ width: 78 }}>
      <PressableScale onPress={onPress} style={{ width: 78, alignItems: 'center' }}
        label={`${person.name}, ${person.eaten} of ${person.target} kilocalories today`}>
        <StoryRing size={74} progress={person.posts.length === 0 ? 0 : Math.max(progress, 0.04)} color={fresh} seen={allSeen}>
          <Avatar name={person.avatarName} seed={person.uid} size={58} />
        </StoryRing>
        <T v="label" lines={1} style={{ marginTop: 4 }}>{isMe ? person.name : person.name.split(' ')[0]}</T>
      </PressableScale>
      {/* The + is a sibling of the bubble, placed over its corner, not nested in it. */}
      {isMe && (
        <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel="Log a meal" hitSlop={6}
          style={{ position: 'absolute', left: 2 + 74 - 26, top: 74 - 26, width: 26, height: 26, borderRadius: 13, backgroundColor: palette.ink, padding: 2 }}>
          <View style={{ flex: 1, borderRadius: 11, backgroundColor: palette.lime, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="add" size={16} color={palette.onLime} />
          </View>
        </Pressable>
      )}
    </View>
  );
}
