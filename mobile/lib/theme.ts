/**
 * TRANSRIFY Theme Configuration
 * shadcn-compatible theme tokens for consistent styling
 */

export const theme = {
  colors: {
    // Base colors
    border: 'hsl(214.3 31.8% 91.4%)',
    input: 'hsl(214.3 31.8% 91.4%)',
    ring: 'hsl(222.2 84% 4.9%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222.2 84% 4.9%)',
    
    // Primary
    primary: 'hsl(222.2 47.4% 11.2%)',
    primaryForeground: 'hsl(210 40% 98%)',
    
    // Secondary
    secondary: 'hsl(210 40% 96.1%)',
    secondaryForeground: 'hsl(222.2 47.4% 11.2%)',
    
    // Destructive
    destructive: 'hsl(0 84.2% 60.2%)',
    destructiveForeground: 'hsl(210 40% 98%)',
    
    // Muted
    muted: 'hsl(210 40% 96.1%)',
    mutedForeground: 'hsl(215.4 16.3% 46.9%)',
    
    // Accent
    accent: 'hsl(210 40% 96.1%)',
    accentForeground: 'hsl(222.2 47.4% 11.2%)',
    
    // Card
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(222.2 84% 4.9%)',
    
    // TRANSRIFY brand
    transrifyPrimary: '#1a365d',
    transrifySecondary: '#2d3748',
    transrifyAccent: '#3182ce',
    transrifySuccess: '#38a169',
    transrifyWarning: '#d69e2e',
    transrifyDanger: '#e53e3e',
  },
  
  borderRadius: {
    lg: 8,
    md: 6,
    sm: 4,
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
} as const;

export type Theme = typeof theme;
