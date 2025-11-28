/**
 * Data Privacy Service
 * Handles personal data encryption, retention enforcement, and consent management
 * Requirements: 10.1, 10.3, 10.4
 */

import {
  encrypt,
  decrypt,
  isEncrypted,
  encryptFields,
  decryptFields,
  generateId,
} from '../../utils/crypto';
import { User, ConsentRecord, hasRequiredConsents } from '../../models/user';

/**
 * Sensitive fields that must be encrypted at rest
 */
export const SENSITIVE_USER_FIELDS: (keyof User)[] = ['nationalId'];

/**
 * Required consent purposes for user activation
 */
export const REQUIRED_CONSENT_PURPOSES = ['data_processing'];

/**
 * Default retention periods in days
 */
export const DEFAULT_RETENTION_PERIODS: Record<string, number> = {
  user_data: 365 * 7, // 7 years for financial data
  emergency_session: 365 * 5, // 5 years for emergency records
  audit_log: 365 * 10, // 10 years for audit logs (never auto-deleted)
  evidence: 365 * 7, // 7 years for evidence
};

/**
 * Data retention record
 */
export interface RetentionRecord {
  id: string;
  dataType: string;
  dataId: string;
  userId: string;
  createdAt: Date;
  retentionPeriodDays: number;
  expiresAt: Date;
  legalHoldActive: boolean;
  purgedAt?: Date;
}

/**
 * Legal hold record
 */
export interface LegalHold {
  id: string;
  userId: string;
  reason: string;
  createdAt: Date;
  createdBy: string;
  expiresAt?: Date;
  releasedAt?: Date;
}

/**
 * Consent validation result
 */
export interface ConsentValidationResult {
  valid: boolean;
  missingPurposes: string[];
  expiredPurposes: string[];
  withdrawnPurposes: string[];
}

/**
 * Purge result
 */
export interface PurgeResult {
  purgedCount: number;
  skippedDueToLegalHold: number;
  errors: string[];
}

/**
 * Personal data encryption result
 */
export interface EncryptionResult {
  success: boolean;
  encryptedFields: string[];
  error?: string;
}

/**
 * Data Privacy Service Interface
 */
export interface IDataPrivacyService {
  // Encryption operations
  encryptPersonalData<T extends Record<string, unknown>>(
    data: T,
    fields: (keyof T)[],
    encryptionKey: string
  ): T;
  decryptPersonalData<T extends Record<string, unknown>>(
    data: T,
    fields: (keyof T)[],
    encryptionKey: string
  ): T;
  isFieldEncrypted(value: string): boolean;

  // Consent management
  validateConsents(consents: ConsentRecord[]): ConsentValidationResult;
  createConsentRecord(purpose: string, granted: boolean, expiresAt?: Date): ConsentRecord;
  withdrawConsent(consents: ConsentRecord[], purpose: string): ConsentRecord[];
  canActivateUser(consents: ConsentRecord[]): boolean;

  // Retention management
  createRetentionRecord(
    dataType: string,
    dataId: string,
    userId: string,
    retentionPeriodDays?: number
  ): RetentionRecord;
  getExpiredRecords(asOfDate?: Date): RetentionRecord[];
  purgeExpiredData(asOfDate?: Date): Promise<PurgeResult>;
  hasLegalHold(userId: string): boolean;
  addLegalHold(userId: string, reason: string, createdBy: string, expiresAt?: Date): LegalHold;
  releaseLegalHold(userId: string): boolean;
}

/**
 * In-memory storage for privacy service
 */
interface PrivacyStorage {
  retentionRecords: Map<string, RetentionRecord>;
  legalHolds: Map<string, LegalHold>;
}

/**
 * Data Privacy Service Implementation
 * Requirements: 10.1, 10.3, 10.4
 */
export class DataPrivacyService implements IDataPrivacyService {
  private storage: PrivacyStorage;

  constructor(storage?: PrivacyStorage) {
    this.storage = storage || {
      retentionRecords: new Map(),
      legalHolds: new Map(),
    };
  }

  /**
   * Encrypt personal data fields
   * Requirements: 10.3
   */
  encryptPersonalData<T extends Record<string, unknown>>(
    data: T,
    fields: (keyof T)[],
    encryptionKey: string
  ): T {
    return encryptFields(data, fields, encryptionKey);
  }

  /**
   * Decrypt personal data fields
   * Requirements: 10.3
   */
  decryptPersonalData<T extends Record<string, unknown>>(
    data: T,
    fields: (keyof T)[],
    encryptionKey: string
  ): T {
    return decryptFields(data, fields, encryptionKey);
  }

  /**
   * Check if a field value is encrypted
   * Requirements: 10.3
   */
  isFieldEncrypted(value: string): boolean {
    return isEncrypted(value);
  }

  /**
   * Validate consent records against required purposes
   * Requirements: 10.1
   */
  validateConsents(consents: ConsentRecord[]): ConsentValidationResult {
    const now = new Date();
    const missingPurposes: string[] = [];
    const expiredPurposes: string[] = [];
    const withdrawnPurposes: string[] = [];

    for (const purpose of REQUIRED_CONSENT_PURPOSES) {
      const consent = consents.find((c) => c.purpose === purpose);

      if (!consent) {
        missingPurposes.push(purpose);
        continue;
      }

      if (!consent.granted) {
        missingPurposes.push(purpose);
        continue;
      }

      if (consent.withdrawnAt) {
        withdrawnPurposes.push(purpose);
        continue;
      }

      if (consent.expiresAt && consent.expiresAt < now) {
        expiredPurposes.push(purpose);
      }
    }

    return {
      valid:
        missingPurposes.length === 0 &&
        expiredPurposes.length === 0 &&
        withdrawnPurposes.length === 0,
      missingPurposes,
      expiredPurposes,
      withdrawnPurposes,
    };
  }

