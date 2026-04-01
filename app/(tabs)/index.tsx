import { useProfileSettings } from '@/context/ProfileSettingsContext';
import { Design } from '@/constants/design';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  appendQuestionnaireCheckin,
  getQuestionnaireLastSeenDate,
  markQuestionnaireSeenForDate,
  questionnaireLocalDateYMD,
} from '@/services/dataApi';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EMOJI_OPTIONS = [
  { emoji: '😄', key: 'great' },
  { emoji: '😊', key: 'good' },
  { emoji: '😐', key: 'ok' },
  { emoji: '😔', key: 'low' },
  { emoji: '😢', key: 'sad' },
  { emoji: '🥰', key: 'loved' },
  { emoji: '😴', key: 'tired' },
  { emoji: '😤', key: 'tense' },
  { emoji: '🌟', key: 'hope' },
] as const;

const BADGE_IDS = [
  'work',
  'money',
  'help',
  'illness',
  'tiredness',
  'pain',
  'happiness',
  'family',
  'love',
  'sport',
  'friends',
  'stress',
  'calm',
  'nature',
  'creativity',
] as const;

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
      <LinearGradient
        colors={['rgba(5,5,20,0.75)', 'rgba(15,10,40,0.35)', 'transparent']}
        locations={[0, 0.22, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={modalStyles.starsBand} pointerEvents="none">
        {TWILIGHT_STARS.map((s, i) => (
          <View
            key={i}
            style={[
              modalStyles.starDot,
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
  const { hideDailyQuestionnaire, settingsHydrated } = useProfileSettings();
  const [questionsVisible, setQuestionsVisible] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [noteToSelf, setNoteToSelf] = useState('');
  const [selectedEmojiKey, setSelectedEmojiKey] = useState<string | null>(null);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [q1Skipped, setQ1Skipped] = useState(false);
  const [q2Skipped, setQ2Skipped] = useState(false);

  const resetQuestionnaireForm = useCallback(() => {
    setStep(1);
    setNoteToSelf('');
    setSelectedEmojiKey(null);
    setSelectedBadgeId(null);
    setQ1Skipped(false);
    setQ2Skipped(false);
  }, []);

  const hapticLight = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const closeQuestions = () => {
    void markQuestionnaireSeenForDate(questionnaireLocalDateYMD());
    setQuestionsVisible(false);
    resetQuestionnaireForm();
  };

  const completeQuestionnaire = async (q3Skipped: boolean) => {
    hapticLight();
    const today = questionnaireLocalDateYMD();
    await appendQuestionnaireCheckin({
      date: today,
      emojiKey: selectedEmojiKey ?? '',
      badgeId: selectedBadgeId ?? '',
      message: noteToSelf.trim(),
      q1Skipped,
      q2Skipped,
      q3Skipped,
    });
    await markQuestionnaireSeenForDate(today);
    setQuestionsVisible(false);
    resetQuestionnaireForm();
  };

  useEffect(() => {
    if (hideDailyQuestionnaire) setQuestionsVisible(false);
  }, [hideDailyQuestionnaire]);

  useFocusEffect(
    useCallback(() => {
      if (!settingsHydrated) return;
      let cancelled = false;
      (async () => {
        if (hideDailyQuestionnaire) {
          if (!cancelled) setQuestionsVisible(false);
          return;
        }
        const last = await getQuestionnaireLastSeenDate();
        const today = questionnaireLocalDateYMD();
        if (cancelled) return;
        if (last === today) {
          setQuestionsVisible(false);
        } else {
          resetQuestionnaireForm();
          setQuestionsVisible(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [settingsHydrated, hideDailyQuestionnaire, resetQuestionnaireForm]),
  );

  const stepTitle =
    step === 1 ? t('home.q1Title') : step === 2 ? t('home.q2Title') : t('home.q3Title');
  const stepSubtitle =
    step === 1
      ? t('home.subtitleStep1')
      : step === 2
        ? t('home.q2Hint')
        : t('home.q3Subtitle');

  return (
    <View style={styles.mainRoot}>
      <View style={[styles.themesRoot, { paddingTop: insets.top }]}>
        <View style={styles.themesHeader}>
          <Pressable
            style={styles.themesHeaderBtn}
            onPress={() => router.push('/(tabs)/profile')}
            accessibilityLabel={t('home.openProfile')}>
            <Ionicons name="person-outline" size={22} color={Design.textPrimary} />
          </Pressable>
          <Text style={styles.themesHeaderTitle}>{t('home.explorerTitle')}</Text>
          <Pressable
            style={styles.themesHeaderBtn}
            onPress={() => router.push('/(tabs)/events')}
            accessibilityLabel={t('home.openSearch')}>
            <Ionicons name="search-outline" size={24} color={Design.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.themesScroll, { paddingBottom: insets.bottom + Design.contentBottomSpace }]}
          showsVerticalScrollIndicator={false}>
          {THEME_ROWS.map((row) => (
            <Pressable
              key={row.id}
              onPress={() => router.push('/(tabs)/events')}
              style={({ pressed }) => [styles.themeCard, { backgroundColor: row.color }, pressed && { opacity: 0.92 }]}>
              <View style={[styles.themeIconCircle, { backgroundColor: 'rgba(255,255,255,0.35)' }]}>
                <Ionicons name={row.icon} size={32} color={row.iconColor} />
              </View>
              <Text style={styles.themeCardTitle}>{t(row.i18nKey)}</Text>
              <Ionicons name="chevron-forward" size={22} color="rgba(0,0,0,0.35)" />
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <Modal
        visible={questionsVisible}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          hapticLight();
          closeQuestions();
        }}>
        <View style={modalStyles.modalRoot}>
          <TwilightBackground />

          <KeyboardAvoidingView
            style={modalStyles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={insets.top}>
            <View style={[modalStyles.modalTopBar, { paddingTop: insets.top + 8 }]}>
              <View style={{ flex: 1 }} />
              <Pressable
                onPress={() => {
                  hapticLight();
                  closeQuestions();
                }}
                hitSlop={12}
                style={modalStyles.modalCloseBtn}
                accessibilityLabel={t('home.questionsClose')}
                accessibilityRole="button">
                <Ionicons name="close" size={30} color="#fff" />
              </Pressable>
            </View>

            <ScrollView
              style={modalStyles.modalScroll}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                modalStyles.scrollInner,
                {
                  flexGrow: 1,
                  justifyContent: 'center',
                  paddingBottom: insets.bottom + Design.contentBottomSpace,
                },
              ]}
              showsVerticalScrollIndicator={false}>
              <Text style={modalStyles.kicker}>{t('home.kicker')}</Text>
              <Text style={modalStyles.stepBadge}>{t('home.stepOf', { n: step })}</Text>
              <Text style={modalStyles.title}>{stepTitle}</Text>
              <Text style={modalStyles.subtitle}>{stepSubtitle}</Text>

              {step === 1 && (
                <View style={modalStyles.emojiWrap}>
                  {EMOJI_OPTIONS.map(({ emoji, key }) => (
                    <Pressable
                      key={key}
                      onPress={() => {
                        hapticLight();
                        setSelectedEmojiKey(key);
                        setQ1Skipped(false);
                        setStep(2);
                      }}
                      style={({ pressed }) => [modalStyles.emojiBtn, pressed && { opacity: 0.85 }]}
                      accessibilityLabel={t(`home.mood.${key}`)}
                      accessibilityRole="button">
                      <Text style={modalStyles.emojiTxt}>{emoji}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {step === 2 && (
                <View style={modalStyles.badgeWrap}>
                  {BADGE_IDS.map((id) => (
                    <Pressable
                      key={id}
                      onPress={() => {
                        hapticLight();
                        setSelectedBadgeId(id);
                        setQ2Skipped(false);
                        setStep(3);
                      }}
                      style={({ pressed }) => [modalStyles.badgeChip, pressed && { opacity: 0.9 }]}
                      accessibilityRole="button">
                      <Text style={modalStyles.badgeTxt}>{t(`home.badges.${id}`)}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {step === 3 && (
                <View style={modalStyles.qBlock}>
                  <TextInput
                    value={noteToSelf}
                    onChangeText={setNoteToSelf}
                    placeholder={t('home.q3Placeholder')}
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    style={modalStyles.input}
                    multiline
                  />
                </View>
              )}

              <View style={modalStyles.actions}>
                {step === 3 && (
                  <Pressable
                    onPress={() => void completeQuestionnaire(false)}
                    style={({ pressed }) => [modalStyles.primaryBtn, pressed && { opacity: 0.9 }]}>
                    <Text style={modalStyles.primaryBtnTxt}>{t('home.continue')}</Text>
                    <Ionicons name="checkmark" size={22} color="#1e1035" />
                  </Pressable>
                )}

                {(step === 1 || step === 2) && (
                  <Pressable
                    onPress={() => {
                      hapticLight();
                      if (step === 1) {
                        setQ1Skipped(true);
                        setSelectedEmojiKey(null);
                        setStep(2);
                      } else {
                        setQ2Skipped(true);
                        setSelectedBadgeId(null);
                        setStep(3);
                      }
                    }}
                    style={modalStyles.skipBtn}>
                    <Text style={modalStyles.skipTxt}>{t('home.skip')}</Text>
                  </Pressable>
                )}

                {step === 3 && (
                  <Pressable
                    onPress={() => void completeQuestionnaire(true)}
                    style={modalStyles.skipBtn}>
                    <Text style={modalStyles.skipTxt}>{t('home.skip')}</Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainRoot: {
    flex: 1,
    backgroundColor: '#0f1729',
  },
  themesRoot: {
    flex: 1,
  },
  themesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  themesHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themesHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    color: Design.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  themesScroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 14,
  },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 16,
    marginBottom: 14,
  },
  themeIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#1e1b4b',
  },
});

const modalStyles = StyleSheet.create({
  modalRoot: {
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
  modalScroll: {
    flex: 1,
  },
  modalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 2,
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  scrollInner: {
    paddingHorizontal: 22,
    paddingTop: 8,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  kicker: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    color: 'rgba(253,230,138,0.95)',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  title: {
    color: '#fff',
    fontSize: 26,
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
    marginBottom: 22,
  },
  emojiWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  emojiBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiTxt: {
    fontSize: 30,
  },
  badgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  badgeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  badgeTxt: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
  },
  qBlock: {
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
    minHeight: 120,
    textAlignVertical: 'top',
  },
  actions: {
    marginTop: 8,
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
