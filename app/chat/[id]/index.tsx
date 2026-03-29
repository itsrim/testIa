import { Design } from '@/constants/design';
import { useMessaging } from '@/context/MessagingContext';
import type { Conversation, Message } from '@/types/messaging';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatMessageClock(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function HeaderAvatar({ conversation }: { conversation: Conversation }) {
  const isGroup = conversation.type === 'group';
  if (isGroup) {
    return (
      <LinearGradient
        colors={[...conversation.avatarGradient]}
        style={styles.headerAvatar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        <View style={styles.headerAvatarGrid}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[styles.headerAvatarCell, { backgroundColor: `rgba(255,255,255,${0.2 + i * 0.08})` }]}
            />
          ))}
        </View>
      </LinearGradient>
    );
  }
  return (
    <LinearGradient
      colors={[...conversation.avatarGradient]}
      style={styles.headerAvatar}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}>
      <Text style={styles.headerAvatarLetter}>{conversation.title.slice(0, 1)}</Text>
    </LinearGradient>
  );
}

function MessageBubble({
  message,
  showAuthor,
}: {
  message: Message;
  showAuthor: boolean;
}) {
  const own = message.isOwn;
  const time = formatMessageClock(message.sentAt);

  return (
    <View style={[styles.bubbleWrap, own ? styles.bubbleWrapOwn : styles.bubbleWrapOther]}>
      {!own && showAuthor && message.authorName ? (
        <Text style={styles.author}>{message.authorName}</Text>
      ) : null}
      <View style={[styles.bubble, own ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={[styles.bubbleMsg, own ? styles.bubbleMsgOwn : styles.bubbleMsgOther]}>{message.text}</Text>
        <Text style={[styles.bubbleTime, own ? styles.bubbleTimeOwn : styles.bubbleTimeOther]}>{time}</Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { getConversation, messagesByConversation, sendMessage, markConversationRead } = useMessaging();
  const conversation = id ? getConversation(id) : undefined;
  const messages = id ? messagesByConversation[id] ?? [] : [];

  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

  useFocusEffect(
    useCallback(() => {
      if (id) markConversationRead(id);
    }, [id, markConversationRead]),
  );

  useLayoutEffect(() => {
    if (!conversation) return;

    const subtitle =
      conversation.type === 'group'
        ? `${conversation.memberCount ?? 3} membres`
        : 'Message direct';

    navigation.setOptions({
      headerStyle: {
        backgroundColor: '#0a0a0a',
      },
      headerShadowVisible: false,
      headerTintColor: Design.textPrimary,
      headerTitleAlign: 'center',
      /* Stack imbriqué : pas d’écran « précédent » dans ce stack → iOS masquait le retour. */
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.headerBackBtn}
          accessibilityLabel="Retour"
          accessibilityRole="button">
          <Ionicons name="chevron-back" size={28} color={Design.textPrimary} />
        </Pressable>
      ),
      headerTitle: () => (
        <View style={styles.headerTitleRow}>
          <HeaderAvatar conversation={conversation} />
          <View style={styles.headerTexts}>
            <Text style={styles.headerName} numberOfLines={1}>
              {conversation.title}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>
      ),
      headerRight: () =>
        id ? (
          <View style={styles.headerRightRow}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/sortie/nouvelle',
                  params: { conversationId: id },
                })
              }
              hitSlop={8}
              style={styles.headerSortieBtn}
              accessibilityLabel="Créer une nouvelle sortie"
              accessibilityRole="button"
              accessibilityHint="Ouvre le formulaire pour proposer une sortie à cette discussion">
              <Ionicons name="calendar-outline" size={18} color="#FF4B6E" />
              <Text style={styles.headerSortieLabel}>+ Sortie</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/chat/${id}/parametres`)}
              hitSlop={10}
              style={styles.headerIconBtn}
              accessibilityLabel="Paramètres de la discussion">
              <Ionicons name="settings-outline" size={24} color={Design.textPrimary} />
            </Pressable>
          </View>
        ) : null,
    });
  }, [conversation, navigation, id, router]);

  const onSend = () => {
    if (!id) return;
    sendMessage(id, draft);
    setDraft('');
  };

  if (!id || !conversation) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.muted}>Conversation introuvable.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 12,
          flexGrow: 1,
        }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item, index }) => {
          const prev = index > 0 ? messages[index - 1] : undefined;
          const showAuthor =
            conversation.type === 'group' &&
            !item.isOwn &&
            (!prev || prev.isOwn || prev.authorName !== item.authorName);
          return <MessageBubble message={item} showAuthor={showAuthor} />;
        }}
      />
      <View
        style={[
          styles.inputRow,
          {
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Écrivez un message…"
          placeholderTextColor="#6C6C70"
          style={styles.input}
          multiline
          maxLength={2000}
        />
        <Pressable
          onPress={onSend}
          disabled={!draft.trim()}
          style={[styles.sendCircle, !draft.trim() && styles.sendCircleDisabled]}>
          <Ionicons name="send" size={18} color={draft.trim() ? '#fff' : '#6C6C70'} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const BUBBLE_RADIUS = 18;
const BUBBLE_TAIL = 5;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Design.bg,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Design.bg,
  },
  muted: {
    color: Design.textSecondary,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 220,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerAvatarGrid: {
    width: 26,
    height: 26,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  headerAvatarCell: {
    width: 13,
    height: 13,
  },
  headerAvatarLetter: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerTexts: {
    marginLeft: 10,
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    color: Design.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: Design.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  headerBackBtn: {
    marginLeft: Platform.OS === 'ios' ? 4 : 0,
    paddingVertical: 4,
    paddingRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 4,
  },
  headerSortieBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#1c1c1e',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#333',
    maxWidth: 118,
  },
  headerSortieLabel: {
    color: Design.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerIconBtn: {
    padding: 4,
  },
  bubbleWrap: {
    marginBottom: 12,
    maxWidth: '86%',
  },
  bubbleWrapOwn: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubbleWrapOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  author: {
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 4,
    color: Design.textSecondary,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    minWidth: 56,
  },
  bubbleOwn: {
    backgroundColor: '#FF4B6E',
    borderTopLeftRadius: BUBBLE_RADIUS,
    borderTopRightRadius: BUBBLE_RADIUS,
    borderBottomLeftRadius: BUBBLE_RADIUS,
    borderBottomRightRadius: BUBBLE_TAIL,
  },
  bubbleOther: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: BUBBLE_RADIUS,
    borderTopRightRadius: BUBBLE_RADIUS,
    borderBottomRightRadius: BUBBLE_RADIUS,
    borderBottomLeftRadius: BUBBLE_TAIL,
  },
  bubbleMsg: {
    fontSize: 16,
    lineHeight: 21,
  },
  bubbleMsgOwn: {
    color: '#fff',
  },
  bubbleMsgOther: {
    color: '#fff',
  },
  bubbleTime: {
    fontSize: 11,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  bubbleTimeOwn: {
    color: 'rgba(255,255,255,0.75)',
  },
  bubbleTimeOther: {
    color: '#8E8E93',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: Design.bg,
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 11,
    fontSize: 16,
    color: Design.textPrimary,
    backgroundColor: '#1C1C1E',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#333',
  },
  sendCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#333',
  },
  sendCircleDisabled: {
    opacity: 0.55,
  },
});
