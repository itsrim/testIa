import { Design } from '@/constants/design';
import { useMessaging } from '@/context/MessagingContext';
import { getEventDetailRich } from '@/data/eventDetailSeed';
import type { EventParticipantDetail } from '@/data/eventDetailSeed';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

const { height: SCREEN_H } = Dimensions.get('window');
const HERO_H = Math.round(SCREEN_H * 0.34);
const CARD_RADIUS = 24;

function formatPriceFooter(priceLabel: string): { main: string; sub: string } {
  const low = priceLabel.toLowerCase();
  if (low.includes('gratuit')) return { main: 'Gratuit', sub: '/ personne' };
  const m = priceLabel.match(/([\d,.]+)\s*€?/);
  if (m) {
    const n = m[1].replace(',', '.');
    return { main: `${n}€`, sub: '/ personne' };
  }
  return { main: priceLabel, sub: '/ personne' };
}

function formatPriceSubheader(priceLabel: string): string {
  const low = priceLabel.toLowerCase();
  if (low.includes('gratuit')) return 'Gratuit / personne';
  const m = priceLabel.match(/([\d,.]+)\s*€?/);
  if (m) return `${m[1].replace(',', '.')}€ / personne`;
  return `${priceLabel} / personne`;
}

function RatingBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, (value / 5) * 100));
  return (
    <View style={styles.ratingTrack}>
      <View style={[styles.ratingFill, { width: `${pct}%` }]} />
    </View>
  );
}

function participantLabel(p: EventParticipantDetail): string {
  if (p.isSelf && p.isOrganizer) return 'Moi (Organisateur)';
  if (p.isSelf) return 'Moi';
  return p.displayName;
}

