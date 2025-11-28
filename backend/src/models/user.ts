/**
 * User Model
 * Represents a TRANSRIFY user with dual PIN authentication
 * Requirements: 1.4, 10.3
 */

import { hashPin, verifyPin, encrypt, decrypt, generateId } from '../utils/crypto';

export interface ConsentRecord {
  purpose: string;
  granted: boolean;
  grantedAt: Date;
  expiresAt?: Date;
  withdrawnAt?: Date;
}

export type NotificationChannel = 'sms' | 'push' | 'email';

export interface EmergencyContact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notificationChannels: NotificationChannel[];
  consentVerified: boolean;
  consentDate?: Date;
}

export interface User {
  id: string;
  nationalId: string; // Encrypted
  normalPinHash: string;
  duressPinHash: string;
  emergencyContacts: EmergencyContact[];
  registeredInstitutions: string[];
  consentRecords: ConsentRecord[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User creation input (without system-generated fields)
 */
export interface CreateUserInput {
  nationalId: string;
  normalPin: string;
  duressPin: string;
  consentRecords: Omit<ConsentRecord, 'grantedAt'>[];
}

/**
 * User validation result
 */
export interface UserValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * PIN type returned internally (never exposed to external systems)
 */
export type PinType = 'normal' | 'duress';

/**
 * Result of PIN validation
 */
export interface PinValidationResult {
  valid: boolean;
  pinType?: PinType;
}

/**
 * Validate user creation input
 */
export function validateCreateUserInput(input: CreateUserInput): UserValidationResult {
  const errors: string[] = [];
  
  if (!input.nationalId || input.nationalId.trim().length === 0) {
    errors.push('National ID is required');
  }
  
  if (!input.normalPin || input.normalPin.length < 4) {
    errors.push('Normal PIN must be at least 4 characters');
  }
  
  if (!input.duressPin || input.duressPin.length < 4) {
    errors.push('Duress PIN must be at least 4 characters');
  }
  
  if (input.normalPin === input.duressPin) {
    errors.push('Normal PIN and Duress PIN must be different');
  }
  
  if (!input.consentRecords || input.consentRecords.length === 0) {
    errors.push('At least one consent record is required');
  }
  
  // Validate that all consent records have granted=true for required purposes
  const hasDataProcessingConsent = input.consentRecords?.some(
    (c) => c.purpose === 'data_processing' && c.granted
  );
  if (!hasDataProcessingConsent) {
    errors.push('Consent for data processing is required');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if user has all required consents to be activated
 * Requirements: 10.1
 */
export function hasRequiredConsents(user: User): boolean {
  const requiredPurposes = ['data_processing'];
  return requiredPurposes.every((purpose) =>
    user.consentRecords.some((c) => c.purpose === purpose && c.granted && !c.withdrawnAt)
  );
}

/**
 * Create a new user with hashed PINs and encrypted national ID
 * Requirements: 1.4, 10.3
 */
export async function createUser(
  input: CreateUserInput,
  encryptionKey: string
): Promise<User> {
  const validation = validateCreateUserInput(input);
  if (!validation.valid) {
    throw new Error(`Invalid user input: ${validation.errors.join(', ')}`);
  }

  const now = new Date();
  const [normalPinHash, duressPinHash] = await Promise.all([
    hashPin(input.normalPin),
    hashPin(input.duressPin),
  ]);

  const user: User = {
    id: generateId(),
    nationalId: encrypt(input.nationalId, encryptionKey),
    normalPinHash,
    duressPinHash,
    emergencyContacts: [],
    registeredInstitutions: [],
    consentRecords: input.consentRecords.map((c) => ({
      ...c,
      grantedAt: now,
    })),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  // User is only active if they have required consents
  user.isActive = hasRequiredConsents(user);

  return user;
}

/**
 * Validate a PIN against a user's stored hashes
 * Returns the PIN type if valid, undefined if invalid
 * Requirements: 1.1, 1.2
 */
export async function validateUserPin(
  user: User,
  pin: string
): Promise<PinValidationResult> {
  // Check normal PIN first
  const isNormalPin = await verifyPin(pin, user.normalPinHash);
  if (isNormalPin) {
    return { valid: true, pinType: 'normal' };
  }

  // Check duress PIN
  const isDuressPin = await verifyPin(pin, user.duressPinHash);
  if (isDuressPin) {
    return { valid: true, pinType: 'duress' };
  }

  return { valid: false };
}

/**
 * Decrypt user's national ID
 * Requirements: 10.3
 */
export function decryptNationalId(user: User, encryptionKey: string): string {
  return decrypt(user.nationalId, encryptionKey);
}
