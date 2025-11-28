/**
 * Audit Service
 * Maintains immutable audit logs with cryptographic chaining
 * Requirements: 8.1, 9.1, 9.2, 9.4, 10.4
 */

import {
  AuditLogEntry,
  AuditEventType,
  AuditActor,
  AuditSubject,
  generateAuditHash,
  verifyAuditChain,
} from '../../models/audit-log';
import { generateId } from '../../utils/crypto';

// Re-export types from model
export { AuditEventType, AuditActor, AuditSubject } from '../../models/audit-log';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  userId?: string;
  institutionId?: string;
  details: Record<string, unknown>;
  hash: string;
  previousHash: string;
}

export interface ReportCriteria {
  startDate: Date;
  endDate: Date;
  eventTypes?: AuditEventType[];
  userId?: string;
}

export interface AuditReport {
  criteria: ReportCriteria;
  events: AuditLogEntry[];
  generatedAt: Date;
  totalCount: number;
}

export interface UserDataExport {
  userId: string;
  exportedAt: Date;
  data: {
    profile: Record<string, unknown>;
    emergencyContacts: Record<string, unknown>[];
    emergencySessions: Record<string, unknown>[];
    auditEvents: AuditLogEntry[];
  };
}

export interface DeletionResult {
  success: boolean;
  deletedRecords: number;
  blockedByLegalHold: boolean;
  reason?: string;
}

export interface IntegrityResult {
  valid: boolean;
  brokenAt?: number;
  verifiedCount: number;
}

export interface LegalHold {
  userId: string;
  reason: string;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Input for logging an audit event
 */
export interface LogEventInput {
  eventType: AuditEventType;
  actor: AuditActor;
  subject?: AuditSubject;
  action: string;
  outcome: 'success' | 'failure';
  details: Record<string, unknown>;
}

/**
 * Audit Service interface
 */
export interface IAuditService {
  logEvent(input: LogEventInput): Promise<AuditLogEntry>;
  generateReport(criteria: ReportCriteria): Promise<AuditReport>;
  verifyLogIntegrity(startDate: Date, endDate: Date): Promise<IntegrityResult>;
  exportUserData(userId: string): Promise<UserDataExport>;
  deleteUserData(userId: string, reason: string): Promise<DeletionResult>;
  getEventsForUser(userId: string): Promise<AuditLogEntry[]>;
  hasLegalHold(userId: string): boolean;
  addLegalHold(hold: LegalHold): void;
  removeLegalHold(userId: string): void;
}

// Genesis hash for the first entry in the chain
const GENESIS_HASH = '0'.repeat(64);

/**
 * In-memory storage for audit logs (would be database in production)
 */
interface AuditStorage {
  entries: AuditLogEntry[];
  legalHolds: Map<string, LegalHold>;
  users: Map<string, Record<string, unknown>>;
  emergencyContacts: Map<string, Record<string, unknown>[]>;
  emergencySessions: Map<string, Record<string, unknown>[]>;
}

/**
 * Audit Service Implementation
 * Provides immutable audit logging with cryptographic hash chaining
 * Requirements: 8.1, 9.1, 9.2, 9.4, 10.4
 */
export class AuditService implements IAuditService {
  private storage: AuditStorage;

  constructor(storage?: AuditStorage) {
    this.storage = storage || {
      entries: [],
      legalHolds: new Map(),
      users: new Map(),
      emergencyContacts: new Map(),
      emergencySessions: new Map(),
    };
  }

  /**
   * Get the last hash in the chain (or genesis hash if empty)
   */
  private getLastHash(): string {
    if (this.storage.entries.length === 0) {
      return GENESIS_HASH;
    }
    return this.storage.entries[this.storage.entries.length - 1].hash;
  }

  /**
   * Get the next sequence number
   */
  private getNextSequence(): number {
    return this.storage.entries.length + 1;
  }

