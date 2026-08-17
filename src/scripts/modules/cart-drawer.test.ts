import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageContext } from "../core/registry";

const getCartMock = vi.fn();
const cartUpdateQuantityMock = vi.fn();
const cartRemoveLineMock = vi.fn();
const checkoutMock = vi.fn();

vi.mock("../../lib/commerce", () => ({
  CART_CHANGED_EVENT: "osvant:cart-changed",
  getCart: getCartMock,
  cartUpdateQuantity: cartUpdateQuantityMock,
  cartRemoveLine: cartRemoveLineMock,
  checkout: checkoutMock,
}));

const trackMock = vi.fn();
vi.mock("../core/track", () => ({ track: trackMock }));

const stopMock = vi.fn();
const startMock = vi.fn();
vi.mock("../core/scroll", () => ({ stop: stopMock, start: startMock }));

const fromToMock = vi.fn();
const toMock = vi.fn();
const setMock = vi.fn();
vi.mock("gsap", () => ({
  default: { fromTo: fromToMock, to: toMock, set: setMock },
}));

const CART = {
  id: "cart-1",
  subtotal: { amount: 220, currency: "EUR" },
  lines: [
    {
      sku: "OSV-VOLT-50",
      quantity: 2,
      variant: {
        sku: "OSV-VOLT-50",
        scent: "volt",
        size: "50ml",
        price: 110,
        currency: "EUR",
        availableForSale: true,
        limited: false,
      },
    },
  ],
};

function ctx(reducedMotion: boolean): PageContext {
  return {
    url: new URL("https://osvant.test/"),
    firstLoad: true,
    reducedMotion,
  };
}

function makeChrome() {
  document.body.innerHTML = `
    <div data-taxi><p>page</p></div>
    <button data-cart-open>cart</button>
    <div data-cart-drawer role="dialog" hidden>
      <div data-cart-scrim></div>
      <div data-cart-panel>
        <button data-cart-close>close</button>
        <div data-cart-body>
          <div data-cart-empty hidden></div>
          <ul data-cart-lines></ul>
          <div data-cart-summary hidden>
            <span data-cart-subtotal>€0</span>
            <button data-cart-checkout>checkout</button>
          </div>
        </div>
        <div data-cart-confirmation hidden>
          <ul data-cart-confirmation-lines></ul>
          <span data-cart-confirmation-subtotal></span>
          <button data-cart-confirmation-close>back to the current</button>
        </div>
      </div>
    </div>
  `;
  return {
    drawer: document.querySelector<HTMLElement>("[data-cart-drawer]")!,
    trigger: document.querySelector<HTMLElement>("[data-cart-open]")!,
  };
}

