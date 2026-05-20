import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f2328",
        paper: "#fffaf2",
        cream: "#fff3dc",
        mist: "#efe8dc",
        leaf: "#4f9b86",
        mint: "#c9ecdc",
        coral: "#f87562",
        peach: "#ffd8c4",
        gold: "#d6a343",
        sky: "#b9ddff",
        lilac: "#d8ccff",
      },
      boxShadow: {
        lift: "0 16px 40px rgba(72, 56, 32, 0.1)",
        bubble: "0 8px 24px rgba(72, 56, 32, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
