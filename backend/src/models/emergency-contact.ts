/**
 * Emergency Contact Model
 * Represents contacts designated to receive emergency notifications
 * Requirements: 4.4, 10.1
 */

import { generateId } from '../utils/crypto';

export type NotificationChannel = 'sms' | 'push' | 'email';

export interface EmergencyContact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notificationChannels: NotificationChannel[];
  consentVerified: boolean;
  consentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating an emergency contact
 */
export interface CreateEmergencyContactInput {
  name: string;
  phone?: string;
  email?: string;
  notificationChannels: NotificationChannel[];
}

/**
 * Validation result for emergency contact
 */
export interface EmergencyContactValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Valid notification channels
 */
const VALID_NOTIFICATION_CHANNELS: NotificationChannel[] = ['sms', 'push', 'email'];

/**
 * Validate notification channels
 */
export function validateNotificationChannels(channels: NotificationChannel[]): string[] {
  const errors: string[] = [];
  
  if (!channels || channels.length === 0) {
    errors.push('At least one notification channel is required');
    return errors;
  }

  for (const channel of channels) {
    if (!VALID_NOTIFICATION_CHANNELS.includes(channel)) {
      errors.push(`Invalid notification channel: ${channel}`);
    }
  }

  // Check for duplicates
  const uniqueChannels = new Set(channels);
  if (uniqueChannels.size !== channels.length) {
    errors.push('Duplicate notification channels are not allowed');
  }

  return errors;
}

/**
 * Validate phone number format (basic validation)
 */
export function validatePhoneNumber(phone: string): boolean {
  // Basic phone validation: must contain only digits, spaces, +, -, and ()
  // and be at least 7 characters
  const phoneRegex = /^[\d\s+\-()]{7,20}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate emergency contact input
 * Requirements: 4.4
 */
export function validateEmergencyContactInput(
  input: CreateEmergencyContactInput
): EmergencyContactValidationResult {
  const errors: string[] = [];

  // Name validation
  if (!input.name || input.name.trim().length === 0) {
    errors.push('Contact name is required');
  } else if (input.name.trim().length < 2) {
    errors.push('Contact name must be at least 2 characters');
  }

  // Notification channel validation
  const channelErrors = validateNotificationChannels(input.notificationChannels);
  errors.push(...channelErrors);

  // Contact method validation based on channels
  if (input.notificationChannels.includes('sms')) {
    if (!input.phone) {
      errors.push('Phone number is required for SMS notifications');
    } else if (!validatePhoneNumber(input.phone)) {
      errors.push('Invalid phone number format');
    }
  }

  if (input.notificationChannels.includes('email')) {
    if (!input.email) {
      errors.push('Email is required for email notifications');
    } else if (!validateEmail(input.email)) {
      errors.push('Invalid email format');
    }
  }

  // At least one contact method must be provided
  if (!input.phone && !input.email) {
    errors.push('At least one contact method (phone or email) is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a new emergency contact (without consent verification)
 * Contact will not be active until consent is verified
 * Requirements: 4.4, 10.1
 */
export function createEmergencyContact(
  input: CreateEmergencyContactInput
): EmergencyContact {
  const validation = validateEmergencyContactInput(input);
  if (!validation.valid) {
    throw new Error(`Invalid contact input: ${validation.errors.join(', ')}`);
  }

  const now = new Date();
  return {
    id: generateId(),
    name: input.name.trim(),
    phone: input.phone,
    email: input.email,
    notificationChannels: input.notificationChannels,
    consentVerified: false, // Must be verified before activation
    consentDate: undefined,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Verify consent for an emergency contact
 * Requirements: 4.4
 */
export function verifyContactConsent(contact: EmergencyContact): EmergencyContact {
  return {
    ...contact,
    consentVerified: true,
    consentDate: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Check if contact can receive notifications
 * Contact must have verified consent to receive notifications
 * Requirements: 4.4
 */
export function canReceiveNotifications(contact: EmergencyContact): boolean {
  return contact.consentVerified && contact.consentDate !== undefined;
}

/**
 * Get active notification channels for a contact
 * Only returns channels that have the required contact info
 */
export function getActiveChannels(contact: EmergencyContact): NotificationChannel[] {
  if (!canReceiveNotifications(contact)) {
    return [];
  }

  return contact.notificationChannels.filter((channel) => {
    switch (channel) {
      case 'sms':
        return !!contact.phone;
      case 'email':
        return !!contact.email;
      case 'push':
        return true; // Push notifications don't require additional contact info
      default:
        return false;
    }
  });
}
