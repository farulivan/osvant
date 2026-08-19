import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageContext } from "../core/registry";

const trackMock = vi.fn();
vi.mock("../core/track", () => ({ track: trackMock }));

const sceneMock = {
  drag: vi.fn(),
  setDragging: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
};
type CreateBottleScene =
  typeof import("../webgl/bottle-scene").createBottleScene;
const createBottleSceneMock = vi.fn<CreateBottleScene>(
  () => sceneMock as unknown as ReturnType<CreateBottleScene>,
);
vi.mock("../webgl/bottle-scene", () => ({
  createBottleScene: createBottleSceneMock,
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

const { pdpBottle } = await import("./pdp-bottle");

if (typeof window.WebGLRenderingContext === "undefined") {
  vi.stubGlobal("WebGLRenderingContext", function WebGLRenderingContext() {});
}

function ctx(reducedMotion: boolean): PageContext {
  return {
    url: new URL("https://osvant.test/collection/volt/"),
    firstLoad: true,
    reducedMotion,
  };
}

function makeRoot(): HTMLElement {
  const root = document.createElement("div");
  root.setAttribute("data-pdp-bottle", "");
  root.innerHTML = `
    <canvas data-bottle-canvas></canvas>
    <div data-bottle-fallback hidden></div>
  `;
  document.body.append(root);
  return root;
}

function stubWebGL(available: boolean): void {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() =>
    available ? ({} as RenderingContext) : null,
  );
}

function approach(): void {
  approachCallback(
    [{ isIntersecting: true } as IntersectionObserverEntry],
    {} as IntersectionObserver,
  );
}

describe("modules/pdp-bottle (03 §3.1, M §8/§9)", () => {
  beforeEach(() => {
    pdpBottle.destroy(); // flush cleanups leaked by a previous test
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("falls back to the static wash when the WebGL probe fails (M §8)", () => {
    stubWebGL(false);
    const root = makeRoot();

    pdpBottle.mount(root, ctx(false));

    expect(
      root.querySelector<HTMLElement>("[data-bottle-fallback]")!.hidden,
    ).toBe(false);
    expect(
      root.querySelector<HTMLCanvasElement>("[data-bottle-canvas]")!.hidden,
    ).toBe(true);
    expect(trackMock).toHaveBeenCalledWith("webgl_fallback", {
      reason: "probe",
      page: "pdp",
    });
  });

  it("boots the scene on approach with idle rotation on (default motion)", async () => {
    stubWebGL(true);
    const root = makeRoot();

    pdpBottle.mount(root, ctx(false));
    expect(createBottleSceneMock).not.toHaveBeenCalled();

    approach();
    await vi.waitFor(() => {
      expect(createBottleSceneMock).toHaveBeenCalledOnce();
    });

    expect(createBottleSceneMock.mock.calls[0]?.[0].idleRotation).toBe(true);
    expect(sceneMock.resize).toHaveBeenCalled();
    // Render loop starts only on visibility, not at boot (M §8)
    expect(sceneMock.start).not.toHaveBeenCalled();
  });

  it("keeps drag but stops idle rotation under reduced motion (M §9)", async () => {
    stubWebGL(true);
    const root = makeRoot();

    pdpBottle.mount(root, ctx(true));
    approach();
    await vi.waitFor(() => {
      expect(createBottleSceneMock).toHaveBeenCalledOnce();
    });

    expect(createBottleSceneMock.mock.calls[0]?.[0].idleRotation).toBe(false);
    // drag listeners still wired — scene boots, no fallback
    expect(
      root.querySelector<HTMLElement>("[data-bottle-fallback]")!.hidden,
    ).toBe(true);
  });

  it("maps pointer drags to scene rotation and toggles the dragging state", async () => {
    stubWebGL(true);
    const root = makeRoot();
    pdpBottle.mount(root, ctx(false));
    approach();
    await vi.waitFor(() => {
      expect(createBottleSceneMock).toHaveBeenCalledOnce();
    });

    const canvas = root.querySelector<HTMLCanvasElement>(
      "[data-bottle-canvas]",
    )!;
    canvas.setPointerCapture = vi.fn();
    canvas.hasPointerCapture = vi.fn(() => true);
    canvas.releasePointerCapture = vi.fn();

    canvas.dispatchEvent(
      new PointerEvent("pointerdown", { pointerId: 1, clientX: 100 }),
    );
    expect(sceneMock.setDragging).toHaveBeenCalledWith(true);

    canvas.dispatchEvent(
      new PointerEvent("pointermove", { pointerId: 1, clientX: 140 }),
    );
    expect(sceneMock.drag).toHaveBeenCalledWith(0.4); // 40px * 0.01 rad/px

    canvas.dispatchEvent(
      new PointerEvent("pointerup", { pointerId: 1, clientX: 140 }),
    );
    expect(sceneMock.setDragging).toHaveBeenCalledWith(false);
  });

  it("does not boot if destroyed during the lazy import, and disposes on destroy", async () => {
    stubWebGL(true);
    const root = makeRoot();

    pdpBottle.mount(root, ctx(false));
    approach();
    pdpBottle.destroy();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sceneMock.start).not.toHaveBeenCalled();
  });
});
