import type {
  Conversation,
  GroupMember,
  Message,
  MessageMediaKind,
  Event,
  EventCardStatus,
} from '@/types/messaging';
import { csvEmbedded } from './csvEmbedded';
import { csvBool, csvNum, parseCsv } from './parseCsv';
import type { SuggestionProfile } from './suggestionProfiles';

/** Horodatage unique au chargement du module (même logique que l’ancien `Date.now()` dans le contexte). */
const ANCHOR_MS = Date.now();

function csvOptionalBool(v: string): boolean | undefined {
  const t = v.trim();
  if (t === '') return undefined;
  return csvBool(t);
}

function loadAppSettings(): Record<string, string> {
  const rows = parseCsv(csvEmbedded.app_settings);
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (r.key) out[r.key] = r.value;
  }
  return out;
}

/** Ordre d’affichage du bandeau « Conversations favoris » (ids présents dans conversations.csv). */
function parseFavoriteConversationIds(): string[] {
  return parseCsv(csvEmbedded.favorite_conversations)
    .map((r) => r.conversationId.trim())
    .filter(Boolean);
}

function parseConversations(anchor: number): Conversation[] {
  return parseCsv(csvEmbedded.conversations).map((r) => {
    const storyRaw = r.storyBadgeCount?.trim() ?? '';
    return {
      id: r.id,
      title: r.title,
      type: r.type as Conversation['type'],
      lastMessagePreview: r.lastMessagePreview,
      updatedAt: anchor - csvNum(r.updatedMinutesAgo) * 60_000,
      unreadCount: csvNum(r.unreadCount),
      storyBadgeCount: storyRaw === '' ? undefined : csvNum(storyRaw),
      avatarGradient: [r.g0, r.g1] as [string, string],
      memberCount: r.memberCount.trim() === '' ? undefined : csvNum(r.memberCount),
    };
  });
}

function parseMembers(): Record<string, GroupMember[]> {
  const by: Record<string, GroupMember[]> = {};
  for (const r of parseCsv(csvEmbedded.group_members)) {
    const cid = r.conversationId;
    if (!by[cid]) by[cid] = [];
    const m: GroupMember = {
      id: r.memberId,
      displayName: r.displayName,
      isSelf: csvBool(r.isSelf),
      avatarGradient: [r.g0, r.g1] as [string, string],
    };
    const fw = csvOptionalBool(r.isFriendWithMe);
    if (fw !== undefined) m.isFriendWithMe = fw;
    const pid = r.profilId?.trim();
    if (pid) m.profilId = pid;
    by[cid].push(m);
  }
  return by;
}

function parseMessages(anchor: number): Record<string, Message[]> {
  const rows = parseCsv(csvEmbedded.messages);
  const by: Record<string, Message[]> = {};
  for (const r of rows) {
    const cid = r.conversationId;
    if (!by[cid]) by[cid] = [];
    const msg: Message = {
      id: r.id,
      conversationId: cid,
      text: r.text,
      sentAt: anchor - csvNum(r.sentMinutesAgo) * 60_000,
      isOwn: csvBool(r.isOwn),
    };
    const an = r.authorName?.trim();
    if (an) msg.authorName = an;
    const uri = r.mediaUri?.trim();
    const kind = r.mediaKind?.trim() as MessageMediaKind | '';
    if (uri && (kind === 'image' || kind === 'video')) {
      msg.mediaUri = uri;
      msg.mediaKind = kind;
    }
    by[cid].push(msg);
  }
  return by;
}

/** Événements agenda — source CSV `data/csv/events.csv` (clé embarquée `events`). */
function parseEvents(anchor: number): Event[] {
  return parseCsv(csvEmbedded.events).map((r) => {
    const s: Event = {
      id: r.id,
      conversationId: r.conversationId,
      title: r.title,
      dateLabel: r.dateLabel,
      timeShort: r.timeShort,
      location: r.location,
      createdAt: anchor - csvNum(r.createdOffsetMs),
      imageUri: r.imageUri,
      priceLabel: r.priceLabel,
      participantCount: csvNum(r.participantCount),
      participantMax: csvNum(r.participantMax),
      cardStatus: r.cardStatus as EventCardStatus,
      isFavorite: csvBool(r.isFavorite),
      dateKey: r.dateKey.trim(),
      sectionDateLabel: r.sectionDateLabel,
    };
    const notes = r.notes?.trim();
    if (notes) s.notes = notes;
    if (r.manualApproval === '1') s.manualApproval = true;
    if (r.isBeta === '1') s.isBeta = true;
    return s;
  });
}

function ensureMessageBuckets(
  conversations: Conversation[],
  messages: Record<string, Message[]>,
): Record<string, Message[]> {
  const out = { ...messages };
  for (const c of conversations) {
    if (!out[c.id]) out[c.id] = [];
  }
  return out;
}

export type MockProfileVisit = {
  id: string;
  name: string;
  age: number;
  avatarUrl: string;
  lastVisitAt: number;
  visitMultiplier?: number;
  /** Visiteur qui a aussi envoyé une demande d’ami — badge dans l’onglet Visites. */
  friendRequest?: boolean;
};

