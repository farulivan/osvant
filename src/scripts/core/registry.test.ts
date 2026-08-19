import { describe, expect, it, vi } from "vitest";
import { createModuleRegistry, type PageContext } from "./registry";

function makeCtx(overrides: Partial<PageContext> = {}): PageContext {
  return {
    url: new URL("https://osvant.test/"),
    firstLoad: true,
    reducedMotion: false,
    ...overrides,
  };
}

describe("core/registry", () => {
  it("mounts registered modules matching elements under root, in registration order", async () => {
    const registry = createModuleRegistry();
    const order: string[] = [];

    registry.registerModule({
      selector: '[data-module="hero"]',
      mount: () => {
        order.push("hero");
      },
      destroy: () => {},
    });
    registry.registerModule({
      selector: '[data-module="marquee"]',
      mount: () => {
        order.push("marquee");
      },
      destroy: () => {},
    });

    document.body.innerHTML = `
      <div data-module="marquee"></div>
      <div data-module="hero"></div>
    `;

    await registry.mountModules(document.body, makeCtx());

    expect(order).toEqual(["hero", "marquee"]);
  });

  it("mounts a module on root itself when root matches (chrome boot-mounts)", async () => {
    const registry = createModuleRegistry();
    const mount = vi.fn();

    registry.registerModule({
      selector: "[data-cart-drawer]",
      mount,
      destroy: () => {},
    });

    document.body.innerHTML = `<div data-cart-drawer></div>`;
    const drawer = document.querySelector<HTMLElement>("[data-cart-drawer]")!;

    await registry.mountModules(drawer, makeCtx());

    expect(mount).toHaveBeenCalledWith(drawer, expect.anything());
  });

  it("returns one destroyer per mounted element, each calling that module's destroy()", async () => {
    const registry = createModuleRegistry();
    const destroy = vi.fn();

    registry.registerModule({
      selector: '[data-module="card"]',
      mount: () => {},
      destroy,
    });

    document.body.innerHTML = `
      <div data-module="card"></div>
      <div data-module="card"></div>
    `;

    const destroyers = await registry.mountModules(document.body, makeCtx());
    expect(destroyers).toHaveLength(2);

    destroyers.forEach((fn) => fn());
    expect(destroy).toHaveBeenCalledTimes(2);
  });

  it("awaits async mount() before resolving", async () => {
    const registry = createModuleRegistry();
    let mounted = false;

    registry.registerModule({
      selector: '[data-module="gallery"]',
      mount: async () => {
        await Promise.resolve();
        mounted = true;
      },
      destroy: () => {},
    });

    document.body.innerHTML = `<div data-module="gallery"></div>`;
    await registry.mountModules(document.body, makeCtx());

    expect(mounted).toBe(true);
  });

  it("passes the PageContext through to mount()", async () => {
    const registry = createModuleRegistry();
    const ctx = makeCtx({ reducedMotion: true });
    let received: PageContext | undefined;

    registry.registerModule({
      selector: '[data-module="contact-form"]',
      mount: (_el, pageCtx) => {
        received = pageCtx;
      },
      destroy: () => {},
    });

    document.body.innerHTML = `<div data-module="contact-form"></div>`;
    await registry.mountModules(document.body, ctx);

    expect(received).toBe(ctx);
  });

  it("does not mount modules with no matching elements", async () => {
    const registry = createModuleRegistry();
    const mount = vi.fn();

    registry.registerModule({
      selector: '[data-module="pdp-hero"]',
      mount,
      destroy: () => {},
    });

    document.body.innerHTML = `<div data-module="hero"></div>`;
    const destroyers = await registry.mountModules(document.body, makeCtx());

    expect(mount).not.toHaveBeenCalled();
    expect(destroyers).toHaveLength(0);
  });
});
