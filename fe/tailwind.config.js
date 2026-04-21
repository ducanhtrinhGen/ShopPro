/** @type {import('tailwindcss').Config} */
export default {
  // Preflight disabled so Tailwind does not reset the existing global.css
  // rules (BEM classes like `.panel`, `.c-home`, etc. stay intact).
  corePlugins: {
    preflight: false
  },
  content: [
    "./index.html",
    "./src/components/hero/**/*.{ts,tsx}",
    "./src/hooks/**/*.{ts,tsx}",
    "./src/pages/HomePage.tsx"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Orbitron'", "'Rajdhani'", "system-ui", "sans-serif"]
      },
      colors: {
        abyss: "#05060a",
        neon: {
          cyan: "#22e5ff",
          magenta: "#ff2bd6",
          lime: "#baff29"
        }
      },
      boxShadow: {
        "neon-cyan": "0 0 24px rgba(34,229,255,0.55), 0 0 64px rgba(34,229,255,0.25)",
        "neon-magenta": "0 0 24px rgba(255,43,214,0.55), 0 0 64px rgba(255,43,214,0.25)"
      }
    }
  },
  plugins: []
};
