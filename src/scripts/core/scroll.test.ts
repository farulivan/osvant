import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const onMock = vi.fn();
const stopMock = vi.fn();
const startMock = vi.fn();
const scrollToMock = vi.fn();
const rafMock = vi.fn();

vi.mock("lenis", () => ({
  default: vi.fn().mockImplementation(function LenisMock() {
    return {
      on: onMock,
      stop: stopMock,
      start: startMock,
      scrollTo: scrollToMock,
      raf: rafMock,
    };
  }),
}));

const tickerAdd = vi.fn();
const lagSmoothing = vi.fn();
const registerPlugin = vi.fn();

vi.mock("gsap", () => ({
  default: {
    registerPlugin,
    ticker: { add: tickerAdd, lagSmoothing },
  },
}));

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: { update: vi.fn() },
}));

function mockReducedMotion(matches: boolean): void {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as (
    query: string,
  ) => MediaQueryList;
}

describe("core/scroll", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("wires Lenis into the gsap ticker when motion is not reduced (guide §6.1)", async () => {
    mockReducedMotion(false);

    await import("./scroll");

    expect(onMock).toHaveBeenCalledWith("scroll", expect.any(Function));
    expect(tickerAdd).toHaveBeenCalledTimes(1);
    expect(lagSmoothing).toHaveBeenCalledWith(0);
  });

  it("delegates stop/start/scrollTo to the Lenis instance", async () => {
    mockReducedMotion(false);
    const scroll = await import("./scroll");

    scroll.stop();
    scroll.start();
    scroll.scrollTo(100, { duration: 1 });

    expect(stopMock).toHaveBeenCalledTimes(1);
    expect(startMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith(100, { duration: 1 });
  });

  it("never creates Lenis under prefers-reduced-motion (M §9)", async () => {
    mockReducedMotion(true);
    const scroll = await import("./scroll");

    expect(tickerAdd).not.toHaveBeenCalled();

    scroll.stop();
    scroll.start();

    expect(stopMock).not.toHaveBeenCalled();
    expect(startMock).not.toHaveBeenCalled();
  });

  it("falls back to scrollIntoView for element targets under reduced motion", async () => {
    mockReducedMotion(true);
    const scroll = await import("./scroll");
    const el = document.createElement("div");
    const scrollIntoView = vi.fn();
    el.scrollIntoView = scrollIntoView;

    scroll.scrollTo(el);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto" });
    expect(scrollToMock).not.toHaveBeenCalled();
  });

  it("dispatches onFrame subscribers from the single ticker and unsubscribes cleanly", async () => {
    mockReducedMotion(false);
    const scroll = await import("./scroll");

    const cb = vi.fn();
    const unsubscribe = scroll.onFrame(cb);

    const tickerCallback = tickerAdd.mock.calls[0][0] as (
      time: number,
      deltaMs: number,
    ) => void;
    tickerCallback(1, 16);
    expect(cb).toHaveBeenCalledWith(1, 16);

    unsubscribe();
    tickerCallback(2, 16);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("velocity() reflects Lenis scroll events and stays 0 under reduced motion", async () => {
    mockReducedMotion(false);
    const scroll = await import("./scroll");
    expect(scroll.velocity()).toBe(0);

    const scrollHandler = onMock.mock.calls
      .map(([event, handler]) => ({ event, handler }))
      .filter(({ event }) => event === "scroll")
      .at(-1)?.handler as (e: { velocity: number }) => void;
    scrollHandler({ velocity: 120 });
    expect(scroll.velocity()).toBe(120);

    vi.resetModules();
    mockReducedMotion(true);
    const reduced = await import("./scroll");
    expect(reduced.velocity()).toBe(0);
  });

  it("falls back to window.scrollTo for numeric targets under reduced motion", async () => {
    mockReducedMotion(true);
    const scroll = await import("./scroll");
    const windowScrollTo = vi.fn();
    window.scrollTo = windowScrollTo;

    scroll.scrollTo(240);

    expect(windowScrollTo).toHaveBeenCalledWith({ top: 240 });
  });
});
