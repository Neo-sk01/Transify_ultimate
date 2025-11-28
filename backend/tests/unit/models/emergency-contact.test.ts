/**
 * Emergency Contact Model Unit Tests
 */

import {
  validateEmergencyContactInput,
  createEmergencyContact,
  verifyContactConsent,
  canReceiveNotifications,
  getActiveChannels,
  validateNotificationChannels,
  CreateEmergencyContactInput,
} from '../../../src/models/emergency-contact';

describe('EmergencyContact Model', () => {
  describe('validateNotificationChannels', () => {
    it('should accept valid channels', () => {
      const errors = validateNotificationChannels(['sms', 'email', 'push']);
      expect(errors).toHaveLength(0);
    });

    it('should reject empty channels', () => {
      const errors = validateNotificationChannels([]);
      expect(errors).toContain('At least one notification channel is required');
    });

    it('should reject duplicate channels', () => {
      const errors = validateNotificationChannels(['sms', 'sms']);
      expect(errors).toContain('Duplicate notification channels are not allowed');
    });
  });

  describe('validateEmergencyContactInput', () => {
    it('should validate correct input with SMS', () => {
      const input: CreateEmergencyContactInput = {
        name: 'John Doe',
        phone: '+1234567890',
        notificationChannels: ['sms'],
      };

      const result = validateEmergencyContactInput(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate correct input with email', () => {
      const input: CreateEmergencyContactInput = {
        name: 'John Doe',
        email: 'john@example.com',
        notificationChannels: ['email'],
      };

      const result = validateEmergencyContactInput(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty name', () => {
      const input: CreateEmergencyContactInput = {
        name: '',
        phone: '+1234567890',
        notificationChannels: ['sms'],
      };

      const result = validateEmergencyContactInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contact name is required');
    });

    it('should reject missing phone for SMS channel', () => {
      const input: CreateEmergencyContactInput = {
        name: 'John Doe',
        email: 'john@example.com',
        notificationChannels: ['sms'],
      };

      const result = validateEmergencyContactInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Phone number is required for SMS notifications');
    });

    it('should reject missing email for email channel', () => {
      const input: CreateEmergencyContactInput = {
        name: 'John Doe',
        phone: '+1234567890',
        notificationChannels: ['email'],
      };

      const result = validateEmergencyContactInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email is required for email notifications');
    });

    it('should reject invalid email format', () => {
      const input: CreateEmergencyContactInput = {
        name: 'John Doe',
        email: 'invalid-email',
        notificationChannels: ['email'],
      };

      const result = validateEmergencyContactInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });
  });

  describe('createEmergencyContact', () => {
    it('should create contact with consentVerified=false', () => {
      const input: CreateEmergencyContactInput = {
        name: 'John Doe',
        phone: '+1234567890',
        notificationChannels: ['sms'],
      };

      const contact = createEmergencyContact(input);

      expect(contact.id).toBeDefined();
      expect(contact.name).toBe('John Doe');
      expect(contact.consentVerified).toBe(false);
      expect(contact.consentDate).toBeUndefined();
    });

    it('should throw error for invalid input', () => {
      const input: CreateEmergencyContactInput = {
        name: '',
        notificationChannels: ['sms'],
      };

      expect(() => createEmergencyContact(input)).toThrow('Invalid contact input');
    });
  });

  describe('verifyContactConsent', () => {
    it('should set consentVerified to true and add consentDate', () => {
      const contact = createEmergencyContact({
        name: 'John Doe',
        phone: '+1234567890',
        notificationChannels: ['sms'],
      });

      const verified = verifyContactConsent(contact);

      expect(verified.consentVerified).toBe(true);
      expect(verified.consentDate).toBeDefined();
    });
  });

  describe('canReceiveNotifications', () => {
    it('should return false for unverified contact', () => {
      const contact = createEmergencyContact({
        name: 'John Doe',
        phone: '+1234567890',
        notificationChannels: ['sms'],
      });

      expect(canReceiveNotifications(contact)).toBe(false);
    });

    it('should return true for verified contact', () => {
      const contact = createEmergencyContact({
        name: 'John Doe',
        phone: '+1234567890',
        notificationChannels: ['sms'],
      });

      const verified = verifyContactConsent(contact);
      expect(canReceiveNotifications(verified)).toBe(true);
    });
  });

  describe('getActiveChannels', () => {
    it('should return empty array for unverified contact', () => {
      const contact = createEmergencyContact({
        name: 'John Doe',
        phone: '+1234567890',
        notificationChannels: ['sms'],
      });

      expect(getActiveChannels(contact)).toHaveLength(0);
    });

    it('should return channels for verified contact', () => {
      const contact = createEmergencyContact({
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        notificationChannels: ['sms', 'email'],
      });

      const verified = verifyContactConsent(contact);
      const channels = getActiveChannels(verified);

      expect(channels).toContain('sms');
      expect(channels).toContain('email');
    });
  });
});
