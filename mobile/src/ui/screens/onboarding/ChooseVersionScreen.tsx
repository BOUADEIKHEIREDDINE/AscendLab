/**
 * Deliberately minimal: two large round figures in the middle of the screen and
 * nothing else competing for attention. The chosen one fills with mint.
 */
import React, { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, View } from 'react-native';
import { AuthRepository } from '../../../data/authRepo';
import { Sex, SEX_LABEL } from '../../../data/profile';
import { useStore } from '../../../lib/store';
import { useNav } from '../../../navigation/types';
import { draftStore, Onboarding, signOut } from '../../../state/session';
import { c } from '../../theme';
import { haptics } from '../../haptics';
import { Appear, Button, Icon, IconName, T } from '../../components/core';
import { OnboardingScaffold } from '../../components/onboarding';

export function ChooseVersionScreen() {
  const nav = useNav();
  const selected = useStore(draftStore).sex;
  const email = AuthRepository.currentEmail;

  return (
    <OnboardingScaffold
      step={1}
      title="Choose your version"
      subtitle="Your plan adapts to your body."
      primaryLabel="Continue"
      primaryEnabled={selected != null}
      centered
      onPrimary={() => {
        Onboarding.saveProgress();
        nav.navigate('YourBody');
      }}
    >
      <Appear index={1}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', paddingVertical: 32 }}>
          <Figure sex="MAN" icon="man" selected={selected} />
          <Figure sex="WOMAN" icon="woman" selected={selected} />
        </View>
      </Appear>
      <Appear index={2}>
        <T color={c.onSurfaceVariant} center>This makes your calorie target more accurate.</T>
      </Appear>
      {/* First page after signing in, so offer a quiet way out for the wrong account. */}
      {email && (
        <Appear index={3}>
          <Button kind="text" label={`Not ${email}? Log out`} onPress={() => signOut(nav)} />
        </Appear>
      )}
    </OnboardingScaffold>
  );
}

function Figure({ sex, icon, selected }: { sex: Sex; icon: IconName; selected: Sex | null }) {
  const isSelected = selected === sex;
  // Once one is picked, the other steps back so the choice reads at a glance.
  const dimmed = selected != null && !isSelected;
  const scale = useState(() => new Animated.Value(1))[0];
  const native = Platform.OS !== 'web';
  useEffect(() => {
    Animated.spring(scale, { toValue: isSelected ? 1.08 : 1, bounciness: 12, useNativeDriver: native }).start();
  }, [isSelected, scale, native]);
  return (
    <View style={{ alignItems: 'center', gap: 16, opacity: dimmed ? 0.45 : 1 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={() => { haptics.tick(); Onboarding.update((p) => ({ ...p, sex })); }}
          accessibilityRole="radio"
          accessibilityState={{ selected: isSelected }}
          accessibilityLabel={SEX_LABEL[sex]}
          style={{
            width: 136, height: 136, borderRadius: 68, alignItems: 'center', justifyContent: 'center',
            backgroundColor: isSelected ? c.primary : 'transparent', borderWidth: isSelected ? 0 : 2, borderColor: c.outline,
          }}
        >
          <Icon name={icon} size={80} color={isSelected ? c.onPrimary : c.onSurface} />
        </Pressable>
      </Animated.View>
      <T v="titleLarge">{SEX_LABEL[sex]}</T>
    </View>
  );
}
