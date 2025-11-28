import React from 'react';
import { TextInput, type TextInputProps, View, Text } from 'react-native';
import { cn } from '@/lib/utils';

export interface InputProps extends TextInputProps {
  className?: string;
  label?: string;
  error?: string;
}

export function Input({
  className,
  label,
  error,
  editable = true,
  ...props
}: InputProps) {
  return (
    <View className="w-full">
      {label && (
        <Text className="mb-1.5 text-sm font-medium text-foreground">
          {label}
        </Text>
      )}
      <TextInput
        className={cn(
          'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground',
          'placeholder:text-muted-foreground',
          !editable && 'opacity-50',
          error && 'border-destructive',
          className
        )}
        editable={editable}
        placeholderTextColor="#71717a"
        {...props}
      />
      {error && (
        <Text className="mt-1.5 text-sm text-destructive">{error}</Text>
      )}
    </View>
  );
}
