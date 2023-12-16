import type { Config } from "tailwindcss";
import type { Config as DaisyUIConfig } from "daisyui";

export default {
    darkMode: "media",
    content: ["./app/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {},
    },
    plugins: [require("@tailwindcss/typography"), require("daisyui")],
    daisyui: {
        themes: ["winter", "sunset"],
        darkTheme: "sunset",
        logs: false,
    },
} satisfies Config & { daisyui?: DaisyUIConfig };