function parseProfileVisits(anchor: number): MockProfileVisit[] {
  return parseCsv(csvEmbedded.profile_visits).map((r) => {
    const v: MockProfileVisit = {
      id: r.id,
      name: r.name,
      age: csvNum(r.age),
      avatarUrl: r.avatarUrl,
      lastVisitAt: anchor - csvNum(r.minutesAgo) * 60_000,
    };
    const mult = r.visitMultiplier?.trim();
    if (mult !== undefined && mult !== '') {
      v.visitMultiplier = csvNum(mult, 1);
    }
    const fr = r.friendRequest?.trim();
    if (fr !== undefined && fr !== '' && csvBool(fr)) {
      v.friendRequest = true;
    }
    return v;
  });
}

export type ProfileMeRow = {
  /** Identifiant stable du compte (CSV `current_user.userKey`, ex. `me`, `u_42`). */
  userKey: string;
  displayName: string;
  avatarUrl: string;
  memberSince: string;
  reliabilityScore: number;
  isPremiumSeed: boolean;
  isAdminSeed: boolean;
};

export type ProfileFriendRow = {
  profilId: string;
  name: string;
  imageUrl: string;
  eventsInCommon: number;
  /** Aligné sur `suggestion_profiles` lorsque le CSV amis les contient. */
  age?: number;
  city?: string;
};

export type TierLimits = {
  maxParticipants: number;
  maxRegistrations: number;
  maxFavorites: number;
  maxActiveEvents: number;
};

function parseProfileMe(): ProfileMeRow {
  const r = parseCsv(csvEmbedded.current_user)[0];
  if (!r) {
    return {
      userKey: 'me',
      displayName: 'Thomas R.',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800',
      memberSince: '2024',
      reliabilityScore: 4.9,
      isPremiumSeed: true,
      isAdminSeed: false,
    };
  }
  return {
    userKey: (r.userKey ?? 'me').trim() || 'me',
    displayName: r.displayName,
    avatarUrl: r.avatarUrl,
    memberSince: r.memberSince,
    reliabilityScore: csvNum(r.reliabilityScore, 4.9),
    isPremiumSeed: csvBool(r.isPremiumSeed),
    isAdminSeed: csvBool(r.isAdminSeed),
  };
}

function parseProfileFriends(): ProfileFriendRow[] {
  return parseCsv(csvEmbedded.profile_friends).map((r) => ({
    profilId: r.profilId.trim(),
    name: r.name,
    imageUrl: r.imageUrl,
    eventsInCommon: csvNum(r.eventsInCommon),
    age: r.age != null && String(r.age).trim() !== '' ? csvNum(r.age) : undefined,
    city: r.city?.trim() || undefined,
  }));
}

function parseLimitsByTier(): { free: TierLimits; premium: TierLimits } {
  const free: TierLimits = {
    maxParticipants: 8,
    maxRegistrations: 3,
    maxFavorites: 3,
    maxActiveEvents: 1,
  };
  const premium: TierLimits = {
    maxParticipants: 20,
    maxRegistrations: 10,
    maxFavorites: 10,
    maxActiveEvents: 999,
  };
  for (const r of parseCsv(csvEmbedded.limits_by_tier)) {
    const tier = (r.tier ?? '').toLowerCase();
    const block: TierLimits = {
      maxParticipants: csvNum(r.maxParticipants),
      maxRegistrations: csvNum(r.maxRegistrations),
      maxFavorites: csvNum(r.maxFavorites),
      maxActiveEvents: csvNum(r.maxActiveEvents),
    };
    if (tier === 'free') Object.assign(free, block);
    if (tier === 'premium') Object.assign(premium, block);
  }
  return { free, premium };
}

function parseSuggestionProfiles(): SuggestionProfile[] {
  return parseCsv(csvEmbedded.suggestion_profiles).map((r) => ({
    id: r.id,
    pseudo: r.pseudo,
    age: csvNum(r.age),
    imageUrl: r.imageUrl,
    aspectRatio: csvNum(r.aspectRatio, 0.75),
    verified: csvBool(r.verified),
    bio: r.bio,
    memberSince: r.memberSince,
    city: (r.city ?? '').trim(),
    stats: {
      reliability: csvNum(r.reliability, 4),
      events: csvNum(r.events),
      friends: csvNum(r.friends),
    },
    badges: r.badges
      .split('|')
      .map((b) => b.trim())
      .filter(Boolean),
  }));
}

const appSettings = loadAppSettings();

const seededConversations = parseConversations(ANCHOR_MS);

export const mockMessagingSeed = {
  anchorMs: ANCHOR_MS,
  favoriteConversationIds: parseFavoriteConversationIds(),
  conversations: seededConversations,
  membersByConversation: parseMembers(),
  messagesByConversation: ensureMessageBuckets(seededConversations, parseMessages(ANCHOR_MS)),
  events: parseEvents(ANCHOR_MS),
  visitesTabBadgeCount: csvNum(appSettings.visitesTabBadgeCount, 5),
};

export const mockProfileVisits: MockProfileVisit[] = parseProfileVisits(ANCHOR_MS);

export const mockSuggestionProfilesFromCsv: SuggestionProfile[] = parseSuggestionProfiles();

export const profileMe = parseProfileMe();
export const profileFriendsFromCsv: ProfileFriendRow[] = parseProfileFriends();
export const limitsByTier = parseLimitsByTier();
