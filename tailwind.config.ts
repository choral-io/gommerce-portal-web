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
        themes: ["winter", "night"],
        darkTheme: "night",
        logs: false,
    },
} satisfies Config & { daisyui?: DaisyUIConfig };
