import React from 'react';
import { View, Text, type ViewProps } from 'react-native';
import { cn } from '@/lib/utils';

export interface AlertProps extends ViewProps {
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  className?: string;
  children: React.ReactNode;
}

const alertVariants = {
  default: 'bg-background border-border',
  destructive: 'bg-destructive/10 border-destructive text-destructive',
  success: 'bg-transrify-success/10 border-transrify-success',
  warning: 'bg-transrify-warning/10 border-transrify-warning',
};

export function Alert({
  variant = 'default',
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <View
      className={cn(
        'relative w-full rounded-lg border p-4',
        alertVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
}

export interface AlertTitleProps {
  className?: string;
  children: React.ReactNode;
}

export function AlertTitle({ className, children }: AlertTitleProps) {
  return (
    <Text
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    >
      {children}
    </Text>
  );
}

export interface AlertDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export function AlertDescription({
  className,
  children,
}: AlertDescriptionProps) {
  return (
    <Text className={cn('text-sm opacity-90', className)}>{children}</Text>
  );
}
