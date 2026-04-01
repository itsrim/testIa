import type { Event } from '@/types/messaging';

export type EventParticipantDetail = {
  id: string;
  displayName: string;
  avatarUrl: string;
  rating: number;
  isOrganizer: boolean;
  isSelf: boolean;
};

export type EventWaitingMember = {
  id: string;
  displayName: string;
  rating: number;
  avatarUrl?: string;
  /** Demande d’inscription de l’utilisateur courant (annulation / validation). */
  isViewerRequest?: boolean;
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

/** Détail riche par id d’événement (`events.csv`) — noms alignés sur `group_members.csv`. */
export const EVENT_DETAIL_SEED: Record<string, EventDetailRich> = {
  e3: {
    descriptionParagraphs: [
      'Parcours flânerie en soirée : lumières sur le Rhône et la vieille ville, pauses photo.',
      'Chaussures plates conseillées ; on termine vers une terrasse couverte si pluie.',
    ],
    participants: [
      { id: 'p1', displayName: 'Léo', avatarUrl: av('Leo', '7E57C2'), rating: 4.7, isOrganizer: true, isSelf: false },
      { id: 'p2', displayName: 'Camille', avatarUrl: av('Camille', 'FF7043'), rating: 4.4, isOrganizer: false, isSelf: false },
      { id: 'p3', displayName: 'Moi', avatarUrl: av('Moi', '78909C'), rating: 4.4, isOrganizer: false, isSelf: true },
      { id: 'p4', displayName: 'Hugo', avatarUrl: av('Hugo', '29B6F6'), rating: 4.6, isOrganizer: false, isSelf: false },
    ],
    waitingList: [],
    showRemoveOtherParticipants: false,
  },
  e10: {
    descriptionParagraphs: [
      'Sortie neige légère côté Givrine : raquettes optionnelles selon météo.',
      'Covoiturage depuis Nyon — précisez vos places dans le fil ; départ groupé 8h.',
    ],
    participants: [
      { id: 'p1', displayName: 'Léa', avatarUrl: av('Lea', 'EC407A'), rating: 4.6, isOrganizer: true, isSelf: false },
      { id: 'p2', displayName: 'Antoine', avatarUrl: av('Antoine', '5C6BC0'), rating: 4.3, isOrganizer: false, isSelf: false },
      { id: 'p3', displayName: 'Moi', avatarUrl: av('Moi', '78909C'), rating: 4.5, isOrganizer: false, isSelf: true },
      { id: 'p4', displayName: 'Inès', avatarUrl: av('Ines', '26A69A'), rating: 4.8, isOrganizer: false, isSelf: false },
      { id: 'p5', displayName: 'Kevin', avatarUrl: av('Kevin', 'FFA726'), rating: 4.1, isOrganizer: false, isSelf: false },
    ],
    waitingList: [],
    showRemoveOtherParticipants: false,
  },
  e13: {
    descriptionParagraphs: [
      'Itinéraire patrimoine : Molard, courbes de l’Escalade, ruelles, pause café rue Perron.',
      'Tenue décontractée ; le groupe attend 5 min max à chaque étape.',
    ],
    participants: [
      { id: 'p1', displayName: 'Hugo', avatarUrl: av('Hugo', '29B6F6'), rating: 4.5, isOrganizer: false, isSelf: false },
      { id: 'p2', displayName: 'Léo', avatarUrl: av('Leo', '7E57C2'), rating: 4.7, isOrganizer: true, isSelf: false },
      { id: 'p3', displayName: 'Moi', avatarUrl: av('Moi', '78909C'), rating: 4.4, isOrganizer: false, isSelf: true },
      { id: 'p4', displayName: 'Camille', avatarUrl: av('Camille', 'FF7043'), rating: 4.3, isOrganizer: false, isSelf: false },
    ],
    waitingList: [],
    showRemoveOtherParticipants: false,
  },
  e15: {
    descriptionParagraphs: [
      'Boucle Voiron / Saint-Aupre : dénivelé modéré, picnic en crêt si météo sèche.',
      'RDV 8h Cornavin : on valide le nombre de voitures la veille dans ce fil.',
    ],
    participants: [
      { id: 'p1', displayName: 'Antoine', avatarUrl: av('Antoine', '5C6BC0'), rating: 4.5, isOrganizer: true, isSelf: false },
      { id: 'p2', displayName: 'Moi', avatarUrl: av('Moi', '78909C'), rating: 4.5, isOrganizer: false, isSelf: true },
      { id: 'p3', displayName: 'Inès', avatarUrl: av('Ines', '26A69A'), rating: 4.8, isOrganizer: false, isSelf: false },
      { id: 'p4', displayName: 'Kevin', avatarUrl: av('Kevin', 'FFA726'), rating: 4.2, isOrganizer: false, isSelf: false },
      { id: 'p5', displayName: 'Léa', avatarUrl: av('Lea', 'EC407A'), rating: 4.6, isOrganizer: false, isSelf: false },
    ],
    waitingList: [],
    showRemoveOtherParticipants: false,
  },
  e17: {
    descriptionParagraphs: [
      'Escape « Laboratoire » — 60 min, deux salles côte à côte si nous sommes 8+.',
      'Tu es co-organisateur·rice : tu peux ajuster la liste avant jeudi minuit.',
    ],
    participants: [
      {
        id: 'p1',
        displayName: 'Moi',
        avatarUrl: av('Moi', 'AB47BC'),
        rating: 4.8,
        isOrganizer: true,
        isSelf: true,
      },
      { id: 'p2', displayName: 'Sam', avatarUrl: av('Sam', '7E57C2'), rating: 4.7, isOrganizer: true, isSelf: false },
      { id: 'p3', displayName: 'Alex', avatarUrl: av('Alex', '26C6DA'), rating: 4.2, isOrganizer: false, isSelf: false },
      { id: 'p4', displayName: 'Julie', avatarUrl: av('Julie', 'EC407A'), rating: 4.4, isOrganizer: false, isSelf: false },
    ],
    waitingList: [
      { id: 'w1', displayName: 'Marc', rating: 4.0, avatarUrl: av('Marc', '616161') },
      { id: 'w2', displayName: 'Clara', rating: 4.5, avatarUrl: av('Clara', 'EC407A') },
    ],
    showRemoveOtherParticipants: true,
  },
  /** Sortie démo : validation manuelle + participants alignés sur le groupe c2 (Rando Dimanche). */
  e21: {
    descriptionParagraphs: [
      'Randonnée démo : file d’attente et retraits pour tester l’organisateur.',
      'Les membres listés correspondent au groupe « Rando Dimanche » (CSV).',
    ],
    participants: [
      { id: 'p-l', displayName: 'Léa', avatarUrl: av('Lea', 'EC407A'), rating: 4.6, isOrganizer: true, isSelf: false },
      { id: 'p-a', displayName: 'Antoine', avatarUrl: av('Antoine', '5C6BC0'), rating: 4.3, isOrganizer: false, isSelf: false },
      { id: 'p-me', displayName: 'Moi', avatarUrl: av('Moi', '78909C'), rating: 4.5, isOrganizer: false, isSelf: true },
      { id: 'p-i', displayName: 'Inès', avatarUrl: av('Ines', '26A69A'), rating: 4.8, isOrganizer: false, isSelf: false },
      { id: 'p-k', displayName: 'Kevin', avatarUrl: av('Kevin', 'FFA726'), rating: 4.1, isOrganizer: false, isSelf: false },
    ],
    waitingList: [
      { id: 'w-e21a', displayName: 'Hugo', rating: 4.5, avatarUrl: av('Hugo', '29B6F6') },
      { id: 'w-e21b', displayName: 'Camille', rating: 4.3, avatarUrl: av('Camille', 'FF7043') },
    ],
    showRemoveOtherParticipants: true,
  },
  e20: {
    descriptionParagraphs: [
      'Clôture trimestre Team Pastel : tapas partagées, bilan léger et vacances à planifier.',
      'Précisez allergies / végé dans le fil ; terrasse couverte réservée.',
    ],
    participants: [
      { id: 'p1', displayName: 'Sam', avatarUrl: av('Sam', '7E57C2'), rating: 4.9, isOrganizer: true, isSelf: false },
      { id: 'p2', displayName: 'Alex', avatarUrl: av('Alex', '26C6DA'), rating: 4.3, isOrganizer: false, isSelf: false },
      { id: 'p3', displayName: 'Moi', avatarUrl: av('Moi', '78909C'), rating: 4.5, isOrganizer: false, isSelf: true },
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
      participants.push({
        id: `guest-${i}`,
        displayName: `Invité ${i + 1}`,
        avatarUrl: av(`Inv${i + 1}`, '5C6BC0'),
        rating: 4.2,
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

  return { ...base, participants, waitingList: [] };
}
