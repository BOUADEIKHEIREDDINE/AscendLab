/** Posts in the feed, their covers, and the daily race (DESIGN_SYSTEM §6.10). */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, Share, StyleProp, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MealPhotos } from '../../data/mealPhotos';
import { formatKcal } from '../../data/profile';
import { profileStore } from '../../data/profileRepo';
import { FeedPost, gapLabel, isMeal, isOnTarget, MEAL, plural, Standing } from '../../data/social';
import { WorkoutInfo, WorkoutMath } from '../../data/training';
import { useStore } from '../../lib/store';
import { coverGradient, data, palette, radius, space, tone } from '../theme';
import { haptics } from '../haptics';
import { nativeDriver, springTo } from '../motion';
import { timeAgo } from '../format';
import { ExpressiveShape } from '../shapes/ExpressiveShape';
import { mealShape, workoutShape } from '../shapes/library';
import { Avatar, Icon, IconButton, SectionTitle, T } from './core';
import { ActionMenu } from './overlays';
import { ShapeConfetti } from './confetti';

const Gutter = space.gutter;

export function MealPhoto({ photo, style }: { photo: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: palette.surface, overflow: 'hidden' }, style]}>
      <Image source={{ uri: MealPhotos.uri(photo) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel="Meal photo" />
    </View>
  );
}

/** The cover gradient: lime dusk → ink → ember dusk, diagonal. */
function CoverFrame({ children, style, padding = 24 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; padding?: number }) {
  return (
    <LinearGradient colors={[...coverGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ padding, overflow: 'hidden' }, style]}>
      {children}
    </LinearGradient>
  );
}

/** Cover for a meal without a photo: the meal's shape in the background, kcal big, macro pills in their colours. */
export function MealCover({ post, style }: { post: FeedPost; style?: StyleProp<ViewStyle> }) {
  const macros = [
    post.protein > 0 && { text: `Protein ${post.protein} g`, color: data.protein },
    post.carbs > 0 && { text: `Carbs ${post.carbs} g`, color: data.carbs },
    post.fat > 0 && { text: `Fat ${post.fat} g`, color: data.fat },
  ].filter(Boolean) as { text: string; color: string }[];
  return (
    <CoverFrame style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <BackdropShape shape={mealShape[post.mealType]} />
      <T v="overline" color={palette.lime}>{MEAL[post.mealType].label}</T>
      <T v="displayL" color={palette.text} style={{ marginTop: 6 }}>{formatKcal(post.calories)}</T>
      <T v="titleS" color={palette.textMuted}>kcal</T>
      {post.description.trim() ? <T v="titleS" center lines={2} style={{ marginTop: 18 }}>{post.description}</T> : null}
      {macros.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          {macros.map((m) => (
            <View key={m.text} style={{ backgroundColor: tone(m.color, 0.16, palette.ink), borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6 }}>
              <T v="label" color={m.color}>{m.text}</T>
            </View>
          ))}
        </View>
      )}
    </CoverFrame>
  );
}

/** A huge, tonal shape filling the cover behind the content. */
function BackdropShape({ shape }: { shape: Parameters<typeof ExpressiveShape>[0]['shape'] }) {
  const [size, setSize] = useState(0);
  return (
    <View pointerEvents="none" onLayout={(e) => setSize(Math.min(e.nativeEvent.layout.width, e.nativeEvent.layout.height))}
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
      {size > 0 && <ExpressiveShape shape={shape} size={size * 0.9} fill={tone(palette.lime, 0.07, palette.ink)} />}
    </View>
  );
}

function CoverStat({ value, label, flex, color = palette.text }: { value: string; label: string; flex: number; color?: string }) {
  return (
    <View style={{ flex }}>
      <T v="displayS" color={color} lines={1} style={{ fontSize: 24, lineHeight: 28 }}>{value}</T>
      <T v="bodyS" color={palette.textMuted}>{label}</T>
    </View>
  );
}

/** Cover for a workout: the ascent triangle behind, title, the numbers that matter, and the main exercises. */
export function WorkoutCover({ w, style }: { w: WorkoutInfo; style?: StyleProp<ViewStyle> }) {
  const units = useStore(profileStore)?.units ?? 'METRIC';
  return (
    <CoverFrame style={[{ justifyContent: 'space-between' }, style]}>
      <BackdropShape shape={workoutShape} />
      <View>
        <T v="overline" color={palette.lime}>Workout</T>
        <T v="headline" lines={2} style={{ marginTop: 4 }}>{w.title}</T>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <CoverStat value={WorkoutMath.formatDuration(w.durationSec)} label="time" flex={1} />
        <CoverStat value={WorkoutMath.formatVolume(w.volumeKg, units)} label="volume" flex={1.3} />
        <CoverStat value={`${w.sets}`} label="sets" flex={0.7} />
        {w.records > 0 && <CoverStat value={`${w.records}`} label={w.records === 1 ? 'record' : 'records'} flex={0.9} color={palette.gold} />}
      </View>
      <View style={{ gap: 6 }}>
        {w.exercises.slice(0, 4).map((line, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <T lines={1} style={{ flex: 1 }}>{line.sets} × {line.name}</T>
            <T v="bodyS" color={palette.textMuted}>{line.best}</T>
          </View>
        ))}
        {w.exercises.length > 4 && <T v="bodyS" color={palette.textMuted}>+ {w.exercises.length - 4} more</T>}
      </View>
    </CoverFrame>
  );
}

