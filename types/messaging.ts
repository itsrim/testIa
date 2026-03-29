export type ConversationType = 'direct' | 'group';

export interface GroupMember {
  id: string;
  displayName: string;
  isSelf: boolean;
  avatarGradient: readonly [string, string];
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

export interface Message {
  id: string;
  conversationId: string;
  text: string;
  sentAt: number;
  isOwn: boolean;
  authorName?: string;
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
