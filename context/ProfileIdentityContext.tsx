import {
  deleteUsersMeIdentity,
  getUsersMeIdentity,
  PROFILE_BADGE_IDS,
  putUsersMeIdentity,
  seedIdentityFromCsv,
  type ProfileBadgeId,
  type ProfileIdentityState,
} from '@/services/dataApi';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export { PROFILE_BADGE_IDS, type ProfileBadgeId, type ProfileIdentityState };

type ProfileIdentityContextValue = ProfileIdentityState & {
  setAvatarUri: (uri: string) => void;
  /**
   * Met à jour uniquement l’état React (sans AsyncStorage).
   * À utiliser après un `await putUsersMeIdentity(...)` pour éviter un second `put` en `void`
   * qui peut réécraser avec un état encore désynchronisé (surtout sur mobile).
   */
  applyIdentityState: (next: ProfileIdentityState) => void;
  setDisplayName: (v: string) => void;
  setBio: (v: string) => void;
  setAge: (v: string) => void;
  toggleBadge: (id: ProfileBadgeId) => void;
  resetToCsvDefaults: () => void;
  hydrated: boolean;
};

const ProfileIdentityContext = createContext<ProfileIdentityContextValue | null>(null);

export function ProfileIdentityProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProfileIdentityState>(() => seedIdentityFromCsv());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const merged = await getUsersMeIdentity();
        if (!cancelled) setState(merged);
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
    void putUsersMeIdentity(next);
  }, []);

  const applyIdentityState = useCallback((next: ProfileIdentityState) => {
    setState(next);
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
    const n = seedIdentityFromCsv();
    setState(n);
    void deleteUsersMeIdentity();
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      setAvatarUri,
      applyIdentityState,
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
      applyIdentityState,
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
