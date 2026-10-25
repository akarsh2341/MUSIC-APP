/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // All colors are driven by CSS variables (see src/index.css) so the theme is easy to customize.
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        brand: 'rgb(var(--brand) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        eq: {
          '0%, 100%': { transform: 'scaleY(0.25)' },
          '50%': { transform: 'scaleY(1)' },
        },
        spinSlow: { to: { transform: 'rotate(360deg)' } },
        toastIn: {
          from: { opacity: '0', transform: 'translateY(12px) scale(.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        slideLeft: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        eq: 'eq 1s ease-in-out infinite',
        spinSlow: 'spinSlow 24s linear infinite',
        toastIn: 'toastIn .25s ease-out',
        fadeIn: 'fadeIn .25s ease-out',
        slideUp: 'slideUp .3s cubic-bezier(.2,.8,.2,1)',
        slideLeft: 'slideLeft .3s cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
};
