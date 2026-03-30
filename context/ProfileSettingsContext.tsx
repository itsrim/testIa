import { limitsByTier } from '@/data/mockDataLoader';
import type { TierLimits } from '@/data/mockDataLoader';
import {
  deleteSessionProfileSettings,
  getSessionProfileSettings,
  putSessionProfileSettings,
  seedSessionProfileSettingsFromCsv,
  type SessionProfileSettingsState,
} from '@/services/dataApi';
import type { RestrictionKey } from '@/types/profileSettings';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type { RestrictionKey } from '@/types/profileSettings';

type ProfileSettingsValue = {
  isPremium: boolean;
  setPremium: (v: boolean) => void;
  togglePremium: () => void;
  isAdmin: boolean;
  setAdmin: (v: boolean) => void;
  toggleAdmin: () => void;
  getLimits: () => TierLimits;
  isRestricted: (key: RestrictionKey) => boolean;
  restrictions: Record<RestrictionKey, boolean>;
  toggleRestriction: (key: RestrictionKey) => void;
  resetToCsvDefaults: () => void;
  settingsHydrated: boolean;
};

const ProfileSettingsContext = createContext<ProfileSettingsValue | null>(null);

export function ProfileSettingsProvider({ children }: { children: React.ReactNode }) {
  const seed = useMemo(() => seedSessionProfileSettingsFromCsv(), []);
  const [isPremium, setPremium] = useState(seed.isPremium);
  const [isAdmin, setAdmin] = useState(seed.isAdmin);
  const [restrictions, setRestrictions] = useState<Record<RestrictionKey, boolean>>({
    ...seed.restrictions,
  });
  const [settingsHydrated, setSettingsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await getSessionProfileSettings();
        if (cancelled) return;
        if (stored) {
          setPremium(stored.isPremium);
          setAdmin(stored.isAdmin);
          setRestrictions(stored.restrictions);
        }
      } finally {
        if (!cancelled) setSettingsHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!settingsHydrated) return;
    const payload: SessionProfileSettingsState = { isPremium, isAdmin, restrictions };
    void putSessionProfileSettings(payload);
  }, [isPremium, isAdmin, restrictions, settingsHydrated]);

  const getLimits = useCallback((): TierLimits => {
    return isPremium ? limitsByTier.premium : limitsByTier.free;
  }, [isPremium]);

  const isRestricted = useCallback(
    (key: RestrictionKey) => {
      if (isPremium) return false;
      return restrictions[key] ?? false;
    },
    [isPremium, restrictions],
  );

  const togglePremium = useCallback(() => setPremium((p) => !p), []);
  const toggleAdmin = useCallback(() => setAdmin((p) => !p), []);

  const toggleRestriction = useCallback((key: RestrictionKey) => {
    setRestrictions((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const resetToCsvDefaults = useCallback(() => {
    const n = seedSessionProfileSettingsFromCsv();
    setPremium(n.isPremium);
    setAdmin(n.isAdmin);
    setRestrictions(n.restrictions);
    void deleteSessionProfileSettings();
  }, []);

  const value = useMemo(
    () => ({
      isPremium,
      setPremium,
      togglePremium,
      isAdmin,
      setAdmin,
      toggleAdmin,
      getLimits,
      isRestricted,
      restrictions,
      toggleRestriction,
      resetToCsvDefaults,
      settingsHydrated,
    }),
    [
      isPremium,
      togglePremium,
      isAdmin,
      toggleAdmin,
      getLimits,
      isRestricted,
      restrictions,
      toggleRestriction,
      resetToCsvDefaults,
      settingsHydrated,
    ],
  );

  return (
    <ProfileSettingsContext.Provider value={value}>{children}</ProfileSettingsContext.Provider>
  );
}

export function useProfileSettings(): ProfileSettingsValue {
  const ctx = useContext(ProfileSettingsContext);
  if (!ctx) {
    throw new Error('useProfileSettings doit être utilisé dans ProfileSettingsProvider');
  }
  return ctx;
}
