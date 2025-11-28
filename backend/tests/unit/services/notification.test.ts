/**
 * Notification Service Unit Tests
 * Tests for multi-channel notification functionality
 * Requirements: 4.1, 4.3
 */

import {
  sendSMS,
  sendPushNotification,
  sendEmail,
  generateSecureLocationLink,
  verifyLocationLinkToken,
  isValidPhoneNumber,
  isValidEmail,
  isValidDeviceToken,
  formatEmergencyAlertSMS,
  formatEmergencyAlertPush,
  formatEmergencyAlertEmail,
  createNotificationService,
  PushPayload,
} from '../../../src/services/notification';

describe('Notification Service', () => {
  describe('Validation Functions', () => {
    describe('isValidPhoneNumber', () => {
      it('should accept valid E.164 phone numbers', () => {
        expect(isValidPhoneNumber('+27821234567')).toBe(true);
        expect(isValidPhoneNumber('+1234567890')).toBe(true);
        expect(isValidPhoneNumber('+447911123456')).toBe(true);
      });

      it('should reject invalid phone numbers', () => {
        expect(isValidPhoneNumber('0821234567')).toBe(false);
        expect(isValidPhoneNumber('27821234567')).toBe(false);
        expect(isValidPhoneNumber('+0821234567')).toBe(false);
        expect(isValidPhoneNumber('')).toBe(false);
        expect(isValidPhoneNumber('invalid')).toBe(false);
      });
    });

    describe('isValidEmail', () => {
      it('should accept valid email addresses', () => {
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('user.name@domain.co.za')).toBe(true);
        expect(isValidEmail('user+tag@example.org')).toBe(true);
      });

      it('should reject invalid email addresses', () => {
        expect(isValidEmail('invalid')).toBe(false);
        expect(isValidEmail('missing@domain')).toBe(false);
        expect(isValidEmail('@nodomain.com')).toBe(false);
        expect(isValidEmail('')).toBe(false);
      });
    });

    describe('isValidDeviceToken', () => {
      it('should accept valid device tokens', () => {
        expect(isValidDeviceToken('a'.repeat(64))).toBe(true);
        expect(isValidDeviceToken('abc123DEF456_-'.repeat(5))).toBe(true);
      });

      it('should reject invalid device tokens', () => {
        expect(isValidDeviceToken('short')).toBe(false);
        expect(isValidDeviceToken('')).toBe(false);
        expect(isValidDeviceToken('invalid token with spaces')).toBe(false);
      });
    });
  });


  describe('sendSMS', () => {
    it('should successfully send SMS to valid phone number', async () => {
      const result = await sendSMS('+27821234567', 'Test message');
      
      expect(result.success).toBe(true);
      expect(result.channel).toBe('sms');
      expect(result.messageId).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.error).toBeUndefined();
    });

    it('should fail with invalid phone number', async () => {
      const result = await sendSMS('invalid', 'Test message');
      
      expect(result.success).toBe(false);
      expect(result.channel).toBe('sms');
      expect(result.error).toContain('Invalid phone number');
    });

    it('should fail with empty message', async () => {
      const result = await sendSMS('+27821234567', '');
      
      expect(result.success).toBe(false);
      expect(result.channel).toBe('sms');
      expect(result.error).toContain('Message content is required');
    });

    it('should fail with whitespace-only message', async () => {
      const result = await sendSMS('+27821234567', '   ');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Message content is required');
    });
  });

  describe('sendPushNotification', () => {
    const validPayload: PushPayload = {
      title: 'Test Title',
      body: 'Test Body',
      data: { key: 'value' },
      priority: 'high',
    };

    const validToken = 'a'.repeat(64);

    it('should successfully send push notification', async () => {
      const result = await sendPushNotification(validToken, validPayload);
      
      expect(result.success).toBe(true);
      expect(result.channel).toBe('push');
      expect(result.messageId).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should fail with invalid device token', async () => {
      const result = await sendPushNotification('short', validPayload);
      
      expect(result.success).toBe(false);
      expect(result.channel).toBe('push');
      expect(result.error).toContain('Invalid device token');
    });

    it('should fail with missing title in payload', async () => {
      const invalidPayload = { ...validPayload, title: '' };
      const result = await sendPushNotification(validToken, invalidPayload);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('title and body');
    });

    it('should fail with missing body in payload', async () => {
      const invalidPayload = { ...validPayload, body: '' };
      const result = await sendPushNotification(validToken, invalidPayload);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('title and body');
    });
  });

  describe('sendEmail', () => {
    it('should successfully send email', async () => {
      const result = await sendEmail(
        'test@example.com',
        'Test Subject',
        'Test body content'
      );
      
      expect(result.success).toBe(true);
      expect(result.channel).toBe('email');
      expect(result.messageId).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should fail with invalid email address', async () => {
      const result = await sendEmail('invalid', 'Subject', 'Body');
      
      expect(result.success).toBe(false);
      expect(result.channel).toBe('email');
      expect(result.error).toContain('Invalid email address');
    });

    it('should fail with empty subject', async () => {
      const result = await sendEmail('test@example.com', '', 'Body');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('subject is required');
    });

    it('should fail with empty body', async () => {
      const result = await sendEmail('test@example.com', 'Subject', '');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('body is required');
    });
  });


  describe('generateSecureLocationLink', () => {
    it('should generate a valid tracking URL', () => {
      const link = generateSecureLocationLink('session123', 'recipient456');
      
      expect(link).toContain('https://transrify.com/track/session123');
      expect(link).toContain('token=');
      expect(link).toContain('recipient=recipient456');
      expect(link).toContain('ts=');
    });

    it('should generate different tokens for different sessions', () => {
      const link1 = generateSecureLocationLink('session1', 'recipient1');
      const link2 = generateSecureLocationLink('session2', 'recipient1');
      
      expect(link1).not.toBe(link2);
    });

    it('should generate different tokens for different recipients', () => {
      const link1 = generateSecureLocationLink('session1', 'recipient1');
      const link2 = generateSecureLocationLink('session1', 'recipient2');
      
      expect(link1).not.toBe(link2);
    });

    it('should throw error for empty session ID', () => {
      expect(() => generateSecureLocationLink('', 'recipient')).toThrow('Session ID is required');
    });

    it('should throw error for empty recipient ID', () => {
      expect(() => generateSecureLocationLink('session', '')).toThrow('Recipient ID is required');
    });

    it('should include all required URL parameters', () => {
      const link = generateSecureLocationLink('session123', 'recipient456');
      const url = new URL(link);
      
      expect(url.pathname).toBe('/track/session123');
      expect(url.searchParams.has('token')).toBe(true);
      expect(url.searchParams.get('recipient')).toBe('recipient456');
      expect(url.searchParams.has('ts')).toBe(true);
    });
  });

  describe('verifyLocationLinkToken', () => {
    it('should verify a valid token', () => {
      const sessionId = 'session123';
      const recipientId = 'recipient456';
      const link = generateSecureLocationLink(sessionId, recipientId);
      
      // Extract parameters from the generated link
      const url = new URL(link);
      const token = url.searchParams.get('token')!;
      const timestamp = parseInt(url.searchParams.get('ts')!, 10);
      
      const isValid = verifyLocationLinkToken(sessionId, recipientId, token, timestamp);
      expect(isValid).toBe(true);
    });

    it('should reject an invalid token', () => {
      const isValid = verifyLocationLinkToken(
        'session123',
        'recipient456',
        'invalidtoken',
        Date.now()
      );
      expect(isValid).toBe(false);
    });

    it('should reject token with wrong session ID', () => {
      const link = generateSecureLocationLink('session123', 'recipient456');
      const url = new URL(link);
      const token = url.searchParams.get('token')!;
      const timestamp = parseInt(url.searchParams.get('ts')!, 10);
      
      const isValid = verifyLocationLinkToken('wrongSession', 'recipient456', token, timestamp);
      expect(isValid).toBe(false);
    });

    it('should reject token with wrong recipient ID', () => {
      const link = generateSecureLocationLink('session123', 'recipient456');
      const url = new URL(link);
      const token = url.searchParams.get('token')!;
      const timestamp = parseInt(url.searchParams.get('ts')!, 10);
      
      const isValid = verifyLocationLinkToken('session123', 'wrongRecipient', token, timestamp);
      expect(isValid).toBe(false);
    });
  });


  describe('Emergency Alert Formatters', () => {
    describe('formatEmergencyAlertSMS', () => {
      it('should format SMS with all required information', () => {
        const message = formatEmergencyAlertSMS(
          'John Doe',
          -26.2041,
          28.0473,
          'https://transrify.com/track/abc123'
        );
        
        expect(message).toContain('TRANSRIFY EMERGENCY ALERT');
        expect(message).toContain('John Doe');
        expect(message).toContain('-26.204100');
        expect(message).toContain('28.047300');
        expect(message).toContain('https://transrify.com/track/abc123');
      });
    });

    describe('formatEmergencyAlertPush', () => {
      it('should format push notification with high priority', () => {
        const payload = formatEmergencyAlertPush(
          'John Doe',
          'session123',
          -26.2041,
          28.0473
        );
        
        expect(payload.title).toBe('EMERGENCY ALERT');
        expect(payload.body).toContain('John Doe');
        expect(payload.priority).toBe('high');
        expect(payload.data.type).toBe('emergency');
        expect(payload.data.sessionId).toBe('session123');
        expect(payload.data.latitude).toBe('-26.2041');
        expect(payload.data.longitude).toBe('28.0473');
      });
    });

    describe('formatEmergencyAlertEmail', () => {
      it('should format email with subject and body', () => {
        const email = formatEmergencyAlertEmail(
          'John Doe',
          -26.2041,
          28.0473,
          'https://transrify.com/track/abc123'
        );
        
        expect(email.subject).toContain('EMERGENCY ALERT');
        expect(email.subject).toContain('John Doe');
        expect(email.body).toContain('EMERGENCY ALERT');
        expect(email.body).toContain('-26.204100');
        expect(email.body).toContain('28.047300');
        expect(email.body).toContain('https://transrify.com/track/abc123');
        expect(email.body).toContain('maps.google.com');
      });
    });
  });

  describe('createNotificationService', () => {
    it('should create a service with all required methods', () => {
      const service = createNotificationService();
      
      expect(typeof service.sendSMS).toBe('function');
      expect(typeof service.sendPushNotification).toBe('function');
      expect(typeof service.sendEmail).toBe('function');
      expect(typeof service.generateSecureLocationLink).toBe('function');
    });

    it('should work correctly when using service methods', async () => {
      const service = createNotificationService();
      
      const smsResult = await service.sendSMS('+27821234567', 'Test');
      expect(smsResult.success).toBe(true);
      
      const link = service.generateSecureLocationLink('session', 'recipient');
      expect(link).toContain('transrify.com/track');
    });
  });
});
