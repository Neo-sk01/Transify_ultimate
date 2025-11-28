/**
 * Evidence Capture Module
 * Exports for location capture and device detection during emergencies
 * Requirements: 2.5, 3.1, 3.4, 11.3
 */

// Types
export {
  LocationData,
  DeviceInfo,
  CaptureSession,
  CaptureConfig,
  DEFAULT_CAPTURE_CONFIG,
} from './types';

// Location Capture
export {
  captureLocation,
  startLocationTracking,
  stopLocationTracking,
  requestLocationPermissions,
  hasLocationPermissions,
  LocationCaptureResult,
  LocationSubscription,
} from './locationCapture';

// Device Detection
export {
  detectNearbyDevices,
  scanBluetoothDevices,
  scanWifiNetworks,
  getCurrentDeviceInfo,
  createDeviceInfo,
  DeviceScanResult,
} from './deviceDetection';

// Evidence Capture Orchestration
export {
  startCapture,
  stopCapture,
  getCaptureSession,
  isCapturing,
  getSessionLocationData,
  getSessionDeviceScans,
  getLatestLocation,
  captureLocationNow,
  scanDevicesNow,
} from './evidenceCapture';

// Connected Evidence Capture Hook
export {
  useEvidenceCapture,
  type EvidenceCaptureState,
  type UseEvidenceCaptureResult,
} from './useEvidenceCapture';

// Emergency Context
export { EmergencyProvider, useEmergency } from './EmergencyContext';
