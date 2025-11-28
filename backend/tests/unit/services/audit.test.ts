/**
 * Unit tests for Audit Service
 * Requirements: 8.1, 9.1, 9.2, 9.4, 10.4
 */

import {
  AuditService,
  createAuditService,
  LogEventInput,
  ReportCriteria,
} from '../../../src/services/audit';

describe('AuditService', () => {
  let auditService: AuditService;

  beforeEach(() => {
    auditService = createAuditService();
  });

  describe('logEvent', () => {
    it('should create an audit log entry with hash chaining', async () => {
      const input: LogEventInput = {
        eventType: 'authentication_success',
        actor: { type: 'user', id: 'user-123' },
        action: 'login',
        outcome: 'success',
        details: { ip: '192.168.1.1' },
      };

      const entry = await auditService.logEvent(input);

      expect(entry.id).toBeDefined();
      expect(entry.sequence).toBe(1);
      expect(entry.eventType).toBe('authentication_success');
      expect(entry.actor).toEqual({ type: 'user', id: 'user-123' });
      expect(entry.hash).toHaveLength(64);
      expect(entry.previousHash).toBe('0'.repeat(64)); // Genesis hash
    });

    it('should chain hashes correctly for multiple entries', async () => {
      const input1: LogEventInput = {
        eventType: 'authentication_attempt',
        actor: { type: 'user', id: 'user-1' },
        action: 'login_attempt',
        outcome: 'success',
        details: {},
      };

      const input2: LogEventInput = {
        eventType: 'authentication_success',
        actor: { type: 'user', id: 'user-1' },
        action: 'login',
        outcome: 'success',
        details: {},
      };

      const entry1 = await auditService.logEvent(input1);
      const entry2 = await auditService.logEvent(input2);

      expect(entry1.sequence).toBe(1);
      expect(entry2.sequence).toBe(2);
      expect(entry2.previousHash).toBe(entry1.hash);
    });
  });

  describe('generateReport', () => {
    beforeEach(async () => {
      // Create test events
      const baseDate = new Date('2024-01-15T12:00:00Z');
      
      await auditService.logEvent({
        eventType: 'authentication_success',
        actor: { type: 'user', id: 'user-1' },
        action: 'login',
        outcome: 'success',
        details: {},
      });

      await auditService.logEvent({
        eventType: 'emergency_activated',
        actor: { type: 'user', id: 'user-1' },
        subject: { type: 'session', id: 'session-1' },
        action: 'activate_emergency',
        outcome: 'success',
        details: {},
      });

      await auditService.logEvent({
        eventType: 'evidence_accessed',
        actor: { type: 'admin', id: 'admin-1' },
        subject: { type: 'evidence', id: 'evidence-1' },
        action: 'view_evidence',
        outcome: 'success',
        details: { purpose: 'investigation' },
      });
    });

    it('should return all events within date range', async () => {
      const criteria: ReportCriteria = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-12-31'),
      };

      const report = await auditService.generateReport(criteria);

      expect(report.events.length).toBe(3);
      expect(report.totalCount).toBe(3);
      expect(report.generatedAt).toBeDefined();
    });

    it('should filter by event types', async () => {
      const criteria: ReportCriteria = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-12-31'),
        eventTypes: ['authentication_success', 'emergency_activated'],
      };

      const report = await auditService.generateReport(criteria);

      expect(report.events.length).toBe(2);
      expect(report.events.every(e => 
        e.eventType === 'authentication_success' || e.eventType === 'emergency_activated'
      )).toBe(true);
    });

    it('should filter by user ID', async () => {
      const criteria: ReportCriteria = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-12-31'),
        userId: 'user-1',
      };

      const report = await auditService.generateReport(criteria);

      expect(report.events.length).toBe(2);
      expect(report.events.every(e => 
        (e.actor.type === 'user' && e.actor.id === 'user-1') ||
        (e.subject?.type === 'user' && e.subject.id === 'user-1')
      )).toBe(true);
    });

    it('should return empty report for date range with no events', async () => {
      const criteria: ReportCriteria = {
        startDate: new Date('2020-01-01'),
        endDate: new Date('2020-12-31'),
      };

      const report = await auditService.generateReport(criteria);

      expect(report.events.length).toBe(0);
      expect(report.totalCount).toBe(0);
    });
  });

  describe('verifyLogIntegrity', () => {
    it('should return valid for correct chain', async () => {
      await auditService.logEvent({
        eventType: 'authentication_success',
        actor: { type: 'user', id: 'user-1' },
        action: 'login',
        outcome: 'success',
        details: {},
      });

      await auditService.logEvent({
        eventType: 'emergency_activated',
        actor: { type: 'user', id: 'user-1' },
        action: 'activate',
        outcome: 'success',
        details: {},
      });

      const result = await auditService.verifyLogIntegrity(
        new Date('2024-01-01'),
        new Date('2025-12-31')
      );

      expect(result.valid).toBe(true);
      expect(result.verifiedCount).toBe(2);
    });

    it('should return valid for empty range', async () => {
      const result = await auditService.verifyLogIntegrity(
        new Date('2020-01-01'),
        new Date('2020-12-31')
      );

      expect(result.valid).toBe(true);
      expect(result.verifiedCount).toBe(0);
    });
  });

  describe('exportUserData', () => {
    it('should export all user data including audit events', async () => {
      const userId = 'user-export-test';
      
      // Set up user data
      auditService.setUserData(userId, {
        name: 'Test User',
        email: 'test@example.com',
      });
      
      auditService.setEmergencyContacts(userId, [
        { id: 'contact-1', name: 'Emergency Contact 1' },
      ]);
      
      auditService.setEmergencySessions(userId, [
        { id: 'session-1', status: 'resolved' },
      ]);

      // Create some audit events for this user
      await auditService.logEvent({
        eventType: 'authentication_success',
        actor: { type: 'user', id: userId },
        action: 'login',
        outcome: 'success',
        details: {},
      });

      const exportResult = await auditService.exportUserData(userId);

      expect(exportResult.userId).toBe(userId);
      expect(exportResult.exportedAt).toBeDefined();
      expect(exportResult.data.profile).toEqual({
        name: 'Test User',
        email: 'test@example.com',
      });
      expect(exportResult.data.emergencyContacts).toHaveLength(1);
      expect(exportResult.data.emergencySessions).toHaveLength(1);
      // Should include the login event + the export event itself
      expect(exportResult.data.auditEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('should log the export event', async () => {
      const userId = 'user-export-log-test';
      
      await auditService.exportUserData(userId);

      const entries = auditService.getAllEntries();
      const exportEvent = entries.find(e => e.eventType === 'data_export');
      
      expect(exportEvent).toBeDefined();
      expect(exportEvent?.actor.id).toBe(userId);
      expect(exportEvent?.subject?.id).toBe(userId);
    });
  });

  describe('deleteUserData', () => {
    it('should delete user data when no legal hold exists', async () => {
      const userId = 'user-delete-test';
      
      // Set up user data
      auditService.setUserData(userId, { name: 'Test User' });
      auditService.setEmergencyContacts(userId, [{ id: 'contact-1' }]);
      auditService.setEmergencySessions(userId, [{ id: 'session-1' }]);

      const result = await auditService.deleteUserData(userId, 'User requested deletion');

      expect(result.success).toBe(true);
      expect(result.deletedRecords).toBe(3); // 1 profile + 1 contact + 1 session
      expect(result.blockedByLegalHold).toBe(false);
    });

    it('should block deletion when legal hold exists', async () => {
      const userId = 'user-legal-hold-test';
      
      // Set up user data
      auditService.setUserData(userId, { name: 'Test User' });
      
      // Add legal hold
      auditService.addLegalHold({
        userId,
        reason: 'Ongoing investigation',
        createdAt: new Date(),
      });

      const result = await auditService.deleteUserData(userId, 'User requested deletion');

      expect(result.success).toBe(false);
      expect(result.deletedRecords).toBe(0);
      expect(result.blockedByLegalHold).toBe(true);
    });

    it('should allow deletion after legal hold is removed', async () => {
      const userId = 'user-hold-removed-test';
      
      // Set up user data
      auditService.setUserData(userId, { name: 'Test User' });
      
      // Add and then remove legal hold
      auditService.addLegalHold({
        userId,
        reason: 'Ongoing investigation',
        createdAt: new Date(),
      });
      auditService.removeLegalHold(userId);

      const result = await auditService.deleteUserData(userId, 'User requested deletion');

      expect(result.success).toBe(true);
      expect(result.blockedByLegalHold).toBe(false);
    });

    it('should log deletion events', async () => {
      const userId = 'user-delete-log-test';
      
      await auditService.deleteUserData(userId, 'Test deletion');

      const entries = auditService.getAllEntries();
      const deleteEvent = entries.find(e => e.eventType === 'data_deletion');
      
      expect(deleteEvent).toBeDefined();
      expect(deleteEvent?.outcome).toBe('success');
    });

    it('should preserve audit logs after deletion', async () => {
      const userId = 'user-audit-preserve-test';
      
      // Create audit event for user
      await auditService.logEvent({
        eventType: 'authentication_success',
        actor: { type: 'user', id: userId },
        action: 'login',
        outcome: 'success',
        details: {},
      });

      // Delete user data
      await auditService.deleteUserData(userId, 'User requested deletion');

      // Audit logs should still exist
      const userEvents = await auditService.getEventsForUser(userId);
      expect(userEvents.length).toBeGreaterThan(0);
    });
  });

  describe('hasLegalHold', () => {
    it('should return false when no hold exists', () => {
      expect(auditService.hasLegalHold('non-existent-user')).toBe(false);
    });

    it('should return true when hold exists', () => {
      const userId = 'user-with-hold';
      auditService.addLegalHold({
        userId,
        reason: 'Investigation',
        createdAt: new Date(),
      });

      expect(auditService.hasLegalHold(userId)).toBe(true);
    });

    it('should return false when hold has expired', () => {
      const userId = 'user-expired-hold';
      auditService.addLegalHold({
        userId,
        reason: 'Investigation',
        createdAt: new Date('2020-01-01'),
        expiresAt: new Date('2020-12-31'), // Expired
      });

      expect(auditService.hasLegalHold(userId)).toBe(false);
    });
  });
});
