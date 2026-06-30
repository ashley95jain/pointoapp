import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider } from './src/state/AppState';
import { RootNavigator } from './src/navigation/RootNavigator';
import { HydrationGate } from './src/components/HydrationGate';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <HydrationGate>
          <RootNavigator />
        </HydrationGate>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
