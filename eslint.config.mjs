import js from "@eslint/js";
import tseslint from "typescript-eslint";
import neostandard from "neostandard";

export default [
  {
    ignores: ["node_modules/", "dist/"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...neostandard({ ts: true }),
  {
    files: ["src/**/*.ts"],
    rules: {
      quotes: ["error", "double"],
      semi: ["error", "always"],
      "arrow-parens": ["error", "always"],
      complexity: ["error", 15],
      "guard-for-in": "error",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@stylistic/semi": "off",
      "@stylistic/quotes": "off",
      "@stylistic/comma-dangle": "off",
    },
  },
];
