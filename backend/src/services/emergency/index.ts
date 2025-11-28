/**
 * Emergency Protocol Service
 * Orchestrates emergency response when duress PIN is detected
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3
 */

import { generateId, sha256 } from '../../utils/crypto';
import {
  LocationData,
  DeviceFingerprint,
  NotificationResult,
  EmergencySessionRecord,
  EmergencySessionStatus,
  TransactionType,
  createEmergencySession,
  resolveSession,
  updateSessionNotifications,
  isSessionActive,
  CreateEmergencySessionInput,
} from '../../models/emergency-session';
import {
  EmergencyContact,
  canReceiveNotifications,
  getActiveChannels,
  NotificationChannel,
} from '../../models/emergency-contact';

// Re-export types for convenience
export {
  LocationData,
  DeviceFingerprint,
  NotificationResult,
  EmergencySessionRecord,
  EmergencySessionStatus,
  TransactionType,
} from '../../models/emergency-session';

export interface EmergencyContext {
  location: LocationData;
  institutionId: string;
  transactionType: TransactionType;
  deviceInfo: DeviceFingerprint;
}

/**
 * Emergency Protocol Service interface
 */
export interface EmergencyProtocolService {
  initiateProtocol(userId: string, context: EmergencyContext): Promise<EmergencySessionRecord>;
  notifyOperationsCenter(session: EmergencySessionRecord): Promise<NotificationResult>;
  notifyEmergencyContacts(session: EmergencySessionRecord, contacts: EmergencyContact[]): Promise<NotificationResult[]>;
  notifyLawEnforcement(session: EmergencySessionRecord): Promise<NotificationResult[]>;
  deactivateProtocol(sessionId: string, reason: string): Promise<EmergencySessionRecord>;
}

// In-memory storage for sessions (would be database in production)
const activeSessions: Map<string, EmergencySessionRecord> = new Map();
const evidenceCaptureSessions: Set<string> = new Set();

/**
 * Generate a secure location tracking link
 * Requirements: 4.3
 */
export function generateSecureLocationLink(sessionId: string, recipientId: string): string {
  const token = sha256(`${sessionId}:${recipientId}:${Date.now()}`).substring(0, 32);
  return `https://transrify.com/track/${sessionId}?token=${token}&recipient=${recipientId}`;
}

/**
 * Create an evidence portfolio ID for a session
 */
function createEvidencePortfolioId(sessionId: string): string {
  return `portfolio_${sessionId}`;
}

/**
 * Start evidence capture for a session
 * Requirements: 2.5
 */
export function startEvidenceCapture(sessionId: string): void {
  evidenceCaptureSessions.add(sessionId);
}

/**
 * Stop evidence capture for a session
 * Requirements: 2.5
 */
export function stopEvidenceCapture(sessionId: string): void {
  evidenceCaptureSessions.delete(sessionId);
}

/**
 * Check if evidence capture is active for a session
 * Requirements: 2.5
 */
export function isEvidenceCaptureActive(sessionId: string): boolean {
  return evidenceCaptureSessions.has(sessionId);
}

/**
 * Initiate emergency protocol
 * Creates a new emergency session with unique ID and context, links to evidence portfolio
 * Requirements: 2.1, 2.5
 */
export async function initiateProtocol(
  userId: string,
  context: EmergencyContext
): Promise<EmergencySessionRecord> {
  // Create session input
  const sessionInput: CreateEmergencySessionInput = {
    userId,
    institutionId: context.institutionId,
    transactionType: context.transactionType,
    location: context.location,
    deviceFingerprint: context.deviceInfo,
  };

  // Generate evidence portfolio ID first
  const sessionId = generateId();
  const evidencePortfolioId = createEvidencePortfolioId(sessionId);

  // Create the session
  const session = createEmergencySession(sessionInput, evidencePortfolioId);
  
  // Override the generated ID with our pre-generated one for portfolio linking
  const sessionWithId: EmergencySessionRecord = {
    ...session,
    id: sessionId,
    evidencePortfolioId,
  };

  // Store the session
  activeSessions.set(sessionWithId.id, sessionWithId);

  // Start evidence capture immediately
  startEvidenceCapture(sessionWithId.id);

  return sessionWithId;
}

/**
 * Notify TRANSRIFY operations center
 * Requirements: 2.2
 */
