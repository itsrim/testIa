import { Design } from '@/constants/design';
import {
  PROFILE_BADGE_IDS,
  useProfileIdentity,
} from '@/context/ProfileIdentityContext';
import { useModeration } from '@/context/ModerationContext';
import { useProfileSettings, type RestrictionKey } from '@/context/ProfileSettingsContext';
import { useMessaging } from '@/context/MessagingContext';
import type { ProfileFriendRow, ProfileMeRow } from '@/data/mockDataLoader';
import { getUsersFriends, getUsersMe } from '@/services/dataApi';
import { todayDateKey } from '@/lib/todayDateKey';
import type { Event } from '@/types/messaging';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

type TabId = 'favorites' | 'friends' | 'history' | 'reports' | 'settings';

const PINK = '#FF4B81';
const PURPLE = '#8B5CF6';
const GRAY_BADGE = '#6B7280';
const GOLD = '#FBBF24';
const CARD = '#1C1C1E';
const BORDER = 'rgba(255,255,255,0.08)';
/** Restrictions : désactivé ou OFF = neutre blanc/gris ; ON (premium) = jaune + violet (pas de vert). */
const SWITCH_RESTRICTION_DISABLED_TRACK = '#D1D5DB';
const SWITCH_RESTRICTION_OFF_TRACK = '#E8E8E8';
const SWITCH_RESTRICTION_ON_TRACK = Design.badgeGold;
const SWITCH_RESTRICTION_THUMB_ON = PURPLE;
const SWITCH_RESTRICTION_THUMB_OFF_OR_DISABLED = '#FFFFFF';

