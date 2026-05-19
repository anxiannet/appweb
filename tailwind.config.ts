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
        paper: "#f7f5ef",
        mist: "#ece8dd",
        leaf: "#42766c",
        coral: "#d7664d",
        gold: "#b9822f",
      },
      boxShadow: {
        lift: "0 12px 30px rgba(31, 35, 40, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
