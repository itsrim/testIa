import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { playIncomingMessageFeedback } from '@/lib/playIncomingMessageFeedback';
import {
  groupHasFriendForMessages,
  type Conversation,
  type GroupChatSettings,
  type GroupMember,
  type Message,
  type MessageMediaAttachment,
  type Sortie,
  type StoryHighlight,
} from '@/types/messaging';

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function lastPreviewForOutgoing(trimmed: string, media?: MessageMediaAttachment): string {
  if (media && trimmed) {
    return media.kind === 'image' ? `📷 ${trimmed}` : `🎬 ${trimmed}`;
  }
  if (media) {
    return media.kind === 'image' ? '📷 Photo' : '🎬 Vidéo';
  }
  return trimmed;
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
    memberCount: 5,
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
    memberCount: 4,
  },
  {
    id: 'c4',
    title: 'Team Pastel',
    type: 'group',
    lastMessagePreview: 'Le brief est dans Notion ✓',
    updatedAt: now - 25 * 60_000,
    unreadCount: 1,
    avatarGradient: ['#AB47BC', '#7E57C2'],
    memberCount: 3,
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

const EXTRA_MEMBER_NAMES = ['Sam', 'Julie', 'Noah', 'Chloé', 'Emma', 'Lucas', 'Zoé', 'Manon', 'Tom', 'Lina'];

const GRADIENT_POOL: readonly (readonly [string, string])[] = [
  ['#5C6BC0', '#3949AB'],
  ['#EC407A', '#AD1457'],
  ['#FFA726', '#F57C00'],
  ['#26A69A', '#00897B'],
  ['#7E57C2', '#5E35B1'],
  ['#EF5350', '#C62828'],
  ['#42A5F5', '#1565C0'],
  ['#66BB6A', '#2E7D32'],
];

const seedMembersByConversation: Record<string, GroupMember[]> = {
  c2: [
    { id: 'c2-a', displayName: 'Antoine', isSelf: false, avatarGradient: ['#5C6BC0', '#3949AB'] },
    { id: 'c2-b', displayName: 'Léa', isSelf: false, avatarGradient: ['#EC407A', '#AD1457'] },
    { id: 'c2-c', displayName: 'Kevin', isSelf: false, avatarGradient: ['#FFA726', '#F57C00'] },
    {
      id: 'c2-d',
      displayName: 'Inès',
      isSelf: false,
      avatarGradient: ['#26A69A', '#00897B'],
      isFriendWithMe: true,
    },
    { id: 'c2-me', displayName: 'Moi', isSelf: true, avatarGradient: ['#78909C', '#546E7A'] },
  ],
  c3: [
    {
      id: 'c3-a',
      displayName: 'Léo',
      isSelf: false,
      avatarGradient: ['#7E57C2', '#5E35B1'],
      isFriendWithMe: true,
    },
    { id: 'c3-b', displayName: 'Camille', isSelf: false, avatarGradient: ['#FF7043', '#E64A19'] },
    { id: 'c3-c', displayName: 'Hugo', isSelf: false, avatarGradient: ['#29B6F6', '#0277BD'] },
    { id: 'c3-me', displayName: 'Moi', isSelf: true, avatarGradient: ['#78909C', '#546E7A'] },
  ],
  c4: [
    { id: 'c4-a', displayName: 'Sam', isSelf: false, avatarGradient: ['#AB47BC', '#6A1B9A'], isFriendWithMe: false },
    { id: 'c4-b', displayName: 'Alex', isSelf: false, avatarGradient: ['#26C6DA', '#00838F'], isFriendWithMe: false },
    { id: 'c4-me', displayName: 'Moi', isSelf: true, avatarGradient: ['#78909C', '#546E7A'] },
  ],
};

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
  sendMessage: (conversationId: string, text: string, media?: MessageMediaAttachment) => void;
  markConversationRead: (conversationId: string) => void;
  sorties: Sortie[];
  addSortie: (input: NewSortieInput) => void;
  sortiesForConversation: (conversationId: string) => Sortie[];
  toggleSortieFavorite: (sortieId: string) => void;
  messagesTabBadgeCount: number;
  visitesTabBadgeCount: number;
  getGroupMembers: (conversationId: string) => GroupMember[];
  /** Groupe : `true` si au moins un autre membre est ami (sinon fil masqué). Les discussions directes : toujours `true`. */
  canViewGroupMessages: (conversationId: string) => boolean;
  getGroupSettings: (conversationId: string) => GroupChatSettings;
  setGroupSettings: (conversationId: string, patch: Partial<GroupChatSettings>) => void;
  removeGroupMember: (conversationId: string, memberId: string) => void;
  addGroupMember: (conversationId: string) => void;
  /** Ajoute un ami invité par nom (liste « inviter un ami »), sans doublon. */
  addGroupMemberInvite: (
    conversationId: string,
    invite: { displayName: string; avatarGradient: readonly [string, string] },
  ) => void;
  /** Crée un groupe dont vous êtes le seul membre ; retourne l’id de conversation. */
  createEmptyGroup: (title: string) => string;
  /**
   * Démo : ajoute un message entrant fictif et applique son / « notification »
   * selon les réglages (vibration si sons autorisés, alerte + badge si notifs autorisées).
   */
  demoSimulateIncomingMessage: (conversationId: string) => void;
  leaveGroup: (conversationId: string) => void;
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
  const [membersByConversation, setMembersByConversation] =
    useState<Record<string, GroupMember[]>>(seedMembersByConversation);
  const [groupSettingsByConversation, setGroupSettingsByConversation] = useState<
    Record<string, GroupChatSettings>
  >({});

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

  const getGroupMembers = useCallback(
    (conversationId: string) => membersByConversation[conversationId] ?? [],
    [membersByConversation],
  );

  const canViewGroupMessages = useCallback(
    (conversationId: string) => {
      const conv = conversations.find((c) => c.id === conversationId);
      if (!conv || conv.type !== 'group') return true;
      return groupHasFriendForMessages(membersByConversation[conversationId] ?? []);
    },
    [conversations, membersByConversation],
  );

  const getGroupSettings = useCallback(
    (conversationId: string): GroupChatSettings => {
      const s = groupSettingsByConversation[conversationId];
      if (!s) {
        return { muteSounds: false, blockNotifications: false, memberBellMuted: {} };
      }
      return {
        muteSounds: s.muteSounds,
        blockNotifications: s.blockNotifications,
        memberBellMuted: s.memberBellMuted ?? {},
      };
    },
    [groupSettingsByConversation],
  );

  const setGroupSettings = useCallback((conversationId: string, patch: Partial<GroupChatSettings>) => {
    setGroupSettingsByConversation((prev) => {
      const cur = prev[conversationId] ?? {
        muteSounds: false,
        blockNotifications: false,
        memberBellMuted: {} as Record<string, boolean>,
      };
      const base: GroupChatSettings = { ...cur, ...patch };
      if (patch.memberBellMuted !== undefined) {
        base.memberBellMuted = { ...(cur.memberBellMuted ?? {}), ...patch.memberBellMuted };
      }
      return { ...prev, [conversationId]: base };
    });
  }, []);

  const sendMessage = useCallback(
    (conversationId: string, text: string, media?: MessageMediaAttachment) => {
    const trimmed = text.trim();
    if (!trimmed && !media) return;

    const conv = conversations.find((c) => c.id === conversationId);
    if (
      conv?.type === 'group' &&
      !groupHasFriendForMessages(membersByConversation[conversationId] ?? [])
    ) {
      return;
    }

    const msg: Message = {
      id: makeId('msg'),
      conversationId,
      text: trimmed,
      sentAt: Date.now(),
      isOwn: true,
      ...(media ? { mediaUri: media.uri, mediaKind: media.kind } : {}),
    };

    const preview = lastPreviewForOutgoing(trimmed, media);

    setMessagesByConversation((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), msg],
    }));

    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessagePreview: preview, updatedAt: Date.now() }
          : c,
      ),
    );
  },
    [conversations, membersByConversation],
  );

  const demoSimulateIncomingMessage = useCallback(
    (conversationId: string) => {
      const conv = getConversation(conversationId);
      if (
        conv?.type === 'group' &&
        !groupHasFriendForMessages(membersByConversation[conversationId] ?? [])
      ) {
        return;
      }
      const s = getGroupSettings(conversationId);
      const text = '[Démo] Message entrant simulé';
      const authorName = 'Test';
      const msg: Message = {
        id: makeId('msg'),
        conversationId,
        text,
        sentAt: Date.now(),
        isOwn: false,
        authorName,
      };
      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), msg],
      }));
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          return {
            ...c,
            lastMessagePreview: text,
            updatedAt: Date.now(),
            unreadCount: s.blockNotifications ? c.unreadCount : c.unreadCount + 1,
          };
        }),
      );

      void playIncomingMessageFeedback(text, s, conv?.title ?? 'Discussion', {
        senderLabel: authorName,
      });
    },
    [getConversation, getGroupSettings, membersByConversation],
  );

  const removeGroupMember = useCallback((conversationId: string, memberId: string) => {
    let nextLen = 0;
    setMembersByConversation((prev) => {
      const list = prev[conversationId] ?? [];
      const next = list.filter((m) => m.id !== memberId);
      nextLen = next.length;
      return { ...prev, [conversationId]: next };
    });
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId && c.type === 'group' ? { ...c, memberCount: nextLen } : c,
      ),
    );
  }, []);

  const addGroupMember = useCallback((conversationId: string) => {
    let nextLen = 0;
    let changed = false;
    setMembersByConversation((prev) => {
      const list = prev[conversationId] ?? [];
      const taken = new Set(list.map((m) => m.displayName));
      const name = EXTRA_MEMBER_NAMES.find((n) => !taken.has(n));
      if (!name) return prev;
      const g = GRADIENT_POOL[list.length % GRADIENT_POOL.length];
      const member: GroupMember = {
        id: makeId('mem'),
        displayName: name,
        isSelf: false,
        avatarGradient: [g[0], g[1]],
        isFriendWithMe: false,
      };
      const next = [...list, member];
      nextLen = next.length;
      changed = true;
      return { ...prev, [conversationId]: next };
    });
    if (changed) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId && c.type === 'group' ? { ...c, memberCount: nextLen } : c,
        ),
      );
    }
  }, []);

  const createEmptyGroup = useCallback((title: string) => {
    const trimmed = title.trim();
    const id = makeId('grp');
    setConversations((prev) => {
      const g = GRADIENT_POOL[prev.length % GRADIENT_POOL.length];
      const conv: Conversation = {
        id,
        title: trimmed,
        type: 'group',
        lastMessagePreview: 'Invitez des membres depuis les paramètres.',
        updatedAt: Date.now(),
        unreadCount: 0,
        storyBadgeCount: 0,
        avatarGradient: [g[0], g[1]],
        memberCount: 1,
      };
      return [conv, ...prev];
    });
    setMembersByConversation((prev) => ({
      ...prev,
      [id]: [
        {
          id: `${id}-me`,
          displayName: 'Moi',
          isSelf: true,
          avatarGradient: ['#78909C', '#546E7A'],
        },
      ],
    }));
    setMessagesByConversation((prev) => ({ ...prev, [id]: [] }));
    return id;
  }, []);

  const addGroupMemberInvite = useCallback(
    (
      conversationId: string,
      invite: { displayName: string; avatarGradient: readonly [string, string] },
    ) => {
      let nextLen = 0;
      let changed = false;
      setMembersByConversation((prev) => {
        const list = prev[conversationId] ?? [];
        if (list.some((m) => m.displayName === invite.displayName)) return prev;
        const member: GroupMember = {
          id: makeId('mem'),
          displayName: invite.displayName,
          isSelf: false,
          avatarGradient: [invite.avatarGradient[0], invite.avatarGradient[1]],
          isFriendWithMe: true,
        };
        const next = [...list, member];
        nextLen = next.length;
        changed = true;
        return { ...prev, [conversationId]: next };
      });
      if (changed) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId && c.type === 'group' ? { ...c, memberCount: nextLen } : c,
          ),
        );
      }
    },
    [],
  );

  const leaveGroup = useCallback((conversationId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    setMessagesByConversation((prev) => {
      const n = { ...prev };
      delete n[conversationId];
      return n;
    });
    setMembersByConversation((prev) => {
      const n = { ...prev };
      delete n[conversationId];
      return n;
    });
    setGroupSettingsByConversation((prev) => {
      const n = { ...prev };
      delete n[conversationId];
      return n;
    });
    setSorties((prev) => prev.filter((s) => s.conversationId !== conversationId));
  }, []);

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
      getGroupMembers,
      canViewGroupMessages,
      getGroupSettings,
      setGroupSettings,
      removeGroupMember,
      addGroupMember,
      addGroupMemberInvite,
      createEmptyGroup,
      demoSimulateIncomingMessage,
      leaveGroup,
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
      getGroupMembers,
      canViewGroupMessages,
      getGroupSettings,
      setGroupSettings,
      removeGroupMember,
      addGroupMember,
      addGroupMemberInvite,
      createEmptyGroup,
      demoSimulateIncomingMessage,
      leaveGroup,
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
