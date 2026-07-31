const { fontFamily } = require("tailwindcss/defaultTheme");

/**
 * Shared Caishen Tailwind preset. Apps extend this via `presets: [...]`
 * and supply their own `content` globs.
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  darkMode: ["class"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // ---- Caishen brand tokens (never purple) ----
        cream: "#FFFBF7",
        ink: "#1C1917",
        navy: "#0B3D91",
        jade: "#0E7C66",
        gold: "#C79A3A",
        surface: "#FFFFFF",
        sand: "#F3EFE7",
        subtle: "#78716C",
        primary: "#0B3D91",
        base: {
          100: "#FFFFFF",
          200: "#F3F4F6",
          300: "#E5E7EB",
        },
        content: {
          primary: "#111827",
          secondary: "#6B7280",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "1rem",
        pill: "9999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(28, 25, 23, 0.06)",
        "card-lg": "0 12px 32px -8px rgba(28, 25, 23, 0.14)",
        "card-xl": "0 24px 60px -12px rgba(11, 61, 145, 0.20)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
        display: ["var(--font-display)", ...fontFamily.sans],
        mono: ["var(--font-mono)", ...fontFamily.mono],
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
