import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        green: {
          accent: "#2dca72",
          muted: "#2dca724d",
        },
        yellow: {
          accent: "#bdff31",
        },
        navy: "#282833",
        border: "#d6d6d6",
        "border-light": "#eee",
        "gray-mid": "#676767",
        "gray-light": "#f5f5f5",
        "gray-text": "#777",
      },
      fontFamily: {
        figtree: ["Figtree", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      fontSize: {
        "2xs": "9px",
        xs: "12px",
        sm: "14px",
        base: "15px",
        md: "16px",
        lg: "19px",
        xl: "22px",
        "2xl": "24px",
        "3xl": "28px",
        "4xl": "32px",
        "5xl": "36px",
        "6xl": "40px",
      },
      screens: {
        xs: "480px",
        sm: "640px",
        md: "800px",
        lg: "1200px",
        xl: "1440px",
      },
    },
  },
  plugins: [],
};

export default config;
