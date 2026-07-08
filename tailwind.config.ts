import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep chakra navy — used only in the "ink" bands (footer, no-custody section)
        night: {
          950: "#050A1F",
          900: "#0A1440",
          850: "#0E1B52",
          800: "#142868",
          700: "#1E3A8A",
          600: "#2B4FA8",
        },
        // Brand saffron — vivid Indian-flag "kesari" orange
        gold: {
          200: "#FFDBB0",
          300: "#FFC17A",
          400: "#FFA94D",
          500: "#FF9933",
          600: "#EB7A0F",
          700: "#C15F0A",
        },
        // India flag green — verification / partner-side accent
        leaf: {
          50: "#E7F6EA",
          100: "#C6ECCE",
          200: "#93D9A2",
          300: "#5CC072",
          400: "#2FA34D",
          500: "#178A38",
          600: "#0F6E2C",
          700: "#0B5A24",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "var(--font-display)",
          "Iowan Old Style",
          "Palatino Linotype",
          "Georgia",
          "serif",
        ],
        mono: [
          "SF Mono",
          "ui-monospace",
          "JetBrains Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(35,28,12,0.05), 0 12px 32px -20px rgba(35,28,12,0.16)",
        raised:
          "0 1px 3px rgba(35,28,12,0.07), 0 24px 64px -28px rgba(35,28,12,0.28)",
        glow: "0 0 90px -18px rgba(255,153,51,0.5)",
      },
      keyframes: {
        reveal: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        reveal: "reveal 0.7s cubic-bezier(0.2, 0.7, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
