import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageContext } from "../core/registry";

const fromToMock = vi.fn();
const registerPlugin = vi.fn();

vi.mock("gsap", () => ({
  default: { registerPlugin, fromTo: fromToMock },
}));

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: {},
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

describe("modules/media-parallax (M §4.5)", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    fromToMock.mockImplementation(fakeTween);
    document.body.innerHTML = "";
  });

  async function load() {
    const { createMediaParallax } = await import("./media-parallax");
    return createMediaParallax();
  }

  it("scrubs the image yPercent -12 → 0, scale 1.15 → 1, ease none", async () => {
    const module = await load();
    const mask = document.createElement("div");
    const img = document.createElement("img");
    mask.append(img);
    document.body.append(mask);

    module.mount(mask, ctx(false));

    expect(fromToMock).toHaveBeenCalledWith(
      img,
      { yPercent: -12, scale: 1.15 },
      expect.objectContaining({
        yPercent: 0,
        scale: 1,
        ease: "none",
        scrollTrigger: expect.objectContaining({ trigger: mask, scrub: true }),
      }),
    );

    module.destroy();
  });

  it("targets the element itself when the marker is on the media", async () => {
    const module = await load();
    const img = document.createElement("img");
    document.body.append(img);

    module.mount(img, ctx(false));

    expect(fromToMock).toHaveBeenCalledWith(
      img,
      expect.anything(),
      expect.anything(),
    );

    module.destroy();
  });

  it("reduced motion: no scrub trigger is created (M §9)", async () => {
    const module = await load();
    const img = document.createElement("img");
    document.body.append(img);

    module.mount(img, ctx(true));

    expect(fromToMock).not.toHaveBeenCalled();
  });

  it("destroy() kills tween + ScrollTrigger (03-eng §4.1)", async () => {
    const module = await load();
    const img = document.createElement("img");
    document.body.append(img);

    module.mount(img, ctx(false));
    module.destroy();

    const tween = fromMock_result();
    expect(tween.scrollTrigger.kill).toHaveBeenCalled();
    expect(tween.kill).toHaveBeenCalled();
  });

  function fromMock_result() {
    return fromToMock.mock.results[0].value as ReturnType<typeof fakeTween>;
  }
});
