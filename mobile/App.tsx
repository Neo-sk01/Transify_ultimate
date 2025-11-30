import './global.css';
import 'react-native-gesture-handler';

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PinEntryScreen } from '@/screens/PinEntryScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProvider } from '@/context/ToastContext';
import { EmergencyProvider, useEmergency } from '@/modules/evidence';
import { supabase } from '@/lib/supabase';

const Stack = createStackNavigator();

// Test PIN: 123456 (normal) or 654321 (duress - triggers emergency)
function PinEntryWrapper({ navigation }: any) {
  const { startEmergencySession } = useEmergency();

  const handleSubmit = async (pin: string) => {
    const isDuress = pin === '654321';
    const isNormal = pin === '123456';

    if (!isNormal && !isDuress) {
      return { success: false, error: 'Invalid PIN. Try 123456' };
    }

    try {
      // Log the authentication attempt to audit_logs
      await supabase.from('audit_logs').insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Test user
        action: isDuress ? 'DURESS_PIN_ENTERED' : 'NORMAL_PIN_ENTERED',
        details: { timestamp: new Date().toISOString() },
      });

      // If duress PIN, start emergency session (stealth - no visible difference)
      if (isDuress) {
        const sessionId = `emergency-${Date.now()}`;
        await startEmergencySession(sessionId);
      }

      navigation.replace('Dashboard');
      return { success: true };
    } catch (error) {
      console.error('Auth error:', error);
      // Still allow login even if logging fails
      navigation.replace('Dashboard');
      return { success: true };
    }
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
