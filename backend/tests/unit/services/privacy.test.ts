/**
 * Data Privacy Service Unit Tests
 * Requirements: 10.1, 10.3, 10.4
 */

import {
  DataPrivacyService,
  createDataPrivacyService,
  REQUIRED_CONSENT_PURPOSES,
  DEFAULT_RETENTION_PERIODS,
} from '../../../src/services/privacy';
import { ConsentRecord } from '../../../src/models/user';
import { encrypt, isEncrypted } from '../../../src/utils/crypto';

describe('DataPrivacyService', () => {
  let service: DataPrivacyService;
  const testEncryptionKey = 'test-encryption-key-32-chars-long';

  beforeEach(() => {
    service = createDataPrivacyService();
  });

  describe('Personal Data Encryption (Requirements: 10.3)', () => {
    it('should encrypt specified fields in an object', () => {
      const data = {
        id: 'user-123',
        nationalId: '1234567890',
        name: 'Test User',
      };

      const encrypted = service.encryptPersonalData(
        data,
        ['nationalId'],
        testEncryptionKey
      );

      expect(encrypted.id).toBe('user-123');
      expect(encrypted.name).toBe('Test User');
      expect(encrypted.nationalId).not.toBe('1234567890');
      expect(service.isFieldEncrypted(encrypted.nationalId)).toBe(true);
    });

    it('should decrypt encrypted fields in an object', () => {
      const originalData = {
        id: 'user-123',
        nationalId: '1234567890',
        name: 'Test User',
      };

      const encrypted = service.encryptPersonalData(
        originalData,
        ['nationalId'],
        testEncryptionKey
      );

      const decrypted = service.decryptPersonalData(
        encrypted,
        ['nationalId'],
        testEncryptionKey
      );

      expect(decrypted.nationalId).toBe('1234567890');
    });

    it('should correctly identify encrypted values', () => {
      const plaintext = 'plain-text-value';
      const encryptedValue = encrypt(plaintext, testEncryptionKey);

      expect(service.isFieldEncrypted(plaintext)).toBe(false);
      expect(service.isFieldEncrypted(encryptedValue)).toBe(true);
    });

    it('should not modify non-string fields', () => {
      const data = {
        id: 123,
        active: true,
        nationalId: '1234567890',
      };

      const encrypted = service.encryptPersonalData(
        data,
        ['id', 'active', 'nationalId'] as any,
        testEncryptionKey
      );

      expect(encrypted.id).toBe(123);
      expect(encrypted.active).toBe(true);
      expect(service.isFieldEncrypted(encrypted.nationalId as string)).toBe(true);
    });
  });

  describe('Consent Management (Requirements: 10.1)', () => {
    it('should validate consents with all required purposes granted', () => {
      const consents: ConsentRecord[] = [
        {
          purpose: 'data_processing',
          granted: true,
          grantedAt: new Date(),
        },
      ];

      const result = service.validateConsents(consents);

      expect(result.valid).toBe(true);
      expect(result.missingPurposes).toHaveLength(0);
    });

    it('should detect missing required consent purposes', () => {
      const consents: ConsentRecord[] = [];

      const result = service.validateConsents(consents);

      expect(result.valid).toBe(false);
      expect(result.missingPurposes).toContain('data_processing');
    });

    it('should detect withdrawn consents', () => {
      const consents: ConsentRecord[] = [
        {
          purpose: 'data_processing',
          granted: true,
          grantedAt: new Date(Date.now() - 86400000),
          withdrawnAt: new Date(),
        },
      ];

      const result = service.validateConsents(consents);

      expect(result.valid).toBe(false);
      expect(result.withdrawnPurposes).toContain('data_processing');
    });

    it('should detect expired consents', () => {
      const consents: ConsentRecord[] = [
        {
          purpose: 'data_processing',
          granted: true,
          grantedAt: new Date(Date.now() - 86400000 * 365),
          expiresAt: new Date(Date.now() - 86400000), // Expired yesterday
        },
      ];

      const result = service.validateConsents(consents);

      expect(result.valid).toBe(false);
      expect(result.expiredPurposes).toContain('data_processing');
    });

    it('should create a consent record', () => {
      const consent = service.createConsentRecord('data_processing', true);

      expect(consent.purpose).toBe('data_processing');
      expect(consent.granted).toBe(true);
      expect(consent.grantedAt).toBeInstanceOf(Date);
      expect(consent.withdrawnAt).toBeUndefined();
    });

    it('should withdraw consent for a specific purpose', () => {
      const consents: ConsentRecord[] = [
        {
          purpose: 'data_processing',
          granted: true,
          grantedAt: new Date(),
        },
        {
          purpose: 'marketing',
          granted: true,
          grantedAt: new Date(),
        },
      ];

      const updated = service.withdrawConsent(consents, 'marketing');

      expect(updated[0].withdrawnAt).toBeUndefined();
      expect(updated[1].withdrawnAt).toBeInstanceOf(Date);
    });

    it('should determine if user can be activated based on consents', () => {
      const validConsents: ConsentRecord[] = [
        {
          purpose: 'data_processing',
          granted: true,
          grantedAt: new Date(),
        },
      ];

      const invalidConsents: ConsentRecord[] = [];

      expect(service.canActivateUser(validConsents)).toBe(true);
      expect(service.canActivateUser(invalidConsents)).toBe(false);
    });
  });

  describe('Data Retention Enforcement (Requirements: 10.4)', () => {
    it('should create a retention record with default period', () => {
      const record = service.createRetentionRecord(
        'user_data',
        'data-123',
        'user-456'
      );

      expect(record.dataType).toBe('user_data');
      expect(record.dataId).toBe('data-123');
      expect(record.userId).toBe('user-456');
      expect(record.retentionPeriodDays).toBe(DEFAULT_RETENTION_PERIODS['user_data']);
      expect(record.expiresAt).toBeInstanceOf(Date);
      expect(record.expiresAt.getTime()).toBeGreaterThan(record.createdAt.getTime());
    });

    it('should create a retention record with custom period', () => {
      const record = service.createRetentionRecord(
        'custom_data',
        'data-123',
        'user-456',
        30 // 30 days
      );

      expect(record.retentionPeriodDays).toBe(30);
      const expectedExpiry = record.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000;
      expect(record.expiresAt.getTime()).toBe(expectedExpiry);
    });

    it('should identify expired records', () => {
      // Create a record that's already expired
      const record = service.createRetentionRecord(
        'user_data',
        'data-123',
        'user-456',
        -1 // Negative days = already expired
      );

      const expired = service.getExpiredRecords();

      expect(expired).toContainEqual(expect.objectContaining({ id: record.id }));
    });

    it('should not include non-expired records in expired list', () => {
      const record = service.createRetentionRecord(
        'user_data',
        'data-123',
        'user-456',
        365 // 1 year from now
      );

      const expired = service.getExpiredRecords();

      expect(expired).not.toContainEqual(expect.objectContaining({ id: record.id }));
    });

    it('should purge expired data without legal hold', async () => {
      // Create an expired record
      service.createRetentionRecord('user_data', 'data-123', 'user-456', -1);

      const result = await service.purgeExpiredData();

      expect(result.purgedCount).toBe(1);
      expect(result.skippedDueToLegalHold).toBe(0);
    });

    it('should skip purging data with legal hold', async () => {
      // Create an expired record
      service.createRetentionRecord('user_data', 'data-123', 'user-456', -1);

      // Add legal hold
      service.addLegalHold('user-456', 'Investigation', 'admin-1');

      const result = await service.purgeExpiredData();

      expect(result.purgedCount).toBe(0);
      expect(result.skippedDueToLegalHold).toBe(1);
    });
  });

  describe('Legal Hold Management (Requirements: 10.4)', () => {
    it('should add a legal hold for a user', () => {
      const hold = service.addLegalHold('user-123', 'Investigation', 'admin-1');

      expect(hold.userId).toBe('user-123');
      expect(hold.reason).toBe('Investigation');
      expect(hold.createdBy).toBe('admin-1');
      expect(service.hasLegalHold('user-123')).toBe(true);
    });

    it('should release a legal hold', () => {
      service.addLegalHold('user-123', 'Investigation', 'admin-1');

      const released = service.releaseLegalHold('user-123');

      expect(released).toBe(true);
      expect(service.hasLegalHold('user-123')).toBe(false);
    });

    it('should return false when releasing non-existent hold', () => {
      const released = service.releaseLegalHold('non-existent-user');

      expect(released).toBe(false);
    });

    it('should respect legal hold expiration', () => {
      // Add a hold that's already expired
      service.addLegalHold(
        'user-123',
        'Investigation',
        'admin-1',
        new Date(Date.now() - 86400000) // Expired yesterday
      );

      expect(service.hasLegalHold('user-123')).toBe(false);
    });

    it('should update retention records when legal hold is added', () => {
      const record = service.createRetentionRecord(
        'user_data',
        'data-123',
        'user-456'
      );

      expect(record.legalHoldActive).toBe(false);

      service.addLegalHold('user-456', 'Investigation', 'admin-1');

      // Get the updated record
      const updatedRecord = service.getRetentionRecord(record.id);
      expect(updatedRecord?.legalHoldActive).toBe(true);
    });
  });
});
