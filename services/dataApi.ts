/**
 * Couche « routes » : l’implémentation actuelle joue le rôle d’un **serveur mock**
 * (CSV embarqué + persistance locale AsyncStorage). Les fonctions sont **async**
 * pour coller à un client HTTP futur.
 *
 * Pour brancher un vrai backend : créez `services/httpDataApi.ts` qui appelle
 * `fetch` avec les mêmes signatures, puis remplacez les imports
 * `@/services/dataApi` par votre module (ou un `services/client.ts` qui réexporte).
 *
 * Cartographie indicative REST :
 *
 * | Méthode | Route (conceptuelle)              | Fonction |
 * |---------|-----------------------------------|----------|
 * | GET     | /users/me                         | getUsersMe |
 * | GET     | /users/me/friends                 | getUsersFriends |
 * | GET     | /users/me/identity                | getUsersMeIdentity |
 * | PUT     | /users/me/identity                | putUsersMeIdentity |
 * | DELETE  | /users/me/identity                | deleteUsersMeIdentity |
 * | (local) | miroir `current_user`             | AsyncStorage `@testia_mirror_current_user_csv_v1` (URL ImageKit après upload) |
 * | GET     | /settings/limits                  | getSettingsLimits |
 * | GET     | /settings/session                 | getSessionProfileSettings |
 * | PUT     | /settings/session                 | putSessionProfileSettings |
 * | DELETE  | /settings/session                 | deleteSessionProfileSettings |
 * | GET     | /questionnaire/checkins-csv        | getQuestionnaireCheckinsCsv |
 * | PUT     | /questionnaire/checkin             | appendQuestionnaireCheckin |
 * | GET     | /questionnaire/last-seen          | getQuestionnaireLastSeenDate |
 * | PUT     | /questionnaire/last-seen          | markQuestionnaireSeenForDate |
 * | GET     | /profile/visits                   | getProfileVisits |
 * | GET     | /suggestions/profiles             | getSuggestionProfiles |
 * | GET     | /messaging/seed                   | getMessagingSeed |
 * | GET     | /messaging/chat                   | getPersistedMessagingChat (lit 3 chaînes CSV AsyncStorage) |
 * | PUT     | /messaging/chat                   | putPersistedMessagingChat (écrit 3 chaînes CSV AsyncStorage) |
 * | DELETE  | /messaging/chat                   | deletePersistedMessagingChat |
 * | GET     | /events                           | getEvents (chaîne CSV AsyncStorage) |
 * | PUT     | /events                           | putEvents (réécrit le CSV texte) |
 */

import type { SuggestionProfile } from '@/data/suggestionProfiles';
import {
  limitsByTier,
  mockMessagingSeed,
  mockProfileVisits,
  mockSuggestionProfilesFromCsv,
  profileFriendsFromCsv,
  profileMe,
  type MockProfileVisit,
  type ProfileFriendRow,
  type ProfileMeRow,
  type TierLimits,
} from '@/data/mockDataLoader';
import type { RestrictionKey } from '@/types/profileSettings';
import { DEFAULT_RESTRICTIONS } from '@/types/profileSettings';
import type {
  Conversation,
  Event,
  GroupMember,
  Message,
} from '@/types/messaging';
import { parseEventsCsvMirror, serializeEventsCsvMirror } from '@/lib/eventsCsvMirror';
import { csvBool, csvNum, parseCsv } from '@/data/parseCsv';
import {
  appendLineToQuestionnaireCsv,
  escapeCsvField,
  QUESTIONNAIRE_CHECKINS_HEADER,
} from '@/lib/questionnaireCsv';
import {
  parseMessagingCsvMirror,
  serializeMessagingCsvMirror,
  type ParsedMessagingMirror,
} from '@/lib/messagingCsvMirror';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Stockage local AsyncStorage (contenu CSV en texte = « base » locale) ---

