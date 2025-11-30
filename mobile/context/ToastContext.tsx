import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { Toast, ToastType } from '@/components/ui/toast';

interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
    hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, message, type, duration }]);
    }, []);

    const hideToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, hideToast }}>
            {children}
            <SafeAreaView style={styles.container} pointerEvents="box-none">
                <View style={styles.toastContainer} pointerEvents="box-none">
                    {toasts.map((toast, index) => (
                        <View key={toast.id} style={{ marginTop: index === 0 ? 0 : 8 }}>
                            <Toast
                                {...toast}
                                onDismiss={hideToast}
                            />
                        </View>
                    ))}
                </View>
            </SafeAreaView>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
    },
    toastContainer: {
        padding: 16,
    },
});
