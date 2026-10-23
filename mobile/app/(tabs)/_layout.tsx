import React from 'react';
import { Stack } from 'expo-router';
import { theme } from '../../src/theme';

export default function TabsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.paper,
        },
        headerTintColor: theme.colors.ink,
        headerTitleStyle: {
          fontFamily: theme.fonts.serifSemiBold,
          fontSize: 18,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: theme.colors.paper,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false, // Custom masthead rendered within LedgerPage
        }}
      />
    </Stack>
  );
}
