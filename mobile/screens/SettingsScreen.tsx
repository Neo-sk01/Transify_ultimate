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
  H1,
  H2,
  Paragraph,
  Muted,
  Badge,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/components/ui';
import { cn } from '@/lib/utils';

export interface UserProfile {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  nationalIdMasked: string;
  createdAt: Date;
  emergencyContactCount: number;
  consentStatus: {
    dataProcessing: boolean;
    emergencyNotifications: boolean;
  };
}

export interface SettingsScreenProps {
  /** User profile data */
  profile: UserProfile;
  /** Called when user requests data export */
  onRequestDataExport: () => Promise<{ success: boolean; error?: string }>;
  /** Called when user requests account deletion */
  onRequestAccountDeletion: () => Promise<{ success: boolean; error?: string }>;
  /** Called when user wants to change PIN */
  onChangePinPress: () => void;
  /** Called when user wants to manage emergency contacts */
  onManageContactsPress: () => void;
  /** Called when user logs out */
  onLogout: () => void;
  /** Whether data is loading */
  isLoading?: boolean;
}

/**
 * Settings and Profile Screen
 * 
 * Displays user profile and provides settings management including
 * data export functionality for GDPR/POPIA compliance.
 * 
 * Requirements: 9.4, 11.2
 */
export function SettingsScreen({
  profile,
  onRequestDataExport,
  onRequestAccountDeletion,
  onChangePinPress,
  onManageContactsPress,
  onLogout,
  isLoading = false,
}: SettingsScreenProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDataExport = useCallback(async () => {
    setIsExporting(true);
    setMessage(null);

    try {
      const result = await onRequestDataExport();
      if (result.success) {
        setMessage({ type: 'success', text: 'Data export requested. You will receive an email with your data.' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to request data export' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to request data export' });
    } finally {
      setIsExporting(false);
    }
  }, [onRequestDataExport]);

  const handleAccountDeletion = useCallback(async () => {
    setIsDeleting(true);
    setMessage(null);

    try {
      const result = await onRequestAccountDeletion();
      if (result.success) {
        setMessage({ type: 'success', text: 'Account deletion requested. Your data will be removed within 30 days.' });
        setShowDeleteConfirm(false);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to request account deletion' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to request account deletion' });
    } finally {
      setIsDeleting(false);
    }
  }, [onRequestAccountDeletion]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
        <Muted className="mt-2">Loading profile...</Muted>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 p-4">
        {/* Header */}
        <View className="items-center mb-6 pt-4">
          <H1>Settings</H1>
        </View>

        {/* Messages */}
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-4">
            <AlertTitle>{message.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Profile Section */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="gap-2">
            <ProfileRow label="Name" value={profile.fullName} />
            <ProfileRow label="ID" value={profile.nationalIdMasked} />
            {profile.email && <ProfileRow label="Email" value={profile.email} />}
            {profile.phone && <ProfileRow label="Phone" value={profile.phone} />}
            <ProfileRow 
              label="Member since" 
              value={new Date(profile.createdAt).toLocaleDateString()} 
            />
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent className="gap-3">
            <SettingsButton
              title="Change PIN"
              description="Update your normal or duress PIN"
              onPress={onChangePinPress}
            />
            <SettingsButton
              title="Emergency Contacts"
              description={`${profile.emergencyContactCount} contact(s) configured`}
              onPress={onManageContactsPress}
            />
          </CardContent>
        </Card>

        {/* Consent Status */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Privacy & Consent</CardTitle>
          </CardHeader>
          <CardContent className="gap-2">
            <ConsentStatusRow 
              label="Data Processing" 
              granted={profile.consentStatus.dataProcessing} 
            />
            <ConsentStatusRow 
              label="Emergency Notifications" 
              granted={profile.consentStatus.emergencyNotifications} 
            />
          </CardContent>
          <CardFooter>
            <Muted className="text-xs">
              Contact support to modify your consent preferences.
            </Muted>
          </CardFooter>
        </Card>

        {/* Data Rights Section (GDPR/POPIA) */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Your Data Rights</CardTitle>
            <CardDescription>
              Under POPIA and GDPR, you have the right to access and delete your data
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            <Button
              variant="outline"
              onPress={handleDataExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" />
                  <Paragraph>Requesting...</Paragraph>
                </View>
              ) : (
                'Request Data Export'
              )}
            </Button>
            
            <Button
              variant="destructive"
              onPress={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
            >
              Request Account Deletion
            </Button>
          </CardContent>
          <CardFooter>
            <Muted className="text-xs">
              Data exports are delivered via email within 30 days. Account deletion is permanent.
            </Muted>
          </CardFooter>
        </Card>

        {/* Logout */}
        <Button
          variant="ghost"
          className="mb-8"
          onPress={onLogout}
        >
          Log Out
        </Button>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <DeleteConfirmationModal
            onConfirm={handleAccountDeletion}
            onCancel={() => setShowDeleteConfirm(false)}
            isDeleting={isDeleting}
          />
        )}
      </ScrollView>
    </View>
  );
}


/**
 * Profile information row
 */
function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row">
      <Muted className="w-28">{label}:</Muted>
      <Paragraph className="flex-1">{value}</Paragraph>
    </View>
  );
}

/**
 * Consent status row with badge
 */
function ConsentStatusRow({ label, granted }: { label: string; granted: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Paragraph>{label}</Paragraph>
      <Badge variant={granted ? 'default' : 'secondary'}>
        {granted ? 'Granted' : 'Not Granted'}
      </Badge>
    </View>
  );
}

/**
 * Settings navigation button
 */
interface SettingsButtonProps {
  title: string;
  description: string;
  onPress: () => void;
}

function SettingsButton({ title, description, onPress }: SettingsButtonProps) {
  return (
    <Pressable
      className="flex-row items-center justify-between py-3 px-2 rounded-lg active:bg-accent"
      onPress={onPress}
    >
      <View className="flex-1">
        <Paragraph className="font-medium">{title}</Paragraph>
        <Muted>{description}</Muted>
      </View>
      <Muted className="text-lg">›</Muted>
    </Pressable>
  );
}

/**
 * Delete confirmation modal
 */
interface DeleteConfirmationModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteConfirmationModal({ onConfirm, onCancel, isDeleting }: DeleteConfirmationModalProps) {
  return (
    <View className="absolute inset-0 bg-black/50 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-destructive">Delete Account?</CardTitle>
          <CardDescription>
            This action cannot be undone. All your data will be permanently deleted.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Your emergency contacts will no longer be notified in case of emergency.
              Make sure you have alternative safety measures in place.
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="gap-2">
          <Button
            variant="ghost"
            className="flex-1"
            onPress={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onPress={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              'Delete Account'
            )}
          </Button>
        </CardFooter>
      </Card>
    </View>
  );
}

export default SettingsScreen;
