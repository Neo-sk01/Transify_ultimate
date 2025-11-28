/**
 * Admin Authentication Service
 * Handles admin authentication with MFA and role-based access control
 * Requirements: 8.4
 */

import {
  Admin,
  AdminSession,
  AdminAuthResult,
  MfaVerificationResult,
  MfaMethod,
  verifyAdminPassword,
  isAccountLocked,
  recordFailedLogin,
  recordSuccessfulLogin,
  verifyTotpCode,
  createAdminSession,
  hasPermission,
  sessionHasPermission,
  isSessionValid,
  getAdminPermissions,
} from '../../models/admin';
import { decrypt } from '../../utils/crypto';

/**
 * Pending MFA verification session
 */
export interface PendingMfaSession {
  adminId: string;
  mfaMethod: MfaMethod;
  oneTimeCode?: string;
  codeExpiresAt?: Date;
  createdAt: Date;
}

/**
 * Admin authentication request
 */
export interface AdminAuthRequest {
  email: string;
  password: string;
}

/**
 * MFA verification request
 */
export interface MfaVerifyRequest {
  adminId: string;
  code: string;
}

/**
 * Access check result
 */
export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
}

// In-memory storage for pending MFA sessions (in production, use Redis or similar)
const pendingMfaSessions = new Map<string, PendingMfaSession>();

// MFA code expiration time (5 minutes)
const MFA_CODE_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Authenticate admin with password (first factor)
 * Returns pending MFA session if password is valid
 * Requirements: 8.4
 */
export async function authenticateAdmin(
  request: AdminAuthRequest,
  admin: Admin | null
): Promise<AdminAuthResult> {
  // If admin not found, return generic failure
  if (!admin) {
    return {
      authenticated: false,
      requiresMfa: false,
      error: 'Authentication failed',
    };
  }

  // Check if account is locked
  if (isAccountLocked(admin)) {
    return {
      authenticated: false,
      requiresMfa: false,
      error: 'Account is temporarily locked',
    };
  }

  // Check if account is active
  if (!admin.isActive) {
    return {
      authenticated: false,
      requiresMfa: false,
      error: 'Authentication failed',
    };
  }

  // Verify password
  const passwordValid = await verifyAdminPassword(admin, request.password);
  if (!passwordValid) {
    return {
      authenticated: false,
      requiresMfa: false,
      error: 'Authentication failed',
    };
  }

  // Password valid - require MFA
  // Check if MFA is enabled
  if (!admin.mfaConfig.enabled) {
    return {
      authenticated: false,
      requiresMfa: false,
      error: 'MFA not configured',
    };
  }

  // Create pending MFA session
  const pendingSession: PendingMfaSession = {
    adminId: admin.id,
    mfaMethod: admin.mfaConfig.method,
    createdAt: new Date(),
  };

  // For SMS/email MFA, generate and store one-time code
  if (admin.mfaConfig.method === 'sms' || admin.mfaConfig.method === 'email') {
    const code = generateMfaCode();
    pendingSession.oneTimeCode = code;
    pendingSession.codeExpiresAt = new Date(Date.now() + MFA_CODE_EXPIRY_MS);
    // In production, send code via SMS or email here
  }

  pendingMfaSessions.set(admin.id, pendingSession);

  return {
    authenticated: false,
    requiresMfa: true,
    mfaMethod: admin.mfaConfig.method,
  };
}

/**
 * Generate a 6-digit MFA code
 */
function generateMfaCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Verify MFA code and complete authentication
 * Requirements: 8.4
 */
