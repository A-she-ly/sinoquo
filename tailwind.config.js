/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
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
        primary: {
          DEFAULT: "#1976D2", // Material Blue 700
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#4CAF50", // Green 500
          foreground: "#FFFFFF",
        },
        background: "#F5F5F5",
        surface: "#FFFFFF",
        muted: "#9E9E9E",
      },
    },
  },
  plugins: [],
};
