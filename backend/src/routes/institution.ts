/**
 * Institution Integration API Routes
 * RESTful API for banks, ATMs, and merchants
 * Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 7.2, 7.3, 7.4
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  validateCredentials,
  generateVerificationAdvice,
  generateFailedVerificationAdvice,
  createAuthenticationError,
  ValidationRequest,
  TransactionType,
  PinType,
} from '../services/auth';
import {
  initiateProtocol,
  notifyOperationsCenter,
  notifyEmergencyContacts,
  notifyLawEnforcement,
  EmergencyContext,
} from '../services/emergency';
import { User } from '../models/user';
import { EmergencyContact } from '../models/emergency-contact';
import { generateId } from '../utils/crypto';

export const institutionRouter = Router();

// In-memory session storage (would be database in production)
const verificationSessions: Map<string, VerificationSession> = new Map();

// In-memory user storage for demo (would be database in production)
const userStore: Map<string, User> = new Map();

/**
 * Verification session stored after successful authentication
 */
interface VerificationSession {
  sessionId: string;
  userId: string;
  institutionId: string;
  transactionType: TransactionType;
  pinType: PinType;
  emergencyTriggered: boolean;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Institution authentication request body
 */
interface InstitutionAuthRequest {
  institutionId: string;
  userId: string;
  pin: string;
  transactionType: TransactionType;
  amount?: number;
  merchantId?: string;
  deviceFingerprint?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

/**
 * Transaction advice request body
 */
interface TransactionAdviceRequest {
  sessionId: string;
  institutionId: string;
}


/**
 * Get user by ID (helper function)
 * In production, this would query the database
 */
export function getUserById(userId: string): User | null {
  return userStore.get(userId) || null;
}

/**
 * Set user in store (for testing purposes)
 */
export function setUser(user: User): void {
  userStore.set(user.id, user);
}

/**
 * Clear all users (for testing purposes)
 */
export function clearUsers(): void {
  userStore.clear();
}

/**
 * Get verification session by ID
 */
export function getVerificationSession(sessionId: string): VerificationSession | undefined {
  return verificationSessions.get(sessionId);
}

/**
 * Clear all sessions (for testing purposes)
 */
export function clearSessions(): void {
  verificationSessions.clear();
}

/**
 * Generate transaction advice based on PIN type
 * For duress: includes limitations for bank but appears normal to user
 * Requirements: 5.3
 */
export function generateTransactionAdvice(session: VerificationSession): {
  proceed: boolean;
  limits?: { maxAmount?: number; allowedOperations: string[] };
  displayMessage?: string;
} {
  // Always return proceed=true for valid sessions
  const advice: {
    proceed: boolean;
    limits?: { maxAmount?: number; allowedOperations: string[] };
    displayMessage?: string;
  } = {
    proceed: true,
    displayMessage: 'Transaction authorized', // Always appears normal
  };

  // For duress situations, include limits for the bank
  // These limits are NOT visible to the user - bank handles silently
  // Requirements: 5.3
  if (session.pinType === 'duress') {
    advice.limits = {
      maxAmount: 500,
      allowedOperations: ['withdrawal', 'balance_inquiry'],
    };
  }

  return advice;
}

/**
 * POST /api/v1/institution/verify
 * Institution endpoint for authentication verification
 * Banks, ATMs, and merchants use this to verify user credentials
 * Requirements: 5.1, 5.2
 */
institutionRouter.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as InstitutionAuthRequest;
    const { institutionId, userId, pin, transactionType, deviceFingerprint, location } = body;

    // Validate required fields
    if (!institutionId || !userId || !pin || !transactionType) {
      return res.status(400).json({
        authorized: false,
        error: 'Missing required fields: institutionId, userId, pin, transactionType',
      });
    }

    // Get user from store
    const user = getUserById(userId);

    // Create validation request
    const validationRequest: ValidationRequest = {
      userId,
      pin,
      institutionId,
      transactionType,
      deviceFingerprint: deviceFingerprint || 'unknown',
    };

    // Validate credentials
    const validationResult = await validateCredentials(validationRequest, user);

    if (!validationResult.valid) {
      // Return generic failure - no PIN type information leakage
      // Requirements: 1.5
      return res.json({
        authorized: false,
        verificationAdvice: validationResult.verificationAdvice,
        sessionId: null,
        expiresAt: null,
      });
    }

    // Create verification session
    const sessionId = generateId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

    const session: VerificationSession = {
      sessionId,
      userId,
      institutionId,
      transactionType,
      pinType: validationResult.pinType,
      emergencyTriggered: validationResult.emergencyTriggered,
      createdAt: now,
      expiresAt,
    };

