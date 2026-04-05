/** @type {import('tailwindcss').Config} */
export default {
  // Tell Tailwind where to look for class names
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Extend the default opacity scale to include fine-grained values
      // Tailwind's default only includes multiples of 5 (5, 10, 15…)
      // These are needed for bg-white/2, bg-white/3, bg-white/8, etc.
      opacity: {
        '2':  '0.02',
        '3':  '0.03',
        '4':  '0.04',
        '6':  '0.06',
        '7':  '0.07',
        '8':  '0.08',
        '12': '0.12',
      },
      // Custom color palette — purple/teal/dark
      colors: {
        brand: {
          50:  '#f0fdf9',
          100: '#ccfbef',
          200: '#99f6e0',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',  // primary teal
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        purple: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        dark: {
          900: '#020818',
          800: '#060d20',
          700: '#0a1628',
          600: '#0f1f38',
          500: '#162840',
        },
      },
      // Custom font family
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // Animation keyframes
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.4)', opacity: '0.6' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(20, 184, 166, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(20, 184, 166, 0.6)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'pulse-dot': 'pulse-dot 1.2s infinite',
        glow: 'glow 2s ease-in-out infinite',
      },
      // Custom backdrop blur
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
