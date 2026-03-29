import { Design } from '@/constants/design';
import {
  buildMemberFallbackProfile,
  formatSuggestionCaption,
  getSuggestionProfile,
  type SuggestionProfile,
} from '@/data/suggestionProfiles';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const STAT_BLUE = '#42A5F5';
const PRIMARY_BTN = '#2196F3';
const CARD = '#1A1A1A';
const RED_OUTLINE = '#FF3B30';

function paramStr(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function resolveProfileFromParams(params: {
  id?: string | string[];
  fn?: string | string[];
  g0?: string | string[];
  g1?: string | string[];
  seed?: string | string[];
}): SuggestionProfile | undefined {
  const id = paramStr(params.id);
  if (!id) return undefined;

  const fromMock = getSuggestionProfile(id);
  if (fromMock) return fromMock;

  if (id === 'external') {
    const fn = paramStr(params.fn);
    const seed = paramStr(params.seed) ?? fn;
    const g0 = paramStr(params.g0);
    const g1 = paramStr(params.g1);
    if (fn && seed) {
      return buildMemberFallbackProfile({
        displayName: fn,
        avatarGradient: g0 && g1 ? ([g0, g1] as const) : undefined,
        seed,
      });
    }
  }

  return undefined;
}

export default function SuggestionProfilScreen() {
  const raw = useLocalSearchParams();
  const id = paramStr(raw.id as string | string[] | undefined);
  const fn = paramStr(raw.fn as string | string[] | undefined);
  const g0 = paramStr(raw.g0 as string | string[] | undefined);
  const g1 = paramStr(raw.g1 as string | string[] | undefined);
  const seed = paramStr(raw.seed as string | string[] | undefined);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const profile = useMemo(
    () =>
      resolveProfileFromParams({
        id: id ?? '',
        fn,
        g0,
        g1,
        seed,
      }),
    [id, fn, g0, g1, seed],
  );

  if (!profile) {
    return (
      <View style={[styles.fallback, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.fallbackText}>Profil introuvable.</Text>
        <Pressable onPress={() => router.back()} style={styles.fallbackBtn}>
          <Text style={styles.fallbackBtnText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const title = formatSuggestionCaption(profile.pseudo, profile.age);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={styles.heroWrap}>
          <Image
            source={{ uri: profile.imageUrl }}
            style={styles.heroImage}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.92)']}
            locations={[0.35, 0.65, 1]}
            style={StyleSheet.absoluteFill}
          />
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { top: insets.top + 8 }]}
            hitSlop={12}
            accessibilityLabel="Retour">
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </Pressable>
          <View style={[styles.heroTextBlock, { paddingBottom: 20 }]}>
            <Text style={styles.heroTitle}>{title}</Text>
            {profile.verified ? (
              <View style={styles.verifiedRow}>
                <Ionicons name="shield-checkmark" size={18} color="#34C759" />
                <Text style={styles.verifiedText}>Profil vérifié</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.bioCard}>
            <Text style={styles.bioText}>{profile.bio}</Text>
            <View style={styles.bioRule} />
            <View style={styles.memberRow}>
              <Ionicons name="calendar-outline" size={18} color={Design.textSecondary} />
              <Text style={styles.memberText}>Membre depuis {profile.memberSince}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{profile.stats.reliability.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Fiabilité</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{profile.stats.events}</Text>
              <Text style={styles.statLabel}>Événements</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{profile.stats.friends}</Text>
              <Text style={styles.statLabel}>Amis</Text>
            </View>
          </View>

          <Text style={styles.badgesHeading}>Badges</Text>
          <View style={styles.badgesWrap}>
            {profile.badges.map((b) => (
              <View key={b} style={styles.badgePill}>
                <MaterialCommunityIcons name="ribbon" size={16} color="#FFB300" />
                <Text style={styles.badgePillText}>{b}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [styles.btnMessage, pressed && { opacity: 0.9 }]}
            accessibilityRole="button"
            accessibilityLabel="Envoyer un message">
            <Ionicons name="chatbubble-outline" size={20} color="#fff" />
            <Text style={styles.btnMessageText}>Message</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.btnRemove, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Retirer des amis">
            <Ionicons name="person-remove-outline" size={20} color={RED_OUTLINE} />
            <Text style={styles.btnRemoveText}>Retirer des amis</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const HERO_H = 320;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Design.bg,
  },
  scroll: {
    flex: 1,
  },
  heroWrap: {
    height: HERO_H,
    width: '100%',
    position: 'relative',
    backgroundColor: '#111',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  backBtn: {
    position: 'absolute',
    left: 8,
    zIndex: 4,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextBlock: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 0,
    zIndex: 2,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  verifiedText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 18,
    paddingTop: 20,
    gap: 18,
  },
  bioCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 18,
    gap: 16,
  },
  bioText: {
    color: Design.textPrimary,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  bioRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#333',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberText: {
    color: Design.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCell: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  statValue: {
    color: STAT_BLUE,
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: Design.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  badgesHeading: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CARD,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  badgePillText: {
    color: Design.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  btnMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: PRIMARY_BTN,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY_BTN,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  btnMessageText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  btnRemove: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: RED_OUTLINE,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'transparent',
  },
  btnRemoveText: {
    color: RED_OUTLINE,
    fontSize: 16,
    fontWeight: '700',
  },
  fallback: {
    flex: 1,
    backgroundColor: Design.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  fallbackText: {
    color: Design.textSecondary,
    fontSize: 16,
  },
  fallbackBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: CARD,
    borderRadius: 12,
  },
  fallbackBtnText: {
    color: Design.textPrimary,
    fontWeight: '700',
  },
});
