/**
 * Admin Model
 * Represents TRANSRIFY administrators with MFA and role-based access control
 * Requirements: 8.4
 */

import { hashPin, verifyPin, generateId, encrypt, decrypt } from '../utils/crypto';
import { createHash, randomBytes } from 'crypto';

/**
 * Admin roles for role-based access control
 */
export type AdminRole = 'super_admin' | 'operations' | 'compliance' | 'support';

/**
 * Permissions associated with each role
 */
export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  super_admin: [
    'view_dashboard',
    'view_emergencies',
    'view_evidence',
    'manage_users',
    'manage_admins',
    'view_audit_logs',
    'generate_reports',
    'manage_institutions',
    'access_all',
  ],
  operations: [
    'view_dashboard',
    'view_emergencies',
    'view_evidence',
    'manage_users',
    'view_audit_logs',
  ],
  compliance: [
    'view_dashboard',
    'view_audit_logs',
    'generate_reports',
    'view_evidence',
  ],
  support: [
    'view_dashboard',
    'view_emergencies',
    'manage_users',
  ],
};

/**
 * MFA method types
 */
export type MfaMethod = 'totp' | 'sms' | 'email';

/**
 * MFA configuration for an admin
 */
export interface MfaConfig {
  method: MfaMethod;
  secret?: string; // For TOTP - encrypted
  phone?: string;  // For SMS
  email?: string;  // For email
  enabled: boolean;
  verifiedAt?: Date;
}

/**
 * Admin user interface
 */
