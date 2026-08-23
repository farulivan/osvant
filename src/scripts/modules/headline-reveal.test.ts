import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageContext } from "../core/registry";

const fromMock = vi.fn();
const registerPlugin = vi.fn();

vi.mock("gsap", () => ({
  default: { registerPlugin, from: fromMock },
}));

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: {},
}));

const splitInstances: Array<{ chars: string[]; revert: () => void }> = [];
const splitConstructor = vi.fn();

vi.mock("gsap/SplitText", () => ({
  SplitText: splitConstructor.mockImplementation(function SplitTextMock() {
    const instance = { chars: ["o", "s", "v", "a", "n", "t"], revert: vi.fn() };
    splitInstances.push(instance);
    return instance;
  }),
}));

function fakeTween() {
  return { kill: vi.fn(), scrollTrigger: { kill: vi.fn() } };
}

function ctx(reducedMotion: boolean): PageContext {
  return {
    url: new URL("https://osvant.test/"),
    firstLoad: true,
    reducedMotion,
  };
}

describe("modules/headline-reveal (M §4.2)", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    splitInstances.length = 0;
    fromMock.mockImplementation(fakeTween);
    document.body.innerHTML = "";
  });

  async function load() {
    const { createHeadlineReveal } = await import("./headline-reveal");
    return createHeadlineReveal();
  }

  it("splits chars/lines with the line-mask class and runs the M §4.2 recipe", async () => {
    const module = await load();
    const el = document.createElement("h1");
    document.body.append(el);

    module.mount(el, ctx(false));

    expect(splitConstructor).toHaveBeenCalledWith(el, {
      type: "words,chars,lines",
      linesClass: "line-mask",
      wordsClass: "split-word",
    });
    expect(fromMock).toHaveBeenCalledWith(
      splitInstances[0].chars,
      expect.objectContaining({
        yPercent: 110,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.02,
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      }),
    );

    module.destroy();
  });

  it("fades the paired eyebrow 0.4s, delayed 0.2s after chars start", async () => {
    const module = await load();
    const parent = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.setAttribute("data-eyebrow", "");
    const el = document.createElement("h1");
    parent.append(eyebrow, el);
    document.body.append(parent);

    module.mount(el, ctx(false));

    expect(fromMock).toHaveBeenCalledWith(
      eyebrow,
      expect.objectContaining({ opacity: 0, duration: 0.4, delay: 0.2 }),
    );

    module.destroy();
  });

  it("reduced motion: no SplitText, 0.3s opacity fade instead (M §9)", async () => {
    const module = await load();
    const el = document.createElement("h1");
    document.body.append(el);

    module.mount(el, ctx(true));

    expect(splitConstructor).not.toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith(
      el,
      expect.objectContaining({ opacity: 0, duration: 0.3 }),
    );
  });

  it("re-splits on debounced resize only before the reveal has played", async () => {
    vi.useFakeTimers();
    const module = await load();
    const el = document.createElement("h1");
    document.body.append(el);

    module.mount(el, ctx(false));
    expect(splitInstances).toHaveLength(1);

    window.dispatchEvent(new Event("resize"));
    vi.advanceTimersByTime(250);
    expect(splitInstances[0].revert).toHaveBeenCalledTimes(1);
    expect(splitInstances).toHaveLength(2);

    module.destroy();
    vi.useRealTimers();
  });

  it("destroy() kills tweens, ScrollTriggers, reverts the split, and unbinds resize (03-eng §4.1)", async () => {
    const module = await load();
    const parent = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.setAttribute("data-eyebrow", "");
    const el = document.createElement("h1");
    parent.append(eyebrow, el);
    document.body.append(parent);
    const removeSpy = vi.spyOn(window, "removeEventListener");

    module.mount(el, ctx(false));
    module.destroy();

    for (const call of fromMock.mock.results) {
      const tween = call.value as ReturnType<typeof fakeTween>;
      expect(tween.scrollTrigger.kill).toHaveBeenCalled();
      expect(tween.kill).toHaveBeenCalled();
    }
    expect(splitInstances[0].revert).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  it("supports multiple headings per page — each destroy() unwinds one mount", async () => {
    const module = await load();
    const first = document.createElement("h1");
    const second = document.createElement("h2");
    document.body.append(first, second);

    module.mount(first, ctx(false));
    module.mount(second, ctx(false));
    module.destroy();
    module.destroy();

    expect(splitInstances[0].revert).toHaveBeenCalled();
    expect(splitInstances[1].revert).toHaveBeenCalled();
  });
});
