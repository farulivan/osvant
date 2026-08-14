import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageContext } from "../core/registry";

const CTX: PageContext = {
  url: new URL("https://osvant.test/collection/volt/"),
  firstLoad: true,
  reducedMotion: false,
};

const cartAddLineMock = vi.fn();
vi.mock("../../lib/commerce", () => ({
  cartAddLine: cartAddLineMock,
}));

const trackMock = vi.fn();
vi.mock("../core/track", () => ({ track: trackMock }));

function makePdp(soldOut = false): HTMLElement {
  const el = document.createElement("div");
  el.dataset.pdp = "";
  el.dataset.scent = "volt";
  el.innerHTML = soldOut
    ? `
      <button data-size-chip data-sku="OSV-FEVER-50" data-price="€135" data-selected aria-pressed="true">50ml</button>
      <p data-price>€135</p>
      <button class="btn-primary" disabled>sold out — next batch soon</button>
      <form data-notify-form><input type="email" name="email" /><button>get notified</button></form>
      <p data-notify-done hidden>you're in the current.</p>
    `
    : `
      <button data-size-chip data-sku="OSV-VOLT-50" data-price="€110" data-selected aria-pressed="true">50ml</button>
      <button data-size-chip data-sku="OSV-VOLT-100" data-price="€160" aria-pressed="false">100ml</button>
      <p data-price>€110</p>
      <button data-add-to-cart><span data-btn-label>add to cart</span></button>
    `;
  document.body.append(el);
  return el;
}

describe("modules/pdp (03 §3.1, RFC-001 B2/B3/B7)", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    cartAddLineMock.mockResolvedValue({});
    document.body.innerHTML = "";
  });

  async function load() {
    const { createPdp } = await import("./pdp");
    return createPdp();
  }

  it("size chips are single-select and drive the price", async () => {
    const module = await load();
    const el = makePdp();
    module.mount(el, CTX);

    const [chip50, chip100] = [
      ...el.querySelectorAll<HTMLButtonElement>("[data-size-chip]"),
    ];
    chip100.click();

    expect(chip100.getAttribute("aria-pressed")).toBe("true");
    expect(chip50.getAttribute("aria-pressed")).toBe("false");
    expect(el.querySelector("[data-price]")!.textContent).toBe("€160");

    module.destroy();
  });

  it("add to cart uses the selected SKU and tracks add_to_cart", async () => {
    const module = await load();
    const el = makePdp();
    module.mount(el, CTX);

    el.querySelectorAll<HTMLButtonElement>("[data-size-chip]")[1].click();
    el.querySelector<HTMLButtonElement>("[data-add-to-cart]")!.click();
    await vi.waitFor(() => expect(cartAddLineMock).toHaveBeenCalled());

    expect(cartAddLineMock).toHaveBeenCalledWith("OSV-VOLT-100", 1);
    expect(trackMock).toHaveBeenCalledWith("add_to_cart", {
      sku: "OSV-VOLT-100",
      scent: "volt",
    });

    module.destroy();
  });

  it("sold-out: get-notified fires sold_out_notify_signup and swaps to the success message (B3)", async () => {
    const module = await load();
    const el = makePdp(true);
    module.mount(el, CTX);

    const form = el.querySelector<HTMLFormElement>("[data-notify-form]")!;
    form.dispatchEvent(new SubmitEvent("submit", { cancelable: true }));

    expect(trackMock).toHaveBeenCalledWith("sold_out_notify_signup", {
      scent: "volt",
    });
    expect(form.hidden).toBe(true);
    expect(el.querySelector<HTMLElement>("[data-notify-done]")!.hidden).toBe(
      false,
    );

    module.destroy();
  });

  it("destroy() removes all listeners (03-eng §4.1)", async () => {
    const module = await load();
    const el = makePdp();
    module.mount(el, CTX);
    module.destroy();

    el.querySelector<HTMLButtonElement>("[data-add-to-cart]")!.click();
    await Promise.resolve();

    expect(cartAddLineMock).not.toHaveBeenCalled();
  });
});
