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
        card: "0 1px 2px rgba(35,28,12,0.05), 0 12px 32px -20px rgba(35,28,12,0.16)",
        raised:
          "0 1px 3px rgba(35,28,12,0.07), 0 24px 64px -28px rgba(35,28,12,0.28)",
        glow: "0 0 90px -18px rgba(238,161,47,0.5)",
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
