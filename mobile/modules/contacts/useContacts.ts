/**
 * Emergency Contacts Hook
 * Connects emergency contact management to the backend
 * Requirements: 4.4
 */

import { useState, useCallback, useEffect } from 'react';
import {
  getContacts,
  addContact,
  removeContact,
  requestConsent,
  type AddContactRequest,
} from '@/services/api';
import type { EmergencyContact, NotificationChannel } from '@/types';

export interface ContactsState {
  contacts: EmergencyContact[];
  isLoading: boolean;
  error: string | null;
}

export interface UseContactsResult {
  state: ContactsState;
  loadContacts: () => Promise<void>;
  addNewContact: (contact: Omit<EmergencyContact, 'id' | 'consentVerified' | 'consentDate'>) => Promise<{ success: boolean; error?: string }>;
  removeExistingContact: (contactId: string) => Promise<{ success: boolean; error?: string }>;
  requestConsentVerification: (contactId: string) => Promise<{ success: boolean; error?: string }>;
}

const initialState: ContactsState = {
  contacts: [],
  isLoading: false,
  error: null,
};

/**
 * Hook for managing emergency contacts with backend integration
 * Handles contact CRUD operations and consent verification flow
 * Requirements: 4.4
 */
export function useContacts(): UseContactsResult {
  const [state, setState] = useState<ContactsState>(initialState);

  /**
   * Load contacts from the backend
   */
  const loadContacts = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await getContacts();

      if (!response.success || !response.data) {
        const errorMessage = response.error?.message || 'Failed to load contacts';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        return;
      }

      setState({
        contacts: response.data.contacts,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load contacts',
      }));
    }
  }, []);

  /**
   * Add a new emergency contact
   * Contact will not be activated until consent is verified
   * Requirements: 4.4
   */
  const addNewContact = useCallback(
    async (
      contact: Omit<EmergencyContact, 'id' | 'consentVerified' | 'consentDate'>
    ): Promise<{ success: boolean; error?: string }> => {
      setState((prev) => ({ ...prev, error: null }));

      try {
        const request: AddContactRequest = {
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          notificationChannels: contact.notificationChannels,
        };

        const response = await addContact(request);

        if (!response.success || !response.data) {
          const errorMessage = response.error?.message || 'Failed to add contact';
          setState((prev) => ({ ...prev, error: errorMessage }));
          return { success: false, error: errorMessage };
        }

        if (response.data.contact) {
          setState((prev) => ({
            ...prev,
            contacts: [...prev.contacts, response.data!.contact!],
          }));
        }

        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to add contact';
        setState((prev) => ({ ...prev, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  /**
   * Remove an emergency contact
   * Requirements: 4.4
   */
  const removeExistingContact = useCallback(
    async (contactId: string): Promise<{ success: boolean; error?: string }> => {
      setState((prev) => ({ ...prev, error: null }));

      try {
        const response = await removeContact(contactId);

        if (!response.success) {
          const errorMessage = response.error?.message || 'Failed to remove contact';
          setState((prev) => ({ ...prev, error: errorMessage }));
          return { success: false, error: errorMessage };
        }

        setState((prev) => ({
          ...prev,
          contacts: prev.contacts.filter((c) => c.id !== contactId),
        }));

        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to remove contact';
        setState((prev) => ({ ...prev, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  /**
   * Request consent verification for a contact
   * Requirements: 4.4
   */
  const requestConsentVerification = useCallback(
    async (contactId: string): Promise<{ success: boolean; error?: string }> => {
      setState((prev) => ({ ...prev, error: null }));

      try {
        const response = await requestConsent(contactId);

        if (!response.success) {
          const errorMessage = response.error?.message || 'Failed to send consent request';
          setState((prev) => ({ ...prev, error: errorMessage }));
          return { success: false, error: errorMessage };
        }

        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to send consent request';
        setState((prev) => ({ ...prev, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  return {
    state,
    loadContacts,
    addNewContact,
    removeExistingContact,
    requestConsentVerification,
  };
}

export default useContacts;
