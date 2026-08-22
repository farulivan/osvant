# OSVANT — Data Layer & Mock Integration Specs

> **Eng doc 7 of 9.** Local data contracts + mocked integration behavior (portfolio re-scope, ADR-009–012). Every UI state from RFC B2/B3/C3/C7 still gets built — only vendors are gone. §6 documents the seams for making it real later.

## 1. Commerce — port + local adapter (ADR-009)

### 1.1 Catalog data (`src/data/products.json` — source of truth)

| Product | Variants (SKU) | Price |
|---|---|---|
| volt / nocturne / static / halo | `OSV-<SCENT>-50` €110, `OSV-<SCENT>-100` €160 | RFC B2 |
| fever | `OSV-FEVER-50` €135 only — limited batch 001, ×500, no restock | RFC B2 |

Shape per variant: `{ sku, scent, size, price, currency: "EUR", availableForSale, limited }`. Sold-out = `availableForSale: false` — one-line data commit (fever ships `limited: true` for the amber chip; flip its availability to demo RFC B3 states).

### 1.2 Port interface (`lib/commerce.ts`)

`getProducts()`, `getProduct(scent)`, `cartCreate()`, `cartAddLine(sku, qty)`, `cartRemoveLine(sku)`, `checkout(cart)` — async signatures shaped like a real backend client. v1 adapter resolves from local JSON + `localStorage`. A Shopify Storefront adapter is a drop-in replacement: same port, one file.

### 1.3 Mock checkout

`checkout()` → drawer advances to a confirmation step: order summary + microcopy `demo store — no real orders` + `btn-primary` `back to the current`. No redirect, no imitation payment form — honest demo.

## 2. Journal — content collections (ADR-010)

Astro content collection `journal`, zod schema: `title`, `slug`, `date`, `leadImage` (+ required `alt`), `body` (markdown; components: paragraph, h3, pull-quote [Instrument Serif italic per `03 §5`], image), `ogOverride` (optional), `scent` (optional — powers `next drop` deep-link + PDP cross-links, RFC B6).

- Authoring = markdown commit through normal PR flow; 3 articles at launch (titles in w4 copy batch, RFC C1).
- Rendered fully at build; zero content JS shipped.

## 3. Newsletter + notify-me (mock, ADR-012)

- Form markup/behavior per `01 §5.5` exactly — validation, error, success states all real (RFC C3/C7 copy).
- Submit = local mock: validate → ~600ms simulated latency → success `you're in the current.` + muted sub-line `demo — no list connected.` Failure state forceable via `?demo=fail` for QA + recordings.
- Sold-out `get notified` variant identical; fires `sold_out_notify_signup` on the no-op emitter (RFC B3).

## 4. Contact form (mock, ADR-012)

- Validation states per RFC C3 (eyebrow-size messages below field, amber): `required` / `check your email` / `didn't send — try again.` / success `sent. we'll be in touch.`
- Submit = local mock as §3, muted `demo` sub-line. Zero serverless functions exist in this project; real path documented in §6.

## 5. Instrumentation plan (local no-op emitter, ADR-012)

| Event | Params | Trigger |
|---|---|---|
| `add_to_cart` (std) | item_id, value, currency | PDP/cart CTA |
| `begin_checkout` (std) | value, items | checkout CTA click |
| `purchase` (std) | — | not emitted — no real checkout (ADR-009) |
| `newsletter_signup` | source: `footer|contact` | mock submit accepted |
| `sold_out_notify_signup` | scent | RFC B3 variant |
| `gallery_bottle_engaged` | scent | bottle resolved ≥2s in gallery (RFC B7) |
| `scent_discover_click` | scent | gallery → PDP |
| `next_drop_click` | — | hero chip |
| ~~`webgl_fallback`~~ | **Retired (ADR-013)** — no WebGL, no fallback tier | — |

- Implementation: `track(event, params)` in `core/track.ts` — console table (dev) + `window.dataLayer` push (always). Zero network. Wiring a real vendor later = one sink function.
- Event names keep RFC B7 review — instrumentation discipline is itself part of the portfolio story.

## 6. Real-integration seams (future, not v1)

| Concern | Seam | Effort later |
|---|---|---|
| Real commerce | Shopify adapter behind the `lib/commerce.ts` port | one file + tokens |
| Real CMS | Sanity adapter for the same content shape | schema already mirrors it (ADR-010) |
| Email capture | swap mock submit for Klaviyo API call | one function |
| Analytics | vendor sink in `track.ts` + consent banner (revive ADR-007 spec) | small |
| Error tracking | Sentry browser SDK, consent-reviewed | small |

Nothing in v1 UI changes when these flip — that is the point of the ports.
