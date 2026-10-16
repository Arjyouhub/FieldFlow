import { Platform } from 'react-native';

/**
 * FieldFlow Unified Design Tokens
 * Modern, refined SaaS & Fintech design system.
 */
export const Colors = {
  light: {
    // Canvas & Surfaces
    background: '#F8FAFC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E6F7F0',
    card: '#FFFFFF',
    cardSubtle: '#F1F5F9',
    
    // Typography
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textInverse: '#FFFFFF',

    // Brand & Primary Accents (FieldFlow Original Emerald Green #00A86B)
    primary: '#00A86B',
    primaryDark: '#005A36',
    primaryHover: '#008F5A',
    primaryLight: '#E6F7F0',
    primaryBorder: '#A7F3D0',
    accent: '#00A86B',

    // Functional & Status Colors (Soft pastel badges matching original UI)
    success: '#10B981',
    successLight: '#D1FAE5',
    successBorder: '#A7F3D0',
    successText: '#047857',

    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    warningBorder: '#FDE68A',
    warningText: '#D97706',

    danger: '#EF4444',
    dangerLight: '#FEE2E2',
    dangerBorder: '#FECACA',
    dangerText: '#DC2626',

    info: '#0EA5E9',
    infoLight: '#E0F2FE',
    infoBorder: '#BAE6FD',
    infoText: '#0369A1',

    purple: '#7C3AED',
    purpleLight: '#F5F3FF',

    // Borders & Dividers
    border: '#E2E8F0',
    borderSubtle: '#F1F5F9',
    borderStrong: '#CBD5E1',
  },
  dark: {
    background: '#0B1320',
    backgroundElement: '#111C30',
    backgroundSelected: '#1E293B',
    card: '#111C30',
    cardSubtle: '#1E293B',

    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textInverse: '#0F172A',

    primary: '#00A86B',
    primaryHover: '#008F5A',
    primaryLight: 'rgba(0, 168, 107, 0.15)',
    primaryBorder: '#00A86B',

    success: '#10B981',
    successLight: 'rgba(16, 185, 129, 0.15)',
    successBorder: '#059669',
    successText: '#34D399',

    warning: '#F59E0B',
    warningLight: 'rgba(245, 158, 11, 0.15)',
    warningBorder: '#D97706',
    warningText: '#FBBF24',

    danger: '#EF4444',
    dangerLight: 'rgba(239, 68, 68, 0.15)',
    dangerBorder: '#DC2626',
    dangerText: '#F87171',

    info: '#38BDF8',
    infoLight: 'rgba(56, 189, 248, 0.15)',
    infoBorder: '#0284C7',
    infoText: '#7DD3FC',

    purple: '#A78BFA',
    purpleLight: 'rgba(167, 139, 250, 0.15)',

    border: '#1E293B',
    borderSubtle: '#172033',
    borderStrong: '#334155',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
}) as { sans: string; serif: string; rounded: string; mono: string };

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 32,
  eight: 40,
  nine: 48,
} as const;

export const Radii = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 72 }) ?? 0;
export const MaxContentWidth = 840;
