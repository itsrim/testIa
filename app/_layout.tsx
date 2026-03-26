import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { MessagingProvider } from '@/context/MessagingContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <MessagingProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="chat/[id]"
            options={{
              headerBackTitle: 'Retour',
            }}
          />
          <Stack.Screen
            name="sortie/nouvelle"
            options={{
              presentation: 'modal',
              title: 'Nouvelle sortie',
              headerBackTitle: 'Annuler',
            }}
          />
        </Stack>
        <StatusBar style="auto" />
      </MessagingProvider>
    </ThemeProvider>
  );
}
