import './global.css';
import 'react-native-gesture-handler';

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PinEntryScreen } from '@/screens/PinEntryScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProvider } from '@/context/ToastContext';
import { EmergencyProvider } from '@/modules/evidence';

const Stack = createStackNavigator();

// Test PIN: 123456 (normal) or 654321 (duress - triggers emergency)
function PinEntryWrapper({ navigation }: any) {
  const handleSubmit = async (pin: string) => {
    // For testing: accept 123456 as normal PIN, 654321 as duress
    if (pin === '123456' || pin === '654321') {
      navigation.replace('Dashboard');
      return { success: true };
    }
    return { success: false, error: 'Invalid PIN. Try 123456' };
  };

  return (
    <PinEntryScreen
      onSubmit={handleSubmit}
      title="TRANSRIFY"
      description="Enter your 6-digit PIN"
    />
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ToastProvider>
          <EmergencyProvider>
            <NavigationContainer>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="PinEntry" component={PinEntryWrapper} />
                <Stack.Screen name="Dashboard" component={DashboardScreen} />
              </Stack.Navigator>
            </NavigationContainer>
          </EmergencyProvider>
        </ToastProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
