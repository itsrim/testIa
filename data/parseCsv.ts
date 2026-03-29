/**
 * CSV minimal (virgule, champs entre guillemets si besoin, "" pour un guillemet littéral).
 * Pas de saut de ligne à l’intérieur d’un champ.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const cleaned = text.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return [];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const s = cleaned;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
      rows.push(row);
    }
    row = [];
  };

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"' && s[i + 1] === '"') {
        field += '"';
        i++;
        continue;
      }
      if (c === '"') {
        inQuotes = false;
        continue;
      }
      field += c;
    } else {
      if (c === '"') {
        inQuotes = true;
        continue;
      }
      if (c === ',') {
        pushField();
        continue;
      }
      if (c === '\r') continue;
      if (c === '\n') {
        pushField();
        pushRow();
        continue;
      }
      field += c;
    }
  }
  pushField();
  if (row.some((cell) => cell.length > 0)) {
    rows.push(row);
  }

  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, j) => {
      rec[h] = (cells[j] ?? '').trim();
    });
    return rec;
  });
}

export function csvBool(v: string): boolean {
  return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
}

export function csvNum(v: string, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
