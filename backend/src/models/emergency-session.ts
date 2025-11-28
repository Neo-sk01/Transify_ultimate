/**
 * Emergency Session Model
 * Represents an active or resolved emergency protocol session
 * Requirements: 2.1, 2.5
 */

import { generateId } from '../utils/crypto';

export type EmergencySessionStatus = 'active' | 'resolved' | 'escalated';
export type TransactionType = 'login' | 'atm' | 'pos' | 'transfer';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

export interface DeviceFingerprint {
  deviceId: string;
  platform: string;
  appVersion: string;
}

export interface TriggerContext {
  institutionId: string;
  transactionType: TransactionType;
  location: LocationData;
  deviceFingerprint: DeviceFingerprint;
}

export interface NotificationResult {
  success: boolean;
  channel: string;
  timestamp: Date;
  messageId?: string;
  error?: string;
}

export interface SessionNotifications {
  operationsCenter: NotificationResult;
  emergencyContacts: NotificationResult[];
  lawEnforcement: NotificationResult[];
}

export interface EmergencySessionRecord {
  id: string;
  userId: string;
  status: EmergencySessionStatus;
  triggerContext: TriggerContext;
  notifications: SessionNotifications;
  evidencePortfolioId: string;
  startedAt: Date;
  resolvedAt?: Date;
  resolutionReason?: string;
}

/**
 * Input for creating an emergency session
 */
export interface CreateEmergencySessionInput {
  userId: string;
  institutionId: string;
  transactionType: TransactionType;
  location: LocationData;
  deviceFingerprint: DeviceFingerprint;
}

/**
 * Validation result for emergency session input
 */
export interface EmergencySessionValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate location data
 */
export function validateLocationData(location: LocationData): string[] {
  const errors: string[] = [];

  if (location.latitude < -90 || location.latitude > 90) {
    errors.push('Latitude must be between -90 and 90');
  }

  if (location.longitude < -180 || location.longitude > 180) {
    errors.push('Longitude must be between -180 and 180');
  }

  if (location.accuracy < 0) {
    errors.push('Accuracy must be non-negative');
  }

  return errors;
}

/**
 * Validate emergency session input
 */
export function validateEmergencySessionInput(
  input: CreateEmergencySessionInput
): EmergencySessionValidationResult {
  const errors: string[] = [];

  if (!input.userId || input.userId.trim().length === 0) {
    errors.push('User ID is required');
  }

  if (!input.institutionId || input.institutionId.trim().length === 0) {
    errors.push('Institution ID is required');
  }

  const validTransactionTypes: TransactionType[] = ['login', 'atm', 'pos', 'transfer'];
  if (!validTransactionTypes.includes(input.transactionType)) {
    errors.push('Invalid transaction type');
  }

  if (!input.location) {
    errors.push('Location data is required');
  } else {
    const locationErrors = validateLocationData(input.location);
    errors.push(...locationErrors);
  }

  if (!input.deviceFingerprint) {
    errors.push('Device fingerprint is required');
  } else {
    if (!input.deviceFingerprint.deviceId) {
      errors.push('Device ID is required');
    }
    if (!input.deviceFingerprint.platform) {
      errors.push('Platform is required');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a new emergency session record
 * Requirements: 2.1, 2.5
 */
export function createEmergencySession(
  input: CreateEmergencySessionInput,
  evidencePortfolioId: string
): EmergencySessionRecord {
  const validation = validateEmergencySessionInput(input);
  if (!validation.valid) {
    throw new Error(`Invalid session input: ${validation.errors.join(', ')}`);
  }

  return {
    id: generateId(),
    userId: input.userId,
    status: 'active',
    triggerContext: {
      institutionId: input.institutionId,
      transactionType: input.transactionType,
      location: input.location,
      deviceFingerprint: input.deviceFingerprint,
    },
    notifications: {
      operationsCenter: {
        success: false,
        channel: 'internal',
        timestamp: new Date(),
      },
      emergencyContacts: [],
      lawEnforcement: [],
    },
    evidencePortfolioId,
    startedAt: new Date(),
  };
}

/**
 * Check if session can be resolved
 */
export function canResolveSession(session: EmergencySessionRecord): boolean {
  return session.status === 'active';
}

/**
 * Resolve an emergency session
 * Requirements: 2.5
 */
export function resolveSession(
  session: EmergencySessionRecord,
  reason: string
): EmergencySessionRecord {
  if (!canResolveSession(session)) {
    throw new Error('Session cannot be resolved - not in active status');
  }

  return {
    ...session,
    status: 'resolved',
    resolvedAt: new Date(),
    resolutionReason: reason,
  };
}

/**
 * Escalate an emergency session
 */
export function escalateSession(
  session: EmergencySessionRecord
): EmergencySessionRecord {
  if (session.status !== 'active') {
    throw new Error('Only active sessions can be escalated');
  }

  return {
    ...session,
    status: 'escalated',
  };
}

/**
 * Check if session is active (evidence capture should be running)
 * Requirements: 2.5
 */
export function isSessionActive(session: EmergencySessionRecord): boolean {
  return session.status === 'active' || session.status === 'escalated';
}

/**
 * Update notification results for a session
 */
export function updateSessionNotifications(
  session: EmergencySessionRecord,
  notifications: Partial<SessionNotifications>
): EmergencySessionRecord {
  return {
    ...session,
    notifications: {
      ...session.notifications,
      ...notifications,
    },
  };
}

/**
 * Get session duration in milliseconds
 */
export function getSessionDuration(session: EmergencySessionRecord): number {
  const endTime = session.resolvedAt || new Date();
  return endTime.getTime() - session.startedAt.getTime();
}
