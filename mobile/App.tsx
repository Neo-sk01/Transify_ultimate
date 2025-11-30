import './global.css';

import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@/components/ui';
import { H1, Paragraph, Muted } from '@/components/ui';
import { EmergencyProvider, useEmergency } from '@/modules/evidence';
import { StealthCamera } from '@/components/StealthCamera';
import { PinEntryScreen } from '@/screens/PinEntryScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { ConnectedPinEntryScreen } from '@/screens/ConnectedPinEntryScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProvider } from '@/context/ToastContext';

const Stack = createNativeStackNavigator();

function AppContent() {
  const { sessionId, uploadEvidence, startEmergencySession, stopEmergencySession } = useEmergency();

  return (
    <View className="flex-1 items-center justify-center bg-background p-4">
      <StealthCamera
        sessionId={sessionId}
        onVideoRecorded={(uri) => uploadEvidence('video', uri)}
        onAudioRecorded={(uri) => uploadEvidence('audio', uri)}
      />

      <H1 className="mb-2">TRANSRIFY</H1>
      <Paragraph className="mb-4 text-center">
        Secure Authentication Platform
      </Paragraph>
      <Muted className="mb-8 text-center">
        Your safety layer for banking and payments
      </Muted>

      <View className="w-full max-w-xs gap-3">
        <Button
          variant="default"
          onPress={() => {
            if (sessionId) {
              console.warn('Session already active, ignoring test start request');
              return;
            }
            console.log('Test Emergency button pressed');
            const testSessionId = `test-${Date.now()}`;
            startEmergencySession(testSessionId);
          }}
          disabled={!!sessionId}
        >
          🚨 Test Emergency (Dashboard Demo)
        </Button>
        <Button
          variant="outline"
          onPress={() => {
            if (sessionId) stopEmergencySession();
          }}
          disabled={!sessionId}
        >
          Stop Emergency
        </Button>
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <EmergencyProvider>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="PinEntry" component={PinEntryScreen} />
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
              <Stack.Screen name="ConnectedPinEntry" component={ConnectedPinEntryScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </EmergencyProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
