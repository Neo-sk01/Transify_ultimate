import React from 'react';
import { View, Text, type ViewProps } from 'react-native';
import { cn } from '@/lib/utils';

export interface BadgeProps extends ViewProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  className?: string;
  textClassName?: string;
  children: React.ReactNode;
}

const badgeVariants = {
  default: 'bg-primary',
  secondary: 'bg-secondary',
  destructive: 'bg-destructive',
  outline: 'border border-input bg-background',
  success: 'bg-transrify-success',
  warning: 'bg-transrify-warning',
};

const textVariants = {
  default: 'text-primary-foreground',
  secondary: 'text-secondary-foreground',
  destructive: 'text-destructive-foreground',
  outline: 'text-foreground',
  success: 'text-white',
  warning: 'text-white',
};

export function Badge({
  variant = 'default',
  className,
  textClassName,
  children,
  ...props
}: BadgeProps) {
  return (
    <View
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5',
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text
          className={cn(
            'text-xs font-semibold',
            textVariants[variant],
            textClassName
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
