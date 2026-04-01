import type { Event } from '@/types/messaging';
import { capPseudo, getSuggestionProfile } from '@/data/suggestionProfiles';

export type EventParticipantDetail = {
  id: string;
  displayName: string;
  avatarUrl: string;
  rating: number;
  isOrganizer: boolean;
  isSelf: boolean;
  /** `suggestion_profiles` (sg*, ep*) — ouvre l’écran profil. */
  profilId?: string;
};

export type EventWaitingMember = {
  id: string;
  displayName: string;
  rating: number;
  avatarUrl?: string;
  /** Demande d’inscription de l’utilisateur courant (annulation / validation). */
  isViewerRequest?: boolean;
  profilId?: string;
};

export type EventDetailRich = {
  descriptionParagraphs: string[];
  participants: EventParticipantDetail[];
  waitingList: EventWaitingMember[];
  /** Affiche l’icône retirer sur les lignes des autres (vue organisateur). */
  showRemoveOtherParticipants: boolean;
};

function av(name: string, bg: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=128&background=${bg}&color=fff`;
}

/** Tri affichage : organisateur·rice, puis vous, puis les autres par prénom. */
export function sortEventParticipants(list: EventParticipantDetail[]): EventParticipantDetail[] {
  return [...list].sort((a, b) => {
    if (a.isOrganizer !== b.isOrganizer) return a.isOrganizer ? -1 : 1;
    if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
    return a.displayName.localeCompare(b.displayName, 'fr', { sensitivity: 'base' });
  });
}

export function enrichParticipantRow(p: EventParticipantDetail): EventParticipantDetail {
  if (!p.profilId || p.isSelf) return p;
  const s = getSuggestionProfile(p.profilId);
  if (!s) return p;
  return {
    ...p,
    displayName: capPseudo(s.pseudo),
    avatarUrl: s.imageUrl,
    rating: s.stats.reliability,
  };
}

export function enrichWaitingRow(w: EventWaitingMember): EventWaitingMember {
  if (!w.profilId || w.isViewerRequest) return w;
  const s = getSuggestionProfile(w.profilId);
  if (!s) return w;
  return {
    ...w,
    displayName: capPseudo(s.pseudo),
    avatarUrl: s.imageUrl,
    rating: s.stats.reliability,
  };
}

/** Détail riche par id d’événement (`events.csv`) — noms alignés sur `group_members.csv`. */
export const EVENT_DETAIL_SEED: Record<string, EventDetailRich> = {
  e3: {
    descriptionParagraphs: [
      'Parcours flânerie en soirée : lumières sur le Rhône et la vieille ville, pauses photo.',
      'Chaussures plates conseillées ; on termine vers une terrasse couverte si pluie.',
    ],
    participants: [
      { id: 'p1', displayName: 'Léo', avatarUrl: av('Leo', '7E57C2'), rating: 4.7, isOrganizer: true, isSelf: false, profilId: 'ep1' },
      { id: 'p2', displayName: 'Camille', avatarUrl: av('Camille', 'FF7043'), rating: 4.4, isOrganizer: false, isSelf: false, profilId: 'ep2' },
      { id: 'p3', displayName: 'Moi', avatarUrl: av('Moi', '78909C'), rating: 4.4, isOrganizer: false, isSelf: true },
      { id: 'p4', displayName: 'Hugo', avatarUrl: av('Hugo', '29B6F6'), rating: 4.6, isOrganizer: false, isSelf: false, profilId: 'sg4' },
    ],
    waitingList: [],
    showRemoveOtherParticipants: false,
  },
};

function defaultRich(event: Event): EventDetailRich {
  const paragraphs = [
    `Événement « ${event.title} » le ${event.dateLabel}. Rejoignez-nous pour une expérience conviviale !`,
    event.notes?.trim() ??
      'Les inscriptions et le fil de discussion sont disponibles depuis la conversation du groupe.',
  ];
  /** Sortie créée dans l’app : vous comme organisateur, effectif cohérent avec `participantCount`. */
  if (event.cardStatus === 'organisateur') {
    const participants: EventParticipantDetail[] = [
      {
        id: 'org-self',
        displayName: 'Moi',
        avatarUrl: av('Moi', 'AB47BC'),
        rating: 4.8,
        isOrganizer: true,
        isSelf: true,
      },
    ];
    const extra = Math.max(0, event.participantCount - 1);
    for (let i = 0; i < extra; i++) {
      const pi = (i % 24) + 1;
      const pid = `ep${pi}`;
      const prof = getSuggestionProfile(pid);
      participants.push({
        id: `guest-${i}`,
        profilId: pid,
        displayName: prof ? capPseudo(prof.pseudo) : `Invité ${i + 1}`,
        avatarUrl: prof?.imageUrl ?? av(`Inv${i + 1}`, '5C6BC0'),
        rating: prof?.stats.reliability ?? 4.2,
        isOrganizer: false,
        isSelf: false,
      });
    }
    return {
      descriptionParagraphs: paragraphs,
      participants: sortEventParticipants(participants),
      waitingList: [],
      showRemoveOtherParticipants: true,
    };
  }
  return {
    descriptionParagraphs: paragraphs,
    participants: [],
    waitingList: [],
    showRemoveOtherParticipants: false,
  };
}

/** Files d’attente initiales (démo) — la suite est gérée dans MessagingContext. */
export function getInitialPendingQueuesByEvent(): Record<string, EventWaitingMember[]> {
  const out: Record<string, EventWaitingMember[]> = {};
  for (const [eid, rich] of Object.entries(EVENT_DETAIL_SEED)) {
    if (rich.waitingList.length > 0) {
      out[eid] = rich.waitingList.map((w) => ({ ...w }));
    }
  }
  out.q20260301a = [
    {
      id: 'w-demo-1',
      displayName: 'Marc',
      rating: 4.0,
      avatarUrl: av('Marc', '616161'),
      profilId: 'ep8',
    },
    {
      id: 'w-demo-2',
      displayName: 'Clara',
      rating: 4.5,
      avatarUrl: av('Clara', 'EC407A'),
      profilId: 'sg1',
    },
  ];
  return out;
}

export function getEventDetailRich(event: Event): EventDetailRich {
  const base = EVENT_DETAIL_SEED[event.id] ?? defaultRich(event);
  let participants =
    base.participants.length > 0 ? sortEventParticipants(base.participants) : base.participants;

  /** Hors seed : pas de fiche détaillée — on garde au moins une ligne si l’effectif CSV > 0. */
  if (participants.length === 0 && event.participantCount > 0) {
    participants = [
      {
        id: 'px',
        displayName: 'Participants',
        avatarUrl: av('Groupe', '424242'),
        rating: 4.5,
        isOrganizer: false,
        isSelf: false,
      },
    ];
  }

  participants = participants.map(enrichParticipantRow);

  return { ...base, participants, waitingList: [] };
}