const RESTRICTION_ORDER: RestrictionKey[] = [
  'blurProfiles',
  'disableMessages',
  'blurEventAddress',
  'limitEventCreation',
  'limitParticipants',
  'limitRegistrations',
  'disableSearch',
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const heroH = Math.min(380, Math.round(winH * 0.44));
  const router = useRouter();
  const { t, i18n } = useTranslation();
  /** État local : le Switch natif ne suit pas toujours i18n si changeLanguage est async — on met à jour tout de suite au geste. */
  const [langEn, setLangEn] = useState(() => i18n.language.startsWith('en'));

  useEffect(() => {
    setLangEn(i18n.language.startsWith('en'));
  }, [i18n.language]);

  const { events, cleanData, getViewerCardStatus } = useMessaging();

  const eventParticipated = useCallback(
    (e: Event) => {
      const s = getViewerCardStatus(e);
      return s === 'inscrit' || s === 'organisateur';
    },
    [getViewerCardStatus],
  );
  const {
    isPremium,
    togglePremium,
    isAdmin,
    toggleAdmin,
    hideDailyQuestionnaire,
    setHideDailyQuestionnaire,
    getLimits,
    restrictions,
    toggleRestriction,
    resetToCsvDefaults,
  } = useProfileSettings();

  const {
    reports,
    hideProfileGlobally,
    pendingReportsBadgeCount,
    isProfileHidden,
  } = useModeration();

  const {
    avatarUri,
    displayName,
    bio,
    age,
    badges,
    setAvatarUri,
    setDisplayName,
    setBio,
    setAge,
    toggleBadge,
  } = useProfileIdentity();

  const [tab, setTab] = useState<TabId>('favorites');
  const [meCsv, setMeCsv] = useState<ProfileMeRow | null>(null);
  const [friendsCsv, setFriendsCsv] = useState<ProfileFriendRow[]>([]);

  useEffect(() => {
    let alive = true;
    void Promise.all([getUsersMe(), getUsersFriends()]).then(([me, friends]) => {
      if (alive) {
        setMeCsv(me);
        setFriendsCsv(friends);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!isAdmin && tab === 'reports') setTab('favorites');
  }, [isAdmin, tab]);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftAge, setDraftAge] = useState('');
  const [draftBio, setDraftBio] = useState('');

  const visibleBadgeIds = useMemo(
    () => PROFILE_BADGE_IDS.filter((id) => id !== 'admin' || isAdmin),
    [isAdmin],
  );

  const openEdit = () => {
    setDraftName(displayName);
    setDraftAge(age);
    setDraftBio(bio);
    setEditing(true);
  };

  const saveEdit = () => {
    setDisplayName(draftName.trim() || displayName);
    setAge(draftAge.replace(/\D/g, '').slice(0, 3));
    setBio(draftBio.trim());
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('profile.photoPermissionTitle'), t('profile.photoPermissionBody'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
    }
  };

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

  const historyEvents = useMemo(
    () =>
      [...events]
        .filter((e) => eventParticipated(e))
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
    [events],
  );

  const limits = getLimits();

  const visibleFriends = useMemo(
    () => friendsCsv.filter((f) => !isProfileHidden(f.profilId)),
    [friendsCsv, isProfileHidden],
  );

  const tabBadge = (id: TabId): number => {
    switch (id) {
      case 'favorites':
        return favoriteEvents.length;
      case 'friends':
        return visibleFriends.length;
      case 'history':
        return historyEvents.length;
      case 'reports':
        return pendingReportsBadgeCount;
      default:
        return 0;
    }
  };

  const canSeePast = isPremium || isAdmin;

  if (!meCsv) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: Design.textSecondary }}>…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Design.contentBottomSpace + 24 }}>
        <View style={{ width: winW, height: heroH }}>
          <Image
            source={{ uri: avatarUri }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.92)']}
            locations={[0.4, 0.7, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.heroTopBar, { paddingTop: insets.top + 6 }]}>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={pickAvatar}
              accessibilityLabel={t('profile.changePhoto')}
              style={({ pressed }) => [styles.heroIconBtn, pressed && { opacity: 0.75 }]}>
              <Ionicons name="camera" size={22} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.heroBottom}>
            {!editing ? (
              <Text style={styles.heroName} numberOfLines={2}>
                {displayName}
                {age.trim() ? `, ${age.trim()}` : ''}
              </Text>
            ) : (
              <View style={{ gap: 6, alignSelf: 'stretch' }}>
                <Text style={styles.editFieldLblLight}>{t('profile.nameLabel')}</Text>
                <TextInput
                  value={draftName}
                  onChangeText={setDraftName}
                  style={styles.heroEditInput}
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  placeholder={t('profile.nameLabel')}
                />
                <Text style={styles.editFieldLblLight}>{t('profile.ageLabel')}</Text>
                <TextInput
                  value={draftAge}
                  onChangeText={setDraftAge}
                  keyboardType="number-pad"
                  style={styles.heroEditInput}
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  placeholder="—"
                />
              </View>
            )}
            <View style={styles.verifiedRow}>
              <Ionicons name="shield-checkmark" size={16} color="#22C55E" />
              <Text style={styles.verifiedTxt}>{t('profile.verifiedProfile')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.contentPad}>
          <View style={styles.bioCard}>
            {!editing ? (
              <Text style={styles.bioText}>{bio || '—'}</Text>
            ) : (
              <>
                <Text style={styles.editFieldLblDark}>{t('profile.bioPlaceholder')}</Text>
                <TextInput
                  value={draftBio}
                  onChangeText={setDraftBio}
                  style={styles.bioInput}
                  multiline
                  placeholderTextColor={Design.textSecondary}
                />
              </>
            )}
            <View style={styles.bioSep} />
            <View style={styles.memberRow}>
              <Ionicons name="calendar-outline" size={16} color={Design.textSecondary} />
              <Text style={styles.memberSinceInCard}>
                {t('profile.memberSince', { year: meCsv.memberSince })}
              </Text>
            </View>
            <View style={styles.editActionsRow}>
              {!editing ? (
                <Pressable onPress={openEdit} style={styles.editProfileBtn}>
                  <Ionicons name="pencil" size={16} color={GOLD} />
                  <Text style={styles.editProfileBtnTxt}>{t('profile.editProfile')}</Text>
                </Pressable>
              ) : (
                <View style={styles.saveCancelRow}>
                  <Pressable onPress={cancelEdit} style={styles.secondaryBtn}>
                    <Text style={styles.secondaryBtnTxt}>{t('profile.cancel')}</Text>
                  </Pressable>
                  <Pressable onPress={saveEdit} style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnTxt}>{t('profile.save')}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.badgesSectionTitle}>{t('profile.badgesSection')}</Text>
          <View style={styles.badgesWrap}>
            {visibleBadgeIds.map((id) => {
              const on = badges.includes(id);
              return (
                <Pressable
                  key={id}
                  onPress={() => toggleBadge(id)}
                  style={[styles.badgeChip, on && styles.badgeChipOn]}>
                  <Text style={[styles.badgeChipTxt, on && styles.badgeChipTxtOn]}>
                    {t(`profile.badgeLabels.${id}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, { color: GOLD }]}>{meCsv.reliabilityScore}</Text>
              <Text style={styles.statLbl}>{t('profile.statsReliability')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, { color: PURPLE }]}>{myUpcoming.length}</Text>
              <Text style={styles.statLbl}>{t('profile.statsUpcoming')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, { color: '#9CA3AF' }]}>0</Text>
              <Text style={styles.statLbl}>{t('profile.statsNoShows')}</Text>
            </View>
          </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
          style={{ marginBottom: 16 }}>
          <TabBtn
            label={t('profile.tabFavorites')}
            icon="heart"
            active={tab === 'favorites'}
            onPress={() => setTab('favorites')}
            badge={tabBadge('favorites')}
            badgeColor={PINK}
            underlineColor={PINK}
          />
          <TabBtn
            label={t('profile.tabFriends')}
            icon="people"
            active={tab === 'friends'}
            onPress={() => setTab('friends')}
            badge={tabBadge('friends')}
            badgeColor={PURPLE}
            underlineColor={PURPLE}
          />
          {isAdmin ? (
            <TabBtn
              label={t('profile.tabReports')}
              icon="warning"
              active={tab === 'reports'}
              onPress={() => setTab('reports')}
              badge={tabBadge('reports')}
              badgeColor="#EF4444"
              underlineColor="#EF4444"
            />
          ) : null}
          <TabBtn
            label={t('profile.tabPast')}
            icon="time"
            active={tab === 'history'}
            onPress={() => canSeePast && setTab('history')}
            badge={tabBadge('history')}
            badgeColor={GRAY_BADGE}
            underlineColor={GRAY_BADGE}
            locked={!canSeePast}
          />
          <TabBtn
            label={t('profile.tabSettings')}
            icon="settings-outline"
            active={tab === 'settings'}
            onPress={() => setTab('settings')}
            underlineColor="#9CA3AF"
          />
        </ScrollView>

        {tab === 'favorites' && (
          <View style={styles.listBlock}>
            {favoriteEvents.length === 0 ? (
              <EmptyHint icon="heart-outline" text={t('profile.emptyFavorites')} />
            ) : (
              favoriteEvents.map((e) => (
                <EventRow key={e.id} event={e} onPress={() => router.push(`/event/${e.id}`)} heart />
              ))
            )}
          </View>
        )}

        {tab === 'friends' && (
          <View style={styles.listBlock}>
            {visibleFriends.map((f) => (
              <Pressable
                key={f.profilId}
                onPress={() => router.push(`/profil/${f.profilId}`)}
                style={({ pressed }) => [styles.friendCard, pressed && { opacity: 0.85 }]}>
                <Image source={{ uri: f.imageUrl }} style={styles.friendAvatar} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.friendName}>{f.name}</Text>
                  <Text style={styles.friendSub} numberOfLines={2}>
                    {[
                      f.age != null ? `${f.age} ans` : null,
                      f.city,
                      t('profile.commonEvents', { count: f.eventsInCommon }),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <LinearGradient colors={['#6B21A8', PURPLE]} style={styles.voirBtn}>
                  <Text style={styles.voirTxt}>{t('profile.view')}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        )}

        {tab === 'reports' && isAdmin && (
          <View style={styles.listBlock}>
            <Text style={styles.reportsIntro}>{t('profile.reportsIntro')}</Text>
            {reports.length === 0 ? (
              <EmptyHint icon="warning-outline" text={t('profile.reportsEmpty')} />
            ) : (
              reports.map((r) => {
                const hidden = isProfileHidden(r.profileId);
                const when = new Date(r.createdAt).toLocaleString(i18n.language.startsWith('en') ? 'en' : 'fr', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                });
                return (
                  <View key={r.id} style={styles.reportCard}>
                    {r.imageUrl ? (
                      <Image source={{ uri: r.imageUrl }} style={styles.reportAvatar} contentFit="cover" />
                    ) : (
                      <View style={[styles.reportAvatar, styles.reportAvatarPh]}>
                        <Ionicons name="person" size={22} color={Design.textSecondary} />
                      </View>
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.reportName} numberOfLines={1}>
                        @{r.pseudo}
                      </Text>
                      <Text style={styles.reportMeta} numberOfLines={2}>
                        id {r.profileId} · {when}
                      </Text>
                      {hidden ? (
                        <Text style={styles.reportHiddenLbl}>{t('profile.reportsHiddenBadge')}</Text>
                      ) : null}
                    </View>
                    <Pressable
                      disabled={hidden}
                      onPress={() =>
                        Alert.alert(
                          t('profile.reportsHideConfirmTitle'),
                          t('profile.reportsHideConfirmBody'),
                          [
                            { text: t('profile.cancel'), style: 'cancel' },
                            {
                              text: t('profile.reportsHideConfirmOk'),
                              style: 'destructive',
                              onPress: () => hideProfileGlobally(r.profileId),
                            },
                          ],
                        )
                      }
                      style={({ pressed }) => [
                        styles.reportHideBtn,
                        hidden && { opacity: 0.4 },
                        pressed && !hidden && { opacity: 0.85 },
                      ]}>
                      <Ionicons name="eye-off-outline" size={18} color="#fff" />
                      <Text style={styles.reportHideBtnTxt}>{t('profile.reportsHideCta')}</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
        )}

        {tab === 'history' && (
          <View style={styles.listBlock}>
            {!canSeePast ? (
              <View style={styles.lockedBox}>
                <Ionicons name="lock-closed" size={28} color={GOLD} />
                <Text style={styles.lockedTitle}>{t('profile.premiumExclusiveTitle')}</Text>
                <Text style={styles.lockedSub}>{t('profile.premiumExclusiveBody')}</Text>
              </View>
            ) : historyEvents.length === 0 ? (
              <EmptyHint icon="time-outline" text="Aucun historique" />
            ) : (
              historyEvents.map((e) => (
                <EventRow
                  key={e.id}
                  event={e}
                  onPress={() => router.push(`/event/${e.id}`)}
                  showHistoryBadge
                  todayDateKey={today}
                />
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
                    title={t('profile.premiumOnTitle')}
                    subtitle={t('profile.premiumOnSubtitle')}
                    switchOn={isPremium}
                  />
                </LinearGradient>
              ) : (
                <View style={[styles.bigCardInner, { backgroundColor: CARD }]}>
                  <SettingsCardInner
                    icon="star-outline"
                    title={t('profile.freeModeTitle')}
                    subtitle={t('profile.freeModeSubtitle')}
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
                    title={t('profile.adminTitle')}
                    subtitle={t('profile.adminOnSubtitle')}
                    switchOn={isAdmin}
                    light
                  />
                </LinearGradient>
              ) : (
                <View style={[styles.bigCardInner, { backgroundColor: CARD }]}>
                  <SettingsCardInner
                    icon="shield-outline"
                    title={t('profile.adminTitle')}
                    subtitle={t('profile.adminOffSubtitle')}
                    switchOn={isAdmin}
                  />
                </View>
              )}
            </Pressable>

            <View style={[styles.bigCard, { backgroundColor: CARD }]}>
              <View style={[styles.bigCardInner, styles.langCardRow]}>
                <View style={styles.globeBox}>
                  <Ionicons name="globe-outline" size={24} color="#0284C7" />
                </View>
                <View style={styles.langTexts}>
                  <Text style={styles.langTitle}>{t('profile.language')}</Text>
                  <Text style={styles.langSub}>
                    {!langEn ? t('profile.langFr') : t('profile.langEn')}
                  </Text>
                </View>
                <View style={styles.langToggleRow}>
                  <Text style={[styles.langToggleLbl, !langEn && styles.langToggleLblActive]}>FR</Text>
                  <Switch
                    accessibilityLabel={t('profile.language')}
                    value={langEn}
                    onValueChange={(useEn) => {
                      setLangEn(useEn);
                      void i18n.changeLanguage(useEn ? 'en' : 'fr');
                    }}
                    trackColor={{ false: '#3A3A3C', true: '#0284C7' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#3A3A3C"
                  />
                  <Text style={[styles.langToggleLbl, langEn && styles.langToggleLblActive]}>EN</Text>
                </View>
              </View>
            </View>

            <View style={[styles.bigCard, { backgroundColor: CARD }]}>
              <View style={[styles.bigCardInner, styles.langCardRow]}>
                <View style={styles.globeBox}>
                  <Ionicons name="clipboard-outline" size={24} color="#A78BFA" />
                </View>
                <View style={styles.langTexts}>
                  <Text style={styles.langTitle}>{t('profile.questionnaireToggleTitle')}</Text>
                  <Text style={styles.langSub}>{t('profile.questionnaireToggleSub')}</Text>
                </View>
                <Switch
                  accessibilityLabel={t('profile.questionnaireToggleTitle')}
                  value={hideDailyQuestionnaire}
                  onValueChange={setHideDailyQuestionnaire}
                  trackColor={{ false: '#3A3A3C', true: '#7C3AED' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#3A3A3C"
                />
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{t('profile.sectionParams')}</Text>
              <Row label={t('profile.maxParticipantsRow')} value={String(limits.maxParticipants)} />
              <Row label={t('profile.maxRegistrationsRow')} value={String(limits.maxRegistrations)} />
              <Row label={t('profile.maxFavoritesRow')} value={String(limits.maxFavorites)} />
              <Row
                label={t('profile.maxActiveEventsRow')}
                value={limits.maxActiveEvents >= 999 ? '∞' : String(limits.maxActiveEvents)}
                last
              />
            </View>

            <View style={styles.sectionCard}>
              <Text style={[styles.sectionTitle, !isPremium && { color: '#F87171' }]}>
                {!isPremium
                  ? t('profile.restrictionsFreeTitle')
                  : t('profile.restrictionsControlTitle')}
              </Text>
              {RESTRICTION_ORDER.map((rowKey, i) => {
                return (
                  <View
                    key={rowKey}
                    style={[
                      styles.restrictionRow,
                      i < RESTRICTION_ORDER.length - 1 && styles.restrictionBorder,
                    ]}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={styles.restTitle}>
                        {t(`profile.restrictions.${rowKey}.title` as const)}
                      </Text>
                      <Text style={styles.restSub}>
                        {t(`profile.restrictions.${rowKey}.subtitle` as const)}
                      </Text>
                    </View>
                    <Switch
                      value={isPremium ? restrictions[rowKey] : true}
                      onValueChange={() => {
                        if (isPremium) toggleRestriction(rowKey);
                      }}
                      disabled={!isPremium}
                      trackColor={
                        !isPremium
                          ? {
                              false: SWITCH_RESTRICTION_DISABLED_TRACK,
                              true: SWITCH_RESTRICTION_DISABLED_TRACK,
                            }
                          : restrictions[rowKey]
                            ? {
                                false: SWITCH_RESTRICTION_OFF_TRACK,
                                true: SWITCH_RESTRICTION_ON_TRACK,
                              }
                            : {
                                false: SWITCH_RESTRICTION_OFF_TRACK,
                                true: SWITCH_RESTRICTION_OFF_TRACK,
                              }
                      }
                      thumbColor={
                        !isPremium || !restrictions[rowKey]
                          ? SWITCH_RESTRICTION_THUMB_OFF_OR_DISABLED
                          : SWITCH_RESTRICTION_THUMB_ON
                      }
                      ios_backgroundColor={
                        !isPremium
                          ? SWITCH_RESTRICTION_DISABLED_TRACK
                          : SWITCH_RESTRICTION_OFF_TRACK
                      }
                    />
                  </View>
                );
              })}
            </View>

            <Pressable onPress={resetToCsvDefaults} style={styles.resetBtn}>
              <Ionicons name="refresh" size={18} color="#EF4444" />
              <Text style={styles.resetTxt}>{t('profile.resetSettings')}</Text>
            </Pressable>

            {isAdmin && (
              <Pressable
                onPress={() => {
                  cleanData();
                  Alert.alert('Succès', 'Les données ont été nettoyées et vérifiées avec succès !');
                }}
                style={[styles.resetBtn, { backgroundColor: 'rgba(79, 70, 229, 0.1)', borderColor: '#4F46E5', marginTop: 12 }]}>
                <Ionicons name="color-wand" size={18} color="#4F46E5" />
                <Text style={[styles.resetTxt, { color: '#4F46E5' }]}>Nettoyer les données (Admin)</Text>
              </Pressable>
            )}

            <Text style={styles.autoSave}>{t('profile.sessionNote')}</Text>
          </View>
        )}
        </View>
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
  participatedLabel,
  showHistoryBadge,
  todayDateKey,
}: {
  event: Event;
  onPress: () => void;
  heart?: boolean;
  participated?: boolean;
  participatedLabel?: string;
  showHistoryBadge?: boolean;
  todayDateKey?: string;
}) {
  const isUpcoming = todayDateKey ? event.dateKey >= todayDateKey : false;
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
          {participated && participatedLabel && (
            <Text style={{ color: '#34D399' }}> • ✓ {participatedLabel}</Text>
          )}
        </Text>
      </View>
      {showHistoryBadge && (
        <View style={[styles.historyBadge, isUpcoming ? styles.historyBadgeActive : styles.historyBadgePast]}>
          <Text style={styles.historyBadgeTxt}>{isUpcoming ? 'En cours' : 'Passé'}</Text>
        </View>
      )}
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
  },
  heroTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    zIndex: 2,
  },
  heroIconBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  heroBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 14,
    zIndex: 1,
  },
  heroName: {
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
  verifiedTxt: { color: '#fff', fontSize: 14, fontWeight: '600' },
  editFieldLblLight: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroEditInput: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.35)',
    color: '#fff',
    paddingVertical: 6,
    fontSize: 18,
    fontWeight: '700',
  },
  contentPad: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  bioCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  bioText: {
    color: Design.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
  bioSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginVertical: 14,
  },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberSinceInCard: { color: Design.textSecondary, fontSize: 13 },
  editActionsRow: { marginTop: 14 },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editProfileBtnTxt: { color: GOLD, fontWeight: '700', fontSize: 15 },
  editFieldLblDark: {
    color: Design.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  bioInput: {
    color: Design.textPrimary,
    minHeight: 88,
    textAlignVertical: 'top',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  saveCancelRow: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  secondaryBtnTxt: { color: Design.textPrimary, fontWeight: '700' },
  primaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: PURPLE,
    alignItems: 'center',
  },
  primaryBtnTxt: { color: '#fff', fontWeight: '800' },
  badgesSectionTitle: {
    color: Design.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  badgeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  badgeChipOn: {
    borderColor: PURPLE,
    backgroundColor: 'rgba(139, 92, 246, 0.22)',
  },
  badgeChipTxt: {
    color: Design.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  badgeChipTxtOn: {
    color: GOLD,
    fontWeight: '700',
  },
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
  reportsIntro: {
    color: Design.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  reportAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  reportAvatarPh: {
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportName: {
    color: Design.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  reportMeta: {
    color: Design.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  reportHiddenLbl: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  reportHideBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#B91C1C',
    maxWidth: 104,
  },
  reportHideBtnTxt: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
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
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  historyBadgeActive: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
  },
  historyBadgePast: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  historyBadgeTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
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
  langCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langTexts: {
    flex: 1,
    minWidth: 0,
  },
  langTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  langSub: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    marginTop: 2,
  },
  langToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langToggleLbl: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'center',
  },
  langToggleLblActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
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
