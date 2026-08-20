/** @type {import('stylelint').Config} */
export default {
  extends: ["stylelint-config-standard"],
  rules: {
    // Brand guardrails (01 §1, brief §4; enforced per 03-eng §4.6):
    // no box-shadow, no uppercase, no pure white/black or neutral grays.
    "property-disallowed-list": ["box-shadow"],
    "declaration-property-value-disallowed-list": [
      {
        "text-transform": ["uppercase"],
        "/.*/": [
          // any hex with r == g == b (catches #fff/#000/#888/#cccccc…)
          "/#([0-9a-fA-F])\\1\\1([0-9a-fA-F])?\\b/",
          "/#([0-9a-fA-F]{2})\\1\\1([0-9a-fA-F]{2})?\\b/",
        ],
      },
      {
        message:
          "No #fff/#000/neutral grays, no box-shadow, no uppercase (01 §1, 03-eng §4.6).",
      },
    ],
    "color-named": "never",
    // Raw color values live ONLY in tokens.css (03-eng §2) — see overrides.
    "color-no-hex": true,
    // Token names are LAW-defined (e.g. --color--ink-1) — don't lint their shape.
    "custom-property-pattern": null,
    // BEM-lite classes (03-eng §2): block__element--modifier, is-* state.
    "selector-class-pattern": [
      "^([a-z][a-z0-9]*)(-[a-z0-9]+)*(__([a-z0-9]+)(-[a-z0-9]+)*)?(--([a-z0-9]+)(-[a-z0-9]+)*)?$",
      { message: "Class names use BEM-lite kebab-case (03-eng §2)." },
    ],
  },
  overrides: [
    {
      files: ["src/styles/tokens.css"],
      rules: {
        "color-no-hex": null,
      },
    },
    {
      files: ["**/*.astro"],
      customSyntax: "postcss-html",
      rules: {
        // Astro's scoped-style escape hatch (markdown body styling)
        "selector-pseudo-class-no-unknown": [
          true,
          { ignorePseudoClasses: ["global"] },
        ],
      },
    },
  ],
};
