export const THEMES = {
  Emerald: {
    primary: '#10B981',
    secondary: '#34D399',
    gradient: ['#064E3B', '#10B981'],
    accent: '#10B981',
    accentLight: 'rgba(16, 185, 129, 0.1)',
    background: '#F5F2ED', // Soft Oat Beige
    surface: '#FFFCF9', // Ivory White
    isDark: false,
  },
  Sapphire: {
    primary: '#3B82F6',
    secondary: '#60A5FA',
    gradient: ['#1E3A8A', '#3B82F6'],
    accent: '#3B82F6',
    accentLight: 'rgba(59, 130, 246, 0.1)',
    background: '#F0F9FF', // Light Azure
    surface: '#FFFCF9',
    isDark: false,
  },
  Obsidian: {
    primary: '#0F172A',
    secondary: '#334155',
    gradient: ['#000000', '#1E293B'],
    accent: '#10B981',
    accentLight: 'rgba(16, 185, 129, 0.1)',
    background: '#0F172A',
    surface: '#1E293B',
    isDark: true,
  },
  Rose: {
    primary: '#F43F5E',
    secondary: '#FB7185',
    gradient: ['#881337', '#F43F5E'],
    accent: '#F43F5E',
    accentLight: 'rgba(244, 63, 94, 0.1)',
    background: '#FFF1F2', // Light Rose
    surface: '#FFFCF9',
    isDark: false,
  },
  Sunset: {
    primary: '#F59E0B',
    secondary: '#FBBF24',
    gradient: ['#D97706', '#F59E0B'],
    accent: '#F59E0B',
    accentLight: 'rgba(245, 158, 11, 0.1)',
    background: '#FFFBEB', // Soft Warm Cream
    surface: '#FFFCF9',
    isDark: false,
  },
  Amethyst: {
    primary: '#8B5CF6',
    secondary: '#A78BFA',
    gradient: ['#5B21B6', '#8B5CF6'],
    accent: '#8B5CF6',
    accentLight: 'rgba(139, 92, 246, 0.1)',
    background: '#F5F3FF', // Light Lavender
    surface: '#FFFCF9',
    isDark: false,
  },
  Crimson: {
    primary: '#DC2626',
    secondary: '#EF4444',
    gradient: ['#991B1B', '#DC2626'],
    accent: '#DC2626',
    accentLight: 'rgba(220, 38, 38, 0.1)',
    background: '#FEF2F2',
    surface: '#FFFCF9',
    isDark: false,
  },
  Teal: {
    primary: '#0D9488',
    secondary: '#2DD4BF',
    gradient: ['#115E59', '#0D9488'],
    accent: '#0D9488',
    accentLight: 'rgba(13, 148, 136, 0.1)',
    background: '#F0FDFA',
    surface: '#FFFCF9',
    isDark: false,
  },
  Coral: {
    primary: '#F97316',
    secondary: '#FB923C',
    gradient: ['#C2410C', '#F97316'],
    accent: '#F97316',
    accentLight: 'rgba(249, 115, 22, 0.1)',
    background: '#FFF7ED',
    surface: '#FFFCF9',
    isDark: false,
  },
  Plum: {
    primary: '#701A75',
    secondary: '#86198F',
    gradient: ['#4A044E', '#701A75'],
    accent: '#86198F',
    accentLight: 'rgba(134, 25, 143, 0.1)',
    background: '#FDF4FF',
    surface: '#FFFCF9',
    isDark: false,
  },
  Forest: {
    primary: '#059669',
    secondary: '#10B981',
    gradient: ['#064E3B', '#059669'],
    accent: '#059669',
    accentLight: 'rgba(5, 150, 105, 0.1)',
    background: '#F0FDF4',
    surface: '#FFFCF9',
    isDark: false,
  },
  Charcoal: {
    primary: '#475569',
    secondary: '#64748B',
    gradient: ['#1E293B', '#475569'],
    accent: '#475569',
    accentLight: 'rgba(71, 85, 105, 0.1)',
    background: '#F8FAFC',
    surface: '#FFFCF9',
    isDark: false,
  }
};

export const DEFAULT_THEME = 'Emerald';

export const COLORS = {
  primary: '#10B981', // Default
  secondary: '#34D399',
  background: '#F5F2ED', // Soft Oat Beige
  surface: '#FFFCF9', // Ivory White
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  white: '#FFFFFF',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray800: '#1E293B',
  glass: 'rgba(255, 255, 255, 0.8)',
  glassBorder: 'rgba(255, 255, 255, 0.4)',
  cardShadow: 'rgba(0, 0, 0, 0.1)',
  protein: '#EF4444',
  carbs: '#3B82F6',
  fats: '#F59E0B',
};

export const SIZES = {
  base: 8,
  font: 14,
  radius: 12,
  padding: 24,
  largeTitle: 40,
  h1: 30,
  h2: 22,
  h3: 16,
  h4: 14,
  body1: 30,
  body2: 20,
  body3: 16,
  body4: 14,
  body5: 12,
};

export const FONTS = {
  largeTitle: { fontSize: SIZES.largeTitle, fontWeight: '800' },
  h1: { fontSize: SIZES.h1, fontWeight: '700' },
  h2: { fontSize: SIZES.h2, fontWeight: '700' },
  h3: { fontSize: SIZES.h3, fontWeight: '600' },
  h4: { fontSize: SIZES.h4, fontWeight: '600' },
  body1: { fontSize: SIZES.body1, lineHeight: 36 },
  body2: { fontSize: SIZES.body2, lineHeight: 30 },
  body3: { fontSize: SIZES.body3, lineHeight: 22 },
  body4: { fontSize: SIZES.body4, lineHeight: 22 },
  body5: { fontSize: SIZES.body5, lineHeight: 22 },
};

const appTheme = { THEMES, DEFAULT_THEME, COLORS, SIZES, FONTS };

export default appTheme;
