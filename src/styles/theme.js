// PujaYa! Brand Theme Design System
export const COLORS = {
  // Brand Primary & Secondary
  primary: '#0A5CFF',        
  secondary: '#FF8C00',      
  
  // Grayscale Palette (Light Theme)
  white: '#1C1C1E',          
  textWhite: '#FFFFFF',      
  lightGray100: '#2C2C2E',   
  lightGray200: '#636366',   
  darkGray500: '#FFFFFF',    
  darkGray600: '#F2F2F7',    
  panelBackground: '#FFFFFF', 
  
  // Status Helpers
  success: '#10B981',        
  danger: '#EF4444',         
  warning: '#FF8C00',        
  info: '#0A5CFF',           
  
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
