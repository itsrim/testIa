/**
 * Génère 3 sorties / jour du 2026-03-01 au 2026-05-31 :
 * - slot a : vous organisez, validation manuelle, bêta
 * - slots b & c : autres statuts, bêta
 *
 * Usage : node scripts/gen-events-q2-2026.mjs >> data/csv/events_generated_snippet.csv
 * (ou pipe vers un fichier puis fusion manuelle — ici on écrit tout le fichier events.csv via npm script)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '..', 'data', 'csv', 'events.csv');

const CONV = ['c4', 'c2', 'c3'];
const IMAGES = [
  'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&q=80',
  'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80',
  'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&q=80',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80',
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
];

const LOCATIONS = [
  'Halles de Rive',
  'Parc des Bastions',
  'Quai du Mont-Blanc',
  'Carouge — place du Marché',
  'Plainpalais',
  'Gare Cornavin — hall',
  'Bains des Pâquis',
  'Studio Plainpalais',
];

const ORG_TITLES = [
  'Bêta · Atelier créa — validation des inscriptions',
  'Bêta · Mini rando urbaine — file d’attente',
  'Bêta · Session photo — places limitées',
  'Bêta · Escape express — équipes sur validation',
  'Bêta · Brunch testeurs — RSVP manuel',
];

const TITLES_B = [
  'Café lent & lecture',
  'Apéro rooftops',
  'Rando express 45 min',
  'Musée + goûter',
  'Running group matin',
  'Marché & fromagers',
  'Yoga parc (débutants)',
  'Boardgames & snacks',
];

const TITLES_C = [
  'Soirée jeux de société',
  'Concert club (early)',
  'Ciné indé + débat',
  'Danse salsa découverte',
  'Atelier céramique express',
  'Veillée contes & tisanes',
  'Blind test musical',
  'Food trucks & DJ set',
];

function escapeCsv(cell) {
  const s = String(cell ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** "2026-03-05" -> dateLabel court FR */
function dateLabelFr(y, m, d) {
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '');
}

