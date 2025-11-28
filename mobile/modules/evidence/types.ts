/**
 * Evidence Capture Module Types
 * Types for location capture and device detection
 */

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  altitude?: number;
  speed?: number;
  heading?: number;
}

export interface DeviceInfo {
  type: 'bluetooth' | 'wifi';
  identifier: string;
  signalStrength: number;
  timestamp: Date;
  name?: string;
}

export interface CaptureSession {
  sessionId: string;
  isActive: boolean;
  startedAt: Date;
  locationData: LocationData[];
  deviceScans: DeviceInfo[];
}

export interface CaptureConfig {
  locationIntervalMs: number;
  deviceScanIntervalMs: number;
  enableLocation: boolean;
  enableDeviceDetection: boolean;
  enableAudio: boolean;
  enableVideo: boolean;
}

export const DEFAULT_CAPTURE_CONFIG: CaptureConfig = {
  locationIntervalMs: 10000, // 10 seconds as per Requirements 3.1
  deviceScanIntervalMs: 30000, // 30 seconds for device scans
  enableLocation: true,
  enableDeviceDetection: true,
  enableAudio: true,
  enableVideo: true,
};
