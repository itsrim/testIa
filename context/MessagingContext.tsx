import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import type { Conversation, Message, Sortie, StoryHighlight } from '@/types/messaging';

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const now = Date.now();

const seedStories: StoryHighlight[] = [
  { id: 'st1', label: 'Rando D...', badgeCount: 5, isGroup: true, gradient: ['#FF7043', '#FFA726'] },
  { id: 'st2', label: 'Team Pa...', badgeCount: 3, isGroup: true, gradient: ['#7E57C2', '#5C6BC0'] },
  { id: 'st3', label: 'Maya', badgeCount: 2, isGroup: false, gradient: ['#EC407A', '#AB47BC'] },
  { id: 'st4', label: 'Club UX', badgeCount: 4, isGroup: true, gradient: ['#26C6DA', '#42A5F5'] },
  { id: 'st5', label: 'Lily', badgeCount: 0, isGroup: false, gradient: ['#66BB6A', '#26A69A'] },
];

const seedConversations: Conversation[] = [
  {
    id: 'c1',
    title: 'Maya',
    type: 'direct',
    lastMessagePreview: 'Super ! On se retrouve là-bas alors 😊',
    updatedAt: now - 3 * 60_000,
    unreadCount: 2,
    storyBadgeCount: 2,
    avatarGradient: ['#EC407A', '#AB47BC'],
  },
  {
    id: 'c2',
    title: 'Rando Dimanche',
    type: 'group',
    lastMessagePreview: 'RDV 8h à la gare',
    updatedAt: now - 5 * 60_000,
    unreadCount: 5,
    storyBadgeCount: 5,
    avatarGradient: ['#FF7043', '#FFCA28'],
    memberCount: 12,
  },
  {
    id: 'c3',
    title: 'Randonnée Urbaine',
    type: 'group',
    lastMessagePreview: 'Billets réservés !',
    updatedAt: now - 10 * 60_000,
    unreadCount: 3,
    storyBadgeCount: 3,
    avatarGradient: ['#5C6BC0', '#42A5F5'],
    memberCount: 8,
  },
  {
    id: 'c4',
    title: 'Team Pastel',
    type: 'group',
    lastMessagePreview: 'Le brief est dans Notion ✓',
    updatedAt: now - 25 * 60_000,
    unreadCount: 1,
    avatarGradient: ['#AB47BC', '#7E57C2'],
    memberCount: 4,
  },
  {
    id: 'c5',
    title: 'Thomas',
    type: 'direct',
    lastMessagePreview: 'Je t’envoie le fichier PDF',
    updatedAt: now - 32 * 60_000,
    unreadCount: 0,
    avatarGradient: ['#78909C', '#546E7A'],
  },
  {
    id: 'c6',
    title: 'Lily',
    type: 'direct',
    lastMessagePreview: 'Merci pour hier c’était sympa !',
    updatedAt: now - 38 * 60_000,
    unreadCount: 0,
    avatarGradient: ['#66BB6A', '#43A047'],
  },
];

const seedMessages: Record<string, Message[]> = {
  c1: [
    {
      id: 'm1',
      conversationId: 'c1',
      text: 'Super ! On se retrouve là-bas alors 😊',
      sentAt: now - 3 * 60_000,
      isOwn: false,
    },
  ],
  c2: [
    {
      id: 'm2a',
      conversationId: 'c2',
      text: 'Haha oui c’est vrai',
      sentAt: now - 6 * 60_000,
      isOwn: false,
      authorName: 'Inès',
    },
    {
      id: 'm2b',
      conversationId: 'c2',
      text: 'test',
      sentAt: now - 5 * 60_000,
      isOwn: true,
    },
    {
      id: 'm2c',
      conversationId: 'c2',
      text: 'RDV 8h à la gare',
      sentAt: now - 4 * 60_000,
      isOwn: false,
      authorName: 'Maya',
    },
  ],
  c3: [
    {
      id: 'm3',
      conversationId: 'c3',
      text: 'Billets réservés !',
      sentAt: now - 10 * 60_000,
      isOwn: false,
      authorName: 'Léo',
    },
  ],
  c4: [],
  c5: [],
  c6: [
    {
      id: 'm6',
      conversationId: 'c6',
      text: 'Merci pour hier c’était sympa !',
      sentAt: now - 38 * 60_000,
      isOwn: false,
    },
  ],
};

