/** URL de livraison (ImageKit ID = segment d’hôte). */
export const IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/xzy4sppt7g';

/** Clé publique ImageKit (upload côté client + signature avec clé privée en env). */
export const IMAGEKIT_PUBLIC_KEY = 'public_P8SHxtLXEslKtUwWs7gR+MAjBx0=';

export const IMAGEKIT_UPLOAD_FOLDER = '/profile-avatars';

/**
 * Nom de fichier par utilisateur : `{userKey}_avatar.jpg` — stable pour un même compte
 * (écrasement via `overwriteFile` dans `imagekitUpload.ts`).
 */
export function imageKitProfileAvatarFileName(userKey: string): string {
  const safe = userKey.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'user';
  return `${safe}_avatar.jpg`;
}
