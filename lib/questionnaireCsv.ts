/** En-tête aligné sur `data/csv/questionnaire_checkins.csv` (persistance AsyncStorage). */
export const QUESTIONNAIRE_CHECKINS_HEADER =
  'date,emoji_key,badge_id,message,q1_skipped,q2_skipped,q3_skipped';

export function escapeCsvField(s: string): string {
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Normalise le texte CSV : garantit une première ligne d’en-tête. */
export function normalizeQuestionnaireCsvLines(raw: string): string[] {
  const lines = raw
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [QUESTIONNAIRE_CHECKINS_HEADER];
  if (!lines[0].startsWith('date,')) {
    return [QUESTIONNAIRE_CHECKINS_HEADER, ...lines];
  }
  return lines;
}

export function appendLineToQuestionnaireCsv(csvText: string, dataLine: string): string {
  const lines = normalizeQuestionnaireCsvLines(csvText);
  lines.push(dataLine);
  return `${lines.join('\n')}\n`;
}