const seedSorties: Sortie[] = [
  {
    id: 's1',
    conversationId: 'c2',
    title: 'Cours de Peinture',
    dateLabel: '1 janv. 2026',
    timeShort: '08:00',
    location: 'La Pachanga',
    createdAt: now - 2_000_000,
    imageUri: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600&q=80',
    priceLabel: '142€',
    participantCount: 126,
    participantMax: 200,
    cardStatus: 'inscrit',
    isFavorite: false,
    sectionDateLabel: 'Jeudi 1 Janvier',
  },
  {
    id: 's2',
    conversationId: 'c3',
    title: 'Randonnée lac',
    dateLabel: '1 janv. 2026',
    timeShort: '09:30',
    location: 'Parking téléphérique',
    createdAt: now - 3_000_000,
    imageUri: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80',
    priceLabel: 'Gratuit',
    participantCount: 24,
    participantMax: 40,
    cardStatus: 'organisateur',
    isFavorite: true,
    sectionDateLabel: 'Jeudi 1 Janvier',
  },
  {
    id: 's3',
    conversationId: 'c1',
    title: 'Brunch dimanche',
    dateLabel: '2 janv. 2026',
    timeShort: '11:00',
    location: 'Rue du Stand',
    createdAt: now - 5_000_000,
    imageUri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
    priceLabel: '35€',
    participantCount: 8,
    participantMax: 12,
    cardStatus: 'join',
    isFavorite: false,
    sectionDateLabel: 'Vendredi 2 Janvier',
  },
  {
    id: 's4',
    conversationId: 'c4',
    title: 'Soirée jeux',
    dateLabel: '2 janv. 2026',
    timeShort: '19:00',
    location: 'Chez Sam',
    notes: 'Ramener un jeu',
    createdAt: now - 8_000_000,
    imageUri: 'https://images.unsplash.com/photo-1610890716171-6b1cae5779df?w=600&q=80',
    priceLabel: 'Gratuit',
    participantCount: 12,
    participantMax: 16,
    cardStatus: 'inscrit',
    isFavorite: false,
    sectionDateLabel: 'Vendredi 2 Janvier',
  },
];

export type NewSortieInput = {
  conversationId: string;
  title: string;
  dateLabel: string;
  location: string;
  notes?: string;
  timeShort?: string;
  priceLabel?: string;
  imageUri?: string;
  participantMax?: number;
  cardStatus?: Sortie['cardStatus'];
  sectionDateLabel?: string;
};

type MessagingContextValue = {
  stories: StoryHighlight[];
  conversations: Conversation[];
  getConversation: (id: string) => Conversation | undefined;
  messagesByConversation: Record<string, Message[]>;
  sendMessage: (conversationId: string, text: string) => void;
  markConversationRead: (conversationId: string) => void;
  sorties: Sortie[];
  addSortie: (input: NewSortieInput) => void;
  sortiesForConversation: (conversationId: string) => Sortie[];
  toggleSortieFavorite: (sortieId: string) => void;
  messagesTabBadgeCount: number;
  visitesTabBadgeCount: number;
};

const MessagingContext = createContext<MessagingContextValue | null>(null);

function sumUnread(conversations: Conversation[]) {
  return conversations.reduce((a, c) => a + c.unreadCount, 0);
}

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(seedConversations);
  const [messagesByConversation, setMessagesByConversation] =
    useState<Record<string, Message[]>>(seedMessages);
  const [sorties, setSorties] = useState<Sortie[]>(seedSorties);

  const messagesTabBadgeCount = useMemo(() => sumUnread(conversations), [conversations]);
  const visitesTabBadgeCount = 5;

  const getConversation = useCallback(
    (id: string) => conversations.find((c) => c.id === id),
    [conversations],
  );

  const markConversationRead = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
    );
  }, []);

  const sendMessage = useCallback((conversationId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const msg: Message = {
      id: makeId('msg'),
      conversationId,
      text: trimmed,
      sentAt: Date.now(),
      isOwn: true,
    };

    setMessagesByConversation((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), msg],
    }));

    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessagePreview: trimmed, updatedAt: Date.now() }
          : c,
      ),
    );
  }, []);

  const addSortie = useCallback((input: NewSortieInput) => {
    const sortie: Sortie = {
      id: makeId('sortie'),
      createdAt: Date.now(),
      conversationId: input.conversationId,
      title: input.title,
      dateLabel: input.dateLabel,
      location: input.location,
      notes: input.notes,
      timeShort: input.timeShort ?? '10:00',
      imageUri:
        input.imageUri ??
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
      priceLabel: input.priceLabel ?? 'Gratuit',
      participantCount: 1,
      participantMax: input.participantMax ?? 50,
      cardStatus: input.cardStatus ?? 'join',
      isFavorite: false,
      sectionDateLabel: input.sectionDateLabel ?? 'À venir',
    };
    setSorties((prev) => [sortie, ...prev]);
  }, []);

  const toggleSortieFavorite = useCallback((sortieId: string) => {
    setSorties((prev) =>
      prev.map((s) => (s.id === sortieId ? { ...s, isFavorite: !s.isFavorite } : s)),
    );
  }, []);

  const sortiesForConversation = useCallback(
    (conversationId: string) => sorties.filter((s) => s.conversationId === conversationId),
    [sorties],
  );

  const value = useMemo(
    () => ({
      stories: seedStories,
      conversations,
      getConversation,
      messagesByConversation,
      sendMessage,
      markConversationRead,
      sorties,
      addSortie,
      sortiesForConversation,
      toggleSortieFavorite,
      messagesTabBadgeCount,
      visitesTabBadgeCount,
    }),
    [
      conversations,
      getConversation,
      messagesByConversation,
      sendMessage,
      markConversationRead,
      sorties,
      addSortie,
      sortiesForConversation,
      toggleSortieFavorite,
      messagesTabBadgeCount,
      visitesTabBadgeCount,
    ],
  );

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function useMessaging() {
  const ctx = useContext(MessagingContext);
  if (!ctx) {
    throw new Error('useMessaging doit être utilisé dans MessagingProvider');
  }
  return ctx;
}
