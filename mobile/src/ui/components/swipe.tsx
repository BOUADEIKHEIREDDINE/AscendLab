/** Swipe a row left to reveal Delete, like Hevy's set rows. The row's own menu or button stays for screen readers. */
import React, { useRef } from 'react';
import { Pressable } from 'react-native';
import ReanimatedSwipeable, { SwipeDirection, type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { palette } from '../theme';
import { haptics } from '../haptics';
import { Icon, T } from './core';

const ACTION_WIDTH = 88;

/**
 * A first swipe left stops with a red "Delete" on the right. Tapping it, or swiping left again,
 * deletes the row; swiping right or tapping the row closes it. `background` must match the card
 * behind the row: the red area sits under the row and only shows where the row slides away.
 */
export function SwipeToDelete({ children, onDelete, enabled = true, background = palette.surface }: {
  children: React.ReactNode; onDelete: () => void; enabled?: boolean; background?: string;
}) {
  const ref = useRef<SwipeableMethods>(null);
  const open = useRef(false);
  const remove = () => {
    open.current = false;
    // Close first: the row below takes this one's place and must not appear swiped open.
    ref.current?.reset();
    haptics.heavy();
    onDelete();
  };
  return (
    <ReanimatedSwipeable
      ref={ref}
      enabled={enabled}
      friction={1.5}
      rightThreshold={ACTION_WIDTH / 2}
      overshootRight={false}
      childrenContainerStyle={{ backgroundColor: background }}
      renderRightActions={() => (
        <Pressable
          onPress={remove}
          accessibilityRole="button"
          accessibilityLabel="Delete set"
          style={({ pressed }) => ({
            width: ACTION_WIDTH, alignItems: 'center', justifyContent: 'center', gap: 2,
            backgroundColor: palette.ember, opacity: pressed ? 0.8 : 1,
          })}
        >
          <Icon name="delete-outline" color={palette.ink} />
          <T v="label" color={palette.ink}>Delete</T>
        </Pressable>
      )}
      onSwipeableOpen={() => { open.current = true; haptics.tick(); }}
      onSwipeableClose={() => { open.current = false; }}
      // Already open and dragged left again: that second swipe deletes.
      onSwipeableCloseStartDrag={(direction) => { if (open.current && direction === SwipeDirection.LEFT) remove(); }}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
