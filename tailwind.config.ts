import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        shimmer: {
          from: {
            backgroundPosition: "0 0",
          },
          to: {
            backgroundPosition: "-200% 0",
          },
        },
      },
      fontFamily: {
        muller: ["Muller-ExtraBold", "sans-serif"], // Adding the Muller font family
        averta: ["AvertaDemoPECuttedDemo-Regular", "sans-serif"], // Adding the Averta Demo font family
        dexa: ["var(--font-dexa)", "sans-serif"], // Adding the DexaPro font family
        ogg: ["var(--font-ogg)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
