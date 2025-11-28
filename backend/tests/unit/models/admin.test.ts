/**
 * Admin Model Unit Tests
 * Requirements: 8.4
 */

import {
  Admin,
  AdminRole,
  CreateAdminInput,
  MfaConfig,
  ROLE_PERMISSIONS,
  validateCreateAdminInput,
  createAdmin,
  isAccountLocked,
  verifyAdminPassword,
  recordFailedLogin,
  recordSuccessfulLogin,
  hasPermission,
  hasAnyPermission,
  getAdminPermissions,
  createAdminSession,
  isSessionValid,
  sessionHasPermission,
  generateTotpSecret,
  generateTotpCode,
  verifyTotpCode,
  generateOneTimeCode,
} from '../../../src/models/admin';

describe('Admin Model', () => {
  const validInput: CreateAdminInput = {
    email: 'admin@example.com',
    password: 'SecurePass123!',
    role: 'operations',
    mfaMethod: 'totp',
  };

  const encryptionKey = 'test-encryption-key-32-chars-ok';

  describe('validateCreateAdminInput', () => {
    it('should validate correct input', () => {
      const result = validateCreateAdminInput(validInput);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email', () => {
      const result = validateCreateAdminInput({ ...validInput, email: 'invalid' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valid email is required');
    });

    it('should reject short password', () => {
      const result = validateCreateAdminInput({ ...validInput, password: 'Short1!' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters');
    });

    it('should require uppercase in password', () => {
      const result = validateCreateAdminInput({ ...validInput, password: 'securepass123!' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require lowercase in password', () => {
      const result = validateCreateAdminInput({ ...validInput, password: 'SECUREPASS123!' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require number in password', () => {
      const result = validateCreateAdminInput({ ...validInput, password: 'SecurePassword!' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should require special character in password', () => {
      const result = validateCreateAdminInput({ ...validInput, password: 'SecurePass1234' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should require phone for SMS MFA', () => {
      const result = validateCreateAdminInput({ ...validInput, mfaMethod: 'sms' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Phone number is required for SMS MFA');
    });

    it('should require email for email MFA', () => {
      const result = validateCreateAdminInput({ ...validInput, mfaMethod: 'email' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email is required for email MFA');
    });

    it('should accept SMS MFA with phone', () => {
      const result = validateCreateAdminInput({
        ...validInput,
        mfaMethod: 'sms',
        mfaPhone: '+1234567890',
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('createAdmin', () => {
    it('should create admin with hashed password', async () => {
      const admin = await createAdmin(validInput, encryptionKey);
      
      expect(admin.id).toBeDefined();
      expect(admin.email).toBe(validInput.email);
      expect(admin.passwordHash).not.toBe(validInput.password);
      expect(admin.role).toBe(validInput.role);
      expect(admin.isActive).toBe(true);
      expect(admin.failedLoginAttempts).toBe(0);
    });

    it('should configure TOTP MFA with encrypted secret', async () => {
      const admin = await createAdmin(validInput, encryptionKey);
      
      expect(admin.mfaConfig.method).toBe('totp');
      expect(admin.mfaConfig.secret).toBeDefined();
      expect(admin.mfaConfig.enabled).toBe(false);
    });

    it('should configure SMS MFA with phone', async () => {
      const admin = await createAdmin(
        { ...validInput, mfaMethod: 'sms', mfaPhone: '+1234567890' },
        encryptionKey
      );
      
      expect(admin.mfaConfig.method).toBe('sms');
      expect(admin.mfaConfig.phone).toBe('+1234567890');
    });

    it('should throw on invalid input', async () => {
      await expect(
        createAdmin({ ...validInput, email: 'invalid' }, encryptionKey)
      ).rejects.toThrow('Invalid admin input');
    });
  });

  describe('isAccountLocked', () => {
    it('should return false when not locked', () => {
      const admin = createMockAdmin();
      expect(isAccountLocked(admin)).toBe(false);
    });

    it('should return true when locked', () => {
      const admin = createMockAdmin({
        lockedUntil: new Date(Date.now() + 60000),
      });
      expect(isAccountLocked(admin)).toBe(true);
    });

    it('should return false when lock expired', () => {
      const admin = createMockAdmin({
        lockedUntil: new Date(Date.now() - 60000),
      });
      expect(isAccountLocked(admin)).toBe(false);
    });
  });

  describe('verifyAdminPassword', () => {
    it('should verify correct password', async () => {
      const admin = await createAdmin(validInput, encryptionKey);
      const result = await verifyAdminPassword(admin, validInput.password);
      expect(result).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const admin = await createAdmin(validInput, encryptionKey);
      const result = await verifyAdminPassword(admin, 'WrongPassword123!');
      expect(result).toBe(false);
    });
  });

  describe('recordFailedLogin', () => {
    it('should increment failed attempts', () => {
      const admin = createMockAdmin({ failedLoginAttempts: 2 });
      const updated = recordFailedLogin(admin);
      expect(updated.failedLoginAttempts).toBe(3);
    });

    it('should lock account after max attempts', () => {
      const admin = createMockAdmin({ failedLoginAttempts: 4 });
      const updated = recordFailedLogin(admin);
      expect(updated.failedLoginAttempts).toBe(5);
      expect(updated.lockedUntil).toBeDefined();
    });
  });

  describe('recordSuccessfulLogin', () => {
    it('should reset failed attempts', () => {
      const admin = createMockAdmin({ failedLoginAttempts: 3 });
      const updated = recordSuccessfulLogin(admin);
      expect(updated.failedLoginAttempts).toBe(0);
      expect(updated.lockedUntil).toBeUndefined();
      expect(updated.lastLoginAt).toBeDefined();
    });
  });

  describe('Role-Based Access Control', () => {
    describe('hasPermission', () => {
      it('should return true for valid permission', () => {
        const admin = createMockAdmin({ role: 'operations' });
        expect(hasPermission(admin, 'view_dashboard')).toBe(true);
      });

      it('should return false for invalid permission', () => {
        const admin = createMockAdmin({ role: 'support' });
        expect(hasPermission(admin, 'generate_reports')).toBe(false);
      });

      it('should return false for inactive admin', () => {
        const admin = createMockAdmin({ role: 'super_admin', isActive: false });
        expect(hasPermission(admin, 'view_dashboard')).toBe(false);
      });

      it('should grant all permissions to super_admin', () => {
        const admin = createMockAdmin({ role: 'super_admin' });
        expect(hasPermission(admin, 'manage_admins')).toBe(true);
        expect(hasPermission(admin, 'any_permission')).toBe(true); // access_all
      });
    });

    describe('hasAnyPermission', () => {
      it('should return true if any permission matches', () => {
        const admin = createMockAdmin({ role: 'support' });
        expect(hasAnyPermission(admin, ['generate_reports', 'view_dashboard'])).toBe(true);
      });

      it('should return false if no permissions match', () => {
        const admin = createMockAdmin({ role: 'support' });
        expect(hasAnyPermission(admin, ['generate_reports', 'manage_admins'])).toBe(false);
      });
    });

    describe('getAdminPermissions', () => {
      it('should return role permissions', () => {
        const admin = createMockAdmin({ role: 'compliance' });
        const permissions = getAdminPermissions(admin);
        expect(permissions).toEqual(ROLE_PERMISSIONS.compliance);
      });

      it('should return empty array for inactive admin', () => {
        const admin = createMockAdmin({ role: 'compliance', isActive: false });
        const permissions = getAdminPermissions(admin);
        expect(permissions).toEqual([]);
      });
    });
  });

  describe('Admin Sessions', () => {
    describe('createAdminSession', () => {
      it('should create valid session', () => {
        const admin = createMockAdmin({ role: 'operations' });
        const session = createAdminSession(admin);
        
        expect(session.id).toBeDefined();
        expect(session.adminId).toBe(admin.id);
        expect(session.role).toBe(admin.role);
        expect(session.mfaVerified).toBe(true);
        expect(session.permissions).toEqual(ROLE_PERMISSIONS.operations);
        expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
      });
    });

    describe('isSessionValid', () => {
      it('should return true for valid session', () => {
        const admin = createMockAdmin();
        const session = createAdminSession(admin);
        expect(isSessionValid(session)).toBe(true);
      });

      it('should return false for expired session', () => {
        const admin = createMockAdmin();
        const session = createAdminSession(admin);
        session.expiresAt = new Date(Date.now() - 1000);
        expect(isSessionValid(session)).toBe(false);
      });

      it('should return false if MFA not verified', () => {
        const admin = createMockAdmin();
        const session = createAdminSession(admin);
        session.mfaVerified = false;
        expect(isSessionValid(session)).toBe(false);
      });
    });

    describe('sessionHasPermission', () => {
      it('should check permission on valid session', () => {
        const admin = createMockAdmin({ role: 'operations' });
        const session = createAdminSession(admin);
        expect(sessionHasPermission(session, 'view_dashboard')).toBe(true);
        expect(sessionHasPermission(session, 'manage_admins')).toBe(false);
      });

      it('should return false for invalid session', () => {
        const admin = createMockAdmin({ role: 'operations' });
        const session = createAdminSession(admin);
        session.expiresAt = new Date(Date.now() - 1000);
        expect(sessionHasPermission(session, 'view_dashboard')).toBe(false);
      });
    });
  });

  describe('TOTP Functions', () => {
    describe('generateTotpSecret', () => {
      it('should generate base64 secret', () => {
        const secret = generateTotpSecret();
        expect(secret).toBeDefined();
        expect(secret.length).toBeGreaterThan(0);
      });
    });

    describe('generateTotpCode', () => {
      it('should generate 6-digit code', () => {
        const secret = generateTotpSecret();
        const code = generateTotpCode(secret);
        expect(code).toMatch(/^\d{6}$/);
      });

      it('should generate same code for same timestamp', () => {
        const secret = generateTotpSecret();
        const timestamp = Math.floor(Date.now() / 1000);
        const code1 = generateTotpCode(secret, timestamp);
        const code2 = generateTotpCode(secret, timestamp);
        expect(code1).toBe(code2);
      });
    });

    describe('verifyTotpCode', () => {
      it('should verify correct code', () => {
        const secret = generateTotpSecret();
        const timestamp = Math.floor(Date.now() / 1000);
        const code = generateTotpCode(secret, timestamp);
        expect(verifyTotpCode(secret, code, timestamp)).toBe(true);
      });

      it('should reject incorrect code', () => {
        const secret = generateTotpSecret();
        expect(verifyTotpCode(secret, '000000')).toBe(false);
      });

      it('should accept code from adjacent time window', () => {
        const secret = generateTotpSecret();
        const timestamp = Math.floor(Date.now() / 1000);
        const code = generateTotpCode(secret, timestamp - 30);
        expect(verifyTotpCode(secret, code, timestamp)).toBe(true);
      });
    });
  });

  describe('generateOneTimeCode', () => {
    it('should generate 6-digit code', () => {
      const code = generateOneTimeCode();
      expect(code).toMatch(/^\d{6}$/);
    });
  });
});

// Helper function to create mock admin
function createMockAdmin(overrides: Partial<Admin> = {}): Admin {
  const now = new Date();
  return {
    id: 'admin-123',
    email: 'admin@example.com',
    passwordHash: 'hashed-password',
    role: 'operations' as AdminRole,
    mfaConfig: {
      method: 'totp',
      secret: 'encrypted-secret',
      enabled: true,
    },
    isActive: true,
    failedLoginAttempts: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
