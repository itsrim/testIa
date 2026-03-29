import type {
  Conversation,
  GroupMember,
  Message,
  MessageMediaKind,
  Sortie,
  SortieCardStatus,
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
function parseEvents(anchor: number): Sortie[] {
  return parseCsv(csvEmbedded.events).map((r) => {
    const s: Sortie = {
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
      cardStatus: r.cardStatus as SortieCardStatus,
      isFavorite: csvBool(r.isFavorite),
      dateKey: r.dateKey.trim(),
      sectionDateLabel: r.sectionDateLabel,
    };
    const notes = r.notes?.trim();
    if (notes) s.notes = notes;
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
    return v;
  });
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
  sorties: parseEvents(ANCHOR_MS),
  visitesTabBadgeCount: csvNum(appSettings.visitesTabBadgeCount, 5),
};

export const mockProfileVisits: MockProfileVisit[] = parseProfileVisits(ANCHOR_MS);

export const mockSuggestionProfilesFromCsv: SuggestionProfile[] = parseSuggestionProfiles();