const STORAGE_PROFILE_IDENTITY = '@testia_profile_identity_v1';
/** Miroir CSV `current_user` (ligne données) — mis à jour avec l’URL ImageKit après upload. */
const STORAGE_CURRENT_USER_CSV_MIRROR = '@testia_mirror_current_user_csv_v1';
/** Ancienne persistance événements JSON (migrée une fois vers CSV texte). */
const STORAGE_EVENTS_LEGACY_JSON = 'events_data';
/** Événements : une chaîne CSV complète (même schéma que `events.csv` + colonnes miroir). */
const STORAGE_EVENTS_CSV = '@testia_events_csv_v1';
const STORAGE_SESSION_SETTINGS = '@testia_session_settings_v1';
const STORAGE_QUESTIONNAIRE_LAST_SEEN = '@testia_questionnaire_last_seen_v1';
const STORAGE_QUESTIONNAIRE_CSV = '@testia_questionnaire_csv_v1';
/** Ancienne persistance messagerie JSON (migrée une fois vers CSV texte). */
const STORAGE_MESSAGING_CHAT_LEGACY_JSON = '@testia_messaging_chat_v1';

const STORAGE_CSV_CONVERSATIONS = '@testia_csv_conversations';
const STORAGE_CSV_MESSAGES = '@testia_csv_messages';
const STORAGE_CSV_GROUP_MEMBERS = '@testia_csv_group_members';
/** Liste JSON des ids de conversations en favoris (bandeau « Conversations favoris »). */
const STORAGE_FAVORITE_CONVERSATION_IDS = '@testia_favorite_conversation_ids_v1';
/** Anciennes clés (miroir fichier + secours) — migrées une fois. */
const LEGACY_MIRROR_CONV = '@testia_mirror_conversations_csv';
const LEGACY_MIRROR_MSG = '@testia_mirror_messages_csv';
const LEGACY_MIRROR_MEM = '@testia_mirror_group_members_csv';

async function migrateLegacyMirrorKeysToCsvStorageOnce(): Promise<void> {
  const cur = await AsyncStorage.getItem(STORAGE_CSV_CONVERSATIONS);
  if (cur?.trim()) return;
  const oldConv = await AsyncStorage.getItem(LEGACY_MIRROR_CONV);
  if (!oldConv?.trim()) return;
  const oldMsg = (await AsyncStorage.getItem(LEGACY_MIRROR_MSG)) ?? '';
  const oldMem = (await AsyncStorage.getItem(LEGACY_MIRROR_MEM)) ?? '';
  await AsyncStorage.multiSet([
    [STORAGE_CSV_CONVERSATIONS, oldConv],
    [STORAGE_CSV_MESSAGES, oldMsg],
    [STORAGE_CSV_GROUP_MEMBERS, oldMem],
  ]);
  await AsyncStorage.multiRemove([LEGACY_MIRROR_CONV, LEGACY_MIRROR_MSG, LEGACY_MIRROR_MEM]);
}

// --- Profil éditable (identité) ---

export const PROFILE_BADGE_IDS = [
  'listening',
  'kind',
  'sharing',
  'party',
  'funny',
  'admin',
  'sporty',
  'creative',
] as const;

export type ProfileBadgeId = (typeof PROFILE_BADGE_IDS)[number];

export type ProfileIdentityState = {
  avatarUri: string;
  displayName: string;
  bio: string;
  age: string;
  badges: ProfileBadgeId[];
};

export function seedIdentityFromCsv(): ProfileIdentityState {
  return {
    avatarUri: profileMe.avatarUrl,
    displayName: profileMe.displayName,
    bio: 'Passionné de sorties et de rencontres. Toujours partant pour un bon moment !',
    age: '28',
    badges: [],
  };
}