    verificationSessions.set(sessionId, session);

    // If duress PIN was used, trigger emergency protocols in background
    // Requirements: 1.2, 2.1
    if (validationResult.emergencyTriggered && user) {
      // Create emergency context
      const emergencyContext: EmergencyContext = {
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: now,
        } : {
          latitude: 0,
          longitude: 0,
          accuracy: 0,
          timestamp: now,
        },
        institutionId,
        transactionType,
        deviceInfo: {
          deviceId: deviceFingerprint || 'unknown',
          platform: 'unknown',
          appVersion: 'unknown',
        },
      };

      // Initiate emergency protocol (non-blocking)
      initiateProtocol(userId, emergencyContext)
        .then(async (emergencySession) => {
          // Convert user emergency contacts to proper type
          const contacts: EmergencyContact[] = (user.emergencyContacts || []).map((c) => ({
            ...c,
            createdAt: c.consentDate || new Date(),
            updatedAt: c.consentDate || new Date(),
          }));
          // Notify all parties
          await Promise.all([
            notifyOperationsCenter(emergencySession),
            notifyEmergencyContacts(emergencySession, contacts),
            notifyLawEnforcement(emergencySession),
          ]);
        })
        .catch((error) => {
          console.error('Emergency protocol error:', error);
        });
    }

    // Return success response - identical for normal and duress
    // Requirements: 1.2, 5.2
    return res.json({
      authorized: true,
      verificationAdvice: validationResult.verificationAdvice,
      sessionId,
      expiresAt,
    });
  } catch (error) {
    next(error);
  }
});


/**
 * POST /api/v1/institution/transaction-advice
 * Get transaction advice for a verified session
 * Requirements: 5.2, 5.3
 */
