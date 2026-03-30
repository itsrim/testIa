import { csvBool, csvNum, parseCsv } from '@/data/parseCsv';
import type {
  Conversation,
  GroupMember,
  Message,
  MessageMediaKind,
} from '@/types/messaging';

function csvOptionalBool(v: string): boolean | undefined {
  const t = v.trim();
  if (t === '') return undefined;
  return csvBool(t);
}

function escapeCsvField(cell: string): string {
  if (/[",\n\r]/.test(cell)) {
    return `"${String(cell).replace(/"/g, '""')}"`;
  }
  return String(cell);
}

function buildCsv(headers: string[], rowValues: string[][]): string {
  const h = headers.map(escapeCsvField).join(',');
  const lines = rowValues.map((row) => row.map(escapeCsvField).join(','));
  return [h, ...lines].join('\n') + '\n';
}

export function serializeMessagingCsvMirror(
  conversations: Conversation[],
  messagesByConversation: Record<string, Message[]>,
  membersByConversation: Record<string, GroupMember[]>,
): { conversationsCsv: string; messagesCsv: string; groupMembersCsv: string } {
  const t = Date.now();
  const convHeaders = [
    'id',
    'title',
    'type',
    'lastMessagePreview',
    'updatedMinutesAgo',
    'unreadCount',
    'storyBadgeCount',
    'g0',
    'g1',
    'memberCount',
    'updatedAtMs',
  ];
  const convRows = conversations.map((c) => {
    const mins = Math.max(0, Math.round((t - c.updatedAt) / 60_000));
    const story = c.storyBadgeCount !== undefined ? String(c.storyBadgeCount) : '';
    const mc = c.memberCount !== undefined ? String(c.memberCount) : '';
    return [
      c.id,
      c.title,
      c.type,
      c.lastMessagePreview,
      String(mins),
      String(c.unreadCount),
      story,
      c.avatarGradient[0],
      c.avatarGradient[1],
      mc,
      String(c.updatedAt),
    ];
  });

  const msgHeaders = [
    'id',
    'conversationId',
    'text',
    'sentMinutesAgo',
    'isOwn',
    'authorName',
    'mediaUri',
    'mediaKind',
    'sentAtMs',
  ];
  const msgRows: string[][] = [];
  for (const list of Object.values(messagesByConversation)) {
    for (const m of list) {
      const mins = Math.max(0, Math.round((t - m.sentAt) / 60_000));
      msgRows.push([
        m.id,
        m.conversationId,
        m.text,
        String(mins),
        m.isOwn ? '1' : '0',
        m.authorName ?? '',
        m.mediaUri ?? '',
        m.mediaKind ?? '',
        String(m.sentAt),
      ]);
    }
  }

  const memHeaders = [
    'conversationId',
    'memberId',
    'displayName',
    'isSelf',
    'g0',
    'g1',
    'isFriendWithMe',
    'profilId',
  ];
  const memRows: string[][] = [];
  for (const [cid, list] of Object.entries(membersByConversation)) {
    for (const m of list) {
      memRows.push([
        cid,
        m.id,
        m.displayName,
        m.isSelf ? '1' : '0',
        m.avatarGradient[0],
        m.avatarGradient[1],
        m.isFriendWithMe === undefined ? '' : m.isFriendWithMe ? '1' : '0',
        m.profilId ?? '',
      ]);
    }
  }

  return {
    conversationsCsv: buildCsv(convHeaders, convRows),
    messagesCsv: buildCsv(msgHeaders, msgRows),
    groupMembersCsv: buildCsv(memHeaders, memRows),
  };
}

export type ParsedMessagingMirror = {
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
  membersByConversation: Record<string, GroupMember[]>;
};

export function parseMessagingCsvMirror(
  conversationsCsv: string,
  messagesCsv: string,
  groupMembersCsv: string,
): ParsedMessagingMirror | null {
  const convParsed = parseCsv(conversationsCsv);
  if (convParsed.length === 0) return null;

  const anchor = Date.now();
  const conversations: Conversation[] = convParsed.map((r) => {
    const updatedAtMs = Number(r.updatedAtMs ?? '');
    const storyRaw = r.storyBadgeCount?.trim() ?? '';
    return {
      id: r.id,
      title: r.title,
      type: r.type as Conversation['type'],
      lastMessagePreview: r.lastMessagePreview,
      updatedAt: Number.isFinite(updatedAtMs)
        ? updatedAtMs
        : anchor - csvNum(r.updatedMinutesAgo) * 60_000,
      unreadCount: csvNum(r.unreadCount),
      storyBadgeCount: storyRaw === '' ? undefined : csvNum(storyRaw),
      avatarGradient: [r.g0, r.g1] as [string, string],
      memberCount: r.memberCount.trim() === '' ? undefined : csvNum(r.memberCount),
    };
  });

  const messagesByConversation: Record<string, Message[]> = {};
  for (const r of parseCsv(messagesCsv)) {
    const cid = r.conversationId;
    if (!messagesByConversation[cid]) messagesByConversation[cid] = [];
    const sentAtMs = Number(r.sentAtMs ?? '');
    const msg: Message = {
      id: r.id,
      conversationId: cid,
      text: r.text,
      sentAt: Number.isFinite(sentAtMs) ? sentAtMs : anchor - csvNum(r.sentMinutesAgo) * 60_000,
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
    messagesByConversation[cid].push(msg);
  }

  const membersByConversation: Record<string, GroupMember[]> = {};
  for (const r of parseCsv(groupMembersCsv)) {
    const cid = r.conversationId;
    if (!membersByConversation[cid]) membersByConversation[cid] = [];
    const m: GroupMember = {
      id: r.memberId,
      displayName: r.displayName,
      isSelf: csvBool(r.isSelf),
      avatarGradient: [r.g0, r.g1] as [string, string],
    };
    const fw = csvOptionalBool(r.isFriendWithMe ?? '');
    if (fw !== undefined) m.isFriendWithMe = fw;
    const pid = r.profilId?.trim();
    if (pid) m.profilId = pid;
    membersByConversation[cid].push(m);
  }

  return ensureMessageAndMemberBuckets(conversations, messagesByConversation, membersByConversation);
}

export function ensureMessageAndMemberBuckets(
  conversations: Conversation[],
  messages: Record<string, Message[]>,
  members: Record<string, GroupMember[]>,
): ParsedMessagingMirror {
  const msg = { ...messages };
  const mem = { ...members };
  for (const c of conversations) {
    if (!msg[c.id]) msg[c.id] = [];
    if (!mem[c.id]) mem[c.id] = [];
  }
  return { conversations, messagesByConversation: msg, membersByConversation: mem };
}