function fakeTween() {
  return { kill: vi.fn() };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("modules/cart-drawer (03 cart drawer, 01 §5.7, 07 §1.3)", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    getCartMock.mockResolvedValue(CART);
    cartUpdateQuantityMock.mockResolvedValue(CART);
    cartRemoveLineMock.mockResolvedValue({ ...CART, lines: [] });
    checkoutMock.mockResolvedValue({
      orderNumber: "OSV-DEMO-1",
      lines: CART.lines,
      subtotal: CART.subtotal,
      notice: "demo store — no real orders",
    });
    fromToMock.mockImplementation(() => fakeTween());
    toMock.mockImplementation(
      (_: unknown, vars: { onComplete?: () => void }) => {
        vars.onComplete?.();
        return fakeTween();
      },
    );
  });

  async function load() {
    const { createCartDrawer } = await import("./cart-drawer");
    return createCartDrawer();
  }

  it("opens on [data-cart-open] click: renders lines, inert background, lenis stops, slides per 01 §5.7", async () => {
    const module = await load();
    const { drawer, trigger } = makeChrome();
    module.mount(drawer, ctx(false));

    trigger.click();
    await flush();

    expect(drawer.hidden).toBe(false);
    expect(document.querySelector("[data-taxi]")!.hasAttribute("inert")).toBe(
      true,
    );
    expect(stopMock).toHaveBeenCalled();
    expect(drawer.querySelectorAll(".cart-line")).toHaveLength(1);
    expect(drawer.querySelector("[data-cart-subtotal]")!.textContent).toBe(
      "€220",
    );
    expect(fromToMock).toHaveBeenCalledWith(
      expect.anything(),
      { xPercent: 100 },
      expect.objectContaining({ duration: 0.6, ease: "expo.inOut" }),
    );

    module.destroy();
  });

  it("steppers call cartUpdateQuantity with the computed quantity; remove calls cartRemoveLine", async () => {
    const module = await load();
    const { drawer, trigger } = makeChrome();
    module.mount(drawer, ctx(false));
    trigger.click();
    await flush();

    drawer.querySelector<HTMLElement>('[data-step="1"]')!.click();
    await flush();
    expect(cartUpdateQuantityMock).toHaveBeenCalledWith("OSV-VOLT-50", 3);

    drawer.querySelector<HTMLElement>("[data-remove]")!.click();
    await flush();
    expect(cartRemoveLineMock).toHaveBeenCalledWith("OSV-VOLT-50");

    module.destroy();
  });

  it("ESC closes: panel hides, inert removed, lenis restarts, focus returns to trigger", async () => {
    const module = await load();
    const { drawer, trigger } = makeChrome();
    module.mount(drawer, ctx(false));
    trigger.click();
    await flush();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await flush();

    expect(drawer.hidden).toBe(true);
    expect(document.querySelector("[data-taxi]")!.hasAttribute("inert")).toBe(
      false,
    );
    expect(startMock).toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);

    module.destroy();
  });

  it("reduced motion: open/close swap instantly — no tweens (M §9)", async () => {
    const module = await load();
    const { drawer, trigger } = makeChrome();
    module.mount(drawer, ctx(true));

    trigger.click();
    await flush();
    expect(drawer.hidden).toBe(false);
    expect(fromToMock).not.toHaveBeenCalled();

    drawer.querySelector<HTMLElement>("[data-cart-close]")!.click();
    await flush();
    expect(drawer.hidden).toBe(true);
    expect(toMock).not.toHaveBeenCalled();

    module.destroy();
  });

  it("checkout: tracks begin_checkout, swaps to confirmation with summary + notice (07 §1.3)", async () => {
    const module = await load();
    const { drawer, trigger } = makeChrome();
    module.mount(drawer, ctx(false));
    trigger.click();
    await flush();

    drawer.querySelector<HTMLElement>("[data-cart-checkout]")!.click();
    await flush();

    expect(trackMock).toHaveBeenCalledWith("begin_checkout", {
      value: 220,
      items: 1,
    });
    expect(checkoutMock).toHaveBeenCalled();
    const confirmation = drawer.querySelector<HTMLElement>(
      "[data-cart-confirmation]",
    )!;
    expect(confirmation.hidden).toBe(false);
    expect(
      drawer.querySelector("[data-cart-confirmation-lines]")!.textContent,
    ).toContain("2 × the volt — 50ml");
    expect(
      drawer.querySelector("[data-cart-confirmation-subtotal]")!.textContent,
    ).toBe("€220");

    module.destroy();
  });

  it("destroy() unbinds triggers and force-closes an open drawer (03-eng §4.1)", async () => {
    const module = await load();
    const { drawer, trigger } = makeChrome();
    module.mount(drawer, ctx(true));
    trigger.click();
    await flush();
    expect(drawer.hidden).toBe(false);

    module.destroy();

    expect(drawer.hidden).toBe(true);
    expect(document.querySelector("[data-taxi]")!.hasAttribute("inert")).toBe(
      false,
    );
    expect(startMock).toHaveBeenCalled();

    trigger.click();
    await flush();
    expect(drawer.hidden).toBe(true); // listener removed — stays closed
  });
});
