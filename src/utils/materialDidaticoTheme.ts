/**
 * Material Didático Design System - Purple Theme
 * Cor principal: Roxo (Purple) para identidade visual consistente
 */

export const MATERIAL_THEME = {
  colors: {
    primary: {
      50: 'hsl(270 100% 98%)',
      100: 'hsl(270 100% 95%)',
      200: 'hsl(270 97% 88%)',
      300: 'hsl(270 95% 78%)',
      400: 'hsl(270 91% 65%)',
      500: 'hsl(270 75% 60%)',
      600: 'hsl(270 70% 50%)', // COR PRINCIPAL
      700: 'hsl(270 65% 40%)',
      800: 'hsl(270 60% 30%)',
      900: 'hsl(270 55% 20%)',
    },
  },
  
  components: {
    card: 'bg-white border-purple-200 shadow-purple-100',
    cardHeader: 'bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200',
    button: 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white',
    badge: 'bg-purple-100 text-purple-800 border border-purple-300',
    heading: 'text-purple-900 font-bold',
    icon: 'text-purple-600',
    iconSecondary: 'text-purple-400',
    highlight: 'bg-purple-50 border-l-4 border-purple-600',
    postit: 'bg-gradient-to-br from-purple-100 to-purple-200 border border-purple-300',
  },
  
  gradients: {
    main: 'bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800',
    soft: 'bg-gradient-to-br from-purple-50 to-purple-100',
    header: 'bg-gradient-to-r from-purple-600 to-purple-700',
  },
  
  shadows: {
    card: 'shadow-lg shadow-purple-100/50',
    button: 'shadow-md shadow-purple-500/30 hover:shadow-lg hover:shadow-purple-500/50',
  },
};

export const STATUS_COLORS = {
  processing: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  ready: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  published: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  failed: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
};
