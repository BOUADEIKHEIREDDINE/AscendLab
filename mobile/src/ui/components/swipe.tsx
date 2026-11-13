/** Swipe a row left to reveal Delete, like Hevy's set rows. The row's own menu or button stays for screen readers. */
import React, { useRef } from 'react';
import { Pressable } from 'react-native';
import ReanimatedSwipeable, { SwipeDirection, type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  Easing, Extrapolation, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { palette } from '../theme';
import { haptics } from '../haptics';
import { Icon, T } from './core';

const ACTION_WIDTH = 88;
/** The deleted row folds away in this time while the rows below slide up into its place. */
const COLLAPSE_MS = 200;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** The red Delete area: its icon and label grow in with the swipe instead of sitting there from the start. */
function DeleteAction({ progress, onPress }: { progress: SharedValue<number>; onPress: () => void }) {
  const content = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0.25, 0.9], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.get(), [0, 1], [0.9, 1], Extrapolation.CLAMP) }],
  }));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Delete set"
      style={({ pressed }) => ({ width: ACTION_WIDTH, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ember, opacity: pressed ? 0.85 : 1 })}
    >
      <Animated.View style={[{ alignItems: 'center', gap: 2 }, content]}>
        <Icon name="delete-outline" color={palette.ink} />
        <T v="label" color={palette.ink}>Delete</T>
      </Animated.View>
    </Pressable>
  );
}

/**
 * A first swipe left stops with a red "Delete" on the right. Tapping it, or swiping left again,
 * folds the row away and then calls `onDelete`; swiping right or tapping the row closes it.
 * The parent must key each row by a stable id (not its index), so the right row leaves.
 * `background` must match the card behind the row: the red area sits under it.
 */
export function SwipeToDelete({ children, onDelete, enabled = true, background = palette.surface }: {
  children: React.ReactNode; onDelete: () => void; enabled?: boolean; background?: string;
}) {
  const ref = useRef<SwipeableMethods>(null);
  const open = useRef(false);
  const deleting = useRef(false);
  const reduced = useReducedMotion();
  const height = useSharedValue(0);
  const shown = useSharedValue(1);

  // Only while folding: the measured height shrinks to 0 and the row fades. Clipping is off otherwise
  // (a PR badge pokes above the row).
  const fold = useAnimatedStyle(() => (shown.get() < 1
    ? { height: height.get() * shown.get(), opacity: shown.get(), overflow: 'hidden' as const }
    : {}));

  const remove = () => {
    if (deleting.current) return;
    deleting.current = true;
    open.current = false;
    haptics.heavy();
    // Reduce Motion: no folding, the set just goes.
    if (reduced) { onDelete(); return; }
    shown.set(withTiming(0, { duration: COLLAPSE_MS, easing: EASE_OUT }, (finished) => {
      if (finished) scheduleOnRN(onDelete);
    }));
  };

  return (
    <Animated.View style={fold} onLayout={(e) => { if (!deleting.current) height.set(e.nativeEvent.layout.height); }}>
      <ReanimatedSwipeable
        ref={ref}
        enabled={enabled}
        friction={1.5}
        rightThreshold={ACTION_WIDTH / 2}
        overshootRight={false}
        childrenContainerStyle={{ backgroundColor: background }}
        renderRightActions={(progress) => <DeleteAction progress={progress} onPress={remove} />}
        onSwipeableOpen={() => { open.current = true; haptics.tick(); }}
        onSwipeableClose={() => { open.current = false; }}
        // Already open and dragged left again: that second swipe deletes.
        onSwipeableCloseStartDrag={(direction) => { if (open.current && direction === SwipeDirection.LEFT) remove(); }}
      >
        {children}
      </ReanimatedSwipeable>
    </Animated.View>
  );
}
