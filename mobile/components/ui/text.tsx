import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { cn } from '@/lib/utils';

export interface TextProps extends RNTextProps {
  className?: string;
  variant?: 'default' | 'muted' | 'destructive';
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  children: React.ReactNode;
}

const textVariants = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  destructive: 'text-destructive',
};

const textSizes = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
};

const textWeights = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

export function Typography({
  className,
  variant = 'default',
  size = 'base',
  weight = 'normal',
  children,
  ...props
}: TextProps) {
  return (
    <RNText
      className={cn(
        textVariants[variant],
        textSizes[size],
        textWeights[weight],
        className
      )}
      {...props}
    >
      {children}
    </RNText>
  );
}

// Convenience components for common text styles
export function H1({ className, children, ...props }: Omit<TextProps, 'size' | 'weight'>) {
  return (
    <Typography size="3xl" weight="bold" className={cn('tracking-tight', className)} {...props}>
      {children}
    </Typography>
  );
}

export function H2({ className, children, ...props }: Omit<TextProps, 'size' | 'weight'>) {
  return (
    <Typography size="2xl" weight="semibold" className={cn('tracking-tight', className)} {...props}>
      {children}
    </Typography>
  );
}

export function H3({ className, children, ...props }: Omit<TextProps, 'size' | 'weight'>) {
  return (
    <Typography size="xl" weight="semibold" className={cn('tracking-tight', className)} {...props}>
      {children}
    </Typography>
  );
}

export function Paragraph({ className, children, ...props }: Omit<TextProps, 'size'>) {
  return (
    <Typography size="base" className={cn('leading-7', className)} {...props}>
      {children}
    </Typography>
  );
}

// Alias for backwards compatibility
export const P = Paragraph;

export function Muted({ className, children, ...props }: Omit<TextProps, 'variant'>) {
  return (
    <Typography variant="muted" size="sm" className={className} {...props}>
      {children}
    </Typography>
  );
}
