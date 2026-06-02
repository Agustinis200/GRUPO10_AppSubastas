// PujaYa! Brand Theme Design System
export const COLORS = {
  // Brand Primary & Secondary
  primary: '#0A5CFF',        // Azul Cobalto
  secondary: '#FF8C00',      // Naranja
  
  // Grayscale Palette (matching Figma image)
  white: '#FFFFFF',
  lightGray100: '#E5E5EA',   // Light Gray 100
  lightGray200: '#8E8E93',   // Light Gray 200
  darkGray500: '#202024',    // Dark Gray 500
  darkGray600: '#121214',    // Dark Gray 600
  
  // Status Helpers
  success: '#10B981',        // Emerald Green
  danger: '#EF4444',         // Red
  warning: '#FF8C00',        // Orange / Naranja
  info: '#0A5CFF',           // Cobalt Blue
  
  // Opacities & Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderMuted: 'rgba(255, 255, 255, 0.03)',
  overlay: 'rgba(10, 10, 15, 0.85)',
};

export const FONTS = {
  sizeSm: 11,
  sizeMd: 13,
  sizeBase: 14,
  sizeLg: 16,
  sizeXl: 18,
  sizeXl2: 20,
  sizeXxl: 24,
  
  weightNormal: '400',
  weightMedium: '600',
  weightBold: '700',
  weightExtraBold: '800',
};

export const SHADOWS = {
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  glow: {
    shadowColor: '#0A5CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  orangeGlow: {
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  }
};
