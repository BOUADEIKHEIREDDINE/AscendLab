/**
 * Dev-only: every named shape, a morph loop and the loaders, to check that shapes look
 * smooth on a real device. Opened from Settings in __DEV__ builds (a modal, not a route).
 */
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, space, tone } from '../theme';
import { IconButton, T } from '../components/core';
import { ExpressiveShape } from './ExpressiveShape';
import { shapes, ShapeName } from './library';
import { ShapeLoader } from './ShapeLoader';
import { WavyProgress } from './WavyProgress';
import { WaveEdge } from './WaveEdge';

const NAMES = Object.keys(shapes) as ShapeName[];

export function ShapeGallery({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const [i, setI] = useState(0);
  const [slosh, setSlosh] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setI((n) => n + 1), 1400);
    return () => clearInterval(id);
  }, [visible]);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.ink }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
          <IconButton name="close" label="Close" onPress={onDismiss} />
          <T v="title">Shape gallery</T>
        </View>
        <ScrollView contentContainerStyle={{ padding: space.gutter, gap: 24 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.tileGap }}>
            {NAMES.map((n) => (
              <View key={n} style={{ alignItems: 'center', gap: 6, width: 96 }}>
                <ExpressiveShape shape={n} size={80} fill={tone(palette.lime)} stroke={palette.lime} strokeWidth={2} />
                <T v="bodyS" color={palette.textMuted}>{n}</T>
              </View>
            ))}
          </View>
          <T v="titleS">Morph loop</T>
          <View style={{ flexDirection: 'row', gap: 20, alignItems: 'center' }}>
            <ExpressiveShape shape={NAMES[i % NAMES.length]} size={140} fill={tone(palette.gold, 0.2)} progress={((i % 5) + 1) / 5}
              progressColor={palette.gold} trackColor={palette.surfaceHigh} progressWidth={8}>
              <T v="label">{NAMES[i % NAMES.length]}</T>
            </ExpressiveShape>
            <ShapeLoader size={48} />
          </View>
          <T v="titleS">Wavy progress</T>
          <WavyProgress progress={((i % 4) + 1) / 4} />
          <T v="titleS" onPress={() => setSlosh((s) => s + 1)}>Wave edge (tap to slosh)</T>
          <View style={{ width: 120, height: 160, borderRadius: 20, overflow: 'hidden', backgroundColor: palette.surfaceHigh }}>
            <WaveEdge width={120} height={160} level={((i % 4) + 1) / 5} color={palette.lime} sloshKey={slosh} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
