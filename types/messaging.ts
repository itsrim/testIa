export type ConversationType = 'direct' | 'group';

export interface Conversation {
  id: string;
  title: string;
  type: ConversationType;
  lastMessagePreview: string;
  updatedAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  text: string;
  sentAt: number;
  isOwn: boolean;
  authorName?: string;
}

export interface Sortie {
  id: string;
  conversationId: string;
  title: string;
  dateLabel: string;
  location: string;
  notes?: string;
  createdAt: number;
}
