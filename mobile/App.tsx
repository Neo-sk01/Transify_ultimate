import './global.css';

import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { Button } from '@/components/ui';
import { H1, Paragraph, Muted } from '@/components/ui';
import { EmergencyProvider, useEmergency } from '@/modules/evidence';
import { StealthCamera } from '@/components/StealthCamera';

function AppContent() {
  const { sessionId } = useEmergency();

  return (
    <View className="flex-1 items-center justify-center bg-background p-4">
      <StealthCamera sessionId={sessionId} />

      <H1 className="mb-2">TRANSRIFY</H1>
      <Paragraph className="mb-4 text-center">
        Secure Authentication Platform
      </Paragraph>
      <Muted className="mb-8 text-center">
        Your safety layer for banking and payments
      </Muted>

      <View className="w-full max-w-xs gap-3">
        <Button variant="default">Get Started</Button>
        <Button variant="outline">Learn More</Button>
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <EmergencyProvider>
      <AppContent />
    </EmergencyProvider>
  );
}
