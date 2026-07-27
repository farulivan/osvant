import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fromToMock = vi.fn(
  (
    _el: unknown,
    _from: Record<string, unknown>,
    to: { onComplete?: () => void },
  ) => {
    to.onComplete?.();
  },
);
const toMock = vi.fn((_el: unknown, to: { onComplete?: () => void }) => {
  to.onComplete?.();
});
const setMock = vi.fn();

vi.mock("gsap", () => ({
  default: {
    fromTo: fromToMock,
    to: toMock,
    set: setMock,
  },
}));

function mockReducedMotion(matches: boolean): void {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as (
    query: string,
  ) => MediaQueryList;
}

describe("core/transition", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("creates a single fixed full-viewport scrim, appended once (RFC B4.2 placeholder)", async () => {
    mockReducedMotion(false);
    const { transition } = await import("./transition");

    await transition.in();
    await transition.out();

    expect(document.querySelectorAll("[data-transition-scrim]")).toHaveLength(
      1,
    );
  });

  it("wipes the scrim via clip-path on in() and out()", async () => {
    mockReducedMotion(false);
    const { transition } = await import("./transition");

    await transition.in();
    expect(fromToMock).toHaveBeenCalledWith(
      expect.anything(),
      { clipPath: "inset(0 0 100% 0)" },
      expect.objectContaining({ clipPath: "inset(0 0 0% 0)" }),
    );

    await transition.out();
    expect(fromToMock).toHaveBeenCalledWith(
      expect.anything(),
      { clipPath: "inset(0% 0 0 0)" },
      expect.objectContaining({ clipPath: "inset(100% 0 0 0)" }),
    );
  });

  it("uses a 0.3s opacity crossfade under reduced motion (M §9), never the wipe", async () => {
    mockReducedMotion(true);
    const { transition } = await import("./transition");

    await transition.in();
    expect(fromToMock).toHaveBeenCalledWith(
      expect.anything(),
      { opacity: 0 },
      expect.objectContaining({ opacity: 1, duration: 0.3 }),
    );

    await transition.out();
    expect(toMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ opacity: 0, duration: 0.3 }),
    );
  });

  it("speed(n) shortens the wipe duration proportionally", async () => {
    mockReducedMotion(false);
    const { transition } = await import("./transition");

    transition.speed(2);
    await transition.in();

    const lastCall = fromToMock.mock.calls.at(-1);
    const toVars = lastCall?.[2] as { duration: number };
    expect(toVars.duration).toBeCloseTo(0.4);
  });

  it("fires the onHalfway hook at roughly half of out()'s duration (guide §6.5)", async () => {
    vi.useFakeTimers();
    mockReducedMotion(false);
    const { transition } = await import("./transition");
    const onHalfway = vi.fn();

    const promise = transition.out(onHalfway);
    expect(onHalfway).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(onHalfway).toHaveBeenCalledTimes(1);

    await promise;
  });
});