institutionRouter.post('/transaction-advice', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as TransactionAdviceRequest;
    const { sessionId, institutionId } = body;

    // Validate required fields
    if (!sessionId || !institutionId) {
      return res.status(400).json({
        proceed: false,
        error: 'Missing required fields: sessionId, institutionId',
      });
    }

    // Get session
    const session = verificationSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        proceed: false,
        error: 'Session not found',
      });
    }

    // Verify institution matches
    if (session.institutionId !== institutionId) {
      return res.status(403).json({
        proceed: false,
        error: 'Institution mismatch',
      });
    }

    // Check session expiry
    if (new Date() > session.expiresAt) {
      verificationSessions.delete(sessionId);
      return res.status(410).json({
        proceed: false,
        error: 'Session expired',
      });
    }

    // Generate transaction advice
    // For duress: includes limits for bank, but displayMessage appears normal
    // Requirements: 5.3
    const advice = generateTransactionAdvice(session);

    return res.json(advice);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/institution/cardless/atm
 * Cardless ATM transaction authentication
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
institutionRouter.post('/cardless/atm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as InstitutionAuthRequest;
    const { institutionId, userId, pin, deviceFingerprint, location, amount } = body;

    // Validate required fields
    if (!institutionId || !userId || !pin) {
      return res.status(400).json({
        authorized: false,
        error: 'Missing required fields: institutionId, userId, pin',
      });
    }

    // Get user from store
    const user = getUserById(userId);

    // Create validation request - same validations as card-present
    // Requirements: 6.4
    const validationRequest: ValidationRequest = {
      userId,
      pin,
      institutionId,
      transactionType: 'atm',
      deviceFingerprint: deviceFingerprint || 'unknown',
    };

    // Validate credentials
    const validationResult = await validateCredentials(validationRequest, user);

    if (!validationResult.valid) {
      // Return generic failure
      return res.json({
        authorized: false,
        verificationAdvice: validationResult.verificationAdvice,
        sessionId: null,
        expiresAt: null,
        transactionAdvice: { proceed: false },
      });
    }

    // Create verification session
    const sessionId = generateId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    const session: VerificationSession = {
      sessionId,
      userId,
      institutionId,
      transactionType: 'atm',
      pinType: validationResult.pinType,
      emergencyTriggered: validationResult.emergencyTriggered,
      createdAt: now,
      expiresAt,
    };

    verificationSessions.set(sessionId, session);

    // If duress PIN, trigger emergency protocols
    // Requirements: 6.3
    if (validationResult.emergencyTriggered && user) {
      const emergencyContext: EmergencyContext = {
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: now,
        } : {
          latitude: 0,
          longitude: 0,
          accuracy: 0,
          timestamp: now,
        },
        institutionId,
        transactionType: 'atm',
        deviceInfo: {
          deviceId: deviceFingerprint || 'unknown',
          platform: 'atm',
          appVersion: 'unknown',
        },
      };

      initiateProtocol(userId, emergencyContext)
        .then(async (emergencySession) => {
          // Convert user emergency contacts to proper type
          const contacts: EmergencyContact[] = (user.emergencyContacts || []).map((c) => ({
            ...c,
            createdAt: c.consentDate || new Date(),
            updatedAt: c.consentDate || new Date(),
          }));
          await Promise.all([
            notifyOperationsCenter(emergencySession),
            notifyEmergencyContacts(emergencySession, contacts),
            notifyLawEnforcement(emergencySession),
          ]);
        })
        .catch((error) => {
          console.error('Emergency protocol error:', error);
        });
    }

    // Generate transaction advice
    // For duress: limits sent to bank, but ATM displays normal flow
    // Requirements: 6.2, 6.3
    const transactionAdvice = generateTransactionAdvice(session);

    return res.json({
      authorized: true,
      verificationAdvice: validationResult.verificationAdvice,
      sessionId,
      expiresAt,
      transactionAdvice,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/institution/cardless/merchant
 * Cardless merchant transaction authentication
 * Requirements: 7.2, 7.3, 7.4
 */
institutionRouter.post('/cardless/merchant', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as InstitutionAuthRequest;
    const { institutionId, userId, pin, merchantId, deviceFingerprint, location, amount } = body;

    // Validate required fields
    if (!institutionId || !userId || !pin) {
      return res.status(400).json({
        authorized: false,
        error: 'Missing required fields: institutionId, userId, pin',
      });
    }

    // Get user from store
    const user = getUserById(userId);

    // Create validation request - same validations as card-present
    // Requirements: 7.2
    const validationRequest: ValidationRequest = {
      userId,
      pin,
      institutionId,
      transactionType: 'pos',
      deviceFingerprint: deviceFingerprint || 'unknown',
    };

    // Validate credentials
    const validationResult = await validateCredentials(validationRequest, user);

    if (!validationResult.valid) {
      return res.json({
        authorized: false,
        verificationAdvice: validationResult.verificationAdvice,
        sessionId: null,
        expiresAt: null,
        transactionAdvice: { proceed: false },
      });
    }

    // Create verification session
    const sessionId = generateId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    const session: VerificationSession = {
      sessionId,
      userId,
      institutionId,
      transactionType: 'pos',
      pinType: validationResult.pinType,
      emergencyTriggered: validationResult.emergencyTriggered,
      createdAt: now,
      expiresAt,
    };

    verificationSessions.set(sessionId, session);

    // If duress PIN, trigger emergency protocols
    // Requirements: 7.4
    if (validationResult.emergencyTriggered && user) {
      const emergencyContext: EmergencyContext = {
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: now,
        } : {
          latitude: 0,
          longitude: 0,
          accuracy: 0,
          timestamp: now,
        },
        institutionId,
        transactionType: 'pos',
        deviceInfo: {
          deviceId: deviceFingerprint || 'unknown',
          platform: 'pos',
          appVersion: 'unknown',
        },
      };

      initiateProtocol(userId, emergencyContext)
        .then(async (emergencySession) => {
          // Convert user emergency contacts to proper type
          const contacts: EmergencyContact[] = (user.emergencyContacts || []).map((c) => ({
            ...c,
            createdAt: c.consentDate || new Date(),
            updatedAt: c.consentDate || new Date(),
          }));
          await Promise.all([
            notifyOperationsCenter(emergencySession),
            notifyEmergencyContacts(emergencySession, contacts),
            notifyLawEnforcement(emergencySession),
          ]);
        })
        .catch((error) => {
          console.error('Emergency protocol error:', error);
        });
    }

    // Generate transaction advice
    // For duress: limits sent to bank, merchant displays normal flow
    // Requirements: 7.3, 7.4
    const transactionAdvice = generateTransactionAdvice(session);

    return res.json({
      authorized: true,
      verificationAdvice: validationResult.verificationAdvice,
      sessionId,
      expiresAt,
      transactionAdvice,
      merchantId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/institution/transaction-complete
 * Report transaction completion
 */
institutionRouter.post('/transaction-complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, outcome } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: sessionId',
      });
    }

    const session = verificationSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    // Clean up session
    verificationSessions.delete(sessionId);

    return res.json({
      success: true,
      message: 'Transaction completion recorded',
    });
  } catch (error) {
    next(error);
  }
});
