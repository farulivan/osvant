import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageContext } from "../core/registry";

const toMock = vi.fn();
const setMock = vi.fn();

vi.mock("gsap", () => ({
  default: { to: toMock, set: setMock },
}));

const onFrameCallbacks: Array<() => void> = [];
const velocityMock = vi.fn();

vi.mock("../core/scroll", () => ({
  onFrame: vi.fn((cb: () => void) => {
    onFrameCallbacks.push(cb);
    return () => {
      onFrameCallbacks.splice(onFrameCallbacks.indexOf(cb), 1);
    };
  }),
  velocity: velocityMock,
}));

const observeMock = vi.fn();
const disconnectMock = vi.fn();
let observerCallback: (entries: Array<{ isIntersecting: boolean }>) => void;

vi.stubGlobal(
  "IntersectionObserver",
  vi.fn().mockImplementation(function IntersectionObserverMock(
    cb: typeof observerCallback,
  ) {
    observerCallback = cb;
    return { observe: observeMock, disconnect: disconnectMock };
  }),
);

function fakeTween() {
  return {
    kill: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    timeScale: vi.fn(),
  };
}

function ctx(reducedMotion: boolean): PageContext {
  return {
    url: new URL("https://osvant.test/"),
    firstLoad: true,
    reducedMotion,
  };
}

function makeTrack(): HTMLElement {
  const el = document.createElement("div");
  const item = document.createElement("span");
  item.textContent = "fever — limited batch 001";
  el.append(item);
  document.body.append(el);
  return el;
}

describe("modules/marquee (M §4.7)", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    onFrameCallbacks.length = 0;
    velocityMock.mockReturnValue(0);
    toMock.mockImplementation(fakeTween);
    document.body.innerHTML = "";
  });

  async function load() {
    const { createMarquee } = await import("./marquee");
    return createMarquee();
  }

  it("duplicates content (aria-hidden) and loops xPercent -50, repeat -1, ease none, 35s", async () => {
    const module = await load();
    const el = makeTrack();

    module.mount(el, ctx(false));

    expect(el.children).toHaveLength(2);
    expect(el.children[1].getAttribute("aria-hidden")).toBe("true");
    expect(toMock).toHaveBeenCalledWith(
      el,
      expect.objectContaining({
        xPercent: -50,
        repeat: -1,
        ease: "none",
        duration: 35,
      }),
    );

    module.destroy();
  });

  it("scales timeScale 1–2.5 with scroll velocity and lerps back to 1", async () => {
    const module = await load();
    const el = makeTrack();
    module.mount(el, ctx(false));
    const tween = toMock.mock.results[0].value as ReturnType<typeof fakeTween>;

    onFrameCallbacks[0]();
    expect(tween.timeScale).toHaveBeenLastCalledWith(1); // at rest

    velocityMock.mockReturnValue(1000);
    for (let i = 0; i < 100; i++) onFrameCallbacks[0]();
    expect(tween.timeScale).toHaveBeenLastCalledWith(expect.closeTo(2.5, 1));

    velocityMock.mockReturnValue(0);
    for (let i = 0; i < 100; i++) onFrameCallbacks[0]();
    expect(tween.timeScale).toHaveBeenLastCalledWith(expect.closeTo(1, 1));

    module.destroy();
  });

  it("pauses off-viewport and resumes in-viewport (IntersectionObserver)", async () => {
    const module = await load();
    const el = makeTrack();
    module.mount(el, ctx(false));
    const tween = toMock.mock.results[0].value as ReturnType<typeof fakeTween>;

    observerCallback([{ isIntersecting: false }]);
    expect(tween.pause).toHaveBeenCalled();
    observerCallback([{ isIntersecting: true }]);
    expect(tween.play).toHaveBeenCalled();

    module.destroy();
  });

  it("reduced motion: static — no clone, no tween, no observer (M §9)", async () => {
    const module = await load();
    const el = makeTrack();

    module.mount(el, ctx(true));

    expect(el.children).toHaveLength(1);
    expect(toMock).not.toHaveBeenCalled();
    expect(observeMock).not.toHaveBeenCalled();
  });

  it("destroy() removes duplicated content, unsubscribes, disconnects, kills the loop (03-eng §4.1)", async () => {
    const module = await load();
    const el = makeTrack();

    module.mount(el, ctx(false));
    module.destroy();

    expect(el.children).toHaveLength(1);
    expect(onFrameCallbacks).toHaveLength(0);
    expect(disconnectMock).toHaveBeenCalled();
    const tween = toMock.mock.results[0].value as ReturnType<typeof fakeTween>;
    expect(tween.kill).toHaveBeenCalled();
    expect(setMock).toHaveBeenCalledWith(el, { clearProps: "transform" });
  });
});
