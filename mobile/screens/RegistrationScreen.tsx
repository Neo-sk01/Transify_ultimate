import React, { useState, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  H1,
  H2,
  Paragraph,
  Muted,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/components/ui';
import { cn } from '@/lib/utils';

const PIN_LENGTH = 6;

type RegistrationStep = 'consent' | 'personal' | 'normal-pin' | 'duress-pin' | 'confirm';

export interface RegistrationData {
  nationalId: string;
  fullName: string;
  email: string;
  phone: string;
  normalPin: string;
  duressPin: string;
  consents: {
    dataProcessing: boolean;
    emergencyNotifications: boolean;
    termsOfService: boolean;
  };
}

export interface RegistrationScreenProps {
  /** Called when registration is submitted */
  onSubmit: (data: RegistrationData) => Promise<{ success: boolean; error?: string }>;
  /** Called when user cancels registration */
  onCancel?: () => void;
}

/**
 * User Registration Flow Screen
 * 
 * Multi-step registration with consent collection and PIN setup.
 * 
 * Requirements: 10.1, 11.2
 */
export function RegistrationScreen({
  onSubmit,
  onCancel,
}: RegistrationScreenProps) {
  const [step, setStep] = useState<RegistrationStep>('consent');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [consents, setConsents] = useState({
    dataProcessing: false,
    emergencyNotifications: false,
    termsOfService: false,
  });
  const [personalInfo, setPersonalInfo] = useState({
    nationalId: '',
    fullName: '',
    email: '',
    phone: '',
  });
  const [normalPin, setNormalPin] = useState('');
  const [duressPin, setDuressPin] = useState('');

  const handleNext = useCallback(() => {
    setError(null);
    
    switch (step) {
      case 'consent':
        if (!consents.dataProcessing || !consents.emergencyNotifications || !consents.termsOfService) {
          setError('Please accept all required consents to continue');
          return;
        }
        setStep('personal');
        break;
      case 'personal':
        if (!personalInfo.nationalId.trim() || !personalInfo.fullName.trim()) {
          setError('National ID and full name are required');
          return;
        }
        if (!personalInfo.email.trim() && !personalInfo.phone.trim()) {
          setError('Email or phone number is required');
          return;
        }
        setStep('normal-pin');
        break;
      case 'normal-pin':
        if (normalPin.length !== PIN_LENGTH) {
          setError('Please enter a 6-digit PIN');
          return;
        }
        setStep('duress-pin');
        break;
      case 'duress-pin':
        if (duressPin.length !== PIN_LENGTH) {
          setError('Please enter a 6-digit duress PIN');
          return;
        }
        if (duressPin === normalPin) {
          setError('Duress PIN must be different from your normal PIN');
          return;
        }
        setStep('confirm');
        break;
      case 'confirm':
        handleSubmit();
        break;
    }
  }, [step, consents, personalInfo, normalPin, duressPin]);

  const handleBack = useCallback(() => {
    setError(null);
    switch (step) {
      case 'personal':
        setStep('consent');
        break;
      case 'normal-pin':
        setStep('personal');
        break;
      case 'duress-pin':
        setStep('normal-pin');
        break;
      case 'confirm':
        setStep('duress-pin');
        break;
    }
  }, [step]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await onSubmit({
        ...personalInfo,
        normalPin,
        duressPin,
        consents,
      });

      if (!result.success) {
        setError(result.error || 'Registration failed');
      }
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [personalInfo, normalPin, duressPin, consents, onSubmit]);

  const renderStepIndicator = () => {
    const steps: RegistrationStep[] = ['consent', 'personal', 'normal-pin', 'duress-pin', 'confirm'];
    const currentIndex = steps.indexOf(step);

    return (
      <View className="flex-row justify-center mb-6 gap-2">
        {steps.map((s, index) => (
          <View
            key={s}
            className={cn(
              'w-3 h-3 rounded-full',
              index <= currentIndex ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 p-4">
        <View className="items-center mb-4 pt-8">
          <H1>Create Account</H1>
        </View>

        {renderStepIndicator()}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'consent' && (
          <ConsentStep
            consents={consents}
            onConsentsChange={setConsents}
          />
        )}

        {step === 'personal' && (
          <PersonalInfoStep
            data={personalInfo}
            onChange={setPersonalInfo}
          />
        )}

        {step === 'normal-pin' && (
          <PinSetupStep
            title="Set Your PIN"
            description="This PIN will be used for normal authentication"
            pin={normalPin}
            onPinChange={setNormalPin}
          />
        )}

        {step === 'duress-pin' && (
          <PinSetupStep
            title="Set Your Duress PIN"
            description="Use this PIN if you're ever in danger. It will appear to work normally but will alert emergency services."
            pin={duressPin}
            onPinChange={setDuressPin}
            warning="Keep this PIN secret. Never share it with anyone."
          />
        )}

        {step === 'confirm' && (
          <ConfirmationStep
            personalInfo={personalInfo}
            consents={consents}
          />
        )}

        {/* Navigation Buttons */}
        <View className="flex-row gap-3 mt-6 mb-8">
          {step !== 'consent' && (
            <Button
              variant="outline"
              className="flex-1"
              onPress={handleBack}
              disabled={isSubmitting}
            >
              Back
            </Button>
          )}
          
          {step === 'consent' && onCancel && (
            <Button
              variant="outline"
              className="flex-1"
              onPress={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}

          <Button
            variant="default"
            className="flex-1"
            onPress={handleNext}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" size="small" />
            ) : step === 'confirm' ? (
              'Complete Registration'
            ) : (
              'Continue'
            )}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}


/**
 * Consent collection step
 */
interface ConsentStepProps {
  consents: {
    dataProcessing: boolean;
    emergencyNotifications: boolean;
    termsOfService: boolean;
  };
  onConsentsChange: (consents: ConsentStepProps['consents']) => void;
}

function ConsentStep({ consents, onConsentsChange }: ConsentStepProps) {
  const toggleConsent = (key: keyof typeof consents) => {
    onConsentsChange({ ...consents, [key]: !consents[key] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consent & Privacy</CardTitle>
        <CardDescription>
          Please review and accept the following to continue
        </CardDescription>
      </CardHeader>

      <CardContent className="gap-4">
        <ConsentCheckbox
          checked={consents.dataProcessing}
          onToggle={() => toggleConsent('dataProcessing')}
          title="Data Processing Consent"
          description="I consent to TRANSRIFY processing my personal data for authentication and security purposes as described in the Privacy Policy."
          required
        />

        <ConsentCheckbox
          checked={consents.emergencyNotifications}
          onToggle={() => toggleConsent('emergencyNotifications')}
          title="Emergency Notifications"
          description="I consent to TRANSRIFY sending emergency notifications to my designated contacts when I use my duress PIN."
          required
        />

        <ConsentCheckbox
          checked={consents.termsOfService}
          onToggle={() => toggleConsent('termsOfService')}
          title="Terms of Service"
          description="I have read and agree to the Terms of Service and Privacy Policy."
          required
        />
      </CardContent>

      <CardFooter>
        <Muted className="text-xs">
          Your data is protected under POPIA and GDPR regulations. You can withdraw consent at any time.
        </Muted>
      </CardFooter>
    </Card>
  );
}

/**
 * Consent checkbox component
 */
interface ConsentCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  title: string;
  description: string;
  required?: boolean;
}

function ConsentCheckbox({ checked, onToggle, title, description, required }: ConsentCheckboxProps) {
  return (
    <Pressable
      className="flex-row items-start gap-3"
      onPress={onToggle}
    >
      <View
        className={cn(
          'w-6 h-6 rounded border-2 items-center justify-center mt-0.5',
          checked ? 'bg-primary border-primary' : 'border-input'
        )}
      >
        {checked && (
          <View className="w-3 h-3 bg-primary-foreground rounded-sm" />
        )}
      </View>
      <View className="flex-1">
        <Paragraph className="font-medium">
          {title}
          {required && <Muted className="text-destructive"> *</Muted>}
        </Paragraph>
        <Muted className="mt-1">{description}</Muted>
      </View>
    </Pressable>
  );
}

/**
 * Personal information step
 */
interface PersonalInfoStepProps {
  data: {
    nationalId: string;
    fullName: string;
    email: string;
    phone: string;
  };
  onChange: (data: PersonalInfoStepProps['data']) => void;
}

function PersonalInfoStep({ data, onChange }: PersonalInfoStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>
          Enter your details for account verification
        </CardDescription>
      </CardHeader>

      <CardContent className="gap-4">
        <Input
          label="National ID / Passport Number"
          placeholder="Enter your ID number"
          value={data.nationalId}
          onChangeText={(text) => onChange({ ...data, nationalId: text })}
          autoCapitalize="characters"
        />

        <Input
          label="Full Name"
          placeholder="Enter your full name"
          value={data.fullName}
          onChangeText={(text) => onChange({ ...data, fullName: text })}
          autoCapitalize="words"
        />

        <Input
          label="Email Address"
          placeholder="your@email.com"
          value={data.email}
          onChangeText={(text) => onChange({ ...data, email: text })}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="Phone Number"
          placeholder="+27 12 345 6789"
          value={data.phone}
          onChangeText={(text) => onChange({ ...data, phone: text })}
          keyboardType="phone-pad"
        />
      </CardContent>

      <CardFooter>
        <Muted className="text-xs">
          Your personal information is encrypted and stored securely.
        </Muted>
      </CardFooter>
    </Card>
  );
}

/**
 * PIN setup step
 */
interface PinSetupStepProps {
  title: string;
  description: string;
  pin: string;
  onPinChange: (pin: string) => void;
  warning?: string;
}

function PinSetupStep({ title, description, pin, onPinChange, warning }: PinSetupStepProps) {
  const handleDigitPress = (digit: string) => {
    if (pin.length < PIN_LENGTH) {
      onPinChange(pin + digit);
    }
  };

  const handleBackspace = () => {
    onPinChange(pin.slice(0, -1));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent>
        {/* PIN Display */}
        <View className="flex-row justify-center gap-2 mb-6">
          {Array.from({ length: PIN_LENGTH }).map((_, index) => (
            <View
              key={index}
              className={cn(
                'w-12 h-14 rounded-lg border-2 items-center justify-center',
                index < pin.length ? 'border-primary bg-primary/10' : 'border-input'
              )}
            >
              {index < pin.length && (
                <View className="w-3 h-3 rounded-full bg-primary" />
              )}
            </View>
          ))}
        </View>

        {warning && (
          <Alert className="mb-4">
            <AlertDescription>{warning}</AlertDescription>
          </Alert>
        )}

        {/* Numeric Keypad */}
        <View className="gap-2">
          {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', 'back']].map((row, rowIndex) => (
            <View key={rowIndex} className="flex-row justify-center gap-2">
              {row.map((key, keyIndex) => {
                if (key === '') {
                  return <View key={keyIndex} className="w-16 h-14" />;
                }
                if (key === 'back') {
                  return (
                    <Pressable
                      key={keyIndex}
                      className="w-16 h-14 rounded-lg bg-secondary items-center justify-center active:bg-accent"
                      onPress={handleBackspace}
                    >
                      <Muted className="text-lg">⌫</Muted>
                    </Pressable>
                  );
                }
                return (
                  <Pressable
                    key={keyIndex}
                    className="w-16 h-14 rounded-lg bg-secondary items-center justify-center active:bg-accent"
                    onPress={() => handleDigitPress(key)}
                  >
                    <Paragraph className="text-xl font-semibold">{key}</Paragraph>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </CardContent>
    </Card>
  );
}

/**
 * Confirmation step
 */
interface ConfirmationStepProps {
  personalInfo: {
    nationalId: string;
    fullName: string;
    email: string;
    phone: string;
  };
  consents: {
    dataProcessing: boolean;
    emergencyNotifications: boolean;
    termsOfService: boolean;
  };
}

function ConfirmationStep({ personalInfo, consents }: ConfirmationStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm Registration</CardTitle>
        <CardDescription>
          Please review your information before completing registration
        </CardDescription>
      </CardHeader>

      <CardContent className="gap-4">
        <View>
          <H2 className="text-base mb-2">Personal Information</H2>
          <View className="gap-1">
            <InfoRow label="Name" value={personalInfo.fullName} />
            <InfoRow label="ID" value={personalInfo.nationalId} masked />
            {personalInfo.email && <InfoRow label="Email" value={personalInfo.email} />}
            {personalInfo.phone && <InfoRow label="Phone" value={personalInfo.phone} />}
          </View>
        </View>

        <View>
          <H2 className="text-base mb-2">Consents</H2>
          <View className="gap-1">
            <ConsentRow label="Data Processing" accepted={consents.dataProcessing} />
            <ConsentRow label="Emergency Notifications" accepted={consents.emergencyNotifications} />
            <ConsentRow label="Terms of Service" accepted={consents.termsOfService} />
          </View>
        </View>

        <View>
          <H2 className="text-base mb-2">Security</H2>
          <View className="gap-1">
            <InfoRow label="Normal PIN" value="••••••" />
            <InfoRow label="Duress PIN" value="••••••" />
          </View>
        </View>
      </CardContent>

      <CardFooter>
        <Muted className="text-xs">
          By completing registration, you confirm that all information is accurate.
        </Muted>
      </CardFooter>
    </Card>
  );
}

function InfoRow({ label, value, masked }: { label: string; value: string; masked?: boolean }) {
  const displayValue = masked ? value.slice(0, 3) + '****' + value.slice(-2) : value;
  return (
    <View className="flex-row">
      <Muted className="w-20">{label}:</Muted>
      <Paragraph className="flex-1">{displayValue}</Paragraph>
    </View>
  );
}

function ConsentRow({ label, accepted }: { label: string; accepted: boolean }) {
  return (
    <View className="flex-row items-center">
      <Muted className="flex-1">{label}</Muted>
      <Paragraph className={accepted ? 'text-green-600' : 'text-destructive'}>
        {accepted ? '✓ Accepted' : '✗ Not accepted'}
      </Paragraph>
    </View>
  );
}

export default RegistrationScreen;
