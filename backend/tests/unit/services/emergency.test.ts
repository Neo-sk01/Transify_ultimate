/**
 * Emergency Protocol Service Unit Tests
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3
 */

import {
  initiateProtocol,
  notifyOperationsCenter,
  notifyEmergencyContacts,
  notifyLawEnforcement,
  deactivateProtocol,
  getSession,
  getActiveSessions,
  clearAllSessions,
  isEvidenceCaptureActive,
  generateSecureLocationLink,
  EmergencyContext,
} from '../../../src/services/emergency';
import {
  EmergencyContact,
  createEmergencyContact,
  verifyContactConsent,
} from '../../../src/models/emergency-contact';
import { TransactionType, LocationData, DeviceFingerprint } from '../../../src/models/emergency-session';

describe('Emergency Protocol Service', () => {
  const validLocation: LocationData = {
    latitude: -26.2041,
    longitude: 28.0473,
    accuracy: 10,
    timestamp: new Date(),
  };

  const validDeviceInfo: DeviceFingerprint = {
    deviceId: 'device123',
    platform: 'ios',
    appVersion: '1.0.0',
  };

  const validContext: EmergencyContext = {
    location: validLocation,
    institutionId: 'bank123',
    transactionType: 'atm' as TransactionType,
    deviceInfo: validDeviceInfo,
  };

  beforeEach(() => {
    clearAllSessions();
  });

  describe('initiateProtocol', () => {
    it('should create a new emergency session with unique ID', async () => {
      const session = await initiateProtocol('user123', validContext);

      expect(session.id).toBeDefined();
      expect(session.id.length).toBeGreaterThan(0);
      expect(session.userId).toBe('user123');
      expect(session.status).toBe('active');
    });

    it('should link session to evidence portfolio', async () => {
      const session = await initiateProtocol('user123', validContext);

      expect(session.evidencePortfolioId).toBeDefined();
      expect(session.evidencePortfolioId).toContain(session.id);
    });

    it('should store trigger context correctly', async () => {
      const session = await initiateProtocol('user123', validContext);

      expect(session.triggerContext.institutionId).toBe('bank123');
      expect(session.triggerContext.transactionType).toBe('atm');
      expect(session.triggerContext.location.latitude).toBe(validLocation.latitude);
      expect(session.triggerContext.location.longitude).toBe(validLocation.longitude);
    });

    it('should start evidence capture immediately', async () => {
      const session = await initiateProtocol('user123', validContext);

      expect(isEvidenceCaptureActive(session.id)).toBe(true);
    });

    it('should store session for retrieval', async () => {
      const session = await initiateProtocol('user123', validContext);
      const retrieved = getSession(session.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(session.id);
    });
  });

  describe('notifyOperationsCenter', () => {
    it('should return successful notification result', async () => {
      const session = await initiateProtocol('user123', validContext);
      const result = await notifyOperationsCenter(session);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('internal');
      expect(result.messageId).toBeDefined();
    });

    it('should update session with notification result', async () => {
      const session = await initiateProtocol('user123', validContext);
      await notifyOperationsCenter(session);

      const updated = getSession(session.id);
      expect(updated?.notifications.operationsCenter.success).toBe(true);
    });
  });

  describe('notifyEmergencyContacts', () => {
    it('should notify contacts with verified consent', async () => {
      const session = await initiateProtocol('user123', validContext);
      
      const contact = createEmergencyContact({
        name: 'John Doe',
        phone: '+27123456789',
        notificationChannels: ['sms'],
      });
      const verifiedContact = verifyContactConsent(contact);

      const results = await notifyEmergencyContacts(session, [verifiedContact]);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].success).toBe(true);
    });

    it('should not notify contacts without verified consent', async () => {
      const session = await initiateProtocol('user123', validContext);
      
      const contact = createEmergencyContact({
        name: 'John Doe',
        phone: '+27123456789',
        notificationChannels: ['sms'],
      });
      // Not verifying consent

      const results = await notifyEmergencyContacts(session, [contact]);

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('consent');
    });

    it('should notify via all active channels', async () => {
      const session = await initiateProtocol('user123', validContext);
      
      const contact = createEmergencyContact({
        name: 'John Doe',
        phone: '+27123456789',
        email: 'john@example.com',
        notificationChannels: ['sms', 'email'],
      });
      const verifiedContact = verifyContactConsent(contact);

      const results = await notifyEmergencyContacts(session, [verifiedContact]);

      expect(results.length).toBe(2);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('notifyLawEnforcement', () => {
    it('should notify law enforcement and security companies', async () => {
      const session = await initiateProtocol('user123', validContext);
      const results = await notifyLawEnforcement(session);

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should update session with notification results', async () => {
      const session = await initiateProtocol('user123', validContext);
      await notifyLawEnforcement(session);

      const updated = getSession(session.id);
      expect(updated?.notifications.lawEnforcement.length).toBeGreaterThan(0);
    });
  });

  describe('deactivateProtocol', () => {
    it('should stop evidence capture', async () => {
      const session = await initiateProtocol('user123', validContext);
      expect(isEvidenceCaptureActive(session.id)).toBe(true);

      await deactivateProtocol(session.id, 'Resolved by user');

      expect(isEvidenceCaptureActive(session.id)).toBe(false);
    });

    it('should mark session as resolved', async () => {
      const session = await initiateProtocol('user123', validContext);
      const resolved = await deactivateProtocol(session.id, 'Resolved by user');

      expect(resolved.status).toBe('resolved');
      expect(resolved.resolvedAt).toBeDefined();
      expect(resolved.resolutionReason).toBe('Resolved by user');
    });

    it('should throw error for non-existent session', async () => {
      await expect(deactivateProtocol('nonexistent', 'reason'))
        .rejects.toThrow('Session not found');
    });

    it('should throw error for already resolved session', async () => {
      const session = await initiateProtocol('user123', validContext);
      await deactivateProtocol(session.id, 'First resolution');

      await expect(deactivateProtocol(session.id, 'Second resolution'))
        .rejects.toThrow('Session is not active');
    });
  });

  describe('generateSecureLocationLink', () => {
    it('should generate a valid tracking link', () => {
      const link = generateSecureLocationLink('session123', 'recipient456');

      expect(link).toContain('https://transrify.com/track/session123');
      expect(link).toContain('token=');
      expect(link).toContain('recipient=recipient456');
    });

    it('should generate different tokens for different recipients', () => {
      const link1 = generateSecureLocationLink('session123', 'recipient1');
      const link2 = generateSecureLocationLink('session123', 'recipient2');

      expect(link1).not.toBe(link2);
    });
  });

  describe('getActiveSessions', () => {
    it('should return only active sessions', async () => {
      const session1 = await initiateProtocol('user1', validContext);
      const session2 = await initiateProtocol('user2', validContext);
      await deactivateProtocol(session1.id, 'Resolved');

      const active = getActiveSessions();

      expect(active.length).toBe(1);
      expect(active[0].id).toBe(session2.id);
    });
  });
});
