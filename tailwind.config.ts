import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        divine: {
          white: "#FFFFFF",
          ice: "#F2F8FD",
          blue: "#1676C8",
          teal: "#13A89E",
          ink: "#17324F",
          muted: "#586B7E",
          pale: "#E3F7F4",
          soft: "#DDECF9",
          border: "#DCE6EF"
        }
      },
      boxShadow: {
        soft: "0 18px 48px rgba(23, 50, 79, 0.08)"
      },
      borderRadius: {
        "4xl": "2rem"
      }
    }
  },
  plugins: []
};

export default config;
