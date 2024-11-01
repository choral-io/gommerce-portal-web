/** @type { import("tailwindcss").Config & { daisyui?: import("daisyui").Config } } */
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
};
