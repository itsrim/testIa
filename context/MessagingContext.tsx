import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { playIncomingMessageFeedback } from '@/lib/playIncomingMessageFeedback';
import { mockMessagingSeed } from '@/data/mockDataLoader';
import {
  groupHasFriendForMessages,
  type Conversation,
  type GroupChatSettings,
  type GroupMember,
  type Message,
  type MessageMediaAttachment,
  type Event,
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

const {
  favoriteConversationIds: seedFavoriteConversationIds,
  conversations: seedConversations,
  membersByConversation: seedMembersByConversation,
  messagesByConversation: seedMessages,
  events: seedEvents,
} = mockMessagingSeed;

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

export type NewEventInput = {
  conversationId: string;
  title: string;
  dateLabel: string;
  location: string;
  notes?: string;
  timeShort?: string;
  priceLabel?: string;
  imageUri?: string;
  participantMax?: number;
  cardStatus?: Event['cardStatus'];
  sectionDateLabel?: string;
  /** ISO YYYY-MM-DD (défaut : jour courant). */
  dateKey?: string;
  hideAddress?: boolean;
  manualApproval?: boolean;
};

type MessagingContextValue = {
  /** Ordre du bandeau « Conversations favoris » en tête d’écran (ids de `conversations`). */
  favoriteConversationIds: readonly string[];
  conversations: Conversation[];
  getConversation: (id: string) => Conversation | undefined;
  messagesByConversation: Record<string, Message[]>;
  sendMessage: (conversationId: string, text: string, media?: MessageMediaAttachment) => void;
  markConversationRead: (conversationId: string) => void;
  events: Event[];
  addEvent: (input: NewEventInput) => void;
  eventsForConversation: (conversationId: string) => Event[];
  getEventById: (eventId: string) => Event | undefined;
  toggleEventFavorite: (eventId: string) => void;
  /** Passe un événement en statut inscrit (démo). */
  joinEvent: (eventId: string) => void;
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
  const [events, setEvents] = useState<Event[]>(seedEvents);
  const [membersByConversation, setMembersByConversation] =
    useState<Record<string, GroupMember[]>>(seedMembersByConversation);
  const [groupSettingsByConversation, setGroupSettingsByConversation] = useState<
    Record<string, GroupChatSettings>
  >({});

  const messagesTabBadgeCount = useMemo(() => sumUnread(conversations), [conversations]);
  const visitesTabBadgeCount = mockMessagingSeed.visitesTabBadgeCount;

  const getConversation = useCallback(
    (id: string) => conversations.find((c) => c.id === id),
    [conversations],
  );

  const markConversationRead = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
    );
  }, []);

  const addEvent = useCallback((input: NewEventInput) => {
    const event: Event = {
      id: makeId('event'),
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
      dateKey: input.dateKey ?? new Date().toISOString().slice(0, 10),
      sectionDateLabel: input.sectionDateLabel ?? 'À venir',
      hideAddress: input.hideAddress,
      manualApproval: input.manualApproval,
    };
    setEvents((prev) => [event, ...prev]);
  }, []);

  const toggleEventFavorite = useCallback((eventId: string) => {
    setEvents((prev) =>
      prev.map((s) => (s.id === eventId ? { ...s, isFavorite: !s.isFavorite } : s)),
    );
  }, []);

  const getEventById = useCallback(
    (eventId: string) => events.find((s) => s.id === eventId),
    [events],
  );

  const joinEvent = useCallback((eventId: string) => {
    setEvents((prev) =>
      prev.map((s) => {
        if (s.id !== eventId || s.cardStatus !== 'join') return s;
        if (s.participantCount >= s.participantMax) return s;
        return {
          ...s,
          cardStatus: 'inscrit',
          participantCount: s.participantCount + 1,
        };
      }),
    );
  }, []);

  const eventsForConversation = useCallback(
    (conversationId: string) => events.filter((s) => s.conversationId === conversationId),
    [events],
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
    setEvents((prev) => prev.filter((s) => s.conversationId !== conversationId));
  }, []);

  const value = useMemo(
    () => ({
      favoriteConversationIds: seedFavoriteConversationIds,
      conversations,
      getConversation,
      messagesByConversation,
      sendMessage,
      markConversationRead,
      events,
      addEvent,
      eventsForConversation,
      getEventById,
      toggleEventFavorite,
      joinEvent,
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
      events,
      addEvent,
      eventsForConversation,
      getEventById,
      toggleEventFavorite,
      joinEvent,
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
