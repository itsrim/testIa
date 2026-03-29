import { Design } from '@/constants/design';
import { useMessaging } from '@/context/MessagingContext';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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

const INPUT_BG = '#1C1C1E';
const INPUT_BORDER = 'rgba(255,255,255,0.08)';
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

function FieldLabel({
  icon,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  children: string;
}) {
  return (
    <View style={styles.fieldLabelRow}>
      <Ionicons name={icon} size={15} color={MUTED} />
      <Text style={styles.fieldLabel}>{children}</Text>
    </View>
  );
}

export default function CreerSortieScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { conversations, addSortie } = useMessaging();

  const [title, setTitle] = useState('');
  const [dateFr, setDateFr] = useState('29/03/2026');
  const [timeShort, setTimeShort] = useState('19:00');
  const [location, setLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('20');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [hideAddress, setHideAddress] = useState(false);
  const [manualApproval, setManualApproval] = useState(false);
  const [conversationId, setConversationId] = useState(conversations[0]?.id ?? '');

  const convOptions = useMemo(() => conversations.slice(0, 12), [conversations]);

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
    const parsed = parseFrDate(dateFr);
    const maxN = parseInt(maxParticipants.trim(), 10);

    if (!conversationId) {
      Alert.alert('Discussion', 'Aucune conversation disponible pour lier l’événement.');
      return;
    }
    if (!t) {
      Alert.alert('Titre', 'Indiquez un titre pour votre événement.');
      return;
    }
    if (!parsed) {
      Alert.alert('Date', 'Utilisez le format JJ/MM/AAAA (ex. 29/03/2026).');
      return;
    }
    if (!l) {
      Alert.alert('Lieu', 'Indiquez un lieu ou un point de rendez-vous.');
      return;
    }
    if (!Number.isFinite(maxN) || maxN < 1) {
      Alert.alert('Participants', 'Indiquez un nombre maximum valide (ex. 20).');
      return;
    }

    const dateKey = toIsoDateKey(parsed);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addSortie({
      conversationId,
      title: t,
      dateLabel: frenchShortDate(parsed),
      location: l,
      notes: description.trim() || undefined,
      timeShort: timeShort.trim() || '19:00',
      priceLabel: 'Gratuit',
      imageUri: imageUri ?? undefined,
      participantMax: maxN,
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
          <Text style={styles.headerTitle}>Créer un événement</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 28 },
          ]}>
          <Pressable
            onPress={pickImage}
            style={({ pressed }) => [styles.photoZone, pressed && { opacity: 0.92 }]}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.photoPreview} contentFit="cover" />
            ) : (
              <>
                <LinearGradient colors={['#5B2D8C', '#8E44AD']} style={styles.photoIconBg}>
                  <Ionicons name="image-outline" size={28} color="#fff" />
                </LinearGradient>
                <Text style={styles.photoHint}>Ajouter une photo</Text>
                <Text style={styles.photoSub}>Appuyez pour choisir dans la galerie</Text>
              </>
            )}
          </Pressable>

          <FieldLabel icon="document-text-outline">Titre de l&apos;événement</FieldLabel>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ex : Soirée pizza entre amis"
            placeholderTextColor={MUTED}
            style={styles.input}
          />

          <View style={styles.row2}>
            <View style={styles.row2Col}>
              <FieldLabel icon="calendar-outline">Date</FieldLabel>
              <View style={styles.inputIconWrap}>
                <TextInput
                  value={dateFr}
                  onChangeText={setDateFr}
                  placeholder="JJ/MM/AAAA"
                  placeholderTextColor={MUTED}
                  keyboardType="numbers-and-punctuation"
                  style={[styles.input, styles.inputInRow]}
                />
                <Ionicons name="calendar-outline" size={18} color={MUTED} style={styles.inputTrailing} />
              </View>
            </View>
            <View style={styles.row2Col}>
              <FieldLabel icon="time-outline">Heure</FieldLabel>
              <View style={styles.inputIconWrap}>
                <TextInput
                  value={timeShort}
                  onChangeText={setTimeShort}
                  placeholder="19:00"
                  placeholderTextColor={MUTED}
                  style={[styles.input, styles.inputInRow]}
                />
                <Ionicons name="time-outline" size={18} color={MUTED} style={styles.inputTrailing} />
              </View>
            </View>
          </View>

          <View style={styles.rowLoc}>
            <View style={styles.rowLocMain}>
              <FieldLabel icon="location-outline">Lieu</FieldLabel>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Ex : Parc Monceau"
                placeholderTextColor={MUTED}
                style={styles.input}
              />
            </View>
            <View style={styles.rowLocMax}>
              <FieldLabel icon="people-outline">Max</FieldLabel>
              <TextInput
                value={maxParticipants}
                onChangeText={setMaxParticipants}
                placeholder="20"
                placeholderTextColor={MUTED}
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>
          </View>

          {convOptions.length > 0 ? (
            <>
              <Text style={styles.sectionKicker}>LIÉ À</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}>
                {convOptions.map((c) => {
                  const sel = c.id === conversationId;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setConversationId(c.id);
                      }}
                      style={({ pressed }) => [
                        styles.chip,
                        sel && styles.chipSelected,
                        pressed && { opacity: 0.88 },
                      ]}>
                      <Text style={[styles.chipText, sel && styles.chipTextSelected]} numberOfLines={1}>
                        {c.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          ) : null}

          <Text style={styles.descLabel}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Décrivez votre événement…"
            placeholderTextColor={MUTED}
            multiline
            textAlignVertical="top"
            style={[styles.input, styles.textarea]}
          />

          <Text style={styles.sectionKicker}>OPTIONS</Text>

          <View style={styles.optionCard}>
            <View style={styles.optionIcon}>
              <Ionicons name="eye-off-outline" size={20} color={ACCENT} />
            </View>
            <View style={styles.optionTextBlock}>
              <Text style={styles.optionTitle}>Masquer l&apos;adresse</Text>
              <Text style={styles.optionSub}>
                {hideAddress ? 'Ville ou zone affichée seulement' : 'Adresse visible par tous'}
              </Text>
            </View>
            <Switch
              value={hideAddress}
              onValueChange={setHideAddress}
              trackColor={{ false: '#3a3a3c', true: 'rgba(155, 93, 229, 0.45)' }}
              thumbColor={hideAddress ? ACCENT : '#888'}
            />
          </View>

          <View style={styles.optionCard}>
            <View style={styles.optionIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color={ACCENT} />
            </View>
            <View style={styles.optionTextBlock}>
              <Text style={styles.optionTitle}>Validation manuelle</Text>
              <Text style={styles.optionSub}>
                {manualApproval ? 'Vous validez chaque inscription' : 'Inscriptions automatiques'}
              </Text>
            </View>
            <Switch
              value={manualApproval}
              onValueChange={setManualApproval}
              trackColor={{ false: '#3a3a3c', true: 'rgba(155, 93, 229, 0.45)' }}
              thumbColor={manualApproval ? ACCENT : '#888'}
            />
          </View>

          <Pressable
            onPress={submit}
            style={({ pressed }) => [styles.publishWrap, pressed && { transform: [{ scale: 0.985 }] }]}>
            <LinearGradient
              colors={[...BTN_GRADIENT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.publishBtn}>
              <Text style={styles.publishText}>✨ Publier l&apos;événement</Text>
            </LinearGradient>
          </Pressable>
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
    width: 44,
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  photoZone: {
    minHeight: 148,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    minHeight: 160,
  },
  photoIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  photoHint: {
    color: Design.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  photoSub: {
    color: MUTED,
    fontSize: 13,
    marginTop: 4,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Design.textPrimary,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    marginBottom: 18,
  },
  inputInRow: {
    marginBottom: 0,
    paddingRight: 36,
  },
  inputIconWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputTrailing: {
    position: 'absolute',
    right: 14,
    top: '50%',
    marginTop: -9,
    pointerEvents: 'none',
  },
  row2: {
    flexDirection: 'row',
    gap: 12,
  },
  row2Col: {
    flex: 1,
  },
  rowLoc: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  rowLocMain: {
    flex: 1,
    minWidth: 0,
  },
  rowLocMax: {
    width: 76,
  },
  sectionKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: MUTED,
    marginBottom: 10,
    marginTop: 2,
  },
  chipsRow: {
    gap: 8,
    paddingBottom: 18,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    maxWidth: 200,
  },
  chipSelected: {
    borderColor: 'rgba(155, 93, 229, 0.65)',
    backgroundColor: 'rgba(155, 93, 229, 0.18)',
  },
  chipText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: Design.textPrimary,
  },
  descLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Design.textPrimary,
    marginBottom: 8,
  },
  textarea: {
    minHeight: 120,
    paddingTop: 14,
    marginBottom: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    marginBottom: 10,
    gap: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(155, 93, 229, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    color: Design.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  optionSub: {
    color: MUTED,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  publishWrap: {
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#C23B8E',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.45,
        shadowRadius: 22,
      },
      android: {
        elevation: 14,
      },
    }),
  },
  publishBtn: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
