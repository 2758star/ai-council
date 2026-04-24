import type { Config } from "tailwindcss";

export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
    },
    extend: {
      fontFamily: {
        sans: ["'Manrope'", "'Segoe UI'", "sans-serif"],
        display: ["'Sora'", "'Manrope'", "sans-serif"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
      },
      boxShadow: {
        soft: "0 18px 45px -28px rgba(15, 23, 42, 0.45)",
        card: "0 12px 24px -16px rgba(15, 23, 42, 0.25)",
      },
      borderRadius: {
        xl: "1.125rem",
        "2xl": "1.5rem",
      },
      backgroundImage: {
        "memphis-grid":
          "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
} satisfies Config;