  /**
   * Log an audit event with hash chaining
   * Requirements: 8.1, 9.1
   */
  async logEvent(input: LogEventInput): Promise<AuditLogEntry> {
    const previousHash = this.getLastHash();
    const sequence = this.getNextSequence();
    const id = generateId();
    const timestamp = new Date();

    const entryWithoutHash: Omit<AuditLogEntry, 'hash'> = {
      id,
      sequence,
      timestamp,
      eventType: input.eventType,
      actor: input.actor,
      subject: input.subject,
      action: input.action,
      outcome: input.outcome,
      details: input.details,
      previousHash,
    };

    const hash = generateAuditHash(entryWithoutHash, previousHash);

    const entry: AuditLogEntry = {
      ...entryWithoutHash,
      hash,
    };

    this.storage.entries.push(entry);
    return entry;
  }

  /**
   * Generate an audit report for a time range
   * Requirements: 9.2
   */
  async generateReport(criteria: ReportCriteria): Promise<AuditReport> {
    const filteredEvents = this.storage.entries.filter((entry) => {
      // Filter by date range
      if (entry.timestamp < criteria.startDate || entry.timestamp > criteria.endDate) {
        return false;
      }

      // Filter by event types if specified
      if (criteria.eventTypes && criteria.eventTypes.length > 0) {
        if (!criteria.eventTypes.includes(entry.eventType)) {
          return false;
        }
      }

      // Filter by user ID if specified
      if (criteria.userId) {
        const isActorMatch = entry.actor.type === 'user' && entry.actor.id === criteria.userId;
        const isSubjectMatch = entry.subject?.type === 'user' && entry.subject.id === criteria.userId;
        if (!isActorMatch && !isSubjectMatch) {
          return false;
        }
      }

      return true;
    });

    return {
      criteria,
      events: filteredEvents,
      generatedAt: new Date(),
      totalCount: filteredEvents.length,
    };
  }

  /**
   * Verify the integrity of audit logs in a time range
   * Requirements: 9.1
   */
  async verifyLogIntegrity(startDate: Date, endDate: Date): Promise<IntegrityResult> {
    // Get entries in the date range
    const entriesInRange = this.storage.entries.filter(
      (entry) => entry.timestamp >= startDate && entry.timestamp <= endDate
    );

    if (entriesInRange.length === 0) {
      return { valid: true, verifiedCount: 0 };
    }

    // Find the starting point - we need the previous hash from before the range
    const firstEntryIndex = this.storage.entries.findIndex(
      (entry) => entry.id === entriesInRange[0].id
    );

    const startingHash = firstEntryIndex === 0 
      ? GENESIS_HASH 
      : this.storage.entries[firstEntryIndex - 1].hash;

    // Verify the chain starting from the appropriate hash
    const result = verifyAuditChain(entriesInRange, startingHash);
    return result;
  }

  /**
   * Get all audit events for a specific user
   */
  async getEventsForUser(userId: string): Promise<AuditLogEntry[]> {
    return this.storage.entries.filter((entry) => {
      const isActorMatch = entry.actor.type === 'user' && entry.actor.id === userId;
      const isSubjectMatch = entry.subject?.type === 'user' && entry.subject.id === userId;
      return isActorMatch || isSubjectMatch;
    });
  }

