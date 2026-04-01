import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { playIncomingMessageFeedback } from '@/lib/playIncomingMessageFeedback';
import { verifyAndRepairData } from '@/lib/dataIntegrity';
import {
  getEvents,
  getPersistedFavoriteConversationIds,
  getPersistedMessagingChat,
  mockMessagingSeed,
  putEvents,
  putPersistedFavoriteConversationIds,
  putPersistedMessagingChat,
} from '@/services/dataApi';
import {
  getInitialPendingQueuesByEvent,
  type EventParticipantDetail,
  type EventWaitingMember,
} from '@/data/eventDetailSeed';
import {
  groupHasFriendForMessages,
  type Conversation,
  type GroupChatSettings,
  type GroupMember,
  type EventCardStatus,
  type Message,
  type MessageMediaAttachment,
  type Event,
} from '@/types/messaging';

export type OrganizerNotificationItem = {
  id: string;
  eventId: string;
  eventTitle: string;
  body: string;
  createdAt: number;
  read: boolean;
  requestId?: string;
};

function buildSeedOrganizerNotifications(
  evs: Event[],
  queues: Record<string, EventWaitingMember[]>,
): OrganizerNotificationItem[] {
  const list: OrganizerNotificationItem[] = [];
  let t = 0;
  for (const ev of evs) {
    if (!ev.manualApproval || ev.cardStatus !== 'organisateur') continue;
    const q = queues[ev.id] ?? [];
    for (const w of q) {
      t += 1;
      list.push({
        id: `seed-on-${ev.id}-${w.id}`,
        eventId: ev.id,
        eventTitle: ev.title,
        body: `${w.displayName} souhaite rejoindre la sortie.`,
        createdAt: Date.now() - t * 120_000,
        read: false,
        requestId: w.id,
      });
    }
  }
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

function participantFromWaitingMember(w: EventWaitingMember): EventParticipantDetail {
  const avatarUrl =
    w.avatarUrl ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(w.displayName)}&size=128&background=555&color=fff`;
  return {
    id: `ap-${w.id}`,
    displayName: w.displayName,
    avatarUrl,
    rating: w.rating,
    isOrganizer: false,
    isSelf: Boolean(w.isViewerRequest),
    profilId: w.profilId,
  };
}

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

function pickGradientForProfilId(profilId: string): readonly [string, string] {
  let h = 0;
  for (let i = 0; i < profilId.length; i++) {
    h = Math.imul(31, h) + profilId.charCodeAt(i);
  }
  const idx = Math.abs(h) % GRADIENT_POOL.length;
  return GRADIENT_POOL[idx];
}

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
  isBeta?: boolean;
};

type MessagingContextValue = {
  /** Ordre du bandeau « Conversations favoris » en tête d’écran (ids de `conversations`). */
  favoriteConversationIds: readonly string[];
  /** Ajoute ou retire la conversation du bandeau favoris. */
  toggleConversationFavorite: (conversationId: string) => void;
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
  /** Inscription : accès au chat lié une fois accepté (ou tout de suite si pas de validation manuelle). */
  joinEvent: (eventId: string) => void;
  /** Quitte la sortie et retire du chat de groupe associé (si inscrit). Annule une demande en attente. */
  leaveEvent: (eventId: string) => void;
  /** Statut participation côté utilisateur (inclut « en attente » si validation manuelle). */
  getViewerCardStatus: (event: Event) => EventCardStatus;
  /** Organisateur : approuve la première demande en file (FIFO). */
  approveJoinRequest: (eventId: string) => void;
  /** Organisateur : accepte une demande précise dans la file. */
  approvePendingMember: (eventId: string, requestId: string) => void;
  /** Organisateur : refuse / retire une demande de la file d’attente. */
  rejectPendingJoinRequest: (eventId: string, requestId: string) => void;
  /** Organisateur : retire un participant confirmé (hors organisateur). */
  removeEventParticipant: (
    eventId: string,
    participantId: string,
    opts: { isOrganizer: boolean },
  ) => void;
  /** Message d’accueil dans le fil du groupe lié à une nouvelle sortie. */
  postEventGroupWelcome: (conversationId: string, eventTitle: string) => void;
  /** Nombre de demandes d’inscription en attente (validation manuelle). */
  getPendingApprovalCount: (eventId: string) => number;
  getPendingJoinRequests: (eventId: string) => EventWaitingMember[];
  getApprovedParticipantsExtra: (eventId: string) => EventParticipantDetail[];
  getRemovedSeedParticipantIds: (eventId: string) => ReadonlySet<string>;
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
  /** Ouvre ou crée une discussion directe avec une fiche (`profilId`). */
  ensureDirectConversationForProfile: (input: {
    profilId: string;
    displayTitle: string;
  }) => string;
  /**
   * Démo : ajoute un message entrant fictif et applique son / « notification »
   * selon les réglages (vibration si sons autorisés, alerte + badge si notifs autorisées).
   */
  demoSimulateIncomingMessage: (conversationId: string) => void;
  leaveGroup: (conversationId: string) => void;
  /** Force un nettoyage d'intégrité (réservé admin) */
  cleanData: () => void;
  /** Notifications organisateur (demandes d’inscription sur sorties à validation manuelle). */
  organizerNotificationsForViewer: OrganizerNotificationItem[];
  unreadOrganizerNotificationCount: number;
  markOrganizerNotificationRead: (id: string) => void;
  markAllOrganizerNotificationsRead: () => void;
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
  const [chatRestored, setChatRestored] = useState(false);
  /** Surcharge locale : ex. en_attente sans modifier la ligne CSV `cardStatus` (démo mono-utilisateur). */
  const [participationOverlay, setParticipationOverlay] = useState<
    Record<string, EventCardStatus>
  >({});
  const [pendingJoinQueueByEvent, setPendingJoinQueueByEvent] = useState<
    Record<string, EventWaitingMember[]>
  >(() => getInitialPendingQueuesByEvent());
  const [organizerNotifications, setOrganizerNotifications] = useState<OrganizerNotificationItem[]>(
    () => buildSeedOrganizerNotifications(seedEvents, getInitialPendingQueuesByEvent()),
  );
  const [approvedParticipantsByEvent, setApprovedParticipantsByEvent] = useState<
    Record<string, EventParticipantDetail[]>
  >({});
  const [removedSeedParticipantIdsByEvent, setRemovedSeedParticipantIdsByEvent] = useState<
    Record<string, string[]>
  >({});
  const viewerPendingJoinIdRef = useRef<Record<string, string>>({});
  const [favoriteConversationIds, setFavoriteConversationIds] = useState<string[]>(() => [
    ...seedFavoriteConversationIds,
  ]);
  const [favoriteIdsReady, setFavoriteIdsReady] = useState(false);
  const userModifiedFavoritesRef = useRef(false);
  const participationOverlayRef = React.useRef(participationOverlay);
  participationOverlayRef.current = participationOverlay;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const stored = await getPersistedFavoriteConversationIds();
        if (!alive) return;
        if (!userModifiedFavoritesRef.current && stored !== null) {
          setFavoriteConversationIds(stored);
        }
      } catch {
        /* ignore */
      } finally {
        if (alive) setFavoriteIdsReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!favoriteIdsReady) return;
    void putPersistedFavoriteConversationIds(favoriteConversationIds).catch((err) =>
      console.warn('Failed to save favorite conversations', err),
    );
  }, [favoriteConversationIds, favoriteIdsReady]);

  useEffect(() => {
    (async () => {
      try {
        const loaded = await getEvents();
        setEvents(loaded);
      } catch (err) {
        console.warn('Failed to load events from dataApi', err);
      }
    })();
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await getPersistedMessagingChat();
        if (!alive) return;
        if (p) {
          setConversations(p.conversations);
          setMessagesByConversation(p.messagesByConversation);
          setMembersByConversation(p.membersByConversation);
        }
      } catch (err) {
        console.warn('Failed to load messaging chat from dataApi', err);
      } finally {
        if (alive) setChatRestored(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const cleanData = useCallback(() => {
    const { repairedEvents, repairedMembersByConversation } = verifyAndRepairData(
      events,
      conversations,
      membersByConversation
    );
    setEvents(repairedEvents);
    setMembersByConversation(repairedMembersByConversation);
  }, [events, conversations, membersByConversation]);

  const mounted = React.useRef(false);
  useEffect(() => {
    if (mounted.current) {
      void putEvents(events).catch((err) => console.warn('Failed to save events via dataApi', err));
    } else {
      mounted.current = true;
    }
  }, [events]);

  useEffect(() => {
    if (!chatRestored) return;
    void putPersistedMessagingChat({
      conversations,
      messagesByConversation,
      membersByConversation,
    }).catch((err) => console.warn('Failed to save messaging chat via dataApi', err));
  }, [conversations, messagesByConversation, membersByConversation, chatRestored]);

  const messagesTabBadgeCount = useMemo(() => sumUnread(conversations), [conversations]);
  const visitesTabBadgeCount = mockMessagingSeed.visitesTabBadgeCount;

  const organizerNotificationsForViewer = useMemo(() => {
    return organizerNotifications
      .filter((n) => {
        const ev = events.find((e) => e.id === n.eventId);
        return Boolean(ev && ev.manualApproval && ev.cardStatus === 'organisateur');
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [organizerNotifications, events]);

  const unreadOrganizerNotificationCount = useMemo(
    () => organizerNotificationsForViewer.filter((n) => !n.read).length,
    [organizerNotificationsForViewer],
  );

  const markOrganizerNotificationRead = useCallback((id: string) => {
    setOrganizerNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllOrganizerNotificationsRead = useCallback(() => {
    const visibleIds = new Set(
      organizerNotificationsForViewer.map((n) => n.id),
    );
    setOrganizerNotifications((prev) =>
      prev.map((n) => (visibleIds.has(n.id) ? { ...n, read: true } : n)),
    );
  }, [organizerNotificationsForViewer]);

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
      isBeta: input.isBeta === true ? true : undefined,
    };
    setEvents((prev) => [event, ...prev]);
  }, []);

  const toggleEventFavorite = useCallback((eventId: string) => {
    setEvents((prev) =>
      prev.map((s) => (s.id === eventId ? { ...s, isFavorite: !s.isFavorite } : s)),
    );
  }, []);

  const toggleConversationFavorite = useCallback((conversationId: string) => {
    userModifiedFavoritesRef.current = true;
    setFavoriteConversationIds((prev) =>
      prev.includes(conversationId)
        ? prev.filter((x) => x !== conversationId)
        : [...prev, conversationId],
    );
  }, []);

  const getEventById = useCallback(
    (eventId: string) => events.find((s) => s.id === eventId),
    [events],
  );

  const getViewerCardStatus = useCallback(
    (event: Event): EventCardStatus => {
      if (event.cardStatus === 'organisateur') return 'organisateur';
      const o = participationOverlay[event.id];
      if (o) return o;
      return event.cardStatus;
    },
    [participationOverlay],
  );

  const getPendingApprovalCount = useCallback(
    (eventId: string) => pendingJoinQueueByEvent[eventId]?.length ?? 0,
    [pendingJoinQueueByEvent],
  );

  const getPendingJoinRequests = useCallback(
    (eventId: string) => pendingJoinQueueByEvent[eventId] ?? [],
    [pendingJoinQueueByEvent],
  );

  const getApprovedParticipantsExtra = useCallback(
    (eventId: string) => approvedParticipantsByEvent[eventId] ?? [],
    [approvedParticipantsByEvent],
  );

  const getRemovedSeedParticipantIds = useCallback(
    (eventId: string) => new Set(removedSeedParticipantIdsByEvent[eventId] ?? []),
    [removedSeedParticipantIdsByEvent],
  );

  const rejectPendingJoinRequest = useCallback((eventId: string, requestId: string) => {
    setOrganizerNotifications((prev) => prev.filter((n) => n.requestId !== requestId));
    setPendingJoinQueueByEvent((q) => ({
      ...q,
      [eventId]: (q[eventId] ?? []).filter((x) => x.id !== requestId),
    }));
    const vid = viewerPendingJoinIdRef.current[eventId];
    if (vid === requestId) {
      delete viewerPendingJoinIdRef.current[eventId];
      setParticipationOverlay((o) => {
        const { [eventId]: _, ...rest } = o;
        return rest;
      });
    }
  }, []);

  const removeEventParticipant = useCallback(
    (eventId: string, participantId: string, opts: { isOrganizer: boolean }) => {
      if (opts.isOrganizer) return;

      if (participantId.startsWith('ap-')) {
        setApprovedParticipantsByEvent((ap) => {
          const list = ap[eventId] ?? [];
          if (!list.some((p) => p.id === participantId)) return ap;
          setEvents((prev) =>
            prev.map((s) =>
              s.id === eventId
                ? { ...s, participantCount: Math.max(1, s.participantCount - 1) }
                : s,
            ),
          );
          return { ...ap, [eventId]: list.filter((p) => p.id !== participantId) };
        });
        return;
      }

      setRemovedSeedParticipantIdsByEvent((rm) => {
        const cur = rm[eventId] ?? [];
        if (cur.includes(participantId)) return rm;
        setEvents((prev) =>
          prev.map((s) =>
            s.id === eventId
              ? { ...s, participantCount: Math.max(1, s.participantCount - 1) }
              : s,
          ),
        );
        return { ...rm, [eventId]: [...cur, participantId] };
      });
    },
    [],
  );

  const addSelfToEventGroupChat = useCallback((conversationId: string) => {
    setMembersByConversation((pm) => {
      const list = pm[conversationId] ?? [];
      if (list.some((m) => m.isSelf)) return pm;
      const g = GRADIENT_POOL[list.length % GRADIENT_POOL.length];
      const member: GroupMember = {
        id: makeId('mem'),
        displayName: 'Moi',
        isSelf: true,
        avatarGradient: [g[0], g[1]],
        isFriendWithMe: false,
      };
      const next = [...list, member];
      setConversations((pc) =>
        pc.map((c) =>
          c.id === conversationId && c.type === 'group' ? { ...c, memberCount: next.length } : c,
        ),
      );
      return { ...pm, [conversationId]: next };
    });
  }, []);

  const removeSelfFromEventGroupChat = useCallback((conversationId: string) => {
    setMembersByConversation((pm) => {
      const list = pm[conversationId] ?? [];
      const next = list.filter((m) => !m.isSelf);
      setConversations((pc) =>
        pc.map((c) =>
          c.id === conversationId && c.type === 'group' ? { ...c, memberCount: next.length } : c,
        ),
      );
      return { ...pm, [conversationId]: next };
    });
  }, []);

  const joinEvent = useCallback(
    (eventId: string) => {
      const ev = events.find((e) => e.id === eventId);
      if (!ev || ev.cardStatus !== 'join' || ev.participantCount >= ev.participantMax) return;

      if (ev.manualApproval) {
        const id = makeId('pj');
        viewerPendingJoinIdRef.current[eventId] = id;
        setParticipationOverlay((o) => ({ ...o, [eventId]: 'en_attente' }));
        setPendingJoinQueueByEvent((q) => ({
          ...q,
          [eventId]: [
            ...(q[eventId] ?? []),
            {
              id,
              displayName: 'Vous (demande en cours)',
              rating: 4.5,
              avatarUrl:
                'https://ui-avatars.com/api/?name=Vous&size=128&background=78909C&color=fff',
              isViewerRequest: true,
            },
          ],
        }));
        setOrganizerNotifications((prev) => [
          {
            id: makeId('on'),
            eventId,
            eventTitle: ev.title,
            body: `Nouvelle demande : Vous (demande en cours) souhaite rejoindre « ${ev.title} ».`,
            createdAt: Date.now(),
            read: false,
            requestId: id,
          },
          ...prev,
        ]);
        return;
      }

      addSelfToEventGroupChat(ev.conversationId);
      setEvents((prev) =>
        prev.map((s) =>
          s.id === eventId
            ? { ...s, cardStatus: 'inscrit', participantCount: s.participantCount + 1 }
            : s,
        ),
      );
    },
    [events, addSelfToEventGroupChat],
  );

  const leaveEvent = useCallback(
    (eventId: string) => {
      const pending = participationOverlayRef.current[eventId] === 'en_attente';
      if (pending) {
        const vid = viewerPendingJoinIdRef.current[eventId];
        if (vid) {
          setOrganizerNotifications((prev) => prev.filter((n) => n.requestId !== vid));
          setPendingJoinQueueByEvent((q) => ({
            ...q,
            [eventId]: (q[eventId] ?? []).filter((x) => x.id !== vid),
          }));
          delete viewerPendingJoinIdRef.current[eventId];
        }
        setParticipationOverlay((o) => {
          const { [eventId]: _, ...rest } = o;
          return rest;
        });
        return;
      }

      setEvents((prev) => {
        const ev = prev.find((s) => s.id === eventId);
        if (!ev || ev.cardStatus === 'organisateur') return prev;
        const overlaySt = participationOverlayRef.current[eventId];
        const effective = overlaySt ?? ev.cardStatus;
        if (effective !== 'inscrit') return prev;
        removeSelfFromEventGroupChat(ev.conversationId);
        setParticipationOverlay((o) => {
          const { [eventId]: _, ...rest } = o;
          return rest;
        });
        return prev.map((s) =>
          s.id === eventId
            ? {
                ...s,
                cardStatus: 'join',
                participantCount: Math.max(0, s.participantCount - 1),
              }
            : s,
        );
      });
    },
    [removeSelfFromEventGroupChat],
  );

  const approvePendingMember = useCallback(
    (eventId: string, requestId: string) => {
      const ev = events.find((e) => e.id === eventId);
      if (!ev || !ev.manualApproval || ev.cardStatus !== 'organisateur') return;
      if (ev.participantCount >= ev.participantMax) return;

      setOrganizerNotifications((prev) => prev.filter((n) => n.requestId !== requestId));

      setPendingJoinQueueByEvent((queues) => {
        const queue = [...(queues[eventId] ?? [])];
        const idx = queue.findIndex((x) => x.id === requestId);
        if (idx === -1) return queues;
        const member = queue[idx];
        const rest = queue.filter((_, i) => i !== idx);
        const part = participantFromWaitingMember(member);

        setApprovedParticipantsByEvent((ap) => ({
          ...ap,
          [eventId]: [...(ap[eventId] ?? []), part],
        }));
        setEvents((prev) =>
          prev.map((s) =>
            s.id === eventId ? { ...s, participantCount: s.participantCount + 1 } : s,
          ),
        );

        if (member.isViewerRequest) {
          addSelfToEventGroupChat(ev.conversationId);
          setParticipationOverlay((o) => ({ ...o, [eventId]: 'inscrit' }));
          delete viewerPendingJoinIdRef.current[eventId];
        }

        return { ...queues, [eventId]: rest };
      });
    },
    [events, addSelfToEventGroupChat],
  );

  const approveJoinRequest = useCallback(
    (eventId: string) => {
      const first = pendingJoinQueueByEvent[eventId]?.[0];
      if (!first) return;
      approvePendingMember(eventId, first.id);
    },
    [pendingJoinQueueByEvent, approvePendingMember],
  );

  const postEventGroupWelcome = useCallback((conversationId: string, eventTitle: string) => {
    const text = `La sortie « ${eventTitle} » est créée — discutez ici avec les participants.`;
    const msg: Message = {
      id: makeId('msg'),
      conversationId,
      text,
      sentAt: Date.now(),
      isOwn: false,
      authorName: 'Système',
    };
    setMessagesByConversation((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), msg],
    }));
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessagePreview: text.slice(0, 80), updatedAt: Date.now() }
          : c,
      ),
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

      const isLinkedToEvent = events.some((e) => e.conversationId === conversationId);
      if (isLinkedToEvent) return true;

      return groupHasFriendForMessages(membersByConversation[conversationId] ?? []);
    },
    [conversations, membersByConversation, events],
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
    const isEventChat = events.some((e) => e.conversationId === conversationId);
    if (
      conv?.type === 'group' &&
      !isEventChat &&
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
    [conversations, membersByConversation, events],
  );

  const demoSimulateIncomingMessage = useCallback(
    (conversationId: string) => {
      const conv = getConversation(conversationId);
      const isEventChat = events.some((e) => e.conversationId === conversationId);
      if (
        conv?.type === 'group' &&
        !isEventChat &&
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
    [getConversation, getGroupSettings, membersByConversation, events],
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

  const ensureDirectConversationForProfile = useCallback(
    (input: { profilId: string; displayTitle: string }) => {
      const profilId = input.profilId.trim();
      const displayTitle = input.displayTitle.trim() || 'Contact';
      if (!profilId) return '';

      for (const c of conversations) {
        if (c.type !== 'direct') continue;
        const members = membersByConversation[c.id];
        if (members?.some((m) => !m.isSelf && m.profilId === profilId)) {
          return c.id;
        }
      }

      for (const c of conversations) {
        if (c.type !== 'direct') continue;
        const members = membersByConversation[c.id];
        if ((!members || members.length === 0) && c.title === displayTitle) {
          const cid = c.id;
          const g = pickGradientForProfilId(profilId);
          setMembersByConversation((prev) => {
            const list = prev[cid];
            if (list?.some((m) => m.profilId === profilId)) return prev;
            return {
              ...prev,
              [cid]: [
                {
                  id: `${cid}-me`,
                  displayName: 'Moi',
                  isSelf: true,
                  avatarGradient: ['#78909C', '#546E7A'],
                },
                {
                  id: `${cid}-peer`,
                  displayName: displayTitle,
                  isSelf: false,
                  avatarGradient: [g[0], g[1]],
                  profilId,
                  isFriendWithMe: true,
                },
              ],
            };
          });
          return cid;
        }
      }

      const id = makeId('dm');
      const g = pickGradientForProfilId(profilId);
      const conv: Conversation = {
        id,
        title: displayTitle,
        type: 'direct',
        lastMessagePreview: 'Nouvelle conversation',
        updatedAt: Date.now(),
        unreadCount: 0,
        avatarGradient: [g[0], g[1]],
      };
      setConversations((prev) => [conv, ...prev]);
      setMembersByConversation((prev) => ({
        ...prev,
        [id]: [
          {
            id: `${id}-me`,
            displayName: 'Moi',
            isSelf: true,
            avatarGradient: ['#78909C', '#546E7A'],
          },
          {
            id: `${id}-peer`,
            displayName: displayTitle,
            isSelf: false,
            avatarGradient: [g[0], g[1]],
            profilId,
            isFriendWithMe: true,
          },
        ],
      }));
      setMessagesByConversation((prev) => ({ ...prev, [id]: [] }));
      return id;
    },
    [conversations, membersByConversation],
  );

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
    userModifiedFavoritesRef.current = true;
    setFavoriteConversationIds((prev) => prev.filter((id) => id !== conversationId));
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
      favoriteConversationIds,
      toggleConversationFavorite,
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
      leaveEvent,
      getViewerCardStatus,
      approveJoinRequest,
      approvePendingMember,
      rejectPendingJoinRequest,
      removeEventParticipant,
      postEventGroupWelcome,
      getPendingApprovalCount,
      getPendingJoinRequests,
      getApprovedParticipantsExtra,
      getRemovedSeedParticipantIds,
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
      ensureDirectConversationForProfile,
      demoSimulateIncomingMessage,
      leaveGroup,
      cleanData,
      organizerNotificationsForViewer,
      unreadOrganizerNotificationCount,
      markOrganizerNotificationRead,
      markAllOrganizerNotificationsRead,
    }),
    [
      favoriteConversationIds,
      toggleConversationFavorite,
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
      leaveEvent,
      getViewerCardStatus,
      approveJoinRequest,
      approvePendingMember,
      rejectPendingJoinRequest,
      removeEventParticipant,
      postEventGroupWelcome,
      getPendingApprovalCount,
      getPendingJoinRequests,
      getApprovedParticipantsExtra,
      getRemovedSeedParticipantIds,
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
      ensureDirectConversationForProfile,
      demoSimulateIncomingMessage,
      leaveGroup,
      cleanData,
      organizerNotificationsForViewer,
      unreadOrganizerNotificationCount,
      markOrganizerNotificationRead,
      markAllOrganizerNotificationsRead,
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
