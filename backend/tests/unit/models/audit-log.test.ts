/**
 * Unit tests for AuditLogEntry model
 */

import {
  AuditLogEntry,
  generateAuditHash,
  verifyAuditEntry,
  verifyAuditChain,
} from '../../../src/models/audit-log';

describe('AuditLogEntry Model', () => {
  const GENESIS_HASH = '0'.repeat(64);

  function createTestEntry(
    sequence: number,
    previousHash: string
  ): AuditLogEntry {
    const entry: Omit<AuditLogEntry, 'hash'> = {
      id: `entry-${sequence}`,
      sequence,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      eventType: 'authentication_success',
      actor: { type: 'user', id: 'user-123' },
      action: 'login',
      outcome: 'success',
      details: { ip: '192.168.1.1' },
      previousHash,
    };
    const hash = generateAuditHash(entry, previousHash);
    return { ...entry, hash };
  }

  describe('generateAuditHash', () => {
    it('should generate consistent hash for same input', () => {
      const entry: Omit<AuditLogEntry, 'hash'> = {
        id: 'test-1',
        sequence: 1,
        timestamp: new Date('2024-01-01T00:00:00Z'),
        eventType: 'authentication_attempt',
        actor: { type: 'user', id: 'user-1' },
        action: 'login',
        outcome: 'success',
        details: {},
        previousHash: GENESIS_HASH,
      };

      const hash1 = generateAuditHash(entry, GENESIS_HASH);
      const hash2 = generateAuditHash(entry, GENESIS_HASH);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should generate different hash for different previousHash', () => {
      const entry: Omit<AuditLogEntry, 'hash'> = {
        id: 'test-1',
        sequence: 1,
        timestamp: new Date('2024-01-01T00:00:00Z'),
        eventType: 'authentication_attempt',
        actor: { type: 'user', id: 'user-1' },
        action: 'login',
        outcome: 'success',
        details: {},
        previousHash: GENESIS_HASH,
      };

      const hash1 = generateAuditHash(entry, GENESIS_HASH);
      const hash2 = generateAuditHash(entry, 'a'.repeat(64));

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyAuditEntry', () => {
    it('should return true for valid entry', () => {
      const entry = createTestEntry(1, GENESIS_HASH);
      expect(verifyAuditEntry(entry, GENESIS_HASH)).toBe(true);
    });

    it('should return false for tampered entry', () => {
      const entry = createTestEntry(1, GENESIS_HASH);
      entry.action = 'tampered';
      expect(verifyAuditEntry(entry, GENESIS_HASH)).toBe(false);
    });

    it('should return false for wrong previousHash', () => {
      const entry = createTestEntry(1, GENESIS_HASH);
      expect(verifyAuditEntry(entry, 'wrong-hash')).toBe(false);
    });
  });

  describe('verifyAuditChain', () => {
    it('should return valid for empty chain', () => {
      const result = verifyAuditChain([]);
      expect(result.valid).toBe(true);
      expect(result.verifiedCount).toBe(0);
    });

    it('should return valid for correct chain', () => {
      const entry1 = createTestEntry(1, GENESIS_HASH);
      const entry2 = createTestEntry(2, entry1.hash);
      const entry3 = createTestEntry(3, entry2.hash);

      const result = verifyAuditChain([entry1, entry2, entry3]);
      expect(result.valid).toBe(true);
      expect(result.verifiedCount).toBe(3);
    });

    it('should detect broken chain', () => {
      const entry1 = createTestEntry(1, GENESIS_HASH);
      const entry2 = createTestEntry(2, entry1.hash);
      const entry3 = createTestEntry(3, 'wrong-hash');

      const result = verifyAuditChain([entry1, entry2, entry3]);
      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBe(2);
      expect(result.verifiedCount).toBe(2);
    });
  });
});
