import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageContext } from "./registry";

const scrollStop = vi.fn();
const scrollStart = vi.fn();
vi.mock("./scroll", () => ({
  stop: scrollStop,
  start: scrollStart,
}));

const transitionIn = vi.fn().mockResolvedValue(undefined);
const transitionOut = vi.fn().mockResolvedValue(undefined);
vi.mock("./transition", () => ({
  transition: {
    in: transitionIn,
    out: transitionOut,
    speed: vi.fn(),
  },
}));

const mountModules = vi.fn();
vi.mock("./registry", () => ({
  registry: { mountModules },
}));

const scrollTriggerRefresh = vi.fn();
const scrollTriggerGetAll = vi.fn().mockReturnValue([]);
vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: { refresh: scrollTriggerRefresh, getAll: scrollTriggerGetAll },
}));

interface ConstructorProps {
  content?: HTMLElement;
  page?: unknown;
  title?: string;
  wrapper?: unknown;
}

class MockRenderer {
  content: HTMLElement;
  title: string;

  constructor({ content, title }: ConstructorProps) {
    this.content = content ?? document.createElement("div");
    this.title = title ?? "";
  }

  onEnter(): void {}
  onEnterCompleted(): void {}
  onLeave(): void {}
  onLeaveCompleted(): void {}
  initialLoad(): void {}
}

class MockTransition {
  onLeave(): void {}
  onEnter(): void {}
}

class MockCore {
  options: {
    renderers: Record<string, typeof MockRenderer>;
    transitions: Record<string, typeof MockTransition>;
  };

  constructor(options: MockCore["options"]) {
    this.options = options;
  }
}

vi.mock("@unseenco/taxi", () => ({
  Core: MockCore,
  Renderer: MockRenderer,
  Transition: MockTransition,
}));

function mockReducedMotion(matches: boolean): void {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as (
    query: string,
  ) => MediaQueryList;
}

describe("core/router", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mountModules.mockResolvedValue([]);
    document.title = "";
    mockReducedMotion(false);
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  });

  it("registers OsvantRenderer/OsvantTransition as the default renderer and transition", async () => {
    const { initRouter } = await import("./router");
    const taxi = initRouter() as unknown as MockCore;

    expect(taxi.options.renderers.default).toBeDefined();
    expect(taxi.options.transitions.default).toBeDefined();
  });

  it("Renderer.onEnter syncs document.title and mounts modules with a firstLoad PageContext", async () => {
    const { initRouter } = await import("./router");
    const taxi = initRouter() as unknown as MockCore;
    const RendererClass = taxi.options.renderers.default;
    const content = document.createElement("div");

    const renderer = new RendererClass({ content, title: "Home" });
    renderer.onEnter();

    expect(document.title).toBe("Home");
    expect(mountModules).toHaveBeenCalledTimes(1);

    const [mountedRoot, ctx] = mountModules.mock.calls[0] as [
      HTMLElement,
      PageContext,
    ];
    expect(mountedRoot).toBe(content);
    expect(ctx.firstLoad).toBe(true);
    expect(ctx.fromUrl).toBeUndefined();
  });

  it("tracks fromUrl across successive onEnter calls (a fresh Renderer per page)", async () => {
    const { initRouter } = await import("./router");
    const taxi = initRouter() as unknown as MockCore;
    const RendererClass = taxi.options.renderers.default;

    new RendererClass({ title: "Home" }).onEnter();
    new RendererClass({ title: "Collection" }).onEnter();

    const [, secondCtx] = mountModules.mock.calls[1] as [
      HTMLElement,
      PageContext,
    ];
    expect(secondCtx.firstLoad).toBe(false);
    expect(secondCtx.fromUrl).toBeInstanceOf(URL);
  });

  it("onEnterCompleted refreshes ScrollTrigger once (trap #4)", async () => {
    const { initRouter } = await import("./router");
    const taxi = initRouter() as unknown as MockCore;
    const RendererClass = taxi.options.renderers.default;

    new RendererClass({}).onEnterCompleted();

    expect(scrollTriggerRefresh).toHaveBeenCalledTimes(1);
  });

  it("initialLoad calls onEnter + onEnterCompleted for the first visit", async () => {
    const { initRouter } = await import("./router");
    const taxi = initRouter() as unknown as MockCore;
    const RendererClass = taxi.options.renderers.default;

    new RendererClass({ title: "Home" }).initialLoad();

    expect(mountModules).toHaveBeenCalledTimes(1);
    expect(scrollTriggerRefresh).toHaveBeenCalledTimes(1);
  });

  it("Transition.onLeave stops scroll, plays transition.in(), then destroys mounted modules", async () => {
    const destroy = vi.fn();
    mountModules.mockResolvedValue([destroy]);

    const { initRouter } = await import("./router");
    const taxi = initRouter() as unknown as MockCore;
    const RendererClass = taxi.options.renderers.default;
    const TransitionClass = taxi.options.transitions.default;

    new RendererClass({ title: "Home" }).onEnter();
    await Promise.resolve();
    await Promise.resolve();

    const done = vi.fn();
    const transitionInstance = new TransitionClass();
    (
      transitionInstance as unknown as {
        onLeave: (props: {
          from: HTMLElement;
          trigger: string | false;
          done: () => void;
        }) => void;
      }
    ).onLeave({ from: document.createElement("div"), trigger: false, done });
    await Promise.resolve();
    await Promise.resolve();

    expect(scrollStop).toHaveBeenCalledTimes(1);
    expect(transitionIn).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(scrollTriggerGetAll).toHaveBeenCalled();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("Transition.onEnter plays transition.out(), restarts scroll, then resolves", async () => {
    const { initRouter } = await import("./router");
    const taxi = initRouter() as unknown as MockCore;
    const TransitionClass = taxi.options.transitions.default;
    const done = vi.fn();

    const transitionInstance = new TransitionClass();
    (
      transitionInstance as unknown as {
        onEnter: (props: {
          to: HTMLElement;
          trigger: string | false;
          done: () => void;
        }) => void;
      }
    ).onEnter({ to: document.createElement("div"), trigger: false, done });
    await Promise.resolve();
    await Promise.resolve();

    expect(transitionOut).toHaveBeenCalledTimes(1);
    expect(scrollStart).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("resets scroll to top on a normal nav but restores the saved position on popstate (trap #5)", async () => {
    const { initRouter } = await import("./router");
    const taxi = initRouter() as unknown as MockCore;
    const RendererClass = taxi.options.renderers.default;
    const TransitionClass = taxi.options.transitions.default;
    const windowScrollTo = vi.fn();
    window.scrollTo = windowScrollTo as unknown as typeof window.scrollTo;
    Object.defineProperty(window, "scrollY", {
      value: 420,
      configurable: true,
    });

    const transitionInstance = new TransitionClass();
    (
      transitionInstance as unknown as {
        onLeave: (props: {
          from: HTMLElement;
          trigger: string | false;
          done: () => void;
        }) => void;
      }
    ).onLeave({
      from: document.createElement("div"),
      trigger: "popstate",
      done: vi.fn(),
    });

    new RendererClass({ title: "Home" }).onEnter();

    expect(windowScrollTo).toHaveBeenCalledWith({ top: 420 });
  });
});
