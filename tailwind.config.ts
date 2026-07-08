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
        revealScale: {
          from: { opacity: "0", transform: "translateY(18px) scale(0.96)" },
          to: { opacity: "1", transform: "none" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.85)" },
          "60%": { opacity: "1", transform: "scale(1.04)" },
          "100%": { transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          from: { backgroundPosition: "-480px 0" },
          to: { backgroundPosition: "480px 0" },
        },
        shine: {
          from: { transform: "translateX(-130%) skewX(-20deg)" },
          to: { transform: "translateX(130%) skewX(-20deg)" },
        },
        spin3: {
          to: { transform: "rotate(360deg)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        marchAnts: {
          to: { strokeDashoffset: "-40" },
        },
        countPulse: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.18)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        reveal: "reveal 0.7s cubic-bezier(0.2, 0.7, 0.3, 1) both",
        "reveal-scale": "revealScale 0.65s cubic-bezier(0.16, 1, 0.3, 1) both",
        "pop-in": "popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
        shine: "shine 1.1s cubic-bezier(0.4, 0, 0.2, 1)",
        "spin-slow": "spin3 12s linear infinite",
        "gradient-shift": "gradientShift 6s ease infinite",
        "march-ants": "marchAnts 1.2s linear infinite",
        "count-pulse": "countPulse 0.4s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
