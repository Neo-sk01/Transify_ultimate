import React, { useState, useCallback } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  H2,
  Paragraph,
  Muted,
  Badge,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import type { EmergencyContact, NotificationChannel } from '@/types';

export interface EmergencyContactsScreenProps {
  /** Current list of emergency contacts */
  contacts: EmergencyContact[];
  /** Called when adding a new contact */
  onAddContact: (contact: Omit<EmergencyContact, 'id' | 'consentVerified' | 'consentDate'>) => Promise<{ success: boolean; error?: string }>;
  /** Called when removing a contact */
  onRemoveContact: (contactId: string) => Promise<{ success: boolean; error?: string }>;
  /** Called when requesting consent verification */
  onRequestConsent: (contactId: string) => Promise<{ success: boolean; error?: string }>;
  /** Whether data is loading */
  isLoading?: boolean;
}

/**
 * Emergency Contact Management Screen
 * 
 * Allows users to add, remove, and manage emergency contacts.
 * Shows consent status for each contact.
 * 
 * Requirements: 4.4, 11.2
 */
export function EmergencyContactsScreen({
  contacts,
  onAddContact,
  onRemoveContact,
  onRequestConsent,
  isLoading = false,
}: EmergencyContactsScreenProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAddContact = useCallback(async (contactData: Omit<EmergencyContact, 'id' | 'consentVerified' | 'consentDate'>) => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await onAddContact(contactData);
      if (result.success) {
        setShowAddForm(false);
        setSuccessMessage('Contact added. Consent request sent.');
      } else {
        setError(result.error || 'Failed to add contact');
      }
    } catch {
      setError('Failed to add contact');
    } finally {
      setIsSubmitting(false);
    }
  }, [onAddContact]);

  const handleRemoveContact = useCallback(async (contactId: string) => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await onRemoveContact(contactId);
      if (result.success) {
        setSuccessMessage('Contact removed');
      } else {
        setError(result.error || 'Failed to remove contact');
      }
    } catch {
      setError('Failed to remove contact');
    } finally {
      setIsSubmitting(false);
    }
  }, [onRemoveContact]);

  const handleRequestConsent = useCallback(async (contactId: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await onRequestConsent(contactId);
      if (result.success) {
        setSuccessMessage('Consent request sent');
      } else {
        setError(result.error || 'Failed to send consent request');
      }
    } catch {
      setError('Failed to send consent request');
    } finally {
      setIsSubmitting(false);
    }
  }, [onRequestConsent]);

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 p-4">
        {/* Header */}
        <View className="mb-6">
          <H2>Emergency Contacts</H2>
          <Muted className="mt-1">
            These contacts will be notified in case of emergency
          </Muted>
        </View>

        {/* Messages */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="mb-4">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <View className="items-center py-8">
            <ActivityIndicator size="large" />
            <Muted className="mt-2">Loading contacts...</Muted>
          </View>
        )}

        {/* Contact List */}
        {!isLoading && contacts.length === 0 && !showAddForm && (
          <Card className="mb-4">
            <CardContent className="py-8 items-center">
              <Paragraph className="text-center mb-4">
                No emergency contacts added yet
              </Paragraph>
              <Muted className="text-center">
                Add contacts who will be notified in case of emergency
              </Muted>
            </CardContent>
          </Card>
        )}

        {!isLoading && contacts.map(contact => (
          <ContactCard
            key={contact.id}
            contact={contact}
            onRemove={() => handleRemoveContact(contact.id)}
            onRequestConsent={() => handleRequestConsent(contact.id)}
            disabled={isSubmitting}
          />
        ))}

        {/* Add Contact Form */}
        {showAddForm && (
          <AddContactForm
            onSubmit={handleAddContact}
            onCancel={() => setShowAddForm(false)}
            isSubmitting={isSubmitting}
          />
        )}

        {/* Add Contact Button */}
        {!showAddForm && (
          <Button
            variant="default"
            className="mt-4"
            onPress={() => {
              setShowAddForm(true);
              setError(null);
              setSuccessMessage(null);
            }}
            disabled={isLoading || isSubmitting}
          >
            Add Emergency Contact
          </Button>
        )}

        {/* Info Section */}
        <View className="mt-8 mb-4">
          <Muted className="text-center">
            Contacts must verify their consent before they can receive emergency notifications.
            They will receive a verification request when added.
          </Muted>
        </View>
      </ScrollView>
    </View>
  );
}


