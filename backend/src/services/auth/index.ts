/**
 * Authentication Service
 * Handles PIN validation and verification advice generation
 * Requirements: 1.1, 1.2, 1.5, 5.2, 5.3
 */

import { User, validateUserPin, PinType as UserPinType } from '../../models/user';
import { hashPin as cryptoHashPin, verifyPin } from '../../utils/crypto';

export type PinType = 'normal' | 'duress';
export type TransactionType = 'login' | 'atm' | 'pos' | 'transfer';

export interface ValidationRequest {
  userId: string;
  pin: string;
  institutionId: string;
  transactionType: TransactionType;
  deviceFingerprint: string;
}

export interface VerificationAdvice {
  status: 'authenticated' | 'failed';
  recommendedRouting: string;
  transactionLimits?: TransactionLimits;
}

export interface TransactionLimits {
  maxAmount?: number;
  allowedOperations: string[];
}

export interface ValidationResponse {
  valid: boolean;
  pinType: PinType;
  verificationAdvice: VerificationAdvice;
  emergencyTriggered: boolean;
}

/**
 * Generic authentication error - identical for all failure types
 * Requirements: 1.5 - No PIN type information leakage
 */
export interface AuthenticationError {
  code: 'AUTH_FAILED';
  message: 'Authentication failed';
}

/**
 * Create a generic authentication error
 * All failures return identical error to prevent PIN type enumeration
 * Requirements: 1.5
 */
export function createAuthenticationError(): AuthenticationError {
  return {
    code: 'AUTH_FAILED',
    message: 'Authentication failed',
  };
}

/**
 * Authentication Service interface
 */
export interface AuthenticationService {
  validateCredentials(request: ValidationRequest, user: User | null): Promise<ValidationResponse>;
  generateVerificationAdvice(pinType: PinType, transactionType: TransactionType): VerificationAdvice;
  hashPin(pin: string): Promise<string>;
  comparePin(pin: string, hashedPin: string): Promise<boolean>;
}

/**
 * Default transaction limits for duress situations
 * These are communicated to the bank but NOT visible to the user
 * Requirements: 5.3
 */
const DURESS_TRANSACTION_LIMITS: TransactionLimits = {
  maxAmount: 500,
  allowedOperations: ['withdrawal', 'balance_inquiry'],
};

/**
 * Get recommended routing based on transaction type
 */
function getRecommendedRouting(transactionType: TransactionType): string {
  switch (transactionType) {
    case 'atm':
      return 'atm_standard';
    case 'pos':
      return 'pos_standard';
    case 'transfer':
      return 'transfer_standard';
    case 'login':
    default:
      return 'standard';
  }
}

/**
 * Generate verification advice for institutions
 * CRITICAL: Duress responses appear identical to normal responses to the user
 * The only difference is the transactionLimits sent to the bank (not user-visible)
 * Requirements: 5.2, 5.3
 * 
 * @param pinType - The type of PIN used (normal or duress)
 * @param transactionType - The type of transaction being performed
 * @returns VerificationAdvice to send to the institution
 */
export function generateVerificationAdvice(
  pinType: PinType,
  transactionType: TransactionType
): VerificationAdvice {
  const advice: VerificationAdvice = {
    status: 'authenticated',
    recommendedRouting: getRecommendedRouting(transactionType),
  };

  // For duress situations, include transaction limits for the bank
  // These limits are NOT visible to the user - the bank handles them silently
  // Requirements: 5.3
  if (pinType === 'duress') {
    advice.transactionLimits = DURESS_TRANSACTION_LIMITS;
  }

  return advice;
}

/**
 * Generate failed verification advice
 * Used when authentication fails - identical regardless of failure reason
 * Requirements: 1.5
 */
export function generateFailedVerificationAdvice(): VerificationAdvice {
  return {
    status: 'failed',
    recommendedRouting: 'denied',
  };
}

/**
 * Validate user credentials and return appropriate response
 * Handles both normal and duress PIN types
 * Requirements: 1.1, 1.2
 * 
 * @param request - The validation request containing user ID and PIN
 * @param user - The user object (null if user not found)
 * @returns ValidationResponse with verification advice
 */
export async function validateCredentials(
  request: ValidationRequest,
  user: User | null
): Promise<ValidationResponse> {
  // If user not found, return failed response
  // Response is identical to invalid PIN to prevent user enumeration
  // Requirements: 1.5
  if (!user) {
    return {
      valid: false,
      pinType: 'normal', // Default value, not exposed externally
      verificationAdvice: generateFailedVerificationAdvice(),
      emergencyTriggered: false,
    };
  }

  // Check if user account is active
  if (!user.isActive) {
    return {
      valid: false,
      pinType: 'normal',
      verificationAdvice: generateFailedVerificationAdvice(),
      emergencyTriggered: false,
    };
  }

  // Validate the PIN against user's stored hashes
  const pinResult = await validateUserPin(user, request.pin);

  if (!pinResult.valid || !pinResult.pinType) {
    // Invalid PIN - return generic failure
    // Requirements: 1.5
    return {
      valid: false,
      pinType: 'normal',
      verificationAdvice: generateFailedVerificationAdvice(),
      emergencyTriggered: false,
    };
  }

  // PIN is valid - generate appropriate response
  const pinType = pinResult.pinType as PinType;
  const verificationAdvice = generateVerificationAdvice(pinType, request.transactionType);

  // For duress PIN, emergency protocols will be triggered
  // The response to the institution appears identical to normal
  // Requirements: 1.2, 2.1
  const emergencyTriggered = pinType === 'duress';

  return {
    valid: true,
    pinType,
    verificationAdvice,
    emergencyTriggered,
  };
}

/**
 * Hash a PIN using secure hashing algorithm
 */
export async function hashPin(pin: string): Promise<string> {
  return cryptoHashPin(pin);
}

/**
 * Compare a PIN against its hash
 */
export async function comparePin(pin: string, hashedPin: string): Promise<boolean> {
  return verifyPin(pin, hashedPin);
}

/**
 * Create an AuthenticationService instance
 */
export function createAuthenticationService(): AuthenticationService {
  return {
    validateCredentials,
    generateVerificationAdvice,
    hashPin,
    comparePin,
  };
}