/** The post's picture: the photo, the workout cover, or the meal cover. */
export function PostPicture({ post, style }: { post: FeedPost; style?: StyleProp<ViewStyle> }) {
  if (post.photo) return <MealPhoto photo={post.photo} style={style} />;
  if (post.workout) return <WorkoutCover w={post.workout} style={style} />;
  return <MealCover post={post} style={style} />;
}

/** A small cover for grids: the post's shape, then the key number or the workout title. */
export function MiniCover({ post }: { post: FeedPost }) {
  return (
    <CoverFrame padding={8} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <BackdropShape shape={post.workout ? workoutShape : mealShape[post.mealType]} />
      {post.workout ? (
        <>
          <Icon name="fitness-center" color={palette.lime} />
          <T v="label" lines={2} center>{post.workout.title}</T>
        </>
      ) : (
        <>
          <T v="displayS" style={{ fontSize: 22, lineHeight: 26 }}>{formatKcal(post.calories)}</T>
          <T v="bodyS" color={palette.textMuted} style={{ fontSize: 11 }}>kcal · {MEAL[post.mealType].label.toLowerCase()}</T>
        </>
      )}
    </CoverFrame>
  );
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
 * One post: author row, a rounded-24 square picture inside the gutter, actions, likes,
 * caption, comments, time. Double-tap the picture to like: the heart pops, then splits into
 * small shapes.
 */
export function PostCard({ post, myUid, onLike, onDelete, onComment, style }: {
  post: FeedPost; myUid: string | null; onLike: () => void; onDelete: () => void; onComment?: () => void; style?: StyleProp<ViewStyle>;
}) {
  const liked = myUid != null && post.likes.includes(myUid);
  const [menu, setMenu] = useState(false);
  const burst = useState(() => new Animated.Value(0))[0];
  const heart = useState(() => new Animated.Value(liked ? 1.15 : 1))[0];
  const [split, setSplit] = useState<number | null>(null);
  const lastTap = useRef(0);

  useEffect(() => { springTo(heart, liked ? 1.15 : 1, 'bouncy').start(); }, [liked, heart]);

  const onPicturePress = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) onLike();
      haptics.confirm();
      burst.setValue(0);
      Animated.sequence([springTo(burst, 1, 'bouncy'), Animated.delay(220), Animated.timing(burst, { toValue: 0, duration: 120, useNativeDriver: nativeDriver })]).start();
      setTimeout(() => setSplit((k) => (k ?? 0) + 1), 420);
    }
    lastTap.current = now;
  };

  const caption = isMeal(post) && !post.photo ? '' : post.description;
  return (
    <View style={[{ paddingBottom: 18 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: Gutter, paddingRight: Gutter - 8, paddingTop: 6, paddingBottom: 10 }}>
        <Avatar name={post.authorName} seed={post.uid} size={36} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <T v="titleS" lines={1}>{post.authorName}</T>
          <T v="bodyS" color={palette.textMuted}>{post.workout ? 'Workout' : MEAL[post.mealType].label} · {timeAgo(post.createdAt.getTime(), true)}</T>
        </View>
        {post.uid === myUid && <IconButton name="more-horiz" label="More" onPress={() => setMenu(true)} />}
      </View>

      <Pressable onPress={onPicturePress} accessibilityLabel="Post picture. Double-tap to like."
        style={{ marginHorizontal: Gutter, aspectRatio: 1, borderRadius: 24, overflow: 'hidden' }}>
        <PostPicture post={post} style={{ width: '100%', height: '100%' }} />
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', opacity: burst, transform: [{ scale: burst }] }}>
          <Icon name="favorite" size={96} color={palette.like} />
        </Animated.View>
        <ShapeConfetti fireKey={split} colors={[palette.like, palette.like, palette.text]} count={14} distance={110} pieceSize={14} />
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: Gutter - 8, paddingRight: Gutter, paddingTop: 4 }}>
        <Pressable
          onPress={() => { if (liked) haptics.tick(); else haptics.confirm(); onLike(); }}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Unlike' : 'Like'}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Animated.View style={{ transform: [{ scale: heart }] }}>
            <Icon name={liked ? 'favorite' : 'favorite-border'} size={26} color={liked ? palette.like : palette.text} />
          </Animated.View>
        </Pressable>
        {onComment && <IconButton name="mc:comment-outline" label="Comment" onPress={onComment} />}
        <IconButton name="send" label="Share" onPress={() => sharePost(post)} />
        <View style={{ flex: 1 }} />
        {isMeal(post) && post.photo && (
          // With a photo the numbers aren't on the picture, so they sit here.
          <T v="label">
            <T v="label" color={palette.lime}>{formatKcal(post.calories)} kcal</T>
            {post.protein > 0 ? <T v="label" color={palette.textMuted}>  ·  {post.protein} g protein</T> : null}
          </T>
        )}
      </View>

      <View style={{ paddingHorizontal: Gutter, gap: 4 }}>
        {post.likes.length > 0 && <T v="titleS">{post.likes.length} {plural(post.likes.length, 'like')}</T>}
        {caption.trim() ? (
          <T>
            <T style={{ fontWeight: '600' }}>{post.authorName}</T>
            {'  '}{caption}
          </T>
        ) : null}
        {onComment && post.commentCount > 0 && (
          <T color={palette.textMuted} onPress={onComment}>
            {post.commentCount === 1 ? 'View 1 comment' : `View all ${post.commentCount} comments`}
          </T>
        )}
      </View>

      <ActionMenu visible={menu} onDismiss={() => setMenu(false)} items={[{ label: 'Delete', icon: 'delete-outline', danger: true, onPress: onDelete }]} />
    </View>
  );
}

