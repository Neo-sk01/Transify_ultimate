/**
 * Evidence Capture Module
 * Orchestrates location capture and device detection during emergencies
 * Requirements: 2.5, 3.1, 3.4, 11.3
 */

import {
  LocationData,
  DeviceInfo,
  CaptureSession,
  CaptureConfig,
  DEFAULT_CAPTURE_CONFIG,
} from './types';
import {
  captureLocation,
  startLocationTracking,
  stopLocationTracking,
  requestLocationPermissions,
  hasLocationPermissions,
  LocationSubscription,
} from './locationCapture';
import { detectNearbyDevices, getCurrentDeviceInfo } from './deviceDetection';

// Active capture sessions
const activeSessions: Map<string, CaptureSessionState> = new Map();

interface CaptureSessionState {
  session: CaptureSession;
  config: CaptureConfig;
  locationSubscription: LocationSubscription | null;
  deviceScanInterval: ReturnType<typeof setInterval> | null;
  onLocationUpdate?: (location: LocationData) => void;
  onDeviceScan?: (devices: DeviceInfo[]) => void;
}

/**
 * Start evidence capture for an emergency session
 * Begins continuous GPS tracking and periodic device scanning
 */
export async function startCapture(
  sessionId: string,
  config: Partial<CaptureConfig> = {},
  callbacks?: {
    onLocationUpdate?: (location: LocationData) => void;
    onDeviceScan?: (devices: DeviceInfo[]) => void;
  }
): Promise<{ success: boolean; error?: string }> {
  // Check if session already exists
  if (activeSessions.has(sessionId)) {
    return { success: false, error: 'Capture session already active' };
  }

  const fullConfig: CaptureConfig = { ...DEFAULT_CAPTURE_CONFIG, ...config };

  // Create new session
  const session: CaptureSession = {
    sessionId,
    isActive: true,
    startedAt: new Date(),
    locationData: [],
    deviceScans: [],
  };

  const sessionState: CaptureSessionState = {
    session,
    config: fullConfig,
    locationSubscription: null,
    deviceScanInterval: null,
    onLocationUpdate: callbacks?.onLocationUpdate,
    onDeviceScan: callbacks?.onDeviceScan,
  };

  // Start location tracking if enabled
  if (fullConfig.enableLocation) {
    const hasPermission = await hasLocationPermissions();
    if (!hasPermission) {
      const granted = await requestLocationPermissions();
      if (!granted) {
        return { success: false, error: 'Location permissions not granted' };
      }
    }

    const subscription = await startLocationTracking(
      (location) => {
        session.locationData.push(location);
        sessionState.onLocationUpdate?.(location);
      },
      fullConfig.locationIntervalMs
    );

    if (subscription) {
      sessionState.locationSubscription = subscription;
    }

    // Capture initial location immediately
    const initialLocation = await captureLocation();
    if (initialLocation.success && initialLocation.data) {
      session.locationData.push(initialLocation.data);
      sessionState.onLocationUpdate?.(initialLocation.data);
    }
  }

  // Start device detection if enabled
  if (fullConfig.enableDeviceDetection) {
    // Perform initial scan
    const initialScan = await detectNearbyDevices();
    if (initialScan.success && initialScan.devices.length > 0) {
      session.deviceScans.push(...initialScan.devices);
      sessionState.onDeviceScan?.(initialScan.devices);
    }

    // Set up periodic scanning
    sessionState.deviceScanInterval = setInterval(async () => {
      const scanResult = await detectNearbyDevices();
      if (scanResult.success && scanResult.devices.length > 0) {
        session.deviceScans.push(...scanResult.devices);
        sessionState.onDeviceScan?.(scanResult.devices);
      }
    }, fullConfig.deviceScanIntervalMs);
  }

  activeSessions.set(sessionId, sessionState);

  return { success: true };
}

/**
 * Stop evidence capture for a session
 */
export function stopCapture(sessionId: string): {
  success: boolean;
  session?: CaptureSession;
  error?: string;
} {
  const sessionState = activeSessions.get(sessionId);
  
  if (!sessionState) {
    return { success: false, error: 'No active capture session found' };
  }

  // Stop location tracking
  if (sessionState.locationSubscription) {
    stopLocationTracking(sessionState.locationSubscription);
  }

  // Stop device scanning
  if (sessionState.deviceScanInterval) {
    clearInterval(sessionState.deviceScanInterval);
  }

  // Mark session as inactive
  sessionState.session.isActive = false;

  // Remove from active sessions
  activeSessions.delete(sessionId);

  return { success: true, session: sessionState.session };
}

/**
 * Get the current state of a capture session
 */
export function getCaptureSession(sessionId: string): CaptureSession | null {
  const sessionState = activeSessions.get(sessionId);
  return sessionState?.session ?? null;
}

/**
 * Check if a capture session is active
 */
export function isCapturing(sessionId: string): boolean {
  const sessionState = activeSessions.get(sessionId);
  return sessionState?.session.isActive ?? false;
}

/**
 * Get all location data from a session
 */
export function getSessionLocationData(sessionId: string): LocationData[] {
  const sessionState = activeSessions.get(sessionId);
  return sessionState?.session.locationData ?? [];
}

/**
 * Get all device scans from a session
 */
export function getSessionDeviceScans(sessionId: string): DeviceInfo[] {
  const sessionState = activeSessions.get(sessionId);
  return sessionState?.session.deviceScans ?? [];
}

/**
 * Get the latest location from a session
 */
export function getLatestLocation(sessionId: string): LocationData | null {
  const sessionState = activeSessions.get(sessionId);
  const locations = sessionState?.session.locationData;
  
  if (!locations || locations.length === 0) {
    return null;
  }
  
  return locations[locations.length - 1];
}

/**
 * Get current device information
 */
export { getCurrentDeviceInfo } from './deviceDetection';

/**
 * Manually trigger a location capture
 */
export async function captureLocationNow(
  sessionId: string
): Promise<{ success: boolean; location?: LocationData; error?: string }> {
  const sessionState = activeSessions.get(sessionId);
  
  if (!sessionState) {
    return { success: false, error: 'No active capture session found' };
  }

  const result = await captureLocation();
  
  if (result.success && result.data) {
    sessionState.session.locationData.push(result.data);
    sessionState.onLocationUpdate?.(result.data);
    return { success: true, location: result.data };
  }

  return { success: false, error: result.error };
}

/**
 * Manually trigger a device scan
 */
export async function scanDevicesNow(
  sessionId: string
): Promise<{ success: boolean; devices?: DeviceInfo[]; error?: string }> {
  const sessionState = activeSessions.get(sessionId);
  
  if (!sessionState) {
    return { success: false, error: 'No active capture session found' };
  }

  const result = await detectNearbyDevices();
  
  if (result.success) {
    sessionState.session.deviceScans.push(...result.devices);
    sessionState.onDeviceScan?.(result.devices);
    return { success: true, devices: result.devices };
  }

  return { success: false, error: result.error };
}
