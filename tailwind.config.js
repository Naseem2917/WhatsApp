/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // WhatsApp-inspired color palette
                primary: {
                    50: '#e8faf0',
                    100: '#d1f4e1',
                    200: '#a3e9c3',
                    300: '#75dea5',
                    400: '#47d387',
                    500: '#25D366', // WhatsApp green
                    600: '#1eba57',
                    700: '#169647',
                    800: '#0f7238',
                    900: '#074e28',
                },
                dark: {
                    50: '#f7f7f7',
                    100: '#e3e3e3',
                    200: '#c8c8c8',
                    300: '#a4a4a4',
                    400: '#818181',
                    500: '#666666',
                    600: '#515151',
                    700: '#434343',
                    800: '#383838',
                    900: '#111B21', // WhatsApp dark bg
                    950: '#0B141A', // Darker variant
                },
                accent: {
                    teal: '#00A884',
                    blue: '#53BDEB',
                    light: '#D9FDD3',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                'glow': '0 0 20px rgba(37, 211, 102, 0.3)',
                'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
            },
            backdropBlur: {
                'xs': '2px',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.4s ease-out',
                'slide-in-right': 'slideInRight 0.3s ease-out',
                'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
                'typing': 'typing 1.5s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideInRight: {
                    '0%': { opacity: '0', transform: 'translateX(20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                pulseSoft: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.5' },
                },
                typing: {
                    '0%, 100%': { opacity: '0.3' },
                    '50%': { opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}