  /**
   * Export all user data for GDPR/POPIA compliance
   * Requirements: 9.4
   */
  async exportUserData(userId: string): Promise<UserDataExport> {
    // Get user profile data
    const profile = this.storage.users.get(userId) || {};

    // Get emergency contacts
    const emergencyContacts = this.storage.emergencyContacts.get(userId) || [];

    // Get emergency sessions
    const emergencySessions = this.storage.emergencySessions.get(userId) || [];

    // Get audit events related to this user
    const auditEvents = await this.getEventsForUser(userId);

    // Log the export event
    await this.logEvent({
      eventType: 'data_export',
      actor: { type: 'user', id: userId },
      subject: { type: 'user', id: userId },
      action: 'export_personal_data',
      outcome: 'success',
      details: {
        exportedRecords: {
          profile: Object.keys(profile).length > 0 ? 1 : 0,
          emergencyContacts: emergencyContacts.length,
          emergencySessions: emergencySessions.length,
          auditEvents: auditEvents.length,
        },
      },
    });

    return {
      userId,
      exportedAt: new Date(),
      data: {
        profile,
        emergencyContacts,
        emergencySessions,
        auditEvents,
      },
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
    // Check if hold has expired
    if (hold.expiresAt && hold.expiresAt < new Date()) {
      this.storage.legalHolds.delete(userId);
      return false;
    }
    return true;
  }

  /**
   * Add a legal hold for a user
   */
  addLegalHold(hold: LegalHold): void {
    this.storage.legalHolds.set(hold.userId, hold);
  }

  /**
   * Remove a legal hold for a user
   */
  removeLegalHold(userId: string): void {
    this.storage.legalHolds.delete(userId);
  }

  /**
   * Delete user data (respecting legal holds)
   * Requirements: 9.4, 10.4
   */
  async deleteUserData(userId: string, reason: string): Promise<DeletionResult> {
    // Check for legal hold
    if (this.hasLegalHold(userId)) {
      // Log the blocked deletion attempt
      await this.logEvent({
        eventType: 'data_deletion',
        actor: { type: 'system', id: 'system' },
        subject: { type: 'user', id: userId },
        action: 'delete_personal_data',
        outcome: 'failure',
        details: {
          reason,
          blockedBy: 'legal_hold',
        },
      });

      return {
        success: false,
        deletedRecords: 0,
        blockedByLegalHold: true,
        reason: 'Deletion blocked by active legal hold',
      };
    }

    let deletedRecords = 0;

    // Delete user profile
    if (this.storage.users.has(userId)) {
      this.storage.users.delete(userId);
      deletedRecords++;
    }

    // Delete emergency contacts
    const contacts = this.storage.emergencyContacts.get(userId);
    if (contacts) {
      deletedRecords += contacts.length;
      this.storage.emergencyContacts.delete(userId);
    }

    // Delete emergency sessions
    const sessions = this.storage.emergencySessions.get(userId);
    if (sessions) {
      deletedRecords += sessions.length;
      this.storage.emergencySessions.delete(userId);
    }

    // Note: Audit logs are NOT deleted - they are immutable for compliance
    // This is intentional per Requirements 9.1

    // Log the deletion event
    await this.logEvent({
      eventType: 'data_deletion',
      actor: { type: 'system', id: 'system' },
      subject: { type: 'user', id: userId },
      action: 'delete_personal_data',
      outcome: 'success',
      details: {
        reason,
        deletedRecords,
        auditLogsPreserved: true,
      },
    });

    return {
      success: true,
      deletedRecords,
      blockedByLegalHold: false,
    };
  }

  /**
   * Set user data (for testing and data import)
   */
  setUserData(userId: string, data: Record<string, unknown>): void {
    this.storage.users.set(userId, data);
  }

  /**
   * Set emergency contacts for a user (for testing and data import)
   */
  setEmergencyContacts(userId: string, contacts: Record<string, unknown>[]): void {
    this.storage.emergencyContacts.set(userId, contacts);
  }

  /**
   * Set emergency sessions for a user (for testing and data import)
   */
  setEmergencySessions(userId: string, sessions: Record<string, unknown>[]): void {
    this.storage.emergencySessions.set(userId, sessions);
  }

  /**
   * Get all entries (for testing)
   */
  getAllEntries(): AuditLogEntry[] {
    return [...this.storage.entries];
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.storage.entries = [];
    this.storage.legalHolds.clear();
    this.storage.users.clear();
    this.storage.emergencyContacts.clear();
    this.storage.emergencySessions.clear();
  }
}

/**
 * Create a new AuditService instance
 */
export function createAuditService(): AuditService {
  return new AuditService();
}
