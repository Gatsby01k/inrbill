import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#04070D",
          900: "#070C16",
          850: "#0A101D",
          800: "#0E1626",
          700: "#152138",
          600: "#1D2D4E",
        },
        // Brand amber-gold, derived from the logo gradient (#F6B03D → #E8790F)
        gold: {
          200: "#FBE4B8",
          300: "#F8D28B",
          400: "#F4B95A",
          500: "#EFA12F",
          600: "#DD8114",
          700: "#B4650D",
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
        card: "inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.5), 0 8px 32px -12px rgba(0,0,0,0.5)",
        raised:
          "inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 6px rgba(0,0,0,0.45), 0 16px 48px -16px rgba(0,0,0,0.6)",
        glow: "0 0 90px -20px rgba(239,161,47,0.28)",
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
