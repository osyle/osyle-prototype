import js from "@eslint/js"
import globals from "globals"
import tseslint from "typescript-eslint"
import pluginReact from "eslint-plugin-react"
import pluginReactHooks from "eslint-plugin-react-hooks"
import pluginImport from "eslint-plugin-import"
import prettier from "eslint-config-prettier"
import { defineConfig } from "eslint/config"

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: { js, "react": pluginReact, "react-hooks": pluginReactHooks, import: pluginImport },
    rules: {
      // JS/TS Quality
      "no-unused-vars": "error",
      "no-undef": "error",
      "no-console": "warn",

      // React rules
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Import sorting
      "import/order": [
        "error",
        {
          "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
          "alphabetize": { order: "asc", caseInsensitive: true },
        },
      ],
    },
    extends: ["js/recommended", tseslint.configs.recommended, pluginReact.configs.flat.recommended, prettier],
  },
])
