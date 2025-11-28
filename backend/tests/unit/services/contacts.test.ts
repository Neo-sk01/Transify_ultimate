/**
 * Emergency Contact Management Service Unit Tests
 * Requirements: 4.4, 10.1
 */

import {
  addContact,
  removeContact,
  getContacts,
  getContact,
  verifyConsent,
  getActiveContacts,
  hasVerifiedConsent,
  clearAllContacts,
  clearUserContacts,
  createEmergencyContactManager,
} from '../../../src/services/contacts';
import { CreateEmergencyContactInput } from '../../../src/models/emergency-contact';

describe('Emergency Contact Management Service', () => {
  const testUserId = 'user_123';

  beforeEach(() => {
    clearAllContacts();
  });

  describe('addContact', () => {
    it('should add a contact with consentVerified=false', async () => {
      const input: CreateEmergencyContactInput = {
        name: 'John Doe',
        phone: '+27821234567',
        notificationChannels: ['sms'],
      };

      const result = await addContact(testUserId, input);

      expect(result.success).toBe(true);
      expect(result.contact).toBeDefined();
      expect(result.contact?.name).toBe('John Doe');
      expect(result.contact?.consentVerified).toBe(false);
      expect(result.contact?.consentDate).toBeUndefined();
    });

    it('should reject empty user ID', async () => {
      const input: CreateEmergencyContactInput = {
        name: 'John Doe',
        phone: '+27821234567',
        notificationChannels: ['sms'],
      };

      const result = await addContact('', input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User ID is required');
    });


    it('should reject invalid contact input', async () => {
      const input: CreateEmergencyContactInput = {
        name: '',
        phone: '+27821234567',
        notificationChannels: ['sms'],
      };

      const result = await addContact(testUserId, input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Contact name is required');
    });

    it('should require phone for SMS channel', async () => {
      const input: CreateEmergencyContactInput = {
        name: 'John Doe',
        email: 'john@example.com',
        notificationChannels: ['sms'],
      };

      const result = await addContact(testUserId, input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Phone number is required for SMS notifications');
    });
  });

  describe('getContacts', () => {
    it('should return empty array for user with no contacts', async () => {
      const contacts = await getContacts(testUserId);
      expect(contacts).toHaveLength(0);
    });

    it('should return all contacts for a user', async () => {
      await addContact(testUserId, {
        name: 'Contact 1',
        phone: '+27821234567',
        notificationChannels: ['sms'],
      });
      await addContact(testUserId, {
        name: 'Contact 2',
        email: 'contact2@example.com',
        notificationChannels: ['email'],
      });

      const contacts = await getContacts(testUserId);

      expect(contacts).toHaveLength(2);
      expect(contacts.map(c => c.name)).toContain('Contact 1');
      expect(contacts.map(c => c.name)).toContain('Contact 2');
    });

    it('should return empty array for empty user ID', async () => {
      const contacts = await getContacts('');
      expect(contacts).toHaveLength(0);
    });
  });

  describe('getContact', () => {
    it('should return a specific contact', async () => {
      const result = await addContact(testUserId, {
        name: 'John Doe',
        phone: '+27821234567',
        notificationChannels: ['sms'],
      });

      const contact = await getContact(testUserId, result.contact!.id);

      expect(contact).toBeDefined();
      expect(contact?.name).toBe('John Doe');
    });

    it('should return undefined for non-existent contact', async () => {
      const contact = await getContact(testUserId, 'non_existent_id');
      expect(contact).toBeUndefined();
    });
  });

  describe('removeContact', () => {
    it('should remove an existing contact', async () => {
      const addResult = await addContact(testUserId, {
        name: 'John Doe',
        phone: '+27821234567',
        notificationChannels: ['sms'],
      });

      const removeResult = await removeContact(testUserId, addResult.contact!.id);

      expect(removeResult.success).toBe(true);

      const contacts = await getContacts(testUserId);
      expect(contacts).toHaveLength(0);
    });

    it('should fail for non-existent contact', async () => {
      const result = await removeContact(testUserId, 'non_existent_id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Contact not found');
    });

    it('should reject empty user ID', async () => {
      const result = await removeContact('', 'contact_id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User ID is required');
    });

    it('should reject empty contact ID', async () => {
      const result = await removeContact(testUserId, '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Contact ID is required');
    });
  });

  describe('verifyConsent', () => {
    it('should verify consent for a contact', async () => {
      const addResult = await addContact(testUserId, {
        name: 'John Doe',
        phone: '+27821234567',
        notificationChannels: ['sms'],
      });

      const verifyResult = await verifyConsent(testUserId, addResult.contact!.id);

      expect(verifyResult.success).toBe(true);
      expect(verifyResult.contact?.consentVerified).toBe(true);
      expect(verifyResult.contact?.consentDate).toBeDefined();
    });

    it('should fail for non-existent contact', async () => {
      const result = await verifyConsent(testUserId, 'non_existent_id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Contact not found');
    });

    it('should reject empty user ID', async () => {
      const result = await verifyConsent('', 'contact_id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User ID is required');
    });
  });

  describe('getActiveContacts', () => {
    it('should return only contacts with verified consent', async () => {
      // Add two contacts
      const result1 = await addContact(testUserId, {
        name: 'Contact 1',
        phone: '+27821234567',
        notificationChannels: ['sms'],
      });
      await addContact(testUserId, {
        name: 'Contact 2',
        phone: '+27829876543',
        notificationChannels: ['sms'],
      });

      // Verify consent for only the first contact
      await verifyConsent(testUserId, result1.contact!.id);

      const activeContacts = await getActiveContacts(testUserId);

      expect(activeContacts).toHaveLength(1);
      expect(activeContacts[0].name).toBe('Contact 1');
    });

    it('should return empty array when no contacts have verified consent', async () => {
      await addContact(testUserId, {
        name: 'Contact 1',
        phone: '+27821234567',
        notificationChannels: ['sms'],
      });

      const activeContacts = await getActiveContacts(testUserId);

      expect(activeContacts).toHaveLength(0);
    });
  });

  describe('hasVerifiedConsent', () => {
    it('should return true for contact with verified consent', async () => {
      const addResult = await addContact(testUserId, {
        name: 'John Doe',
        phone: '+27821234567',
        notificationChannels: ['sms'],
      });
      await verifyConsent(testUserId, addResult.contact!.id);

      const hasConsent = await hasVerifiedConsent(testUserId, addResult.contact!.id);

      expect(hasConsent).toBe(true);
    });

    it('should return false for contact without verified consent', async () => {
      const addResult = await addContact(testUserId, {
        name: 'John Doe',
        phone: '+27821234567',
        notificationChannels: ['sms'],
      });

      const hasConsent = await hasVerifiedConsent(testUserId, addResult.contact!.id);

      expect(hasConsent).toBe(false);
    });

    it('should return false for non-existent contact', async () => {
      const hasConsent = await hasVerifiedConsent(testUserId, 'non_existent_id');
      expect(hasConsent).toBe(false);
    });
  });

  describe('createEmergencyContactManager', () => {
    it('should create a manager with all required methods', () => {
      const manager = createEmergencyContactManager();

      expect(manager.addContact).toBeDefined();
      expect(manager.removeContact).toBeDefined();
      expect(manager.getContacts).toBeDefined();
      expect(manager.verifyContactConsent).toBeDefined();
      expect(manager.getContact).toBeDefined();
    });
  });
});
