import React, { createContext, useContext, useState, useCallback } from 'react';

interface EmergencyContextType {
    sessionId: string | null;
    startEmergencySession: (sessionId: string) => void;
    stopEmergencySession: () => void;
}

const EmergencyContext = createContext<EmergencyContextType | undefined>(undefined);

export function EmergencyProvider({ children }: { children: React.ReactNode }) {
    const [sessionId, setSessionId] = useState<string | null>(null);

    const startEmergencySession = useCallback((id: string) => {
        console.log('Starting emergency session:', id);
        setSessionId(id);
    }, []);

    const stopEmergencySession = useCallback(() => {
        console.log('Stopping emergency session');
        setSessionId(null);
    }, []);

    return (
        <EmergencyContext.Provider value={{ sessionId, startEmergencySession, stopEmergencySession }}>
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
