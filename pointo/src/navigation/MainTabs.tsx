import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/HomeScreen';
import { ReferralScreen } from '../screens/ReferralScreen';
import { WalkScreen } from '../screens/WalkScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { colors } from '../theme/colors';

export type MainTabsParamList = {
  Home: undefined;
  Walk: undefined;
  Refer: undefined;
  Wallet: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

type TabGlyph = 'home' | 'walk' | 'refer' | 'wallet';

const glyphs: Record<TabGlyph, string> = {
  home: '⌂',
  walk: '⏃',
  refer: '✦',
  wallet: '◉',
};

function TabIcon({ glyph, focused }: { glyph: TabGlyph; focused: boolean }) {
  return (
    <View style={[styles.iconWrapper, focused && styles.iconWrapperFocused]}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>
        {glyphs[glyph]}
      </Text>
    </View>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.textPrimary, fontWeight: '700' },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon glyph="home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Walk"
        component={WalkScreen}
        options={{
          title: 'Walk',
          tabBarIcon: ({ focused }) => <TabIcon glyph="walk" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Refer"
        component={ReferralScreen}
        options={{
          title: 'Refer',
          tabBarIcon: ({ focused }) => <TabIcon glyph="refer" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          title: 'Wallet',
          tabBarIcon: ({ focused }) => <TabIcon glyph="wallet" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  iconWrapperFocused: {
    backgroundColor: colors.background,
  },
  icon: {
    fontSize: 18,
    color: colors.textTertiary,
  },
  iconFocused: {
    color: colors.brand,
  },
});