  /**
   * Create a new consent record
   * Requirements: 10.1
   */
  createConsentRecord(purpose: string, granted: boolean, expiresAt?: Date): ConsentRecord {
    return {
      purpose,
      granted,
      grantedAt: new Date(),
      expiresAt,
      withdrawnAt: undefined,
    };
  }

  /**
   * Withdraw consent for a specific purpose
   * Requirements: 10.1
   */
  withdrawConsent(consents: ConsentRecord[], purpose: string): ConsentRecord[] {
    return consents.map((consent) => {
      if (consent.purpose === purpose && !consent.withdrawnAt) {
        return {
          ...consent,
          withdrawnAt: new Date(),
        };
      }
      return consent;
    });
  }

  /**
   * Check if user can be activated based on consents
   * Requirements: 10.1
   */
  canActivateUser(consents: ConsentRecord[]): boolean {
    const validation = this.validateConsents(consents);
    return validation.valid;
  }

  /**
   * Create a retention record for data
   * Requirements: 10.4
   */
  createRetentionRecord(
    dataType: string,
    dataId: string,
    userId: string,
    retentionPeriodDays?: number
  ): RetentionRecord {
    const period = retentionPeriodDays || DEFAULT_RETENTION_PERIODS[dataType] || 365;
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + period * 24 * 60 * 60 * 1000);

    const record: RetentionRecord = {
      id: generateId(),
      dataType,
      dataId,
      userId,
      createdAt,
      retentionPeriodDays: period,
      expiresAt,
      legalHoldActive: this.hasLegalHold(userId),
    };

    this.storage.retentionRecords.set(record.id, record);
    return record;
  }

  /**
   * Get all expired retention records
   * Requirements: 10.4
   */
  getExpiredRecords(asOfDate?: Date): RetentionRecord[] {
    const checkDate = asOfDate || new Date();
    const expired: RetentionRecord[] = [];

    for (const record of this.storage.retentionRecords.values()) {
      if (record.expiresAt <= checkDate && !record.purgedAt) {
        // Update legal hold status
        record.legalHoldActive = this.hasLegalHold(record.userId);
        expired.push(record);
      }
    }

    return expired;
  }

  /**
   * Purge expired data (respecting legal holds)
   * Requirements: 10.4
   */
  async purgeExpiredData(asOfDate?: Date): Promise<PurgeResult> {
    const expiredRecords = this.getExpiredRecords(asOfDate);
    let purgedCount = 0;
    let skippedDueToLegalHold = 0;
    const errors: string[] = [];

    for (const record of expiredRecords) {
      // Check for legal hold
      if (this.hasLegalHold(record.userId)) {
        record.legalHoldActive = true;
        skippedDueToLegalHold++;
        continue;
      }

      try {
        // Mark as purged (actual data deletion would happen in the data store)
        record.purgedAt = new Date();
        purgedCount++;
      } catch (error) {
        errors.push(`Failed to purge record ${record.id}: ${error}`);
      }
    }

    return {
      purgedCount,
      skippedDueToLegalHold,
      errors,
    };
  }

  /**
   * Check if a user has an active legal hold
   * Requirements: 10.4
   */
  hasLegalHold(userId: string): boolean {
    const hold = this.storage.legalHolds.get(userId);
    if (!hold) {
      return false;
    }

    // Check if hold has been released
    if (hold.releasedAt) {
      return false;
    }

    // Check if hold has expired
    if (hold.expiresAt && hold.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Add a legal hold for a user
   * Requirements: 10.4
   */
  addLegalHold(
    userId: string,
    reason: string,
    createdBy: string,
    expiresAt?: Date
  ): LegalHold {
    const hold: LegalHold = {
      id: generateId(),
      userId,
      reason,
      createdAt: new Date(),
      createdBy,
      expiresAt,
    };

    this.storage.legalHolds.set(userId, hold);

    // Update all retention records for this user
    for (const record of this.storage.retentionRecords.values()) {
      if (record.userId === userId) {
        record.legalHoldActive = true;
      }
    }

    return hold;
  }

  /**
   * Release a legal hold for a user
   * Requirements: 10.4
   */
  releaseLegalHold(userId: string): boolean {
    const hold = this.storage.legalHolds.get(userId);
    if (!hold) {
      return false;
    }

    hold.releasedAt = new Date();

    // Update all retention records for this user
    for (const record of this.storage.retentionRecords.values()) {
      if (record.userId === userId) {
        record.legalHoldActive = false;
      }
    }

    return true;
  }

  /**
   * Get retention record by ID
   */
  getRetentionRecord(id: string): RetentionRecord | undefined {
    return this.storage.retentionRecords.get(id);
  }

  /**
   * Get all retention records for a user
   */
  getRetentionRecordsForUser(userId: string): RetentionRecord[] {
    const records: RetentionRecord[] = [];
    for (const record of this.storage.retentionRecords.values()) {
      if (record.userId === userId) {
        records.push(record);
      }
    }
    return records;
  }

  /**
   * Get legal hold for a user
   */
  getLegalHold(userId: string): LegalHold | undefined {
    return this.storage.legalHolds.get(userId);
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.storage.retentionRecords.clear();
    this.storage.legalHolds.clear();
  }
}

/**
 * Create a new DataPrivacyService instance
 */
export function createDataPrivacyService(): DataPrivacyService {
  return new DataPrivacyService();
}