/**
 * Individual contact card component
 */
interface ContactCardProps {
  contact: EmergencyContact;
  onRemove: () => void;
  onRequestConsent: () => void;
  disabled?: boolean;
}

function ContactCard({ contact, onRemove, onRequestConsent, disabled = false }: ContactCardProps) {
  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <View className="flex-row items-center justify-between">
          <CardTitle className="text-lg">{contact.name}</CardTitle>
          <ConsentBadge verified={contact.consentVerified} />
        </View>
      </CardHeader>

      <CardContent className="pb-2">
        {contact.phone && (
          <View className="flex-row items-center mb-1">
            <Muted className="w-16">Phone:</Muted>
            <Paragraph className="text-sm">{contact.phone}</Paragraph>
          </View>
        )}
        {contact.email && (
          <View className="flex-row items-center mb-1">
            <Muted className="w-16">Email:</Muted>
            <Paragraph className="text-sm">{contact.email}</Paragraph>
          </View>
        )}
        <View className="flex-row items-center mt-2">
          <Muted className="mr-2">Channels:</Muted>
          <View className="flex-row gap-1">
            {contact.notificationChannels.map(channel => (
              <Badge key={channel} variant="secondary">
                {channel.toUpperCase()}
              </Badge>
            ))}
          </View>
        </View>
        {contact.consentDate && (
          <Muted className="mt-2 text-xs">
            Consent verified: {new Date(contact.consentDate).toLocaleDateString()}
          </Muted>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        {!contact.consentVerified && (
          <Button
            variant="outline"
            size="sm"
            onPress={onRequestConsent}
            disabled={disabled}
          >
            Resend Consent Request
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onPress={onRemove}
          disabled={disabled}
        >
          Remove
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Consent status badge
 */
function ConsentBadge({ verified }: { verified: boolean }) {
  return (
    <Badge variant={verified ? 'default' : 'secondary'}>
      {verified ? 'Verified' : 'Pending'}
    </Badge>
  );
}

/**
 * Add contact form component
 */
interface AddContactFormProps {
  onSubmit: (contact: Omit<EmergencyContact, 'id' | 'consentVerified' | 'consentDate'>) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

function AddContactForm({ onSubmit, onCancel, isSubmitting = false }: AddContactFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [channels, setChannels] = useState<NotificationChannel[]>(['sms']);
  const [formError, setFormError] = useState<string | null>(null);

  const toggleChannel = (channel: NotificationChannel) => {
    setChannels(prev => 
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const handleSubmit = () => {
    // Validation
    if (!name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setFormError('Phone or email is required');
      return;
    }
    if (channels.length === 0) {
      setFormError('Select at least one notification channel');
      return;
    }

    setFormError(null);
    onSubmit({
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      notificationChannels: channels,
    });
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Add New Contact</CardTitle>
        <CardDescription>
          Enter contact details. They will receive a consent request.
        </CardDescription>
      </CardHeader>

      <CardContent className="gap-4">
        <Input
          label="Name"
          placeholder="Contact name"
          value={name}
          onChangeText={setName}
          editable={!isSubmitting}
        />

        <Input
          label="Phone Number"
          placeholder="+1 234 567 8900"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          editable={!isSubmitting}
        />

        <Input
          label="Email"
          placeholder="contact@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isSubmitting}
        />

        {/* Notification Channels */}
        <View>
          <Muted className="mb-2">Notification Channels</Muted>
          <View className="flex-row gap-2">
            {(['sms', 'push', 'email'] as NotificationChannel[]).map(channel => (
              <Pressable
                key={channel}
                className={cn(
                  'px-3 py-2 rounded-md border',
                  channels.includes(channel)
                    ? 'bg-primary border-primary'
                    : 'bg-background border-input',
                  isSubmitting && 'opacity-50'
                )}
                onPress={() => toggleChannel(channel)}
                disabled={isSubmitting}
              >
                <Paragraph
                  className={cn(
                    'text-sm',
                    channels.includes(channel) ? 'text-primary-foreground' : 'text-foreground'
                  )}
                >
                  {channel.toUpperCase()}
                </Paragraph>
              </Pressable>
            ))}
          </View>
        </View>

        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          variant="default"
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            'Add Contact'
          )}
        </Button>
        <Button
          variant="ghost"
          onPress={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </CardFooter>
    </Card>
  );
}

export default EmergencyContactsScreen;
