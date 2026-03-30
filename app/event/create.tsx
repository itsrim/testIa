import { Design } from '@/constants/design';
import { useProfileSettings } from '@/context/ProfileSettingsContext';
import { useMessaging } from '@/context/MessagingContext';
import { todayDateKey } from '@/lib/todayDateKey';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

function parseFrDate(s: string): Date | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1;
  const year = parseInt(m[3], 10);
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
  return d;
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

function CardRow({ icon, children, border = true }: { icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode; border?: boolean }) {
  return (
    <View style={[styles.cardRow, border && styles.cardRowBorder]}>
      <Ionicons name={icon} size={20} color={MUTED} style={styles.cardRowIcon} />
      <View style={styles.cardRowContent}>{children}</View>
    </View>
  );
}

export default function CreateEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addEvent, events, createEmptyGroup } = useMessaging();
  const { getLimits, isPremium, isRestricted } = useProfileSettings();

  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date();
    const ms = 1000 * 60 * 15;
    return new Date(Math.ceil(d.getTime() / ms) * ms);
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
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
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [hideAddress, setHideAddress] = useState(false);
  const [manualApproval, setManualApproval] = useState(false);

  const pickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Accès photos', 'Autorisez l’accès à la bibliothèque pour ajouter une photo.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      void Haptics.selectionAsync();
      setImageUri(res.assets[0].uri);
    }
  }, []);

  const submit = () => {
    const t = title.trim();
    const l = location.trim();
    const parsed = eventDate;
    const timeShortStr = eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const maxN = parseInt(maxParticipants.trim(), 10);

    if (!t) {
      Alert.alert('Titre', 'Indiquez un titre pour votre événement.');
      return;
    }
    if (!l) {
      Alert.alert('Lieu', 'Indiquez un lieu ou un point de rendez-vous.');
      return;
    }
    if (!Number.isFinite(maxN) || maxN < 2 || maxN > 20) {
      Alert.alert('Participants', 'Le nombre de participants doit être entre 2 et 20.');
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
      Alert.alert(
        'Limite atteinte',
        `En mode gratuit vous ne pouvez avoir que ${limits.maxActiveEvents} sortie active à la fois (vous en avez ${activeOrganizer.length}). Passez en Premium dans l’onglet Profil.`,
      );
      return;
    }

    const maxCap = limits.maxParticipants;
    const cappedMax = Math.min(maxN, maxCap);

    const dateKey = toIsoDateKey(parsed);
    const discussionTitle = `Sortie : ${t}`;
    const newConvId = createEmptyGroup(discussionTitle);

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addEvent({
      conversationId: newConvId,
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
    });
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

          <View style={[styles.card, { flexDirection: 'row' }]}>
            <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: BORDER }}>
              <Pressable onPress={() => { void Haptics.selectionAsync(); setShowDatePicker(true); }} style={{ flex: 1 }}>
                <CardRow icon="calendar-outline" border={false}>
                  {Platform.OS === 'web' ? (
                    <TextInput
                      // @ts-ignore
                      type="date"
                      value={eventDate.toISOString().split('T')[0]}
                      onChange={(e: any) => {
                        const v = e.nativeEvent.text;
                        if (v) {
                          const d = new Date(v);
                          if (!isNaN(d.getTime())) {
                            setEventDate((prev) => {
                              const nd = new Date(prev);
                              nd.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                              return nd;
                            });
                          }
                        }
                      }}
                      style={[styles.cardInput, { paddingTop: 18, colorScheme: 'dark' } as any]}
                    />
                  ) : Platform.OS === 'ios' ? (
                    <DateTimePicker
                      value={eventDate}
                      mode="date"
                      display="default"
                      themeVariant="dark"
                      onChange={(e, d) => {
                        setShowDatePicker(false);
                        if (d) setEventDate(d);
                      }}
                      style={{ flex: 1, height: 40, alignSelf: 'flex-start' }}
                    />
                  ) : (
                    <Text style={[styles.cardInput, { paddingTop: 18 }]}>
                      {eventDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </Text>
                  )}
                </CardRow>
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <Pressable onPress={() => { void Haptics.selectionAsync(); setShowTimePicker(true); }} style={{ flex: 1 }}>
                <CardRow icon="time-outline" border={false}>
                  {Platform.OS === 'web' ? (
                    <TextInput
                      // @ts-ignore
                      type="time"
                      value={eventDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      onChange={(e: any) => {
                        const v = e.nativeEvent.text;
                        if (v && v.includes(':')) {
                          const [h, m] = v.split(':');
                          setEventDate((prev) => {
                            const nd = new Date(prev);
                            nd.setHours(parseInt(h, 10), parseInt(m, 10));
                            return nd;
                          });
                        }
                      }}
                      style={[styles.cardInput, { paddingTop: 18, colorScheme: 'dark' } as any]}
                    />
                  ) : Platform.OS === 'ios' ? (
                    <DateTimePicker
                      value={eventDate}
                      mode="time"
                      display="default"
                      themeVariant="dark"
                      minuteInterval={15}
                      onChange={(e, d) => {
                        setShowTimePicker(false);
                        if (d) setEventDate(d);
                      }}
                      style={{ flex: 1, height: 40, alignSelf: 'flex-start' }}
                    />
                  ) : (
                    <Text style={[styles.cardInput, { paddingTop: 18 }]}>
                      {eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </CardRow>
              </Pressable>
            </View>
          </View>

          {Platform.OS === 'android' && showDatePicker && (
            <DateTimePicker
              value={eventDate}
              mode="date"
              display="default"
              onChange={(e, d) => {
                setShowDatePicker(false);
                if (d) setEventDate(d);
              }}
            />
          )}

          {Platform.OS === 'android' && showTimePicker && (
            <DateTimePicker
              value={eventDate}
              mode="time"
              display="default"
              minuteInterval={15}
              onChange={(e, d) => {
                setShowTimePicker(false);
                if (d) setEventDate(d);
              }}
            />
          )}

          <View style={styles.card}>
            <CardRow icon="location-outline" border>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Lieu de la sortie"
                placeholderTextColor={MUTED}
                style={styles.cardInput}
              />
            </CardRow>
            <CardRow icon="people-outline" border={false}>
              <View style={styles.participantsRow}>
                <Text style={styles.participantsLabel}>Participants max</Text>
                <TextInput
                  value={maxParticipants}
                  onChangeText={setMaxParticipants}
                  placeholder="20"
                  placeholderTextColor={MUTED}
                  keyboardType="number-pad"
                  style={styles.participantsInput}
                  textAlign="right"
                  maxLength={2}
                />
              </View>
            </CardRow>
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
                  <Text style={styles.optionLabel}>Masquer l'adresse</Text>
                  <Text style={styles.optionSubLabel}>Visible uniquement par les inscrits</Text>
                </View>
                <Switch
                  value={hideAddress}
                  onValueChange={setHideAddress}
                  trackColor={{ false: '#3a3a3c', true: ACCENT }}
                  thumbColor="#fff"
                />
              </View>
              <View style={styles.optionRow}>
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
              style={({ pressed }) => [styles.createBtnWrap, pressed && { transform: [{ scale: 0.985 }] }]}>
              <LinearGradient
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
  card: {
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 24,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    minHeight: 56,
  },
  cardRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  cardRowIcon: {
    width: 24,
    textAlign: 'center',
    marginRight: 12,
  },
  cardRowContent: {
    flex: 1,
  },
  cardInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: Design.textPrimary,
    paddingRight: 16,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
  },
  participantsLabel: {
    color: Design.textPrimary,
    fontSize: 16,
  },
  participantsInput: {
    fontSize: 16,
    color: Design.textSecondary,
    fontWeight: '700',
    minWidth: 40,
    paddingVertical: 12,
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
      ios: {
        shadowColor: '#C23B8E',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
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
