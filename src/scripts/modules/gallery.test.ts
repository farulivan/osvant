import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageContext } from "../core/registry";

const fromMock = vi.fn();

vi.mock("gsap", () => ({
  default: { from: fromMock },
}));

const scrollTriggerCreate = vi.fn();
vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: { create: scrollTriggerCreate },
}));

const splitTextMock = vi.fn(function SplitTextMock() {
  return { chars: [], revert: vi.fn() };
});
vi.mock("gsap/SplitText", () => ({
  SplitText: splitTextMock,
}));

const trackMock = vi.fn();
vi.mock("../core/track", () => ({ track: trackMock }));

const sceneMock = {
  setProgress: vi.fn(),
  setPointer: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
};
type CreateGalleryScene =
  typeof import("../webgl/gallery-scene").createGalleryScene;
const createGallerySceneMock = vi.fn<CreateGalleryScene>(
  () => sceneMock as unknown as ReturnType<CreateGalleryScene>,
);
vi.mock("../webgl/gallery-scene", () => ({
  createGalleryScene: createGallerySceneMock,
}));

let approachCallback: IntersectionObserverCallback;
vi.stubGlobal(
  "IntersectionObserver",
  vi.fn().mockImplementation(function IntersectionObserverMock(
    cb: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    if (options?.rootMargin === "200%") approachCallback = cb;
    return { observe: vi.fn(), disconnect: vi.fn() };
  }),
);

const { gallery } = await import("./gallery");

function ctx(reducedMotion: boolean): PageContext {
  return {
    url: new URL("https://osvant.test/"),
    firstLoad: true,
    reducedMotion,
  };
}

function makeRoot(): HTMLElement {
  const root = document.createElement("section");
  root.setAttribute("data-module", "gallery");
  root.innerHTML = `
    <div data-gallery-stage>
      <canvas data-gallery-canvas></canvas>
      <p data-gallery-name>the volt</p>
      <a data-gallery-discover href="/collection/volt/">discover</a>
    </div>
    <ul data-gallery-fallback hidden>
      <li data-gallery-scent data-scent="volt" data-name="the volt" data-href="/collection/volt/"></li>
      <li data-gallery-scent data-scent="nocturne" data-name="the nocturne" data-href="/collection/nocturne/"></li>
    </ul>
  `;
  document.body.append(root);
  return root;
}

if (typeof window.WebGLRenderingContext === "undefined") {
  vi.stubGlobal("WebGLRenderingContext", function WebGLRenderingContext() {});
}

function stubWebGL(available: boolean): void {
  const original = HTMLCanvasElement.prototype.getContext;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function getContext(this: HTMLCanvasElement, type: string) {
      if (this.hasAttribute("data-gallery-canvas")) {
        return original.call(this, type);
      }
      return available ? ({} as RenderingContext) : null;
    },
  );
}

describe("modules/gallery (M §4.4, M §8/§9)", () => {
  beforeEach(() => {
    gallery.destroy(); // flush any cleanups leaked by a previous test
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("uses the static fallback when the WebGL probe fails (M §8)", () => {
    stubWebGL(false);
    const root = makeRoot();

    gallery.mount(root, ctx(false));

    const fallback = root.querySelector<HTMLElement>(
      "[data-gallery-fallback]",
    )!;
    const canvas = root.querySelector<HTMLCanvasElement>(
      "[data-gallery-canvas]",
    )!;
    expect(fallback.hidden).toBe(false);
    expect(canvas.hidden).toBe(true);
    expect(root.querySelector("[data-gallery-discover]")).toBeNull();
    expect(trackMock).toHaveBeenCalledWith("webgl_fallback", {
      reason: "probe",
    });
    expect(IntersectionObserver).not.toHaveBeenCalled();
  });

  it("uses the static fallback under reduced motion without tracking (M §9)", () => {
    stubWebGL(true);
    const root = makeRoot();

    gallery.mount(root, ctx(true));

    expect(
      root.querySelector<HTMLElement>("[data-gallery-fallback]")!.hidden,
    ).toBe(false);
    expect(trackMock).not.toHaveBeenCalled();
    expect(IntersectionObserver).not.toHaveBeenCalled();
  });

  it("lazy-boots the scene on approach and pins a 300% scrub with snap", async () => {
    stubWebGL(true);
    const root = makeRoot();
    const killMock = vi.fn();
    scrollTriggerCreate.mockReturnValue({ kill: killMock });

    gallery.mount(root, ctx(false));
    expect(createGallerySceneMock).not.toHaveBeenCalled();

    approachCallback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    await vi.waitFor(() => {
      expect(createGallerySceneMock).toHaveBeenCalledOnce();
    });

    expect(sceneMock.resize).toHaveBeenCalled();
    expect(sceneMock.start).toHaveBeenCalled();
    expect(scrollTriggerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: root,
        end: "+=300%",
        pin: true,
        scrub: true,
        snap: 1 / 1, // scents.length - 1 = 1 in the fixture
      }),
    );

    gallery.destroy();
    expect(killMock).toHaveBeenCalled();
    expect(sceneMock.dispose).toHaveBeenCalled();
  });

  it("swaps the scent name via SplitText on active change", async () => {
    stubWebGL(true);
    const root = makeRoot();
    scrollTriggerCreate.mockReturnValue({ kill: vi.fn() });

    gallery.mount(root, ctx(false));
    approachCallback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    await vi.waitFor(() => {
      expect(createGallerySceneMock).toHaveBeenCalledOnce();
    });

    const onActiveChange =
      createGallerySceneMock.mock.calls[0]?.[0].onActiveChange;
    onActiveChange?.(1);

    const nameEl = root.querySelector<HTMLElement>("[data-gallery-name]")!;
    expect(nameEl.textContent).toBe("the nocturne");
    expect(root.dataset.scent).toBe("nocturne");
    expect(
      root.querySelector<HTMLAnchorElement>("[data-gallery-discover]")!.href,
    ).toContain("/collection/nocturne/");
    expect(splitTextMock).toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalled();
  });

  it("does not boot the scene if destroyed during the lazy import", async () => {
    stubWebGL(true);
    const root = makeRoot();

    gallery.mount(root, ctx(false));
    approachCallback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    gallery.destroy();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sceneMock.dispose).not.toHaveBeenCalled();
    expect(scrollTriggerCreate).not.toHaveBeenCalled();
  });
});
