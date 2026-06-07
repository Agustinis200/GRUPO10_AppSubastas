// PujaYa! Brand Theme Design System
export const COLORS = {
  // Brand Primary & Secondary
  primary: '#0A5CFF',        // Azul Cobalto
  secondary: '#FF8C00',      // Naranja
  
  // Grayscale Palette (Light Theme)
  white: '#1C1C1E',          // Was white text, now dark gray text
  textWhite: '#FFFFFF',      // True white for buttons, badges, and status labels
  lightGray100: '#2C2C2E',   // Was light gray text, now dark slate text
  lightGray200: '#636366',   // Was muted gray, now slate gray
  darkGray500: '#FFFFFF',    // Was dark card bg, now white card bg
  darkGray600: '#F2F2F7',    // Was dark page bg, now light gray page bg
  panelBackground: '#FFFFFF', // modal background
  
  // Status Helpers
  success: '#10B981',        // Emerald Green
  danger: '#EF4444',         // Red
  warning: '#FF8C00',        // Orange / Naranja
  info: '#0A5CFF',           // Cobalt Blue
  
  // Opacities & Borders
  border: 'rgba(0, 0, 0, 0.08)',
  borderMuted: 'rgba(0, 0, 0, 0.04)',
  overlay: 'rgba(0, 0, 0, 0.5)',
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
