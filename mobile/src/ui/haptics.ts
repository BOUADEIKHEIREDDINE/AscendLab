/**
 * Small, consistent haptics so taps feel physical: `tick` for light touches (toggles,
 * steppers), `confirm` for completed actions (set done, posted, saved), `reject` for
 * refused ones, `heavy` for big moments (rest over, new record).
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const safe = (fn: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  fn().catch(() => undefined);
};

export const haptics = {
  tick: () => safe(() => Haptics.selectionAsync()),
  confirm: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  reject: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  heavy: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
};
