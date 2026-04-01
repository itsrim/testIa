import { Image as ExpoImage } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image as RNImage } from 'react-native';

/** Plus grand côté en pixels après redimensionnement (avatars, pièces jointes, couverture événement). */
export const UPLOAD_IMAGE_MAX_EDGE = 512;

/** Qualité JPEG (0–1) pour `expo-image-manipulator`. */
export const UPLOAD_IMAGE_QUALITY = 0.82;

export type PrepareImageMeta = {
  width?: number | null;
  height?: number | null;
};

export type PrepareImageOptions = {
  maxEdge?: number;
  quality?: number;
  fallbackMimeType?: string | null;
};

async function dimensionsFromGetSize(uri: string): Promise<{ width: number; height: number } | null> {
  try {
    const dim = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      RNImage.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        (e) => reject(e ?? new Error('getSize failed')),
      );
    });
    if (dim.width > 0 && dim.height > 0) return dim;
  } catch {
    /* continue */
  }
  return null;
}

async function dimensionsFromExpoImage(uri: string): Promise<{ width: number; height: number } | null> {
  let ref: Awaited<ReturnType<typeof ExpoImage.loadAsync>> | null = null;
  try {
    ref = await ExpoImage.loadAsync(uri);
    const w = Math.round(ref.width * ref.scale);
    const h = Math.round(ref.height * ref.scale);
    if (w > 0 && h > 0) return { width: w, height: h };
  } catch {
    /* continue */
  } finally {
    try {
      ref?.release();
    } catch {
      /* ignore */
    }
  }
  return null;
}

async function resolveDimensions(
  uri: string,
  meta?: PrepareImageMeta,
): Promise<{ width: number; height: number } | null> {
  const fromFile = await dimensionsFromGetSize(uri);
  if (fromFile) return fromFile;

  const fromExpo = await dimensionsFromExpoImage(uri);
  if (fromExpo) return fromExpo;

  const w = meta?.width;
  const h = meta?.height;
  if (w && h && w > 0 && h > 0) return { width: w, height: h };

  return null;
}

function buildResizeActions(
  width: number,
  height: number,
  maxEdge: number,
): ImageManipulator.Action[] {
  if (Math.max(width, height) <= maxEdge) return [];
  if (width >= height) {
    return [{ resize: { width: maxEdge } }];
  }
  return [{ resize: { height: maxEdge } }];
}

/**
 * Redimensionne (côté max ≤ `maxEdge`) et exporte en JPEG via `expo-image-manipulator`.
 * En cas d’échec, renvoie l’URI d’origine et le MIME de secours.
 */
export async function prepareImageForUpload(
  localUri: string,
  meta?: PrepareImageMeta,
  options?: PrepareImageOptions,
): Promise<{ uri: string; mimeType: string }> {
  const fallbackMime = options?.fallbackMimeType?.trim() || 'image/jpeg';
  const maxEdge = options?.maxEdge ?? UPLOAD_IMAGE_MAX_EDGE;
  const quality = options?.quality ?? UPLOAD_IMAGE_QUALITY;

  if (!localUri?.trim()) {
    return { uri: localUri, mimeType: fallbackMime };
  }

  try {
    const dim = await resolveDimensions(localUri, meta);
    const actions = dim ? buildResizeActions(dim.width, dim.height, maxEdge) : [];

    const result = await ImageManipulator.manipulateAsync(localUri, actions, {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    return { uri: result.uri, mimeType: 'image/jpeg' };
  } catch {
    return { uri: localUri, mimeType: fallbackMime };
  }
}
