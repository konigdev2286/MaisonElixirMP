import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-subtle": "var(--bg-subtle)",
        fg: "var(--fg)",
        "fg-muted": "var(--fg-muted)",
        border: "var(--border)",
        "border-focus": "var(--border-focus)",
        card: "var(--card)",
        "card-subtle": "var(--card-subtle)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-fg": "var(--accent-fg)",
        danger: "var(--danger)",
        "danger-bg": "var(--danger-bg)",
        "danger-border": "var(--danger-border)",
        warning: "var(--warning)",
        "warning-bg": "var(--warning-bg)",
        "warning-border": "var(--warning-border)",
        success: "var(--success)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        chic: "0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)",
        "chic-hover": "0 10px 25px -3px rgba(0, 0, 0, 0.08), 0 4px 10px -2px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