export async function verifyMfa(
  request: MfaVerifyRequest,
  admin: Admin | null,
  encryptionKey: string
): Promise<{ result: MfaVerificationResult; session?: AdminSession; updatedAdmin?: Admin }> {
  // Check if admin exists
  if (!admin) {
    return {
      result: { valid: false, error: 'Authentication failed' },
    };
  }

  // Check for pending MFA session
  const pendingSession = pendingMfaSessions.get(admin.id);
  if (!pendingSession) {
    return {
      result: { valid: false, error: 'No pending MFA session' },
    };
  }

  let codeValid = false;

  // Verify based on MFA method
  switch (admin.mfaConfig.method) {
    case 'totp': {
      if (!admin.mfaConfig.secret) {
        return {
          result: { valid: false, error: 'TOTP not configured' },
        };
      }
      const decryptedSecret = decrypt(admin.mfaConfig.secret, encryptionKey);
      codeValid = verifyTotpCode(decryptedSecret, request.code);
      break;
    }
    case 'sms':
    case 'email': {
      if (!pendingSession.oneTimeCode || !pendingSession.codeExpiresAt) {
        return {
          result: { valid: false, error: 'No code generated' },
        };
      }
      if (new Date() > pendingSession.codeExpiresAt) {
        pendingMfaSessions.delete(admin.id);
        return {
          result: { valid: false, error: 'Code expired' },
        };
      }
      codeValid = request.code === pendingSession.oneTimeCode;
      break;
    }
    default:
      return {
        result: { valid: false, error: 'Invalid MFA method' },
      };
  }

  if (!codeValid) {
    // Record failed attempt
    const updatedAdmin = recordFailedLogin(admin);
    return {
      result: { valid: false, error: 'Invalid code' },
      updatedAdmin,
    };
  }

  // MFA verified - create session
  pendingMfaSessions.delete(admin.id);
  const updatedAdmin = recordSuccessfulLogin(admin);
  const session = createAdminSession(updatedAdmin);

  return {
    result: { valid: true },
    session,
    updatedAdmin,
  };
}

/**
 * Check if admin has access to a specific resource/action
 * Requirements: 8.4
 */
export function checkAdminAccess(
  session: AdminSession | null,
  requiredPermission: string
): AccessCheckResult {
  if (!session) {
    return {
      allowed: false,
      reason: 'No active session',
    };
  }

  if (!isSessionValid(session)) {
    return {
      allowed: false,
      reason: 'Session expired',
    };
  }

  if (!session.mfaVerified) {
    return {
      allowed: false,
      reason: 'MFA not verified',
    };
  }

  if (!sessionHasPermission(session, requiredPermission)) {
    return {
      allowed: false,
      reason: 'Insufficient permissions',
    };
  }

  return {
    allowed: true,
  };
}

/**
 * Check if admin has access based on Admin object (for direct checks)
 * Requirements: 8.4
 */
export function checkAdminPermission(
  admin: Admin | null,
  mfaVerified: boolean,
  requiredPermission: string
): AccessCheckResult {
  if (!admin) {
    return {
      allowed: false,
      reason: 'Admin not found',
    };
  }

  if (!admin.isActive) {
    return {
      allowed: false,
      reason: 'Account inactive',
    };
  }

  if (!mfaVerified) {
    return {
      allowed: false,
      reason: 'MFA not verified',
    };
  }

  if (!hasPermission(admin, requiredPermission)) {
    return {
      allowed: false,
      reason: 'Insufficient permissions',
    };
  }

  return {
    allowed: true,
  };
}

/**
 * Invalidate a pending MFA session
 */
export function invalidatePendingMfa(adminId: string): void {
  pendingMfaSessions.delete(adminId);
}

/**
 * Get pending MFA session (for testing)
 */
export function getPendingMfaSession(adminId: string): PendingMfaSession | undefined {
  return pendingMfaSessions.get(adminId);
}

/**
 * Clear all pending MFA sessions (for testing)
 */
export function clearPendingMfaSessions(): void {
  pendingMfaSessions.clear();
}

/**
 * Admin Authentication Service interface
 */
export interface AdminAuthService {
  authenticateAdmin(request: AdminAuthRequest, admin: Admin | null): Promise<AdminAuthResult>;
  verifyMfa(
    request: MfaVerifyRequest,
    admin: Admin | null,
    encryptionKey: string
  ): Promise<{ result: MfaVerificationResult; session?: AdminSession; updatedAdmin?: Admin }>;
  checkAdminAccess(session: AdminSession | null, requiredPermission: string): AccessCheckResult;
  checkAdminPermission(
    admin: Admin | null,
    mfaVerified: boolean,
    requiredPermission: string
  ): AccessCheckResult;
}

/**
 * Create an AdminAuthService instance
 */
export function createAdminAuthService(): AdminAuthService {
  return {
    authenticateAdmin,
    verifyMfa,
    checkAdminAccess,
    checkAdminPermission,
  };
}
