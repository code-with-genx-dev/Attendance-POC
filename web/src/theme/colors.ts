/**
 * Minimal Dense Blue UI Theme Tokens
 * Strict adherence to BRD v1.1 Section 10
 */
export const colors = {
  primary: '#1D4ED8',      // Primary blue
  navy: '#172554',         // Deep navy
  lightBlue: '#EFF6FF',    // Light blue surface / accent
  surface: '#FFFFFF',      // White surface
  text: '#334155',         // Text slate
  mutedText: '#64748B',    // Muted text slate
  border: '#E2E8F0',       // Border slate
  status: {
    present: '#16A34A',    // Green
    incomplete: '#D97706', // Amber
    noPunch: '#DC2626',    // Red
  }
} as const;

export type ThemeColors = typeof colors;

