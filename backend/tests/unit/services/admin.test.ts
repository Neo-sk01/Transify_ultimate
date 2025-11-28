/**
 * Admin Authentication Service Unit Tests
 * Requirements: 8.4
 */

import {
  authenticateAdmin,
  verifyMfa,
  checkAdminAccess,
  checkAdminPermission,
  clearPendingMfaSessions,
  getPendingMfaSession,
  AdminAuthRequest,
  MfaVerifyRequest,
} from '../../../src/services/admin';
import {
  Admin,
  AdminRole,
  AdminSession,
  createAdmin,
  CreateAdminInput,
  generateTotpCode,
  ROLE_PERMISSIONS,
} from '../../../src/models/admin';
import { decrypt } from '../../../src/utils/crypto';

describe('Admin Authentication Service', () => {
  const encryptionKey = 'test-encryption-key-32-chars-ok';
  
  const validInput: CreateAdminInput = {
    email: 'admin@example.com',
    password: 'SecurePass123!',
    role: 'operations',
    mfaMethod: 'totp',
  };

  beforeEach(() => {
    clearPendingMfaSessions();
  });

  describe('authenticateAdmin', () => {
    it('should return requiresMfa on valid password', async () => {
      const admin = await createAdmin(validInput, encryptionKey);
      admin.mfaConfig.enabled = true;
      
      const request: AdminAuthRequest = {
        email: validInput.email,
        password: validInput.password,
      };
      
      const result = await authenticateAdmin(request, admin);
      
      expect(result.authenticated).toBe(false);
      expect(result.requiresMfa).toBe(true);
      expect(result.mfaMethod).toBe('totp');
    });

    it('should fail for null admin', async () => {
      const request: AdminAuthRequest = {
        email: 'unknown@example.com',
        password: 'password',
      };
      
      const result = await authenticateAdmin(request, null);
      
      expect(result.authenticated).toBe(false);
      expect(result.requiresMfa).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });

    it('should fail for wrong password', async () => {
      const admin = await createAdmin(validInput, encryptionKey);
      admin.mfaConfig.enabled = true;
      
      const request: AdminAuthRequest = {
        email: validInput.email,
        password: 'WrongPassword123!',
      };
      
      const result = await authenticateAdmin(request, admin);
      
      expect(result.authenticated).toBe(false);
      expect(result.requiresMfa).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });

    it('should fail for locked account', async () => {
      const admin = await createAdmin(validInput, encryptionKey);
      admin.mfaConfig.enabled = true;
      admin.lockedUntil = new Date(Date.now() + 60000);
      
      const request: AdminAuthRequest = {
        email: validInput.email,
        password: validInput.password,
      };
      
      const result = await authenticateAdmin(request, admin);
      
      expect(result.authenticated).toBe(false);
      expect(result.error).toBe('Account is temporarily locked');
    });

    it('should fail for inactive account', async () => {
      const admin = await createAdmin(validInput, encryptionKey);
      admin.mfaConfig.enabled = true;
      admin.isActive = false;
      
      const request: AdminAuthRequest = {
        email: validInput.email,
        password: validInput.password,
      };
      
      const result = await authenticateAdmin(request, admin);
      
      expect(result.authenticated).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });

    it('should fail if MFA not enabled', async () => {
      const admin = await createAdmin(validInput, encryptionKey);
      // MFA is disabled by default
      
      const request: AdminAuthRequest = {
        email: validInput.email,
        password: validInput.password,
      };
      
      const result = await authenticateAdmin(request, admin);
      
      expect(result.authenticated).toBe(false);
      expect(result.error).toBe('MFA not configured');
    });

    it('should create pending MFA session', async () => {
      const admin = await createAdmin(validInput, encryptionKey);
      admin.mfaConfig.enabled = true;
      
      const request: AdminAuthRequest = {
        email: validInput.email,
        password: validInput.password,
      };
      
      await authenticateAdmin(request, admin);
      
      const pendingSession = getPendingMfaSession(admin.id);
      expect(pendingSession).toBeDefined();
      expect(pendingSession?.adminId).toBe(admin.id);
      expect(pendingSession?.mfaMethod).toBe('totp');
    });
  });

  describe('verifyMfa', () => {
    it('should verify TOTP code and create session', async () => {
      const admin = await createAdmin(validInput, encryptionKey);
      admin.mfaConfig.enabled = true;
      
      // First authenticate to create pending session
      await authenticateAdmin(
        { email: validInput.email, password: validInput.password },
        admin
      );
      
      // Get the TOTP code
      const decryptedSecret = decrypt(admin.mfaConfig.secret!, encryptionKey);
      const code = generateTotpCode(decryptedSecret);
      
      const request: MfaVerifyRequest = {
        adminId: admin.id,
        code,
      };
      
      const { result, session, updatedAdmin } = await verifyMfa(request, admin, encryptionKey);
      
      expect(result.valid).toBe(true);
      expect(session).toBeDefined();
      expect(session?.adminId).toBe(admin.id);
      expect(session?.mfaVerified).toBe(true);
      expect(updatedAdmin?.failedLoginAttempts).toBe(0);
    });

    it('should fail for null admin', async () => {
      const request: MfaVerifyRequest = {
        adminId: 'unknown',
        code: '123456',
      };
      
      const { result } = await verifyMfa(request, null, encryptionKey);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });

    it('should fail without pending session', async () => {
      const admin = await createAdmin(validInput, encryptionKey);
      admin.mfaConfig.enabled = true;
      
      const request: MfaVerifyRequest = {
        adminId: admin.id,
        code: '123456',
      };
      
      const { result } = await verifyMfa(request, admin, encryptionKey);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No pending MFA session');
    });

    it('should fail for invalid TOTP code', async () => {
      const admin = await createAdmin(validInput, encryptionKey);
      admin.mfaConfig.enabled = true;
      
      await authenticateAdmin(
        { email: validInput.email, password: validInput.password },
        admin
      );
      
      const request: MfaVerifyRequest = {
        adminId: admin.id,
        code: '000000',
      };
      
      const { result, updatedAdmin } = await verifyMfa(request, admin, encryptionKey);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid code');
      expect(updatedAdmin?.failedLoginAttempts).toBe(1);
    });

    it('should verify SMS/email one-time code', async () => {
      const smsInput: CreateAdminInput = {
        ...validInput,
        mfaMethod: 'sms',
        mfaPhone: '+1234567890',
      };
      const admin = await createAdmin(smsInput, encryptionKey);
      admin.mfaConfig.enabled = true;
      
      await authenticateAdmin(
        { email: smsInput.email, password: smsInput.password },
        admin
      );
      
      // Get the generated code from pending session
      const pendingSession = getPendingMfaSession(admin.id);
      expect(pendingSession?.oneTimeCode).toBeDefined();
      
      const request: MfaVerifyRequest = {
        adminId: admin.id,
        code: pendingSession!.oneTimeCode!,
      };
      
      const { result, session } = await verifyMfa(request, admin, encryptionKey);
      
      expect(result.valid).toBe(true);
      expect(session).toBeDefined();
    });
  });

  describe('checkAdminAccess', () => {
    it('should allow access with valid session and permission', () => {
      const session = createMockSession({ role: 'operations' });
      
      const result = checkAdminAccess(session, 'view_dashboard');
      
      expect(result.allowed).toBe(true);
    });

    it('should deny access with null session', () => {
      const result = checkAdminAccess(null, 'view_dashboard');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('No active session');
    });

    it('should deny access with expired session', () => {
      const session = createMockSession({
        expiresAt: new Date(Date.now() - 1000),
      });
      
      const result = checkAdminAccess(session, 'view_dashboard');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Session expired');
    });

    it('should deny access without MFA verification', () => {
      const session = createMockSession({ mfaVerified: false });
      
      const result = checkAdminAccess(session, 'view_dashboard');
      
      expect(result.allowed).toBe(false);
      // Session is invalid when MFA not verified, so it's treated as expired
      expect(result.reason).toBe('Session expired');
    });

    it('should deny access without required permission', () => {
      const session = createMockSession({ role: 'support' });
      
      const result = checkAdminAccess(session, 'generate_reports');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Insufficient permissions');
    });
  });

  describe('checkAdminPermission', () => {
    it('should allow access with valid admin and MFA', () => {
      const admin = createMockAdmin({ role: 'operations' });
      
      const result = checkAdminPermission(admin, true, 'view_dashboard');
      
      expect(result.allowed).toBe(true);
    });

    it('should deny access with null admin', () => {
      const result = checkAdminPermission(null, true, 'view_dashboard');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Admin not found');
    });

    it('should deny access for inactive admin', () => {
      const admin = createMockAdmin({ isActive: false });
      
      const result = checkAdminPermission(admin, true, 'view_dashboard');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Account inactive');
    });

    it('should deny access without MFA verification', () => {
      const admin = createMockAdmin();
      
      const result = checkAdminPermission(admin, false, 'view_dashboard');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('MFA not verified');
    });

    it('should deny access without required permission', () => {
      const admin = createMockAdmin({ role: 'support' });
      
      const result = checkAdminPermission(admin, true, 'manage_admins');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Insufficient permissions');
    });
  });
});

// Helper functions
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

function createMockSession(overrides: Partial<AdminSession> = {}): AdminSession {
  const now = new Date();
  const role = (overrides.role || 'operations') as AdminRole;
  return {
    id: 'session-123',
    adminId: 'admin-123',
    role,
    permissions: ROLE_PERMISSIONS[role],
    mfaVerified: true,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 8 * 60 * 60 * 1000),
    ...overrides,
  };
}
