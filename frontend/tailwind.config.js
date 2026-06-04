/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#050505",
          900: "#0b0f0e",
          850: "#101614",
          800: "#171f1c",
        },
        aura: {
          mint: "#7ee7d1",
          green: "#35c7a6",
          amber: "#f0b95b",
          rose: "#ed7a86",
          violet: "#9e8cff",
        },
      },
      boxShadow: {
        glass: "0 24px 80px rgba(0, 0, 0, 0.42)",
        glow: "0 0 34px rgba(126, 231, 209, 0.28)",
        soft: "0 18px 48px rgba(0, 0, 0, 0.26)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
