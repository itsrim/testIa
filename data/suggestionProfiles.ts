export type SuggestionProfile = {
  id: string;
  pseudo: string;
  age: number;
  imageUrl: string;
  aspectRatio: number;
  verified: boolean;
  bio: string;
  memberSince: string;
  stats: { reliability: number; events: number; friends: number };
  badges: string[];
};

function capPseudo(pseudo: string): string {
  const raw = pseudo.replace(/^@/, '');
  const base = raw.split(/[._-]/)[0] ?? raw;
  if (!base) return pseudo;
  return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
}

/** Légende grille : « Clara, 34 » */
export function formatSuggestionCaption(pseudo: string, age: number): string {
  return `${capPseudo(pseudo)}, ${age}`;
}

export const MOCK_SUGGESTION_PROFILES: SuggestionProfile[] = [
  {
    id: 'sg1',
    pseudo: 'clara.m',
    age: 34,
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80',
    aspectRatio: 0.68,
    verified: true,
    bio: 'Passionnée de randonnée et de photographie. Toujours partante pour de nouvelles aventures !',
    memberSince: '2022',
    stats: { reliability: 4.0, events: 5, friends: 10 },
    badges: ['Ponctuelle', 'Amicale', 'Exploratrice'],
  },
  {
    id: 'sg2',
    pseudo: 'lucasb',
    age: 28,
    imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80',
    aspectRatio: 0.92,
    verified: true,
    bio: 'Créatif, cinéma et sorties entre amis. Toujours un projet en tête.',
    memberSince: '2021',
    stats: { reliability: 4.5, events: 12, friends: 24 },
    badges: ['Organisateur', 'Sociable'],
  },
  {
    id: 'sg3',
    pseudo: 'ines.k',
    age: 25,
    imageUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=80',
    aspectRatio: 0.75,
    verified: false,
    bio: 'Yoga, lecture et bons restos. J’aime découvrir la ville autrement.',
    memberSince: '2023',
    stats: { reliability: 4.2, events: 3, friends: 8 },
    badges: ['Calme', 'Curieuse'],
  },
  {
    id: 'sg4',
    pseudo: 'hugo_p',
    age: 31,
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
    aspectRatio: 0.82,
    verified: true,
    bio: 'Trail et musique live. Toujours partant pour un concert ou une rando.',
    memberSince: '2020',
    stats: { reliability: 4.8, events: 18, friends: 42 },
    badges: ['Sportif', 'Fiable'],
  },
  {
    id: 'sg5',
    pseudo: 'emma.r',
    age: 22,
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80',
    aspectRatio: 0.65,
    verified: true,
    bio: 'Étudiante en design, j’adore les expos et les cafés cachés.',
    memberSince: '2024',
    stats: { reliability: 3.9, events: 2, friends: 15 },
    badges: ['Créative'],
  },
  {
    id: 'sg6',
    pseudo: 'nath_co',
    age: 27,
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80',
    aspectRatio: 0.88,
    verified: false,
    bio: 'Développeur le jour, gamer le soir. Apéros et jeux de société bienvenus.',
    memberSince: '2022',
    stats: { reliability: 4.1, events: 7, friends: 19 },
    badges: ['Disponible', 'Cool'],
  },
  {
    id: 'sg7',
    pseudo: 'lea.fnt',
    age: 24,
    imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=80',
    aspectRatio: 0.7,
    verified: true,
    bio: 'Danse et voyages courts le week-end. Toujours avec mon appareil photo.',
    memberSince: '2021',
    stats: { reliability: 4.6, events: 9, friends: 22 },
    badges: ['Énergique', 'Ponctuelle'],
  },
  {
    id: 'sg8',
    pseudo: 'tom.w',
    age: 33,
    imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&q=80',
    aspectRatio: 0.95,
    verified: true,
    bio: 'Cuisine du monde et vin nature. J’organise des dîners à thème.',
    memberSince: '2019',
    stats: { reliability: 4.7, events: 22, friends: 35 },
    badges: ['Hôte', 'Gourmand'],
  },
  {
    id: 'sg9',
    pseudo: 'sarahb',
    age: 29,
    imageUrl: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&q=80',
    aspectRatio: 0.72,
    verified: false,
    bio: 'Marche urbaine et bénévolat le samedi. Rencontrer des gens authentiques.',
    memberSince: '2023',
    stats: { reliability: 4.3, events: 4, friends: 11 },
    badges: ['Bienveillante'],
  },
  {
    id: 'sg10',
    pseudo: 'max.leroy',
    age: 26,
    imageUrl: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=600&q=80',
    aspectRatio: 0.78,
    verified: true,
    bio: 'Skate et street art. Toujours une idée de spot à explorer.',
    memberSince: '2022',
    stats: { reliability: 4.0, events: 6, friends: 17 },
    badges: ['Spontané', 'Explorateur'],
  },
  {
    id: 'sg11',
    pseudo: 'chloe.d',
    age: 23,
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80',
    aspectRatio: 0.66,
    verified: true,
    bio: 'Mode durable et brunchs. J’aime les petits commerces de quartier.',
    memberSince: '2024',
    stats: { reliability: 4.4, events: 3, friends: 14 },
    badges: ['Stylée', 'Amicale'],
  },
  {
    id: 'sg12',
    pseudo: 'j.morel',
    age: 30,
    imageUrl: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=600&q=80',
    aspectRatio: 0.85,
    verified: false,
    bio: 'Escalade et vanlife le temps d’un week-end. Cherche partenaires de grimpe.',
    memberSince: '2021',
    stats: { reliability: 4.2, events: 11, friends: 28 },
    badges: ['Aventurier', 'Fiable'],
  },
];

/** Profil démo pour un membre hors liste suggestions (paramètres de groupe, etc.). */
export function buildMemberFallbackProfile(input: {
  displayName: string;
  avatarGradient?: readonly [string, string];
  seed: string;
}): SuggestionProfile {
  const slug =
    input.displayName
      .trim()
      .split(/\s+/)[0]
      ?.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'membre';

  let h = 0;
  for (let i = 0; i < input.seed.length; i++) {
    h = (h + input.seed.charCodeAt(i) * (i + 1)) % 10000;
  }
  const age = 20 + (h % 18);
  const g0 = (input.avatarGradient?.[0] ?? '#424242').replace('#', '');
  return {
    id: `ext-${input.seed}`,
    pseudo: slug,
    age,
    imageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(input.displayName)}&size=512&background=${g0}&color=ffffff`,
    aspectRatio: 0.72,
    verified: h % 3 === 0,
    bio: 'Passionné(e) de sorties et de rencontres. Toujours partant(e) pour de nouveaux projets !',
    memberSince: String(2019 + (h % 5)),
    stats: {
      reliability: Math.round((3.5 + (h % 15) / 10) * 10) / 10,
      events: (h % 20) + 1,
      friends: 5 + (h % 35),
    },
    badges: ['Membre', 'Sympathique'],
  };
}

export function getSuggestionProfile(id: string): SuggestionProfile | undefined {
  return MOCK_SUGGESTION_PROFILES.find((p) => p.id === id);
}