export default function EventDetailScreen() {
  const raw = useLocalSearchParams<{ id: string }>();
  const eventId = Array.isArray(raw.id) ? raw.id[0] : raw.id;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getEventById, joinEvent, toggleEventFavorite } = useMessaging();

  const event = eventId ? getEventById(eventId) : undefined;
  const rich = useMemo(() => (event ? getEventDetailRich(event) : null), [event]);

  const [waitingToggle, setWaitingToggle] = useState<Record<string, boolean>>({});

  const isRegistered = useMemo(
    () =>
      event?.cardStatus === 'inscrit' || event?.cardStatus === 'organisateur',
    [event?.cardStatus],
  );

  const isFull = useMemo(
    () =>
      event ? event.participantCount >= event.participantMax : false,
    [event],
  );

  const canJoin = useMemo(
    () => event?.cardStatus === 'join' && !isFull,
    [event?.cardStatus, isFull],
  );

  const openChat = useCallback(() => {
    if (!event || !isRegistered) return;
    router.push(`/chat/${event.conversationId}`);
  }, [router, event, isRegistered]);

  const onJoin = useCallback(() => {
    if (!event || !canJoin) return;
    joinEvent(event.id);
  }, [event, canJoin, joinEvent]);

  if (!event || !rich) {
    return (
      <View style={[styles.fallback, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.fallbackText}>Event not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.fallbackBtn}>
          <Text style={styles.fallbackBtnText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const priceFooter = formatPriceFooter(event.priceLabel);
  const priceSub = formatPriceSubheader(event.priceLabel);
  const dateTimeLine = `${event.dateLabel}, ${event.timeShort}`;

  const footerActionLabel = isRegistered
    ? 'Inscrit ✓'
    : isFull
      ? 'Complet'
      : "+ S'inscrire";

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces
        contentContainerStyle={{
          paddingBottom: 120 + insets.bottom,
        }}>
        <View style={styles.heroWrap}>
          <Image source={{ uri: event.imageUri }} style={styles.heroImg} contentFit="cover" />
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { top: insets.top + 8 }]}
            hitSlop={12}
            accessibilityLabel="Retour">
            <View style={styles.backBtnInner}>
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </View>
          </Pressable>
          <View style={[styles.headerActions, { top: insets.top + 8 }]}>
            <Pressable
              onPress={() => Alert.alert('Partager', 'Lien partagé !')}
              style={styles.backBtnInner}
              hitSlop={12}
            >
              <Ionicons name="share-social-outline" size={22} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => toggleEventFavorite(event.id)}
              style={styles.backBtnInner}
              hitSlop={12}
            >
              <Ionicons 
                name={event.isFavorite ? "heart" : "heart-outline"} 
                size={22} 
                color={event.isFavorite ? "#FF4081" : "#fff"} 
              />
            </Pressable>
          </View>
        </View>

        <View style={[styles.sheet, { marginTop: -CARD_RADIUS }]}>
          <Text style={styles.title}>{event.title}</Text>

          <View style={styles.subHeaderRow}>
            <Text style={styles.subHeaderMuted}>{priceSub}</Text>
            <Text style={styles.subHeaderMuted}>
              {event.participantCount} participant{event.participantCount > 1 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={Design.textSecondary} />
            <Text style={styles.infoText}>{event.location}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color={Design.textSecondary} />
            <Text style={styles.infoText}>{dateTimeLine}</Text>
          </View>

          {rich.descriptionParagraphs.map((para, i) => (
            <Text key={i} style={styles.desc}>
              {para}
            </Text>
          ))}

          {rich.participants.length > 0 ? (
            <View style={styles.block}>
              <View style={styles.blockHeader}>
                <Text style={styles.blockTitle}>
                  Participants ({event.participantCount}/{event.participantMax})
                </Text>
                <Pressable
                  onPress={() =>
                    Alert.alert(
                      'Participants',
                      `Total : ${event.participantCount} sur ${event.participantMax} (démo).`,
                    )
                  }
                  hitSlop={8}>
                  <Text style={styles.seeAll}>Voir tout</Text>
                </Pressable>
              </View>
              {rich.participants.map((p) => (
                <View key={p.id} style={styles.participantRow}>
                  <Image source={{ uri: p.avatarUrl }} style={styles.participantAv} contentFit="cover" />
                  <View style={styles.participantCol}>
                    <View style={styles.participantNameRow}>
                      <Text style={styles.participantName} numberOfLines={1}>
                        {participantLabel(p)}
                      </Text>
                      {p.isSelf ? (
                        <View style={styles.vousBadge}>
                          <Text style={styles.vousBadgeText}>VOUS</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.ratingRow}>
                      <View style={styles.ratingBarWrap}>
                        <RatingBar value={p.rating} />
                      </View>
                      <Text style={styles.ratingNum}>{p.rating.toFixed(1)}</Text>
                    </View>
                  </View>
                  {rich.showRemoveOtherParticipants && !p.isSelf ? (
                    <Pressable
                      style={styles.removeBtn}
                      onPress={() =>
                        Alert.alert('Démo', `Retirer ${p.displayName} — non implémenté en maquette.`)
                      }
                      hitSlop={8}>
                      <Ionicons name="person-remove-outline" size={22} color="#FF453A" />
                    </Pressable>
                  ) : (
                    <View style={styles.removePlaceholder} />
                  )}
                </View>
              ))}
            </View>
          ) : null}

          {rich.waitingList.length > 0 ? (
            <View style={styles.block}>
              <Text style={styles.waitingTitle}>⌛ Liste d&apos;attente ({rich.waitingList.length})</Text>
              {rich.waitingList.map((w) => (
                <View key={w.id} style={styles.participantRow}>
                  <Image
                    source={{
                      uri:
                        w.avatarUrl ??
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(w.displayName)}&size=128&background=555&color=aaa`,
                    }}
                    style={[styles.participantAv, styles.waitingAv]}
                    contentFit="cover"
                  />
                  <View style={styles.participantCol}>
                    <Text style={styles.participantName}>{w.displayName}</Text>
                    <View style={styles.ratingRow}>
                      <View style={styles.ratingBarWrap}>
                        <RatingBar value={w.rating} />
                      </View>
                      <Text style={styles.ratingNum}>{w.rating.toFixed(1)}</Text>
                    </View>
                  </View>
                  <Switch
                    value={!!waitingToggle[w.id]}
                    onValueChange={(v) => setWaitingToggle((prev) => ({ ...prev, [w.id]: v }))}
                    trackColor={{ false: '#3A3A3C', true: 'rgba(52,199,89,0.45)' }}
                    thumbColor={waitingToggle[w.id] ? '#34C759' : '#787880'}
                  />
                </View>
              ))}
            </View>
          ) : null}

          {isFull ? (
            <View style={styles.warnBox}>
              <Text style={styles.warnText}>🔒 Limite de participants atteinte</Text>
            </View>
          ) : null}

          <Text style={styles.footerNote}>
            Les inscriptions se terminent 15 minutes avant le début de l&apos;événement !
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.footerRow}>
          <View style={styles.footerPrice}>
            <Text style={styles.footerPriceMain}>{priceFooter.main}</Text>
            <Text style={styles.footerPriceSub}>{priceFooter.sub}</Text>
          </View>

          {isRegistered ? (
            <Pressable
              onPress={openChat}
              style={styles.chatBtn}
              accessibilityLabel="Ouvrir la conversation du groupe">
              <Ionicons name="chatbubble-outline" size={22} color="#fff" />
              <View style={styles.chatPlusBadge}>
                <Text style={styles.chatPlusText}>+</Text>
              </View>
            </Pressable>
          ) : null}

          <Pressable
            onPress={isRegistered ? undefined : canJoin ? onJoin : undefined}
            disabled={isRegistered || !canJoin}
            style={[
              styles.actionBtn,
              (isRegistered || !canJoin) && styles.actionBtnMuted,
              canJoin && styles.actionBtnActive,
            ]}>
            <Text
              style={[
                styles.actionBtnText,
                (isRegistered || !canJoin) && styles.actionBtnTextMuted,
                canJoin && styles.actionBtnTextActive,
              ]}>
              {footerActionLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Design.bg,
  },
  scroll: {
    flex: 1,
  },
  heroWrap: {
    height: HERO_H,
    width: '100%',
    backgroundColor: '#111',
  },
  heroImg: {
    width: '100%',
    height: '100%',
  },
  backBtn: {
    position: 'absolute',
    left: 12,
    zIndex: 4,
  },
  headerActions: {
    position: 'absolute',
    right: 12,
    zIndex: 4,
    flexDirection: 'row',
    gap: 12,
  },
  backBtnInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    backgroundColor: '#0D0D0D',
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 8,
  },
  title: {
    color: Design.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subHeaderMuted: {
    color: Design.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  infoText: {
    color: Design.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  desc: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
  },
  block: {
    marginTop: 28,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  blockTitle: {
    color: Design.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  seeAll: {
    color: '#5AC8FA',
    fontSize: 15,
    fontWeight: '700',
  },
  waitingTitle: {
    color: Design.textSecondary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  participantAv: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
  },
  waitingAv: {
    opacity: 0.55,
  },
  participantCol: {
    flex: 1,
    minWidth: 0,
  },
  participantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  ratingBarWrap: {
    flex: 1,
    maxWidth: 140,
  },
  participantName: {
    color: Design.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  vousBadge: {
    backgroundColor: 'rgba(255,64,129,0.35)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,105,180,0.5)',
  },
  vousBadgeText: {
    color: '#FFB6C8',
    fontSize: 9,
    fontWeight: '900',
  },
  ratingTrack: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: '#2C2C2E',
    overflow: 'hidden',
  },
  ratingFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  ratingNum: {
    color: Design.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    width: 32,
    textAlign: 'right',
  },
  removeBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,69,58,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePlaceholder: {
    width: 40,
    height: 40,
  },
  warnBox: {
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,159,10,0.65)',
    backgroundColor: 'rgba(255,159,10,0.08)',
  },
  warnText: {
    color: '#FF9F0A',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  footerNote: {
    marginTop: 18,
    color: Design.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0A0A0A',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingTop: 10,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  footerPrice: {
    flexShrink: 0,
  },
  footerPriceMain: {
    color: Design.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  footerPriceSub: {
    color: Design.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  chatBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatPlusBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0A0A0A',
  },
  chatPlusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    marginTop: -1,
  },
  actionBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#1C1C1E',
  },
  actionBtnActive: {
    borderColor: 'rgba(255,255,255,0.55)',
  },
  actionBtnMuted: {
    opacity: 0.95,
  },
  actionBtnText: {
    color: Design.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  actionBtnTextMuted: {
    color: 'rgba(255,255,255,0.85)',
  },
  actionBtnTextActive: {
    color: '#fff',
  },
  fallback: {
    flex: 1,
    backgroundColor: Design.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fallbackText: {
    color: Design.textSecondary,
    fontSize: 16,
    marginBottom: 16,
  },
  fallbackBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
  },
  fallbackBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
