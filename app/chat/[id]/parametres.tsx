import { Design } from '@/constants/design';
import { useMessaging } from '@/context/MessagingContext';
import type { GroupMember } from '@/types/messaging';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SLIDE_MS = 320;
const FADE_MS = 280;

function panelSlideOffsetPx() {
  const w = Dimensions.get('window').width;
  return Math.min(w * 0.68, 280);
}

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

export default function ParametresDiscussionGroupeScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const conversationId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(panelSlideOffsetPx())).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const allowRemoveRef = useRef(false);

  const {
    getConversation,
    getGroupMembers,
    getGroupSettings,
    setGroupSettings,
    removeGroupMember,
    addGroupMember,
    leaveGroup,
  } = useMessaging();

  const conversation = conversationId ? getConversation(conversationId) : undefined;
  const settings = conversationId ? getGroupSettings(conversationId) : { muteSounds: false, blockNotifications: false };

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

  const close = useCallback(() => {
    if (allowRemoveRef.current) {
      router.back();
      return;
    }
    allowRemoveRef.current = true;
    runExitAnimation(() => router.back());
  }, [router, runExitAnimation]);

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
      runExitAnimation(() => {
        navigation.dispatch(e.data.action);
      });
    });
    return sub;
  }, [navigation, isValidScreen, runExitAnimation]);

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
    Alert.alert(
      title,
      'Vous ne recevrez plus les messages de cette discussion.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Sortir',
          style: 'destructive',
          onPress: () => {
            leaveGroup(conversationId);
            router.replace('/(tabs)/chat');
          },
        },
      ],
    );
  };

  const onRemoveMember = (member: GroupMember) => {
    if (!conversationId || !isGroup || member.isSelf) return;
    Alert.alert('Retirer le membre', `Retirer ${member.displayName} du groupe ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: () => removeGroupMember(conversationId, member.id),
      },
    ]);
  };

  if (!isValidScreen) {
    return null;
  }

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
          <View style={styles.toggleRow}>
            <Ionicons name="volume-high-outline" size={22} color={Design.textSecondary} />
            <Text style={styles.toggleLabel}>Couper les sons</Text>
            <Switch
              value={settings.muteSounds}
              onValueChange={(v) => setGroupSettings(conversationId, { muteSounds: v })}
              trackColor={{ false: '#3a3a3c', true: '#34C759' }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.toggleRow}>
            <Ionicons name="notifications-outline" size={22} color={Design.textSecondary} />
            <Text style={styles.toggleLabel}>Bloquer les notifications</Text>
            <Switch
              value={settings.blockNotifications}
              onValueChange={(v) => setGroupSettings(conversationId, { blockNotifications: v })}
              trackColor={{ false: '#3a3a3c', true: '#34C759' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.membersHeader}>
            <Text style={styles.membersTitle}>MEMBRES ({count})</Text>
            {isGroup ? (
              <Pressable
                onPress={() => addGroupMember(conversationId!)}
                style={styles.addMemberBtn}
                hitSlop={8}
                accessibilityLabel="Ajouter un membre"
                accessibilityRole="button">
                <Ionicons name="person-add-outline" size={18} color="#7C9EFF" />
                <Text style={styles.addMemberText}>+ un membre</Text>
              </Pressable>
            ) : null}
          </View>

          {members.map((m) => (
            <View key={m.id} style={styles.memberRow}>
              <MemberAvatar member={m} />
              <Text style={styles.memberName} numberOfLines={1}>
                {m.displayName}
              </Text>
              {!m.isSelf ? (
                <View style={styles.memberActions}>
                  <Pressable hitSlop={10} style={styles.memberIconBtn}>
                    <Ionicons name="notifications-outline" size={20} color={Design.textSecondary} />
                  </Pressable>
                  {isGroup ? (
                    <Pressable hitSlop={10} onPress={() => onRemoveMember(m)} style={styles.memberIconBtn}>
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
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
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
  },
  memberIconBtn: {
    padding: 4,
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
