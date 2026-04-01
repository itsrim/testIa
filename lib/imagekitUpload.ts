import CryptoJS from 'crypto-js';
import { Platform } from 'react-native';

import {
  IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_UPLOAD_FOLDER,
  imageKitProfileAvatarFileName,
} from '@/constants/imagekit';

const UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

function getPrivateKey(): string {
  const k = process.env.EXPO_PUBLIC_IMAGEKIT_PRIVATE_KEY?.trim();
  if (!k) {
    throw new Error(
      'Clé privée ImageKit absente : aucune requête POST vers upload.imagekit.io ne partira. ' +
        'Créez un fichier .env à la racine du projet avec EXPO_PUBLIC_IMAGEKIT_PRIVATE_KEY=votre_clé_privée, ' +
        'puis redémarrez Expo (npx expo start -c). Clé : tableau ImageKit → Developer → API keys → Private key.',
    );
  }
  return k;
}

function sign(token: string, expire: number, privateKey: string): string {
  return CryptoJS.HmacSHA1(token + expire, privateKey).toString(CryptoJS.enc.Hex);
}

/** 20 octets en hex — évite `CryptoJS.lib.WordArray.random` (exige `crypto.getRandomValues`, souvent absent en RN). */
function randomToken(): string {
  const bytes = new Uint8Array(20);
  try {
    const c = globalThis.crypto;
    if (c && typeof c.getRandomValues === 'function') {
      c.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    /* ex. navigateur / runtime sans RNG sécurisé */
  }
  for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export type UploadImageKitOptions = {
  localUri: string;
  /** ex. image/jpeg */
  mimeType?: string | null;
  /** @platform web — préférer ce `File` au `fetch(uri)` (souvent requis pour que l’upload fonctionne). */
  webFile?: File | null;
  /** Identifiant compte (CSV `userKey`) — un fichier ImageKit par utilisateur. */
  userKey: string;
};

/** Secours si `mimeType` est absent (souvent sur mobile). */
function inferMimeTypeFromUri(uri: string): string | null {
  const u = uri.split('?')[0]?.toLowerCase() ?? '';
  if (u.endsWith('.png')) return 'image/png';
  if (u.endsWith('.webp')) return 'image/webp';
  if (u.endsWith('.gif')) return 'image/gif';
  if (u.endsWith('.heic') || u.endsWith('.heif')) return 'image/heic';
  if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return 'image/jpeg';
  return null;
}

function resolveUploadMime(options: UploadImageKitOptions): string {
  const fromPicker = options.mimeType?.trim();
  if (fromPicker) return fromPicker;
  const fromFile = options.webFile?.type?.trim();
  if (fromFile) return fromFile;
  const fromUri = inferMimeTypeFromUri(options.localUri);
  if (fromUri) return fromUri;
  return 'image/jpeg';
}

/**
 * Envoie un fichier local vers ImageKit (multipart **POST** — pas de PUT sur cet endpoint).
 * Remplace l’avatar sans multiplier les fichiers : même `fileName` + `overwriteFile` + pas de suffixe aléatoire.
 * Nécessite EXPO_PUBLIC_IMAGEKIT_PRIVATE_KEY pour signer la requête (recommandé : backend dédié en prod).
 * @returns URL HTTPS du fichier (domaine ik.imagekit.io/...)
 */
export async function uploadLocalImageToImageKit(
  options: UploadImageKitOptions,
): Promise<string> {
  const privateKey = getPrivateKey();
  const token = randomToken();
  const expire = Math.floor(Date.now() / 1000) + 900;

  const mime = resolveUploadMime(options);
  const fileName = imageKitProfileAvatarFileName(options.userKey, mime);

  const form = new FormData();
  form.append('fileName', fileName);
  form.append('publicKey', IMAGEKIT_PUBLIC_KEY);
  form.append('signature', sign(token, expire, privateKey));
  form.append('token', token);
  form.append('expire', String(expire));
  form.append('folder', IMAGEKIT_UPLOAD_FOLDER);
  /** Un seul objet dans le dossier : pas de `avatar_1739…jpg` à chaque fois. */
  form.append('useUniqueFileName', 'false');
  /** Écrase le fichier existant au même chemin (dossier + fileName). */
  form.append('overwriteFile', 'true');

  if (Platform.OS === 'web') {
    if (options.webFile instanceof File) {
      form.append('file', options.webFile, fileName);
    } else {
      const res = await fetch(options.localUri);
      if (!res.ok) {
        throw new Error(`Impossible de lire l’image locale (${res.status}). Sur le web, passez asset.file depuis le picker.`);
      }
      const blob = await res.blob();
      form.append('file', blob, fileName);
    }
  } else {
    // React Native : objet { uri, type, name } (non standard pour le type FormData du DOM).
    form.append('file', { uri: options.localUri, type: mime, name: fileName } as never);
  }

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[ImageKit] POST', UPLOAD_URL, '(multipart)');
  }

  const resp = await fetch(UPLOAD_URL, {
    method: 'POST',
    body: form,
  });

  const json = (await resp.json()) as { url?: string; message?: string };
  if (!resp.ok) {
    throw new Error(json.message || `ImageKit upload échoué (${resp.status})`);
  }
  if (!json.url || typeof json.url !== 'string') {
    throw new Error('Réponse ImageKit sans URL');
  }
  return json.url;
}
