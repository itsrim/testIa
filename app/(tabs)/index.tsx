import { Design } from '@/constants/design';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Design.contentBottomSpace }]}>
      <LinearGradient
        colors={['#1a1a2e', Design.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.45 }}
      />
      <View style={styles.center}>
        <Text style={styles.logo}>testIa</Text>
        <Text style={styles.tag}>Accueil</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Design.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    color: Design.textPrimary,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  tag: {
    marginTop: 12,
    color: Design.textSecondary,
    fontSize: 16,
  },
});
