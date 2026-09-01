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
    // Four breakpoints, one spelling each (01 §4.2, §6.3). Custom
    // properties cannot be read inside a media query, so the literals are
    // the contract and this is what enforces it — the build previously
    // carried one breakpoint written as 48rem, 47.9375rem AND 767px, so a
    // 767.5px viewport got different rules from different components.
    "media-feature-name-value-allowed-list": {
      width: ["29.9375rem", "47.9375rem", "61.9375rem", "62rem"],
    },
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
      // The Tailwind stylesheets (ADR-015/018). Only the at-rule
      // vocabulary is exempted — every brand guardrail above still applies here, and
      // that matters: app.css is now the one file where a raw value or a
      // fifth breakpoint could be introduced. `color-no-hex` needs no
      // exemption because the theme holds var() references exclusively.
      files: ["src/styles/*.css"],
      rules: {
        // Tailwind requires `@import "tailwindcss"`; the bare-string form
        // is what the plugin resolves, so `url()` is not available.
        "import-notation": null,
        // `@utility` bodies nest with `&`, which stylelint cannot see as a
        // scoping root because it does not know the at-rule.
        "nesting-selector-no-missing-scoping-root": null,
        "at-rule-no-unknown": [
          true,
          {
            ignoreAtRules: [
              "theme",
              "source",
              "utility",
              "variant",
              "custom-variant",
              "apply",
              "reference",
              "plugin",
              "config",
            ],
          },
        ],
      },
    },
  ],
};
