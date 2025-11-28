/**
 * Connected Emergency Contacts Screen
 * Wires EmergencyContactsScreen to the backend
 * Requirements: 4.4
 */

import React, { useEffect } from 'react';
import { EmergencyContactsScreen } from './EmergencyContactsScreen';
import { useContacts } from '@/modules/contacts';

export interface ConnectedEmergencyContactsScreenProps {
  /** Called when a contact is successfully added */
  onContactAdded?: () => void;
  /** Called when a contact is successfully removed */
  onContactRemoved?: () => void;
}

/**
 * Emergency Contacts Screen connected to the backend
 * Handles contact CRUD operations and consent verification
 * Requirements: 4.4
 */
export function ConnectedEmergencyContactsScreen({
  onContactAdded,
  onContactRemoved,
}: ConnectedEmergencyContactsScreenProps) {
  const {
    state,
    loadContacts,
    addNewContact,
    removeExistingContact,
    requestConsentVerification,
  } = useContacts();

  // Load contacts on mount
  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleAddContact = async (
    contact: Parameters<typeof addNewContact>[0]
  ) => {
    const result = await addNewContact(contact);
    if (result.success) {
      onContactAdded?.();
    }
    return result;
  };

  const handleRemoveContact = async (contactId: string) => {
    const result = await removeExistingContact(contactId);
    if (result.success) {
      onContactRemoved?.();
    }
    return result;
  };

  return (
    <EmergencyContactsScreen
      contacts={state.contacts}
      onAddContact={handleAddContact}
      onRemoveContact={handleRemoveContact}
      onRequestConsent={requestConsentVerification}
      isLoading={state.isLoading}
    />
  );
}

export default ConnectedEmergencyContactsScreen;
