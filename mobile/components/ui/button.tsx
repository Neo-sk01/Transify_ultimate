import React from 'react';
import { Pressable, Text, type PressableProps } from 'react-native';
import { cn } from '@/lib/utils';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  textClassName?: string;
  children: React.ReactNode;
}

const buttonVariants = {
  default: 'bg-primary active:opacity-90',
  destructive: 'bg-destructive active:opacity-90',
  outline: 'border border-input bg-background active:bg-accent',
  secondary: 'bg-secondary active:opacity-80',
  ghost: 'active:bg-accent',
  link: 'underline-offset-4',
};

const buttonSizes = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3',
  lg: 'h-11 rounded-md px-8',
  icon: 'h-10 w-10',
};

const textVariants = {
  default: 'text-primary-foreground',
  destructive: 'text-destructive-foreground',
  outline: 'text-foreground',
  secondary: 'text-secondary-foreground',
  ghost: 'text-foreground',
  link: 'text-primary underline',
};

const textSizes = {
  default: 'text-sm',
  sm: 'text-xs',
  lg: 'text-base',
  icon: 'text-sm',
};

export function Button({
  variant = 'default',
  size = 'default',
  className,
  textClassName,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      className={cn(
        'flex-row items-center justify-center rounded-md',
        buttonVariants[variant],
        buttonSizes[size],
        disabled && 'opacity-50',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text
          className={cn(
            'font-medium',
            textVariants[variant],
            textSizes[size],
            textClassName
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
