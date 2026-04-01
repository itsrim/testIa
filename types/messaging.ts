export type ConversationType = 'direct' | 'group';

export interface GroupMember {
  id: string;
  displayName: string;
  isSelf: boolean;
  avatarGradient: readonly [string, string];
  /** `true` = dans votre liste d’amis ; utilisé pour l’accès aux messages de groupe. */
  isFriendWithMe?: boolean;
  /** Si défini : id de fiche profil (`sg1`, …) dans les données suggestions ; sinon fiche synthétique. */
  profilId?: string;
}

/** Groupe : l’historique est lisible seulement si au moins un autre membre est ami. */
export function groupHasFriendForMessages(members: GroupMember[]): boolean {
  return members.some((m) => !m.isSelf && m.isFriendWithMe === true);
}

export interface GroupChatSettings {
  muteSounds: boolean;
  blockNotifications: boolean;
  /** Par id membre : true = notifications discrètes / muet pour ce membre */
  memberBellMuted?: Record<string, boolean>;
}

export interface Conversation {
  id: string;
  title: string;
  type: ConversationType;
  lastMessagePreview: string;
  updatedAt: number;
  unreadCount: number;
  /** Pastille optionnelle en en-tête (favoris / activité) */
  storyBadgeCount?: number;
  /** Couleurs du dégradé (avatar liste et bandeau favoris) */
  avatarGradient: readonly [string, string];
  /** Groupe uniquement — sous-titre header « N membres » */
  memberCount?: number;
}

export type MessageMediaKind = 'image' | 'video';

/** Média choisi avant envoi (même forme que les champs stockés sur `Message`). */
export interface MessageMediaAttachment {
  uri: string;
  kind: MessageMediaKind;
}

export interface Message {
  id: string;
  conversationId: string;
  text: string;
  sentAt: number;
  isOwn: boolean;
  authorName?: string;
  mediaUri?: string;
  mediaKind?: MessageMediaKind;
}

/** Statut de la participation (côté utilisateur courant dans l’app démo). */
export type EventCardStatus = 'inscrit' | 'organisateur' | 'join' | 'en_attente';

export interface Event {
  id: string;
  conversationId: string;
  title: string;
  dateLabel: string;
  timeShort: string;
  location: string;
  notes?: string;
  createdAt: number;
  imageUri: string;
  priceLabel: string;
  participantCount: number;
  participantMax: number;
  cardStatus: EventCardStatus;
  isFavorite: boolean;
  /** ISO YYYY-MM-DD — tri chronologique et filtre calendrier (données `events.csv`). */
  dateKey: string;
  sectionDateLabel: string;
  /** Création : ne pas afficher l’adresse précise publiquement. */
  hideAddress?: boolean;
  /** Création : l’organisateur valide chaque inscription. */
  manualApproval?: boolean;
  /** Sortie pilote / programme bêta (masquable côté admin dans les paramètres session). */
  isBeta?: boolean;
}
