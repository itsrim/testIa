import { useMessaging } from '@/context/MessagingContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { getConversation, addSortie } = useMessaging();

  const conversation = conversationId ? getConversation(conversationId) : undefined;

  const [title, setTitle] = useState('');
  const [dateLabel, setDateLabel] = useState('');
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
    });
    router.back();
  };

  if (!conversationId || !conversation) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.icon }}>Chargement…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 32,
        }}>
        <Text style={[styles.label, { color: colors.icon }]}>Discussion</Text>
        <Text style={[styles.convName, { color: colors.text }]}>{conversation.title}</Text>

        <Text style={[styles.label, { color: colors.icon, marginTop: 20 }]}>Titre de la sortie</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ex. Rando au salève"
          placeholderTextColor={colors.icon}
          style={[styles.field, { color: colors.text, backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f2f2f7' }]}
        />

        <Text style={[styles.label, { color: colors.icon, marginTop: 16 }]}>Date / heure</Text>
        <TextInput
          value={dateLabel}
          onChangeText={setDateLabel}
          placeholder="Ex. Dimanche 10:00"
          placeholderTextColor={colors.icon}
          style={[styles.field, { color: colors.text, backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f2f2f7' }]}
        />

        <Text style={[styles.label, { color: colors.icon, marginTop: 16 }]}>Lieu</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="Point de rendez-vous"
          placeholderTextColor={colors.icon}
          style={[styles.field, { color: colors.text, backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f2f2f7' }]}
        />

        <Text style={[styles.label, { color: colors.icon, marginTop: 16 }]}>Notes (optionnel)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Picnic, difficulté, matériel…"
          placeholderTextColor={colors.icon}
          multiline
          style={[
            styles.field,
            styles.notes,
            { color: colors.text, backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f2f2f7' },
          ]}
        />

        <Pressable
          onPress={submit}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: Colors.light.tint, opacity: pressed ? 0.85 : 1 },
          ]}>
          <Text style={styles.ctaText}>Enregistrer la sortie</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  convName: {
    fontSize: 17,
    fontWeight: '600',
  },
  field: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  notes: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  cta: {
    marginTop: 28,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
