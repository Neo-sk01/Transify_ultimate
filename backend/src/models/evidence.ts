/**
 * Evidence Model
 * Evidence items and portfolios with cryptographic integrity
 */

import { createHash } from 'crypto';
import { LocationData } from '../services/emergency';
import { DeviceInfo } from '../services/evidence';

export type EvidenceType = 'location' | 'video' | 'audio' | 'device_scan';

export interface Evidence {
  id: string;
  type: EvidenceType;
  timestamp: Date;
  data: Buffer | LocationData | DeviceInfo[];
  hash: string;
  previousHash: string;
}

export interface EvidencePortfolio {
  id: string;
  sessionId: string;
  createdAt: Date;
  evidence: Evidence[];
  integrityChain: string[];
}

/**
 * Generate hash for evidence item
 * Incorporates previous hash for chain integrity
 */
export function generateEvidenceHash(
  evidence: Omit<Evidence, 'hash'>,
  previousHash: string
): string {
  const dataString = Buffer.isBuffer(evidence.data)
    ? evidence.data.toString('base64')
    : JSON.stringify(evidence.data);
    
  const content = JSON.stringify({
    id: evidence.id,
    type: evidence.type,
    timestamp: evidence.timestamp.toISOString(),
    data: dataString,
    previousHash,
  });
  
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Verify the integrity of an evidence item
 */
export function verifyEvidenceItem(
  evidence: Evidence,
  expectedPreviousHash: string
): boolean {
  if (evidence.previousHash !== expectedPreviousHash) {
    return false;
  }
  
  const computedHash = generateEvidenceHash(evidence, expectedPreviousHash);
  return evidence.hash === computedHash;
}

/**
 * Verify integrity of an evidence portfolio
 */
export function verifyPortfolioIntegrity(
  portfolio: EvidencePortfolio,
  genesisHash: string = '0'.repeat(64)
): { valid: boolean; brokenAt?: number; verifiedCount: number } {
  if (portfolio.evidence.length === 0) {
    return { valid: true, verifiedCount: 0 };
  }
  
  let previousHash = genesisHash;
  
  for (let i = 0; i < portfolio.evidence.length; i++) {
    if (!verifyEvidenceItem(portfolio.evidence[i], previousHash)) {
      return { valid: false, brokenAt: i, verifiedCount: i };
    }
    previousHash = portfolio.evidence[i].hash;
  }
  
  return { valid: true, verifiedCount: portfolio.evidence.length };
}

/**
 * Create a new evidence portfolio
 */
export function createEvidencePortfolio(
  id: string,
  sessionId: string
): EvidencePortfolio {
  return {
    id,
    sessionId,
    createdAt: new Date(),
    evidence: [],
    integrityChain: [],
  };
}
