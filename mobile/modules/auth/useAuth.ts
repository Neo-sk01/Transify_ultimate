/**
 * Authentication Hook
 * Connects PIN entry to the authentication service
 * Requirements: 1.1, 1.2
 */

import { useState, useCallback } from 'react';
import {
  verifyPin,
  setAuthToken,
  clearAuthToken,
  getAuthToken,
  type VerifyPinRequest,
  type TransactionType,
} from '@/services/api';
import { captureLocation } from '@/modules/evidence';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  sessionId: string | null;
  error: string | null;
}

export interface UseAuthResult {
  state: AuthState;
  submitPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setUserId: (userId: string) => void;
  setInstitutionId: (institutionId: string) => void;
  setTransactionType: (type: TransactionType) => void;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  userId: null,
  sessionId: null,
  error: null,
};

/**
 * Hook for managing authentication state and PIN submission
 * Handles both normal and duress PINs identically from UI perspective
 * Requirements: 1.1, 1.2
 */
export function useAuth(config?: {
  defaultInstitutionId?: string;
  defaultTransactionType?: TransactionType;
  onSuccess?: (sessionId: string) => void;
  onError?: (error: string) => void;
}): UseAuthResult {
  const [state, setState] = useState<AuthState>(initialState);
  const [userId, setUserIdState] = useState<string | null>(null);
  const [institutionId, setInstitutionIdState] = useState<string>(
    config?.defaultInstitutionId || 'default-institution'
  );
  const [transactionType, setTransactionTypeState] = useState<TransactionType>(
    config?.defaultTransactionType || 'login'
  );

  /**
   * Submit PIN for verification
   * Response is identical for normal and duress PINs (stealth mode)
   * Requirements: 1.1, 1.2
   */
  const submitPin = useCallback(
    async (pin: string): Promise<{ success: boolean; error?: string }> => {
      if (!userId) {
        return { success: false, error: 'User ID not set' };
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Capture current location for the request
        let location: VerifyPinRequest['location'] | undefined;
        try {
          const locationResult = await captureLocation();
          if (locationResult.success && locationResult.data) {
            location = {
              latitude: locationResult.data.latitude,
              longitude: locationResult.data.longitude,
              accuracy: locationResult.data.accuracy,
            };
          }
        } catch {
          // Location capture failed, continue without it
        }

        // Build verification request
        const request: VerifyPinRequest = {
          userId,
          pin,
          institutionId,
          transactionType,
          location,
        };

        // Call the API
        const response = await verifyPin(request);

        if (!response.success || !response.data) {
          const errorMessage = response.error?.message || 'Authentication failed';
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: errorMessage,
          }));
          config?.onError?.(errorMessage);
          return { success: false, error: errorMessage };
        }

        const { authorized, sessionId } = response.data;

        if (!authorized) {
          // Generic failure message - no PIN type indication
          const errorMessage = 'Authentication failed';
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: errorMessage,
          }));
          config?.onError?.(errorMessage);
          return { success: false, error: errorMessage };
        }

        // Success - store session token
        if (sessionId) {
          setAuthToken(sessionId);
        }

        setState({
          isAuthenticated: true,
          isLoading: false,
          userId,
          sessionId,
          error: null,
        });

        if (sessionId) {
          config?.onSuccess?.(sessionId);
        }

        return { success: true };
      } catch (error) {
        // Generic error - never reveals PIN type
        const errorMessage = 'Authentication failed';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        config?.onError?.(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [userId, institutionId, transactionType, config]
  );

  /**
   * Logout and clear authentication state
   */
  const logout = useCallback(() => {
    clearAuthToken();
    setState(initialState);
  }, []);

  /**
   * Set the user ID for authentication
   */
  const setUserId = useCallback((id: string) => {
    setUserIdState(id);
    setState((prev) => ({ ...prev, userId: id }));
  }, []);

  /**
   * Set the institution ID for authentication
   */
  const setInstitutionId = useCallback((id: string) => {
    setInstitutionIdState(id);
  }, []);

  /**
   * Set the transaction type for authentication
   */
  const setTransactionType = useCallback((type: TransactionType) => {
    setTransactionTypeState(type);
  }, []);

  return {
    state,
    submitPin,
    logout,
    setUserId,
    setInstitutionId,
    setTransactionType,
  };
}

export default useAuth;
