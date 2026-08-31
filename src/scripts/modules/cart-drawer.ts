// modules/cart-drawer.ts — cart drawer behavior (03 cart drawer,
// 01 §5.7, 07 §1.3, RFC-001 B3).
//
// Global chrome: mounted once at boot against [data-cart-drawer] (the
// drawer lives outside [data-taxi], like the footer). Open/close per
// 01 §5.7 — right slide 0.6s expo.inOut over the dark scrim; while open
// the background is inert, lenis stops, focus is trapped inside the
// dialog, ESC closes and focus returns to the trigger.
//
// State: line items render client-side from the commerce port (cart in
// localStorage); qty steppers → cartUpdateQuantity (0 removes), remove →
// cartRemoveLine; re-renders on osvant:cart-changed. Checkout (mock,
// 07 §1.3): track("begin_checkout") → checkout(cart) → confirmation
// step (order summary + `demo store — no real orders` + `back to the
// current` closes). Line gone-unavailable (B3): amber `no longer
// available` note + remove action.
//
// Reduced motion (M §9): open/close swap instantly — no slide, no fade.
// Lifecycle: every listener/timer/tween dies in destroy() (03-eng §4.1).

import gsap from "gsap";
import {
  CART_CHANGED_EVENT,
  cartRemoveLine,
  cartUpdateQuantity,
  checkout,
  getCart,
  type Cart,
} from "../../lib/commerce";
import { track } from "../core/track";
import { start, stop } from "../core/scroll";
import { registry, type PageContext, type PageModule } from "../core/registry";

const SELECTOR = "[data-cart-drawer]";
const SLIDE_SECONDS = 0.6; // 01 §5.7
const FOCUSABLE =
  'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

interface DrawerState {
  el: HTMLElement;
  cleanups: Array<() => void>;
  tweens: gsap.core.Tween[];
  open: boolean;
  trigger: HTMLElement | null;
}

/**
 * Bottle-still URLs by scent, published by CartDrawer.astro as a JSON
 * script tag. Returns an empty map rather than throwing if the tag is
 * missing or malformed — a cart that renders without thumbnails is a
 * degraded cart, but a cart that throws is a broken checkout.
 */
function readThumbs(root: HTMLElement): Record<string, string> {
  const tag = root.querySelector<HTMLScriptElement>("[data-cart-thumbs]");
  if (!tag?.textContent) return {};
  try {
    return JSON.parse(tag.textContent) as Record<string, string>;
  } catch {
    return {};
  }
}

