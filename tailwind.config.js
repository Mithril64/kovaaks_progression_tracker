/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0b0820",
        canvas: "#100b2c",
        surface: "#181238",
        panel: "#1c1644",
        elevated: "#241c54",
        line: "#312864",
        ink: "#f1edff",
        muted: "#a193c9",
        subtle: "#7a6ba6",
        accent: {
          DEFAULT: "#22d3ee",
          50: "#ecfeff",
          200: "#a5f3fc",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
        },
        magenta: {
          DEFAULT: "#f472b6",
          400: "#f472b6",
          500: "#ec4899",
        },
        lime: {
          DEFAULT: "#a3e635",
          400: "#a3e635",
          500: "#84cc16",
        },
        gold: {
          DEFAULT: "#fbbf24",
          400: "#fbbf24",
          500: "#f59e0b",
        },
        violet: {
          DEFAULT: "#a78bfa",
          400: "#a78bfa",
          500: "#8b5cf6",
        },
        warn: "#f08a5d",
        danger: "#ef4444",
      },
      boxShadow: {
        card: "0 6px 24px rgba(8, 4, 32, 0.55)",
        glow: "0 0 0 1px rgba(34, 211, 238, 0.25), 0 8px 28px rgba(34, 211, 238, 0.18)",
        "glow-pink": "0 0 0 1px rgba(244, 114, 182, 0.3), 0 8px 28px rgba(244, 114, 182, 0.2)",
        "glow-lime": "0 0 0 1px rgba(163, 230, 53, 0.3), 0 8px 28px rgba(163, 230, 53, 0.18)",
        "glow-gold": "0 0 0 1px rgba(251, 191, 36, 0.3), 0 8px 28px rgba(251, 191, 36, 0.18)",
        "glow-violet": "0 0 0 1px rgba(167, 139, 250, 0.3), 0 8px 28px rgba(167, 139, 250, 0.2)",
      },
      backgroundImage: {
        "app-radial":
          "radial-gradient(1200px 600px at 0% -10%, rgba(124, 58, 237, 0.18), transparent 60%), radial-gradient(900px 500px at 100% 0%, rgba(34, 211, 238, 0.12), transparent 55%), radial-gradient(800px 500px at 50% 110%, rgba(244, 114, 182, 0.10), transparent 60%)",
        "card-sheen":
          "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 50%)",
        "accent-stripe":
          "linear-gradient(90deg, #22d3ee 0%, #a78bfa 50%, #f472b6 100%)",
      },
      fontFamily: {
        display: [
          "Space Grotesk",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
