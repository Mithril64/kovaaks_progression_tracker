/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0b1118",
        surface: "#151f2b",
        panel: "#101821",
        line: "#2b3847",
        ink: "#e7eef7",
        muted: "#9aa8b6",
        subtle: "#6f8091",
        accent: "#4cc7d9",
        lift: "#1b3140",
        warn: "#f08a5d"
      },
      boxShadow: {
        subtle: "0 10px 30px rgba(0, 0, 0, 0.22)"
      }
    },
  },
  plugins: [],
};
