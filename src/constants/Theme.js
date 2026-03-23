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
  }
};

export const DEFAULT_THEME = 'Emerald';

export const COLORS = {
  primary: '#10B981', // Fallback
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
