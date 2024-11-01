import js from "@eslint/js";
import ts from "typescript-eslint";

import globals from "globals";

import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

// https://typescript-eslint.io/packages/typescript-eslint#config
export default ts.config(
    // Base
    {
        ignores: ["!**/.server", "!**/.client"],
        languageOptions: {
            globals: { ...globals.browser, ...globals.commonjs, ...globals.es2015 },
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                ecmaFeatures: { jsx: true },
                project: ["./tsconfig.json"],
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        extends: [js.configs.recommended],
    },
    // React
    {
        files: ["**/*.{js,jsx,ts,tsx}"],
        plugins: {
            "react": react,
            "react-hooks": reactHooks,
            "jsx-a11y": jsxA11y,
        },
        rules: {
            ...react.configs.recommended.rules,
            ...react.configs["jsx-runtime"].rules,
            ...reactHooks.configs.recommended.rules,
            ...jsxA11y.flatConfigs.recommended.rules,
            "react-hooks/exhaustive-deps": ["warn", { additionalHooks: "useEnhancedEffect" }],
        },
        settings: {
            "react": { version: "detect" },
            "formComponents": ["Form"],
            "linkComponents": [
                { name: "Link", linkAttribute: "to" },
                { name: "NavLink", linkAttribute: "to" },
            ],
            "import/resolver": { typescript: {} },
        },
    },
    // Typescript
    {
        files: ["**/*.{ts,tsx}"],
        extends: [
            ...ts.configs.strictTypeChecked,
            ...ts.configs.stylisticTypeChecked,
            importPlugin.flatConfigs.recommended,
        ],
        rules: {
            "@typescript-eslint/no-unused-vars": ["error", { caughtErrorsIgnorePattern: "^_" }],
            "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
        },
        settings: {
            "import/internal-regex": "^~/",
            "import/resolver": {
                node: {
                    extensions: [".ts", ".tsx"],
                },
                typescript: {
                    alwaysTryTypes: true,
                },
            },
        },
    },
    // Node
    {
        files: ["*.config.mjs", "*.config.ts"],
        languageOptions: {
            globals: globals.node,
        },
    },
    // Prettier
    { ...prettierRecommended },
);
