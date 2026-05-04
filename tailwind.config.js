/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1d2430",
        panel: "#f5f7f9",
        line: "#d9e0e7",
        accent: "#236d7b",
        lift: "#e9f2ef",
        warn: "#b35b2a"
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(29, 36, 48, 0.08)"
      }
    },
  },
  plugins: [],
};
