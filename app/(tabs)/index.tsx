import { Design } from '@/constants/design';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
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

/** Positions déterministes (étoiles zone ciel, ~haut 36 %). */
const TWILIGHT_STARS = (() => {
  const out: { left: number; top: number; size: number; opacity: number }[] = [];
  for (let i = 0; i < 56; i++) {
    const left = ((i * 7919) % 940) / 10;
    const top = ((i * 4723) % 320) / 10;
    const size = i % 9 === 0 ? 2.8 : i % 5 === 0 ? 2 : 1.4;
    const opacity = 0.22 + ((i * 37) % 55) / 100;
    out.push({ left, top, size, opacity });
  }
  return out;
})();

function TwilightBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Nuit profonde → crépuscule (violet, rose, orange) */}
      <LinearGradient
        colors={[
          '#050510',
          '#0c0a22',
          '#1a1240',
          '#2d1a58',
          '#4a2870',
          '#6b3580',
          '#8f4578',
          '#b85a68',
          '#d97858',
          '#e8955a',
          '#f0b070',
          '#f8c896',
        ]}
        locations={[0, 0.08, 0.16, 0.26, 0.38, 0.48, 0.58, 0.68, 0.76, 0.84, 0.92, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Refroidit légèrement le haut (ciel étoilé) */}
      <LinearGradient
        colors={['rgba(5,5,20,0.75)', 'rgba(15,10,40,0.35)', 'transparent']}
        locations={[0, 0.22, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Étoiles — uniquement en partie supérieure */}
      <View style={styles.starsBand} pointerEvents="none">
        {TWILIGHT_STARS.map((s, i) => (
          <View
            key={i}
            style={[
              styles.starDot,
              {
                left: `${s.left}%`,
                top: `${s.top}%`,
                width: s.size,
                height: s.size,
                borderRadius: s.size / 2,
                opacity: s.opacity,
              },
            ]}
          />
        ))}
      </View>
      {/* Lisibilité du contenu en bas */}
      <LinearGradient
        colors={['transparent', 'rgba(8,6,24,0.35)', 'rgba(12,8,28,0.82)']}
        locations={[0.35, 0.72, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const [a1, setA1] = useState('');
  const [a2, setA2] = useState('');
  const [a3, setA3] = useState('');

  const goExplorer = () => {
    router.push('/explorer');
  };

  return (
    <View style={styles.root}>
      <TwilightBackground />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            style={styles.circleBtn}
            onPress={() => router.push('/(tabs)/profile')}
            accessibilityLabel={t('home.openProfile')}>
            <Ionicons name="person-outline" size={22} color="#fff" />
          </Pressable>
          <Pressable
            style={styles.circleBtn}
            onPress={() => router.push('/(tabs)/events')}
            accessibilityLabel={t('home.openSearch')}>
            <Ionicons name="search-outline" size={22} color="#fff" />
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollInner,
            { paddingBottom: insets.bottom + Design.contentBottomSpace },
          ]}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>{t('home.kicker')}</Text>
          <Text style={styles.title}>{t('home.title')}</Text>
          <Text style={styles.subtitle}>{t('home.subtitle')}</Text>

          <View style={styles.qBlock}>
            <Text style={styles.qLabel}>{t('home.q1')}</Text>
            <TextInput
              value={a1}
              onChangeText={setA1}
              placeholder={t('home.placeholder')}
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.input}
              multiline
            />
          </View>
          <View style={styles.qBlock}>
            <Text style={styles.qLabel}>{t('home.q2')}</Text>
            <TextInput
              value={a2}
              onChangeText={setA2}
              placeholder={t('home.placeholder')}
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.input}
              multiline
            />
          </View>
          <View style={styles.qBlock}>
            <Text style={styles.qLabel}>{t('home.q3')}</Text>
            <TextInput
              value={a3}
              onChangeText={setA3}
              placeholder={t('home.placeholder')}
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.input}
              multiline
            />
          </View>

          <Pressable
            onPress={goExplorer}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.primaryBtnTxt}>{t('home.continue')}</Text>
            <Ionicons name="arrow-forward" size={20} color="#1e1035" />
          </Pressable>

          <Pressable onPress={goExplorer} style={styles.skipBtn}>
            <Text style={styles.skipTxt}>{t('home.skip')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080818',
  },
  starsBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '36%',
  },
  starDot: {
    position: 'absolute',
    backgroundColor: '#ffffff',
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 2,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollInner: {
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  kicker: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 28,
  },
  qBlock: {
    marginBottom: 18,
  },
  qLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    minHeight: 52,
    textAlignVertical: 'top',
  },
  primaryBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FDE68A',
    paddingVertical: 16,
    borderRadius: 16,
  },
  primaryBtnTxt: {
    color: '#1e1035',
    fontSize: 16,
    fontWeight: '800',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipTxt: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    fontWeight: '600',
  },
});
