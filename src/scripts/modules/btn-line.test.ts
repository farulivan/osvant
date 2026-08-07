import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageContext } from "../core/registry";

const toMock = vi.fn();

vi.mock("gsap", () => ({
  default: { to: toMock },
}));

function ctx(reducedMotion: boolean): PageContext {
  return {
    url: new URL("https://osvant.test/"),
    firstLoad: true,
    reducedMotion,
  };
}

function makeButton(): { el: HTMLElement; label: HTMLElement } {
  const el = document.createElement("a");
  const label = document.createElement("span");
  label.setAttribute("data-btn-label", "");
  label.textContent = "discover";
  el.append(label);
  document.body.append(el);
  return { el, label };
}

describe("modules/btn-line (01 §5.1)", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    toMock.mockImplementation(() => ({ kill: vi.fn() }));
    document.body.innerHTML = "";
  });

  async function load() {
    const { createBtnLine } = await import("./btn-line");
    return createBtnLine();
  }

  it("clones the label (aria-hidden) and y-flips both on hover, 0.3s power2.out", async () => {
    const module = await load();
    const { el, label } = makeButton();

    module.mount(el, ctx(false));

    const clone = el.querySelector(".btn-line__label--clone");
    expect(clone).not.toBeNull();
    expect(clone?.getAttribute("aria-hidden")).toBe("true");
    expect(el.classList.contains("btn-line--ready")).toBe(true);

    el.dispatchEvent(new Event("mouseenter"));
    expect(toMock).toHaveBeenCalledWith(
      [label, clone],
      expect.objectContaining({
        yPercent: -100,
        duration: 0.3,
        ease: "power2.out",
      }),
    );

    el.dispatchEvent(new Event("mouseleave"));
    expect(toMock).toHaveBeenLastCalledWith(
      [label, clone],
      expect.objectContaining({ yPercent: 0, duration: 0.3 }),
    );

    module.destroy();
  });

  it("reduced motion: no clone, no listeners — CSS border hover only (M §9)", async () => {
    const module = await load();
    const { el } = makeButton();

    module.mount(el, ctx(true));

    expect(el.querySelector(".btn-line__label--clone")).toBeNull();
    el.dispatchEvent(new Event("mouseenter"));
    expect(toMock).not.toHaveBeenCalled();
  });

  it("destroy() removes the clone, unbinds listeners, kills tweens (03-eng §4.1)", async () => {
    const module = await load();
    const { el } = makeButton();

    module.mount(el, ctx(false));
    el.dispatchEvent(new Event("mouseenter"));
    module.destroy();

    expect(el.querySelector(".btn-line__label--clone")).toBeNull();
    expect(el.classList.contains("btn-line--ready")).toBe(false);
    el.dispatchEvent(new Event("mouseenter"));
    expect(toMock).toHaveBeenCalledTimes(1); // only the pre-destroy call
    expect(toMock.mock.results[0].value.kill).toHaveBeenCalled();
  });
});
