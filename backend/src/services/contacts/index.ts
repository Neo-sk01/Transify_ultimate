/**
 * Emergency Contact Management Service
 * Handles contact registration, consent verification, and management
 * Requirements: 4.4, 10.1
 */

import {
  EmergencyContact,
  CreateEmergencyContactInput,
  createEmergencyContact,
  verifyContactConsent,
  canReceiveNotifications,
  validateEmergencyContactInput,
} from '../../models/emergency-contact';

/**
 * Result of adding a contact
 */
export interface AddContactResult {
  success: boolean;
  contact?: EmergencyContact;
  error?: string;
}

/**
 * Result of removing a contact
 */
export interface RemoveContactResult {
  success: boolean;
  error?: string;
}

/**
 * Result of consent verification
 */
export interface ConsentVerificationResult {
  success: boolean;
  contact?: EmergencyContact;
  error?: string;
}

/**
 * Emergency Contact Manager interface
 * Requirements: 4.4
 */
export interface EmergencyContactManager {
  addContact(userId: string, input: CreateEmergencyContactInput): Promise<AddContactResult>;
  removeContact(userId: string, contactId: string): Promise<RemoveContactResult>;
  getContacts(userId: string): Promise<EmergencyContact[]>;
  verifyContactConsent(userId: string, contactId: string): Promise<ConsentVerificationResult>;
  getContact(userId: string, contactId: string): Promise<EmergencyContact | undefined>;
}


// In-memory storage for contacts (would be database in production)
// Maps userId -> contactId -> EmergencyContact
const userContacts: Map<string, Map<string, EmergencyContact>> = new Map();

/**
 * Get or create the contacts map for a user
 */
function getUserContactsMap(userId: string): Map<string, EmergencyContact> {
  let contacts = userContacts.get(userId);
  if (!contacts) {
    contacts = new Map();
    userContacts.set(userId, contacts);
  }
  return contacts;
}

/**
 * Add a new emergency contact for a user
 * Contact will NOT be activated until consent is verified
 * Requirements: 4.4, 10.1
 * 
 * @param userId - The user ID to add the contact for
 * @param input - The contact creation input
 * @returns AddContactResult indicating success or failure
 */
export async function addContact(
  userId: string,
  input: CreateEmergencyContactInput
): Promise<AddContactResult> {
  // Validate user ID
  if (!userId || userId.trim().length === 0) {
    return {
      success: false,
      error: 'User ID is required',
    };
  }

  // Validate input
  const validation = validateEmergencyContactInput(input);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.join(', '),
    };
  }

  try {
    // Create the contact (consentVerified will be false)
    const contact = createEmergencyContact(input);

    // Store the contact
    const contacts = getUserContactsMap(userId);
    contacts.set(contact.id, contact);

    return {
      success: true,
      contact,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create contact',
    };
  }
}

/**
 * Remove an emergency contact
 * Requirements: 4.4
 * 
 * @param userId - The user ID
 * @param contactId - The contact ID to remove
 * @returns RemoveContactResult indicating success or failure
 */
export async function removeContact(
  userId: string,
  contactId: string
): Promise<RemoveContactResult> {
  // Validate inputs
  if (!userId || userId.trim().length === 0) {
    return {
      success: false,
      error: 'User ID is required',
    };
  }

  if (!contactId || contactId.trim().length === 0) {
    return {
      success: false,
      error: 'Contact ID is required',
    };
  }

  const contacts = getUserContactsMap(userId);
  
  if (!contacts.has(contactId)) {
    return {
      success: false,
      error: 'Contact not found',
    };
  }

  contacts.delete(contactId);

  return {
    success: true,
  };
}

/**
 * Get all emergency contacts for a user
 * Requirements: 4.4
 * 
 * @param userId - The user ID
 * @returns Array of emergency contacts
 */
export async function getContacts(userId: string): Promise<EmergencyContact[]> {
  if (!userId || userId.trim().length === 0) {
    return [];
  }

  const contacts = getUserContactsMap(userId);
  return Array.from(contacts.values());
}

/**
 * Get a specific contact by ID
 * 
 * @param userId - The user ID
 * @param contactId - The contact ID
 * @returns The contact if found, undefined otherwise
 */
export async function getContact(
  userId: string,
  contactId: string
): Promise<EmergencyContact | undefined> {
  if (!userId || !contactId) {
    return undefined;
  }

  const contacts = getUserContactsMap(userId);
  return contacts.get(contactId);
}

/**
 * Verify consent for an emergency contact
 * Contact will only be activated (able to receive notifications) after consent is verified
 * Requirements: 4.4
 * 
 * @param userId - The user ID
 * @param contactId - The contact ID to verify consent for
 * @returns ConsentVerificationResult indicating success or failure
 */
export async function verifyConsent(
  userId: string,
  contactId: string
): Promise<ConsentVerificationResult> {
  // Validate inputs
  if (!userId || userId.trim().length === 0) {
    return {
      success: false,
      error: 'User ID is required',
    };
  }

  if (!contactId || contactId.trim().length === 0) {
    return {
      success: false,
      error: 'Contact ID is required',
    };
  }

  const contacts = getUserContactsMap(userId);
  const contact = contacts.get(contactId);

  if (!contact) {
    return {
      success: false,
      error: 'Contact not found',
    };
  }

  // Verify consent using the model function
  const verifiedContact = verifyContactConsent(contact);
  
  // Update the stored contact
  contacts.set(contactId, verifiedContact);

  return {
    success: true,
    contact: verifiedContact,
  };
}

/**
 * Get only contacts that can receive notifications (consent verified)
 * Requirements: 4.4
 * 
 * @param userId - The user ID
 * @returns Array of contacts with verified consent
 */
export async function getActiveContacts(userId: string): Promise<EmergencyContact[]> {
  const allContacts = await getContacts(userId);
  return allContacts.filter(canReceiveNotifications);
}

/**
 * Check if a contact has verified consent
 * Requirements: 4.4
 * 
 * @param userId - The user ID
 * @param contactId - The contact ID
 * @returns true if consent is verified, false otherwise
 */
export async function hasVerifiedConsent(
  userId: string,
  contactId: string
): Promise<boolean> {
  const contact = await getContact(userId, contactId);
  if (!contact) {
    return false;
  }
  return canReceiveNotifications(contact);
}

/**
 * Clear all contacts for a user (for testing purposes)
 */
export function clearUserContacts(userId: string): void {
  userContacts.delete(userId);
}

/**
 * Clear all contacts (for testing purposes)
 */
export function clearAllContacts(): void {
  userContacts.clear();
}

/**
 * Create the Emergency Contact Manager implementation
 */
export function createEmergencyContactManager(): EmergencyContactManager {
  return {
    addContact,
    removeContact,
    getContacts,
    verifyContactConsent: verifyConsent,
    getContact,
  };
}
