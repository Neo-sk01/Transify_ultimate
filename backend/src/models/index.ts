/**
 * TRANSRIFY Data Models
 */

// User model exports
export {
  User,
  CreateUserInput,
  UserValidationResult,
  PinType,
  PinValidationResult,
  ConsentRecord,
  validateCreateUserInput,
  hasRequiredConsents,
  createUser,
  validateUserPin,
  decryptNationalId,
} from './user';

// Emergency contact exports (use these as the canonical types)
export {
  EmergencyContact,
  NotificationChannel,
  CreateEmergencyContactInput,
  EmergencyContactValidationResult,
  validateNotificationChannels,
  validatePhoneNumber,
  validateEmail,
  validateEmergencyContactInput,
  createEmergencyContact,
  verifyContactConsent,
  canReceiveNotifications,
  getActiveChannels,
} from './emergency-contact';

// Emergency session exports
export * from './emergency-session';

// Audit log exports
export * from './audit-log';

// Evidence exports
export * from './evidence';

// Admin exports
export * from './admin';
