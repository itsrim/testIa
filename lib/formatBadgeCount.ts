const BADGE_CAP = 99;

/** Affichage pastille : 1–99 tel quel, au-delà `99+`. */
export function formatBadgeCount(count: number): string {
  if (count <= BADGE_CAP) return String(count);
  return '99+';
}
