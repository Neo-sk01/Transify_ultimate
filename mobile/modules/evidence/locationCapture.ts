/**
 * Location Capture Service
 * Captures GPS location data during emergencies using Expo Location
 * Requirements: 2.5, 3.1, 11.3
 */

import * as Location from 'expo-location';
import { LocationData } from './types';

export interface LocationCaptureResult {
  success: boolean;
  data?: LocationData;
  error?: string;
}

export interface LocationSubscription {
  remove: () => void;
}

/**
 * Request location permissions from the user
 */
export async function requestLocationPermissions(): Promise<boolean> {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  
  if (foregroundStatus !== 'granted') {
    return false;
  }
  
  // Request background permissions for continuous tracking during emergencies
  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  
  // Foreground is sufficient for basic operation, background is preferred
  return foregroundStatus === 'granted';
}

/**
 * Check if location permissions are granted
 */
export async function hasLocationPermissions(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === 'granted';
}

/**
 * Capture current location once
 */
export async function captureLocation(): Promise<LocationCaptureResult> {
  try {
    const hasPermission = await hasLocationPermissions();
    if (!hasPermission) {
      return {
        success: false,
        error: 'Location permissions not granted',
      };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const locationData: LocationData = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy ?? 0,
      timestamp: new Date(location.timestamp),
      altitude: location.coords.altitude ?? undefined,
      speed: location.coords.speed ?? undefined,
      heading: location.coords.heading ?? undefined,
    };

    return {
      success: true,
      data: locationData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown location error',
    };
  }
}

/**
 * Start continuous location tracking
 * Captures GPS coordinates at minimum 10-second intervals (Requirement 3.1)
 */
export async function startLocationTracking(
  onLocationUpdate: (location: LocationData) => void,
  intervalMs: number = 10000
): Promise<LocationSubscription | null> {
  try {
    const hasPermission = await hasLocationPermissions();
    if (!hasPermission) {
      return null;
    }

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: intervalMs,
        distanceInterval: 0, // Update based on time, not distance
      },
      (location) => {
        const locationData: LocationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy ?? 0,
          timestamp: new Date(location.timestamp),
          altitude: location.coords.altitude ?? undefined,
          speed: location.coords.speed ?? undefined,
          heading: location.coords.heading ?? undefined,
        };
        onLocationUpdate(locationData);
      }
    );

    return subscription;
  } catch (error) {
    console.error('Failed to start location tracking:', error);
    return null;
  }
}

/**
 * Stop location tracking
 */
export function stopLocationTracking(subscription: LocationSubscription): void {
  subscription.remove();
}