function mergeIdentityFromStorage(
  parsed: Partial<ProfileIdentityState>,
  fallback: ProfileIdentityState,
): ProfileIdentityState {
  return {
    avatarUri: typeof parsed.avatarUri === 'string' ? parsed.avatarUri : fallback.avatarUri,
    displayName:
      typeof parsed.displayName === 'string' ? parsed.displayName : fallback.displayName,
    bio: typeof parsed.bio === 'string' ? parsed.bio : fallback.bio,
    age: typeof parsed.age === 'string' ? parsed.age : fallback.age,
    badges: Array.isArray(parsed.badges)
      ? parsed.badges.filter((b): b is ProfileBadgeId =>
          PROFILE_BADGE_IDS.includes(b as ProfileBadgeId),
        )
      : fallback.badges,
  };
}

async function mergeMeFromIdentityIfNeeded(base: ProfileMeRow): Promise<ProfileMeRow> {
  try {
    const idRaw = await AsyncStorage.getItem(STORAGE_PROFILE_IDENTITY);
    if (!idRaw) return base;
    const id = JSON.parse(idRaw) as Partial<ProfileIdentityState>;
    const displayName =
      typeof id.displayName === 'string' && id.displayName.trim()
        ? id.displayName.trim()
        : base.displayName;
    const avatarUrl =
      typeof id.avatarUri === 'string' && id.avatarUri.startsWith('http')
        ? id.avatarUri
        : base.avatarUrl;
    if (avatarUrl === base.avatarUrl && displayName === base.displayName) return base;
    return { ...base, userKey: base.userKey, displayName, avatarUrl };
  } catch {
    return base;
  }
}

async function persistCurrentUserCsvMirror(identity: ProfileIdentityState): Promise<void> {
  const base = profileMe;
  const displayName = identity.displayName.trim() || base.displayName;
  const avatarUrl = identity.avatarUri.startsWith('http')
    ? identity.avatarUri
    : base.avatarUrl;
  const row: ProfileMeRow = {
    ...base,
    displayName,
    avatarUrl,
  };
  const header =
    'userKey,displayName,avatarUrl,memberSince,reliabilityScore,isPremiumSeed,isAdminSeed';
  const line = [
    escapeCsvField(row.userKey),
    escapeCsvField(row.displayName),
    escapeCsvField(row.avatarUrl),
    escapeCsvField(row.memberSince),
    escapeCsvField(String(row.reliabilityScore)),
    escapeCsvField(row.isPremiumSeed ? '1' : '0'),
    escapeCsvField(row.isAdminSeed ? '1' : '0'),
  ].join(',');
  await AsyncStorage.setItem(STORAGE_CURRENT_USER_CSV_MIRROR, `${header}\n${line}\n`);
}

/** GET /users/me — seed CSV + miroir local (avatar / nom après sync identité). */
export async function getUsersMe(): Promise<ProfileMeRow> {
  const base = profileMe;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_CURRENT_USER_CSV_MIRROR);
    if (raw?.trim()) {
      const rows = parseCsv(raw);
      const r = rows[0];
      if (r) {
        const userKey = (r.userKey ?? '').trim() || base.userKey;
        return {
          userKey,
          displayName: (r.displayName ?? '').trim() || base.displayName,
          avatarUrl: (r.avatarUrl ?? '').trim() || base.avatarUrl,
          memberSince: (r.memberSince ?? '').trim() || base.memberSince,
          reliabilityScore: csvNum(r.reliabilityScore ?? '', base.reliabilityScore),
          isPremiumSeed:
            r.isPremiumSeed !== undefined && String(r.isPremiumSeed).trim() !== ''
              ? csvBool(String(r.isPremiumSeed))
              : base.isPremiumSeed,
          isAdminSeed:
            r.isAdminSeed !== undefined && String(r.isAdminSeed).trim() !== ''
              ? csvBool(String(r.isAdminSeed))
              : base.isAdminSeed,
        };
      }
    }
  } catch {
    /* ignore */
  }
  return mergeMeFromIdentityIfNeeded(base);
}

/** GET /users/me/friends */
export async function getUsersFriends(): Promise<ProfileFriendRow[]> {
  return profileFriendsFromCsv;
}