/** Titre de section agenda */
function sectionLabelFr(y, m, d) {
  const dt = new Date(y, m - 1, d);
  const raw = dt.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const FEB_ROWS = [
  'e1,c4,Team Pastel — Lancement trimestre,2 févr.,09:30,Cowork Rivoli,Ordre du jour sur Notion.,100000,https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&q=80,Gratuit,10,16,join,0,2026-02-02,Lundi 2 février,,0',
  'e2,c2,Rando Dimanche — Le Salève,8 févr.,08:30,Col de la Croix,Prévoir crampons si verglas.,110000,https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80,Gratuit,14,22,inscrit,0,2026-02-08,Dimanche 8 février,,0',
  'e3,c3,Randonnée urbaine — Lumières d’hiver,15 févr.,18:30,Pont du Mont-Blanc,Chaussures confort.,120000,https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&q=80,Gratuit,16,28,inscrit,1,2026-02-15,Dimanche 15 février,,0',
  'e4,c1,Soirée jeux avec Maya,18 févr.,19:30,Chez Maya,Apportez un jeu court.,130000,https://images.unsplash.com/photo-1610890716171-6b1cae5779df?w=600&q=80,Gratuit,6,8,inscrit,0,2026-02-18,Mercredi 18 février,,0',
  'e5,c4,Team Pastel — Afterwork pizzas,23 févr.,19:00,Chef Luigi,Réservation au nom Pastel.,140000,https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80,18€,12,20,inscrit,0,2026-02-23,Lundi 23 février,,0',
  'e6,c3,Randonnée urbaine — Marché & fromagers,28 févr.,11:00,Place de Plainpalais,On goûte ensemble.,150000,https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80,Gratuit,11,18,join,0,2026-02-28,Samedi 28 février,,0',
];

const HEADER =
  'id,conversationId,title,dateLabel,timeShort,location,notes,createdOffsetMs,imageUri,priceLabel,participantCount,participantMax,cardStatus,isFavorite,dateKey,sectionDateLabel,manualApproval,isBeta';

let globalIdx = 0;
const rows = [];

for (let m = 3; m <= 5; m++) {
  const y = 2026;
  const dim = daysInMonth(y, m);
  for (let d = 1; d <= dim; d++) {
    const dateKey = `${y}-${pad2(m)}-${pad2(d)}`;
    const dLabel = dateLabelFr(y, m, d);
    const sec = sectionLabelFr(y, m, d);
    const daySeed = y * 10000 + m * 100 + d;

    // Slot a — organisateur + validation
    const idA = `q${y}${pad2(m)}${pad2(d)}a`;
    const convA = CONV[globalIdx % CONV.length];
    const imgA = IMAGES[globalIdx % IMAGES.length];
    const locA = LOCATIONS[daySeed % LOCATIONS.length];
    const titleA = ORG_TITLES[daySeed % ORG_TITLES.length];
    const offA = 400_000 + globalIdx * 45_000;
    const pcA = 4 + (daySeed % 4);
    const pmA = 12 + (daySeed % 6);
    rows.push(
      [
        idA,
        convA,
        titleA,
        dLabel,
        '09:30',
        locA,
        'Sortie pilote bêta — vous validez chaque inscription.',
        String(offA),
        imgA,
        daySeed % 3 === 0 ? '12€' : 'Gratuit',
        String(pcA),
        String(pmA),
        'organisateur',
        '0',
        dateKey,
        sec,
        '1',
        '1',
      ]
        .map(escapeCsv)
        .join(','),
    );
    globalIdx++;

    // Slot b
    const idB = `q${y}${pad2(m)}${pad2(d)}b`;
    const convB = CONV[globalIdx % CONV.length];
    const imgB = IMAGES[globalIdx % IMAGES.length];
    const locB = LOCATIONS[(daySeed + 1) % LOCATIONS.length];
    const titleB = TITLES_B[daySeed % TITLES_B.length];
    const offB = 400_000 + globalIdx * 45_000;
    const stB = daySeed % 2 === 0 ? 'join' : 'inscrit';
    const favB = daySeed % 5 === 0 ? '1' : '0';
    const pcB = 8 + (daySeed % 8);
    const pmB = 18 + (daySeed % 10);
    rows.push(
      [
        idB,
        convB,
        titleB,
        dLabel,
        '14:00',
        locB,
        'Série agenda mars–mai 2026 (bêta).',
        String(offB),
        imgB,
        daySeed % 4 === 0 ? '18€' : 'Gratuit',
        String(pcB),
        String(pmB),
        stB,
        favB,
        dateKey,
        sec,
        '',
        '1',
      ]
        .map(escapeCsv)
        .join(','),
    );
    globalIdx++;

    // Slot c
    const idC = `q${y}${pad2(m)}${pad2(d)}c`;
    const convC = CONV[globalIdx % CONV.length];
    const imgC = IMAGES[globalIdx % IMAGES.length];
    const locC = LOCATIONS[(daySeed + 2) % LOCATIONS.length];
    const titleC = TITLES_C[(daySeed + 3) % TITLES_C.length];
    const offC = 400_000 + globalIdx * 45_000;
    const stC = daySeed % 3 === 0 ? 'inscrit' : 'join';
    const favC = daySeed % 7 === 0 ? '1' : '0';
    const pcC = 6 + (daySeed % 10);
    const pmC = 16 + (daySeed % 12);
    rows.push(
      [
        idC,
        convC,
        titleC,
        dLabel,
        '19:00',
        locC,
        'Série agenda mars–mai 2026 (bêta).',
        String(offC),
        imgC,
        daySeed % 5 === 0 ? '22€' : 'Gratuit',
        String(pcC),
        String(pmC),
        stC,
        favC,
        dateKey,
        sec,
        '',
        '1',
      ]
        .map(escapeCsv)
        .join(','),
    );
    globalIdx++;
  }
}

const body = [HEADER, ...FEB_ROWS, ...rows].join('\n') + '\n';
fs.writeFileSync(outPath, body, 'utf8');
console.error(`Wrote ${outPath} (${FEB_ROWS.length} févr. + ${rows.length} générés = ${FEB_ROWS.length + rows.length} sorties).`);
