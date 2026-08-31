// core/nav.ts — nav theming observer (01-arch §3.1, M §4.9) + solid-bar
// toggle (01-design-system §5.2). Registered as the first PageModule
// (01-arch §3.3: "mount order: nav themes first") so it always re-observes
// the incoming page's sections before any other module mounts.
//
// Cart chip STATE (count) is wired when `lib/commerce.ts` lands (task 1.8);
// this module only themes the nav bar.

import { ScrollTrigger } from "gsap/ScrollTrigger";
import { registry, type PageModule } from "./registry";

const THEMES = ["dark", "light", "scent"] as const;

/** Where the nav's own baseline sits — matches `--nav-height` in tokens.css. */
const NAV_OFFSET = "4rem";

function applyTheme(nav: HTMLElement, theme: string): void {
  for (const t of THEMES) {
    nav.classList.toggle(`nav--theme-${t}`, t === theme);
  }
}

/**
 * The nav renders OUTSIDE the themed section — it is a sibling of the
 * `[data-scent]` scope, not a descendant — so `var(--scent-tint)` inside
 * it has always resolved to the `:root` fallback, i.e. the house accent
 * rather than the scent. `01 §2.4` asks for the opposite: the links stay
 * white and "the scent shows in the wordmark and an underline marker".
 *
 * Mirroring the scope's `data-scent` onto the nav makes the existing
 * `[data-scent="…"]` rules in tokens.css apply to the nav subtree too, so
 * the tint arrives through the token system rather than by copying a
 * computed colour around.
 *
 * `closest()` covers both shapes in the build: the PDP wraps its themed
 * section in `[data-scent]`, while the gallery puts both attributes on the
 * same element. The gallery also REWRITES that attribute as it scrubs
 * (`gallery.ts` → `showScent`), so an attribute observer keeps the nav in
 * step with the active bottle instead of freezing on the first one.
 */
function scentScope(section: HTMLElement): HTMLElement | null {
  return section.closest<HTMLElement>("[data-scent]");
}

function createNavThemeModule(): PageModule {
  let triggers: ScrollTrigger[] = [];
  let scentWatch: MutationObserver | null = null;

  function bindScent(nav: HTMLElement, section: HTMLElement | null): void {
    scentWatch?.disconnect();
    scentWatch = null;

    const scope = section && scentScope(section);
    if (!scope) {
      delete nav.dataset.scent;
      return;
    }

    const sync = (): void => {
      nav.dataset.scent = scope.dataset.scent ?? "";
    };
    sync();
    scentWatch = new MutationObserver(sync);
    scentWatch.observe(scope, {
      attributes: true,
      attributeFilter: ["data-scent"],
    });
  }

  function mount(el: HTMLElement): void {
    const nav = document.querySelector<HTMLElement>("[data-nav]");
    if (!nav) return;

    // §5.2: transparent over the hero, solid black+blur everywhere else.
    //
    // This used to key off an absolute 100vh scroll offset, which is only
    // correct on the home page: every other route has no hero, so the bar
    // stayed transparent over its first screenful, and it dropped back to
    // transparent over the footer (review OSV-07). Keying off the hero
    // element itself makes the rule a section-boundary crossing — solid is
    // the default, transparent is the exception the hero opts into.
    const heroEl = el.querySelector<HTMLElement>("[data-nav-transparent]");

    if (heroEl) {
      const solidTrigger = ScrollTrigger.create({
        trigger: heroEl,
        start: "top top",
        end: () => `bottom ${NAV_OFFSET}`,
        onToggle: (self) => nav.classList.toggle("nav--solid", !self.isActive),
      });
      nav.classList.toggle("nav--solid", !solidTrigger.isActive);
      triggers.push(solidTrigger);
    } else {
      nav.classList.add("nav--solid");
    }

    // M §4.9: one ScrollTrigger per themed section, toggling the nav class.
    const sections = el.querySelectorAll<HTMLElement>("[data-nav-theme]");

    sections.forEach((section) => {
      const theme = section.dataset.navTheme;
      if (!theme) return;

      const trigger = ScrollTrigger.create({
        trigger: section,
        start: `top ${NAV_OFFSET}`,
        end: `bottom ${NAV_OFFSET}`,
        onToggle: (self) => {
          if (self.isActive) {
            applyTheme(nav, theme);
            bindScent(nav, theme === "scent" ? section : null);
          }
        },
      });
      if (trigger.isActive) {
        applyTheme(nav, theme);
        bindScent(nav, theme === "scent" ? section : null);
      }
      triggers.push(trigger);
    });
  }

  function destroy(): void {
    triggers.forEach((trigger) => trigger.kill());
    triggers = [];
    scentWatch?.disconnect();
    scentWatch = null;
    const nav = document.querySelector<HTMLElement>("[data-nav]");
    nav?.classList.remove("nav--solid");
    if (nav) delete nav.dataset.scent;
  }

  return { selector: '[data-module="nav-theme"]', mount, destroy };
}

export const navThemeModule = createNavThemeModule();
registry.registerModule(navThemeModule);
