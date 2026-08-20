// scripts/main.ts — the client entry, loaded once from BaseLayout.astro.
// Import order matters: nav-theme must register before any other
// PageModule (01-arch §3.3 "mount order: nav themes first").
import "./core/nav";
import "./modules/headline-reveal";
import "./modules/card-entrance";
import "./modules/media-parallax";
import "./modules/btn-line";
import "./modules/marquee";
import "./modules/home-hero";
import "./modules/gallery";
import "./modules/newsletter";
import "./modules/note-pyramid";
import "./modules/pdp";
import "./modules/pdp-bottle";
import "./modules/cart-drawer";
import "./modules/nav-menu";
import "./modules/house-manifesto";
import "./modules/contact";
import gsap from "gsap";
import { initRouter } from "./core/router";
import { preloader } from "./core/preloader";
import { registry } from "./core/registry";
import { CART_CHANGED_EVENT, getCart } from "../lib/commerce";

initRouter();
void preloader.run();

// Persistent chrome: the footer lives OUTSIDE [data-taxi], so the router's
// per-view module scan never reaches it. Mount its modules (marquee,
// newsletter) once at boot — chrome never swaps, so no destroy pairing.
const footer = document.querySelector("footer");
if (footer) {
  void registry.mountModules(footer, {
    url: new URL(window.location.href),
    firstLoad: true,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches,
  });
}

// Nav — persistent chrome (01 §5.2). The mobile overlay menu module
// boot-mounts here; the bar itself is static markup + core/nav.ts theming.
const nav = document.querySelector("[data-nav]");
if (nav) {
  void registry.mountModules(nav, {
    url: new URL(window.location.href),
    firstLoad: true,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches,
  });
}

// Cart drawer — global overlay chrome (03 cart drawer), same boot-mount
// pattern as the footer.
const drawer = document.querySelector("[data-cart-drawer]");
if (drawer) {
  void registry.mountModules(drawer, {
    url: new URL(window.location.href),
    firstLoad: true,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches,
  });
}

// Nav cart chip — persistent chrome, so it listens for cart changes
// instead of living inside a page module. On add: badge pops with the
// M §4.8 recipe (elastic.out(1, 0.75), scale 0→1, 0.9s — playful
// register), skipped under reduced motion.
const reducedMotionQuery = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

async function syncCartCount(pop: boolean): Promise<void> {
  const el = document.querySelector<HTMLElement>("[data-cart-count]");
  if (!el) return;
  const cart = await getCart();
  el.textContent = String(
    cart?.lines.reduce((total, line) => total + line.quantity, 0) ?? 0,
  );
  if (pop && !reducedMotionQuery.matches) {
    gsap.fromTo(
      el,
      { scale: 0 },
      { scale: 1, duration: 0.9, ease: "elastic.out(1, 0.75)" },
    );
  }
}

void syncCartCount(false);
window.addEventListener(CART_CHANGED_EVENT, () => void syncCartCount(true));
