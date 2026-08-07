import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageContext } from "../core/registry";

const timelineMock = vi.fn();
const fromMock = vi.fn();
const registerPlugin = vi.fn();

vi.mock("gsap", () => ({
  default: { registerPlugin, timeline: timelineMock, from: fromMock },
}));

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: {},
}));

const onFrameCallbacks: Array<() => void> = [];
const velocityMock = vi.fn();
const scrollToMock = vi.fn();

vi.mock("../core/scroll", () => ({
  onFrame: vi.fn((cb: () => void) => {
    onFrameCallbacks.push(cb);
    return () => {
      onFrameCallbacks.splice(onFrameCallbacks.indexOf(cb), 1);
    };
  }),
  velocity: velocityMock,
  scrollTo: scrollToMock,
}));

function fakeTimeline() {
  return {
    to: vi.fn(),
    kill: vi.fn(),
    scrollTrigger: { kill: vi.fn() },
  };
}

function ctx(reducedMotion: boolean): PageContext {
  return {
    url: new URL("https://osvant.test/"),
    firstLoad: true,
    reducedMotion,
  };
}

function makeHero(): HTMLElement {
  const el = document.createElement("section");
  el.innerHTML = `
    <div data-vapor></div>
    <a data-hero-chip href="/journal/">next drop</a>
    <p data-eyebrow>eau de parfum</p>
    <h1 data-anim="split">osvant</h1>
    <p data-hero-subline>scent beyond the visible</p>
    <button type="button" data-hero-cue><span data-btn-label>explore</span></button>
    <span data-hero-cue-line></span>
  `;
  document.body.append(el);
  return el;
}

describe("modules/home-hero (03 §1.2, M §4.10)", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    onFrameCallbacks.length = 0;
    velocityMock.mockReturnValue(0);
    timelineMock.mockImplementation(fakeTimeline);
    fromMock.mockImplementation(() => ({ kill: vi.fn() }));
    document.body.innerHTML = "";
  });

  async function load() {
    const { createHomeHero } = await import("./home-hero");
    return createHomeHero();
  }

  it("builds the M §4.10 scroll-out: scrubbed, no pin, ease none on all children", async () => {
    const module = await load();
    const el = makeHero();

    module.mount(el, ctx(false));

    expect(timelineMock).toHaveBeenCalledWith({
      scrollTrigger: {
        trigger: el,
        start: "top top",
        end: "+=100%",
        scrub: true,
      },
    });
    const timeline = timelineMock.mock.results[0].value as ReturnType<
      typeof fakeTimeline
    >;
    const toCalls = timeline.to.mock.calls;
    // title drifts + dims; eyebrow/subline exit early; vapor ramps to 1;
    // cue line scrubs scaleY — every child tween ease "none"
    expect(toCalls).toContainEqual([
      el.querySelector('[data-anim="split"]'),
      { yPercent: 30, opacity: 0.4, ease: "none" },
      0,
    ]);
    expect(toCalls).toContainEqual([
      el.querySelector("[data-eyebrow]"),
      { yPercent: -40, opacity: 0, ease: "none", duration: 0.4 },
      0,
    ]);
    expect(toCalls).toContainEqual([
      el.querySelector("[data-vapor]"),
      { opacity: 1, ease: "none" },
      0,
    ]);
    expect(toCalls).toContainEqual([
      el.querySelector("[data-hero-cue-line]"),
      { scaleY: 0, ease: "none", duration: 0.4 },
      0,
    ]);
    for (const [, vars] of toCalls) {
      expect(vars.ease).toBe("none");
    }

    module.destroy();
  });

  it("enters the next-drop chip last, 0.5s default register", async () => {
    const module = await load();
    const el = makeHero();

    module.mount(el, ctx(false));

    expect(fromMock).toHaveBeenCalledWith(
      el.querySelector("[data-hero-chip]"),
      expect.objectContaining({ opacity: 0, duration: 0.5, delay: 1.1 }),
    );

    module.destroy();
  });

  it("drives vapor intensity from scroll velocity (03 §1.2 acceptance)", async () => {
    const module = await load();
    const el = makeHero();
    const vapor = el.querySelector<HTMLElement>("[data-vapor]")!;

    module.mount(el, ctx(false));

    onFrameCallbacks[0]();
    const atRest = Number.parseFloat(vapor.style.opacity);
    expect(atRest).toBeCloseTo(0.35, 2);

    velocityMock.mockReturnValue(1500);
    onFrameCallbacks[0]();
    expect(Number.parseFloat(vapor.style.opacity)).toBeCloseTo(1, 2);

    module.destroy();
  });

  it("routes the below-fold cue through scroll.scrollTo, never raw window.scroll (M §4.1)", async () => {
    const module = await load();
    const el = makeHero();
    const doors = document.createElement("section");
    doors.id = "doors";
    document.body.append(doors);

    module.mount(el, ctx(false));
    el.querySelector<HTMLElement>("[data-hero-cue]")!.click();

    expect(scrollToMock).toHaveBeenCalledWith(doors);

    module.destroy();
  });

  it("reduced motion: no scrub timeline, no chip tween, no velocity loop (M §9)", async () => {
    const module = await load();
    const el = makeHero();

    module.mount(el, ctx(true));

    expect(timelineMock).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
    expect(onFrameCallbacks).toHaveLength(0);
  });

  it("destroy() kills timeline/trigger/tweens, unsubscribes, unbinds the cue (03-eng §4.1)", async () => {
    const module = await load();
    const el = makeHero();

    module.mount(el, ctx(false));
    module.destroy();

    const timeline = timelineMock.mock.results[0].value as ReturnType<
      typeof fakeTimeline
    >;
    expect(timeline.scrollTrigger.kill).toHaveBeenCalled();
    expect(timeline.kill).toHaveBeenCalled();
    expect(fromMock.mock.results[0].value.kill).toHaveBeenCalled();
    expect(onFrameCallbacks).toHaveLength(0);
  });
});
