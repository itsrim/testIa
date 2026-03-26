import { Design } from '@/constants/design';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NouvelleConversationScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: 16, paddingBottom: insets.bottom + 24 }]}>
      <Text style={styles.title}>Nouvelle discussion</Text>
      <Text style={styles.hint}>
        Sélection de contacts ou création de groupe — à brancher sur ton backend plus tard.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Design.bg,
    paddingHorizontal: 20,
  },
  title: {
    color: Design.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  hint: {
    color: Design.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});
