/** Swipe a row left to delete it, like Hevy's set rows. The row's own menu or button stays for screen readers. */
import React, { useRef } from 'react';
import { View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { palette } from '../theme';
import { haptics } from '../haptics';
import { Icon, T } from './core';

const ACTION_WIDTH = 88;

/**
 * Swiping the row left past the red "Delete" area deletes it at once. `background` must match the
 * card behind the row: the red area sits under the row and only shows where the row slides away.
 */
export function SwipeToDelete({ children, onDelete, enabled = true, background = palette.surface }: {
  children: React.ReactNode; onDelete: () => void; enabled?: boolean; background?: string;
}) {
  const ref = useRef<SwipeableMethods>(null);
  return (
    <ReanimatedSwipeable
      ref={ref}
      enabled={enabled}
      friction={1.5}
      rightThreshold={ACTION_WIDTH * 0.6}
      overshootRight={false}
      childrenContainerStyle={{ backgroundColor: background }}
      renderRightActions={() => (
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', backgroundColor: palette.ember }}>
          <View style={{ width: ACTION_WIDTH, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Icon name="delete-outline" color={palette.ink} />
            <T v="label" color={palette.ink}>Delete</T>
          </View>
        </View>
      )}
      onSwipeableOpen={() => {
        // Close first: the row below takes this one's place and must not appear swiped open.
        ref.current?.reset();
        haptics.heavy();
        onDelete();
      }}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
