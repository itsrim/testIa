import { Design } from '@/constants/design';
import { useMessaging } from '@/context/MessagingContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NouvelleConversationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createEmptyGroup } = useMessaging();
  const [name, setName] = useState('');

  const cancel = () => router.back();

  const submit = () => {
    const t = name.trim();
    if (!t) {
      Alert.alert('Nom requis', 'Donnez un nom à votre groupe.');
      return;
    }
    const id = createEmptyGroup(t);
    router.replace(`/chat/${id}`);
  };

  return (
    <View style={styles.screen}>
      <Pressable style={styles.backdrop} onPress={cancel} accessibilityLabel="Fermer" />
      <View style={styles.foreground} pointerEvents="box-none">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
          pointerEvents="box-none">
          <View
            pointerEvents="auto"
            style={[
              styles.card,
              {
                marginBottom: Math.max(insets.bottom, 24),
                marginTop: Math.max(insets.top, 24),
              },
            ]}>
          <Text style={styles.title}>Créer un groupe</Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nom du groupe…"
            placeholderTextColor="#8E8E93"
            style={styles.input}
            autoFocus
            maxLength={80}
            returnKeyType="done"
            onSubmitEditing={submit}
            accessibilityLabel="Nom du groupe"
          />

          <View style={styles.actions}>
            <Pressable onPress={cancel} hitSlop={12} style={styles.btnCancelWrap} accessibilityRole="button">
              <Text style={styles.btnCancelText}>Annuler</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              style={({ pressed }) => [styles.btnCreateWrap, pressed && { opacity: 0.92 }]}
              accessibilityRole="button"
              accessibilityLabel="Créer le groupe">
              <LinearGradient
                colors={['#E8B923', '#F0A030', '#E85D75']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.btnCreateGradient}>
                <Text style={styles.btnCreateText}>Créer</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 0,
  },
  foreground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  keyboard: {
    width: '100%',
    maxWidth: 400,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Design.textPrimary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3a3a3c',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    gap: 12,
  },
  btnCancelWrap: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  btnCancelText: {
    color: '#AEAEB2',
    fontSize: 17,
    fontWeight: '700',
  },
  btnCreateWrap: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
    minWidth: 120,
  },
  btnCreateGradient: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCreateText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
