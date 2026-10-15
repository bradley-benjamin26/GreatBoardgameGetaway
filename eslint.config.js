import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules/", "dist/", "coverage/", "playwright-report/", "test-results/"] },
  ...tseslint.configs.recommended,
);
