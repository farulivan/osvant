// lib/commerce.ts — commerce port + local adapter (07-integrations.md §1).
//
// The port's async signatures are shaped like a real backend client; the v1
// adapter below resolves from `data/products.json` + `localStorage`. A
// Shopify Storefront adapter is a drop-in replacement for `createAdapter()`
// — same port, one file (§1.2, §6).
//
// Cart mutations dispatch `osvant:cart-changed` on `window` — persistent
// chrome (the nav cart chip) listens for it instead of polling the port.
import catalogJson from "../data/products.json";

export interface ProductVariant {
  sku: string;
  scent: string;
  size: string;
  price: number;
  currency: "EUR";
  availableForSale: boolean;
  limited: boolean;
}

export interface Product {
  scent: string;
  name: string;
  batch: string;
  variants: ProductVariant[];
}

export interface CartLine {
  sku: string;
  quantity: number;
  variant: ProductVariant;
}

export interface Cart {
  id: string;
  lines: CartLine[];
  subtotal: { amount: number; currency: "EUR" };
}

export interface CheckoutConfirmation {
  orderNumber: string;
  lines: CartLine[];
  subtotal: Cart["subtotal"];
  notice: string;
}

export interface CommercePort {
  getProducts(): Promise<Product[]>;
  getProduct(scent: string): Promise<Product>;
  getCart(): Promise<Cart | null>;
  cartCreate(): Promise<Cart>;
  cartAddLine(sku: string, quantity: number): Promise<Cart>;
  cartUpdateQuantity(sku: string, quantity: number): Promise<Cart>;
  cartRemoveLine(sku: string): Promise<Cart>;
  checkout(cart: Cart): Promise<CheckoutConfirmation>;
}

export class CommerceError extends Error {}

// §1.3 mock-checkout copy — LAW (07 §1.3), not to be edited locally.
const DEMO_NOTICE = "demo store — no real orders";

const STORAGE_KEY = "osvant:cart";
const CART_CHANGED_EVENT = "osvant:cart-changed";

function emptyCart(id: string): Cart {
  return { id, lines: [], subtotal: { amount: 0, currency: "EUR" } };
}

function withSubtotal(cart: Cart): Cart {
  return {
    ...cart,
    subtotal: {
      amount: cart.lines.reduce(
        (sum, line) => sum + line.variant.price * line.quantity,
        0,
      ),
      currency: "EUR",
    },
  };
}

function cartId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `cart-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function notify(): void {
  window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT));
}

// Exported for tests — production code uses the default-bound catalog.
export function createAdapter(catalog: Product[]): CommercePort {
  function findVariant(sku: string): ProductVariant | undefined {
    return catalog
      .flatMap((product) => product.variants)
      .find((variant) => variant.sku === sku);
  }

  function loadCart(): Cart | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Cart;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  function saveCart(cart: Cart): Cart {
    const withTotals = withSubtotal(cart);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withTotals));
    notify();
    return withTotals;
  }

  return {
    async getProducts() {
      return catalog;
    },

    async getProduct(scent: string) {
      const product = catalog.find((entry) => entry.scent === scent);
      if (!product) throw new CommerceError(`unknown scent: ${scent}`);
      return product;
    },

    async getCart() {
      return loadCart();
    },

    async cartCreate() {
      return saveCart(emptyCart(cartId()));
    },

    async cartAddLine(sku: string, quantity: number) {
      if (quantity < 1) {
        throw new CommerceError(`quantity must be >= 1, got ${quantity}`);
      }
      const variant = findVariant(sku);
      if (!variant) throw new CommerceError(`unknown sku: ${sku}`);
      if (!variant.availableForSale) {
        throw new CommerceError(`sold out: ${sku}`);
      }

      const cart = loadCart() ?? emptyCart(cartId());
      const existing = cart.lines.find((line) => line.sku === sku);

      if (existing) {
        existing.quantity += quantity;
      } else {
        cart.lines.push({ sku, quantity, variant });
      }
      return saveCart(cart);
    },

    // Drawer qty steppers (03 cart drawer): quantity 0 removes the line.
    async cartUpdateQuantity(sku: string, quantity: number) {
      if (quantity < 0) {
        throw new CommerceError(`quantity must be >= 0, got ${quantity}`);
      }
      const cart = loadCart();
      if (!cart) throw new CommerceError("no cart to update");
      const line = cart.lines.find((entry) => entry.sku === sku);
      if (!line) throw new CommerceError(`sku not in cart: ${sku}`);
      if (quantity === 0) {
        cart.lines = cart.lines.filter((entry) => entry.sku !== sku);
      } else {
        line.quantity = quantity;
      }
      return saveCart(cart);
    },

    async cartRemoveLine(sku: string) {
      const cart = loadCart();
      if (!cart) throw new CommerceError("no cart to remove from");
      if (!cart.lines.some((line) => line.sku === sku)) {
        throw new CommerceError(`sku not in cart: ${sku}`);
      }
      cart.lines = cart.lines.filter((line) => line.sku !== sku);
      return saveCart(cart);
    },

    // §1.3: mock checkout — returns a confirmation snapshot, clears the
    // cart. The drawer advances to the confirmation step with this payload
    // (order summary + `notice` + `back to the current` button) in M2.
    async checkout(cart: Cart) {
      if (cart.lines.length === 0) {
        throw new CommerceError("cannot checkout an empty cart");
      }
      const confirmation: CheckoutConfirmation = {
        orderNumber: `OSV-DEMO-${cart.id.slice(0, 8)}`,
        lines: cart.lines,
        subtotal: withSubtotal(cart).subtotal,
        notice: DEMO_NOTICE,
      };
      saveCart(emptyCart(cartId()));
      return confirmation;
    },
  };
}

const adapter = createAdapter(catalogJson as Product[]);

export const getProducts = adapter.getProducts;
export const getProduct = adapter.getProduct;
export const getCart = adapter.getCart;
export const cartCreate = adapter.cartCreate;
export const cartAddLine = adapter.cartAddLine;
export const cartUpdateQuantity = adapter.cartUpdateQuantity;
export const cartRemoveLine = adapter.cartRemoveLine;
export const checkout = adapter.checkout;
export { CART_CHANGED_EVENT };
