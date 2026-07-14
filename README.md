# OSVANT

> *provocation, bottled.* — a fictional luxury fragrance house, built as a portfolio showcase of animation-first front-end engineering.

A fully static Astro site reproducing the interaction grammar of [landonorris.com](https://landonorris.com) (13 named "parity beats"): GSAP + Lenis smooth scroll, taxi.js page transitions with a Rive wipe, scroll-scrubbed WebGL bottle gallery, kinetic typography. No backend by design — commerce, journal, forms and analytics are local/mocked behind ports (ADR-009–012). Hosted on S3 + CloudFront, deployed by GitHub Actions.

## Status

**Docs-complete, pre-implementation.** Build starts at `docs/engineering/00-implementation-guide.md` §5 (milestone M1).

## Documentation map

| Area | Docs |
|---|---|
| Design (canonical spec) | `docs/design/00-design-brief.md` · `01-design-system.md` · `02-motion-guidelines.md` · `03-page-specs.md` |
| Reference research | `docs/design/landonorris-design-research.md` |
| Engineering | `docs/engineering/00-implementation-guide.md` (start here) · `01-architecture` · `02-adrs` · `03-engineering-standards` · `04-testing-qa-plan` · `05-cicd-environments` · `06-asset-pipeline` · `07-integrations` · `08-delivery-plan` · `09-risk-register` |
| Process | `docs/engineering/rfc-001-design-product-questions.md` (closed, 18/18) · `docs/engineering/worklog.md` (during build) |

## The AI-paired process

This repo is deliberately built as a human + AI engineering team:

- **Human** — product owner: scope calls, art-direction decisions, review gate.
- **AI head of engineering** — reference research → design docs → RFC-001 (18 resolved product/design questions) → engineering docs → implementation hand-off.
- **AI senior engineer** — implementation against the docs, PR by PR, with a running worklog.

The process artifacts stay in-repo on purpose — the docs, the RFC's question-driven spec hardening, the ADR trail (including a mid-flight re-scope, ADR-009–012), and the commit history *are* part of the portfolio. Agent ground rules live in [`AGENTS.md`](AGENTS.md).

## Disclaimer

Fictional brand, non-commercial portfolio work. The reference site is used as an interaction-grammar study only; no assets, copy or code are taken from it.