export function createCartDrawer(): PageModule {
  const states: DrawerState[] = [];

  function render(state: DrawerState, cart: Cart | null): void {
    const linesEl = state.el.querySelector<HTMLElement>("[data-cart-lines]")!;
    const emptyEl = state.el.querySelector<HTMLElement>("[data-cart-empty]")!;
    const summaryEl = state.el.querySelector<HTMLElement>(
      "[data-cart-summary]",
    )!;
    const subtotalEl = state.el.querySelector<HTMLElement>(
      "[data-cart-subtotal]",
    )!;

    const lines = cart?.lines ?? [];
    linesEl.innerHTML = "";
    // Bottle stills, keyed by scent. CartDrawer.astro generates the AVIF
    // derivatives at build time and hands them over as JSON — `getImage()`
    // is build-only, and these list items are created here at runtime.
    const thumbs = readThumbs(state.el);
    for (const line of lines) {
      const li = document.createElement("li");
      li.className = "cart-line";
      const unavailable = !line.variant.availableForSale;
      const thumb = thumbs[line.variant.scent];
      li.innerHTML = `
        ${thumb ? `<img class="cart-line__thumb" src="${thumb}" alt="" width="64" height="64" loading="lazy" decoding="async">` : ""}
        <div class="cart-line__info">
          <p class="cart-line__name">the ${line.variant.scent}</p>
          <p class="cart-line__meta">${line.quantity > 1 ? `${line.variant.size} · €${line.variant.price} each` : line.variant.size}</p>
          ${unavailable ? '<p class="cart-line__meta cart-line__meta--gone">no longer available</p>' : ""}
        </div>
        <div class="cart-line__steppers">
          <button type="button" data-step="-1" data-sku="${line.sku}" aria-label="decrease quantity">−</button>
          <span class="cart-line__qty">${line.quantity}</span>
          <button type="button" data-step="1" data-sku="${line.sku}" aria-label="increase quantity">+</button>
        </div>
        <p class="cart-line__price">€${line.variant.price * line.quantity}</p>
        <button class="cart-line__remove" type="button" data-remove data-sku="${line.sku}">remove</button>
      `;
      linesEl.append(li);
    }

    const hasLines = lines.length > 0;
    emptyEl.hidden = hasLines;
    summaryEl.hidden = !hasLines;
    subtotalEl.textContent = `€${cart?.subtotal.amount ?? 0}`;
  }

  function openDrawer(
    state: DrawerState,
    trigger: HTMLElement | null,
    reduced: boolean,
  ): void {
    const panel = state.el.querySelector<HTMLElement>("[data-cart-panel]")!;
    const scrim = state.el.querySelector<HTMLElement>("[data-cart-scrim]")!;
    state.trigger = trigger;
    state.open = true;
    state.el.hidden = false;

    document
      .querySelector<HTMLElement>("[data-taxi]")
      ?.setAttribute("inert", "");
    stop(); // lenis.stop() — background inert (03 cart drawer)

    if (reduced) {
      gsap.set(panel, { xPercent: 0 });
      gsap.set(scrim, { opacity: 1 });
    } else {
      state.tweens.push(
        gsap.fromTo(
          panel,
          { xPercent: 100 },
          { xPercent: 0, duration: SLIDE_SECONDS, ease: "expo.inOut" },
        ),
        gsap.fromTo(
          scrim,
          { opacity: 0 },
          { opacity: 1, duration: SLIDE_SECONDS, ease: "none" },
        ),
      );
    }

    panel.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }

  function closeDrawer(state: DrawerState, reduced: boolean): void {
    const panel = state.el.querySelector<HTMLElement>("[data-cart-panel]")!;
    const scrim = state.el.querySelector<HTMLElement>("[data-cart-scrim]")!;
    state.open = false;

    const finish = () => {
      state.el.hidden = true;
      document
        .querySelector<HTMLElement>("[data-taxi]")
        ?.removeAttribute("inert");
      start();
      state.trigger?.focus();
    };

    if (reduced) {
      finish();
    } else {
      state.tweens.push(
        gsap.to(panel, {
          xPercent: 100,
          duration: SLIDE_SECONDS,
          ease: "expo.inOut",
          onComplete: finish,
        }),
        gsap.to(scrim, { opacity: 0, duration: SLIDE_SECONDS, ease: "none" }),
      );
    }
  }

  return {
    selector: SELECTOR,

    mount(el: HTMLElement, ctx: PageContext): void {
      const state: DrawerState = {
        el,
        cleanups: [],
        tweens: [],
        open: false,
        trigger: null,
      };
      const body = el.querySelector<HTMLElement>("[data-cart-body]")!;
      const confirmation = el.querySelector<HTMLElement>(
        "[data-cart-confirmation]",
      )!;

      const showBody = () => {
        confirmation.hidden = true;
        body.hidden = false;
      };

      // Open triggers: nav chip + any [data-cart-open] on the page.
      const onOpenClick = (event: Event) => {
        const trigger = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-cart-open]",
        );
        if (!trigger) return;
        event.preventDefault();
        void getCart().then((cart) => {
          showBody();
          render(state, cart);
          openDrawer(state, trigger, ctx.reducedMotion);
        });
      };
      document.addEventListener("click", onOpenClick);
      state.cleanups.push(() =>
        document.removeEventListener("click", onOpenClick),
      );

      const onClose = () => closeDrawer(state, ctx.reducedMotion);
      for (const closer of el.querySelectorAll(
        "[data-cart-close], [data-cart-scrim], [data-cart-confirmation-close]",
      )) {
        closer.addEventListener("click", onClose);
        state.cleanups.push(() => closer.removeEventListener("click", onClose));
      }

      // ESC + focus trap (03 cart drawer acceptance)
      const onKeydown = (event: KeyboardEvent) => {
        if (!state.open) return;
        if (event.key === "Escape") {
          closeDrawer(state, ctx.reducedMotion);
          return;
        }
        if (event.key !== "Tab") return;
        const focusables = [
          ...el.querySelectorAll<HTMLElement>(FOCUSABLE),
        ].filter((node) => node.offsetParent !== null);
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
      state.cleanups.push(() =>
        document.removeEventListener("keydown", onKeydown),
      );

      // Stepper / remove delegation on the lines list.
      const linesEl = el.querySelector<HTMLElement>("[data-cart-lines]")!;
      const onLinesClick = async (event: Event) => {
        const stepper = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-step]",
        );
        const remover = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-remove]",
        );
        if (stepper) {
          const sku = stepper.dataset.sku!;
          const cart = await getCart();
          const line = cart?.lines.find((entry) => entry.sku === sku);
          if (line) {
            await cartUpdateQuantity(
              sku,
              line.quantity + Number(stepper.dataset.step),
            );
          }
        } else if (remover) {
          await cartRemoveLine(remover.dataset.sku!);
        }
      };
      linesEl.addEventListener("click", onLinesClick);
      state.cleanups.push(() =>
        linesEl.removeEventListener("click", onLinesClick),
      );

      // Mock checkout (07 §1.3)
      const checkoutBtn = el.querySelector<HTMLButtonElement>(
        "[data-cart-checkout]",
      )!;
      const onCheckout = async () => {
        const cart = await getCart();
        if (!cart || cart.lines.length === 0) return;
        track("begin_checkout", {
          value: cart.subtotal.amount,
          items: cart.lines.length,
        });
        const confirmationResult = await checkout(cart);
        el.querySelector<HTMLElement>(
          "[data-cart-confirmation-lines]",
        )!.innerHTML = confirmationResult.lines
          .map(
            (line) =>
              `<li>${line.quantity} × the ${line.variant.scent} — ${line.variant.size}</li>`,
          )
          .join("");
        el.querySelector<HTMLElement>(
          "[data-cart-confirmation-subtotal]",
        )!.textContent = `€${confirmationResult.subtotal.amount}`;
        body.hidden = true;
        confirmation.hidden = false;
        confirmation.querySelector<HTMLElement>(FOCUSABLE)?.focus();
      };
      checkoutBtn.addEventListener("click", onCheckout);
      state.cleanups.push(() =>
        checkoutBtn.removeEventListener("click", onCheckout),
      );

      // Re-render when the cart changes while open.
      const onCartChanged = () => {
        if (state.open && confirmation.hidden) {
          void getCart().then((cart) => render(state, cart));
        }
      };
      window.addEventListener(CART_CHANGED_EVENT, onCartChanged);
      state.cleanups.push(() =>
        window.removeEventListener(CART_CHANGED_EVENT, onCartChanged),
      );

      states.push(state);
    },

    destroy(): void {
      const state = states.pop();
      if (!state) return;
      for (const cleanup of state.cleanups) cleanup();
      for (const tween of state.tweens) tween.kill();
      if (state.open) {
        state.el.hidden = true;
        document
          .querySelector<HTMLElement>("[data-taxi]")
          ?.removeAttribute("inert");
        start();
      }
    },
  };
}

export const cartDrawer: PageModule = createCartDrawer();
registry.registerModule(cartDrawer);
