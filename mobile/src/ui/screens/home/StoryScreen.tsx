/**
 * Full-screen story: someone's posts from the last 24 hours, one after the other.
 * Tap the right side for next, the left side for previous, hold to pause, swipe down to close.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isMeal } from '../../../data/social';
import { feedLive } from '../../../data/socialRepo';
import { useStore } from '../../../lib/store';
import { goBack, useNav, useParams } from '../../../navigation/types';
import { palette, withAlpha } from '../../theme';
import { haptics } from '../../haptics';
import { timeAgo } from '../../format';
import { Avatar, IconButton, T } from '../../components/core';
import { PostPicture } from '../../components/feed';
import { markStorySeen } from './HomeScreen';

const STORY_MS = 5_000;
const FRAME_MS = 50;
const STEP = FRAME_MS / STORY_MS;

export function StoryScreen() {
  const nav = useNav();
  const { uid } = useParams<'Story'>();
  const feed = useStore(feedLive);
  const { width } = useWindowDimensions();
  const [cutoff] = useState(() => Date.now() - 24 * 3600 * 1000);
  const posts = useMemo(() => feed.posts.filter((p) => p.uid === uid && p.createdAt.getTime() >= cutoff)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()), [feed.posts, uid, cutoff]);
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  // Progress of the current story, also read by the timer between renders.
  const progress = useRef(0);

  // Only close while this page is on top, so a tap and a timer firing together never pop twice.
  const close = () => { if (nav.isFocused()) goBack(nav); };
  const show = (i: number) => { progress.current = 0; setElapsed(0); setIndex(i); };
  const next = () => (index < posts.length - 1 ? show(index + 1) : close());
  const previous = () => show(Math.max(index - 1, 0));

  const post = posts[index];
  useEffect(() => { if (post) markStorySeen(post.id); }, [post]);

  // Timer for the current story; moves on (or closes) when it runs out.
  useEffect(() => {
    if (posts.length === 0 || paused) return;
    const id = setInterval(() => {
      progress.current += STEP;
      if (progress.current >= 1) {
        clearInterval(id);
        if (index < posts.length - 1) show(index + 1); else close();
      } else {
        setElapsed(progress.current);
      }
    }, FRAME_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, posts.length, paused]);

  const [swipe] = useState(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderRelease: (_, g) => { if (g.dy > 40) close(); },
  }));

  // Meals without a photo already show their name on the cover.
  const caption = post && !(isMeal(post) && !post.photo) && post.description.trim() ? post.description : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.overlayBackground }} {...swipe.panHandlers}>
      <Pressable
        style={{ flex: 1 }}
        onPress={(e) => { haptics.tick(); if (e.nativeEvent.locationX > width / 3) next(); else previous(); }}
        onLongPress={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
        delayLongPress={200}
        accessibilityLabel="Story. Tap right for next, left for previous."
      >
        {post && (
          // Tall, rounded card filling the screen under the header, like a phone-sized story.
          <View style={{ position: 'absolute', top: 76, bottom: caption ? 88 : 16, left: 0, right: 0, borderRadius: 16, overflow: 'hidden' }}>
            <PostPicture post={post} style={{ flex: 1 }} />
          </View>
        )}

        <View style={{ paddingTop: 12 }}>
          {/* One bar per post: full for seen, filling for the current one, empty for the rest. */}
          <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: 8 }}>
            {posts.map((p, i) => {
              const fill = i < index ? 1 : i === index ? Math.min(Math.max(elapsed, 0), 1) : 0;
              return (
                <View key={p.id} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: withAlpha(palette.overlayText, 0.35), overflow: 'hidden' }}>
                  <View style={{ width: `${fill * 100}%`, height: 3, backgroundColor: palette.overlayText }} />
                </View>
              );
            })}
          </View>
          {post && (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 4, paddingTop: 10 }}>
              <Avatar name={post.authorName} seed={post.uid} size={34} />
              <T v="titleS" color={palette.overlayText} style={{ marginLeft: 10 }}>{post.authorName}</T>
              <T v="bodyS" color={withAlpha(palette.overlayText, 0.7)} style={{ flex: 1 }}>{'  '}{timeAgo(post.createdAt.getTime(), true)}</T>
              <IconButton name="close" label="Close" color={palette.overlayText} onPress={close} />
            </View>
          )}
        </View>

        {caption && (
          <T v="body" color={palette.overlayText} lines={2} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 26 }}>
            {caption}
          </T>
        )}
      </Pressable>
    </SafeAreaView>
  );
}
