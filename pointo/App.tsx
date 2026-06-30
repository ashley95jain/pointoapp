import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider } from './src/state/AppState';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <RootNavigator />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
