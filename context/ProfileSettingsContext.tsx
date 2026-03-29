import {
  limitsByTier,
  profileMe,
  type TierLimits,
} from '@/data/mockDataLoader';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export type RestrictionKey =
  | 'blurProfiles'
  | 'disableMessages'
  | 'blurEventAddress'
  | 'limitEventCreation'
  | 'limitParticipants'
  | 'limitRegistrations'
  | 'disableSearch';

const DEFAULT_RESTRICTIONS: Record<RestrictionKey, boolean> = {
  blurProfiles: true,
  disableMessages: true,
  blurEventAddress: false,
  limitEventCreation: true,
  limitParticipants: true,
  limitRegistrations: true,
  disableSearch: true,
};

type ProfileSettingsValue = {
  isPremium: boolean;
  setPremium: (v: boolean) => void;
  togglePremium: () => void;
  isAdmin: boolean;
  setAdmin: (v: boolean) => void;
  toggleAdmin: () => void;
  getLimits: () => TierLimits;
  /** Mode gratuit : restriction active si la clé est true. Premium : jamais restreint. */
  isRestricted: (key: RestrictionKey) => boolean;
  restrictions: Record<RestrictionKey, boolean>;
  toggleRestriction: (key: RestrictionKey) => void;
  resetToCsvDefaults: () => void;
};

const ProfileSettingsContext = createContext<ProfileSettingsValue | null>(null);

export function ProfileSettingsProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setPremium] = useState(profileMe.isPremiumSeed);
  const [isAdmin, setAdmin] = useState(profileMe.isAdminSeed);
  const [restrictions, setRestrictions] = useState<Record<RestrictionKey, boolean>>({
    ...DEFAULT_RESTRICTIONS,
  });

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
    setPremium(profileMe.isPremiumSeed);
    setAdmin(profileMe.isAdminSeed);
    setRestrictions({ ...DEFAULT_RESTRICTIONS });
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
