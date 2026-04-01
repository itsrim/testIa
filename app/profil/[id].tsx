import { Design } from '@/constants/design';
import { useMessaging } from '@/context/MessagingContext';
import { useModeration } from '@/context/ModerationContext';
import {
  buildMemberFallbackProfile,
  capPseudo,
  formatSuggestionCaption,
  getSuggestionProfile,
  type SuggestionProfile,
} from '@/data/suggestionProfiles';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image as RNImage,
  Modal,
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
const DANGER_MODAL = '#FF453A';

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
  const { t } = useTranslation();
  const { ensureDirectConversationForProfile } = useMessaging();
  const { isProfileHidden, submitReport } = useModeration();
  const [reportModalVisible, setReportModalVisible] = useState(false);

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

  if (isProfileHidden(profile.id)) {
    return (
      <View style={[styles.fallback, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.fallbackText}>{t('moderation.profileUnavailableTitle')}</Text>
        <Text style={[styles.fallbackText, { opacity: 0.85, fontSize: 14 }]}>
          {t('moderation.profileUnavailableBody')}
        </Text>
        <Pressable onPress={() => router.back()} style={styles.fallbackBtn}>
          <Text style={styles.fallbackBtnText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const title = formatSuggestionCaption(profile.pseudo, profile.age);

  const onReportPress = () => setReportModalVisible(true);

  const confirmSubmitReport = () => {
    submitReport({
      profileId: profile.id,
      pseudo: profile.pseudo,
      imageUrl: profile.imageUrl,
    });
    setReportModalVisible(false);
    Alert.alert(t('moderation.reportSentTitle'), t('moderation.reportSentBody'));
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={styles.heroWrap}>
          {Platform.OS === 'web' ? (
            <RNImage
              source={{ uri: profile.imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
              accessibilityLabel=""
            />
          ) : (
            <ExpoImage
              source={{ uri: profile.imageUrl }}
              style={styles.heroImage}
              contentFit="cover"
              priority="high"
            />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.92)']}
            locations={[0.35, 0.65, 1]}
            pointerEvents="none"
            style={styles.heroGradient}
          />
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { top: insets.top + 8 }]}
            hitSlop={12}
            accessibilityLabel="Retour">
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </Pressable>
          <Pressable
            onPress={onReportPress}
            style={[styles.reportBtn, { top: insets.top + 8 }]}
            hitSlop={12}
            accessibilityLabel={t('moderation.reportAccessibility')}
            accessibilityRole="button">
            <Ionicons name="warning" size={26} color="#FFCC00" />
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
            {profile.city ? (
              <View style={styles.memberRow}>
                <Ionicons name="location-outline" size={18} color={Design.textSecondary} />
                <Text style={styles.memberText}>{profile.city}</Text>
              </View>
            ) : null}
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
            onPress={() => {
              const convId = ensureDirectConversationForProfile({
                profilId: profile.id,
                displayTitle: capPseudo(profile.pseudo),
              });
              if (convId) router.push(`/chat/${convId}`);
            }}
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

      <Modal
        visible={reportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReportModalVisible(false)}>
        <View style={styles.reportModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setReportModalVisible(false)}
            accessibilityRole="button"
            accessibilityLabel={t('moderation.reportTapOutside')}
          />
          <View style={styles.reportModalCard}>
            <View style={styles.reportModalIconCircle}>
              <Ionicons name="warning" size={36} color={DANGER_MODAL} />
            </View>
            <Text style={styles.reportModalTitle}>{t('moderation.reportConfirmTitle')}</Text>
            <Text style={styles.reportModalMessage}>{t('moderation.reportConfirmMessage')}</Text>
            <View style={styles.reportModalActions}>
              <Pressable
                onPress={() => setReportModalVisible(false)}
                style={({ pressed }) => [styles.reportModalBtnSecondary, pressed && { opacity: 0.85 }]}>
                <Text style={styles.reportModalBtnSecondaryTxt}>{t('moderation.reportCancel')}</Text>
              </Pressable>
              <Pressable
                onPress={confirmSubmitReport}
                style={({ pressed }) => [styles.reportModalBtnDanger, pressed && { opacity: 0.9 }]}>
                <Ionicons name="warning" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.reportModalBtnDangerTxt}>{t('moderation.reportConfirmOk')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    overflow: 'hidden',
  },
  heroImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
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
  reportBtn: {
    position: 'absolute',
    right: 8,
    zIndex: 4,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 22,
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
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  reportModalCard: {
    backgroundColor: '#252528',
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    zIndex: 2,
    ...Platform.select({
      android: { elevation: 8 },
    }),
  },
  reportModalIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 69, 58, 0.18)',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  reportModalTitle: {
    color: Design.textPrimary,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  reportModalMessage: {
    color: Design.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
  },
  reportModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  reportModalBtnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#3A3A3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportModalBtnSecondaryTxt: {
    color: Design.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  reportModalBtnDanger: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: DANGER_MODAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportModalBtnDangerTxt: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