/** The daily race: a podium of three shapes (gold cookie for #1, larger), then the other rows. */
export function RaceCard({ today, yesterdayWinner, myUid }: { today: Standing[]; yesterdayWinner: Standing | null; myUid: string | null }) {
  const podium = today.slice(0, 3);
  // Classic podium order: 2nd, 1st, 3rd.
  const order = [podium[1], podium[0], podium[2]].map((s, i) => (s ? { s, place: [2, 1, 3][i] } : null)).filter(Boolean) as { s: Standing; place: number }[];
  return (
    <View>
      <SectionTitle text="Closest to goal today" />
      {yesterdayWinner && (
        <T v="bodyS" color={palette.gold} style={{ paddingHorizontal: Gutter, paddingBottom: 6 }}>
          Yesterday: {yesterdayWinner.uid === myUid ? 'you' : yesterdayWinner.name} won, {gapLabel(yesterdayWinner.eaten - yesterdayWinner.target)}
        </T>
      )}
      {today.length === 0 && <T color={palette.textMuted} style={{ paddingHorizontal: Gutter, paddingVertical: 10 }}>No meals logged yet today.</T>}
      {order.length > 0 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 12, paddingHorizontal: Gutter, paddingVertical: 12 }}>
          {order.map(({ s, place }) => {
            const first = place === 1;
            const size = first ? 96 : 76;
            return (
              <View key={s.uid} style={{ alignItems: 'center', flex: 1, gap: 6 }}
                accessible accessibilityLabel={`Place ${place}: ${s.uid === myUid ? 'you' : s.name}, ${gapLabel(s.eaten - s.target)}`}>
                <ExpressiveShape shape="cookie9" size={size} fill={first ? tone(palette.gold, 0.22) : palette.surfaceHighest}>
                  <Avatar name={s.name} seed={s.uid} size={first ? 52 : 40} />
                  <View style={{ position: 'absolute', bottom: 2, right: 2, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: first ? palette.gold : palette.surfaceHigh }}>
                    <T v="label" color={first ? palette.onLime : palette.text}>{place}</T>
                  </View>
                </ExpressiveShape>
                <T v="label" lines={1}>{s.uid === myUid ? 'You' : s.name.split(' ')[0]}</T>
                <T v="bodyS" color={isOnTarget(s.eaten - s.target) ? palette.lime : palette.textMuted}>{gapLabel(s.eaten - s.target)}</T>
              </View>
            );
          })}
        </View>
      )}
      {today.slice(3).map((s, i) => {
        const isMe = s.uid === myUid;
        const gap = s.eaten - s.target;
        return (
          <View key={s.uid} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Gutter, paddingVertical: 8 }}>
            <T v="titleS" color={palette.textMuted} style={{ width: 26 }}>{i + 4}</T>
            <Avatar name={s.name} seed={s.uid} size={32} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <T v="body" lines={1} style={isMe && { fontWeight: '600' }}>{isMe ? 'You' : s.name}</T>
              <T v="bodyS" color={palette.textMuted}>{formatKcal(s.eaten)} of {formatKcal(s.target)} kcal</T>
            </View>
            <T v="label" color={isOnTarget(gap) ? palette.lime : palette.textMuted}>{gapLabel(gap)}</T>
          </View>
        );
      })}
    </View>
  );
}
