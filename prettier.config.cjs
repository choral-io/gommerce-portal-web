/** @type {import('prettier').Options & import('prettier-plugin-tailwindcss').PluginOptions} */
module.exports = {
    plugins: ["prettier-plugin-tailwindcss"],
    printWidth: 120,
    quoteProps: "consistent",
    tailwindFunctions: ["clsx"],
};
