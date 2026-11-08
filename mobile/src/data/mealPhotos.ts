/**
 * Meal photos are shrunk to a small JPEG and stored inside the post itself, so the feed
 * needs nothing beyond Firestore (no file storage, works offline, ~60 KB per photo).
 * Same size and quality as the Android app.
 */
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_SIDE = 900;
const QUALITY = 0.72;

export type PhotoResult = { photo: string } | { error: string } | null;

/** Scales the picked image down (longest side 900 px) and returns it base64-encoded. */
async function encode(asset: ImagePicker.ImagePickerAsset): Promise<string | null> {
  try {
    const { width, height } = asset;
    const scale = width && height ? MAX_SIDE / Math.max(width, height) : 1;
    const context = ImageManipulator.manipulate(asset.uri);
    if (scale < 1) {
      context.resize(width >= height ? { width: Math.round(width * scale) } : { height: Math.round(height * scale) });
    }
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: QUALITY, base64: true });
    return saved.base64 ?? null;
  } catch {
    return null;
  }
}

async function handle(result: ImagePicker.ImagePickerResult): Promise<PhotoResult> {
  if (result.canceled || !result.assets?.[0]) return null;
  const photo = await encode(result.assets[0]);
  return photo ? { photo } : { error: "Couldn't read this photo. Try another one." };
}

export const MealPhotos = {
  async take(): Promise<PhotoResult> {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { error: 'Allow camera access in Settings to take a photo.' };
    return handle(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 }));
  },

  async pick(): Promise<PhotoResult> {
    return handle(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 }));
  },

  /** A data URI the Image component can show. */
  uri: (photo: string) => `data:image/jpeg;base64,${photo}`,
};
