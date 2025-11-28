/**
 * User Model Unit Tests
 */

import {
  validateCreateUserInput,
  CreateUserInput,
  createUser,
  validateUserPin,
  hasRequiredConsents,
  decryptNationalId,
  User,
} from '../../../src/models/user';

const TEST_ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests';

describe('User Model', () => {
  describe('validateCreateUserInput', () => {
    it('should validate a correct user input', () => {
      const input: CreateUserInput = {
        nationalId: '1234567890',
        normalPin: '1234',
        duressPin: '5678',
        consentRecords: [{ purpose: 'data_processing', granted: true }],
      };

      const result = validateCreateUserInput(input);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty national ID', () => {
      const input: CreateUserInput = {
        nationalId: '',
        normalPin: '1234',
        duressPin: '5678',
        consentRecords: [{ purpose: 'data_processing', granted: true }],
      };

      const result = validateCreateUserInput(input);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('National ID is required');
    });

    it('should reject PIN shorter than 4 characters', () => {
      const input: CreateUserInput = {
        nationalId: '1234567890',
        normalPin: '123',
        duressPin: '5678',
        consentRecords: [{ purpose: 'data_processing', granted: true }],
      };

      const result = validateCreateUserInput(input);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Normal PIN must be at least 4 characters');
    });

    it('should reject identical normal and duress PINs', () => {
      const input: CreateUserInput = {
        nationalId: '1234567890',
        normalPin: '1234',
        duressPin: '1234',
        consentRecords: [{ purpose: 'data_processing', granted: true }],
      };

      const result = validateCreateUserInput(input);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Normal PIN and Duress PIN must be different');
    });

    it('should reject missing consent records', () => {
      const input: CreateUserInput = {
        nationalId: '1234567890',
        normalPin: '1234',
        duressPin: '5678',
        consentRecords: [],
      };

      const result = validateCreateUserInput(input);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one consent record is required');
    });

    it('should reject missing data_processing consent', () => {
      const input: CreateUserInput = {
        nationalId: '1234567890',
        normalPin: '1234',
        duressPin: '5678',
        consentRecords: [{ purpose: 'marketing', granted: true }],
      };

      const result = validateCreateUserInput(input);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Consent for data processing is required');
    });
  });

  describe('createUser', () => {
    it('should create a user with hashed PINs', async () => {
      const input: CreateUserInput = {
        nationalId: '1234567890',
        normalPin: '1234',
        duressPin: '5678',
        consentRecords: [{ purpose: 'data_processing', granted: true }],
      };

      const user = await createUser(input, TEST_ENCRYPTION_KEY);

      expect(user.id).toBeDefined();
      expect(user.normalPinHash).not.toBe(input.normalPin);
      expect(user.duressPinHash).not.toBe(input.duressPin);
      expect(user.nationalId).not.toBe(input.nationalId);
      expect(user.isActive).toBe(true);
    });

    it('should throw error for invalid input', async () => {
      const input: CreateUserInput = {
        nationalId: '',
        normalPin: '1234',
        duressPin: '5678',
        consentRecords: [{ purpose: 'data_processing', granted: true }],
      };

      await expect(createUser(input, TEST_ENCRYPTION_KEY)).rejects.toThrow('Invalid user input');
    });
  });

  describe('validateUserPin', () => {
    let user: User;
    const normalPin = '1234';
    const duressPin = '5678';

    beforeAll(async () => {
      user = await createUser(
        {
          nationalId: '1234567890',
          normalPin,
          duressPin,
          consentRecords: [{ purpose: 'data_processing', granted: true }],
        },
        TEST_ENCRYPTION_KEY
      );
    });

    it('should validate normal PIN correctly', async () => {
      const result = await validateUserPin(user, normalPin);
      expect(result.valid).toBe(true);
      expect(result.pinType).toBe('normal');
    });

    it('should validate duress PIN correctly', async () => {
      const result = await validateUserPin(user, duressPin);
      expect(result.valid).toBe(true);
      expect(result.pinType).toBe('duress');
    });

    it('should reject invalid PIN', async () => {
      const result = await validateUserPin(user, '9999');
      expect(result.valid).toBe(false);
      expect(result.pinType).toBeUndefined();
    });
  });

  describe('hasRequiredConsents', () => {
    it('should return true when user has data_processing consent', async () => {
      const user = await createUser(
        {
          nationalId: '1234567890',
          normalPin: '1234',
          duressPin: '5678',
          consentRecords: [{ purpose: 'data_processing', granted: true }],
        },
        TEST_ENCRYPTION_KEY
      );

      expect(hasRequiredConsents(user)).toBe(true);
    });

    it('should return false when consent is withdrawn', async () => {
      const user = await createUser(
        {
          nationalId: '1234567890',
          normalPin: '1234',
          duressPin: '5678',
          consentRecords: [{ purpose: 'data_processing', granted: true }],
        },
        TEST_ENCRYPTION_KEY
      );

      // Simulate withdrawn consent
      user.consentRecords[0].withdrawnAt = new Date();

      expect(hasRequiredConsents(user)).toBe(false);
    });
  });

  describe('decryptNationalId', () => {
    it('should decrypt national ID correctly', async () => {
      const originalNationalId = '1234567890';
      const user = await createUser(
        {
          nationalId: originalNationalId,
          normalPin: '1234',
          duressPin: '5678',
          consentRecords: [{ purpose: 'data_processing', granted: true }],
        },
        TEST_ENCRYPTION_KEY
      );

      const decrypted = decryptNationalId(user, TEST_ENCRYPTION_KEY);
      expect(decrypted).toBe(originalNationalId);
    });
  });
});
