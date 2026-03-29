import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { GroupChatSettings } from '@/types/messaging';

/** Court « pop » pour message reçu */
const INCOMING_SOUND_URI =
  'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3';

let notificationHandlerSet = false;

function ensureNotificationHandler() {
  if (notificationHandlerSet) return;
  notificationHandlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export type IncomingMessageFeedbackOptions = {
  /** Nom affiché de l’expéditeur (ex. auteur du message) */
  senderLabel?: string;
};

/**
 * Son + notification locale pour un message **reçu**, selon les réglages de la discussion.
 */
export async function playIncomingMessageFeedback(
  messagePreview: string,
  settings: GroupChatSettings,
  threadTitle: string,
  options?: IncomingMessageFeedbackOptions,
): Promise<void> {
  const sender = options?.senderLabel;

  if (!settings.muteSounds) {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: INCOMING_SOUND_URI },
        { shouldPlay: true, volume: 0.42 },
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          void sound.unloadAsync();
        }
      });
    } catch {
      if (Platform.OS !== 'web') {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {
          /* */
        }
      }
    }
  }

  if (settings.blockNotifications) {
    return;
  }

  ensureNotificationHandler();

  try {
    if (Platform.OS === 'web') {
      const title = sender ? `${sender} — ${threadTitle}` : threadTitle;
      if (typeof window !== 'undefined') {
        window.alert(`${title}\n\n${messagePreview}`);
      }
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        /* */
      }
      return;
    }

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }

    if (granted) {
      const bodyRaw =
        messagePreview.length > 120 ? `${messagePreview.slice(0, 117)}…` : messagePreview;
      const body = sender ? `${sender}: ${bodyRaw}` : bodyRaw;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: threadTitle,
          subtitle: 'Nouveau message',
          body,
        },
        trigger: null,
      });
    }

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* */
    }
  } catch {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* */
    }
  }
}
