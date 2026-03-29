import { Design } from '@/constants/design';
import { useMessaging } from '@/context/MessagingContext';
import type { Conversation, Message, MessageMediaAttachment } from '@/types/messaging';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  Alert,
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

const BUBBLE_MEDIA_W = 220;

function MessageBubble({
  message,
  showAuthor,
}: {
  message: Message;
  showAuthor: boolean;
}) {
  const own = message.isOwn;
  const time = formatMessageClock(message.sentAt);
  const hasMedia = Boolean(message.mediaUri && message.mediaKind);
  const bodyText = message.text.trim();

  return (
    <View style={[styles.bubbleWrap, own ? styles.bubbleWrapOwn : styles.bubbleWrapOther]}>
      {!own && showAuthor && message.authorName ? (
        <Text style={styles.author}>{message.authorName}</Text>
      ) : null}
      <View style={[styles.bubble, own ? styles.bubbleOwn : styles.bubbleOther]}>
        {hasMedia && message.mediaUri && message.mediaKind === 'image' ? (
          <Image
            source={{ uri: message.mediaUri }}
            style={styles.bubbleImage}
            contentFit="cover"
            accessibilityLabel="Image jointe"
          />
        ) : null}
        {hasMedia && message.mediaUri && message.mediaKind === 'video' ? (
          <Video
            source={{ uri: message.mediaUri }}
            style={styles.bubbleVideo}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            isLooping={false}
          />
        ) : null}
        {bodyText ? (
          <Text style={[styles.bubbleMsg, own ? styles.bubbleMsgOwn : styles.bubbleMsgOther]}>{bodyText}</Text>
        ) : null}
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

  const {
    getConversation,
    messagesByConversation,
    sendMessage,
    markConversationRead,
    canViewGroupMessages,
  } = useMessaging();
  const conversation = id ? getConversation(id) : undefined;
  const messages = id ? messagesByConversation[id] ?? [] : [];

  const [draft, setDraft] = useState('');
  const [pendingMedia, setPendingMedia] = useState<MessageMediaAttachment | null>(null);
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
                  pathname: '/event/new',
                  params: { conversationId: id },
                })
              }
              hitSlop={8}
              style={styles.headerEventBtn}
              accessibilityLabel="Create a new event"
              accessibilityRole="button"
              accessibilityHint="Opens the form to propose an event in this chat">
              <Ionicons name="calendar-outline" size={18} color="#FF4B6E" />
              <Text style={styles.headerEventLabel}>+ Event</Text>
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

  const pickFromLibrary = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Accès à la médiathèque',
        'Autorisez l’accès aux photos dans les réglages pour joindre une image ou une vidéo.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: false,
      quality: 0.85,
      videoMaxDuration: 180,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const kind: MessageMediaAttachment['kind'] = asset.type === 'video' ? 'video' : 'image';
    setPendingMedia({ uri: asset.uri, kind });
  }, []);

  const onSend = () => {
    if (!id) return;
    if (!draft.trim() && !pendingMedia) return;
    sendMessage(id, draft, pendingMedia ?? undefined);
    setDraft('');
    setPendingMedia(null);
  };

  const canSend = Boolean(draft.trim() || pendingMedia);

  if (!id || !conversation) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.muted}>Conversation introuvable.</Text>
      </View>
    );
  }

  const canViewMessages =
    conversation.type !== 'group' || canViewGroupMessages(id);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {canViewMessages ? (
        <>
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
          {pendingMedia ? (
            <View style={styles.pendingMediaBar}>
              {pendingMedia.kind === 'image' ? (
                <Image
                  source={{ uri: pendingMedia.uri }}
                  style={styles.pendingThumb}
                  contentFit="cover"
                  accessibilityLabel="Aperçu du média à envoyer"
                />
              ) : (
                <View style={styles.pendingVideoBadge}>
                  <Ionicons name="videocam" size={26} color="#FF4B6E" />
                </View>
              )}
              <Pressable
                onPress={() => setPendingMedia(null)}
                hitSlop={10}
                style={styles.pendingClear}
                accessibilityLabel="Retirer le média"
                accessibilityRole="button">
                <Ionicons name="close-circle" size={26} color={Design.textSecondary} />
              </Pressable>
            </View>
          ) : null}
          <View
            style={[
              styles.inputRow,
              {
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}>
            <Pressable
              onPress={pickFromLibrary}
              style={styles.attachBtn}
              accessibilityLabel="Joindre une photo ou une vidéo"
              accessibilityRole="button">
              <Ionicons name="image-outline" size={24} color={Design.textPrimary} />
            </Pressable>
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
              disabled={!canSend}
              style={[styles.sendCircle, !canSend && styles.sendCircleDisabled]}>
              <Ionicons name="send" size={18} color={canSend ? '#fff' : '#6C6C70'} />
            </Pressable>
          </View>
        </>
      ) : (
        <View style={[styles.lockPane, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <Ionicons name="lock-closed-outline" size={52} color={Design.textSecondary} />
          <Text style={styles.lockTitle}>Messages masqués</Text>
          <Text style={styles.lockBody}>
            Pour lire cette discussion de groupe, au moins un membre (hors vous) doit être dans vos amis.
            Invitez un ami depuis les paramètres du groupe.
          </Text>
          <Pressable
            onPress={() => router.push(`/chat/${id}/parametres`)}
            style={styles.lockCta}
            accessibilityRole="button"
            accessibilityLabel="Ouvrir les paramètres du groupe">
            <Text style={styles.lockCtaText}>Paramètres du groupe</Text>
            <Ionicons name="chevron-forward" size={20} color="#FF4B6E" />
          </Pressable>
        </View>
      )}
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
  lockPane: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  lockTitle: {
    color: Design.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  lockBody: {
    color: Design.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
  lockCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#1C1C1E',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#333',
  },
  lockCtaText: {
    color: Design.textPrimary,
    fontSize: 16,
    fontWeight: '600',
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
  headerEventBtn: {
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
  headerEventLabel: {
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
  bubbleImage: {
    width: BUBBLE_MEDIA_W,
    height: 148,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#000',
  },
  bubbleVideo: {
    width: BUBBLE_MEDIA_W,
    height: 168,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#000',
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
  pendingMediaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 10,
    backgroundColor: Design.bg,
  },
  pendingThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#1C1C1E',
  },
  pendingVideoBadge: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#333',
  },
  pendingClear: {
    marginLeft: 'auto',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: Design.bg,
    gap: 8,
  },
  attachBtn: {
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