/** GET /users/me/identity — défauts CSV + surcharge stockage local. */
export async function getUsersMeIdentity(): Promise<ProfileIdentityState> {
  const base = seedIdentityFromCsv();
  try {
    const raw = await AsyncStorage.getItem(STORAGE_PROFILE_IDENTITY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<ProfileIdentityState>;
    return mergeIdentityFromStorage(parsed, base);
  } catch {
    return base;
  }
}

/** PUT /users/me/identity */
export async function putUsersMeIdentity(next: ProfileIdentityState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_PROFILE_IDENTITY, JSON.stringify(next));
  await persistCurrentUserCsvMirror(next);
}

/** DELETE /users/me/identity — réinitialise le stockage aux défauts CSV. */
export async function deleteUsersMeIdentity(): Promise<void> {
  const n = seedIdentityFromCsv();
  await AsyncStorage.setItem(STORAGE_PROFILE_IDENTITY, JSON.stringify(n));
  await AsyncStorage.removeItem(STORAGE_CURRENT_USER_CSV_MIRROR);
}

// --- Paramètres session (premium, admin, restrictions) ---

export type SessionProfileSettingsState = {
  isPremium: boolean;
  isAdmin: boolean;
  restrictions: Record<RestrictionKey, boolean>;
  /** Si true : ne plus afficher automatiquement le questionnaire quotidien. */
  hideDailyQuestionnaire: boolean;
};

/** GET /settings/limits — depuis CSV. */
export async function getSettingsLimits(): Promise<{ free: TierLimits; premium: TierLimits }> {
  return limitsByTier;
}

/** GET /settings/session — null si jamais sauvegardé. */
export async function getSessionProfileSettings(): Promise<SessionProfileSettingsState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_SESSION_SETTINGS);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<SessionProfileSettingsState>;
    if (typeof p.isPremium !== 'boolean' || typeof p.isAdmin !== 'boolean') return null;
    const restrictions =
      p.restrictions && typeof p.restrictions === 'object'
        ? { ...DEFAULT_RESTRICTIONS, ...p.restrictions }
        : { ...DEFAULT_RESTRICTIONS };
    const hideDailyQuestionnaire =
      typeof p.hideDailyQuestionnaire === 'boolean' ? p.hideDailyQuestionnaire : false;
    return { isPremium: p.isPremium, isAdmin: p.isAdmin, restrictions, hideDailyQuestionnaire };
  } catch {
    return null;
  }
}

/** PUT /settings/session */
export async function putSessionProfileSettings(s: SessionProfileSettingsState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_SESSION_SETTINGS, JSON.stringify(s));
}

/** DELETE /settings/session */
export async function deleteSessionProfileSettings(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_SESSION_SETTINGS);
}

/** État par défaut aligné sur le CSV utilisateur courant. */
export function seedSessionProfileSettingsFromCsv(): SessionProfileSettingsState {
  return {
    isPremium: profileMe.isPremiumSeed,
    isAdmin: profileMe.isAdminSeed,
    restrictions: { ...DEFAULT_RESTRICTIONS },
    hideDailyQuestionnaire: false,
  };
}

// --- Questionnaire quotidien (date « vue », CSV des réponses par jour) ---

