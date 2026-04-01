import { Design } from '@/constants/design';
import { useMessaging } from '@/context/MessagingContext';
import type { GroupMember } from '@/types/messaging';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SLIDE_MS = 320;
const FADE_MS = 280;

function panelSlideOffsetPx() {
  const w = Dimensions.get('window').width;
  return Math.min(w * 0.68, 280);
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Amis invitables (mock) — hors membres déjà dans le groupe */
const INVITABLE_FRIENDS: {
  id: string;
  displayName: string;
  avatarGradient: readonly [string, string];
}[] = [
  { id: 'inv-maya', displayName: 'Maya', avatarGradient: ['#EC407A', '#AB47BC'] },
  { id: 'inv-kat', displayName: 'Kat', avatarGradient: ['#5C6BC0', '#3949AB'] },
  { id: 'inv-stacey', displayName: 'Stacey', avatarGradient: ['#FFA726', '#F57C00'] },
  { id: 'inv-lily', displayName: 'Lily', avatarGradient: ['#66BB6A', '#43A047'] },
  { id: 'inv-thomas', displayName: 'Thomas', avatarGradient: ['#78909C', '#546E7A'] },
  { id: 'inv-nina', displayName: 'Nina', avatarGradient: ['#AB47BC', '#7E57C2'] },
  { id: 'inv-alex', displayName: 'Alex', avatarGradient: ['#26C6DA', '#00838F'] },
];

function MemberAvatar({ member }: { member: GroupMember }) {
  return (
    <LinearGradient
      colors={[...member.avatarGradient]}
      style={styles.memberAvatar}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}>
      <Text style={styles.memberAvatarLetter}>{member.displayName.slice(0, 1)}</Text>
    </LinearGradient>
  );
}

function SettingsToggle({ value }: { value: boolean }) {
  return (
    <View style={[styles.toggleTrack, value && styles.toggleTrackOn]} pointerEvents="none">
      <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
    </View>
  );
}

export default function ParametresDiscussionGroupeScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const conversationId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(panelSlideOffsetPx())).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const allowRemoveRef = useRef(false);
  const [inviteSectionOpen, setInviteSectionOpen] = useState(false);

  const {
    getConversation,
    getGroupMembers,
    getGroupSettings,
    setGroupSettings,
    removeGroupMember,
    addGroupMemberInvite,
    demoSimulateIncomingMessage,
    leaveGroup,
  } = useMessaging();

  const conversation = conversationId ? getConversation(conversationId) : undefined;
  const settings = conversationId
    ? getGroupSettings(conversationId)
    : { muteSounds: false, blockNotifications: false, memberBellMuted: {} as Record<string, boolean> };

  const isGroup = conversation?.type === 'group';
  const members = useMemo((): GroupMember[] => {
    if (!conversationId || !conversation) return [];
    if (conversation.type === 'direct') {
      return [
        {
          id: `${conversationId}-peer`,
          displayName: conversation.title,
          isSelf: false,
          avatarGradient: conversation.avatarGradient,
        },
        {
          id: `${conversationId}-me`,
          displayName: 'Moi',
          isSelf: true,
          avatarGradient: ['#78909C', '#546E7A'],
        },
      ];
    }
    return getGroupMembers(conversationId);
  }, [conversation, conversationId, getGroupMembers]);

  const count = members.length;
  const isValidScreen = Boolean(conversationId && conversation);

  const takenNames = useMemo(() => new Set(members.map((m) => m.displayName)), [members]);
  const friendsToShow = useMemo(
    () => INVITABLE_FRIENDS.filter((f) => !takenNames.has(f.displayName)),
    [takenNames],
  );

  const toggleInviteSection = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setInviteSectionOpen((v) => !v);
  }, []);

  const onPickFriend = useCallback(
    (friend: (typeof INVITABLE_FRIENDS)[number]) => {
      if (!conversationId) return;
      addGroupMemberInvite(conversationId, {
        displayName: friend.displayName,
        avatarGradient: friend.avatarGradient,
      });
    },
    [conversationId, addGroupMemberInvite],
  );

  const openMemberProfile = useCallback(
    (m: GroupMember) => {
      if (m.profilId) {
        router.push(`/profil/${m.profilId}`);
        return;
      }
      router.push({
        pathname: '/profil/[id]',
        params: {
          id: 'external',
          fn: m.displayName,
          g0: m.avatarGradient[0],
          g1: m.avatarGradient[1],
          seed: m.id,
        },
      });
    },
    [router],
  );

  const runExitAnimation = useCallback(
    (onDone: () => void) => {
      const off = panelSlideOffsetPx();
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: off,
          duration: SLIDE_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: FADE_MS,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onDone();
      });
    },
    [fadeAnim, slideAnim],
  );

  /** Après « Quitter la conversation » : retour liste Messages (dépile `parametres` + `chat/[id]`). */
  const navigateToChatTabAfterLeave = useCallback(() => {
    allowRemoveRef.current = true;
    router.dismissTo('/(tabs)/chat');
  }, [router]);

  /** Fermeture du panneau : un seul `back` pour rester sur la discussion ouverte. */
  const closeSettingsOnly = useCallback(() => {
    if (allowRemoveRef.current) {
      router.back();
      return;
    }
    allowRemoveRef.current = true;
    runExitAnimation(() => router.back());
  }, [runExitAnimation, router]);

  const close = closeSettingsOnly;

  useEffect(() => {
    if (!isValidScreen) return;
    slideAnim.setValue(panelSlideOffsetPx());
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: SLIDE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: FADE_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [isValidScreen, fadeAnim, slideAnim]);

  useEffect(() => {
    if (!isValidScreen) return;
    const sub = navigation.addListener('beforeRemove', (e) => {
      if (allowRemoveRef.current) return;
      e.preventDefault();
      allowRemoveRef.current = true;
      runExitAnimation(() => router.back());
    });
    return sub;
  }, [navigation, isValidScreen, runExitAnimation, router]);

  useEffect(() => {
    if (!isValidScreen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (allowRemoveRef.current) return false;
      close();
      return true;
    });
    return () => sub.remove();
  }, [isValidScreen, close]);

  const onLeave = () => {
    if (!conversationId || !conversation) return;
    const title = isGroup ? 'Quitter le groupe' : 'Quitter la conversation';
    const message = 'Vous ne recevrez plus les messages de cette discussion.';
    const run = () => {
      navigateToChatTabAfterLeave();
      leaveGroup(conversationId);
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
        run();
      }
      return;
    }
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Sortir', style: 'destructive', onPress: run },
    ]);
  };

  const onRemoveMember = (member: GroupMember) => {
    if (!conversationId || !isGroup || member.isSelf) return;
    const cid = conversationId;
    const run = () => removeGroupMember(cid, member.id);
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Retirer ${member.displayName} du groupe ?`)) {
        run();
      }
      return;
    }
    Alert.alert('Retirer le membre', `Retirer ${member.displayName} du groupe ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: run },
    ]);
  };

  if (!isValidScreen || !conversationId) {
    return null;
  }

  const cid = conversationId;

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.backdropWrap, { opacity: fadeAnim }]}>
        <Pressable style={styles.backdropPressable} onPress={close} accessibilityLabel="Fermer" />
      </Animated.View>
      <Animated.View
        style={[
          styles.panelOuter,
          {
            paddingBottom: Math.max(insets.bottom, 16),
            transform: [{ translateX: slideAnim }],
          },
        ]}>
        <View style={styles.panel}>
          <View style={[styles.panelHeader, { paddingTop: insets.top + 12 }]}>
            <Text style={styles.panelTitleSmall}>PARAMÈTRES DE DISCUSSION</Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
          <Pressable
            style={styles.toggleRow}
            onPress={() => setGroupSettings(cid, { muteSounds: !settings.muteSounds })}
            accessibilityRole="switch"
            accessibilityState={{ checked: settings.muteSounds }}
            accessibilityLabel="Couper les sons">
            <Ionicons
              name={settings.muteSounds ? 'volume-mute-outline' : 'volume-high-outline'}
              size={22}
              color={Design.textSecondary}
            />
            <Text style={styles.toggleLabel}>Couper les sons</Text>
            <SettingsToggle value={settings.muteSounds} />
          </Pressable>
          <Pressable
            style={styles.toggleRow}
            onPress={() => setGroupSettings(cid, { blockNotifications: !settings.blockNotifications })}
            accessibilityRole="switch"
            accessibilityState={{ checked: settings.blockNotifications }}
            accessibilityLabel="Bloquer les notifications">
            <Ionicons
              name={settings.blockNotifications ? 'notifications-off-outline' : 'notifications-outline'}
              size={22}
              color={Design.textSecondary}
            />
            <Text style={styles.toggleLabel}>Bloquer les notifications</Text>
            <SettingsToggle value={settings.blockNotifications} />
          </Pressable>

          <Pressable
            onPress={() => demoSimulateIncomingMessage(cid)}
            style={styles.demoTestRow}
            accessibilityLabel="Simuler un message entrant pour tester son et notifications"
            accessibilityRole="button">
            <Ionicons name="flask-outline" size={18} color="#8E8E93" />
            <Text style={styles.demoTestText}>Simuler un message entrant (test)</Text>
          </Pressable>

          <View style={styles.membersHeader}>
            <Text style={styles.membersTitle}>MEMBRES ({count})</Text>
            {isGroup ? (
              <Pressable
                onPress={toggleInviteSection}
                style={styles.addMemberBtn}
                hitSlop={8}
                accessibilityLabel={
                  inviteSectionOpen ? 'Replier la liste d’amis' : 'Déplier pour inviter des amis'
                }
                accessibilityRole="button">
                <Ionicons name="person-add-outline" size={18} color="#7C9EFF" />
                <Text style={styles.addMemberText}>+ un membre</Text>
                <Ionicons
                  name={inviteSectionOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#7C9EFF"
                  style={styles.addMemberChevron}
                />
              </Pressable>
            ) : null}
          </View>

          {isGroup && inviteSectionOpen ? (
            <View style={styles.inviteBlock}>
              <Text style={styles.inviteBlockTitle}>Inviter un ami</Text>
              {friendsToShow.length === 0 ? (
                <Text style={styles.inviteEmpty}>Tous vos amis sont déjà dans le groupe.</Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.friendsScrollContent}
                  keyboardShouldPersistTaps="handled">
                  {friendsToShow.map((friend) => (
                    <Pressable
                      key={friend.id}
                      onPress={() => onPickFriend(friend)}
                      style={({ pressed }) => [styles.friendChip, pressed && { opacity: 0.85 }]}
                      accessibilityLabel={`Inviter ${friend.displayName}`}
                      accessibilityRole="button">
                      <LinearGradient
                        colors={[...friend.avatarGradient]}
                        style={styles.friendAvatar}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}>
                        <Text style={styles.friendAvatarLetter}>{friend.displayName.slice(0, 1)}</Text>
                      </LinearGradient>
                      <Text style={styles.friendName} numberOfLines={1}>
                        {friend.displayName}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : null}

          {members.map((m) => (
            <View key={m.id} style={styles.memberRow}>
              <Pressable
                style={styles.memberRowPressable}
                onPress={() => openMemberProfile(m)}
                accessibilityRole="button"
                accessibilityLabel={`Profil de ${m.displayName}`}>
                <MemberAvatar member={m} />
                <Text style={styles.memberName} numberOfLines={1}>
                  {m.displayName}
                </Text>
              </Pressable>
              {!m.isSelf ? (
                <View style={styles.memberActions}>
                  <Pressable
                    hitSlop={12}
                    style={styles.memberIconBtn}
                    onPress={() => {
                      const muted = settings.memberBellMuted?.[m.id] ?? false;
                      setGroupSettings(cid, {
                        memberBellMuted: { ...settings.memberBellMuted, [m.id]: !muted },
                      });
                    }}
                    accessibilityLabel={
                      (settings.memberBellMuted?.[m.id] ?? false)
                        ? `Réactiver les alertes pour ${m.displayName}`
                        : `Couper les alertes pour ${m.displayName}`
                    }>
                    <Ionicons
                      name={
                        (settings.memberBellMuted?.[m.id] ?? false)
                          ? 'notifications-off-outline'
                          : 'notifications-outline'
                      }
                      size={20}
                      color={Design.textSecondary}
                    />
                  </Pressable>
                  {isGroup ? (
                    <Pressable
                      hitSlop={12}
                      onPress={() => onRemoveMember(m)}
                      style={styles.memberIconBtn}
                      accessibilityLabel={`Retirer ${m.displayName}`}>
                      <Ionicons name="person-remove-outline" size={22} color="#FF453A" />
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))}

          <View style={styles.divider} />

          <Pressable onPress={onLeave} style={styles.leaveRow}>
            <Ionicons name="log-out-outline" size={22} color="#FF453A" />
            <Text style={styles.leaveText}>
              {isGroup ? 'Sortir du groupe' : 'Quitter la conversation'}
            </Text>
          </Pressable>
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backdropWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  backdropPressable: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  panelOuter: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '68%',
    maxWidth: 280,
    zIndex: 1,
  },
  panel: {
    flex: 1,
    backgroundColor: '#2c2c2e',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    overflow: 'hidden',
  },
  panelHeader: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  panelTitleSmall: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#3a3a3c',
  },
  toggleLabel: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  toggleTrack: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3a3a3c',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#48484a',
    padding: 2,
    justifyContent: 'center',
  },
  toggleTrackOn: {
    backgroundColor: '#34C759',
    borderColor: '#2fb350',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    marginLeft: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  toggleThumbOn: {
    marginLeft: 18,
  },
  demoTestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#3a3a3c',
  },
  demoTestText: {
    flex: 1,
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '500',
  },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
    gap: 8,
  },
  membersTitle: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  addMemberText: {
    color: '#7C9EFF',
    fontSize: 14,
    fontWeight: '600',
  },
  addMemberChevron: {
    marginLeft: 2,
  },
  inviteBlock: {
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#3a3a3c',
  },
  inviteBlockTitle: {
    color: '#AEAEB2',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  inviteEmpty: {
    color: '#8E8E93',
    fontSize: 13,
    fontStyle: 'italic',
  },
  friendsScrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 8,
  },
  friendChip: {
    alignItems: 'center',
    width: 64,
    marginRight: 14,
  },
  friendAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  friendAvatarLetter: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  friendName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 64,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  memberRowPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarLetter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  memberName: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    minWidth: 0,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 10,
  },
  memberIconBtn: {
    padding: 6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#3a3a3c',
    marginVertical: 16,
  },
  leaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  leaveText: {
    color: '#FF453A',
    fontSize: 16,
    fontWeight: '600',
  },
});
