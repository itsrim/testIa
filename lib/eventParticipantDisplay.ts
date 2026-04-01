import type { EventParticipantDetail } from '@/data/eventDetailSeed';
import { sortEventParticipants } from '@/data/eventDetailSeed';
import { capPseudo, getSuggestionProfile } from '@/data/suggestionProfiles';

const EP_POOL = 24;

/**
 * Aligne les lignes affichées sur `participantCount` (CSV / état temps réel) :
 * complète avec des profils `ep1`…`ep24` depuis `suggestion_profiles.csv`.
 */
export function expandParticipantsToEventCount(
  participants: EventParticipantDetail[],
  participantCount: number,
  /** Évite les clés React dupliquées entre plusieurs sorties. */
  scopeKey = 'global',
): EventParticipantDetail[] {
  const n = Math.max(0, participantCount);
  const sorted = sortEventParticipants([...participants]);
  if (sorted.length >= n) {
    return sorted.slice(0, n);
  }
  const out = [...sorted];
  let k = out.length;
  while (out.length < n) {
    k += 1;
    const pi = ((k - 1) % EP_POOL) + 1;
    const pid = `ep${pi}`;
    const prof = getSuggestionProfile(pid);
    if (prof) {
      out.push({
        id: `synth-${scopeKey}-${k}`,
        profilId: pid,
        displayName: capPseudo(prof.pseudo),
        avatarUrl: prof.imageUrl,
        rating: prof.stats.reliability,
        isOrganizer: false,
        isSelf: false,
      });
    } else {
      out.push({
        id: `synth-${scopeKey}-${k}`,
        displayName: `Participant ${k}`,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(String(k))}&size=128&background=5C6BC0&color=fff`,
        rating: Math.round((4 + (k % 8) * 0.12) * 10) / 10,
        isOrganizer: false,
        isSelf: false,
      });
    }
  }
  return sortEventParticipants(out);
}
