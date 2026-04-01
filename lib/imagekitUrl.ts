import { IMAGEKIT_URL_ENDPOINT } from '@/constants/imagekit';

/**
 * Construit l’URL de livraison ImageKit.
 * - `src` absolu (`https://…`) : renvoyé tel quel (ex. URL renvoyée par l’API d’upload).
 * - `src` chemin (`/profile.png` ou `folder/file.jpg`) : préfixé par `urlEndpoint`.
 */
export function imageKitImageUri(
  src: string,
  urlEndpoint: string = IMAGEKIT_URL_ENDPOINT,
): string {
  const s = src.trim();
  if (/^https?:\/\//i.test(s)) return s;
  const path = s.startsWith('/') ? s : `/${s}`;
  const base = urlEndpoint.replace(/\/$/, '');
  return `${base}${path}`;
}
