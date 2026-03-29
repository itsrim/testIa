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

/** Détail riche par id d’événement (`events.csv`). */
const SEED: Record<string, EventDetailRich> = {
  e7: {
    descriptionParagraphs: [
      'Atelier peinture collective à La Pachanga le 26 mars. Matériel fourni sur place, tenue conseillée confortable.',
      'Un moment convivial pour progresser à votre rythme, encadré par un artiste local. Places limitées : inscrivez-vous tôt !',
    ],
    participants: [
      { id: 'p1', displayName: 'Léa', avatarUrl: av('Lea', 'EC407A'), rating: 4.6, isOrganizer: false, isSelf: false },
      { id: 'p2', displayName: 'Tom', avatarUrl: av('Tom', '5C6BC0'), rating: 4.2, isOrganizer: false, isSelf: false },
      { id: 'p3', displayName: 'Inès', avatarUrl: av('Ines', '26A69A'), rating: 4.9, isOrganizer: false, isSelf: false },
      { id: 'p4', displayName: 'Moi', avatarUrl: av('Moi', '78909C'), rating: 4.4, isOrganizer: false, isSelf: true },
    ],
    waitingList: [],
    showRemoveOtherParticipants: false,
  },
  e8: {
    descriptionParagraphs: [
      'Randonnée vers le lac : départ du parking téléphérique. Prévoir chaussures de marche et eau.',
      'Groupe convivial, pauses photo ; durée estimée 3 h. Vous êtes l’organisateur : vous pouvez gérer la liste des participants.',
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
      { id: 'p2', displayName: 'Rose', avatarUrl: av('Rose', 'F48FB1'), rating: 4.5, isOrganizer: false, isSelf: false },
      { id: 'p3', displayName: 'Emma', avatarUrl: av('Emma', 'FFB74D'), rating: 4.3, isOrganizer: false, isSelf: false },
      { id: 'p4', displayName: 'Sophie', avatarUrl: av('Sophie', '81C784'), rating: 4.7, isOrganizer: false, isSelf: false },
    ],
    waitingList: [
      { id: 'w1', displayName: 'Nathan', rating: 4.1, avatarUrl: av('Nathan', '424242') },
    ],
    showRemoveOtherParticipants: true,
  },
  e9: {
    descriptionParagraphs: [
      'Atelier DIY créatif à Paris : vous repartez avec votre réalisation. Tout le matériel est inclus.',
      'Session en petit groupe pour un accompagnement personnalisé. Parfait pour débuter ou perfectionner une technique.',
    ],
    participants: [
      { id: 'p1', displayName: 'Camille', avatarUrl: av('Camille', 'C62828'), rating: 4.5, isOrganizer: true, isSelf: false },
      { id: 'p2', displayName: 'Moi', avatarUrl: av('Moi', '78909C'), rating: 4.2, isOrganizer: false, isSelf: true },
      { id: 'p3', displayName: 'Noah', avatarUrl: av('Noah', '6A1B9A'), rating: 4.8, isOrganizer: false, isSelf: false },
    ],
    waitingList: [],
    showRemoveOtherParticipants: false,
  },
  e10: {
    descriptionParagraphs: [
      'Soirée poker débutants / intermédiaires : jetons fournis, pas d’argent réel.',
      'Règles expliquées en début de soirée. Inscrivez-vous pour recevoir le code d’accès au fil de la conversation.',
    ],
    participants: [
      { id: 'p1', displayName: 'Hugo', avatarUrl: av('Hugo', '1565C0'), rating: 4.7, isOrganizer: true, isSelf: false },
      { id: 'p2', displayName: 'Lina', avatarUrl: av('Lina', 'AD1457'), rating: 4.1, isOrganizer: false, isSelf: false },
    ],
    waitingList: [],
    showRemoveOtherParticipants: false,
  },
  e12: {
    descriptionParagraphs: [
      'Soirée jeux chez Sam : apportez un jeu de société si vous le souhaitez (voir notes).',
      'Tournois légers, pause pizzas. Complet — liste d’attente ouverte.',
    ],
    participants: [
      { id: 'p1', displayName: 'Sam', avatarUrl: av('Sam', '7E57C2'), rating: 4.9, isOrganizer: true, isSelf: false },
      { id: 'p2', displayName: 'Alex', avatarUrl: av('Alex', '29B6F6'), rating: 4.2, isOrganizer: false, isSelf: false },
      { id: 'p3', displayName: 'Moi', avatarUrl: av('Moi', '78909C'), rating: 4.5, isOrganizer: false, isSelf: true },
      { id: 'p4', displayName: 'Zoé', avatarUrl: av('Zoe', 'FF7043'), rating: 4.4, isOrganizer: false, isSelf: false },
    ],
    waitingList: [
      { id: 'w1', displayName: 'Clara', rating: 4.3, avatarUrl: av('Clara', '616161') },
      { id: 'w2', displayName: 'Léa', rating: 4.5, avatarUrl: av('Lea', '757575') },
      { id: 'w3', displayName: 'Manon', rating: 4.0, avatarUrl: av('Manon', '8E8E93') },
    ],
    showRemoveOtherParticipants: false,
  },
  e13: {
    descriptionParagraphs: [
      'Brunch d’équipe rue du Stand : formule salé / sucré, boissons chaudes incluses.',
      'Ambiance détendue ; merci de préciser vos allergies dans le fil de discussion après inscription.',
    ],
    participants: [
      { id: 'p1', displayName: 'Marc', avatarUrl: av('Marc', '3949AB'), rating: 4.0, isOrganizer: true, isSelf: false },
      { id: 'p2', displayName: 'Julie', avatarUrl: av('Julie', 'D81B60'), rating: 4.6, isOrganizer: false, isSelf: false },
      { id: 'p3', displayName: 'Paul', avatarUrl: av('Paul', '00897B'), rating: 3.9, isOrganizer: false, isSelf: false },
    ],
    waitingList: [],
    showRemoveOtherParticipants: false,
  },
};

function defaultRich(event: Event): EventDetailRich {
  return {
    descriptionParagraphs: [
      `Événement « ${event.title} » le ${event.dateLabel}. Rejoignez-nous pour une expérience conviviale !`,
      event.notes?.trim() ??
        'Les inscriptions et le fil de discussion sont disponibles depuis la conversation du groupe.',
    ],
    participants: [],
    waitingList: [],
    showRemoveOtherParticipants: event.cardStatus === 'organisateur',
  };
}

export function getEventDetailRich(event: Event): EventDetailRich {
  const base = SEED[event.id] ?? defaultRich(event);
  if (base.participants.length === 0 && event.participantCount > 0) {
    return {
      ...base,
      participants: [
        {
          id: 'px',
          displayName: 'Participants',
          avatarUrl: av('Groupe', '424242'),
          rating: 4.5,
          isOrganizer: false,
          isSelf: false,
        },
      ],
    };
  }
  return base;
}
