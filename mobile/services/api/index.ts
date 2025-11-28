/**
 * API Module Exports
 * Requirements: 5.1
 */

// Types
export type {
  ApiError,
  ApiResponse,
  TransactionType,
  VerificationAdvice,
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

// Client configuration
export {
  configureApiClient,
  setAuthToken,
  getAuthToken,
  clearAuthToken,
} from './client';

// Authentication API
export { verifyPin, registerUser } from './client';

// Evidence API
export {
  startEvidenceCapture,
  uploadLocation,
  uploadDeviceScan,
} from './client';

// Contacts API
export {
  getContacts,
  addContact,
  removeContact,
  requestConsent,
} from './client';

// User Data API
export { exportUserData } from './client';
