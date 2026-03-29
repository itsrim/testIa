import { Design } from '@/constants/design';
import { useMessaging } from '@/context/MessagingContext';
import {
  formatSuggestionCaption,
  MOCK_SUGGESTION_PROFILES,
  type SuggestionProfile,
} from '@/data/suggestionProfiles';
import { formatBadgeCount } from '@/lib/formatBadgeCount';
import type { Conversation } from '@/types/messaging';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

/** Gouttière stories (haut) */
const ROW_STORY_GUTTER = 14;
/** Liste messages : un peu plus large pour ne pas coller au bord (web / petits écrans) */
const LIST_ROW_INSET_H = 18;
const AVATAR_TEXT_GAP = 12;
const AVATAR_SIZE = 56;

type SubTab = 'suggestions' | 'messages' | 'visites';

type ProfileVisit = {
  id: string;
  name: string;
  age: number;
  avatarUrl: string;
  lastVisitAt: number;
  /** Affichage pastille jaune « x2 », « x3 » si > 1 */
  visitMultiplier?: number;
};

const MOCK_PROFILE_VISITS: ProfileVisit[] = [
  {
    id: 'pv1',
    name: 'Maya',
    age: 18,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&q=80',
    lastVisitAt: Date.now() - 7 * 60_000,
    visitMultiplier: 2,
  },
  {
    id: 'pv2',
    name: 'Thomas',
    age: 24,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&q=80',
    lastVisitAt: Date.now() - 20 * 60_000,
  },
  {
    id: 'pv3',
    name: 'Lily',
    age: 19,
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=240&q=80',
    lastVisitAt: Date.now() - 52 * 60_000,
    visitMultiplier: 3,
  },
  {
    id: 'pv4',
    name: 'Camille',
    age: 22,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=240&q=80',
    lastVisitAt: Date.now() - 3 * 60 * 60_000,
  },
  {
    id: 'pv5',
    name: 'Noah',
    age: 21,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&q=80',
    lastVisitAt: Date.now() - 26 * 60 * 60_000,
  },
];

const VISIT_CARD_PINK = '#FF4081';
const VISIT_CARD_BG = '#121212';

const SUGGESTION_COL_GAP = 8;

function buildMasonryColumns(items: SuggestionProfile[], columnCount: number): SuggestionProfile[][] {
  const cols: SuggestionProfile[][] = Array.from({ length: columnCount }, () => []);
  const heights = Array(columnCount).fill(0);
  for (const item of items) {
    const w = 1 / item.aspectRatio;
    let minI = 0;
    for (let c = 1; c < columnCount; c++) {
      if (heights[c] < heights[minI]) minI = c;
    }
    cols[minI].push(item);
    heights[minI] += w;
  }
  return cols;
}

function formatVisitTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'À l’instant';
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

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
  icon,
  activeUnderline,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  badge?: number;
  badgeVariant?: 'red' | 'gold';
  icon?: keyof typeof Ionicons.glyphMap;
  activeUnderline?: 'light' | 'gold';
}) {
  const underline =
    active && activeUnderline === 'gold'
      ? styles.subTabInnerUnderlineGold
      : active && activeUnderline === 'light'
        ? styles.subTabInnerUnderlineLight
        : null;

  const iconColor = active ? Design.textPrimary : Design.textSecondary;

  return (
    <Pressable onPress={onPress} style={styles.subTabOuter}>
      <View style={[styles.subTabInner, underline]}>
        {icon ? <Ionicons name={icon} size={16} color={iconColor} style={styles.subTabIcon} /> : null}
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
            <Text
              style={[
                styles.subTabBadgeTextBase,
                badgeVariant === 'gold' ? styles.subTabBadgeTextGold : styles.subTabBadgeTextRed,
              ]}
              allowFontScaling={false}>
              {formatBadgeCount(badge)}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function VisitesPremiumBanner({ visitorCount }: { visitorCount: number }) {
  let displaySubtitle: string;
  if (visitorCount > 99) {
    displaySubtitle = '99+ personnes ont visité votre profil.';
  } else if (visitorCount === 0) {
    displaySubtitle = 'Passez Premium pour voir qui vous regarde.';
  } else if (visitorCount === 1) {
    displaySubtitle = '1 personne a visité votre profil.';
  } else {
    displaySubtitle = `${visitorCount} personnes ont visité votre profil.`;
  }

  return (
    <LinearGradient
      colors={['#FFC107', '#FF9800', '#FF6B35']}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.premiumBanner}>
      <View style={styles.premiumBannerIconWrap}>
        <MaterialCommunityIcons name="crown" size={28} color="#fff" />
      </View>
      <View style={styles.premiumBannerTexts}>
        <Text style={styles.premiumBannerTitle}>Fonctionnalité Premium</Text>
        <Text style={styles.premiumBannerSubtitle}>{displaySubtitle}</Text>
      </View>
    </LinearGradient>
  );
}

function VisitProfileRow({
  item,
  liked,
  onToggleLike,
}: {
  item: ProfileVisit;
  liked: boolean;
  onToggleLike: () => void;
}) {
  const mult = item.visitMultiplier && item.visitMultiplier > 1 ? item.visitMultiplier : null;

  return (
    <View style={styles.visitCard}>
      <View style={styles.visitAvatarWrap}>
        <Image source={{ uri: item.avatarUrl }} style={styles.visitAvatar} contentFit="cover" />
        {mult != null ? (
          <View style={styles.visitMultBadge}>
            <Text style={styles.visitMultBadgeText}>×{mult}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.visitCardBody}>
        <Text style={styles.visitNameAge} numberOfLines={1}>
          {item.name}, {item.age}
        </Text>
        <View style={styles.visitMetaRow}>
          <Ionicons name="eye-outline" size={14} color={Design.textSecondary} />
          <Text style={styles.visitTime}>{formatVisitTimeAgo(item.lastVisitAt)}</Text>
        </View>
      </View>
      <Pressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggleLike();
        }}
        style={({ pressed }) => [
          styles.visitLikeBtn,
          liked && styles.visitLikeBtnActive,
          pressed && { opacity: 0.88 },
        ]}>
        <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color="#fff" />
        <Text style={styles.visitLikeLabel}>Like</Text>
      </Pressable>
    </View>
  );
}

function SuggestionMasonryCard({
  item,
  liked,
  onToggleLike,
  onOpenProfile,
}: {
  item: SuggestionProfile;
  liked: boolean;
  onToggleLike: () => void;
  onOpenProfile: () => void;
}) {
  const caption = formatSuggestionCaption(item.pseudo, item.age);

  return (
    <View style={styles.suggestionCard}>
      <Pressable
        onPress={onOpenProfile}
        style={styles.suggestionImagePress}
        accessibilityRole="button"
        accessibilityLabel={`Profil ${caption}`}>
        <Image
          source={{ uri: item.imageUrl }}
          style={[styles.suggestionImage, { aspectRatio: item.aspectRatio }]}
          contentFit="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.82)']}
          locations={[0.25, 1]}
          style={styles.suggestionImageFade}
        />
        <View style={styles.suggestionTextBlock} pointerEvents="none">
          <Text style={styles.suggestionCaption} numberOfLines={1}>
            {caption}
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggleLike();
        }}
        style={({ pressed }) => [styles.suggestionHeartBtn, pressed && { opacity: 0.85 }]}
        hitSlop={10}
        accessibilityLabel={liked ? 'Retirer le like' : 'Aimer'}
        accessibilityRole="button">
        <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

