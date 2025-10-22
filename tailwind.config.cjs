const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#f5f7fb',
        surface: '#ffffff',
        panel: '#eef1f8',
        border: '#d7dce5',
        highlight: '#f0f4ff',
        primary: '#0a84ff',
        primaryMuted: '#e0edff',
        accent: '#5856d6',
        success: '#34c759',
        warning: '#ffcc00',
        danger: '#ff3b30',
        txt: '#0b1a33',
        muted: '#6c7793'
      },
      fontFamily: {
        sans: ['"SF Pro Text"', '"SF Pro Display"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', ...defaultTheme.fontFamily.sans],
        display: ['"SF Pro Display"', '"SF Pro Text"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', ...defaultTheme.fontFamily.sans]
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.08)',
        card: '0 12px 40px rgba(10, 132, 255, 0.08)'
      },
      borderRadius: {
        xl: '1.5rem'
      }
    }
  },
  plugins: []
}
