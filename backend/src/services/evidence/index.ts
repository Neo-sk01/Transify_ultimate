/**
 * Evidence Storage Service
 * Manages tamper-proof storage of emergency evidence
 * Requirements: 3.5, 3.6
 */

import { randomUUID } from 'crypto';
import { LocationData } from '../emergency';
import {
  Evidence,
  EvidencePortfolio,
  EvidenceType,
  generateEvidenceHash,
  verifyPortfolioIntegrity,
  createEvidencePortfolio as createPortfolioModel,
} from '../../models/evidence';

export interface DeviceInfo {
  type: 'bluetooth' | 'wifi';
  identifier: string;
  signalStrength: number;
  timestamp: Date;
  name?: string;
}

export interface IntegrityResult {
  valid: boolean;
  brokenAt?: number;
  verifiedCount: number;
}

// Re-export types from model
export { Evidence, EvidencePortfolio, EvidenceType };

// Genesis hash for the start of hash chains
const GENESIS_HASH = '0'.repeat(64);

// Authorized accessor roles for evidence access (Requirement 3.6)
export type AuthorizedRole = 'law_enforcement' | 'security_company' | 'transrify_admin';

export interface Accessor {
  id: string;
  role: AuthorizedRole | string;
  name?: string;
}

// In-memory storage (would be replaced with database in production)
const portfolioStore: Map<string, EvidencePortfolio> = new Map();
const accessLog: Map<string, Array<{ accessorId: string; timestamp: Date; purpose: string }>> = new Map();

/**
 * Check if an accessor is authorized to view evidence
 * Only law enforcement, security companies, and TRANSRIFY admins are authorized
 * Requirement: 3.6
 */
export function isAuthorizedAccessor(accessor: Accessor): boolean {
  const authorizedRoles: AuthorizedRole[] = [
    'law_enforcement',
    'security_company',
    'transrify_admin',
  ];
  return authorizedRoles.includes(accessor.role as AuthorizedRole);
}

/**
 * Create a new evidence portfolio for an emergency session
 * Requirement: 3.5
 */
export async function createPortfolio(sessionId: string): Promise<EvidencePortfolio> {
  const portfolioId = randomUUID();
  const portfolio = createPortfolioModel(portfolioId, sessionId);
  
  portfolioStore.set(portfolioId, portfolio);
  accessLog.set(portfolioId, []);
  
  return portfolio;
}

/**
 * Append evidence to a portfolio with hash chaining
 * Each evidence item's hash incorporates the previous item's hash
 * Requirement: 3.5
 */
export async function appendEvidence(
  portfolioId: string,
  evidenceData: {
    type: EvidenceType;
    data: Buffer | LocationData | DeviceInfo[];
  }
): Promise<Evidence> {
  const portfolio = portfolioStore.get(portfolioId);
  
  if (!portfolio) {
    throw new Error(`Portfolio not found: ${portfolioId}`);
  }

  // Get the previous hash (genesis hash if first item)
  const previousHash = portfolio.evidence.length > 0
    ? portfolio.evidence[portfolio.evidence.length - 1].hash
    : GENESIS_HASH;

  // Create evidence item without hash first
  const evidenceWithoutHash: Omit<Evidence, 'hash'> = {
    id: randomUUID(),
    type: evidenceData.type,
    timestamp: new Date(),
    data: evidenceData.data,
    previousHash,
  };

  // Generate hash incorporating previous hash
  const hash = generateEvidenceHash(evidenceWithoutHash, previousHash);

  // Create complete evidence item
  const evidence: Evidence = {
    ...evidenceWithoutHash,
    hash,
  };

  // Append to portfolio
  portfolio.evidence.push(evidence);
  portfolio.integrityChain.push(hash);

  return evidence;
}

/**
 * Get a portfolio with access control
 * Only authorized accessors can retrieve evidence
 * Requirement: 3.6
 */
export async function getPortfolio(
  portfolioId: string,
  accessor: Accessor,
  purpose: string = 'evidence_review'
): Promise<EvidencePortfolio | null> {
  // Check authorization
  if (!isAuthorizedAccessor(accessor)) {
    throw new Error('Unauthorized: Only law enforcement, security companies, and TRANSRIFY administrators can access evidence');
  }

  const portfolio = portfolioStore.get(portfolioId);
  
  if (!portfolio) {
    return null;
  }

  // Log access for audit trail (Requirement 9.5)
  const log = accessLog.get(portfolioId) ?? [];
  log.push({
    accessorId: accessor.id,
    timestamp: new Date(),
    purpose,
  });
  accessLog.set(portfolioId, log);

  return portfolio;
}

/**
 * Verify the integrity of a portfolio's hash chain
 * Detects any tampering with evidence
 * Requirement: 3.5
 */
export async function verifyIntegrity(portfolioId: string): Promise<IntegrityResult> {
  const portfolio = portfolioStore.get(portfolioId);
  
  if (!portfolio) {
    throw new Error(`Portfolio not found: ${portfolioId}`);
  }

  return verifyPortfolioIntegrity(portfolio, GENESIS_HASH);
}

/**
 * Get the access log for a portfolio
 * Used for audit compliance
 */
export function getAccessLog(portfolioId: string): Array<{ accessorId: string; timestamp: Date; purpose: string }> {
  return accessLog.get(portfolioId) ?? [];
}

/**
 * Get portfolio by session ID
 */
export async function getPortfolioBySessionId(
  sessionId: string,
  accessor: Accessor,
  purpose: string = 'evidence_review'
): Promise<EvidencePortfolio | null> {
  // Check authorization
  if (!isAuthorizedAccessor(accessor)) {
    throw new Error('Unauthorized: Only law enforcement, security companies, and TRANSRIFY administrators can access evidence');
  }

  // Find portfolio by session ID
  for (const [portfolioId, portfolio] of portfolioStore.entries()) {
    if (portfolio.sessionId === sessionId) {
      // Log access
      const log = accessLog.get(portfolioId) ?? [];
      log.push({
        accessorId: accessor.id,
        timestamp: new Date(),
        purpose,
      });
      accessLog.set(portfolioId, log);
      
      return portfolio;
    }
  }

  return null;
}

/**
 * Append location evidence to a portfolio
 * Convenience method for location data
 */
export async function appendLocationEvidence(
  portfolioId: string,
  location: LocationData
): Promise<Evidence> {
  return appendEvidence(portfolioId, {
    type: 'location',
    data: location,
  });
}

/**
 * Append device scan evidence to a portfolio
 * Convenience method for device detection data
 */
export async function appendDeviceScanEvidence(
  portfolioId: string,
  devices: DeviceInfo[]
): Promise<Evidence> {
  return appendEvidence(portfolioId, {
    type: 'device_scan',
    data: devices,
  });
}

/**
 * Clear all portfolios (for testing purposes only)
 */
export function clearAllPortfolios(): void {
  portfolioStore.clear();
  accessLog.clear();
}

/**
 * Get all portfolios (for admin/testing purposes)
 */
export function getAllPortfolios(): EvidencePortfolio[] {
  return Array.from(portfolioStore.values());
}
