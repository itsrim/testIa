export type ConversationType = 'direct' | 'group';

export interface GroupMember {
  id: string;
  displayName: string;
  isSelf: boolean;
  avatarGradient: readonly [string, string];
  /** `true` = dans votre liste d’amis ; utilisé pour l’accès aux messages de groupe. */
  isFriendWithMe?: boolean;
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
  /** Pastille type « story » en en-tête */
  storyBadgeCount?: number;
  /** Couleurs avatar story (dégradé) */
  avatarGradient: readonly [string, string];
  /** Groupe uniquement — sous-titre header « N membres » */
  memberCount?: number;
}

export interface StoryHighlight {
  id: string;
  label: string;
  badgeCount: number;
  isGroup: boolean;
  gradient: readonly [string, string];
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

export type SortieCardStatus = 'inscrit' | 'organisateur' | 'join';

export interface Sortie {
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
  cardStatus: SortieCardStatus;
  isFavorite: boolean;
  sectionDateLabel: string;
}
