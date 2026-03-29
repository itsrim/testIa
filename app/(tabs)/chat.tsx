import { Design } from '@/constants/design';
import { useMessaging } from '@/context/MessagingContext';
import { formatBadgeCount } from '@/lib/formatBadgeCount';
import type { Conversation } from '@/types/messaging';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

/** Gouttière stories (haut) */
const ROW_STORY_GUTTER = 14;
/** Liste messages : un peu plus large pour ne pas coller au bord (web / petits écrans) */
const LIST_ROW_INSET_H = 18;
const AVATAR_TEXT_GAP = 12;
const AVATAR_SIZE = 56;

type SubTab = 'suggestions' | 'messages' | 'visites';

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'À l’instant';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days} j`;
}

function truncateStoryLabel(title: string, max = 11): string {
  if (title.length <= max) return title;
  return `${title.slice(0, max - 1)}…`;
}

function groupStoryVariant(id: string): 0 | 1 | 2 {
  let s = 0;
  for (let i = 0; i < id.length; i++) {
    s = (s + id.charCodeAt(i)) % 3;
  }
  return s as 0 | 1 | 2;
}

function GroupStoryAvatarInner({ conversationId }: { conversationId: string }) {
  const v = groupStoryVariant(conversationId);
  if (v === 0) {
    return (
      <View style={styles.storySplit2}>
        <View style={[styles.storySplitHalf, { backgroundColor: 'rgba(0,0,0,0.28)' }]} />
        <View style={[styles.storySplitHalf, { backgroundColor: 'rgba(255,255,255,0.22)' }]} />
      </View>
    );
  }
  if (v === 1) {
    return (
      <View style={styles.storyGrid4}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.storyQuad, { backgroundColor: `rgba(255,255,255,${0.22 + i * 0.08})` }]}
          />
        ))}
      </View>
    );
  }
  return (
    <View style={styles.storyTriple}>
      <View style={styles.storyTripleTop}>
        <View style={[styles.storyTripleMini, { backgroundColor: 'rgba(255,255,255,0.28)' }]} />
        <View style={[styles.storyTripleMini, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
      </View>
      <View style={[styles.storyTripleBottom, { backgroundColor: 'rgba(255,255,255,0.18)' }]} />
    </View>
  );
}

function GroupStoryStripItem({
  conversation,
  onPress,
}: {
  conversation: Conversation;
  onPress: () => void;
}) {
  const label = truncateStoryLabel(conversation.title);
  const badge = conversation.unreadCount;

  return (
    <Pressable onPress={onPress} style={styles.storyCell} accessibilityRole="button">
      <View style={styles.storyRing}>
        <LinearGradient
          colors={[...conversation.avatarGradient]}
          style={styles.storyAvatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}>
          <GroupStoryAvatarInner conversationId={conversation.id} />
        </LinearGradient>
        {badge > 0 ? (
          <View style={styles.storyBadge}>
            <Text style={styles.storyBadgeText}>{formatBadgeCount(badge)}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.storyLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function StoryNewStripItem({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.storyCell} accessibilityRole="button" accessibilityLabel="Nouveau groupe">
      <View style={styles.storyNewRing}>
        <Ionicons name="add" size={34} color="rgba(255,255,255,0.92)" />
      </View>
      <Text style={styles.storyLabelNew} numberOfLines={1}>
        + Groupe
      </Text>
    </Pressable>
  );
}

function ListAvatar({ item }: { item: Conversation }) {
  const isGroup = item.type === 'group';
  if (isGroup) {
    return (
      <View style={styles.listAvatarWrap}>
        <LinearGradient
          colors={[...item.avatarGradient]}
          style={styles.listAvatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}>
          <View style={styles.groupSplit}>
            <View style={[styles.groupHalf, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
            <View style={[styles.groupHalf, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
          </View>
        </LinearGradient>
        {item.unreadCount > 0 ? (
          <View style={styles.listBadge}>
            <Text style={styles.listBadgeText}>{formatBadgeCount(item.unreadCount)}</Text>
          </View>
        ) : null}
      </View>
    );
  }
  return (
    <View style={styles.listAvatarWrap}>
      <LinearGradient
        colors={[...item.avatarGradient]}
        style={styles.listAvatar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        <Text style={styles.listAvatarLetter}>{item.title.slice(0, 1)}</Text>
      </LinearGradient>
      {item.unreadCount > 0 ? (
        <View style={styles.listBadge}>
          <Text style={styles.listBadgeText}>{formatBadgeCount(item.unreadCount)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ConversationRow({ item, previewText }: { item: Conversation; previewText: string }) {
  const router = useRouter();
  const isGroup = item.type === 'group';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/chat/${item.id}`)}
      style={({ pressed }) => [styles.rowPressable, pressed && styles.rowPressed]}>
      {/*
        Sur le web, Link+asChild produit souvent un <a> en display:inline : le flex-row
        et le padding sur le Pressable ne s’appliquent pas → tout s’empile au bord gauche.
        Toute la mise en page est sur ce View interne.
      */}
      <View style={styles.rowInner}>
        <View style={styles.avatarColumn}>
          <ListAvatar item={item} />
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {item.title}
              </Text>
              {isGroup ? <Text style={styles.groupeTag}>Groupe</Text> : null}
            </View>
            <Text style={styles.time}>{formatRelativeTime(item.updatedAt)}</Text>
          </View>
          <Text style={styles.preview} numberOfLines={2}>
            {previewText}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function SubTabPill({
  label,
  active,
  onPress,
  badge,
  badgeVariant,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  badge?: number;
  badgeVariant?: 'red' | 'gold';
}) {
  return (
    <Pressable onPress={onPress} style={styles.subTabOuter}>
      <View style={[styles.subTabInner, active && styles.subTabInnerActive]}>
        <Text
          style={[styles.subTabText, active && styles.subTabTextActive]}
          numberOfLines={1}
          allowFontScaling={false}>
          {label}
        </Text>
        {badge != null && badge > 0 ? (
          <View
            style={[
              styles.subTabBadge,
              badgeVariant === 'gold' ? styles.subTabBadgeGold : styles.subTabBadgeRed,
            ]}>
            <Text style={styles.subTabBadgeText} allowFontScaling={false}>
              {formatBadgeCount(badge)}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function ChatListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { conversations, messagesTabBadgeCount, visitesTabBadgeCount, canViewGroupMessages } =
    useMessaging();
  const [sub, setSub] = useState<SubTab>('messages');

  const sorted = useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations],
  );

  const groupStories = useMemo(
    () => sorted.filter((c) => c.type === 'group'),
    [sorted],
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[...Design.gradientHeaderChat]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}>
        <View style={styles.storiesWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storiesScroll}
            style={styles.storiesScrollView}>
            {groupStories.map((c) => (
              <GroupStoryStripItem
                key={c.id}
                conversation={c}
                onPress={() => router.push(`/chat/${c.id}`)}
              />
            ))}
            <StoryNewStripItem onPress={() => router.push('/nouvelle-conversation')} />
          </ScrollView>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,107,53,0)', 'rgba(255,64,129,0.45)', 'rgba(171,71,188,0.92)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.storiesRightFade}
          />
        </View>
      </LinearGradient>

      <View style={styles.subTabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subTabScroll}
          contentContainerStyle={styles.subTabScrollContent}
          bounces={false}>
          <SubTabPill
            label="Messages"
            active={sub === 'messages'}
            onPress={() => setSub('messages')}
            badge={messagesTabBadgeCount}
            badgeVariant="red"
          />
          <SubTabPill
            label="Visites"
            active={sub === 'visites'}
            onPress={() => setSub('visites')}
            badge={visitesTabBadgeCount}
            badgeVariant="gold"
          />
          <SubTabPill
            label="Suggestions"
            active={sub === 'suggestions'}
            onPress={() => setSub('suggestions')}
          />
        </ScrollView>
        <Pressable style={styles.searchBtn} hitSlop={12} accessibilityLabel="Rechercher">
          <Ionicons name="search-outline" size={22} color={Design.textPrimary} />
        </Pressable>
      </View>

      {sub === 'messages' ? (
        <FlatList
          data={sorted}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{
            paddingBottom: Design.contentBottomSpace + insets.bottom,
            width: '100%',
            maxWidth: '100%',
          }}
          style={styles.list}
          renderItem={({ item }) => (
            <ConversationRow
              item={item}
              previewText={
                item.type === 'group' && !canViewGroupMessages(item.id)
                  ? '🔒 Invitez un ami dans ce groupe pour voir les messages.'
                  : item.lastMessagePreview
              }
            />
          )}
        />
      ) : (
        <View style={[styles.placeholder, { paddingBottom: Design.contentBottomSpace }]}>
          <Text style={styles.placeholderText}>
            {sub === 'suggestions'
              ? 'Suggestions à venir.'
              : 'Historique des visites à venir.'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Design.bg,
  },
  headerGradient: {
    paddingBottom: 14,
  },
  storiesWrap: {
    position: 'relative',
    width: '100%',
  },
  storiesScrollView: {
    zIndex: 1,
    width: '100%',
  },
  storiesScroll: {
    paddingLeft: ROW_STORY_GUTTER,
    paddingRight: 56,
    gap: 14,
    alignItems: 'flex-start',
  },
  storiesRightFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 64,
    zIndex: 2,
  },
  storyCell: {
    width: 72,
    alignItems: 'center',
  },
  storyRing: {
    position: 'relative',
  },
  storyAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  storyGrid4: {
    width: 40,
    height: 40,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  storyQuad: {
    width: 20,
    height: 20,
  },
  storySplit2: {
    width: 40,
    height: 40,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 4,
  },
  storySplitHalf: {
    flex: 1,
    height: '100%',
  },
  storyTriple: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  storyTripleTop: {
    flexDirection: 'row',
    height: 18,
    gap: 3,
    marginBottom: 3,
  },
  storyTripleMini: {
    flex: 1,
    height: 18,
    borderRadius: 2,
  },
  storyTripleBottom: {
    height: 17,
    borderRadius: 2,
  },
  storyNewRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderStyle: Platform.OS === 'android' ? 'solid' : 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  storyBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Design.badgeRed,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Design.bg,
  },
  storyBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  storyLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
    width: '100%',
  },
  storyLabelNew: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
    width: '100%',
  },
  subTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: LIST_ROW_INSET_H,
    paddingRight: 8,
    paddingVertical: 8,
    backgroundColor: Design.bg,
    gap: 4,
  },
  subTabScroll: {
    flex: 1,
    flexGrow: 1,
    minWidth: 0,
    maxHeight: 44,
  },
  subTabScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 4,
  },
  subTabOuter: {
    flexShrink: 0,
  },
  subTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  subTabInnerActive: {
    borderColor: 'rgba(255,255,255,0.9)',
  },
  subTabText: {
    color: Design.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  subTabTextActive: {
    color: Design.textPrimary,
  },
  subTabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  subTabBadgeRed: {
    backgroundColor: Design.badgeRed,
  },
  subTabBadgeGold: {
    backgroundColor: Design.badgeGold,
  },
  subTabBadgeText: {
    color: Design.bg,
    fontSize: 11,
    fontWeight: '800',
  },
  searchBtn: {
    flexShrink: 0,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    ...(Platform.OS === 'web' ? ({ alignSelf: 'stretch' } as const) : {}),
  },
  rowPressable: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {}),
  },
  rowPressed: {
    opacity: 0.75,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: '100%',
    paddingVertical: 12,
    paddingLeft: LIST_ROW_INSET_H,
    paddingRight: LIST_ROW_INSET_H,
    ...(Platform.OS === 'web' ? ({ boxSizing: 'border-box' } as const) : {}),
  },
  avatarColumn: {
    width: AVATAR_SIZE,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listAvatarWrap: {
    position: 'relative',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listAvatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  listAvatarLetter: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  groupSplit: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
  },
  groupHalf: {
    flex: 1,
    height: '100%',
  },
  listBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Design.badgeRed,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Design.bg,
  },
  listBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    marginLeft: AVATAR_TEXT_GAP,
    justifyContent: 'center',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  groupeTag: {
    color: '#777777',
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 0,
  },
  time: {
    color: '#777777',
    fontSize: 13,
    flexShrink: 0,
  },
  preview: {
    color: '#AAAAAA',
    fontSize: 15,
    lineHeight: 20,
    alignSelf: 'stretch',
    paddingRight: 2,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  placeholderText: {
    color: Design.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
});
