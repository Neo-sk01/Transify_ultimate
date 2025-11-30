import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react-native';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    onDismiss: (id: string) => void;
    duration?: number;
}

const icons = {
    success: { icon: CheckCircle, color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
    error: { icon: AlertCircle, color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
    warning: { icon: AlertCircle, color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
    info: { icon: Info, color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
};

export function Toast({ id, message, type, onDismiss, duration = 3000 }: ToastProps) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        const timer = setTimeout(() => {
            handleDismiss();
        }, duration);

        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: -20,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onDismiss(id);
        });
    };

    const style = icons[type];
    const Icon = style.icon;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity,
                    transform: [{ translateY }],
                    backgroundColor: style.bg,
                    borderColor: style.border,
                },
            ]}
        >
            <View style={styles.content}>
                <Icon size={20} color={style.color} style={styles.icon} />
                <Text style={[styles.message, { color: '#1F2937' }]}>{message}</Text>
            </View>
            <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
                <X size={16} color="#9CA3AF" />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 16,
        right: 16,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 1000,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    icon: {
        marginRight: 12,
    },
    message: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    closeButton: {
        padding: 4,
    },
});
