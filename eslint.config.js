// @ts-check
import { defineConfig } from "eslint/config";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default defineConfig(
  { ignores: ["dist/", ".astro/"] },
  {
    // Build scripts + tool configs run on Node, not in the browser.
    files: ["scripts/**/*.mjs", "*.config.{js,ts,mjs}"],
    languageOptions: { globals: globals.node },
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  eslintPluginAstro.configs["flat/recommended"],
  eslintPluginAstro.configs["flat/jsx-a11y-recommended"],
  {
    rules: {
      // One scroll, one loop (03-eng §4.4): all RAF goes through gsap.ticker,
      // all scroll handling through Lenis/ScrollTrigger.
      "no-restricted-globals": [
        "error",
        {
          name: "requestAnimationFrame",
          message: "Use gsap.ticker — one RAF loop (03-eng §4.4).",
        },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "window",
          property: "requestAnimationFrame",
          message: "Use gsap.ticker — one RAF loop (03-eng §4.4).",
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            'CallExpression[callee.property.name="addEventListener"][arguments.0.value="scroll"]',
          message:
            "No native scroll listeners — Lenis events + ScrollTrigger only (03-eng §4.4).",
        },
      ],
    },
  },
  eslintConfigPrettier,
);
