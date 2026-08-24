import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeScrollTrigger {
  isActive: boolean;
  kill: () => void;
  vars: { onToggle?: (self: { isActive: boolean }) => void };
}

let createdTriggers: FakeScrollTrigger[] = [];
let nextIsActive = false;

const scrollTriggerCreate = vi.fn(
  (vars: { onToggle?: (self: { isActive: boolean }) => void }) => {
    const trigger: FakeScrollTrigger = {
      isActive: nextIsActive,
      kill: vi.fn(),
      vars,
    };
    createdTriggers.push(trigger);
    return trigger;
  },
);

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: { create: scrollTriggerCreate },
}));

function fireToggle(trigger: FakeScrollTrigger, isActive: boolean): void {
  trigger.isActive = isActive;
  trigger.vars.onToggle?.({ isActive });
}

describe("core/nav — nav-theme module", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    createdTriggers = [];
    nextIsActive = false;
    document.body.innerHTML = `<nav data-nav></nav>`;
  });

  it("registers itself first in the module registry (01-arch §3.3 mount order)", async () => {
    const { navThemeModule } = await import("./nav");
    const { registry } = await import("./registry");

    expect(registry.getRegisteredModules()[0]).toBe(navThemeModule);
    expect(navThemeModule.selector).toBe('[data-module="nav-theme"]');
  });

  it("toggles nav--theme-<x> when a themed section becomes active", async () => {
    const { navThemeModule } = await import("./nav");
    const root = document.createElement("div");
    root.innerHTML = `<section data-nav-theme="light">hero</section>`;
    document.body.append(root);

    navThemeModule.mount(root, {} as never);
    const nav = document.querySelector("[data-nav]") as HTMLElement;

    const sectionTrigger = createdTriggers.at(-1) as FakeScrollTrigger;
    fireToggle(sectionTrigger, true);

    expect(nav.classList.contains("nav--theme-light")).toBe(true);
    expect(nav.classList.contains("nav--theme-dark")).toBe(false);
  });

  it("applies the theme immediately when a section is already active on mount", async () => {
    nextIsActive = true;
    const { navThemeModule } = await import("./nav");
    const root = document.createElement("div");
    root.innerHTML = `<section data-nav-theme="scent">gallery</section>`;
    document.body.append(root);

    navThemeModule.mount(root, {} as never);
    const nav = document.querySelector("[data-nav]") as HTMLElement;

    expect(nav.classList.contains("nav--theme-scent")).toBe(true);
  });

  it("is transparent while the hero is under the bar, solid once it passes (§5.2)", async () => {
    nextIsActive = true;
    const { navThemeModule } = await import("./nav");
    const root = document.createElement("div");
    root.innerHTML = `<section data-nav-theme="dark" data-nav-transparent>hero</section>`;
    document.body.append(root);

    navThemeModule.mount(root, {} as never);
    const nav = document.querySelector("[data-nav]") as HTMLElement;
    const solidTrigger = createdTriggers[0];

    // Hero under the bar → transparent.
    expect(nav.classList.contains("nav--solid")).toBe(false);

    // Hero scrolled past → solid.
    fireToggle(solidTrigger, false);
    expect(nav.classList.contains("nav--solid")).toBe(true);

    fireToggle(solidTrigger, true);
    expect(nav.classList.contains("nav--solid")).toBe(false);
  });

  it("is solid from the start on routes with no hero (review OSV-07)", async () => {
    const { navThemeModule } = await import("./nav");
    const root = document.createElement("div");
    root.innerHTML = `<section data-nav-theme="dark">plp</section>`;
    document.body.append(root);

    navThemeModule.mount(root, {} as never);
    const nav = document.querySelector("[data-nav]") as HTMLElement;

    expect(nav.classList.contains("nav--solid")).toBe(true);
    // No hero → no solid trigger, only the one section theme trigger.
    expect(createdTriggers).toHaveLength(1);
  });

  it("destroy() kills only the triggers it created", async () => {
    const { navThemeModule } = await import("./nav");
    const root = document.createElement("div");
    root.innerHTML = `
      <section data-nav-theme="dark" data-nav-transparent>a</section>
      <section data-nav-theme="light">b</section>
    `;
    document.body.append(root);

    navThemeModule.mount(root, {} as never);
    expect(createdTriggers).toHaveLength(3); // solid + 2 sections

    navThemeModule.destroy();
    createdTriggers.forEach((trigger) => {
      expect(trigger.kill).toHaveBeenCalledTimes(1);
    });
  });

  it("does nothing when no [data-nav] element exists yet", async () => {
    document.body.innerHTML = "";
    const { navThemeModule } = await import("./nav");
    const root = document.createElement("div");

    expect(() => navThemeModule.mount(root, {} as never)).not.toThrow();
    expect(scrollTriggerCreate).not.toHaveBeenCalled();
  });
});
