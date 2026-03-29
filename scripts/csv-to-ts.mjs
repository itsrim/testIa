import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvDir = path.join(__dirname, '..', 'data', 'csv');
const outPath = path.join(__dirname, '..', 'data', 'csvEmbedded.ts');

const files = fs.readdirSync(csvDir).filter((f) => f.endsWith('.csv')).sort();

const entries = files.map((f) => {
  const key = f.replace(/\.csv$/i, '');
  const raw = fs.readFileSync(path.join(csvDir, f), 'utf8');
  return [key, raw];
});

const body = entries
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
  .join('\n');

const header =
  '/**\n' +
  ' * Fichiers CSV embarqués (généré par npm run gen:csv).\n' +
  ' * Ne pas modifier à la main : éditer data/csv/*.csv puis régénérer.\n' +
  ' */\n';

fs.writeFileSync(outPath, `${header}export const csvEmbedded = {\n${body}\n} as const;\n`, 'utf8');
console.log(`Wrote ${outPath} (${files.length} fichiers).`);
