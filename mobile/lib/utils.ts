import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 * This is the standard shadcn/ui utility for combining class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
