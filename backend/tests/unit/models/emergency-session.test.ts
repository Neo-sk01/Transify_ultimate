/**
 * Emergency Session Model Unit Tests
 */

import {
  createEmergencySession,
  validateEmergencySessionInput,
  validateLocationData,
  canResolveSession,
  resolveSession,
  escalateSession,
  isSessionActive,
  getSessionDuration,
  CreateEmergencySessionInput,
  LocationData,
} from '../../../src/models/emergency-session';

describe('EmergencySession Model', () => {
  const validInput: CreateEmergencySessionInput = {
    userId: 'user-123',
    institutionId: 'bank-456',
    transactionType: 'atm',
    location: {
      latitude: -26.2041,
      longitude: 28.0473,
      accuracy: 10,
      timestamp: new Date(),
    },
    deviceFingerprint: {
      deviceId: 'device-789',
      platform: 'ios',
      appVersion: '1.0.0',
    },
  };

  describe('validateLocationData', () => {
    it('should accept valid location', () => {
      const location: LocationData = {
        latitude: -26.2041,
        longitude: 28.0473,
        accuracy: 10,
        timestamp: new Date(),
      };
      const errors = validateLocationData(location);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid latitude', () => {
      const location: LocationData = {
        latitude: 100,
        longitude: 28.0473,
        accuracy: 10,
        timestamp: new Date(),
      };
      const errors = validateLocationData(location);
      expect(errors).toContain('Latitude must be between -90 and 90');
    });

    it('should reject invalid longitude', () => {
      const location: LocationData = {
        latitude: -26.2041,
        longitude: 200,
        accuracy: 10,
        timestamp: new Date(),
      };
      const errors = validateLocationData(location);
      expect(errors).toContain('Longitude must be between -180 and 180');
    });

    it('should reject negative accuracy', () => {
      const location: LocationData = {
        latitude: -26.2041,
        longitude: 28.0473,
        accuracy: -5,
        timestamp: new Date(),
      };
      const errors = validateLocationData(location);
      expect(errors).toContain('Accuracy must be non-negative');
    });
  });

  describe('validateEmergencySessionInput', () => {
    it('should validate correct input', () => {
      const result = validateEmergencySessionInput(validInput);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing userId', () => {
      const input = { ...validInput, userId: '' };
      const result = validateEmergencySessionInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('User ID is required');
    });

    it('should reject missing institutionId', () => {
      const input = { ...validInput, institutionId: '' };
      const result = validateEmergencySessionInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Institution ID is required');
    });

    it('should reject invalid transaction type', () => {
      const input = { ...validInput, transactionType: 'invalid' as any };
      const result = validateEmergencySessionInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid transaction type');
    });
  });

  describe('createEmergencySession', () => {
    it('should create session with active status', () => {
      const session = createEmergencySession(validInput, 'portfolio-123');

      expect(session.id).toBeDefined();
      expect(session.userId).toBe(validInput.userId);
      expect(session.status).toBe('active');
      expect(session.evidencePortfolioId).toBe('portfolio-123');
      expect(session.startedAt).toBeDefined();
      expect(session.resolvedAt).toBeUndefined();
    });

    it('should throw error for invalid input', () => {
      const input = { ...validInput, userId: '' };
      expect(() => createEmergencySession(input, 'portfolio-123')).toThrow('Invalid session input');
    });
  });

  describe('canResolveSession', () => {
    it('should return true for active session', () => {
      const session = createEmergencySession(validInput, 'portfolio-123');
      expect(canResolveSession(session)).toBe(true);
    });

    it('should return false for resolved session', () => {
      const session = createEmergencySession(validInput, 'portfolio-123');
      const resolved = resolveSession(session, 'Test resolution');
      expect(canResolveSession(resolved)).toBe(false);
    });
  });

  describe('resolveSession', () => {
    it('should resolve active session', () => {
      const session = createEmergencySession(validInput, 'portfolio-123');
      const resolved = resolveSession(session, 'Situation resolved');

      expect(resolved.status).toBe('resolved');
      expect(resolved.resolvedAt).toBeDefined();
      expect(resolved.resolutionReason).toBe('Situation resolved');
    });

    it('should throw error for non-active session', () => {
      const session = createEmergencySession(validInput, 'portfolio-123');
      const resolved = resolveSession(session, 'First resolution');

      expect(() => resolveSession(resolved, 'Second resolution')).toThrow(
        'Session cannot be resolved'
      );
    });
  });

  describe('escalateSession', () => {
    it('should escalate active session', () => {
      const session = createEmergencySession(validInput, 'portfolio-123');
      const escalated = escalateSession(session);

      expect(escalated.status).toBe('escalated');
    });

    it('should throw error for non-active session', () => {
      const session = createEmergencySession(validInput, 'portfolio-123');
      const resolved = resolveSession(session, 'Resolved');

      expect(() => escalateSession(resolved)).toThrow('Only active sessions can be escalated');
    });
  });

  describe('isSessionActive', () => {
    it('should return true for active session', () => {
      const session = createEmergencySession(validInput, 'portfolio-123');
      expect(isSessionActive(session)).toBe(true);
    });

    it('should return true for escalated session', () => {
      const session = createEmergencySession(validInput, 'portfolio-123');
      const escalated = escalateSession(session);
      expect(isSessionActive(escalated)).toBe(true);
    });

    it('should return false for resolved session', () => {
      const session = createEmergencySession(validInput, 'portfolio-123');
      const resolved = resolveSession(session, 'Resolved');
      expect(isSessionActive(resolved)).toBe(false);
    });
  });

  describe('getSessionDuration', () => {
    it('should calculate duration for active session', () => {
      const session = createEmergencySession(validInput, 'portfolio-123');
      // Small delay to ensure duration > 0
      const duration = getSessionDuration(session);
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should calculate duration for resolved session', () => {
      const session = createEmergencySession(validInput, 'portfolio-123');
      const resolved = resolveSession(session, 'Resolved');
      const duration = getSessionDuration(resolved);
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });
});
