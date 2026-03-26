import { Link } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMessaging } from '@/context/MessagingContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Sortie } from '@/types/messaging';

function SortieRow({ item, conversationTitle }: { item: Sortie; conversationTitle: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f2f2f7',
          borderColor: colorScheme === 'dark' ? '#3a3a3c' : '#e5e5ea',
        },
      ]}>
      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={[styles.cardMeta, { color: colors.icon }]}>
        {item.dateLabel} · {item.location}
      </Text>
      <Text style={[styles.cardConv, { color: colors.tint }]}>
        Conversation : {conversationTitle}
      </Text>
      {item.notes ? (
        <Text style={[styles.cardNotes, { color: colors.icon }]} numberOfLines={2}>
          {item.notes}
        </Text>
      ) : null}
      <Link href={`/chat/${item.conversationId}`} style={styles.cardLink}>
        <Text style={{ color: colors.tint, fontWeight: '600' }}>Ouvrir la discussion</Text>
      </Link>
    </View>
  );
}

export default function SortiesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { sorties, getConversation } = useMessaging();
  const insets = useSafeAreaInsets();

  const ordered = [...sorties].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={ordered}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.icon }]}>
            Aucune sortie pour l’instant. Créez-en une depuis une conversation.
          </Text>
        }
        ListHeaderComponent={
          <Text style={[styles.header, { color: colors.icon }]}>
            Sorties liées à vos groupes ou discussions privées.
          </Text>
        }
        renderItem={({ item }) => (
          <SortieRow
            item={item}
            conversationTitle={getConversation(item.conversationId)?.title ?? 'Discussion'}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    fontSize: 14,
    marginBottom: 12,
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 15,
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardMeta: {
    fontSize: 14,
    marginBottom: 8,
  },
  cardConv: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  cardNotes: {
    fontSize: 14,
    marginBottom: 10,
  },
  cardLink: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
});
