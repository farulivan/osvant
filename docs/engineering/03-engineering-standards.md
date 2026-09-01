# OSVANT — Engineering Standards & Conventions

> **Eng doc 3 of 9.** How we write and review code on this project. The Definition of Done at §6 is the merge gate.

## 1. Language & tooling

- TypeScript strict mode everywhere, including animation modules. No `any` without an inline justification comment.
- ESLint + Prettier, config committed; CI fails on lint. No disabled rules without a comment.
- Node LTS pinned via `.nvmrc`; pnpm as package manager; exact versions in lockfile (ADR-006).

## 2. Naming & structure

- Files: kebab-case (`note-pyramid.ts`); PageModules named after their `data-module` value.
- CSS: design tokens verbatim from `01-design-system.md` in `src/styles/tokens.css` — the ONLY place raw color/size values may appear. Components use custom properties exclusively.
- Styling is utility-first through Tailwind v4 (ADR-015/016/018). `src/styles/app.css` is the single entry. **Default-first: reach for Tailwind's step before adding a custom one.** All six `01 §4.4` spacing steps ARE Tailwind defaults (`2/4/6/10/16/24`), so `gap-6` and `p-10` are the design system, not an approximation of it. A custom `@theme` entry has to be something Tailwind genuinely lacks — the three fluid `clamp()` type steps, the `1vw` media radius, the brand palette — not merely something spelled differently. A utility 1–2px off a token that any Tailwind developer reads instantly beats an exact custom step only this repo understands. Astro-scoped `<style>` blocks are **gone** — zero remain in `src/`, and a new component does not add one.
- Three stylesheets exist and each has a reason to. `app.css` is the entry (theme, variants, the four typographic roles, JS-contract classes). `light-study.css` holds the six `M §8` compositing layers, which are `calc()` over `--light-angle` and would be 150–250 character arbitrary values in markup. `dev-light.css` is imported by `/dev/light` alone, so harness CSS stays out of the site bundle.
- **A utility always beats a `@layer components` rule.** Anything JavaScript toggles must not have its property also set as a utility on the same element — that silently disabled `.nav--solid` and the whole `.nav--theme-*` system before measurement caught it.
- CSS that JavaScript drives is selected **semantically where it can be** (`:is(nav, footer) :is(a, button)`), not by BEM class. Nine of the ten class hooks in the old touch-target rule stopped existing during the migration, and a rule that silently matches nothing is worse than no rule — the same failure mode as the `.cart-line` bug.
- Two kinds of CSS still live in `app.css`. `@layer components` holds every class JavaScript creates or toggles — that one is mechanical, and it must be a layer rule rather than a `@utility`, because layer rules are always emitted while `@utility` definitions are usage-driven and would be tree-shaken.
- `@utility` holds **named concepts the docs already name** that markup cannot express readably: the four typographic roles of `01 §3.3` (`.display`, `.eyebrow`, `.whisper`, `.peak`), and `.scent-wash`, the ADR-008 lead-image placeholder. The bar is all three of named in a doc, reused, and unreasonable as an arbitrary value — a 160-character `bg-[radial-gradient(...)]` is legal, unreadable and unreviewable. A one-off that fails any of the three stays in markup as an arbitrary value, where the `[…]` brackets make it visible in review.
- The brand guardrails do **not** depend on a small vocabulary. `shadow-md` and `text-gray-500` exist and are harmless; *using* one fails `pnpm check:guardrails` against the built output with the spec section it violates (ADR-017). That is what makes default-first affordable — the check is on what ships, not on what is spellable.
- Class naming: BEM-lite (`.scent-card__note`) applies to those JS-contract classes in `@layer components`; state via `is-*` classes toggled by JS (`nav--solid` pattern from `01 §5.2` is grandfathered). Markup itself carries utilities.
- One PageModule per file in `src/scripts/modules/`; singletons in `src/scripts/core/`.

## 3. Motion-hook conventions (markup is the API)

These attributes are the contract between markup and the animation layer — design docs already reference them; do not invent variants:

| Attribute | Owner | Meaning |
|---|---|---|
| `data-module="<name>"` | section root | binds a PageModule |
| `data-anim="card|parallax|btn-line"` | element | joins a shared behavior group (`01 §5`, `M §4.5`) |
| `data-nav-theme="dark|light|scent"` | every section, mandatory | nav re-theming (`M §4.9`) — a section without it fails review (`03 §sitemap`) |
| `data-scent="volt|nocturne|static|fever|halo"` | PDP root, cards | scent-tint scope (`01 §2.3`) |
| `data-rive="<artboard>"` | element | Rive mount point (`M §7`) |
| `data-btn-label` | span inside buttons | label y-flip target (`01 §5.1`) |

## 4. Animation code rules

1. Every ScrollTrigger/SplitText/tween created by a module is stored and killed in that module's `destroy()` — the router sweep is a safety net, not the mechanism (`01-architecture.md §3.2`).
2. `gsap.defaults({ ease: "power2.out", duration: 0.5 })` set once in core (`M §2`). Recipes from `M §4` are canonical over the register table (RFC A4).
3. Scrubbed tweens: `ease: "none"`, always (`M §2`). Pins: max 3 per page — reviewer counts them.
4. No `window.addEventListener("scroll")` anywhere — Lenis events + ScrollTrigger only. No standalone `requestAnimationFrame` — use `gsap.ticker`.
5. Reduced-motion branches are written WITH the feature, not retrofitted: every module implements the `M §9` degradation or documents why it's exempt.
6. No `box-shadow`, no `text-transform: uppercase`, no pure `#fff`/`#000` — enforced against the **built output** by `pnpm check:guardrails` in CI, not just review (`03 §9`, ADR-017). The stylelint rules stay as the fast local loop, but they only ever saw authored CSS in files they were pointed at: that is how neutral grey and pure black reached a page through runtime-injected markup on 2026-08-28, and it is why generated utilities need a check that reads `dist/`.

## 5. Git & review

- Trunk-based: short-lived branches `feat/<module>`, `fix/<scope>` → PR → squash-merge to `main`. `main` is always deployable.
- Conventional commits (`feat:`, `fix:`, `perf:`, `docs:`) — drives changelog. Body explains *why*, not what. AI-paired commits carry a `Co-authored-by:` trailer — portfolio transparency.
- PRs: one module/section per PR where possible; description links the design-doc section it implements; screenshots or screen-recording mandatory for anything visual, **mobile screenshots mandatory** (RFC C5).
- Review SLA: 24h; motion-heavy PRs need one side-by-side recording vs. the reference beat it implements (`M §11`).

## 6. Definition of Done (merge gate)

A PR is done when:

1. All applicable acceptance boxes from `03-page-specs.md` for the touched section are checked in the PR description.
2. Global acceptance (`03 §9`) items hold: masked headline reveals, nav-theme attribute present, no static sections, CTA resolution.
3. Reduced-motion + keyboard pass done locally (checklist in `04-testing-qa-plan.md §5`).
4. CI green: lint, types, unit, E2E smoke, Lighthouse budgets, size-limit.
5. Preview deploy link posted; motion PRs include the parity recording.

## 7. Dependencies & security

- New runtime dependencies require an ADR entry (even one line) — the JS budget is finite.
- No third-party scripts, period (ADR-012) — reintroducing one requires a superseding ADR.
- CI auth to AWS via GitHub OIDC role (ADR-011) — no long-lived keys in secrets. `.env.example` committed, never `.env`. Fully static build ⇒ zero runtime secrets client-side by construction.
