import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const STORAGE_KEY = 'moderation_state_v1';

export type UserReport = {
  id: string;
  profileId: string;
  pseudo: string;
  imageUrl?: string;
  createdAt: number;
};

type StoredShape = {
  reports: UserReport[];
  hiddenProfileIds: string[];
};

type ModerationValue = {
  reports: UserReport[];
  hiddenProfileIds: Set<string>;
  submitReport: (input: { profileId: string; pseudo: string; imageUrl?: string }) => void;
  hideProfileGlobally: (profileId: string) => void;
  isProfileHidden: (profileId: string) => boolean;
  /** Signalements concernant des profils encore visibles (action admin possible). */
  pendingReportsBadgeCount: number;
  /** AsyncStorage relu — évite d’écraser l’état avant chargement. */
  moderationHydrated: boolean;
};

const ModerationContext = createContext<ModerationValue | null>(null);

function newReportId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function ModerationProvider({ children }: { children: React.ReactNode }) {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [hiddenProfileIds, setHiddenProfileIds] = useState<Set<string>>(() => new Set());
  const [moderationHydrated, setModerationHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!alive) return;
        if (raw) {
          const p = JSON.parse(raw) as StoredShape;
          if (Array.isArray(p.reports)) setReports(p.reports);
          if (Array.isArray(p.hiddenProfileIds)) setHiddenProfileIds(new Set(p.hiddenProfileIds));
        }
      } catch {
        /* ignore */
      } finally {
        if (alive) setModerationHydrated(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!moderationHydrated) return;
    const payload: StoredShape = {
      reports,
      hiddenProfileIds: [...hiddenProfileIds],
    };
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [reports, hiddenProfileIds, moderationHydrated]);

  const submitReport = useCallback((input: { profileId: string; pseudo: string; imageUrl?: string }) => {
    const row: UserReport = {
      id: newReportId(),
      profileId: input.profileId,
      pseudo: input.pseudo,
      imageUrl: input.imageUrl,
      createdAt: Date.now(),
    };
    setReports((prev) => [row, ...prev]);
  }, []);

  const hideProfileGlobally = useCallback((profileId: string) => {
    setHiddenProfileIds((prev) => {
      const next = new Set(prev);
      next.add(profileId);
      return next;
    });
  }, []);

  const isProfileHidden = useCallback(
    (profileId: string) => hiddenProfileIds.has(profileId),
    [hiddenProfileIds],
  );

  const pendingReportsBadgeCount = useMemo(() => {
    return reports.filter((r) => !hiddenProfileIds.has(r.profileId)).length;
  }, [reports, hiddenProfileIds]);

  const value = useMemo(
    () => ({
      reports,
      hiddenProfileIds,
      submitReport,
      hideProfileGlobally,
      isProfileHidden,
      pendingReportsBadgeCount,
      moderationHydrated,
    }),
    [
      reports,
      hiddenProfileIds,
      submitReport,
      hideProfileGlobally,
      isProfileHidden,
      pendingReportsBadgeCount,
      moderationHydrated,
    ],
  );

  return <ModerationContext.Provider value={value}>{children}</ModerationContext.Provider>;
}

export function useModeration(): ModerationValue {
  const ctx = useContext(ModerationContext);
  if (!ctx) {
    throw new Error('useModeration doit être utilisé sous ModerationProvider');
  }
  return ctx;
}
