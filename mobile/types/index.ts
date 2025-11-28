// TRANSRIFY Mobile App Type Definitions

export type NotificationChannel = 'sms' | 'push' | 'email';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

export interface DeviceInfo {
  type: 'bluetooth' | 'wifi';
  identifier: string;
  signalStrength: number;
  timestamp: Date;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notificationChannels: NotificationChannel[];
  consentVerified: boolean;
  consentDate?: Date;
}

export interface AuthResult {
  success: boolean;
  sessionToken?: string;
  error?: string;
}
