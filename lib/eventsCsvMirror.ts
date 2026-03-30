import { csvBool, csvNum, parseCsv } from '@/data/parseCsv';
import type { Event, EventCardStatus } from '@/types/messaging';

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

const HEADERS = [
  'id',
  'conversationId',
  'title',
  'dateLabel',
  'timeShort',
  'location',
  'notes',
  'createdOffsetMs',
  'imageUri',
  'priceLabel',
  'participantCount',
  'participantMax',
  'cardStatus',
  'isFavorite',
  'dateKey',
  'sectionDateLabel',
  'createdAtMs',
  'hideAddress',
  'manualApproval',
] as const;

export function serializeEventsCsvMirror(events: Event[]): string {
  const now = Date.now();
  const rows = events.map((e) => {
    const offset = Math.max(0, now - e.createdAt);
    return [
      e.id,
      e.conversationId,
      e.title,
      e.dateLabel,
      e.timeShort,
      e.location,
      e.notes ?? '',
      String(offset),
      e.imageUri,
      e.priceLabel,
      String(e.participantCount),
      String(e.participantMax),
      e.cardStatus,
      e.isFavorite ? '1' : '0',
      e.dateKey,
      e.sectionDateLabel,
      String(e.createdAt),
      e.hideAddress === true ? '1' : '',
      e.manualApproval === true ? '1' : '',
    ];
  });
  return buildCsv([...HEADERS], rows);
}

export function parseEventsCsvMirror(csv: string): Event[] {
  const anchor = Date.now();
  const rows = parseCsv(csv);
  if (rows.length === 0) return [];

  return rows.map((r) => {
    const createdAtMs = Number(r.createdAtMs ?? '');
    const createdAt = Number.isFinite(createdAtMs)
      ? createdAtMs
      : anchor - csvNum(r.createdOffsetMs);

    const e: Event = {
      id: r.id,
      conversationId: r.conversationId,
      title: r.title,
      dateLabel: r.dateLabel,
      timeShort: r.timeShort,
      location: r.location,
      createdAt,
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
    if (notes) e.notes = notes;
    if (r.hideAddress === '1') e.hideAddress = true;
    if (r.manualApproval === '1') e.manualApproval = true;
    return e;
  });
}
