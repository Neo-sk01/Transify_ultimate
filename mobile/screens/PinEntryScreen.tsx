import React, { useState, useRef, useCallback } from 'react';
import { View, TextInput, Pressable, Keyboard, ActivityIndicator } from 'react-native';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  H1,
  Muted,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/components/ui';
import { cn } from '@/lib/utils';

const PIN_LENGTH = 6;

export interface PinEntryScreenProps {
  /** Called when PIN is submitted - handles both normal and duress PINs identically */
  onSubmit: (pin: string) => Promise<{ success: boolean; error?: string }>;
  /** Optional title override */
  title?: string;
  /** Optional description override */
  description?: string;
  /** Whether to show loading state */
  isLoading?: boolean;
}

/**
 * PIN Entry Screen Component
 * 
 * Handles both normal and duress PIN submission with identical UI behavior.
 * Shows generic feedback only - no indication of PIN type.
 * 
 * Requirements: 1.1, 1.2, 11.2
 */
export function PinEntryScreen({
  onSubmit,
  title = 'Enter PIN',
  description = 'Enter your 6-digit PIN to continue',
  isLoading: externalLoading = false,
}: PinEntryScreenProps) {
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const isLoading = externalLoading || isSubmitting;

  const handleDigitChange = useCallback((index: number, value: string) => {
    // Only allow single digit
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    
    setPin(prev => {
      const newPin = [...prev];
      newPin[index] = digit;
      return newPin;
    });

    // Clear any previous error when user starts typing
    if (error) {
      setError(null);
    }

    // Auto-advance to next input
    if (digit && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [error]);

  const handleKeyPress = useCallback((index: number, key: string) => {
    // Handle backspace - move to previous input
    if (key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [pin]);

  const handleSubmit = useCallback(async () => {
    const fullPin = pin.join('');
    
    if (fullPin.length !== PIN_LENGTH) {
      setError('Please enter all 6 digits');
      return;
    }

    Keyboard.dismiss();
    setIsSubmitting(true);
    setError(null);

    try {
      // Generic response handling - no PIN type indication
      const result = await onSubmit(fullPin);
      
      if (!result.success) {
        // Generic error message - never reveals PIN type
        setError(result.error || 'Authentication failed');
        // Clear PIN on failure
        setPin(Array(PIN_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }
    } catch {
      // Generic error for any failure
      setError('Authentication failed');
      setPin(Array(PIN_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  }, [pin, onSubmit]);

  const handleClear = useCallback(() => {
    setPin(Array(PIN_LENGTH).fill(''));
    setError(null);
    inputRefs.current[0]?.focus();
  }, []);

  const isPinComplete = pin.every(digit => digit !== '');

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center p-4 pt-12">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center">
            <H1 className="mb-2">{title}</H1>
            <CardDescription className="text-center">
              {description}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* PIN Input Grid */}
            <View className="flex-row justify-center gap-2 mb-6">
              {Array.from({ length: PIN_LENGTH }).map((_, index) => (
                <PinDigitInput
                  key={index}
                  ref={el => { inputRefs.current[index] = el; }}
                  value={pin[index]}
                  onChangeText={value => handleDigitChange(index, value)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                  editable={!isLoading}
                  autoFocus={index === 0}
                />
              ))}
            </View>

            {/* Error Display - Generic message only */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Numeric Keypad */}
            <NumericKeypad
              onDigitPress={(digit) => {
                const emptyIndex = pin.findIndex(d => d === '');
                if (emptyIndex !== -1) {
                  handleDigitChange(emptyIndex, digit);
                }
              }}
              onBackspace={() => {
                const lastFilledIndex = pin.map((d, i) => d ? i : -1).filter(i => i !== -1).pop();
                if (lastFilledIndex !== undefined) {
                  handleDigitChange(lastFilledIndex, '');
                  inputRefs.current[lastFilledIndex]?.focus();
                }
              }}
              disabled={isLoading}
            />
          </CardContent>

          <CardFooter className="flex-col gap-3">
            <Button
              variant="default"
              className="w-full"
              onPress={handleSubmit}
              disabled={!isPinComplete || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                'Verify'
              )}
            </Button>
            
            <Button
              variant="ghost"
              className="w-full"
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


/**
 * Individual PIN digit input component
 */
interface PinDigitInputProps {
  value: string;
  onChangeText: (value: string) => void;
  onKeyPress: (event: { nativeEvent: { key: string } }) => void;
  editable?: boolean;
  autoFocus?: boolean;
}

const PinDigitInput = React.forwardRef<TextInput, PinDigitInputProps>(
  ({ value, onChangeText, onKeyPress, editable = true, autoFocus = false }, ref) => {
    return (
      <TextInput
        ref={ref}
        className={cn(
          'w-12 h-14 rounded-lg border-2 text-center text-2xl font-bold',
          'bg-background text-foreground',
          value ? 'border-primary' : 'border-input',
          !editable && 'opacity-50'
        )}
        value={value ? '•' : ''} // Show dot for entered digits (security)
        onChangeText={onChangeText}
        onKeyPress={onKeyPress}
        keyboardType="number-pad"
        maxLength={1}
        editable={editable}
        autoFocus={autoFocus}
        secureTextEntry={false} // We handle masking manually with dots
        selectTextOnFocus
        caretHidden
      />
    );
  }
);

PinDigitInput.displayName = 'PinDigitInput';

/**
 * Numeric keypad component for PIN entry
 */
interface NumericKeypadProps {
  onDigitPress: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}

function NumericKeypad({ onDigitPress, onBackspace, disabled = false }: NumericKeypadProps) {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'backspace'],
  ];

  return (
    <View className="gap-2">
      {keys.map((row, rowIndex) => (
        <View key={rowIndex} className="flex-row justify-center gap-2">
          {row.map((key, keyIndex) => {
            if (key === '') {
              return <View key={keyIndex} className="w-16 h-14" />;
            }

            if (key === 'backspace') {
              return (
                <Pressable
                  key={keyIndex}
                  className={cn(
                    'w-16 h-14 rounded-lg items-center justify-center',
                    'bg-secondary active:bg-accent',
                    disabled && 'opacity-50'
                  )}
                  onPress={onBackspace}
                  disabled={disabled}
                >
                  <BackspaceIcon />
                </Pressable>
              );
            }

            return (
              <Pressable
                key={keyIndex}
                className={cn(
                  'w-16 h-14 rounded-lg items-center justify-center',
                  'bg-secondary active:bg-accent',
                  disabled && 'opacity-50'
                )}
                onPress={() => onDigitPress(key)}
                disabled={disabled}
              >
                <Muted className="text-xl font-semibold text-foreground">{key}</Muted>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/**
 * Simple backspace icon component
 */
function BackspaceIcon() {
  return (
    <View className="flex-row items-center">
      <View className="w-0 h-0 border-t-[8px] border-b-[8px] border-r-[8px] border-t-transparent border-b-transparent border-r-muted-foreground" />
      <View className="w-4 h-4 bg-muted-foreground rounded-r-sm" />
    </View>
  );
}

export default PinEntryScreen;
