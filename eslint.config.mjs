// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    rules: {
      "@typescript-eslint/naming-convention": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "curly": "warn",
      "eqeqeq": "warn",
      "no-throw-literal": "warn",
      "prefer-rest-params": "off",
    },
  },
  {
    ignores: ["out/**", "dist/**", "**/*.d.ts"],
  }
);