function localDateYMD(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Dernière date (YYYY-MM-DD) où l’utilisateur a vu ou terminé le questionnaire. */
export async function getQuestionnaireLastSeenDate(): Promise<string | null> {
  const v = await AsyncStorage.getItem(STORAGE_QUESTIONNAIRE_LAST_SEEN);
  return v?.trim() || null;
}

export async function markQuestionnaireSeenForDate(isoDate: string = localDateYMD()): Promise<void> {
  await AsyncStorage.setItem(STORAGE_QUESTIONNAIRE_LAST_SEEN, isoDate);
}

export type QuestionnaireCheckinRow = {
  date: string;
  emojiKey: string;
  badgeId: string;
  message: string;
  q1Skipped: boolean;
  q2Skipped: boolean;
  q3Skipped: boolean;
};

/** Ajoute une ligne au CSV local (une entrée par complétion du flux étape 3). */
export async function appendQuestionnaireCheckin(row: QuestionnaireCheckinRow): Promise<void> {
  const prev = (await AsyncStorage.getItem(STORAGE_QUESTIONNAIRE_CSV)) ?? '';
  const dataLine = [
    row.date,
    row.emojiKey,
    row.badgeId,
    escapeCsvField(row.message),
    row.q1Skipped ? '1' : '0',
    row.q2Skipped ? '1' : '0',
    row.q3Skipped ? '1' : '0',
  ].join(',');
  const next = appendLineToQuestionnaireCsv(prev, dataLine);
  await AsyncStorage.setItem(STORAGE_QUESTIONNAIRE_CSV, next);
}

/** CSV complet (avec en-tête), pour export ou graphiques. */
export async function getQuestionnaireCheckinsCsv(): Promise<string> {
  const raw = await AsyncStorage.getItem(STORAGE_QUESTIONNAIRE_CSV);
  if (raw?.trim()) return raw.endsWith('\n') ? raw : `${raw}\n`;
  return `${QUESTIONNAIRE_CHECKINS_HEADER}\n`;
}

export { localDateYMD as questionnaireLocalDateYMD };
export { QUESTIONNAIRE_CHECKINS_HEADER };

// --- Données lecture seule (CSV) ---

/** GET /profile/visits */
export async function getProfileVisits(): Promise<MockProfileVisit[]> {
  return mockProfileVisits;
}

/** GET /suggestions/profiles */
export async function getSuggestionProfiles(): Promise<SuggestionProfile[]> {
  return mockSuggestionProfilesFromCsv;
}

/** GET /messaging/seed — conversations, messages initiaux, événements seed, etc. */
export async function getMessagingSeed(): Promise<typeof mockMessagingSeed> {
  return mockMessagingSeed;
}

// --- Chat : 3 chaînes CSV dans AsyncStorage (équivalent conversations / messages / group_members) ---

export type { ParsedMessagingMirror };

type LegacyJsonMessagingV1 = {
  v: 1;
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
  membersByConversation: Record<string, GroupMember[]>;
};

function isLegacyJsonMessagingV1(x: unknown): x is LegacyJsonMessagingV1 {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (o.v !== 1) return false;
  if (!Array.isArray(o.conversations)) return false;
  if (!o.messagesByConversation || typeof o.messagesByConversation !== 'object') return false;
  if (!o.membersByConversation || typeof o.membersByConversation !== 'object') return false;
  return true;
}

async function migrateLegacyJsonMessagingToCsvOnce(): Promise<void> {
  const raw = await AsyncStorage.getItem(STORAGE_MESSAGING_CHAT_LEGACY_JSON);
  if (!raw) return;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isLegacyJsonMessagingV1(parsed)) {
      const csvs = serializeMessagingCsvMirror(
        parsed.conversations,
        parsed.messagesByConversation,
        parsed.membersByConversation,
      );
      await AsyncStorage.multiSet([
        [STORAGE_CSV_CONVERSATIONS, csvs.conversationsCsv],
        [STORAGE_CSV_MESSAGES, csvs.messagesCsv],
        [STORAGE_CSV_GROUP_MEMBERS, csvs.groupMembersCsv],
      ]);
    }
  } catch {
    /* ignore */
  } finally {
    await AsyncStorage.removeItem(STORAGE_MESSAGING_CHAT_LEGACY_JSON);
  }
}

async function writeMessagingCsvToAsyncStorage(payload: {
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
  membersByConversation: Record<string, GroupMember[]>;
}): Promise<void> {
  const csvs = serializeMessagingCsvMirror(
    payload.conversations,
    payload.messagesByConversation,
    payload.membersByConversation,
  );
  await AsyncStorage.multiSet([
    [STORAGE_CSV_CONVERSATIONS, csvs.conversationsCsv],
    [STORAGE_CSV_MESSAGES, csvs.messagesCsv],
    [STORAGE_CSV_GROUP_MEMBERS, csvs.groupMembersCsv],
  ]);
}

