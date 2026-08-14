import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageContext } from "../core/registry";

const timelineMock = vi.fn();
const setMock = vi.fn();
const registerPlugin = vi.fn();

vi.mock("gsap", () => ({
  default: { registerPlugin, timeline: timelineMock, set: setMock },
}));

vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: {} }));

const splitTextMock = vi.fn(function () {
  return {
    chars: [] as Element[],
    revert: vi.fn(),
  };
});
vi.mock("gsap/SplitText", () => ({
  SplitText: splitTextMock,
}));

function fakeTimeline() {
  return {
    to: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    kill: vi.fn(),
    scrollTrigger: { kill: vi.fn() },
  };
}

function ctx(reducedMotion: boolean): PageContext {
  return {
    url: new URL("https://osvant.test/x"),
    firstLoad: false,
    reducedMotion,
  };
}

function makePyramid(rows = 3): HTMLElement {
  const el = document.createElement("section");
  for (let i = 0; i < rows; i++) {
    const row = document.createElement("div");
    row.setAttribute("data-pyramid-row", "");
    row.innerHTML = `
      <span data-pyramid-divider></span>
      <p data-pyramid-notes>note ${i}</p>
    `;
    el.append(row);
  }
  document.body.append(el);
  return el;
}

describe("modules/note-pyramid (M §4.6)", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    timelineMock.mockImplementation(fakeTimeline);
    document.body.innerHTML = "";
  });

  async function load() {
    const { createNotePyramid } = await import("./note-pyramid");
    return createNotePyramid();
  }

  it("each row: divider scaleX 0→1 (0.8s expo.out) then char cascade (0.015 stagger), chained at top 75%", async () => {
    const module = await load();
    const el = makePyramid();
    module.mount(el, ctx(false));

    expect(timelineMock).toHaveBeenCalledTimes(3);
    for (const call of timelineMock.mock.calls) {
      expect(call[0]).toEqual({
        scrollTrigger: expect.objectContaining({
          start: "top 75%",
          once: true,
        }),
      });
    }
    const rowTimeline = timelineMock.mock.results[0].value as ReturnType<
      typeof fakeTimeline
    >;
    expect(setMock).toHaveBeenCalledWith(expect.anything(), {
      scaleX: 0,
      transformOrigin: "left center",
    });
    expect(rowTimeline.to).toHaveBeenCalledWith(expect.anything(), {
      scaleX: 1,
      duration: 0.8,
      ease: "expo.out",
    });
    expect(rowTimeline.from).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ stagger: 0.015, yPercent: 110 }),
      ">",
    );

    module.destroy();
  });

  it("reduced motion: no timelines, no splits (M §9)", async () => {
    const module = await load();
    const el = makePyramid();
    module.mount(el, ctx(true));

    expect(timelineMock).not.toHaveBeenCalled();
    expect(splitTextMock).not.toHaveBeenCalled();
  });

  it("destroy() kills timelines/triggers and reverts splits", async () => {
    const module = await load();
    const el = makePyramid();
    module.mount(el, ctx(false));
    module.destroy();

    for (const result of timelineMock.mock.results) {
      const timeline = result.value as ReturnType<typeof fakeTimeline>;
      expect(timeline.scrollTrigger.kill).toHaveBeenCalled();
      expect(timeline.kill).toHaveBeenCalled();
    }
    for (const result of splitTextMock.mock.results) {
      expect(result.value.revert).toHaveBeenCalled();
    }
  });
});
