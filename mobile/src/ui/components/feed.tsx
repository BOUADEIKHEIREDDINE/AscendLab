/** Posts in the feed, their covers, and the daily race. */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, Pressable, Share, StyleProp, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MealPhotos } from '../../data/mealPhotos';
import { formatKcal } from '../../data/profile';
import { profileStore } from '../../data/profileRepo';
import { FeedPost, gapLabel, isMeal, isOnTarget, MEAL, plural, Standing } from '../../data/social';
import { WorkoutInfo, WorkoutMath } from '../../data/training';
import { useStore } from '../../lib/store';
import { c, colors, Gutter, withAlpha } from '../theme';
import { haptics } from '../haptics';
import { timeAgo } from '../format';
import { Avatar, Icon, IconButton, SectionTitle, T } from './core';
import { ActionMenu } from './overlays';

export function MealPhoto({ photo, style }: { photo: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: c.surfaceContainer, overflow: 'hidden' }, style]}>
      <Image source={{ uri: MealPhotos.uri(photo) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel="Meal photo" />
    </View>
  );
}

/** Cover for a meal without a photo: the calories big, the food and macros under it. */
export function MealCover({ post, style }: { post: FeedPost; style?: StyleProp<ViewStyle> }) {
  const macros = [
    post.protein > 0 && `Protein ${post.protein} g`,
    post.carbs > 0 && `Carbs ${post.carbs} g`,
    post.fat > 0 && `Fat ${post.fat} g`,
  ].filter(Boolean) as string[];
  return (
    <LinearGradient colors={['#1C3A3A', '#101820', '#2A2420']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[{ alignItems: 'center', justifyContent: 'center', padding: 28 }, style]}>
      <T v="labelLarge" color={c.primary} style={{ letterSpacing: 2 }}>{MEAL[post.mealType].label.toUpperCase()}</T>
      <T v="displayLarge" color="#FFFFFF">{formatKcal(post.calories)}</T>
      <T v="titleMedium" color={withAlpha('#FFFFFF', 0.7)}>kcal</T>
      {post.description.trim() ? <T v="titleMedium" color="#FFFFFF" center lines={2} style={{ marginTop: 18 }}>{post.description}</T> : null}
      {macros.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          {macros.map((m) => (
            <View key={m} style={{ backgroundColor: withAlpha('#FFFFFF', 0.12), borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
              <T v="labelMedium" color="#FFFFFF">{m}</T>
            </View>
          ))}
        </View>
      )}
    </LinearGradient>
  );
}

function CoverStat({ value, label, flex, color = '#FFFFFF' }: { value: string; label: string; flex: number; color?: string }) {
  return (
    <View style={{ flex }}>
      <T v="titleLarge" color={color} lines={1}>{value}</T>
      <T v="labelMedium" color={withAlpha('#FFFFFF', 0.7)}>{label}</T>
    </View>
  );
}

/** Cover for a workout: title, the numbers that matter, and the main exercises. */
export function WorkoutCover({ w, style }: { w: WorkoutInfo; style?: StyleProp<ViewStyle> }) {
  const units = useStore(profileStore)?.units ?? 'METRIC';
  return (
    <LinearGradient colors={['#15302B', '#101820', '#1C2934']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[{ padding: 24, justifyContent: 'space-between' }, style]}>
      <View>
        <T v="labelLarge" color={c.primary} style={{ letterSpacing: 2 }}>WORKOUT</T>
        <T v="headlineMedium" color="#FFFFFF" lines={2}>{w.title}</T>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <CoverStat value={WorkoutMath.formatDuration(w.durationSec)} label="time" flex={1} />
        <CoverStat value={WorkoutMath.formatVolume(w.volumeKg, units)} label="volume" flex={1.3} />
        <CoverStat value={`${w.sets}`} label="sets" flex={0.7} />
        {w.records > 0 && <CoverStat value={`${w.records}`} label={w.records === 1 ? 'record' : 'records'} flex={0.9} color={colors.apricot} />}
      </View>
      <View style={{ gap: 6 }}>
        {w.exercises.slice(0, 4).map((line, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <T color="#FFFFFF" lines={1} style={{ flex: 1 }}>{line.sets} × {line.name}</T>
            <T v="bodySmall" color={withAlpha('#FFFFFF', 0.7)}>{line.best}</T>
          </View>
        ))}
        {w.exercises.length > 4 && <T v="bodySmall" color={withAlpha('#FFFFFF', 0.7)}>+ {w.exercises.length - 4} more</T>}
      </View>
    </LinearGradient>
  );
}

/** The post's picture: the photo, the workout cover, or the meal cover. */
export function PostPicture({ post, style }: { post: FeedPost; style?: StyleProp<ViewStyle> }) {
  if (post.photo) return <MealPhoto photo={post.photo} style={style} />;
  if (post.workout) return <WorkoutCover w={post.workout} style={style} />;
  return <MealCover post={post} style={style} />;
}

function sharePost(post: FeedPost) {
  const w = post.workout;
  const text = w
    ? `${post.authorName} finished "${w.title}" on AscendLab: ${WorkoutMath.formatDuration(w.durationSec)}, ${w.sets} sets` +
      (w.records > 0 ? `, ${w.records} personal records!` : '.')
    : `${post.authorName} logged ${MEAL[post.mealType].label.toLowerCase()} on AscendLab: ${post.description.trim() || 'a meal'}, ${post.calories} kcal.`;
  Share.share({ message: text }).catch(() => undefined);
}

/**
 * One post, laid out like a photo feed: author row, a square picture edge to edge,
 * actions, likes, caption, comments, time. Double-tap the picture to like.
 */
export function PostCard({ post, myUid, onLike, onDelete, onComment, style }: {
  post: FeedPost; myUid: string | null; onLike: () => void; onDelete: () => void; onComment?: () => void; style?: StyleProp<ViewStyle>;
}) {
  const liked = myUid != null && post.likes.includes(myUid);
  const [menu, setMenu] = useState(false);
  const burst = useState(() => new Animated.Value(0))[0];
  const heart = useState(() => new Animated.Value(liked ? 1.15 : 1))[0];
  const lastTap = useRef(0);
  const native = Platform.OS !== 'web';

  useEffect(() => {
    Animated.spring(heart, { toValue: liked ? 1.15 : 1, bounciness: 18, useNativeDriver: native }).start();
  }, [liked, heart, native]);

  const onPicturePress = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) onLike();
      haptics.confirm();
      burst.setValue(0);
      Animated.sequence([
        Animated.spring(burst, { toValue: 1, bounciness: 12, useNativeDriver: native }),
        Animated.delay(450),
        Animated.timing(burst, { toValue: 0, duration: 200, useNativeDriver: native }),
      ]).start();
    }
    lastTap.current = now;
  };

  const caption = isMeal(post) && !post.photo ? '' : post.description;
  return (
    <View style={[{ paddingBottom: 16 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 4, paddingTop: 6, paddingBottom: 8 }}>
        <Avatar name={post.authorName} seed={post.uid} size={34} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <T v="titleSmall" lines={1}>{post.authorName}</T>
          <T v="bodySmall" color={c.onSurfaceVariant}>{post.workout ? 'Workout' : MEAL[post.mealType].label}</T>
        </View>
        {post.uid === myUid && <IconButton name="more-horiz" label="More" onPress={() => setMenu(true)} />}
      </View>

      <Pressable onPress={onPicturePress} accessibilityLabel="Post picture. Double-tap to like." style={{ width: '100%', aspectRatio: 1 }}>
        <PostPicture post={post} style={{ width: '100%', height: '100%' }} />
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', opacity: burst, transform: [{ scale: burst }] }}>
          <Icon name="favorite" size={96} color={withAlpha('#FFFFFF', 0.9)} />
        </Animated.View>
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 4, paddingRight: 12 }}>
        <Pressable
          onPress={() => { if (liked) haptics.tick(); else haptics.confirm(); onLike(); }}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Unlike' : 'Like'}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Animated.View style={{ transform: [{ scale: heart }] }}>
            <Icon name={liked ? 'favorite' : 'favorite-border'} size={26} color={liked ? colors.like : c.onSurface} />
          </Animated.View>
        </Pressable>
        {onComment && <IconButton name="mc:comment-outline" label="Comment" onPress={() => { haptics.tick(); onComment(); }} />}
        <IconButton name="send" label="Share" onPress={() => { haptics.tick(); sharePost(post); }} />
        <View style={{ flex: 1 }} />
        {isMeal(post) && post.photo && (
          // With a photo the numbers aren't on the picture, so they sit here.
          <T v="labelLarge">
            <T v="labelLarge" color={c.primary}>{formatKcal(post.calories)} kcal</T>
            {post.protein > 0 ? <T v="labelLarge" color={c.onSurfaceVariant}>  ·  {post.protein} g protein</T> : null}
          </T>
        )}
      </View>

      <View style={{ paddingHorizontal: 14, gap: 4 }}>
        {post.likes.length > 0 && <T v="titleSmall">{post.likes.length} {plural(post.likes.length, 'like')}</T>}
        {caption.trim() ? (
          <T>
            <T style={{ fontWeight: '600' }}>{post.authorName}</T>
            {'  '}{caption}
          </T>
        ) : null}
        {onComment && post.commentCount > 0 && (
          <T color={c.onSurfaceVariant} onPress={onComment}>
            {post.commentCount === 1 ? 'View 1 comment' : `View all ${post.commentCount} comments`}
          </T>
        )}
        <T v="labelSmall" color={c.onSurfaceVariant}>{timeAgo(post.createdAt.getTime())}</T>
      </View>

      <ActionMenu visible={menu} onDismiss={() => setMenu(false)} items={[{ label: 'Delete', icon: 'delete-outline', danger: true, onPress: onDelete }]} />
    </View>
  );
}

