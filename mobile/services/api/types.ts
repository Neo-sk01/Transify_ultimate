/**
 * API Types for TRANSRIFY Mobile App
 * Type definitions for all API requests and responses
 * Requirements: 5.1
 */

import type { LocationData, DeviceInfo, EmergencyContact, NotificationChannel } from '@/types';

// ============================================================================
// Common Types
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// ============================================================================
// Authentication Types
// ============================================================================

export type TransactionType = 'login' | 'atm' | 'pos' | 'transfer';

export interface VerificationAdvice {
  status: 'authenticated' | 'failed';
  recommendedRouting: string;
  transactionLimits?: {
    maxAmount?: number;
    allowedOperations: string[];
  };
}

export interface VerifyPinRequest {
  userId: string;
  pin: string;
  institutionId: string;
  transactionType: TransactionType;
  deviceFingerprint?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

export interface VerifyPinResponse {
  authorized: boolean;
  verificationAdvice: VerificationAdvice;
  sessionId: string | null;
  expiresAt: Date | null;
}

export interface RegisterUserRequest {
  nationalId: string;
  normalPin: string;
  duressPin: string;
  consentPurposes: string[];
}

export interface RegisterUserResponse {
  success: boolean;
  userId?: string;
  error?: string;
}

// ============================================================================
// Evidence Types
// ============================================================================

export interface UploadLocationRequest {
  sessionId: string;
  location: LocationData;
}

export interface UploadLocationResponse {
  success: boolean;
  evidenceId?: string;
  error?: string;
}

export interface UploadDeviceScanRequest {
  sessionId: string;
  devices: DeviceInfo[];
}

export interface UploadDeviceScanResponse {
  success: boolean;
  evidenceId?: string;
  error?: string;
}

export interface StartEvidenceCaptureRequest {
  sessionId: string;
  userId: string;
}

export interface StartEvidenceCaptureResponse {
  success: boolean;
  portfolioId?: string;
  error?: string;
}

// ============================================================================
// Emergency Contact Types
// ============================================================================

export interface AddContactRequest {
  name: string;
  phone?: string;
  email?: string;
  notificationChannels: NotificationChannel[];
}

export interface AddContactResponse {
  success: boolean;
  contact?: EmergencyContact;
  error?: string;
}

export interface RemoveContactResponse {
  success: boolean;
  error?: string;
}

export interface GetContactsResponse {
  success: boolean;
  contacts: EmergencyContact[];
  error?: string;
}

export interface RequestConsentResponse {
  success: boolean;
  error?: string;
}

// ============================================================================
// User Data Types
// ============================================================================

export interface ExportUserDataResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}
