import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { Design } from '@/constants/design';
import { MessagingProvider } from '@/context/MessagingContext';
import { ProfileSettingsProvider } from '@/context/ProfileSettingsContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

const AppDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#0a7ea4',
    background: Design.bg,
    card: Design.bg,
    text: Design.textPrimary,
    border: '#333333',
    notification: Design.badgeRed,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <ThemeProvider value={dark ? AppDarkTheme : DefaultTheme}>
      <ProfileSettingsProvider>
        <MessagingProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: dark ? Design.bg : undefined },
            headerTintColor: dark ? Design.textPrimary : undefined,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: dark ? Design.bg : undefined },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="profil/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
          <Stack.Screen
            name="event/new"
            options={{
              presentation: 'modal',
              title: 'New event',
              headerBackTitle: 'Cancel',
            }}
          />
          <Stack.Screen
            name="event/create"
            options={{
              presentation: 'modal',
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="nouvelle-conversation"
            options={{
              presentation: 'modal',
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
        </Stack>
        <StatusBar style={dark ? 'light' : 'dark'} />
        </MessagingProvider>
      </ProfileSettingsProvider>
    </ThemeProvider>
  );
}
