/**
 * An exercise's start and end photos, alternating about once a second like a short animation.
 * With reduce motion on, both photos side by side. Photos come from the CDN and are cached on disk.
 */
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { Image } from 'expo-image';
import { useIsFocused } from '@react-navigation/native';
import { palette } from '../theme';
import { T } from './core';

const FRAME_MS = 1000;
/** Full width on a phone; capped on wide screens (web, tablets). */
const BOX = { width: '100%', maxWidth: 480, alignSelf: 'center' } as const;

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (live) setReduce(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => { live = false; sub.remove(); };
  }, []);
  return reduce;
}

export function ExerciseAnimation({ images, name }: { images: string[]; name: string }) {
  const focused = useIsFocused();
  const reduce = useReduceMotion();
  const [frame, setFrame] = useState(0);
  const [failed, setFailed] = useState(false);
  const flips = images.length > 1 && focused && !reduce && !failed;

  useEffect(() => {
    if (!flips) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % images.length), FRAME_MS);
    return () => clearInterval(t);
  }, [flips, images.length]);

  if (images.length === 0) return null;
  if (failed) {
    return (
      <View style={{ ...BOX, aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <T color={palette.textMuted} center>Photos need an internet connection.</T>
      </View>
    );
  }
  const photo = (uri: string, visible: boolean, key: number) => (
    <Image key={key} source={{ uri }} cachePolicy="disk" contentFit="contain" transition={0} onError={() => setFailed(true)}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: visible ? 1 : 0 }} />
  );

  if (reduce && images.length > 1) {
    return (
      <View style={{ ...BOX, maxWidth: 720, flexDirection: 'row', gap: 8 }} accessible accessibilityLabel={`${name}: start and end position`}>
        {images.slice(0, 2).map((uri, i) => (
          <View key={i} style={{ flex: 1, aspectRatio: 4 / 3, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' }}>
            {photo(uri, true, i)}
          </View>
        ))}
      </View>
    );
  }
  // Every photo stays mounted so the flip never waits for a download; only the current one shows.
  return (
    <View style={{ ...BOX, aspectRatio: 4 / 3, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' }}
      accessible accessibilityRole="image" accessibilityLabel={`${name}: start and end position`}>
      {images.map((uri, i) => photo(uri, i === frame, i))}
    </View>
  );
}
