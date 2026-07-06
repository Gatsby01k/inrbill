import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#04060C",
          900: "#070C16",
          850: "#0A1120",
          800: "#0E172A",
          700: "#152138",
          600: "#1D2D4E",
        },
        gold: {
          200: "#F3E7C3",
          300: "#E9D7A2",
          400: "#DEC278",
          500: "#CFA84F",
          600: "#B08A38",
          700: "#8A6B2A",
        },
      },
      fontFamily: {
        sans: [
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
          "Iowan Old Style",
          "Palatino Linotype",
          "Palatino",
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
        glow: "0 0 80px rgba(207, 168, 79, 0.14)",
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 40px rgba(0,0,0,0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
