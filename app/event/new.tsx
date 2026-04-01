import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Design } from '@/constants/design';

/**
 * Ancienne route formulaire minimal — redirige vers la création complète avec les mêmes paramètres.
 */
export default function NewEventRedirect() {
  const { conversationId: rawConv, title: rawTitle } = useLocalSearchParams<{
    conversationId?: string;
    title?: string;
  }>();
  const router = useRouter();

  useEffect(() => {
    const conversationId = Array.isArray(rawConv) ? rawConv[0] : rawConv;
    const title = Array.isArray(rawTitle) ? rawTitle[0] : rawTitle;
    const params: { conversationId?: string; title?: string } = {};
    if (conversationId) params.conversationId = conversationId;
    if (title) params.title = title;
    router.replace(Object.keys(params).length ? { pathname: '/event/create', params } : '/event/create');
  }, [rawConv, rawTitle, router]);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Design.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Design.bg,
  },
});
