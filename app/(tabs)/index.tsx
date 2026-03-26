import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMessaging } from '@/context/MessagingContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Conversation } from '@/types/messaging';

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'À l’instant';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} j`;
}

function ConversationRow({ item }: { item: Conversation }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isGroup = item.type === 'group';

  return (
    <Link href={`/chat/${item.id}`} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.row,
          { borderBottomColor: colorScheme === 'dark' ? '#2c2c2e' : '#e5e5ea' },
          pressed && { opacity: 0.7 },
        ]}>
        <View style={[styles.avatar, { backgroundColor: colors.tint + '33' }]}>
          <Text style={[styles.avatarLetter, { color: colors.tint }]}>
            {isGroup ? '👥' : item.title.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.time, { color: colors.icon }]}>
              {formatRelativeTime(item.updatedAt)}
            </Text>
          </View>
          <View style={styles.rowBottom}>
            <Text style={[styles.badge, { color: colors.tint, backgroundColor: colors.tint + '22' }]}>
              {isGroup ? 'Groupe' : 'Perso'}
            </Text>
            <Text
              style={[styles.preview, { color: colors.icon }]}
              numberOfLines={1}>
              {item.lastMessagePreview}
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

export default function ConversationsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { conversations } = useMessaging();
  const insets = useSafeAreaInsets();

  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={sorted}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        ListHeaderComponent={
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            Discussions en groupe ou en message direct.
          </Text>
        }
        renderItem={({ item }) => <ConversationRow item={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  subtitle: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: '600',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  time: {
    fontSize: 13,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  preview: {
    flex: 1,
    fontSize: 15,
  },
});
