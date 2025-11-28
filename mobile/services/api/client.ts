/**
 * TRANSRIFY API Client
 * Typed API client for all backend endpoints
 * Requirements: 5.1
 */

import type {
  ApiResponse,
  ApiError,
  VerifyPinRequest,
  VerifyPinResponse,
  RegisterUserRequest,
  RegisterUserResponse,
  UploadLocationRequest,
  UploadLocationResponse,
  UploadDeviceScanRequest,
  UploadDeviceScanResponse,
  StartEvidenceCaptureRequest,
  StartEvidenceCaptureResponse,
  AddContactRequest,
  AddContactResponse,
  RemoveContactResponse,
  GetContactsResponse,
  RequestConsentResponse,
  ExportUserDataResponse,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  defaultHeaders?: Record<string, string>;
}

const DEFAULT_CONFIG: ApiClientConfig = {
  baseUrl: 'http://localhost:3000',
  timeout: 10000,
};

let config: ApiClientConfig = { ...DEFAULT_CONFIG };
let authToken: string | null = null;

/**
 * Configure the API client
 */
export function configureApiClient(newConfig: Partial<ApiClientConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Set the authentication token for subsequent requests
 */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/**
 * Get the current authentication token
 */
export function getAuthToken(): string | null {
  return authToken;
}

/**
 * Clear the authentication token
 */
export function clearAuthToken(): void {
  authToken = null;
}

// ============================================================================
// HTTP Client
// ============================================================================

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
}

/**
 * Make an HTTP request to the API
 */
async function request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
  const { method, path, body, headers = {}, requiresAuth = true } = options;
  const url = `${config.baseUrl}${path}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config.defaultHeaders,
    ...headers,
  };

  if (requiresAuth && authToken) {
    requestHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: data.code || `HTTP_${response.status}`,
          message: data.message || data.error || 'Request failed',
        },
      };
    }

    return {
      success: true,
      data: data as T,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: 'Request timed out',
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error',
      },
    };
  }
}

// ============================================================================
// Authentication API
// ============================================================================

/**
 * Verify PIN with the backend
 * Requirements: 1.1, 1.2
 */
export async function verifyPin(
  req: VerifyPinRequest
): Promise<ApiResponse<VerifyPinResponse>> {
  return request<VerifyPinResponse>({
    method: 'POST',
    path: '/api/v1/institution/verify',
    body: req,
    requiresAuth: false,
  });
}

/**
 * Register a new user
 * Requirements: 10.1
 */
export async function registerUser(
  req: RegisterUserRequest
): Promise<ApiResponse<RegisterUserResponse>> {
  return request<RegisterUserResponse>({
    method: 'POST',
    path: '/api/v1/auth/register',
    body: req,
    requiresAuth: false,
  });
}

// ============================================================================
// Evidence API
// ============================================================================

/**
 * Start evidence capture for an emergency session
 * Requirements: 2.5, 3.4
 */
export async function startEvidenceCapture(
  req: StartEvidenceCaptureRequest
): Promise<ApiResponse<StartEvidenceCaptureResponse>> {
  return request<StartEvidenceCaptureResponse>({
    method: 'POST',
    path: '/api/v1/evidence/start',
    body: req,
  });
}

/**
 * Upload location data during emergency
 * Requirements: 2.5, 3.1
 */
export async function uploadLocation(
  req: UploadLocationRequest
): Promise<ApiResponse<UploadLocationResponse>> {
  return request<UploadLocationResponse>({
    method: 'POST',
    path: '/api/v1/evidence/location',
    body: req,
  });
}

/**
 * Upload device scan results
 * Requirements: 3.4
 */
export async function uploadDeviceScan(
  req: UploadDeviceScanRequest
): Promise<ApiResponse<UploadDeviceScanResponse>> {
  return request<UploadDeviceScanResponse>({
    method: 'POST',
    path: '/api/v1/evidence/devices',
    body: req,
  });
}

// ============================================================================
// Emergency Contacts API
// ============================================================================

/**
 * Get all emergency contacts for the current user
 * Requirements: 4.4
 */
export async function getContacts(): Promise<ApiResponse<GetContactsResponse>> {
  return request<GetContactsResponse>({
    method: 'GET',
    path: '/api/v1/contacts',
  });
}

/**
 * Add a new emergency contact
 * Requirements: 4.4
 */
export async function addContact(
  req: AddContactRequest
): Promise<ApiResponse<AddContactResponse>> {
  return request<AddContactResponse>({
    method: 'POST',
    path: '/api/v1/contacts',
    body: req,
  });
}

/**
 * Remove an emergency contact
 * Requirements: 4.4
 */
export async function removeContact(
  contactId: string
): Promise<ApiResponse<RemoveContactResponse>> {
  return request<RemoveContactResponse>({
    method: 'DELETE',
    path: `/api/v1/contacts/${contactId}`,
  });
}

/**
 * Request consent verification for a contact
 * Requirements: 4.4
 */
export async function requestConsent(
  contactId: string
): Promise<ApiResponse<RequestConsentResponse>> {
  return request<RequestConsentResponse>({
    method: 'POST',
    path: `/api/v1/contacts/${contactId}/consent`,
  });
}

// ============================================================================
// User Data API
// ============================================================================

/**
 * Export user data (GDPR/POPIA compliance)
 * Requirements: 9.4
 */
export async function exportUserData(): Promise<ApiResponse<ExportUserDataResponse>> {
  return request<ExportUserDataResponse>({
    method: 'GET',
    path: '/api/v1/user/export',
  });
}
