import React, { useState, useRef, useCallback } from 'react';
import { View, TextInput, Keyboard, ActivityIndicator } from 'react-native';
import {
  Button,
  Card,
  CardHeader,
  CardDescription,
  CardContent,
  CardFooter,
  H1,
  Muted,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/components/ui';

const PIN_LENGTH = 6;

export interface PinEntryScreenProps {
  onSubmit: (pin: string) => Promise<{ success: boolean; error?: string }>;
  title?: string;
  description?: string;
  isLoading?: boolean;
}

export function PinEntryScreen({
  onSubmit,
  title = 'Enter PIN',
  description = 'Enter your 6-digit PIN to continue',
  isLoading: externalLoading = false,
}: PinEntryScreenProps) {
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const isLoading = externalLoading || isSubmitting;

  const handlePinChange = useCallback((value: string) => {
    // Only allow digits, max 6
    const digits = value.replace(/[^0-9]/g, '').slice(0, PIN_LENGTH);
    setPin(digits);
    
    if (error) {
      setError(null);
    }
  }, [error]);

  const handleSubmit = useCallback(async () => {
    if (pin.length !== PIN_LENGTH) {
      setError('Please enter all 6 digits');
      return;
    }

    Keyboard.dismiss();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await onSubmit(pin);
      
      if (!result.success) {
        setError(result.error || 'Authentication failed');
        setPin('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Authentication failed');
      setPin('');
      inputRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  }, [pin, onSubmit]);

  const handleClear = useCallback(() => {
    setPin('');
    setError(null);
    inputRef.current?.focus();
  }, []);

  const isPinComplete = pin.length === PIN_LENGTH;

  // Create masked display (dots for entered digits)
  const maskedDisplay = '•'.repeat(pin.length) + '○'.repeat(PIN_LENGTH - pin.length);

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center pb-2">
            <H1 className="mb-2 text-2xl">{title}</H1>
            <CardDescription className="text-center text-base">
              {description}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            {/* PIN Display */}
            <View className="items-center mb-6">
              <View className="flex-row justify-center gap-2 mb-4">
                {maskedDisplay.split('').map((char, index) => (
                  <View
                    key={index}
                    className={`w-10 h-12 rounded-lg border-2 items-center justify-center ${
                      index < pin.length ? 'border-primary bg-primary/10' : 'border-input'
                    }`}
                  >
                    <Muted className="text-2xl font-bold text-foreground">
                      {char}
                    </Muted>
                  </View>
                ))}
              </View>
              
              {/* Hidden input that captures keyboard */}
              <TextInput
                ref={inputRef}
                value={pin}
                onChangeText={handlePinChange}
                keyboardType="number-pad"
                maxLength={PIN_LENGTH}
                autoFocus
                secureTextEntry
                className="absolute opacity-0 w-full h-12"
                editable={!isLoading}
              />
              
              {/* Tap area to focus input */}
              <Muted className="text-sm">Tap here to enter PIN</Muted>
            </View>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="flex-col gap-4 pt-2">
            <Button
              variant="default"
              size="lg"
              className="w-full h-14"
              onPress={handleSubmit}
              disabled={!isPinComplete || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                'Verify PIN'
              )}
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12"
              onPress={handleClear}
              disabled={isLoading}
            >
              Clear
            </Button>
          </CardFooter>
        </Card>

        <Muted className="mt-6 text-center px-4">
          Your PIN is securely encrypted and never stored in plain text
        </Muted>
      </View>
    </View>
  );
}

export default PinEntryScreen;
