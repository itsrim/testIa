import { Design } from '@/constants/design';
import { useMessaging } from '@/context/MessagingContext';
import type { Sortie } from '@/types/messaging';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

const W = Dimensions.get('window').width;
const PAD = 16;
const GAP = 10;
const COL_W = (W - PAD * 2 - GAP) / 2;

const WEEK = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const WEEK_NUMS = [23, 24, 25, 26, 27, 28, 29];

function CalendarHeader({
  selectedDay,
  onSelectDay,
  insetTop,
}: {
  selectedDay: number;
  onSelectDay: (d: number) => void;
  insetTop: number;
}) {
  return (
    <LinearGradient
      colors={[...Design.gradientHeaderSorties]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={[styles.calGradient, { paddingTop: insetTop + 12 }]}>
      <View style={styles.calTopRow}>
        <Pressable hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="rgba(0,0,0,0.65)" />
        </Pressable>
        <Text style={styles.calMonth}>Mars 2026</Text>
        <Pressable hitSlop={8}>
          <Ionicons name="chevron-forward" size={22} color="rgba(0,0,0,0.65)" />
        </Pressable>
      </View>
      <View style={styles.calWeekLetters}>
        {WEEK.map((l, i) => (
          <Text key={`${l}-${i}`} style={styles.calLetter}>
            {l}
          </Text>
        ))}
      </View>
      <View style={styles.calNumsRow}>
        {WEEK_NUMS.map((n) => {
          const sel = n === selectedDay;
          return (
            <Pressable key={n} onPress={() => onSelectDay(n)} style={styles.calDayHit}>
              {sel ? (
                <View style={styles.calDayGlow}>
                  <Text style={styles.calNumSel}>{n}</Text>
                </View>
              ) : (
                <Text style={styles.calNum}>{n}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.calExpandWrap}>
        <View style={styles.calExpandCircle}>
          <Ionicons name="chevron-down" size={16} color={Design.textPrimary} />
        </View>
      </View>
    </LinearGradient>
  );
}

function SortieCard({ item, onToggleFavorite }: { item: Sortie; onToggleFavorite: () => void }) {
  const router = useRouter();

  const statusEl =
    item.cardStatus === 'inscrit' ? (
      <View style={[styles.tag, styles.tagBlue]}>
        <Ionicons name="checkmark-circle" size={14} color="#fff" />
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

  const goChat = () => router.push(`/chat/${item.conversationId}`);

  return (
    <View style={styles.card}>
      <Pressable onPress={goChat} style={({ pressed }) => pressed && { opacity: 0.92 }}>
        <View style={[styles.cardImgWrap, { width: COL_W }]}>
          <Image source={{ uri: item.imageUri }} style={styles.cardImg} contentFit="cover" />
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
                      marginLeft: i === 0 ? 0 : -10,
                      backgroundColor: ['#5C6BC0', '#EC407A', '#FFA726'][i],
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.countPill}>
              <Ionicons name="people-outline" size={14} color="#fff" />
              <Text style={styles.countText}>
                {item.participantCount}/{item.participantMax}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
      <View style={styles.cardBody}>
        <Pressable onPress={goChat}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
        </Pressable>
        <Pressable style={styles.favBtn} onPress={onToggleFavorite} hitSlop={12}>
          <Ionicons
            name={item.isFavorite ? 'heart' : 'heart-outline'}
            size={22}
            color={item.isFavorite ? '#FF4081' : Design.textPrimary}
          />
        </Pressable>
        <Pressable onPress={goChat}>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={16} color={Design.textSecondary} />
            <Text style={styles.metaText}>{item.timeShort}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} color={Design.textSecondary} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

export default function SortiesScreen() {
  const insets = useSafeAreaInsets();
  const { sorties, toggleSortieFavorite } = useMessaging();
  const [selectedDay, setSelectedDay] = useState(26);

  const ordered = useMemo(() => [...sorties].sort((a, b) => b.createdAt - a.createdAt),   [sorties]);

  const sections = useMemo(() => {
    const map = new Map<string, Sortie[]>();
    for (const s of ordered) {
      const k = s.sectionDateLabel;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return Array.from(map.entries());
  }, [ordered]);

  const firstSectionTitle = sections[0]?.[0] ?? '';

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Design.contentBottomSpace + insets.bottom + 16,
        }}>
        <CalendarHeader
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          insetTop={insets.top}
        />

        {firstSectionTitle ? (
          <Text style={styles.sectionTitle}>{firstSectionTitle}</Text>
        ) : null}

        {sections.map(([sectionTitle, items]) => (
          <View key={sectionTitle} style={styles.section}>
            {sections.length > 1 && sectionTitle !== firstSectionTitle ? (
              <Text style={styles.sectionTitleSecondary}>{sectionTitle}</Text>
            ) : null}
            <View style={styles.grid}>
              {items.map((item) => (
                <View key={item.id} style={{ width: COL_W, marginBottom: GAP }}>
                  <SortieCard item={item} onToggleFavorite={() => toggleSortieFavorite(item.id)} />
                </View>
              ))}
            </View>
          </View>
        ))}

        {ordered.length === 0 ? (
          <Text style={styles.empty}>Aucune sortie. Créez-en depuis une conversation.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Design.bg,
  },
  calGradient: {
    paddingBottom: 20,
    marginBottom: 8,
  },
  calTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  calMonth: {
    fontSize: 18,
    fontWeight: '800',
    color: 'rgba(0,0,0,0.75)',
  },
  calWeekLetters: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  calLetter: {
    width: (W - 48) / 7,
    textAlign: 'center',
    color: 'rgba(0,0,0,0.45)',
    fontSize: 13,
    fontWeight: '600',
  },
  calNumsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  calDayHit: {
    width: (W - 32) / 7,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  calDayGlow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Design.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(147, 112, 219, 0.5)',
  },
  calNum: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.65)',
  },
  calNumSel: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
  calExpandWrap: {
    alignItems: 'center',
    marginTop: 12,
  },
  calExpandCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    textAlign: 'center',
    color: Design.textSection,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 4,
  },
  sectionTitleSecondary: {
    textAlign: 'center',
    color: Design.textSection,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 20,
    opacity: 0.9,
  },
  section: {
    paddingHorizontal: PAD,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  empty: {
    textAlign: 'center',
    color: Design.textSecondary,
    padding: 32,
    fontSize: 15,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#141414',
  },
  cardImgWrap: {
    borderRadius: 15,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
  },
  cardImg: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 15,
  },
  cardImgTop: {
    ...StyleSheet.absoluteFillObject,
    padding: 8,
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
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  tagBlue: {
    backgroundColor: '#5AC8FA',
  },
  tagPink: {
    backgroundColor: '#FF2D55',
  },
  tagJoin: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  tagTextInv: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  tagJoinText: {
    color: '#007AFF',
    fontSize: 11,
    fontWeight: '700',
  },
  pricePill: {
    backgroundColor: Design.cardOverlay,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  priceText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  cardImgBottom: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAv: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.5)',
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Design.cardOverlay,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  cardBody: {
    paddingHorizontal: 6,
    paddingTop: 10,
    paddingBottom: 4,
    position: 'relative',
  },
  favBtn: {
    position: 'absolute',
    top: 8,
    right: 2,
    zIndex: 2,
    padding: 4,
  },
  cardTitle: {
    color: Design.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    paddingRight: 36,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    flex: 1,
    color: Design.textSecondary,
    fontSize: 13,
  },
});
