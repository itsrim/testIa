import { Design } from '@/constants/design';
import { useMessaging } from '@/context/MessagingContext';
import type { Sortie } from '@/types/messaging';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  InteractionManager,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type SectionListData,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

const W = Dimensions.get('window').width;
/** Marges resserrées pour afficher ~3 lignes de cartes sous le calendrier (comme la ref. Agenda). */
const PAD = 12;
const GAP = 6;
const COL_W = (W - PAD * 2 - GAP) / 2;

/**
 * Ratio largeur/hauteur zone image — proche 16:9 (~1.78), un peu plus large pour 3 lignes visibles.
 */
const CARD_IMAGE_ASPECT = 2.05;

/** Calendrier : violet profond → magenta (maquette semaine mars 2026). */
const CAL_GRADIENT = ['#2D1A45', '#4F1D52', '#7A2462', '#9B2D6E'] as const;

function dayOfMonthFromDateKey(dateKey: string): number {
  const p = dateKey.trim().split('-');
  return parseInt(p[2] ?? '0', 10) || 0;
}

function parseDateKeyLocal(dateKey: string): Date {
  const p = dateKey.trim().split('-');
  const y = parseInt(p[0] ?? '0', 10);
  const m = parseInt(p[1] ?? '1', 10);
  const d = parseInt(p[2] ?? '1', 10);
  return new Date(y, m - 1, d);
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7);
}

/** Lundi de la semaine ISO (lundi = premier jour). */
function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + diff);
  return x;
}

function isDateKeyInWeek(dateKey: string, weekStartMonday: Date): boolean {
  const d0 = toDateKey(weekStartMonday);
  const d6 = toDateKey(addDays(weekStartMonday, 6));
  return dateKey >= d0 && dateKey <= d6;
}

/** Garde le même jour de la semaine (lun–dim) sur la nouvelle semaine. */
function mapDateKeyToWeek(dateKey: string, weekStartMonday: Date): string {
  const prev = parseDateKeyLocal(dateKey);
  const weekdayFromMon = (prev.getDay() + 6) % 7;
  return toDateKey(addDays(weekStartMonday, weekdayFromMon));
}

function mapDateKeyIfNeeded(dateKey: string, weekStartMonday: Date): string {
  if (isDateKeyInWeek(dateKey, weekStartMonday)) return dateKey;
  return mapDateKeyToWeek(dateKey, weekStartMonday);
}

