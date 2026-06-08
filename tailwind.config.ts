import type { Config } from "tailwindcss";

// The Wadau Cup visual system is driven by CSS custom properties defined in
// globals.css (.wc-dark / .wc-light token blocks). Tailwind is wired to those
// vars so utilities and the ported design tokens stay in sync.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        line: "var(--line)",
        "line-2": "var(--line-2)",
        text: "var(--text)",
        dim: "var(--dim)",
        faint: "var(--faint)",
        lime: "var(--lime)",
        "lime-ink": "var(--lime-ink)",
        gold: "var(--gold)",
        violet: "var(--violet)",
        up: "var(--up)",
        down: "var(--down)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
