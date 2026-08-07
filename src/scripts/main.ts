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
import { initRouter } from "./core/router";
import { preloader } from "./core/preloader";
import { CART_CHANGED_EVENT, getCart } from "../lib/commerce";

initRouter();
void preloader.run();

// Nav cart chip — persistent chrome, so it listens for cart changes
// instead of living inside a page module.
async function syncCartCount(): Promise<void> {
  const el = document.querySelector<HTMLElement>("[data-cart-count]");
  if (!el) return;
  const cart = await getCart();
  el.textContent = String(
    cart?.lines.reduce((total, line) => total + line.quantity, 0) ?? 0,
  );
}

void syncCartCount();
window.addEventListener(CART_CHANGED_EVENT, () => void syncCartCount());
