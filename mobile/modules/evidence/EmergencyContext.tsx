import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { startCapture, stopCapture } from './evidenceCapture';
import { LocationData, DeviceInfo } from './types';

interface EmergencyContextType {
    sessionId: string | null;
    startEmergencySession: (sessionId: string) => Promise<void>;
    stopEmergencySession: () => Promise<void>;
    uploadEvidence: (type: 'video' | 'audio', uri: string) => Promise<void>;
}

const EmergencyContext = createContext<EmergencyContextType | undefined>(undefined);

export function EmergencyProvider({ children }: { children: React.ReactNode }) {
    const [sessionId, setSessionId] = useState<string | null>(null);

    const uploadEvidence = useCallback(async (type: 'video' | 'audio', uri: string) => {
        if (!sessionId) return;

        try {
            const filename = `${sessionId}/${Date.now()}.${type === 'video' ? 'mp4' : 'm4a'}`;
            const formData = new FormData();

            // @ts-ignore: React Native FormData polyfill
            formData.append('file', {
                uri,
                name: filename,
                type: type === 'video' ? 'video/mp4' : 'audio/m4a',
            });

            const { data, error } = await supabase.storage
                .from('evidence')
                .upload(filename, formData as any);

            if (error) throw error;

            await supabase.from('evidence').insert({
                session_id: sessionId,
                type,
                storage_path: data.path,
                data: {},
            });

            console.log(`Uploaded ${type} evidence`);
        } catch (error) {
            console.error(`Failed to upload ${type}:`, error);
        }
    }, [sessionId]);

    const startEmergencySession = useCallback(async (id: string) => {
        console.log('Starting emergency session:', id);
        setSessionId(id);

        try {
            // Create session in Supabase
            // We assume the user is already authenticated or we use a system user
            // For now, we'll try to insert. If RLS fails, we might need to sign in first.
            // But let's assume the auth flow happened before this.

            // Get current user, or use test user for development
            const { data: { user } } = await supabase.auth.getUser();

            // Use test user ID if no authenticated user (for testing)
            const userId = user?.id || '00000000-0000-0000-0000-000000000000';

            if (!user) {
                console.warn('No authenticated user - using test user ID for development');
            }

            await supabase.from('emergency_sessions').insert({
                id: id,
                user_id: userId,
                status: 'active',
                trigger_type: 'duress_pin', // Default for now, could be passed in
                started_at: new Date().toISOString(),
            });

            // Start capture with callbacks
            await startCapture(id, {}, {
                onLocationUpdate: async (location: LocationData) => {
                    await supabase.from('evidence').insert({
                        session_id: id,
                        type: 'location',
                        data: location,
                    });
                },
                onDeviceScan: async (devices: DeviceInfo[]) => {
                    await supabase.from('evidence').insert({
                        session_id: id,
                        type: 'device_scan',
                        data: devices,
                    });
                }
            });

        } catch (error) {
            console.error('Failed to start emergency session:', error);
        }
    }, []);

    const stopEmergencySession = useCallback(async () => {
        console.log('Stopping emergency session');
        if (sessionId) {
            stopCapture(sessionId);

            try {
                await supabase.from('emergency_sessions')
                    .update({ status: 'resolved', ended_at: new Date().toISOString() })
                    .eq('id', sessionId);
            } catch (error) {
                console.error('Failed to close session:', error);
            }
        }
        setSessionId(null);
    }, [sessionId]);

    return (
        <EmergencyContext.Provider value={{ sessionId, startEmergencySession, stopEmergencySession, uploadEvidence }}>
            {children}
        </EmergencyContext.Provider>
    );
}

export function useEmergency() {
    const context = useContext(EmergencyContext);
    if (context === undefined) {
        throw new Error('useEmergency must be used within an EmergencyProvider');
    }
    return context;
}
