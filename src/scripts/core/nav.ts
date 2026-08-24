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

function createNavThemeModule(): PageModule {
  let triggers: ScrollTrigger[] = [];

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
          if (self.isActive) applyTheme(nav, theme);
        },
      });
      if (trigger.isActive) applyTheme(nav, theme);
      triggers.push(trigger);
    });
  }

  function destroy(): void {
    triggers.forEach((trigger) => trigger.kill());
    triggers = [];
    document
      .querySelector<HTMLElement>("[data-nav]")
      ?.classList.remove("nav--solid");
  }

  return { selector: '[data-module="nav-theme"]', mount, destroy };
}

export const navThemeModule = createNavThemeModule();
registry.registerModule(navThemeModule);
