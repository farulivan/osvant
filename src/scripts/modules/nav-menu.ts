// modules/nav-menu.ts — mobile overlay menu (01 §5.2, a11y acceptance
// in 03 §7 checklist).
//
// The Nav is persistent chrome (outside [data-taxi]) — boot-mounted in
// main.ts like the footer/drawer, so destroy() is only ever a test/reset
// concern. Replaces the CSS-only disclosure fallback in Nav.astro.
//
// Behavior: full-screen ink-1 overlay (CSS), staggered SplitText char
// entrance on open (0.5s default register, per-link offset — stagger
// values are a judgment call, spec says only "staggered SplitText
// entrance"; flagged in the PR). Reduced motion (M §9): links just fade
// in with the panel, no split.
//
// While open: lenis stops, [data-taxi] is inert, focus is trapped in the
// menu, ESC closes, focus returns to the toggle. A link click closes the
// menu (taxi handles the navigation itself).

import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { registry, type PageModule } from "../core/registry";
import { start, stop } from "../core/scroll";

const FOCUSABLE = "a[href], button:not([disabled])";
const LINK_STAGGER = 0.06; // per-link entrance offset (judgment call)
const CHAR_STAGGER = 0.02; // matches M §4.2 char stagger

const cleanup: Array<() => void> = [];

export const navMenu: PageModule = {
  selector: "[data-nav]",

  mount(root: HTMLElement, ctx): void {
    const toggle = root.querySelector<HTMLButtonElement>("[data-nav-toggle]");
    const menu = root.querySelector<HTMLElement>("[data-nav-menu]");
    if (!toggle || !menu) return;

    const links = Array.from(
      menu.querySelectorAll<HTMLElement>(".nav__links a"),
    );
    let open = false;
    let splits: SplitText[] = [];
    let tweens: gsap.core.Tween[] = [];
    cleanup.push(() => {
      splits.forEach((split) => split.revert());
      splits = [];
      tweens.forEach((tween) => tween.kill());
      tweens = [];
    });

    const setOpen = (next: boolean): void => {
      open = next;
      toggle.setAttribute("aria-expanded", String(next));
      menu.dataset.open = String(next);

      if (next) {
        document
          .querySelector<HTMLElement>("[data-taxi]")
          ?.setAttribute("inert", "");
        stop(); // lenis.stop()

        if (!ctx.reducedMotion) {
          // Staggered SplitText entrance (01 §5.2)
          splits = links.map((link) => new SplitText(link, { type: "chars" }));
          splits.forEach((split, i) => {
            tweens.push(
              gsap.from(split.chars, {
                yPercent: 110,
                opacity: 0,
                duration: 0.5,
                ease: "power3.out",
                stagger: CHAR_STAGGER,
                delay: i * LINK_STAGGER,
                overwrite: "auto",
              }),
            );
          });
        }
        links[0]?.focus();
      } else {
        document
          .querySelector<HTMLElement>("[data-taxi]")
          ?.removeAttribute("inert");
        start();
        splits.forEach((split) => split.revert());
        splits = [];
        tweens.forEach((tween) => tween.kill());
        tweens = [];
        toggle.focus();
      }
    };

    const onToggleClick = (): void => setOpen(!open);
    toggle.addEventListener("click", onToggleClick);
    cleanup.push(() => toggle.removeEventListener("click", onToggleClick));

    // Link click closes the menu; taxi owns the navigation.
    const onMenuClick = (event: Event): void => {
      if (open && (event.target as HTMLElement).closest("a[href]")) {
        setOpen(false);
      }
    };
    menu.addEventListener("click", onMenuClick);
    cleanup.push(() => menu.removeEventListener("click", onMenuClick));

    // ESC closes; Tab traps focus inside the menu (03 §7 checklist)
    const onKeydown = (event: KeyboardEvent): void => {
      if (!open) return;
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = Array.from(
        menu.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((node) => node.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeydown);
    cleanup.push(() => document.removeEventListener("keydown", onKeydown));

    // A closed menu must never trap scroll/focus if the viewport grows
    // past the mobile breakpoint while open.
    const onResize = (): void => {
      if (open && window.innerWidth > 767) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    cleanup.push(() => window.removeEventListener("resize", onResize));
  },

  destroy(): void {
    for (const kill of cleanup.splice(0)) kill();
  },
};

registry.registerModule(navMenu);
