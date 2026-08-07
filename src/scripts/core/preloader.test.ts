import { beforeEach, describe, expect, it, vi } from "vitest";

const transitionOut = vi.fn(
  (onHalfway?: () => void) =>
    new Promise<void>((resolve) => {
      onHalfway?.();
      resolve();
    }),
);

vi.mock("./transition", () => ({
  transition: { out: transitionOut },
}));

function setMatchMedia(matches: boolean): void {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as never;
}

function markup(): void {
  document.body.innerHTML = `
    <div data-preloader>
      <p class="preloader__label">decanting…</p>
      <p data-preloader-count>0%</p>
    </div>
  `;
}

describe("core/preloader", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    sessionStorage.clear();
    setMatchMedia(false);
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
  });

  it("removes itself and never shows twice in the same session", async () => {
    markup();
    sessionStorage.setItem("osvant:preloader-shown", "true");
    const { preloader } = await import("./preloader");

    await preloader.run();

    expect(document.querySelector("[data-preloader]")).toBeNull();
    expect(transitionOut).not.toHaveBeenCalled();
  });

  it("does nothing if the preloader markup is absent", async () => {
    document.body.innerHTML = "";
    const { preloader } = await import("./preloader");

    await expect(preloader.run()).resolves.toBeUndefined();
  });

  it("gates on document.fonts.ready, updates the counter, and runs the wipe", async () => {
    markup();
    const { preloader } = await import("./preloader");

    await preloader.run();

    expect(sessionStorage.getItem("osvant:preloader-shown")).toBe("true");
    expect(transitionOut).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-preloader]")).toBeNull();
  });

  it("dispatches osvant:hero-reveal at the transition's halfway hook", async () => {
    markup();
    const handler = vi.fn();
    window.addEventListener("osvant:hero-reveal", handler);
    const { preloader } = await import("./preloader");

    await preloader.run();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("skips the wipe entirely under reduced motion (M §9)", async () => {
    markup();
    setMatchMedia(true);
    const { preloader } = await import("./preloader");

    await preloader.run();

    expect(transitionOut).not.toHaveBeenCalled();
    expect(document.querySelector("[data-preloader]")).toBeNull();
  });
});
