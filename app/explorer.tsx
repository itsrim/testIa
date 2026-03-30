import { Design } from '@/constants/design';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ThemeRow = {
  id: string;
  i18nKey: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
};

const THEME_ROWS: ThemeRow[] = [
  { id: 'yoga', i18nKey: 'home.themeYoga', color: '#C4B5FD', icon: 'body-outline', iconColor: '#4C1D95' },
  { id: 'meditation', i18nKey: 'home.themeMeditation', color: '#F9A8D4', icon: 'headset-outline', iconColor: '#9D174D' },
  { id: 'breath', i18nKey: 'home.themeBreath', color: '#93C5FD', icon: 'water-outline', iconColor: '#1E3A8A' },
  { id: 'posture', i18nKey: 'home.themePosture', color: '#6EE7B7', icon: 'accessibility-outline', iconColor: '#065F46' },
  { id: 'growth', i18nKey: 'home.themeGrowth', color: '#FDE68A', icon: 'people-outline', iconColor: '#92400E' },
  { id: 'fitness', i18nKey: 'home.themeFitness', color: '#FB923C', icon: 'barbell-outline', iconColor: '#7C2D12' },
  { id: 'sleep', i18nKey: 'home.themeSleep', color: '#818CF8', icon: 'moon-outline', iconColor: '#312E81' },
];

export default function ExplorerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={{ width: 44 }} />
        <Text style={styles.headerTitle}>{t('home.explorerTitle')}</Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.closeBtn}
          accessibilityLabel={t('home.explorerClose')}>
          <Ionicons name="close" size={28} color={Design.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}>
        {THEME_ROWS.map((row) => (
          <Pressable
            key={row.id}
            onPress={() => {
              router.back();
              setTimeout(() => router.push('/(tabs)/events'), 0);
            }}
            style={({ pressed }) => [styles.card, { backgroundColor: row.color }, pressed && { opacity: 0.92 }]}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.35)' }]}>
              <Ionicons name={row.icon} size={32} color={row.iconColor} />
            </View>
            <Text style={styles.cardTitle}>{t(row.i18nKey)}</Text>
            <Ionicons name="chevron-forward" size={22} color="rgba(0,0,0,0.35)" />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f1729',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: Design.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#1e1b4b',
  },
});
