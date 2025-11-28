/**
 * Audit Log Model
 * Immutable audit log entries with cryptographic hash chaining
 * Requirements: 9.1
 */

import { createHash, randomBytes } from 'crypto';

export type AuditEventType =
  | 'authentication_attempt'
  | 'authentication_success'
  | 'authentication_failure'
  | 'emergency_activated'
  | 'emergency_resolved'
  | 'evidence_accessed'
  | 'data_export'
  | 'data_deletion';

export type ActorType = 'user' | 'institution' | 'admin' | 'system';
export type SubjectType = 'user' | 'session' | 'evidence';

export interface AuditActor {
  type: ActorType;
  id: string;
}

export interface AuditSubject {
  type: SubjectType;
  id: string;
}

export interface AuditLogEntry {
  id: string;
  sequence: number;
  timestamp: Date;
  eventType: AuditEventType;
  actor: AuditActor;
  subject?: AuditSubject;
  action: string;
  outcome: 'success' | 'failure';
  details: Record<string, unknown>;
  hash: string;
  previousHash: string;
}

/**
 * Input for creating a new audit log entry
 */
export interface CreateAuditLogEntryInput {
  eventType: AuditEventType;
  actor: AuditActor;
  subject?: AuditSubject;
  action: string;
  outcome: 'success' | 'failure';
  details?: Record<string, unknown>;
}

/**
 * Validation result for audit log entry input
 */
export interface AuditLogValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Genesis hash for the first entry in a chain
 */
export const GENESIS_HASH = '0'.repeat(64);

/**
 * Valid event types for validation
 */
const VALID_EVENT_TYPES: AuditEventType[] = [
  'authentication_attempt',
  'authentication_success',
  'authentication_failure',
  'emergency_activated',
  'emergency_resolved',
  'evidence_accessed',
  'data_export',
  'data_deletion',
];

/**
 * Valid actor types for validation
 */
const VALID_ACTOR_TYPES: ActorType[] = ['user', 'institution', 'admin', 'system'];

/**
 * Valid subject types for validation
 */
const VALID_SUBJECT_TYPES: SubjectType[] = ['user', 'session', 'evidence'];

/**
 * Generate hash for an audit log entry
 * Incorporates previous hash for chain integrity
 */
export function generateAuditHash(
  entry: Omit<AuditLogEntry, 'hash'>,
  previousHash: string
): string {
  const content = JSON.stringify({
    id: entry.id,
    sequence: entry.sequence,
    timestamp: entry.timestamp.toISOString(),
    eventType: entry.eventType,
    actor: entry.actor,
    subject: entry.subject,
    action: entry.action,
    outcome: entry.outcome,
    details: entry.details,
    previousHash,
  });
  
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Verify the integrity of an audit log entry
 */
export function verifyAuditEntry(
  entry: AuditLogEntry,
  expectedPreviousHash: string
): boolean {
  if (entry.previousHash !== expectedPreviousHash) {
    return false;
  }
  
  const computedHash = generateAuditHash(entry, expectedPreviousHash);
  return entry.hash === computedHash;
}

/**
 * Verify integrity of a chain of audit log entries
 */
export function verifyAuditChain(
  entries: AuditLogEntry[],
  genesisHash: string = '0'.repeat(64)
): { valid: boolean; brokenAt?: number; verifiedCount: number } {
  if (entries.length === 0) {
    return { valid: true, verifiedCount: 0 };
  }
  
  let previousHash = genesisHash;
  
  for (let i = 0; i < entries.length; i++) {
    if (!verifyAuditEntry(entries[i], previousHash)) {
      return { valid: false, brokenAt: i, verifiedCount: i };
    }
    previousHash = entries[i].hash;
  }
  
  return { valid: true, verifiedCount: entries.length };
}
