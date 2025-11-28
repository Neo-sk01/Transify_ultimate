/**
 * Unit tests for Evidence and EvidencePortfolio models
 */

import {
  Evidence,
  EvidencePortfolio,
  generateEvidenceHash,
  verifyEvidenceItem,
  verifyPortfolioIntegrity,
  createEvidencePortfolio,
} from '../../../src/models/evidence';

describe('Evidence Model', () => {
  const GENESIS_HASH = '0'.repeat(64);

  function createTestEvidence(
    id: string,
    previousHash: string
  ): Evidence {
    const evidence: Omit<Evidence, 'hash'> = {
      id,
      type: 'location',
      timestamp: new Date('2024-01-01T00:00:00Z'),
      data: { latitude: 40.7128, longitude: -74.006, accuracy: 10, timestamp: new Date() },
      previousHash,
    };
    const hash = generateEvidenceHash(evidence, previousHash);
    return { ...evidence, hash };
  }

  describe('generateEvidenceHash', () => {
    it('should generate consistent hash for same input', () => {
      const evidence: Omit<Evidence, 'hash'> = {
        id: 'ev-1',
        type: 'location',
        timestamp: new Date('2024-01-01T00:00:00Z'),
        data: { latitude: 40.7128, longitude: -74.006, accuracy: 10, timestamp: new Date('2024-01-01') },
        previousHash: GENESIS_HASH,
      };

      const hash1 = generateEvidenceHash(evidence, GENESIS_HASH);
      const hash2 = generateEvidenceHash(evidence, GENESIS_HASH);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should handle Buffer data', () => {
      const evidence: Omit<Evidence, 'hash'> = {
        id: 'ev-1',
        type: 'video',
        timestamp: new Date('2024-01-01T00:00:00Z'),
        data: Buffer.from('video-data'),
        previousHash: GENESIS_HASH,
      };

      const hash = generateEvidenceHash(evidence, GENESIS_HASH);
      expect(hash).toHaveLength(64);
    });
  });

  describe('verifyEvidenceItem', () => {
    it('should return true for valid evidence', () => {
      const evidence = createTestEvidence('ev-1', GENESIS_HASH);
      expect(verifyEvidenceItem(evidence, GENESIS_HASH)).toBe(true);
    });

    it('should return false for tampered evidence', () => {
      const evidence = createTestEvidence('ev-1', GENESIS_HASH);
      (evidence.data as any).latitude = 0;
      expect(verifyEvidenceItem(evidence, GENESIS_HASH)).toBe(false);
    });
  });

  describe('verifyPortfolioIntegrity', () => {
    it('should return valid for empty portfolio', () => {
      const portfolio = createEvidencePortfolio('p-1', 'session-1');
      const result = verifyPortfolioIntegrity(portfolio);
      expect(result.valid).toBe(true);
      expect(result.verifiedCount).toBe(0);
    });

    it('should return valid for correct chain', () => {
      const ev1 = createTestEvidence('ev-1', GENESIS_HASH);
      const ev2 = createTestEvidence('ev-2', ev1.hash);

      const portfolio: EvidencePortfolio = {
        id: 'p-1',
        sessionId: 'session-1',
        createdAt: new Date(),
        evidence: [ev1, ev2],
        integrityChain: [ev1.hash, ev2.hash],
      };

      const result = verifyPortfolioIntegrity(portfolio);
      expect(result.valid).toBe(true);
      expect(result.verifiedCount).toBe(2);
    });

    it('should detect broken chain', () => {
      const ev1 = createTestEvidence('ev-1', GENESIS_HASH);
      const ev2 = createTestEvidence('ev-2', 'wrong-hash');

      const portfolio: EvidencePortfolio = {
        id: 'p-1',
        sessionId: 'session-1',
        createdAt: new Date(),
        evidence: [ev1, ev2],
        integrityChain: [ev1.hash, ev2.hash],
      };

      const result = verifyPortfolioIntegrity(portfolio);
      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBe(1);
    });
  });

  describe('createEvidencePortfolio', () => {
    it('should create empty portfolio with correct structure', () => {
      const portfolio = createEvidencePortfolio('p-1', 'session-1');
      
      expect(portfolio.id).toBe('p-1');
      expect(portfolio.sessionId).toBe('session-1');
      expect(portfolio.evidence).toEqual([]);
      expect(portfolio.integrityChain).toEqual([]);
      expect(portfolio.createdAt).toBeInstanceOf(Date);
    });
  });
});
