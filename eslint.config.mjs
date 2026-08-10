import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    // One-off real-face descriptor generator: heavy face-api deps are NOT in
    // package.json (installed --no-save for the one run), so it's kept out of
    // lint/typecheck. See docs/recognition.md.
    "scripts/gen-seed-descriptors.cjs",
  ]),
]);

export default eslintConfig;
