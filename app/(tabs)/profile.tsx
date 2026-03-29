import { Design } from '@/constants/design';
import { useProfileSettings, type RestrictionKey } from '@/context/ProfileSettingsContext';
import { useMessaging } from '@/context/MessagingContext';
import { profileFriendsFromCsv, profileMe } from '@/data/mockDataLoader';
import { todayDateKey } from '@/lib/todayDateKey';
import type { Event } from '@/types/messaging';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

type TabId = 'favorites' | 'friends' | 'past' | 'settings';

const PINK = '#FF4B81';
const PURPLE = '#8B5CF6';
const GRAY_BADGE = '#6B7280';
const GOLD = '#FBBF24';
const CARD = '#1C1C1E';
const BORDER = 'rgba(255,255,255,0.08)';

const RESTRICTION_ROWS: {
  key: RestrictionKey;
  title: string;
  subtitle: string;
}[] = [
  {
    key: 'blurProfiles',
    title: 'Profils floutés',
    subtitle: 'Photos, noms et âges des utilisateurs floutés',
  },
  {
    key: 'disableMessages',
    title: 'Messages désactivés',
    subtitle: 'Onglet Messages non accessible',
  },
  {
    key: 'blurEventAddress',
    title: 'Adresses floutées (obsolète)',
    subtitle: 'Géré par l’organisateur de chaque événement',
  },
  {
    key: 'limitEventCreation',
    title: 'Création limitée (1 événement)',
    subtitle: 'Maximum 1 événement actif à la fois',
  },
  {
    key: 'limitParticipants',
    title: 'Participants limités (8 max)',
    subtitle: 'Premium : jusqu’à 20 participants',
  },
  {
    key: 'limitRegistrations',
    title: 'Inscriptions limitées (3 max)',
    subtitle: 'Max 3 participations et 3 favoris. Premium : 10',
  },
  {
    key: 'disableSearch',
    title: 'Recherche désactivée',
    subtitle: 'La recherche d’événements est réservée aux Premium',
  },
];

