import { withAccountKitUi } from "@account-kit/react/tailwind";

/** @type {import('tailwindcss').Config} */
export default withAccountKitUi({
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./utils/**/*.{js,ts,jsx,tsx}"],
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("daisyui")],
  // Apple-style DaisyUI theme colors matching dashboard.html mock - Light theme only
  daisyui: {
    themes: [
      {
        light: {
          primary: "#1d1d1f",
          "primary-content": "#ffffff",
          secondary: "#6e6e73",
          "secondary-content": "#ffffff",
          accent: "#1d1d1f",
          "accent-content": "#ffffff",
          neutral: "#1d1d1f",
          "neutral-content": "#ffffff",
          "base-100": "#fafafa",
          "base-200": "#ffffff",
          "base-300": "#f5f5f7",
          "base-content": "#1d1d1f",
          info: "#1d1d1f",
          success: "#30d158",
          warning: "#ff9f0a",
          error: "#ff3b30",

          "--rounded-btn": "12px",
          "--rounded-box": "20px",
          "--rounded-badge": "12px",
          "--animation-btn": "0.3s",
          "--animation-input": "0.2s",
          "--btn-focus-scale": "0.98",
          "--border-btn": "1px",
          "--tab-border": "1px",
          "--tab-radius": "12px",

          ".tooltip": {
            "--tooltip-tail": "6px",
          },
          ".link": {
            textUnderlineOffset: "2px",
          },
          ".link:hover": {
            opacity: "80%",
          },
        },
      },
    ],
  },
  theme: {
    extend: {
      fontFamily: {
        'apple': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        'apple-mono': ['SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Consolas', 'Courier New', 'monospace'],
      },
      colors: {
        apple: {
          'bg-primary': '#fafafa',
          'bg-secondary': 'rgba(255, 255, 255, 0.9)',
          'bg-tertiary': 'rgba(0, 0, 0, 0.02)',
          'bg-hover': 'rgba(0, 0, 0, 0.04)',
          'text-primary': '#1d1d1f',
          'text-secondary': '#6e6e73',
          'success': '#30d158',
          'warning': '#ff9f0a',
          'error': '#ff3b30',
          'border': 'rgba(0, 0, 0, 0.04)',
          'border-hover': 'rgba(0, 0, 0, 0.08)',
        },
      },
      borderRadius: {
        'apple-sm': '8px',
        'apple-md': '12px',
        'apple-lg': '16px',
        'apple-xl': '20px',
        'apple-2xl': '24px',
      },
      boxShadow: {
        center: "0 0 12px -2px rgb(0 0 0 / 0.05)",
        'apple-sm': '0 1px 3px rgba(0, 0, 0, 0.05)',
        'apple-md': '0 4px 6px rgba(0, 0, 0, 0.05)',
        'apple-lg': '0 8px 25px rgba(0, 0, 0, 0.1)',
        'apple-xl': '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
      backdropBlur: {
        'apple': '20px',
        'apple-strong': '40px',
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.5s ease-out",
      },
      keyframes: {
        fadeIn: {
          'from': { 
            opacity: '0', 
            transform: 'translateY(20px)' 
          },
          'to': { 
            opacity: '1', 
            transform: 'translateY(0)' 
          },
        },
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      letterSpacing: {
        'apple': '-0.022em',
        'apple-tight': '-0.02em',
        'apple-normal': '-0.01em',
      },
    },
  },
});
