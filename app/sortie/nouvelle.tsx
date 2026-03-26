import { Design } from '@/constants/design';
import { useMessaging } from '@/context/MessagingContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NouvelleSortieScreen() {
  const { conversationId: rawConv } = useLocalSearchParams<{ conversationId: string }>();
  const conversationId = Array.isArray(rawConv) ? rawConv[0] : rawConv;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getConversation, addSortie } = useMessaging();

  const conversation = conversationId ? getConversation(conversationId) : undefined;

  const [title, setTitle] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [timeShort, setTimeShort] = useState('10:00');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!conversationId || !conversation) {
      Alert.alert('Erreur', 'Ouvrez cette page depuis une conversation.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, [conversation, conversationId, router]);

  const submit = () => {
    if (!conversationId) return;
    const t = title.trim();
    const d = dateLabel.trim();
    const l = location.trim();
    if (!t || !d || !l) {
      Alert.alert('Champs requis', 'Renseignez au moins le titre, la date et le lieu.');
      return;
    }
    addSortie({
      conversationId,
      title: t,
      dateLabel: d,
      location: l,
      notes: notes.trim() || undefined,
      timeShort: timeShort.trim() || '10:00',
      sectionDateLabel: d,
    });
    router.back();
  };

  if (!conversationId || !conversation) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Chargement…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 32,
        }}>
        <Text style={styles.label}>Discussion</Text>
        <Text style={styles.convName}>{conversation.title}</Text>

        <Text style={[styles.label, { marginTop: 20 }]}>Titre de la sortie</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ex. Rando au salève"
          placeholderTextColor={Design.textSecondary}
          style={styles.field}
        />

        <Text style={[styles.label, { marginTop: 16 }]}>Date</Text>
        <TextInput
          value={dateLabel}
          onChangeText={setDateLabel}
          placeholder="Ex. Jeudi 1 janvier"
          placeholderTextColor={Design.textSecondary}
          style={styles.field}
        />

        <Text style={[styles.label, { marginTop: 16 }]}>Heure (liste)</Text>
        <TextInput
          value={timeShort}
          onChangeText={setTimeShort}
          placeholder="08:00"
          placeholderTextColor={Design.textSecondary}
          style={styles.field}
        />

        <Text style={[styles.label, { marginTop: 16 }]}>Lieu</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="Point de rendez-vous"
          placeholderTextColor={Design.textSecondary}
          style={styles.field}
        />

        <Text style={[styles.label, { marginTop: 16 }]}>Notes (optionnel)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Picnic, difficulté, matériel…"
          placeholderTextColor={Design.textSecondary}
          multiline
          style={[styles.field, styles.notes]}
        />

        <View style={styles.ctaRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.ctaCancel, { opacity: pressed ? 0.85 : 1 }]}>
            <Text style={styles.ctaCancelText}>Annuler</Text>
          </Pressable>
          <Pressable
            onPress={submit}
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}>
            <Text style={styles.ctaText}>Valider</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Design.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Design.bg,
  },
  muted: {
    color: Design.textSecondary,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: Design.textSecondary,
  },
  convName: {
    fontSize: 17,
    fontWeight: '600',
    color: Design.textPrimary,
  },
  field: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Design.textPrimary,
    backgroundColor: '#1c1c1e',
  },
  notes: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  ctaRow: {
    marginTop: 28,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  ctaCancel: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2c2c2e',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#444',
  },
  ctaCancelText: {
    color: Design.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  cta: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a7ea4',
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
});
