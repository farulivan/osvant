import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageContext } from "../core/registry";

const fromMock = vi.fn(() => ({ kill: vi.fn() }));
vi.mock("gsap", () => ({ default: { from: fromMock } }));

const splitTextMock = vi.fn(function SplitTextMock() {
  return { chars: [], revert: vi.fn() };
});
vi.mock("gsap/SplitText", () => ({ SplitText: splitTextMock }));

const stopMock = vi.fn();
const startMock = vi.fn();
vi.mock("../core/scroll", () => ({ stop: stopMock, start: startMock }));

const { navMenu } = await import("./nav-menu");

function ctx(reducedMotion: boolean): PageContext {
  return {
    url: new URL("https://osvant.test/"),
    firstLoad: true,
    reducedMotion,
  };
}

function makeNav(): HTMLElement {
  document.body.innerHTML = `
    <nav data-nav>
      <button data-nav-toggle aria-expanded="false" aria-controls="nav-menu">Menu</button>
      <div id="nav-menu" data-nav-menu data-open="false">
        <ul class="nav__links">
          <li><a href="/collection/">collection</a></li>
          <li><a href="/contact/">contact</a></li>
        </ul>
        <button type="button">cart</button>
      </div>
    </nav>
    <main data-taxi><div data-taxi-view></div></main>
  `;
  return document.querySelector<HTMLElement>("[data-nav]")!;
}

describe("modules/nav-menu (01 §5.2)", () => {
  beforeEach(() => {
    navMenu.destroy();
    vi.clearAllMocks();
  });

  it("opens on toggle: aria, inert background, lenis stop, SplitText entrance", () => {
    const nav = makeNav();
    navMenu.mount(nav, ctx(false));

    nav.querySelector<HTMLButtonElement>("[data-nav-toggle]")!.click();

    const toggle = nav.querySelector("[data-nav-toggle]")!;
    const menu = nav.querySelector<HTMLElement>("[data-nav-menu]")!;
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(menu.dataset.open).toBe("true");
    expect(document.querySelector("[data-taxi]")!.hasAttribute("inert")).toBe(
      true,
    );
    expect(stopMock).toHaveBeenCalled();
    expect(splitTextMock).toHaveBeenCalledTimes(2); // one per link
    expect(fromMock).toHaveBeenCalled();
  });

  it("closes on second toggle: inert removed, lenis restarts, focus returns", () => {
    const nav = makeNav();
    navMenu.mount(nav, ctx(false));
    const toggle = nav.querySelector<HTMLButtonElement>("[data-nav-toggle]")!;

    toggle.click();
    toggle.click();

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector("[data-taxi]")!.hasAttribute("inert")).toBe(
      false,
    );
    expect(startMock).toHaveBeenCalled();
    expect(document.activeElement).toBe(toggle);
  });

  it("closes on Escape", () => {
    const nav = makeNav();
    navMenu.mount(nav, ctx(false));
    const toggle = nav.querySelector<HTMLButtonElement>("[data-nav-toggle]")!;
    toggle.click();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(startMock).toHaveBeenCalled();
  });

  it("closes when a menu link is clicked", () => {
    const nav = makeNav();
    navMenu.mount(nav, ctx(false));
    const toggle = nav.querySelector<HTMLButtonElement>("[data-nav-toggle]")!;
    toggle.click();

    const link = nav.querySelector<HTMLAnchorElement>(".nav__links a")!;
    link.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("skips SplitText under reduced motion (M §9)", () => {
    const nav = makeNav();
    navMenu.mount(nav, ctx(true));

    nav.querySelector<HTMLButtonElement>("[data-nav-toggle]")!.click();

    expect(splitTextMock).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
    expect(stopMock).toHaveBeenCalled();
  });

  it("traps Tab focus inside the open menu", () => {
    const nav = makeNav();
    navMenu.mount(nav, ctx(false));
    nav.querySelector<HTMLButtonElement>("[data-nav-toggle]")!.click();

    const menu = nav.querySelector<HTMLElement>("[data-nav-menu]")!;
    const cartButton = menu.querySelector<HTMLButtonElement>("button")!;
    // jsdom: offsetParent is null without layout — stub visible
    Object.defineProperty(cartButton, "offsetParent", { value: menu });
    menu
      .querySelectorAll<HTMLElement>("a")
      .forEach((a) =>
        Object.defineProperty(a, "offsetParent", { value: menu }),
      );

    cartButton.focus();
    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(menu.querySelector(".nav__links a"));
  });

  it("auto-closes when the viewport grows past the mobile breakpoint", () => {
    const nav = makeNav();
    navMenu.mount(nav, ctx(false));
    const toggle = nav.querySelector<HTMLButtonElement>("[data-nav-toggle]")!;
    toggle.click();

    Object.defineProperty(window, "innerWidth", {
      value: 1024,
      configurable: true,
    });
    window.dispatchEvent(new Event("resize"));

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });
});