export interface Admin {
  id: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  mfaConfig: MfaConfig;
  isActive: boolean;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Admin creation input
 */
export interface CreateAdminInput {
  email: string;
  password: string;
  role: AdminRole;
  mfaMethod: MfaMethod;
  mfaPhone?: string;
  mfaEmail?: string;
}

/**
 * Admin validation result
 */
export interface AdminValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * MFA verification result
 */
export interface MfaVerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Admin authentication result
 */
export interface AdminAuthResult {
  authenticated: boolean;
  requiresMfa: boolean;
  mfaMethod?: MfaMethod;
  sessionToken?: string;
  error?: string;
}

/**
 * Admin session for tracking authenticated sessions
 */
export interface AdminSession {
  id: string;
  adminId: string;
  role: AdminRole;
  permissions: string[];
  mfaVerified: boolean;
  createdAt: Date;
  expiresAt: Date;
}

// Constants
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
const TOTP_WINDOW = 1; // Allow 1 step before/after current time

/**
 * Validate admin creation input
 */
export function validateCreateAdminInput(input: CreateAdminInput): AdminValidationResult {
  const errors: string[] = [];

  if (!input.email || !input.email.includes('@')) {
    errors.push('Valid email is required');
  }

  if (!input.password || input.password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }

  // Password complexity requirements
  if (input.password) {
    if (!/[A-Z]/.test(input.password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(input.password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(input.password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[^A-Za-z0-9]/.test(input.password)) {
      errors.push('Password must contain at least one special character');
    }
  }

  if (!input.role || !ROLE_PERMISSIONS[input.role]) {
    errors.push('Valid role is required');
  }

  if (!input.mfaMethod) {
    errors.push('MFA method is required');
  }

  if (input.mfaMethod === 'sms' && !input.mfaPhone) {
    errors.push('Phone number is required for SMS MFA');
  }

  if (input.mfaMethod === 'email' && !input.mfaEmail) {
    errors.push('Email is required for email MFA');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a TOTP secret
 */
export function generateTotpSecret(): string {
  return randomBytes(20).toString('base64');
}

/**
 * Generate a TOTP code from a secret
 * Uses HMAC-based One-Time Password algorithm
 */
export function generateTotpCode(secret: string, timestamp?: number): string {
  const time = timestamp ?? Math.floor(Date.now() / 1000);
  const counter = Math.floor(time / 30);
  
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));
  
  const hmac = createHash('sha256')
    .update(Buffer.concat([Buffer.from(secret, 'base64'), counterBuffer]))
    .digest();
  
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) |
               ((hmac[offset + 1] & 0xff) << 16) |
               ((hmac[offset + 2] & 0xff) << 8) |
               (hmac[offset + 3] & 0xff);
  
  return (code % 1000000).toString().padStart(6, '0');
}

/**
 * Verify a TOTP code
 */
export function verifyTotpCode(secret: string, code: string, timestamp?: number): boolean {
  const time = timestamp ?? Math.floor(Date.now() / 1000);
  
  // Check current and adjacent time windows
  for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
    const windowTime = time + (i * 30);
    const expectedCode = generateTotpCode(secret, windowTime);
    if (code === expectedCode) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generate a one-time code for SMS/email MFA
 */
export function generateOneTimeCode(): string {
  return randomBytes(3).readUIntBE(0, 3).toString().slice(-6).padStart(6, '0');
}

/**
 * Create a new admin user
 * Requirements: 8.4
 */
export async function createAdmin(
  input: CreateAdminInput,
  encryptionKey: string
): Promise<Admin> {
  const validation = validateCreateAdminInput(input);
  if (!validation.valid) {
    throw new Error(`Invalid admin input: ${validation.errors.join(', ')}`);
  }

  const now = new Date();
  const passwordHash = await hashPin(input.password);

  const mfaConfig: MfaConfig = {
    method: input.mfaMethod,
    enabled: false, // Must be verified before enabling
  };

  if (input.mfaMethod === 'totp') {
    mfaConfig.secret = encrypt(generateTotpSecret(), encryptionKey);
  } else if (input.mfaMethod === 'sms') {
    mfaConfig.phone = input.mfaPhone;
  } else if (input.mfaMethod === 'email') {
    mfaConfig.email = input.mfaEmail;
  }

  return {
    id: generateId(),
    email: input.email,
    passwordHash,
    role: input.role,
    mfaConfig,
    isActive: true,
    failedLoginAttempts: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Check if admin account is locked
 */
export function isAccountLocked(admin: Admin): boolean {
  if (!admin.lockedUntil) {
    return false;
  }
  return new Date() < admin.lockedUntil;
}

/**
 * Verify admin password
 */
export async function verifyAdminPassword(
  admin: Admin,
  password: string
): Promise<boolean> {
  return verifyPin(password, admin.passwordHash);
}

/**
 * Record a failed login attempt
 */
export function recordFailedLogin(admin: Admin): Admin {
  const failedAttempts = admin.failedLoginAttempts + 1;
  const updates: Partial<Admin> = {
    failedLoginAttempts: failedAttempts,
    updatedAt: new Date(),
  };

  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    updates.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
  }

  return { ...admin, ...updates };
}

/**
 * Record a successful login
 */
export function recordSuccessfulLogin(admin: Admin): Admin {
  return {
    ...admin,
    failedLoginAttempts: 0,
    lockedUntil: undefined,
    lastLoginAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Check if admin has a specific permission
 * Requirements: 8.4
 */
export function hasPermission(admin: Admin, permission: string): boolean {
  if (!admin.isActive) {
    return false;
  }
  const permissions = ROLE_PERMISSIONS[admin.role] || [];
  return permissions.includes(permission) || permissions.includes('access_all');
}

/**
 * Check if admin has any of the specified permissions
 */
export function hasAnyPermission(admin: Admin, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(admin, p));
}

/**
 * Get all permissions for an admin
 */
export function getAdminPermissions(admin: Admin): string[] {
  if (!admin.isActive) {
    return [];
  }
  return ROLE_PERMISSIONS[admin.role] || [];
}

/**
 * Create an admin session after successful MFA verification
 * Requirements: 8.4
 */
export function createAdminSession(admin: Admin): AdminSession {
  const now = new Date();
  return {
    id: generateId(),
    adminId: admin.id,
    role: admin.role,
    permissions: getAdminPermissions(admin),
    mfaVerified: true,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
  };
}

/**
 * Check if a session is valid
 */
export function isSessionValid(session: AdminSession): boolean {
  return session.mfaVerified && new Date() < session.expiresAt;
}

/**
 * Check if session has permission
 */
export function sessionHasPermission(session: AdminSession, permission: string): boolean {
  if (!isSessionValid(session)) {
    return false;
  }
  return session.permissions.includes(permission) || session.permissions.includes('access_all');
}
