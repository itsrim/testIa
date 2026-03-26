import { Design } from '@/constants/design';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: Design.contentBottomSpace }]}>
      <LinearGradient
        colors={['#5C6BC0', '#7E57C2']}
        style={styles.avatar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        <Text style={styles.avatarLetter}>T</Text>
      </LinearGradient>
      <Text style={styles.name}>Ton profil</Text>
      <Text style={styles.hint}>Écran profil — à connecter plus tard.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Design.bg,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarLetter: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '800',
  },
  name: {
    color: Design.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  hint: {
    color: Design.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
});