/** GET /messaging/chat — relit les 3 CSV stockés en local (AsyncStorage). */
export async function getPersistedMessagingChat(): Promise<ParsedMessagingMirror | null> {
  await migrateLegacyJsonMessagingToCsvOnce();
  await migrateLegacyMirrorKeysToCsvStorageOnce();
  const conv = await AsyncStorage.getItem(STORAGE_CSV_CONVERSATIONS);
  if (!conv?.trim()) return null;
  const msg = (await AsyncStorage.getItem(STORAGE_CSV_MESSAGES)) ?? '';
  const mem = (await AsyncStorage.getItem(STORAGE_CSV_GROUP_MEMBERS)) ?? '';
  return parseMessagingCsvMirror(conv, msg, mem);
}

/** PUT /messaging/chat — met à jour les 3 CSV locaux après changement de state. */
export async function putPersistedMessagingChat(payload: {
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
  membersByConversation: Record<string, GroupMember[]>;
}): Promise<void> {
  await writeMessagingCsvToAsyncStorage(payload);
}

/** DELETE /messaging/chat */
export async function deletePersistedMessagingChat(): Promise<void> {
  await AsyncStorage.multiRemove([
    STORAGE_MESSAGING_CHAT_LEGACY_JSON,
    STORAGE_CSV_CONVERSATIONS,
    STORAGE_CSV_MESSAGES,
    STORAGE_CSV_GROUP_MEMBERS,
    STORAGE_FAVORITE_CONVERSATION_IDS,
    LEGACY_MIRROR_CONV,
    LEGACY_MIRROR_MSG,
    LEGACY_MIRROR_MEM,
  ]);
}

/** Liste persistante des conversations favorites (`null` = jamais sauvegardé). */
export async function getPersistedFavoriteConversationIds(): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_FAVORITE_CONVERSATION_IDS);
    if (raw === null) return null;
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return null;
    return p.filter((x): x is string => typeof x === 'string');
  } catch {
    return null;
  }
}

export async function putPersistedFavoriteConversationIds(
  ids: readonly string[],
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_FAVORITE_CONVERSATION_IDS, JSON.stringify([...ids]));
}

// --- Événements : une chaîne CSV en AsyncStorage (même idée que `events.csv`) ---

async function migrateLegacyJsonEventsToCsvOnce(): Promise<void> {
  const hasCsv = await AsyncStorage.getItem(STORAGE_EVENTS_CSV);
  if (hasCsv?.trim()) {
    await AsyncStorage.removeItem(STORAGE_EVENTS_LEGACY_JSON);
    return;
  }
  const raw = await AsyncStorage.getItem(STORAGE_EVENTS_LEGACY_JSON);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Event[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      await AsyncStorage.setItem(STORAGE_EVENTS_CSV, serializeEventsCsvMirror(parsed));
    }
  } catch {
    /* ignore */
  } finally {
    await AsyncStorage.removeItem(STORAGE_EVENTS_LEGACY_JSON);
  }
}

/** GET /events — CSV local si présent, sinon seed bundle. */
export async function getEvents(): Promise<Event[]> {
  const seed = mockMessagingSeed.events;
  await migrateLegacyJsonEventsToCsvOnce();
  try {
    const csv = await AsyncStorage.getItem(STORAGE_EVENTS_CSV);
    if (csv?.trim()) {
      const list = parseEventsCsvMirror(csv);
      if (list.length > 0) return list;
    }
  } catch {
    /* ignore */
  }
  return [...seed];
}

/** PUT /events — réécrit le CSV local (texte). */
export async function putEvents(events: Event[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_EVENTS_CSV, serializeEventsCsvMirror(events));
}

/** DELETE /events */
export async function deletePersistedEvents(): Promise<void> {
  await AsyncStorage.multiRemove([STORAGE_EVENTS_CSV, STORAGE_EVENTS_LEGACY_JSON]);
}

/** Accès synchrone au seed messagerie (même source que `getMessagingSeed()`). Pour le premier rendu avant await. */
export { mockMessagingSeed } from '@/data/mockDataLoader';