function formatWeekMonthTitle(weekStartMonday: Date): string {
  const end = addDays(weekStartMonday, 6);
  const sameMonth =
    weekStartMonday.getMonth() === end.getMonth() &&
    weekStartMonday.getFullYear() === end.getFullYear();
  if (sameMonth) {
    const t = weekStartMonday.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  const a = weekStartMonday.toLocaleDateString('fr-FR', { month: 'short' });
  const b = end.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  return `${a} – ${b}`;
}

function formatWeekRangeLabel(weekStartMonday: Date): string {
  const end = addDays(weekStartMonday, 6);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
  const a = weekStartMonday.toLocaleDateString('fr-FR', opts);
  const b = end.toLocaleDateString('fr-FR', opts);
  return `${a} – ${b}`;
}

function timeToMinutes(timeShort: string): number {
  const [h, m] = timeShort.split(':').map((x) => parseInt(x, 10));
  return (Number.isFinite(h) ? h! : 0) * 60 + (Number.isFinite(m) ? m! : 0);
}

/** Titre de section date (sticky) : bleu clair centré. */
const SECTION_DATE_BLUE = '#7EB8FF';

type SortiePairRow = { key: string; left: Sortie; right?: Sortie };

type AgendaSection = SectionListData<SortiePairRow> & {
  dateKey: string;
  dayOfMonth: number;
  sectionIndex: number;
};

function chunkSortiesIntoPairs(items: Sortie[]): SortiePairRow[] {
  const rows: SortiePairRow[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const left = items[i];
    const right = items[i + 1];
    rows.push({
      key: right ? `${left.id}-${right.id}` : left.id,
      left,
      right,
    });
  }
  return rows;
}

const WEEK_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

/** Semaine initiale : 23–29 mars 2026 (lundi 23). */
const INITIAL_WEEK_MONDAY = new Date(2026, 2, 23);
const INITIAL_DATE_KEY = toDateKey(INITIAL_WEEK_MONDAY);

function CalendarWeekStrip({
  weekStartMonday,
  selectedDateKey,
  onSelectDateKey,
}: {
  weekStartMonday: Date;
  selectedDateKey: string;
  onSelectDateKey: (dateKey: string) => void;
}) {
  return (
    <View style={styles.calWeekRow}>
      {WEEK_LETTERS.map((letter, i) => {
        const d = addDays(weekStartMonday, i);
        const dateKey = toDateKey(d);
        const sel = dateKey === selectedDateKey;
        const dayNum = d.getDate();
        const label = d.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });
        return (
          <Pressable
            key={dateKey}
            onPress={() => onSelectDateKey(dateKey)}
            style={styles.calDayCol}
            accessibilityLabel={label}>
            <View style={[styles.calDayPill, sel && styles.calDayPillSelected]}>
              <Text style={[styles.calLetter, sel && styles.calLetterSelected]}>{letter}</Text>
              <Text style={[styles.calNum, sel && styles.calNumSelected]}>{dayNum}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function CalendarHeader({
  weekStartMonday,
  selectedDateKey,
  onSelectDateKey,
  onShiftWeek,
  insetTop,
}: {
  weekStartMonday: Date;
  selectedDateKey: string;
  onSelectDateKey: (dateKey: string) => void;
  onShiftWeek: (delta: number) => void;
  insetTop: number;
}) {
  const pagerRef = useRef<ScrollView>(null);
  const monthTitle = useMemo(() => formatWeekMonthTitle(weekStartMonday), [weekStartMonday]);

  const centerPager = useCallback(() => {
    requestAnimationFrame(() => {
      pagerRef.current?.scrollTo({ x: W, animated: false });
    });
  }, []);

  useEffect(() => {
    centerPager();
  }, [weekStartMonday, centerPager]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const page = Math.round(x / W);
      if (page <= 0) {
        onShiftWeek(-1);
        centerPager();
      } else if (page >= 2) {
        onShiftWeek(1);
        centerPager();
      }
    },
    [onShiftWeek, centerPager],
  );

  const prev = addWeeks(weekStartMonday, -1);
  const next = addWeeks(weekStartMonday, 1);

  return (
    <LinearGradient
      colors={[...CAL_GRADIENT]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={[styles.calGradient, { paddingTop: insetTop + 6 }]}>
      <View style={styles.calTopRow}>
        <Pressable
          hitSlop={8}
          accessibilityLabel="Semaine précédente"
          onPress={() => onShiftWeek(-1)}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.calMonth}>{monthTitle}</Text>
        <Pressable
          hitSlop={8}
          accessibilityLabel="Semaine suivante"
          onPress={() => onShiftWeek(1)}>
          <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
        </Pressable>
      </View>
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        decelerationRate="fast"
        keyboardShouldPersistTaps="handled"
        style={styles.calPager}
        contentContainerStyle={styles.calPagerContent}>
        <View style={styles.calPagerPage}>
          <CalendarWeekStrip
            weekStartMonday={prev}
            selectedDateKey={selectedDateKey}
            onSelectDateKey={onSelectDateKey}
          />
        </View>
        <View style={styles.calPagerPage}>
          <CalendarWeekStrip
            weekStartMonday={weekStartMonday}
            selectedDateKey={selectedDateKey}
            onSelectDateKey={onSelectDateKey}
          />
        </View>
        <View style={styles.calPagerPage}>
          <CalendarWeekStrip
            weekStartMonday={next}
            selectedDateKey={selectedDateKey}
            onSelectDateKey={onSelectDateKey}
          />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function SortieCard({ item, onToggleFavorite }: { item: Sortie; onToggleFavorite: () => void }) {
  const router = useRouter();

  const statusEl =
    item.cardStatus === 'inscrit' ? (
      <View style={[styles.tag, styles.tagBlue]}>
        <Ionicons name="checkmark-circle" size={12} color="#fff" />
        <Text style={styles.tagTextInv}>Inscrit</Text>
      </View>
    ) : item.cardStatus === 'organisateur' ? (
      <View style={[styles.tag, styles.tagPink]}>
        <Text style={styles.tagTextInv}>Organisateur</Text>
      </View>
    ) : (
      <View style={[styles.tag, styles.tagJoin]}>
        <Text style={styles.tagJoinText}>+ S&apos;inscrire</Text>
      </View>
    );

  const openDetail = () => router.push(`/sortie/${item.id}`);

  return (
    <View style={styles.card}>
      <Pressable onPress={openDetail} style={({ pressed }) => pressed && { opacity: 0.92 }}>
        <View style={[styles.cardImgWrap, { width: COL_W }]}>
          <Image
            source={{ uri: item.imageUri }}
            style={[styles.cardImg, { aspectRatio: CARD_IMAGE_ASPECT }]}
            contentFit="cover"
          />
          <View style={styles.cardImgTop}>
            <View style={styles.cardTagsLeft}>{statusEl}</View>
            <View style={styles.pricePill}>
              <Text style={styles.priceText}>{item.priceLabel}</Text>
            </View>
          </View>
          <View style={styles.cardImgBottom}>
            <View style={styles.avatarsRow}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.miniAv,
                    {
                      marginLeft: i === 0 ? 0 : -8,
                      backgroundColor: ['#5C6BC0', '#EC407A', '#FFA726'][i],
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.countPill}>
              <Ionicons name="people-outline" size={11} color="#fff" />
              <Text style={styles.countText}>
                {item.participantCount}/{item.participantMax}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Pressable onPress={openDetail} style={styles.cardTitlePress}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
          </Pressable>
          <Pressable style={styles.favBtn} onPress={onToggleFavorite} hitSlop={10}>
            <Ionicons
              name={item.isFavorite ? 'heart' : 'heart-outline'}
              size={18}
              color={item.isFavorite ? '#FF4081' : 'rgba(255,255,255,0.92)'}
            />
          </Pressable>
        </View>
        <Pressable onPress={openDetail}>
          <View style={styles.metaRowCombined}>
            <Ionicons name="time-outline" size={13} color={Design.textSecondary} />
            <Text style={styles.metaTextSmall}>{item.timeShort}</Text>
            <Text style={styles.metaSep}> </Text>
            <Ionicons name="location-outline" size={13} color={Design.textSecondary} />
            <Text style={styles.metaTextSmallFlex} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function isEventInWeek(s: Sortie, weekStartMonday: Date): boolean {
  return isDateKeyInWeek(s.dateKey.trim(), weekStartMonday);
}

export default function SortiesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sorties, toggleSortieFavorite } = useMessaging();
  const [weekStartMonday, setWeekStartMonday] = useState<Date>(() => new Date(INITIAL_WEEK_MONDAY));
  const [selectedDateKey, setSelectedDateKey] = useState<string>(INITIAL_DATE_KEY);
  const listRef = useRef<SectionList<SortiePairRow, AgendaSection>>(null);
  const suppressScrollSync = useRef(false);
  /** Évite le scroll auto au changement de semaine quand la semaine vient du tap sur un jour. */
  const skipWeekChangeScroll = useRef(false);
  const prevWeekKey = useRef<string | null>(null);
  const selectedDateKeyRef = useRef(selectedDateKey);
  selectedDateKeyRef.current = selectedDateKey;

  const weekEvents = useMemo(() => {
    return sorties.filter((s) => isEventInWeek(s, weekStartMonday));
  }, [sorties, weekStartMonday]);

  const sectionListSections = useMemo((): AgendaSection[] => {
    const map = new Map<string, Sortie[]>();
    for (const s of weekEvents) {
      const k = s.sectionDateLabel;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    const entries = Array.from(map.entries());
    entries.sort((a, b) => {
      const dka = a[1][0]?.dateKey ?? '';
      const dkb = b[1][0]?.dateKey ?? '';
      return dka.localeCompare(dkb);
    });
    return entries.map(([title, items], sectionIndex) => {
      const sorted = [...items].sort((a, b) => {
        const tm = timeToMinutes(a.timeShort) - timeToMinutes(b.timeShort);
        if (tm !== 0) return tm;
        return a.id.localeCompare(b.id);
      });
      const dk = sorted[0]?.dateKey ?? '';
      return {
        title,
        dateKey: dk,
        dayOfMonth: dayOfMonthFromDateKey(dk),
        sectionIndex,
        data: chunkSortiesIntoPairs(sorted),
      };
    });
  }, [weekEvents]);

  const scrollToDateKey = useCallback(
    (dateKey: string, animated: boolean) => {
      if (sectionListSections.length === 0) return;
      let idx = sectionListSections.findIndex((s) => s.dateKey === dateKey);
      if (idx < 0) {
        idx = sectionListSections.findIndex((s) => s.dateKey > dateKey);
        if (idx < 0) idx = Math.max(0, sectionListSections.length - 1);
      }
      const targetKey = sectionListSections[idx]?.dateKey;
      if (targetKey != null && targetKey !== dateKey) {
        setSelectedDateKey(targetKey);
      }
      suppressScrollSync.current = true;
      const section = sectionListSections[idx];
      /**
       * itemIndex 0 = cellule d'en-tête de section ; avec sticky headers, le scroll est souvent faux.
       * itemIndex 1 = premier rang d'événements : VirtualizedSectionList ajoute alors la hauteur de
       * l'en-tête au viewOffset (voir RN), ce qui laisse le titre de date collé en haut de la liste,
       * donc juste sous le calendrier fixe.
       */
      const itemIndex = section.data.length > 0 ? 1 : 0;
      const doScroll = () => {
        listRef.current?.scrollToLocation({
          sectionIndex: idx,
          itemIndex,
          animated,
          viewPosition: 0,
          viewOffset: 0,
        });
      };
      requestAnimationFrame(() => {
        doScroll();
        InteractionManager.runAfterInteractions(() => {
          doScroll();
          setTimeout(doScroll, 120);
        });
      });
      setTimeout(() => {
        suppressScrollSync.current = false;
      }, animated ? 550 : 120);
    },
    [sectionListSections],
  );

  useEffect(() => {
    const wk = toDateKey(weekStartMonday);
    if (prevWeekKey.current === null) {
      prevWeekKey.current = wk;
      return;
    }
    if (wk === prevWeekKey.current) return;
    prevWeekKey.current = wk;

    const nextKey = mapDateKeyIfNeeded(selectedDateKeyRef.current, weekStartMonday);
    setSelectedDateKey(nextKey);

    if (skipWeekChangeScroll.current) {
      skipWeekChangeScroll.current = false;
      return;
    }
    if (sectionListSections.length === 0) return;
    InteractionManager.runAfterInteractions(() => {
      scrollToDateKey(nextKey, false);
    });
  }, [weekStartMonday, sectionListSections, scrollToDateKey]);

  const shiftWeek = useCallback((delta: number) => {
    setWeekStartMonday((w) => addWeeks(w, delta));
  }, []);

  const handleSelectDateKey = useCallback(
    (dateKey: string) => {
      const mon = startOfWeekMonday(parseDateKeyLocal(dateKey));
      setWeekStartMonday((w) => {
        if (toDateKey(w) === toDateKey(mon)) return w;
        skipWeekChangeScroll.current = true;
        return mon;
      });
      setSelectedDateKey(dateKey);
      requestAnimationFrame(() => {
        scrollToDateKey(dateKey, true);
      });
    },
    [scrollToDateKey],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[]; changed: ViewToken[] }) => {
      if (suppressScrollSync.current) return;
      const vis = viewableItems.filter((v) => v.isViewable && v.section != null);
      if (vis.length === 0) return;
      vis.sort((a, b) => {
        const sa = (a.section as AgendaSection).sectionIndex;
        const sb = (b.section as AgendaSection).sectionIndex;
        if (sa !== sb) return sa - sb;
        return (a.index ?? 0) - (b.index ?? 0);
      });
      const top = vis[0]?.section as AgendaSection | undefined;
      if (top?.dateKey != null) {
        setSelectedDateKey((prev) => (prev === top.dateKey ? prev : top.dateKey));
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 28,
    minimumViewTime: 80,
  }).current;

  /**
   * Calendrier hors de la SectionList : sinon scrollToLocation ignore le ListHeaderComponent
   * et le scroll vers le jour sélectionné ne fonctionne pas (comportement RN).
   */
  const listEmpty =
    sorties.length === 0 ? (
      <Text style={styles.empty}>
        Aucun événement. Appuyez sur + pour en créer un, ou depuis une conversation.
      </Text>
    ) : weekEvents.length === 0 ? (
      <Text style={styles.empty}>
        Aucun événement sur cette semaine ({formatWeekRangeLabel(weekStartMonday)}).
      </Text>
    ) : null;

  return (
    <View style={styles.root}>
      <CalendarHeader
        weekStartMonday={weekStartMonday}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={handleSelectDateKey}
        onShiftWeek={shiftWeek}
        insetTop={insets.top}
      />
      <SectionList<SortiePairRow, AgendaSection>
        ref={listRef}
        style={styles.sectionList}
        sections={sectionListSections}
        keyExtractor={(row) => row.key}
        stickySectionHeadersEnabled
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={listEmpty}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        contentContainerStyle={
          sorties.length === 0 || weekEvents.length === 0
            ? styles.sectionListContentEmpty
            : [styles.sectionListContent, { paddingBottom: Design.contentBottomSpace + insets.bottom + 12 }]
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.stickySectionHeader}>
            <Text style={styles.sectionDateTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.gridRow}>
            <View style={[styles.gridCell, { width: COL_W }]}>
              <SortieCard
                item={item.left}
                onToggleFavorite={() => toggleSortieFavorite(item.left.id)}
              />
            </View>
            {item.right ? (
              <View style={[styles.gridCell, { width: COL_W }]}>
                <SortieCard
                  item={item.right}
                  onToggleFavorite={() => toggleSortieFavorite(item.right!.id)}
                />
              </View>
            ) : (
              <View style={[styles.gridCell, { width: COL_W }]} />
            )}
          </View>
        )}
        SectionSeparatorComponent={() => null}
      />
      <Pressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/sortie/creer');
        }}
        accessibilityRole="button"
        accessibilityLabel="Créer un événement"
        style={({ pressed }) => [styles.fab, { bottom: Math.max(insets.bottom, 14) + 62 }, pressed && { opacity: 0.9 }]}>
        <LinearGradient
          colors={[...CAL_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabInner}>
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Design.bg,
  },
  fab: {
    position: 'absolute',
    right: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    zIndex: 40,
    ...Platform.select({
      ios: {
        shadowColor: '#9B2D6E',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      },
      android: {
        elevation: 14,
      },
    }),
  },
  fabInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionList: {
    flex: 1,
  },
  sectionListContent: {
    paddingTop: 0,
  },
  sectionListContentEmpty: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  stickySectionHeader: {
    backgroundColor: Design.bg,
    paddingTop: 4,
    paddingBottom: 6,
    alignItems: 'center',
    zIndex: 2,
  },
  sectionDateTitle: {
    color: SECTION_DATE_BLUE,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    marginBottom: GAP,
    width: '100%',
  },
  gridCell: {
    marginBottom: 0,
  },
  calGradient: {
    paddingBottom: 8,
  },
  calPager: {
    width: W,
  },
  calPagerContent: {
    width: W * 3,
  },
  calPagerPage: {
    width: W,
  },
  calTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  calMonth: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  calWeekRow: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  calDayCol: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  calDayPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 16,
    minWidth: 40,
  },
  calDayPillSelected: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
  },
  calLetter: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  calLetterSelected: {
    color: 'rgba(255,255,255,0.95)',
  },
  calNum: {
    fontSize: 17,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.92)',
  },
  calNumSelected: {
    color: '#FFFFFF',
  },
  empty: {
    textAlign: 'center',
    color: Design.textSecondary,
    padding: 32,
    fontSize: 15,
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
  },
  cardImgWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
  },
  cardImg: {
    width: '100%',
    borderRadius: 12,
  },
  cardImgTop: {
    ...StyleSheet.absoluteFillObject,
    padding: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardTagsLeft: {
    flexShrink: 1,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  tagBlue: {
    backgroundColor: '#5AC8FA',
  },
  tagPink: {
    backgroundColor: '#FF2D55',
  },
  /** Badge « + S'inscrire » : fond bleu foncé (ref. maquette). */
  tagJoin: {
    backgroundColor: '#243E6B',
  },
  tagTextInv: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  tagJoinText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 10,
    fontWeight: '800',
  },
  pricePill: {
    backgroundColor: Design.cardOverlay,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  priceText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  cardImgBottom: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAv: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.55)',
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Design.cardOverlay,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  cardBody: {
    paddingHorizontal: 5,
    paddingTop: 6,
    paddingBottom: 5,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitlePress: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  favBtn: {
    padding: 2,
    marginLeft: 2,
  },
  cardTitle: {
    color: Design.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
  },
  metaRowCombined: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'nowrap',
  },
  metaTextSmall: {
    color: Design.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  metaSep: {
    width: 4,
  },
  metaTextSmallFlex: {
    flex: 1,
    minWidth: 0,
    color: Design.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
});
