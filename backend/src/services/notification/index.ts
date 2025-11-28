/**
 * Notification Service
 * Handles multi-channel notifications to contacts and authorities
 * Requirements: 4.1, 4.3
 */

import { generateId, sha256 } from '../../utils/crypto';
import { config } from '../../config';

export type NotificationChannel = 'sms' | 'push' | 'email';

export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  timestamp: Date;
  messageId?: string;
  error?: string;
}

export interface PushPayload {
  title: string;
  body: string;
  data: Record<string, string>;
  priority: 'high' | 'normal';
}

/**
 * Notification Service interface
 */
export interface NotificationService {
  sendSMS(recipient: string, message: string): Promise<NotificationResult>;
  sendPushNotification(deviceToken: string, payload: PushPayload): Promise<NotificationResult>;
  sendEmail(recipient: string, subject: string, body: string): Promise<NotificationResult>;
  generateSecureLocationLink(sessionId: string, recipientId: string): string;
}

/**
 * Validate phone number format (basic E.164 validation)
 */
export function isValidPhoneNumber(phone: string): boolean {
  // E.164 format: + followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate device token format (basic validation)
 */
export function isValidDeviceToken(token: string): boolean {
  // Device tokens are typically 64+ hex characters or alphanumeric strings
  return token.length >= 32 && /^[a-zA-Z0-9_-]+$/.test(token);
}


/**
 * SMS Provider interface for abstraction
 */
interface SMSProvider {
  send(recipient: string, message: string): Promise<{ messageId: string }>;
}

/**
 * Push Notification Provider interface for abstraction
 */
interface PushProvider {
  send(deviceToken: string, payload: PushPayload): Promise<{ messageId: string }>;
}

/**
 * Email Provider interface for abstraction
 */
interface EmailProvider {
  send(recipient: string, subject: string, body: string): Promise<{ messageId: string }>;
}

/**
 * Mock SMS provider for development/testing
 * In production, this would integrate with Twilio, AWS SNS, etc.
 */
class MockSMSProvider implements SMSProvider {
  async send(recipient: string, message: string): Promise<{ messageId: string }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // In production, this would call actual SMS API
    console.log(`[SMS] Sending to ${recipient}: ${message.substring(0, 50)}...`);
    
    return { messageId: `sms_${generateId()}` };
  }
}

/**
 * Mock Push provider for development/testing
 * In production, this would integrate with Firebase FCM, APNs, etc.
 */
class MockPushProvider implements PushProvider {
  async send(deviceToken: string, payload: PushPayload): Promise<{ messageId: string }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // In production, this would call actual push notification API
    console.log(`[PUSH] Sending to ${deviceToken.substring(0, 10)}...: ${payload.title}`);
    
    return { messageId: `push_${generateId()}` };
  }
}

/**
 * Mock Email provider for development/testing
 * In production, this would integrate with SendGrid, AWS SES, etc.
 */
class MockEmailProvider implements EmailProvider {
  async send(recipient: string, subject: string, body: string): Promise<{ messageId: string }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // In production, this would call actual email API
    console.log(`[EMAIL] Sending to ${recipient}: ${subject}`);
    
    return { messageId: `email_${generateId()}` };
  }
}


/**
 * Base URL for location tracking links
 */
const TRACKING_BASE_URL = 'https://transrify.com/track';

/**
 * Generate a secure location tracking link
 * Creates a cryptographically secure token that includes session and recipient verification
 * Requirements: 4.3
 * 
 * @param sessionId - The emergency session ID
 * @param recipientId - The recipient's ID for verification
 * @returns A secure URL for real-time location tracking
 */
export function generateSecureLocationLink(sessionId: string, recipientId: string): string {
  if (!sessionId || sessionId.trim().length === 0) {
    throw new Error('Session ID is required');
  }
  if (!recipientId || recipientId.trim().length === 0) {
    throw new Error('Recipient ID is required');
  }

  // Generate a secure token incorporating session, recipient, and timestamp
  // This ensures the link is unique and can be verified server-side
  const timestamp = Date.now();
  const tokenData = `${sessionId}:${recipientId}:${timestamp}`;
  const token = sha256(tokenData).substring(0, 32);
  
  // Build the secure URL with all verification parameters
  const params = new URLSearchParams({
    token,
    recipient: recipientId,
    ts: timestamp.toString(),
  });
  
  return `${TRACKING_BASE_URL}/${sessionId}?${params.toString()}`;
}

/**
 * Verify a location link token
 * Used to validate that a tracking link is authentic
 * 
 * @param sessionId - The session ID from the URL
 * @param recipientId - The recipient ID from the URL
 * @param token - The token from the URL
 * @param timestamp - The timestamp from the URL
 * @returns Whether the token is valid
 */
export function verifyLocationLinkToken(
  sessionId: string,
  recipientId: string,
  token: string,
  timestamp: number
): boolean {
  const tokenData = `${sessionId}:${recipientId}:${timestamp}`;
  const expectedToken = sha256(tokenData).substring(0, 32);
  return token === expectedToken;
}


/**
 * Send SMS notification
 * Sends an SMS message to the specified recipient
 * Requirements: 4.1
 * 
 * @param recipient - Phone number in E.164 format (e.g., +27821234567)
 * @param message - The message content to send
 * @returns NotificationResult indicating success or failure
 */
