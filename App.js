import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootRouter from './src/routers/RootRouter';
import { PoliticlearProvider } from './src/state/PoliticlearContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <SafeAreaProvider>
        <PoliticlearProvider>
          <RootRouter />
        </PoliticlearProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
