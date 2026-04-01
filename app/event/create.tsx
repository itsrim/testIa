import { Design } from '@/constants/design';
import { useProfileSettings } from '@/context/ProfileSettingsContext';
import { useMessaging } from '@/context/MessagingContext';
import { todayDateKey } from '@/lib/todayDateKey';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';

const CARD = '#1C1C1E';
const BORDER = 'rgba(255,255,255,0.08)';
const ACCENT = '#9B5DE5';
const BTN_GRADIENT = ['#5B2D8C', '#7B2D7A', '#C23B8E'] as const;
const MUTED = 'rgba(142, 142, 147, 0.95)';

/** Sur le web, `Alert.alert` de React Native ne fait rien : les validations semblaient muettes. */
function alertMessage(title: string, message?: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  if (message) {
    Alert.alert(title, message);
  } else {
    Alert.alert(title);
  }
}

function toIsoDateKey(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

function frenchShortDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

function frenchSectionLabel(d: Date): string {
  const raw = d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export default function CreateEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rawParams = useLocalSearchParams<{ conversationId?: string; title?: string }>();
  const linkedConversationId = useMemo(() => {
    const raw = rawParams.conversationId;
    const id = Array.isArray(raw) ? raw[0] : raw;
    return id?.trim() ? id.trim() : undefined;
  }, [rawParams.conversationId]);
  const { addEvent, events, createEmptyGroup, postEventGroupWelcome, getConversation } = useMessaging();
  const { getLimits, isPremium, isRestricted, isAdmin } = useProfileSettings();

  const [title, setTitle] = useState('');
  const titleSeededRef = useRef(false);
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date();
    const ms = 1000 * 60 * 15;
    return new Date(Math.ceil(d.getTime() / ms) * ms);
  });
  const [location, setLocation] = useState('');
  const limits = getLimits();
  const [maxParticipants, setMaxParticipants] = useState(String(getLimits().maxParticipants));

  useEffect(() => {
    const cap = limits.maxParticipants;
    setMaxParticipants((p) => {
      const n = parseInt(p, 10);
      if (!Number.isFinite(n)) return String(cap);
      return String(Math.min(Math.max(1, n), cap));
    });
  }, [isPremium, limits.maxParticipants]);

  /** Depuis une discussion : préremplir le titre (param ou nom du groupe / DM). */
  useEffect(() => {
    if (titleSeededRef.current || !linkedConversationId) return;
    const rawT = rawParams.title;
    const titleParam =
      typeof rawT === 'string'
        ? rawT.trim()
        : Array.isArray(rawT) && rawT[0] != null
          ? String(rawT[0]).trim()
          : '';
    const fromConv = getConversation(linkedConversationId)?.title?.trim() ?? '';
    const seed = titleParam || fromConv;
    if (seed) {
      setTitle(seed);
      titleSeededRef.current = true;
    }
  }, [linkedConversationId, rawParams.title, getConversation]);
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [hideAddress, setHideAddress] = useState(false);
  const [manualApproval, setManualApproval] = useState(false);
  const [markAsBeta, setMarkAsBeta] = useState(false);

  const bumpMax = useCallback(
    (delta: number) => {
      void Haptics.selectionAsync();
      setMaxParticipants((p) => {
        const n = parseInt(p, 10);
        const cur = Number.isFinite(n) ? n : limits.maxParticipants;
        const cap = limits.maxParticipants;
        const next = Math.min(cap, Math.max(2, cur + delta));
        return String(next);
      });
    },
    [limits.maxParticipants],
  );

  const pickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      alertMessage('Accès photos', 'Autorisez l’accès à la bibliothèque pour ajouter une photo.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    const raw = res.assets?.[0];
    if (!res.canceled && raw?.uri) {
      void Haptics.selectionAsync();
      setImageUri(raw.uri);
    }
  }, []);

  const submit = () => {
    const t = title.trim();
    const l = location.trim();
    const parsed = eventDate;
    const timeShortStr = eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const maxN = parseInt(maxParticipants.trim(), 10);

    if (!t) {
      alertMessage('Titre', 'Indiquez un titre pour votre événement.');
      return;
    }
    if (!l) {
      alertMessage('Lieu', 'Indiquez un lieu ou un point de rendez-vous.');
      return;
    }
    const maxCapVal = limits.maxParticipants;
    if (!Number.isFinite(maxN) || maxN < 2 || maxN > maxCapVal) {
      alertMessage('Participants', `Le nombre de participants doit être entre 2 et ${maxCapVal}.`);
      return;
    }

    const today = todayDateKey();
    const activeOrganizer = events.filter(
      (e) => e.cardStatus === 'organisateur' && e.dateKey >= today,
    );
    if (
      !isPremium &&
      isRestricted('limitEventCreation') &&
      activeOrganizer.length >= limits.maxActiveEvents
    ) {
      alertMessage(
        'Limite atteinte',
        `En mode gratuit vous ne pouvez avoir que ${limits.maxActiveEvents} sortie active à la fois (vous en avez ${activeOrganizer.length}). Passez en Premium dans l’onglet Profil.`,
      );
      return;
    }

    const cappedMax = Math.min(maxN, maxCapVal);

    const dateKey = toIsoDateKey(parsed);
    let targetConversationId: string;
    if (linkedConversationId) {
      if (!getConversation(linkedConversationId)) {
        alertMessage('Discussion', 'Cette conversation n’existe plus.');
        return;
      }
      targetConversationId = linkedConversationId;
    } else {
      targetConversationId = createEmptyGroup(`Sortie : ${t}`);
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addEvent({
      conversationId: targetConversationId,
      title: t,
      dateLabel: frenchShortDate(parsed),
      location: l,
      notes: description.trim() || undefined,
      timeShort: timeShortStr || '19:00',
      priceLabel: 'Gratuit',
      imageUri: imageUri ?? undefined,
      participantMax: cappedMax,
      dateKey,
      sectionDateLabel: frenchSectionLabel(parsed),
      cardStatus: 'organisateur',
      hideAddress,
      manualApproval,
      isBeta: isAdmin && markAsBeta,
    });
    postEventGroupWelcome(targetConversationId, t);
    router.back();
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#1a0f24', '#0d0d0f', '#000000']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}>
            <Ionicons name="close" size={26} color={Design.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Nouvelle Sortie</Text>
          <Pressable
            onPress={submit}
            hitSlop={12}
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}>
            <Text style={styles.headerCreateText}>Créer</Text>
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 48 },
          ]}>
          <Pressable
            onPress={pickImage}
            style={({ pressed }) => [styles.photoZone, pressed && { opacity: 0.92 }]}>
            {imageUri ? (
              <>
                <Image source={{ uri: imageUri }} style={styles.photoPreview} contentFit="cover" />
                <View style={styles.photoEditBadge}>
                  <Ionicons name="pencil" size={14} color="#fff" />
                  <Text style={styles.photoEditText}>Modifier</Text>
                </View>
              </>
            ) : (
              <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']} style={styles.photoPlaceholder}>
                <View style={styles.photoIconCircle}>
                  <Ionicons name="camera" size={32} color="#fff" />
                </View>
                <Text style={styles.photoHint}>Ajouter une photo de couverture</Text>
              </LinearGradient>
            )}
          </Pressable>

          <View style={styles.card}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Titre de l'événement"
              placeholderTextColor={MUTED}
              style={styles.titleCardInput}
              multiline
              maxLength={60}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.blockLabel}>Date et heure</Text>
            {Platform.OS === 'web' ? (
              <View style={styles.webDateRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.webDateHint}>Date</Text>
                  <TextInput
                    // @ts-ignore — type date (web)
                    type="date"
                    value={eventDate.toISOString().split('T')[0]}
                    onChange={(e: { nativeEvent: { text: string } }) => {
                      const v = e.nativeEvent.text;
                      if (v) {
                        const d = new Date(v);
                        if (!Number.isNaN(d.getTime())) {
                          setEventDate((prev) => {
                            const nd = new Date(prev);
                            nd.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                            return nd;
                          });
                        }
                      }
                    }}
                    style={[styles.webDateInput, { colorScheme: 'dark' } as object]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.webDateHint}>Heure</Text>
                  <TextInput
                    // @ts-ignore — type time (web)
                    type="time"
                    value={eventDate.toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                    onChange={(e: { nativeEvent: { text: string } }) => {
                      const v = e.nativeEvent.text;
                      if (v?.includes(':')) {
                        const [h, m] = v.split(':');
                        setEventDate((prev) => {
                          const nd = new Date(prev);
                          nd.setHours(parseInt(h, 10), parseInt(m, 10));
                          return nd;
                        });
                      }
                    }}
                    style={[styles.webDateInput, { colorScheme: 'dark' } as object]}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.wheelWrap}>
                <DateTimePicker
                  value={eventDate}
                  mode="datetime"
                  display="spinner"
                  themeVariant="dark"
                  minuteInterval={15}
                  onChange={(_, d) => {
                    if (d) setEventDate(d);
                  }}
                  locale="fr-FR"
                  style={styles.wheelPicker}
                />
              </View>
            )}
          </View>

          <View style={styles.lieuMaxRow}>
            <View style={styles.lieuCol}>
              <View style={styles.inlineLabelRow}>
                <Ionicons name="location-outline" size={18} color={Design.textPrimary} />
                <Text style={styles.inlineLabel}>Lieu</Text>
              </View>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Ex: Parc Monceau"
                placeholderTextColor={MUTED}
                style={styles.lieuField}
              />
            </View>
            <View style={styles.maxCol}>
              <View style={styles.inlineLabelRow}>
                <Ionicons name="people-outline" size={18} color={Design.textPrimary} />
                <Text style={styles.inlineLabel}>Max</Text>
              </View>
              <View style={styles.maxField}>
                <Text style={styles.maxFieldValue}>{maxParticipants}</Text>
                <View style={styles.stepper}>
                  <Pressable
                    onPress={() => bumpMax(1)}
                    hitSlop={6}
                    style={({ pressed }) => [styles.stepperBtn, pressed && { opacity: 0.6 }]}
                    disabled={
                      (Number.isFinite(parseInt(maxParticipants, 10))
                        ? parseInt(maxParticipants, 10)
                        : limits.maxParticipants) >= limits.maxParticipants
                    }>
                    <Ionicons name="chevron-up" size={18} color={Design.textPrimary} />
                  </Pressable>
                  <Pressable
                    onPress={() => bumpMax(-1)}
                    hitSlop={6}
                    style={({ pressed }) => [styles.stepperBtn, pressed && { opacity: 0.6 }]}
                    disabled={
                      (Number.isFinite(parseInt(maxParticipants, 10))
                        ? parseInt(maxParticipants, 10)
                        : 2) <= 2
                    }>
                    <Ionicons name="chevron-down" size={18} color={Design.textPrimary} />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>À PROPOS</Text>
            <View style={[styles.card, { paddingVertical: 12 }]}>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Ajoutez des détails, le déroulé, le matériel à prévoir..."
                placeholderTextColor={MUTED}
                multiline
                textAlignVertical="top"
                style={styles.textarea}
              />
            </View>
          </View>

          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>OPTIONS</Text>
            <View style={styles.card}>
              <View style={[styles.optionRow, styles.cardRowBorder]}>
                <View style={styles.optionBg}><Ionicons name="eye-off" size={18} color="#fff" /></View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionLabel}>Masquer l&apos;adresse</Text>
                  <Text style={styles.optionSubLabel}>Visible uniquement par les inscrits</Text>
                </View>
                <Switch
                  value={hideAddress}
                  onValueChange={setHideAddress}
                  trackColor={{ false: '#3a3a3c', true: ACCENT }}
                  thumbColor="#fff"
                />
              </View>
              <View style={[styles.optionRow, isAdmin ? styles.cardRowBorder : undefined]}>
                <View style={[styles.optionBg, { backgroundColor: '#F59E0B' }]}><Ionicons name="shield-checkmark" size={18} color="#fff" /></View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionLabel}>Validation manuelle</Text>
                  <Text style={styles.optionSubLabel}>Valider chaque inscription</Text>
                </View>
                <Switch
                  value={manualApproval}
                  onValueChange={setManualApproval}
                  trackColor={{ false: '#3a3a3c', true: '#F59E0B' }}
                  thumbColor="#fff"
                />
              </View>
              {isAdmin ? (
                <View style={styles.optionRow}>
                  <View style={[styles.optionBg, { backgroundColor: '#EC4899' }]}><Ionicons name="flask" size={18} color="#fff" /></View>
                  <View style={styles.optionTextWrap}>
                    <Text style={styles.optionLabel}>Sortie bêta</Text>
                    <Text style={styles.optionSubLabel}>Marquer comme pilote (admin)</Text>
                  </View>
                  <Switch
                    value={markAsBeta}
                    onValueChange={setMarkAsBeta}
                    trackColor={{ false: '#3a3a3c', true: '#EC4899' }}
                    thumbColor="#fff"
                  />
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.bottomActions}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.cancelBtnWrap, pressed && { opacity: 0.7 }]}>
              <View style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Annuler</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={submit}
              accessibilityRole="button"
              accessibilityLabel="Créer l'événement"
              style={({ pressed }) => [styles.createBtnWrap, pressed && { transform: [{ scale: 0.985 }] }]}>
              <LinearGradient
                pointerEvents="none"
                colors={[...BTN_GRADIENT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createBtn}>
                <Text style={styles.createText}>✨ Créer l&apos;événement</Text>
              </LinearGradient>
            </Pressable>
          </View>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Design.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  headerBtn: {
    minWidth: 60,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: Design.textPrimary,
    letterSpacing: 0.2,
  },
  headerCreateText: {
    color: ACCENT,
    fontSize: 17,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  photoZone: {
    width: '100%',
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  photoHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontWeight: '600',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  photoEditText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  titleCardInput: {
    minHeight: 64,
    fontSize: 20,
    fontWeight: '700',
    color: Design.textPrimary,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  blockLabel: {
    color: Design.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  webDateRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  webDateHint: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  webDateInput: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Design.textPrimary,
    fontSize: 15,
  },
  wheelWrap: {
    alignItems: 'stretch',
    paddingBottom: 8,
    overflow: 'hidden',
  },
  wheelPicker: {
    width: '100%',
    height: Platform.OS === 'ios' ? 220 : 200,
    alignSelf: 'center',
  },
  lieuMaxRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    alignItems: 'flex-end',
  },
  lieuCol: {
    flex: 7,
    minWidth: 0,
  },
  maxCol: {
    flex: 3,
    minWidth: 96,
  },
  inlineLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inlineLabel: {
    color: Design.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  lieuField: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: Design.textPrimary,
  },
  maxField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingLeft: 14,
    minHeight: 52,
  },
  maxFieldValue: {
    fontSize: 17,
    fontWeight: '800',
    color: Design.textPrimary,
  },
  stepper: {
    borderLeftWidth: 1,
    borderLeftColor: BORDER,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  stepperBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 24,
    overflow: 'hidden',
  },
  cardRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  cardSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: MUTED,
    marginBottom: 10,
    marginLeft: 16,
  },
  textarea: {
    minHeight: 100,
    fontSize: 16,
    color: Design.textPrimary,
    paddingHorizontal: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 14,
  },
  optionBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextWrap: {
    flex: 1,
  },
  optionLabel: {
    color: Design.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  optionSubLabel: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  cancelBtnWrap: {
    flex: 1,
  },
  cancelBtn: {
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelText: {
    color: Design.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  createBtnWrap: {
    flex: 2,
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
      ios: {
        shadowColor: '#C23B8E',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
      default: {},
    }),
  },
  createBtn: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