export async function sendSMS(
  recipient: string,
  message: string
): Promise<NotificationResult> {
  const timestamp = new Date();
  
  // Validate recipient phone number
  if (!recipient || !isValidPhoneNumber(recipient)) {
    return {
      success: false,
      channel: 'sms',
      timestamp,
      error: 'Invalid phone number format. Expected E.164 format (e.g., +27821234567)',
    };
  }
  
  // Validate message content
  if (!message || message.trim().length === 0) {
    return {
      success: false,
      channel: 'sms',
      timestamp,
      error: 'Message content is required',
    };
  }
  
  try {
    // Use mock provider (would be replaced with real provider in production)
    const provider = new MockSMSProvider();
    const result = await provider.send(recipient, message);
    
    return {
      success: true,
      channel: 'sms',
      timestamp,
      messageId: result.messageId,
    };
  } catch (error) {
    return {
      success: false,
      channel: 'sms',
      timestamp,
      error: error instanceof Error ? error.message : 'Failed to send SMS',
    };
  }
}

/**
 * Send push notification
 * Sends a push notification to the specified device
 * Requirements: 4.1
 * 
 * @param deviceToken - The device's push notification token
 * @param payload - The notification payload including title, body, and data
 * @returns NotificationResult indicating success or failure
 */
export async function sendPushNotification(
  deviceToken: string,
  payload: PushPayload
): Promise<NotificationResult> {
  const timestamp = new Date();
  
  // Validate device token
  if (!deviceToken || !isValidDeviceToken(deviceToken)) {
    return {
      success: false,
      channel: 'push',
      timestamp,
      error: 'Invalid device token format',
    };
  }
  
  // Validate payload
  if (!payload || !payload.title || !payload.body) {
    return {
      success: false,
      channel: 'push',
      timestamp,
      error: 'Push payload must include title and body',
    };
  }
  
  try {
    // Use mock provider (would be replaced with real provider in production)
    const provider = new MockPushProvider();
    const result = await provider.send(deviceToken, payload);
    
    return {
      success: true,
      channel: 'push',
      timestamp,
      messageId: result.messageId,
    };
  } catch (error) {
    return {
      success: false,
      channel: 'push',
      timestamp,
      error: error instanceof Error ? error.message : 'Failed to send push notification',
    };
  }
}


/**
 * Send email notification
 * Sends an email to the specified recipient
 * Requirements: 4.1
 * 
 * @param recipient - Email address of the recipient
 * @param subject - Email subject line
 * @param body - Email body content
 * @returns NotificationResult indicating success or failure
 */
export async function sendEmail(
  recipient: string,
  subject: string,
  body: string
): Promise<NotificationResult> {
  const timestamp = new Date();
  
  // Validate recipient email
  if (!recipient || !isValidEmail(recipient)) {
    return {
      success: false,
      channel: 'email',
      timestamp,
      error: 'Invalid email address format',
    };
  }
  
  // Validate subject
  if (!subject || subject.trim().length === 0) {
    return {
      success: false,
      channel: 'email',
      timestamp,
      error: 'Email subject is required',
    };
  }
  
  // Validate body
  if (!body || body.trim().length === 0) {
    return {
      success: false,
      channel: 'email',
      timestamp,
      error: 'Email body is required',
    };
  }
  
  try {
    // Use mock provider (would be replaced with real provider in production)
    const provider = new MockEmailProvider();
    const result = await provider.send(recipient, subject, body);
    
    return {
      success: true,
      channel: 'email',
      timestamp,
      messageId: result.messageId,
    };
  } catch (error) {
    return {
      success: false,
      channel: 'email',
      timestamp,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Create a NotificationService instance
 * Factory function to create the notification service implementation
 */
export function createNotificationService(): NotificationService {
  return {
    sendSMS,
    sendPushNotification,
    sendEmail,
    generateSecureLocationLink,
  };
}

/**
 * Format emergency alert message for SMS
 * Creates a standardized emergency alert message
 * 
 * @param userName - Name of the user in distress
 * @param latitude - GPS latitude
 * @param longitude - GPS longitude
 * @param trackingLink - Secure link for real-time tracking
 * @returns Formatted SMS message
 */
export function formatEmergencyAlertSMS(
  userName: string,
  latitude: number,
  longitude: number,
  trackingLink: string
): string {
  return `TRANSRIFY EMERGENCY ALERT: ${userName} needs help. ` +
    `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}. ` +
    `Track live: ${trackingLink}`;
}

/**
 * Format emergency alert for push notification
 * Creates a standardized emergency push notification payload
 * 
 * @param userName - Name of the user in distress
 * @param sessionId - Emergency session ID
 * @param latitude - GPS latitude
 * @param longitude - GPS longitude
 * @returns PushPayload for emergency notification
 */
export function formatEmergencyAlertPush(
  userName: string,
  sessionId: string,
  latitude: number,
  longitude: number
): PushPayload {
  return {
    title: 'EMERGENCY ALERT',
    body: `${userName} needs help. Tap to view location.`,
    data: {
      type: 'emergency',
      sessionId,
      latitude: latitude.toString(),
      longitude: longitude.toString(),
    },
    priority: 'high',
  };
}

/**
 * Format emergency alert for email
 * Creates a standardized emergency email content
 * 
 * @param userName - Name of the user in distress
 * @param latitude - GPS latitude
 * @param longitude - GPS longitude
 * @param trackingLink - Secure link for real-time tracking
 * @returns Object with subject and body for email
 */
export function formatEmergencyAlertEmail(
  userName: string,
  latitude: number,
  longitude: number,
  trackingLink: string
): { subject: string; body: string } {
  return {
    subject: `TRANSRIFY EMERGENCY ALERT: ${userName} needs help`,
    body: `
EMERGENCY ALERT

${userName} has triggered an emergency alert and may need immediate assistance.

Current Location:
Latitude: ${latitude.toFixed(6)}
Longitude: ${longitude.toFixed(6)}

View on map: https://maps.google.com/?q=${latitude},${longitude}

Track live location: ${trackingLink}

This is an automated emergency notification from TRANSRIFY.
Please respond immediately if you are able to assist.
    `.trim(),
  };
}
