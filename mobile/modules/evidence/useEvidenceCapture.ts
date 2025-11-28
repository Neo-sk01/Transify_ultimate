/**
 * Evidence Capture Hook
 * Connects evidence capture to the backend for streaming during emergencies
 * Requirements: 2.5, 3.4
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  startCapture,
  stopCapture,
  isCapturing,
  getLatestLocation,
  type LocationData,
  type DeviceInfo,
} from './index';
import {
  uploadLocation,
  uploadDeviceScan,
  startEvidenceCapture,
} from '@/services/api';

export interface EvidenceCaptureState {
  isCapturing: boolean;
  isConnected: boolean;
  sessionId: string | null;
  portfolioId: string | null;
  lastUploadTime: Date | null;
  uploadCount: number;
  error: string | null;
}

export interface UseEvidenceCaptureResult {
  state: EvidenceCaptureState;
  startCaptureAndStream: (sessionId: string, userId: string) => Promise<{ success: boolean; error?: string }>;
  stopCaptureAndStream: () => Promise<{ success: boolean; error?: string }>;
  getLatestLocation: () => LocationData | null;
}

const initialState: EvidenceCaptureState = {
  isCapturing: false,
  isConnected: false,
  sessionId: null,
  portfolioId: null,
  lastUploadTime: null,
  uploadCount: 0,
  error: null,
};

/**
 * Hook for managing evidence capture and streaming to backend
 * Streams location data and device scans during emergencies
 * Requirements: 2.5, 3.4
 */
export function useEvidenceCapture(): UseEvidenceCaptureResult {
  const [state, setState] = useState<EvidenceCaptureState>(initialState);
  const sessionIdRef = useRef<string | null>(null);

  /**
   * Handle location update - upload to backend
   */
  const handleLocationUpdate = useCallback(async (location: LocationData) => {
    if (!sessionIdRef.current) return;

    try {
      const response = await uploadLocation({
        sessionId: sessionIdRef.current,
        location,
      });

      if (response.success) {
        setState((prev) => ({
          ...prev,
          lastUploadTime: new Date(),
          uploadCount: prev.uploadCount + 1,
        }));
      }
    } catch (error) {
      // Log error but don't stop capture
      console.error('Failed to upload location:', error);
    }
  }, []);

  /**
   * Handle device scan - upload to backend
   */
  const handleDeviceScan = useCallback(async (devices: DeviceInfo[]) => {
    if (!sessionIdRef.current || devices.length === 0) return;

    try {
      const response = await uploadDeviceScan({
        sessionId: sessionIdRef.current,
        devices,
      });

      if (response.success) {
        setState((prev) => ({
          ...prev,
          lastUploadTime: new Date(),
          uploadCount: prev.uploadCount + 1,
        }));
      }
    } catch (error) {
      // Log error but don't stop capture
      console.error('Failed to upload device scan:', error);
    }
  }, []);

  /**
   * Start evidence capture and streaming to backend
   * Requirements: 2.5, 3.4
   */
  const startCaptureAndStream = useCallback(
    async (
      sessionId: string,
      userId: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (state.isCapturing) {
        return { success: false, error: 'Capture already in progress' };
      }

      setState((prev) => ({ ...prev, error: null }));

      try {
        // Start evidence capture on backend
        const backendResponse = await startEvidenceCapture({
          sessionId,
          userId,
        });

        if (!backendResponse.success || !backendResponse.data) {
          const errorMessage = backendResponse.error?.message || 'Failed to start evidence capture on backend';
          setState((prev) => ({ ...prev, error: errorMessage }));
          return { success: false, error: errorMessage };
        }

        const portfolioId = backendResponse.data.portfolioId;

        // Store session ID for callbacks
        sessionIdRef.current = sessionId;

        // Start local capture with callbacks to stream to backend
        const captureResult = await startCapture(
          sessionId,
          {
            enableLocation: true,
            enableDeviceDetection: true,
            locationIntervalMs: 10000, // 10 seconds as per requirements
            deviceScanIntervalMs: 30000, // 30 seconds
          },
          {
            onLocationUpdate: handleLocationUpdate,
            onDeviceScan: handleDeviceScan,
          }
        );

        if (!captureResult.success) {
          setState((prev) => ({
            ...prev,
            error: captureResult.error || 'Failed to start local capture',
          }));
          return { success: false, error: captureResult.error };
        }

        setState({
          isCapturing: true,
          isConnected: true,
          sessionId,
          portfolioId: portfolioId || null,
          lastUploadTime: null,
          uploadCount: 0,
          error: null,
        });

        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to start capture';
        setState((prev) => ({ ...prev, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    },
    [state.isCapturing, handleLocationUpdate, handleDeviceScan]
  );

  /**
   * Stop evidence capture and streaming
   */
  const stopCaptureAndStream = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!sessionIdRef.current) {
      return { success: false, error: 'No active capture session' };
    }

    try {
      const result = stopCapture(sessionIdRef.current);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      sessionIdRef.current = null;

      setState(initialState);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop capture';
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Get the latest captured location
   */
  const getLatestLocationData = useCallback((): LocationData | null => {
    if (!sessionIdRef.current) return null;
    return getLatestLocation(sessionIdRef.current);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionIdRef.current && isCapturing(sessionIdRef.current)) {
        stopCapture(sessionIdRef.current);
      }
    };
  }, []);

  return {
    state,
    startCaptureAndStream,
    stopCaptureAndStream,
    getLatestLocation: getLatestLocationData,
  };
}

export default useEvidenceCapture;
