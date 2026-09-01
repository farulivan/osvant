# Font masters

Licensed **Mosvita** `.otf` originals. Everything in this directory except this
README is gitignored — the originals never enter the repo, and only the subset
`woff2` files in `src/assets/fonts/` are committed and shipped.

## What is here

| File                          | Weight | Stretch | Role                                     |
| ----------------------------- | ------ | ------- | ---------------------------------------- |
| `Mosvita-Regular-*.otf`       | 400    | 100%    | body, lead, long-form, form fields       |
| `Mosvita-SemiBold-*.otf`      | 600    | 100%    | eyebrows, buttons, nav, UI labels        |
| `Mosvita-BlackExpanded-*.otf` | 900    | 125%    | every heading — h1…h5, impact, wordmark  |
| `Mosvita-Black-*.otf`         | 900    | 100%    | held in reserve, not shipped (see below) |

Mosvita has **no Medium (500)** — the family runs 300 / 400 / 600 / 700 / 800 / 900.
That is why `01 §3.3` sets eyebrows at 600 rather than the 500 it specified when the
site ran on Archivo.

`Mosvita-Black` (100% width) is the documented escape hatch: if Black Expanded reads
too loud at `--text--h5` (1.2rem), h3–h5 move to it while h1/h2/impact keep Expanded.
Adding it costs 11.6KB and stays inside the 50KB payload cap. It is deliberately kept
on disk and deliberately not wired.

## Regenerating

```bash
pnpm fonts:inspect   # family, weight class, width class, glyph coverage per master
pnpm fonts           # subset → src/assets/fonts/*.woff2, enforces the payload cap
```

A fresh clone builds the site fine without these files — the subset `woff2` outputs are
committed. You only need the masters to re-run `pnpm fonts`, e.g. after widening
`retainedCharacters()` in `scripts/font-charset.mjs`.
