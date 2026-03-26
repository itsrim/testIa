import { Stack } from 'expo-router';

export default function ChatIdLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000' },
      }}>
      <Stack.Screen name="index" options={{ headerShown: true }} />
      <Stack.Screen
        name="parametres"
        options={{
          presentation: 'transparentModal',
          animation: 'none',
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
