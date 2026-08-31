// modules/pdp.ts — PDP purchase surface (03 §3.1, RFC-001 B2/B3/B7).
//
// - Size chips ([data-size-chip], one per variant): single-select,
//   aria-pressed, drives the displayed price ([data-price]) and the SKU
//   used by add-to-cart.
// - Add to cart ([data-add-to-cart]): cartAddLine via the commerce port
//   (07 §1.1 mock), then track("add_to_cart", { sku, scent }) (B7).
// - Sold-out (B3): when no variant is available the button renders
//   disabled with `sold out — next batch soon` and a `get notified`
//   line-input (01 §5.5 reuse) fires track("sold_out_notify_signup",
//   { scent }) on submit, swapping to the 01 §5.5 success message.
//
// Reduced motion: no animations here (chips/button are state changes);
// the cart badge's elastic pop lives in main.ts and is RM-gated there.
// Lifecycle: all listeners removed in destroy() (03-eng §4.1).

import { cartAddLine } from "../../lib/commerce";
import { track } from "../core/track";
import { registry, type PageModule } from "../core/registry";

const SELECTOR = "[data-pdp]";

interface PdpState {
  el: HTMLElement;
  cleanups: Array<() => void>;
}

export function createPdp(): PageModule {
  const states: PdpState[] = [];

  return {
    selector: SELECTOR,

    mount(el: HTMLElement): void {
      const state: PdpState = { el, cleanups: [] };
      const chips = [
        ...el.querySelectorAll<HTMLButtonElement>("[data-size-chip]"),
      ];
      const priceEl = el.querySelector<HTMLElement>("[data-price]");
      const addBtn = el.querySelector<HTMLButtonElement>("[data-add-to-cart]");
      const notifyForm =
        el.querySelector<HTMLFormElement>("[data-notify-form]");
      const notifyDone = el.querySelector<HTMLElement>("[data-notify-done]");
      const scent = el.dataset.scent ?? "";

      // A single-size scent renders its size as a spec line rather than a
      // one-option "selector" (review OSV-26), so there is no chip to read
      // the sku from — the root declares it instead.
      let selectedSku =
        chips.find((chip) => chip.hasAttribute("data-selected"))?.dataset.sku ??
        chips[0]?.dataset.sku ??
        el.dataset.defaultSku ??
        "";

      for (const chip of chips) {
        const onClick = () => {
          selectedSku = chip.dataset.sku ?? "";
          for (const other of chips) {
            const active = other === chip;
            other.setAttribute("aria-pressed", String(active));
            other.toggleAttribute("data-selected", active);
          }
          if (priceEl && chip.dataset.price)
            priceEl.textContent = chip.dataset.price;
        };
        chip.addEventListener("click", onClick);
        state.cleanups.push(() => chip.removeEventListener("click", onClick));
      }

      if (addBtn) {
        const onAdd = async () => {
          if (!selectedSku || addBtn.disabled) return;
          addBtn.disabled = true;
          try {
            await cartAddLine(selectedSku, 1);
            track("add_to_cart", { sku: selectedSku, scent });
          } finally {
            addBtn.disabled = false;
          }
        };
        addBtn.addEventListener("click", onAdd);
        state.cleanups.push(() => addBtn.removeEventListener("click", onAdd));
      }

      if (notifyForm) {
        const onNotify = (event: SubmitEvent) => {
          event.preventDefault();
          track("sold_out_notify_signup", { scent });
          notifyForm.hidden = true;
          if (notifyDone) notifyDone.hidden = false;
        };
        notifyForm.addEventListener("submit", onNotify);
        state.cleanups.push(() =>
          notifyForm.removeEventListener("submit", onNotify),
        );
      }

      states.push(state);
    },

    destroy(): void {
      const state = states.pop();
      if (!state) return;
      for (const cleanup of state.cleanups) cleanup();
    },
  };
}

export const pdp: PageModule = createPdp();
registry.registerModule(pdp);
