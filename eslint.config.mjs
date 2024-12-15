import globals from "globals";
import pluginJs from "@eslint/js";
import reactPlugin from 'eslint-plugin-react';
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["build/*"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    rules: {
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
    },
  },
  {
    // This is not a plugin object, but a shareable config object
    ...reactPlugin.configs.flat.recommended,
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  reactPlugin.configs.flat['jsx-runtime'],
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  pluginJs.configs.recommended,
  // ...tseslint.configs.recommended,
  ...(tseslint.configs.recommended.map((tsEslintConfig) => ({
    ...tsEslintConfig,
    ignores: [
      "config/**/*",
      "scripts/*",
    ],
  }))),
];
