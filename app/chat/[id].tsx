import { IconSymbol } from '@/components/ui/icon-symbol';
import { useMessaging } from '@/context/MessagingContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Message } from '@/types/messaging';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useLayoutEffect, useRef, useState } from 'react';
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

function MessageBubble({ message, showAuthor }: { message: Message; showAuthor: boolean }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const own = message.isOwn;

  return (
    <View style={[styles.bubbleWrap, own ? styles.bubbleWrapOwn : styles.bubbleWrapOther]}>
      {!own && showAuthor && message.authorName ? (
        <Text style={[styles.author, { color: colors.icon }]}>{message.authorName}</Text>
      ) : null}
      <View
        style={[
          styles.bubble,
          own
            ? { backgroundColor: Colors.light.tint }
            : {
                backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#e9e9eb',
              },
        ]}>
        <Text style={[styles.bubbleText, { color: own ? '#fff' : colors.text }]}>{message.text}</Text>
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
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const { getConversation, messagesByConversation, sendMessage } = useMessaging();
  const conversation = id ? getConversation(id) : undefined;
  const messages = id ? messagesByConversation[id] ?? [] : [];

  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: conversation?.title ?? 'Discussion',
      headerRight: () =>
        id ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/sortie/nouvelle',
                params: { conversationId: id },
              })
            }
            hitSlop={12}
            style={styles.headerBtn}>
            <IconSymbol name="plus.circle.fill" size={26} color={colors.tint} />
          </Pressable>
        ) : null,
    });
  }, [conversation?.title, navigation, id, router, colors.tint]);

  const onSend = () => {
    if (!id) return;
    sendMessage(id, draft);
    setDraft('');
  };

  if (!id || !conversation) {
    return (
      <View style={[styles.fallback, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.icon }}>Conversation introuvable.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 12,
          flexGrow: 1,
        }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item, index }) => {
          const prev = index > 0 ? messages[index - 1] : undefined;
          const showAuthor =
            conversation.type === 'group' && !item.isOwn && (!prev || prev.isOwn || prev.authorName !== item.authorName);
          return <MessageBubble message={item} showAuthor={showAuthor} />;
        }}
      />
      <View
        style={[
          styles.inputRow,
          {
            borderTopColor: colorScheme === 'dark' ? '#3a3a3c' : '#c6c6c8',
            backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : colors.background,
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Message…"
          placeholderTextColor={colors.icon}
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f2f2f7',
            },
          ]}
          multiline
          maxLength={2000}
        />
        <Pressable
          onPress={onSend}
          disabled={!draft.trim()}
          style={[styles.sendBtn, { opacity: draft.trim() ? 1 : 0.4 }]}>
          <IconSymbol name="paperplane.fill" size={22} color={colors.tint} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtn: {
    marginRight: 4,
    padding: 4,
  },
  bubbleWrap: {
    marginBottom: 10,
    maxWidth: '88%',
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
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
  },
  sendBtn: {
    padding: 10,
    marginBottom: 2,
  },
});
