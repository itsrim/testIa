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

function randomToken(): string {
  return CryptoJS.lib.WordArray.random(20).toString(CryptoJS.enc.Hex);
}

export type UploadImageKitOptions = {
  localUri: string;
  /** ex. image/jpeg */
  mimeType?: string | null;
  /** Identifiant compte (CSV `userKey`) — un fichier ImageKit par utilisateur. */
  userKey: string;
};

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

  const mime = options.mimeType?.trim() || 'image/jpeg';
  const fileName = imageKitProfileAvatarFileName(options.userKey);

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
    const res = await fetch(options.localUri);
    const blob = await res.blob();
    form.append('file', blob, fileName);
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
