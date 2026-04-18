/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Scene status colors
        'scene-draft': 'bg-blue-50 border-blue-200',
        'scene-confirmed': 'bg-amber-50 border-amber-200',
        'scene-generated': 'bg-emerald-50 border-emerald-200',
        'scene-discarded': 'bg-gray-100 border-gray-300 opacity-70',
        // Evaluation severity
        'eval-high': 'bg-red-50 text-red-700 border-red-200',
        'eval-medium': 'bg-orange-50 text-orange-700 border-orange-200',
        'eval-low': 'bg-blue-50 text-blue-700 border-blue-200',
        // Diff colors
        'diff-added': 'bg-green-100 text-green-800',
        'diff-removed': 'bg-red-100 text-red-800',
      },
      fontFamily: {
        serif: ['Noto Serif SC', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      spacing: {
        'sidebar': '260px',
        'scene-panel': '320px',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      width: {
        'sidebar': '260px',
        'scene-panel': '320px',
      },
      minWidth: {
        'scene-panel': '320px',
      },
    },
  },
  plugins: [],
};