/** The daily race: whoever lands closest to their own calorie goal wins the day. */
export function RaceCard({ today, yesterdayWinner, myUid }: { today: Standing[]; yesterdayWinner: Standing | null; myUid: string | null }) {
  return (
    <View>
      <SectionTitle text="Closest to goal today" />
      {yesterdayWinner && (
        <T v="bodySmall" color={colors.apricot} style={{ paddingHorizontal: Gutter, paddingVertical: 2 }}>
          Yesterday: {yesterdayWinner.uid === myUid ? 'you' : yesterdayWinner.name} won, {gapLabel(yesterdayWinner.eaten - yesterdayWinner.target)}
        </T>
      )}
      {today.length === 0 && <T color={c.onSurfaceVariant} style={{ paddingHorizontal: Gutter, paddingVertical: 10 }}>No meals logged yet today.</T>}
      {today.map((s, i) => {
        const isMe = s.uid === myUid;
        const gap = s.eaten - s.target;
        return (
          <View key={s.uid} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Gutter, paddingVertical: 8 }}>
            <T v="titleMedium" color={i === 0 ? colors.apricot : c.onSurfaceVariant} style={{ width: 22 }}>{i + 1}</T>
            <Avatar name={s.name} seed={s.uid} size={32} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <T v="bodyLarge" lines={1} style={isMe && { fontWeight: '600' }}>{isMe ? 'You' : s.name}</T>
              <T v="bodySmall" color={c.onSurfaceVariant}>{formatKcal(s.eaten)} of {formatKcal(s.target)} kcal</T>
            </View>
            <T v="labelLarge" color={isOnTarget(gap) ? c.primary : c.onSurfaceVariant}>{gapLabel(gap)}</T>
          </View>
        );
      })}
    </View>
  );
}
