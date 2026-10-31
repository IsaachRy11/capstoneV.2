/** @type {import('tailwindcss').Config} */
// Colors point at CSS variables defined in src/index.css, so one class works in both themes.
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ['"Plus Jakarta Sans"', "Inter", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        ground: "var(--ground)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        line: "var(--line)",
        "line-2": "var(--line-2)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        accent: "var(--accent)",
        tint: "var(--tint)",
        "tint-ink": "var(--tint-ink)",
        hover: "var(--hover)",
        bad: "var(--bad)",
        ok: "var(--ok)",
        warn: "var(--warn)",
      },
    },
  },
  plugins: [],
};
