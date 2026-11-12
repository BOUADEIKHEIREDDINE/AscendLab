/**
 * An exercise's "How to" content, shared by the exercise page and the quick info panel that
 * opens from lists (exercise picker, alternatives): photos, numbered steps, muscles, equipment.
 */
import React, { ReactNode, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { ExerciseLibrary, type HowTo } from '../../data/training';
import { Gutter, palette, radius } from '../theme';
import { Icon, IconButton, ListGroup, PrimaryButton, SectionTitle, T } from './core';
import { ExerciseAnimation } from './ExerciseAnimation';

/** Steps, then muscles, equipment and level. `photos` goes on top (the page places its own). */
export function HowToContent({ howTo, photos }: { howTo: HowTo | null; photos?: ReactNode }) {
  if (!howTo) return <T color={palette.textMuted} style={{ padding: Gutter }}>No instructions for this exercise yet.</T>;
  const facts: [string, string][] = [
    ['Main muscles', howTo.primary.join(', ')],
    ...(howTo.secondary.length > 0 ? [['Also works', howTo.secondary.join(', ')] as [string, string]] : []),
    ['Equipment', howTo.equipment],
    ['Level', howTo.level],
  ];
  return (
    <>
      {photos}
      <SectionTitle text="Instructions" />
      {howTo.instructions.map((step, i) => (
        <View key={i} style={{ flexDirection: 'row', paddingHorizontal: Gutter, paddingVertical: 6 }}>
          <T v="displayS" color={palette.primary} style={{ width: 32, fontSize: 18, lineHeight: 22 }}>{i + 1}</T>
          <T v="body" style={{ flex: 1 }}>{step}</T>
        </View>
      ))}
      <SectionTitle text="Details" />
      <ListGroup>
        {facts.map(([label, value]) => (
          <View key={label} style={{ flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 14, gap: 16 }}>
            <T v="body" color={palette.textMuted} style={{ width: 110 }}>{label}</T>
            <T v="body" style={{ flex: 1 }}>{value}</T>
          </View>
        ))}
      </ListGroup>
      <T v="bodyS" color={palette.textMuted} style={{ paddingHorizontal: Gutter, paddingTop: 16 }}>Photos and instructions: free-exercise-db (public domain)</T>
    </>
  );
}

const THUMB = 56;

/** The exercise's start photo, small; an icon when it has no photo or the photo can't load. */
export function ExerciseThumb({ exerciseId }: { exerciseId: string }) {
  const [failed, setFailed] = useState(false);
  const uri = ExerciseLibrary.howTo(exerciseId)?.images[0];
  if (!uri || failed) {
    return (
      <View style={{ width: THUMB, height: THUMB, borderRadius: radius.md, backgroundColor: palette.surfaceHigh, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="fitness-center" color={palette.textMuted} />
      </View>
    );
  }
  return (
    <View style={{ width: THUMB, height: THUMB, borderRadius: radius.md, overflow: 'hidden', backgroundColor: palette.photoMat }}>
      <Image source={{ uri }} cachePolicy="disk" contentFit="contain" transition={0} onError={() => setFailed(true)} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

/**
 * Full-height panel with an exercise's photos and instructions. It is plain content, not a Modal,
 * so it can sit inside another modal (stacked modals misbehave). `action` is an optional button
 * at the bottom, e.g. "Add to selection".
 */
export function ExerciseInfoPanel({ exerciseId, name, onClose, action }: {
  exerciseId: string; name: string; onClose: () => void;
  action?: { label: string; onPress: () => void };
}) {
  const howTo = ExerciseLibrary.howTo(exerciseId);
  return (
    <View style={{ flex: 1, backgroundColor: palette.ink }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: Gutter - 4, paddingRight: 16, paddingTop: 8, paddingBottom: 4, gap: 12 }}>
        <IconButton variant="tonal" name="close" label="Close" onPress={onClose} />
        <T v="title" lines={2} style={{ flex: 1 }}>{name}</T>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <HowToContent howTo={howTo} photos={howTo && howTo.images.length > 0
          ? <View style={{ paddingHorizontal: Gutter, paddingTop: 12 }}><ExerciseAnimation images={howTo.images} name={name} /></View> : null} />
      </ScrollView>
      {action && (
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
          <PrimaryButton label={action.label} onPress={action.onPress} />
        </View>
      )}
    </View>
  );
}
