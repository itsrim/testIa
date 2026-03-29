import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Design } from '@/constants/design';

const TAB_CONFIG: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap; iconActive?: keyof typeof Ionicons.glyphMap }
> = {
  index: { label: 'Home', icon: 'home-outline' },
  chat: { label: 'Chat', icon: 'chatbubble-outline' },
  events: { label: 'Event', icon: 'ticket-outline' },
  profile: { label: 'Profil', icon: 'person-outline' },
};

/** Rebond proche du cubic-bezier(0.34, 1.56, 0.64, 1) du CSS nel */
const bounceActive = () =>
  withSequence(
    withSpring(1.12, {
      damping: 5.5,
      stiffness: 460,
      mass: 0.38,
    }),
    withSpring(1.05, {
      damping: 14,
      stiffness: 360,
      mass: 0.45,
    }),
  );

const springInactive = () =>
  withSpring(1, {
    damping: 16,
    stiffness: 420,
    mass: 0.4,
  });

function TabBarItem({
  route,
  isFocused,
  descriptors,
  navigation,
}: {
  route: BottomTabBarProps['state']['routes'][number];
  isFocused: boolean;
  descriptors: BottomTabBarProps['descriptors'];
  navigation: BottomTabBarProps['navigation'];
}) {
  const { options } = descriptors[route.key];
  const cfg = TAB_CONFIG[route.name] ?? {
    label: options.title ?? route.name,
    icon: 'ellipse-outline' as keyof typeof Ionicons.glyphMap,
  };

  const scale = useSharedValue(isFocused ? 1.05 : 1);

  useEffect(() => {
    if (isFocused) {
      scale.value = bounceActive();
    } else {
      scale.value = springInactive();
    }
  }, [isFocused, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPress = () => {
    void Haptics.selectionAsync();
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={cfg.label}
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.92 }]}>
      <Animated.View style={[styles.item, isFocused && styles.itemActive, animStyle]}>
        {isFocused ? (
          <>
            <Ionicons name={cfg.icon} size={20} color={Design.tabActiveText} />
            <Text style={styles.labelActive}>{cfg.label}</Text>
          </>
        ) : (
          <Ionicons name={cfg.icon} size={22} color={Design.textPrimary} />
        )}
      </Animated.View>
    </Pressable>
  );
}

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 16);

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPad }]}>
      <View style={styles.pillOuter}>
        <View style={[styles.pillFill, Platform.OS === 'android' && styles.pillFillAndroid]} />
        {state.routes.map((route, index) => (
          <TabBarItem
            key={route.key}
            route={route}
            isFocused={state.index === index}
            descriptors={descriptors}
            navigation={navigation}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  pillOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 280,
    borderRadius: 50,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Design.tabBarBorder,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  pillFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
    backgroundColor: Design.tabBarBg,
  },
  pillFillAndroid: {
    backgroundColor: 'rgba(25, 30, 25, 0.98)',
  },
  item: {
    minWidth: 44,
    height: 44,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 8,
  },
  itemActive: {
    backgroundColor: Design.tabActiveBg,
    paddingHorizontal: 18,
    minWidth: 100,
    ...Platform.select({
      ios: {
        shadowColor: Design.tabActiveBg,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  labelActive: {
    color: Design.tabActiveText,
    fontSize: 14,
    fontWeight: '700',
  },
});