export async function notifyOperationsCenter(
  session: EmergencySessionRecord
): Promise<NotificationResult> {
  // In production, this would send to actual operations center
  // For now, we simulate immediate notification
  const result: NotificationResult = {
    success: true,
    channel: 'internal',
    timestamp: new Date(),
    messageId: `ops_${generateId()}`,
  };

  // Update session with notification result
  const updatedSession = updateSessionNotifications(session, {
    operationsCenter: result,
  });
  activeSessions.set(session.id, updatedSession);

  return result;
}

/**
 * Format emergency notification message
 * Requirements: 4.2
 */
function formatEmergencyMessage(
  session: EmergencySessionRecord,
  recipientId: string
): string {
  const { location } = session.triggerContext;
  const locationLink = generateSecureLocationLink(session.id, recipientId);
  
  return `EMERGENCY ALERT: Your contact needs help. ` +
    `Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}. ` +
    `Track live: ${locationLink}`;
}

/**
 * Send notification to a single contact via specified channel
 */
async function sendNotificationToChannel(
  channel: NotificationChannel,
  contact: EmergencyContact,
  message: string
): Promise<NotificationResult> {
  // In production, this would integrate with actual notification services
  // For now, we simulate successful delivery
  const result: NotificationResult = {
    success: true,
    channel,
    timestamp: new Date(),
    messageId: `${channel}_${generateId()}`,
  };

  return result;
}

/**
 * Notify all registered emergency contacts
 * Requirements: 2.3, 4.1, 4.2, 4.3
 */
export async function notifyEmergencyContacts(
  session: EmergencySessionRecord,
  contacts: EmergencyContact[]
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  for (const contact of contacts) {
    // Only notify contacts with verified consent
    if (!canReceiveNotifications(contact)) {
      results.push({
        success: false,
        channel: 'none',
        timestamp: new Date(),
        error: 'Contact has not verified consent',
      });
      continue;
    }

    const activeChannels = getActiveChannels(contact);
    const message = formatEmergencyMessage(session, contact.id);

    // Send via all active channels for this contact
    for (const channel of activeChannels) {
      const result = await sendNotificationToChannel(channel, contact, message);
      results.push(result);
    }
  }

  // Update session with notification results
  const updatedSession = updateSessionNotifications(session, {
    emergencyContacts: results,
  });
  activeSessions.set(session.id, updatedSession);

  return results;
}

/**
 * Notify law enforcement and security companies
 * Requirements: 2.4
 */
export async function notifyLawEnforcement(
  session: EmergencySessionRecord
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  // In production, this would integrate with law enforcement APIs
  // and configured security companies
  
  // Notify primary law enforcement
  const lawEnforcementResult: NotificationResult = {
    success: true,
    channel: 'api',
    timestamp: new Date(),
    messageId: `le_${generateId()}`,
  };
  results.push(lawEnforcementResult);

  // Notify configured security companies
  const securityCompanyResult: NotificationResult = {
    success: true,
    channel: 'api',
    timestamp: new Date(),
    messageId: `sec_${generateId()}`,
  };
  results.push(securityCompanyResult);

  // Update session with notification results
  const updatedSession = updateSessionNotifications(session, {
    lawEnforcement: results,
  });
  activeSessions.set(session.id, updatedSession);

  return results;
}

/**
 * Deactivate emergency protocol
 * Stops evidence capture and logs resolution reason
 * Requirements: 2.5
 */
export async function deactivateProtocol(
  sessionId: string,
  reason: string
): Promise<EmergencySessionRecord> {
  const session = activeSessions.get(sessionId);
  
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  if (!isSessionActive(session)) {
    throw new Error(`Session is not active: ${sessionId}`);
  }

  // Stop evidence capture
  stopEvidenceCapture(sessionId);

  // Resolve the session
  const resolvedSession = resolveSession(session, reason);
  
  // Update storage
  activeSessions.set(sessionId, resolvedSession);

  return resolvedSession;
}

/**
 * Get an active session by ID
 */
export function getSession(sessionId: string): EmergencySessionRecord | undefined {
  return activeSessions.get(sessionId);
}

/**
 * Get all active sessions
 */
export function getActiveSessions(): EmergencySessionRecord[] {
  return Array.from(activeSessions.values()).filter(isSessionActive);
}

/**
 * Clear all sessions (for testing purposes)
 */
export function clearAllSessions(): void {
  activeSessions.clear();
  evidenceCaptureSessions.clear();
}

/**
 * Create the Emergency Protocol Service implementation
 */
export function createEmergencyProtocolService(): EmergencyProtocolService {
  return {
    initiateProtocol,
    notifyOperationsCenter,
    notifyEmergencyContacts,
    notifyLawEnforcement,
    deactivateProtocol,
  };
}
