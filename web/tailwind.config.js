/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#1D4ED8', // Primary blue from BRD
          navy: '#172554',    // Deep navy from BRD
          light: '#EFF6FF',   // Light blue from BRD
          surface: '#FFFFFF',
          text: '#334155',    // Text slate from BRD
          muted: '#64748B',   // Muted slate from BRD
          border: '#E2E8F0',  // Border from BRD
        },
        status: {
          present: '#16A34A', // Green
          incomplete: '#D97706', // Amber
          noPunch: '#DC2626', // Red
        }
      },
      fontSize: {
        'dense-xs': ['11px', '14px'],
        'dense-sm': ['12px', '16px'],
        'dense-base': ['13px', '18px'], // 13-14px dense table text from BRD
        'dense-lg': ['14px', '20px'],
        'dense-title': ['20px', '26px'], // 18-22px page heading from BRD
      }
    },
  },
  plugins: [],
}