export default function ChatListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { conversations, messagesTabBadgeCount, visitesTabBadgeCount, canViewGroupMessages } =
    useMessaging();
  const [sub, setSub] = useState<SubTab>('messages');
  const [visitLikedById, setVisitLikedById] = useState<Record<string, boolean>>({});
  const [suggestionLikedById, setSuggestionLikedById] = useState<Record<string, boolean>>({});

  const toggleVisitLike = useCallback((id: string) => {
    setVisitLikedById((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleSuggestionLike = useCallback((id: string) => {
    setSuggestionLikedById((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const suggestionColumns = useMemo(
    () => buildMasonryColumns(MOCK_SUGGESTION_PROFILES, 3),
    [],
  );

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
            activeUnderline="light"
          />
          <SubTabPill
            label="Suggestions"
            active={sub === 'suggestions'}
            onPress={() => setSub('suggestions')}
            activeUnderline="light"
          />
          <SubTabPill
            label="Visites"
            active={sub === 'visites'}
            onPress={() => setSub('visites')}
            badge={visitesTabBadgeCount}
            badgeVariant="gold"
            icon="eye-outline"
            activeUnderline="gold"
          />
        </ScrollView>
        <Pressable style={styles.searchBtn} hitSlop={12} accessibilityLabel="Rechercher">
          <Ionicons name="search-outline" size={22} color={Design.textSecondary} />
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
      ) : sub === 'visites' ? (
        <FlatList
          data={MOCK_PROFILE_VISITS}
          keyExtractor={(v) => v.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <VisitesPremiumBanner visitorCount={visitesTabBadgeCount} />
          }
          contentContainerStyle={{
            paddingBottom: Design.contentBottomSpace + insets.bottom,
            paddingTop: 4,
            paddingHorizontal: LIST_ROW_INSET_H,
          }}
          renderItem={({ item }) => (
            <VisitProfileRow
              item={item}
              liked={!!visitLikedById[item.id]}
              onToggleLike={() => toggleVisitLike(item.id)}
            />
          )}
        />
      ) : (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: Design.contentBottomSpace + insets.bottom,
            paddingTop: 8,
            paddingHorizontal: LIST_ROW_INSET_H - 2,
          }}>
          <View style={styles.suggestionMasonryRow}>
            {suggestionColumns.map((col, colIndex) => (
              <View key={`col-${colIndex}`} style={styles.suggestionMasonryCol}>
                {col.map((item) => (
                  <View key={item.id} style={styles.suggestionMasonryCell}>
                    <SuggestionMasonryCard
                      item={item}
                      liked={!!suggestionLikedById[item.id]}
                      onToggleLike={() => toggleSuggestionLike(item.id)}
                      onOpenProfile={() => router.push(`/profil/${item.id}`)}
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
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
    paddingTop: 6,
    paddingBottom: 8,
    borderRadius: 10,
    gap: 4,
    borderBottomWidth: 0,
  },
  subTabInnerUnderlineLight: {
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(255,255,255,0.9)',
  },
  subTabInnerUnderlineGold: {
    borderBottomWidth: 3,
    borderBottomColor: '#FFC107',
  },
  subTabIcon: {
    marginRight: -2,
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
  subTabBadgeTextBase: {
    fontSize: 11,
    fontWeight: '800',
  },
  subTabBadgeTextRed: {
    color: '#FFFFFF',
  },
  subTabBadgeTextGold: {
    color: '#000000',
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
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 18,
    gap: 14,
    overflow: 'hidden',
  },
  premiumBannerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBannerTexts: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  premiumBannerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  premiumBannerSubtitle: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 19,
  },
  visitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: VISIT_CARD_BG,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    gap: 12,
  },
  visitAvatarWrap: {
    position: 'relative',
    width: 58,
    height: 58,
  },
  visitAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#1c1c1e',
  },
  visitMultBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    minWidth: 26,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: Design.badgeGold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: VISIT_CARD_BG,
  },
  visitMultBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
  },
  visitCardBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 4,
  },
  visitNameAge: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  visitMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  visitTime: {
    color: Design.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  visitLikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: VISIT_CARD_PINK,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    flexShrink: 0,
  },
  visitLikeBtnActive: {
    backgroundColor: '#E91E63',
  },
  visitLikeLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  suggestionMasonryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SUGGESTION_COL_GAP,
    width: '100%',
  },
  suggestionMasonryCol: {
    flex: 1,
    minWidth: 0,
  },
  suggestionMasonryCell: {
    marginBottom: SUGGESTION_COL_GAP,
  },
  suggestionCard: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#141414',
    width: '100%',
    position: 'relative',
  },
  suggestionImagePress: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  suggestionImage: {
    width: '100%',
    backgroundColor: '#1c1c1e',
  },
  suggestionImageFade: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  suggestionHeartBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 4,
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  suggestionTextBlock: {
    position: 'absolute',
    left: 10,
    right: 36,
    bottom: 10,
    zIndex: 3,
  },
  suggestionCaption: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
