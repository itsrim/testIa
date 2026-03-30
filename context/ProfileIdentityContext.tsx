import { profileMe } from '@/data/mockDataLoader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const STORAGE_KEY = '@testia_profile_identity_v1';

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

function seedFromCsv(): ProfileIdentityState {
  return {
    avatarUri: profileMe.avatarUrl,
    displayName: profileMe.displayName,
    bio: 'Passionné de sorties et de rencontres. Toujours partant pour un bon moment !',
    age: '28',
    badges: [],
  };
}

type ProfileIdentityContextValue = ProfileIdentityState & {
  setAvatarUri: (uri: string) => void;
  setDisplayName: (v: string) => void;
  setBio: (v: string) => void;
  setAge: (v: string) => void;
  toggleBadge: (id: ProfileBadgeId) => void;
  resetToCsvDefaults: () => void;
  hydrated: boolean;
};

const ProfileIdentityContext = createContext<ProfileIdentityContextValue | null>(null);

export function ProfileIdentityProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProfileIdentityState>(() => seedFromCsv());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<ProfileIdentityState>;
          setState((prev) => ({
            avatarUri: typeof parsed.avatarUri === 'string' ? parsed.avatarUri : prev.avatarUri,
            displayName: typeof parsed.displayName === 'string' ? parsed.displayName : prev.displayName,
            bio: typeof parsed.bio === 'string' ? parsed.bio : prev.bio,
            age: typeof parsed.age === 'string' ? parsed.age : prev.age,
            badges: Array.isArray(parsed.badges)
              ? parsed.badges.filter((b): b is ProfileBadgeId =>
                  PROFILE_BADGE_IDS.includes(b as ProfileBadgeId),
                )
              : prev.badges,
          }));
        }
      } catch {
        /* garde seed */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: ProfileIdentityState) => {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setAvatarUri = useCallback(
    (uri: string) => {
      setState((s) => {
        const n = { ...s, avatarUri: uri };
        persist(n);
        return n;
      });
    },
    [persist],
  );

  const setDisplayName = useCallback(
    (displayName: string) => {
      setState((s) => {
        const n = { ...s, displayName };
        persist(n);
        return n;
      });
    },
    [persist],
  );

  const setBio = useCallback(
    (bio: string) => {
      setState((s) => {
        const n = { ...s, bio };
        persist(n);
        return n;
      });
    },
    [persist],
  );

  const setAge = useCallback(
    (age: string) => {
      setState((s) => {
        const n = { ...s, age };
        persist(n);
        return n;
      });
    },
    [persist],
  );

  const toggleBadge = useCallback(
    (id: ProfileBadgeId) => {
      setState((s) => {
        const has = s.badges.includes(id);
        const badges = has ? s.badges.filter((b) => b !== id) : [...s.badges, id];
        const n = { ...s, badges };
        persist(n);
        return n;
      });
    },
    [persist],
  );

  const resetToCsvDefaults = useCallback(() => {
    const n = seedFromCsv();
    setState(n);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(n));
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      setAvatarUri,
      setDisplayName,
      setBio,
      setAge,
      toggleBadge,
      resetToCsvDefaults,
      hydrated,
    }),
    [
      state,
      setAvatarUri,
      setDisplayName,
      setBio,
      setAge,
      toggleBadge,
      resetToCsvDefaults,
      hydrated,
    ],
  );

  return (
    <ProfileIdentityContext.Provider value={value}>{children}</ProfileIdentityContext.Provider>
  );
}

export function useProfileIdentity(): ProfileIdentityContextValue {
  const ctx = useContext(ProfileIdentityContext);
  if (!ctx) {
    throw new Error('useProfileIdentity doit être utilisé dans ProfileIdentityProvider');
  }
  return ctx;
}
