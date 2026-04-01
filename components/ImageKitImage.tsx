import { IMAGEKIT_URL_ENDPOINT } from '@/constants/imagekit';
import { imageKitImageUri } from '@/lib/imagekitUrl';
import { Image, type ImageProps } from 'expo-image';
import type { StyleProp, ViewStyle } from 'react-native';

export type ImageKitImageProps = Omit<ImageProps, 'source'> & {
  /** Même rôle que dans la doc Next `@imagekit/next` (défaut : compte du projet). */
  urlEndpoint?: string;
  /** Chemin sur ImageKit (`/profile.png`) ou URL complète après upload. */
  src: string;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Équivalent Expo / React Native de l’exemple doc ImageKit + Next :
 * `<Image urlEndpoint="…" src="/profile.png" width height alt />`
 * Ici : `accessibilityLabel` remplace `alt`.
 */
export function ImageKitImage({
  urlEndpoint = IMAGEKIT_URL_ENDPOINT,
  src,
  width,
  height,
  style,
  accessibilityLabel,
  ...rest
}: ImageKitImageProps) {
  const uri = imageKitImageUri(src, urlEndpoint);
  return (
    <Image
      source={{ uri }}
      style={[{ width, height }, style]}
      accessibilityLabel={accessibilityLabel}
      {...rest}
    />
  );
}