function eventParticipated(e: Event): boolean {
  return e.cardStatus === 'inscrit' || e.cardStatus === 'organisateur';
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { events } = useMessaging();
  const {
    isPremium,
    togglePremium,
    isAdmin,
    toggleAdmin,
    getLimits,
    restrictions,
    toggleRestriction,
    resetToCsvDefaults,
  } = useProfileSettings();

  const [tab, setTab] = useState<TabId>('favorites');

  const today = todayDateKey();

  const favoriteEvents = useMemo(
    () =>
      [...events].filter((e) => e.isFavorite).sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
    [events],
  );

  const pastEvents = useMemo(
    () =>
      [...events]
        .filter((e) => e.dateKey < today && eventParticipated(e))
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
    [events, today],
  );

  const myUpcoming = useMemo(
    () =>
      events.filter((e) => e.dateKey >= today && eventParticipated(e)),
    [events, today],
  );

  const limits = getLimits();

  const tabBadge = (id: TabId): number => {
    switch (id) {
      case 'favorites':
        return favoriteEvents.length;
      case 'friends':
        return profileFriendsFromCsv.length;
      case 'past':
        return pastEvents.length;
      default:
        return 0;
    }
  };

  const canSeePast = isPremium || isAdmin;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Design.contentBottomSpace + 24 }}>
        <View style={styles.header}>
          <View style={styles.avatarRing}>
            <Image source={{ uri: profileMe.avatarUrl }} style={styles.avatarImg} contentFit="cover" />
            <View style={styles.verified}>
              <Ionicons name="shield-checkmark" size={14} color="#fff" />
            </View>
          </View>
          <Text style={styles.displayName}>{profileMe.displayName}</Text>
          <Text style={styles.memberSince}>Membre depuis {profileMe.memberSince}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{profileMe.reliabilityScore}</Text>
            <Text style={styles.statLbl}>Fiabilité</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{myUpcoming.length}</Text>
            <Text style={styles.statLbl}>À venir</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: '#34D399' }]}>0</Text>
            <Text style={styles.statLbl}>No-shows</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
          style={{ marginBottom: 16 }}>
          <TabBtn
            label="Favoris"
            icon="heart"
            active={tab === 'favorites'}
            onPress={() => setTab('favorites')}
            badge={tabBadge('favorites')}
            badgeColor={PINK}
            underlineColor={PINK}
          />
          <TabBtn
            label="Amis"
            icon="people"
            active={tab === 'friends'}
            onPress={() => setTab('friends')}
            badge={tabBadge('friends')}
            badgeColor={PURPLE}
            underlineColor={PURPLE}
          />
          <TabBtn
            label="Passés"
            icon="time"
            active={tab === 'past'}
            onPress={() => canSeePast && setTab('past')}
            badge={tabBadge('past')}
            badgeColor={GRAY_BADGE}
            underlineColor={GRAY_BADGE}
            locked={!canSeePast}
          />
          <TabBtn
            label="Paramètres"
            icon="settings-outline"
            active={tab === 'settings'}
            onPress={() => setTab('settings')}
            underlineColor="#9CA3AF"
          />
        </ScrollView>

        {tab === 'favorites' && (
          <View style={styles.listBlock}>
            {favoriteEvents.length === 0 ? (
              <EmptyHint icon="heart-outline" text="Aucun événement en favoris." />
            ) : (
              favoriteEvents.map((e) => (
                <EventRow key={e.id} event={e} onPress={() => router.push(`/event/${e.id}`)} heart />
              ))
            )}
          </View>
        )}

        {tab === 'friends' && (
          <View style={styles.listBlock}>
            {profileFriendsFromCsv.map((f) => (
              <Pressable
                key={f.profilId}
                onPress={() => router.push(`/profil/${f.profilId}`)}
                style={({ pressed }) => [styles.friendCard, pressed && { opacity: 0.85 }]}>
                <Image source={{ uri: f.imageUrl }} style={styles.friendAvatar} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.friendName}>{f.name}</Text>
                  <Text style={styles.friendSub}>
                    {f.eventsInCommon} événements en commun
                  </Text>
                </View>
                <LinearGradient colors={['#6B21A8', PURPLE]} style={styles.voirBtn}>
                  <Text style={styles.voirTxt}>Voir</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        )}

        {tab === 'past' && (
          <View style={styles.listBlock}>
            {!canSeePast ? (
              <View style={styles.lockedBox}>
                <Ionicons name="lock-closed" size={28} color={GOLD} />
                <Text style={styles.lockedTitle}>Réservé au Premium</Text>
                <Text style={styles.lockedSub}>
                  Activez Premium ou le mode admin dans Paramètres pour voir l’historique.
                </Text>
              </View>
            ) : pastEvents.length === 0 ? (
              <EmptyHint icon="time-outline" text="Aucun événement passé." />
            ) : (
              pastEvents.map((e) => (
                <EventRow key={e.id} event={e} onPress={() => router.push(`/event/${e.id}`)} participated />
              ))
            )}
          </View>
        )}

        {tab === 'settings' && (
          <View style={styles.listBlock}>
            <Pressable
              onPress={togglePremium}
              style={[
                styles.bigCard,
                isPremium && { backgroundColor: 'transparent' },
              ]}>
              {isPremium ? (
                <LinearGradient
                  colors={['#F59E0B', '#EA580C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bigCardInner}>
                  <SettingsCardInner
                    icon="star"
                    title="Premium activé"
                    subtitle="Toutes les fonctionnalités débloquées"
                    switchOn={isPremium}
                  />
                </LinearGradient>
              ) : (
                <View style={[styles.bigCardInner, { backgroundColor: CARD }]}>
                  <SettingsCardInner
                    icon="star-outline"
                    title="Mode gratuit"
                    subtitle="Fonctionnalités limitées"
                    switchOn={isPremium}
                  />
                </View>
              )}
            </Pressable>

            <Pressable onPress={toggleAdmin} style={styles.bigCard}>
              {isAdmin ? (
                <LinearGradient
                  colors={['#4F46E5', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bigCardInner}>
                  <SettingsCardInner
                    icon="shield"
                    title="Admin mode"
                    subtitle="Accès illimité aux dates passées"
                    switchOn={isAdmin}
                    light
                  />
                </LinearGradient>
              ) : (
                <View style={[styles.bigCardInner, { backgroundColor: CARD }]}>
                  <SettingsCardInner
                    icon="shield-outline"
                    title="Admin mode"
                    subtitle="Mode utilisateur standard"
                    switchOn={isAdmin}
                  />
                </View>
              )}
            </Pressable>

            <View style={[styles.bigCard, { backgroundColor: CARD }]}>
              <View style={styles.bigCardInner}>
                <View style={styles.langRow}>
                  <View style={styles.globeBox}>
                    <Ionicons name="globe-outline" size={24} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Langue</Text>
                    <Text style={styles.cardSub}>Français (démo)</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Paramètres</Text>
              <Row label="Participants max par événement" value={String(limits.maxParticipants)} />
              <Row label="Inscriptions max" value={String(limits.maxRegistrations)} />
              <Row label="Favoris max" value={String(limits.maxFavorites)} />
              <Row
                label="Événements actifs max"
                value={limits.maxActiveEvents >= 999 ? '∞' : String(limits.maxActiveEvents)}
                last
              />
            </View>

            <View style={styles.sectionCard}>
              <Text style={[styles.sectionTitle, !isPremium && { color: '#F87171' }]}>
                {!isPremium ? 'Restrictions mode gratuit' : 'Contrôle des restrictions'}
              </Text>
              {RESTRICTION_ROWS.map((row, i) => {
                return (
                  <View
                    key={row.key}
                    style={[styles.restrictionRow, i < RESTRICTION_ROWS.length - 1 && styles.restrictionBorder]}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={styles.restTitle}>{row.title}</Text>
                      <Text style={styles.restSub}>{row.subtitle}</Text>
                    </View>
                    <Switch
                      value={isPremium ? restrictions[row.key] : true}
                      onValueChange={() => isPremium && toggleRestriction(row.key)}
                      disabled={!isPremium}
                      trackColor={{ false: '#3A3A3C', true: '#EF4444' }}
                      thumbColor="#fff"
                    />
                  </View>
                );
              })}
            </View>

            <Pressable onPress={resetToCsvDefaults} style={styles.resetBtn}>
              <Ionicons name="refresh" size={18} color="#EF4444" />
              <Text style={styles.resetTxt}>Réinitialiser les paramètres</Text>
            </Pressable>
            <Text style={styles.autoSave}>Les changements s’appliquent pour cette session (source CSV au reset).</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function TabBtn({
  label,
  icon,
  active,
  onPress,
  badge,
  badgeColor,
  underlineColor,
  locked,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  badge?: number;
  badgeColor?: string;
  underlineColor: string;
  locked?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.tabBtn}>
      <View style={styles.tabInner}>
        {locked && <Ionicons name="lock-closed" size={10} color={GOLD} style={{ marginRight: 4 }} />}
        <Ionicons
          name={icon}
          size={14}
          color={active ? Design.textPrimary : Design.textSecondary}
        />
        <Text style={[styles.tabLabel, active && { fontWeight: '700', color: Design.textPrimary }]}>
          {label}
        </Text>
        {badge !== undefined && badgeColor && (
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeTxt}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
        {locked && (
          <View style={styles.proPill}>
            <Text style={styles.proPillTxt}>PRO</Text>
          </View>
        )}
      </View>
      <View style={[styles.tabUnderline, active && { backgroundColor: underlineColor }]} />
    </Pressable>
  );
}

function EventRow({
  event,
  onPress,
  heart,
  participated,
}: {
  event: Event;
  onPress: () => void;
  heart?: boolean;
  participated?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.eventCard, pressed && { opacity: 0.9 }]}>
      <View style={styles.thumbWrap}>
        <Image source={{ uri: event.imageUri }} style={styles.thumb} contentFit="cover" />
        {heart && (
          <View style={styles.heartFab}>
            <Ionicons name="heart" size={12} color="#fff" />
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventMeta}>
          {event.dateLabel} • {event.timeShort}
          {participated && (
            <Text style={{ color: '#34D399' }}> • ✓ Participé</Text>
          )}
        </Text>
      </View>
    </Pressable>
  );
}

function SettingsCardInner({
  icon,
  title,
  subtitle,
  switchOn,
  light,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  switchOn: boolean;
  light?: boolean;
}) {
  const fg = light ? '#fff' : Design.textPrimary;
  const sub = light ? 'rgba(255,255,255,0.85)' : Design.textSecondary;
  return (
    <View style={styles.settingsRow}>
      <View style={[styles.iconSq, light && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
        <Ionicons name={icon} size={24} color={light ? '#fff' : GOLD} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, { color: fg }]}>{title}</Text>
        <Text style={[styles.cardSub, { color: sub }]}>{subtitle}</Text>
      </View>
      <View style={[styles.fakeSwitch, switchOn && styles.fakeSwitchOn]}>
        <View style={[styles.fakeKnob, switchOn && styles.fakeKnobOn]} />
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.limitsRow, !last && styles.limitsBorder]}>
      <Text style={styles.limitsLbl}>{label}</Text>
      <Text style={styles.limitsVal}>{value}</Text>
    </View>
  );
}

function EmptyHint({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={36} color={Design.textSecondary} style={{ opacity: 0.4 }} />
      <Text style={styles.emptyTxt}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Design.bg,
    paddingHorizontal: 16,
  },
  header: { alignItems: 'center', marginBottom: 20 },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#2C2C2E',
    marginBottom: 12,
    position: 'relative',
  },
  avatarImg: { width: '100%', height: '100%', borderRadius: 48 },
  verified: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#22C55E',
    borderRadius: 14,
    padding: 4,
    borderWidth: 2,
    borderColor: Design.bg,
  },
  displayName: {
    color: Design.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  memberSince: { color: Design.textSecondary, fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  statNum: { color: Design.textPrimary, fontSize: 22, fontWeight: '800' },
  statLbl: { color: Design.textSecondary, fontSize: 11, marginTop: 4 },
  tabsRow: { flexDirection: 'row', gap: 18, paddingRight: 8 },
  tabBtn: { marginRight: 4 },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingBottom: 8 },
  tabLabel: { color: Design.textSecondary, fontSize: 13 },
  tabUnderline: { height: 2, borderRadius: 1, backgroundColor: 'transparent' },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 2,
  },
  badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  proPill: {
    backgroundColor: GOLD,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 4,
  },
  proPillTxt: { fontSize: 8, fontWeight: '900', color: '#000' },
  listBlock: { gap: 10 },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  thumbWrap: { position: 'relative' },
  thumb: { width: 52, height: 52, borderRadius: 10 },
  heartFab: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PINK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTitle: { color: Design.textPrimary, fontWeight: '700', fontSize: 15 },
  eventMeta: { color: Design.textSecondary, fontSize: 12, marginTop: 4 },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  friendAvatar: { width: 50, height: 50, borderRadius: 25 },
  friendName: { color: Design.textPrimary, fontWeight: '700', fontSize: 15 },
  friendSub: { color: Design.textSecondary, fontSize: 12, marginTop: 4 },
  voirBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  voirTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  lockedBox: {
    alignItems: 'center',
    padding: 28,
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  lockedTitle: { color: Design.textPrimary, fontWeight: '700', marginTop: 12, fontSize: 16 },
  lockedSub: { color: Design.textSecondary, textAlign: 'center', marginTop: 8, fontSize: 13 },
  bigCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  bigCardInner: { padding: 16, borderRadius: 16 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconSq: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardSub: { fontSize: 12, marginTop: 2 },
  fakeSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3A3A3C',
    padding: 2,
    justifyContent: 'center',
  },
  fakeSwitchOn: { backgroundColor: 'rgba(255,255,255,0.35)' },
  fakeKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  fakeKnobOn: { alignSelf: 'flex-end' },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  globeBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    color: Design.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  limitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  limitsBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  limitsLbl: { color: Design.textSecondary, fontSize: 13, flex: 1 },
  limitsVal: { color: Design.textPrimary, fontWeight: '700', fontSize: 13 },
  restrictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  restrictionBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  restTitle: { color: Design.textPrimary, fontWeight: '600', fontSize: 13 },
  restSub: { color: Design.textSecondary, fontSize: 11, marginTop: 3 },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    marginBottom: 10,
  },
  resetTxt: { color: '#EF4444', fontWeight: '700', fontSize: 14 },
  autoSave: {
    color: Design.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyTxt: { color: Design.textSecondary, marginTop: 10, fontSize: 14 },
});
