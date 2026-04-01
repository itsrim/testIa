import { mockSuggestionProfilesFromCsv } from './mockDataLoader';

export type SuggestionProfile = {
  id: string;
  pseudo: string;
  age: number;
  imageUrl: string;
  aspectRatio: number;
  verified: boolean;
  bio: string;
  memberSince: string;
  /** Ville / région (CSV `suggestion_profiles`, colonne `city`). */
  city: string;
  stats: { reliability: number; events: number; friends: number };
  badges: string[];
};

export function capPseudo(pseudo: string): string {
  const raw = pseudo.replace(/^@/, '');
  const base = raw.split(/[._-]/)[0] ?? raw;
  if (!base) return pseudo;
  return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
}

/** Légende grille : « Clara, 34 » */
export function formatSuggestionCaption(pseudo: string, age: number): string {
  return `${capPseudo(pseudo)}, ${age}`;
}

export const MOCK_SUGGESTION_PROFILES: SuggestionProfile[] = mockSuggestionProfilesFromCsv;

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
    bio: 'Passionné(e) d’événements et de rencontres. Toujours partant(e) pour de nouveaux projets !',
    city: '',
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
