import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CART_CHANGED_EVENT,
  CommerceError,
  cartAddLine,
  cartCreate,
  cartRemoveLine,
  checkout,
  catalog,
  createAdapter,
  getCart,
  getProduct,
  getProducts,
  type Cart,
  type Product,
} from "./commerce";

function fixtureCatalog(overrides?: Partial<Product["variants"][number]>) {
  return [
    {
      scent: "test",
      name: "the test",
      batch: "000",
      notes: {
        top: ["test top"],
        heart: ["test heart"],
        base: ["test base"],
      },
      character: "the test. a fixture, not a fragrance.",
      formula: { paragraphs: ["a"], pullQuote: "b" },
      variants: [
        {
          sku: "OSV-TEST-50",
          scent: "test",
          size: "50ml",
          price: 100,
          currency: "EUR" as const,
          availableForSale: true,
          limited: false,
          ...overrides,
        },
      ],
    },
  ];
}

describe("lib/commerce — catalog (07 §1.1)", () => {
  it("exposes all 5 scents with correct batch indexes", async () => {
    const products = await getProducts();
    expect(products.map((p) => p.scent)).toEqual([
      "volt",
      "nocturne",
      "static",
      "fever",
      "halo",
    ]);
    expect(products.map((p) => p.batch)).toEqual([
      "001",
      "002",
      "003",
      "004",
      "005",
    ]);
  });

  it("gives non-fever scents 50ml/100ml variants at €110/€160", async () => {
    const volt = await getProduct("volt");
    expect(volt.variants.map((v) => [v.size, v.price])).toEqual([
      ["50ml", 110],
      ["100ml", 160],
    ]);
    expect(volt.variants.every((v) => !v.limited)).toBe(true);
  });

  it("fever is a single €135 limited variant (RFC B2)", async () => {
    const fever = await getProduct("fever");
    expect(fever.variants).toHaveLength(1);
    expect(fever.variants[0]).toMatchObject({
      sku: "OSV-FEVER-50",
      price: 135,
      currency: "EUR",
      limited: true,
    });
  });

  it("rejects an unknown scent", async () => {
    await expect(getProduct("unknown")).rejects.toThrow(CommerceError);
  });
});

describe("lib/commerce — local cart adapter (07 §1.2)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates an empty cart and reads it back", async () => {
    const cart = await cartCreate();
    expect(cart.lines).toHaveLength(0);
    expect(cart.subtotal).toEqual({ amount: 0, currency: "EUR" });

    expect(await getCart()).toEqual(cart);
  });

  it("getCart() returns null before any cart exists", async () => {
    expect(await getCart()).toBeNull();
  });

  it("adds a line and computes the subtotal", async () => {
    const cart = await cartAddLine("OSV-VOLT-50", 2);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]).toMatchObject({ sku: "OSV-VOLT-50", quantity: 2 });
    expect(cart.subtotal.amount).toBe(220);
  });

  it("increments quantity when adding an existing sku", async () => {
    await cartAddLine("OSV-VOLT-50", 1);
    const cart = await cartAddLine("OSV-VOLT-50", 1);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(2);
  });

  it("rejects unknown skus, non-positive quantities, and sold-out variants", async () => {
    await expect(cartAddLine("NOPE", 1)).rejects.toThrow(CommerceError);
    await expect(cartAddLine("OSV-VOLT-50", 0)).rejects.toThrow(CommerceError);

    const soldOut = createAdapter(fixtureCatalog({ availableForSale: false }));
    await expect(soldOut.cartAddLine("OSV-TEST-50", 1)).rejects.toThrow(
      "sold out",
    );
  });

  it("removes lines and rejects removals that don't exist", async () => {
    await cartAddLine("OSV-VOLT-50", 1);
    const cart = await cartRemoveLine("OSV-VOLT-50");
    expect(cart.lines).toHaveLength(0);

    await expect(cartRemoveLine("OSV-VOLT-50")).rejects.toThrow(CommerceError);
  });

  it("persists across adapter instances (localStorage is the source of truth)", async () => {
    await cartAddLine("OSV-HALO-100", 1);

    const freshInstance = createAdapter(catalog);
    const cart = (await freshInstance.getCart()) as Cart;
    expect(cart.lines[0].sku).toBe("OSV-HALO-100");
  });

  it("dispatches osvant:cart-changed on mutations", async () => {
    const handler = vi.fn();
    window.addEventListener(CART_CHANGED_EVENT, handler);

    await cartAddLine("OSV-VOLT-50", 1);

    expect(handler).toHaveBeenCalled();
  });

  it("recovers from corrupt stored state", async () => {
    localStorage.setItem("osvant:cart", "{not json");
    expect(await getCart()).toBeNull();
  });
});

describe("lib/commerce — mock checkout (07 §1.3)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns a confirmation with the demo notice and clears the cart", async () => {
    const cart = await cartAddLine("OSV-FEVER-50", 1);
    const confirmation = await checkout(cart);

    expect(confirmation.orderNumber).toMatch(/^OSV-DEMO-/);
    expect(confirmation.lines).toHaveLength(1);
    expect(confirmation.subtotal.amount).toBe(135);
    expect(confirmation.notice).toBe("demo store — no real orders");

    const after = (await getCart()) as Cart;
    expect(after.lines).toHaveLength(0);
  });

  it("rejects checking out an empty cart", async () => {
    const cart = await cartCreate();
    await expect(checkout(cart)).rejects.toThrow(CommerceError);
  });
});
