import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import type { Conversation, Message, Sortie } from '@/types/messaging';

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const now = Date.now();

const seedConversations: Conversation[] = [
  {
    id: 'c1',
    title: 'Équipe weekend',
    type: 'group',
    lastMessagePreview: 'On se retrouve à 10h ?',
    updatedAt: now - 3_600_000,
  },
  {
    id: 'c2',
    title: 'Samira Benali',
    type: 'direct',
    lastMessagePreview: 'Parfait, à tout à l’heure.',
    updatedAt: now - 12_000_000,
  },
  {
    id: 'c3',
    title: 'Club photo',
    type: 'group',
    lastMessagePreview: 'Photos de la rando dans le drive.',
    updatedAt: now - 86_400_000,
  },
];

const seedMessages: Record<string, Message[]> = {
  c1: [
    {
      id: 'm1',
      conversationId: 'c1',
      text: 'Idée de rando dimanche au lac ?',
      sentAt: now - 5_000_000,
      isOwn: false,
      authorName: 'Léo',
    },
    {
      id: 'm2',
      conversationId: 'c1',
      text: 'Carrement, je suis partant.',
      sentAt: now - 4_000_000,
      isOwn: true,
    },
    {
      id: 'm3',
      conversationId: 'c1',
      text: 'On se retrouve à 10h ?',
      sentAt: now - 3_600_000,
      isOwn: false,
      authorName: 'Inès',
    },
  ],
  c2: [
    {
      id: 'm4',
      conversationId: 'c2',
      text: 'Tu arrives vers quelle heure au café ?',
      sentAt: now - 15_000_000,
      isOwn: false,
    },
    {
      id: 'm5',
      conversationId: 'c2',
      text: 'Vers 15h, je te préviens si retard.',
      sentAt: now - 14_000_000,
      isOwn: true,
    },
    {
      id: 'm6',
      conversationId: 'c2',
      text: 'Parfait, à tout à l’heure.',
      sentAt: now - 12_000_000,
      isOwn: false,
    },
  ],
  c3: [
    {
      id: 'm7',
      conversationId: 'c3',
      text: 'Merci à tous pour la sortie !',
      sentAt: now - 90_000_000,
      isOwn: false,
      authorName: 'Admin',
    },
    {
      id: 'm8',
      conversationId: 'c3',
      text: 'Photos de la rando dans le drive.',
      sentAt: now - 86_400_000,
      isOwn: false,
      authorName: 'Julien',
    },
  ],
};

const seedSorties: Sortie[] = [
  {
    id: 's1',
    conversationId: 'c1',
    title: 'Rando au lac de Fully',
    dateLabel: 'Dimanche 10:00',
    location: 'Parking du téléphérique',
    notes: 'Prévoir picnic',
    createdAt: now - 2_000_000,
  },
  {
    id: 's2',
    conversationId: 'c3',
    title: 'Sortie golden hour',
    dateLabel: 'Samedi 18:30',
    location: 'Pont du Mont-Blanc',
    createdAt: now - 100_000_000,
  },
];

type MessagingContextValue = {
  conversations: Conversation[];
  getConversation: (id: string) => Conversation | undefined;
  messagesByConversation: Record<string, Message[]>;
  sendMessage: (conversationId: string, text: string) => void;
  sorties: Sortie[];
  addSortie: (input: Omit<Sortie, 'id' | 'createdAt'>) => void;
  sortiesForConversation: (conversationId: string) => Sortie[];
};

const MessagingContext = createContext<MessagingContextValue | null>(null);

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(seedConversations);
  const [messagesByConversation, setMessagesByConversation] =
    useState<Record<string, Message[]>>(seedMessages);
  const [sorties, setSorties] = useState<Sortie[]>(seedSorties);

  const getConversation = useCallback(
    (id: string) => conversations.find((c) => c.id === id),
    [conversations],
  );

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

  const addSortie = useCallback((input: Omit<Sortie, 'id' | 'createdAt'>) => {
    const sortie: Sortie = {
      ...input,
      id: makeId('sortie'),
      createdAt: Date.now(),
    };
    setSorties((prev) => [sortie, ...prev]);
  }, []);

  const sortiesForConversation = useCallback(
    (conversationId: string) => sorties.filter((s) => s.conversationId === conversationId),
    [sorties],
  );

  const value = useMemo(
    () => ({
      conversations,
      getConversation,
      messagesByConversation,
      sendMessage,
      sorties,
      addSortie,
      sortiesForConversation,
    }),
    [
      conversations,
      getConversation,
      messagesByConversation,
      sendMessage,
      sorties,
      addSortie,
      sortiesForConversation,
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
