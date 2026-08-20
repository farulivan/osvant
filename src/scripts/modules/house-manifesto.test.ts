import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageContext } from "../core/registry";

const timelineMock = {
  to: vi.fn(() => timelineMock),
  kill: vi.fn(),
};
const timelineFnMock = vi.fn(() => timelineMock);
const setMock = vi.fn();
vi.mock("gsap", () => ({
  default: {
    timeline: timelineFnMock,
    set: setMock,
    registerPlugin: vi.fn(),
  },
}));
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: {} }));

const splitTextMock = vi.fn(function SplitTextMock() {
  return { chars: [{}, {}, {}], revert: vi.fn() };
});
vi.mock("gsap/SplitText", () => ({ SplitText: splitTextMock }));

const { houseManifesto } = await import("./house-manifesto");

function ctx(reducedMotion: boolean): PageContext {
  return {
    url: new URL("https://osvant.test/the-house/"),
    firstLoad: true,
    reducedMotion,
  };
}

function makeRoot(): HTMLElement {
  const root = document.createElement("section");
  root.setAttribute("data-manifesto", "");
  root.innerHTML = `
    <p data-manifesto-line>statement one</p>
    <p data-manifesto-line>statement two</p>
    <p data-manifesto-line>statement three</p>
  `;
  document.body.append(root);
  return root;
}

describe("modules/house-manifesto (03 §4)", () => {
  beforeEach(() => {
    houseManifesto.destroy();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("builds a pinned, reversible scrub timeline (03 §4 acceptance)", () => {
    const root = makeRoot();
    houseManifesto.mount(root, ctx(false));

    expect(timelineFnMock).toHaveBeenCalledWith(
      expect.objectContaining({
        defaults: { ease: "none" },
        scrollTrigger: expect.objectContaining({
          trigger: root,
          start: "top top",
          scrub: true, // reversible — never triggered-once
          pin: true,
        }),
      }),
    );
  });

  it("splits each of the 3 statements and scrubs chars ink-3 → white", () => {
    const root = makeRoot();
    houseManifesto.mount(root, ctx(false));

    expect(splitTextMock).toHaveBeenCalledTimes(3);
    expect(setMock).toHaveBeenCalledTimes(3); // dim initial state per line
    expect(timelineMock.to).toHaveBeenCalledTimes(3); // one tween per line
  });

  it("creates nothing under reduced motion (M §9 — static lit state)", () => {
    const root = makeRoot();
    houseManifesto.mount(root, ctx(true));

    expect(timelineFnMock).not.toHaveBeenCalled();
    expect(splitTextMock).not.toHaveBeenCalled();
  });

  it("destroy kills the timeline and reverts the splits", () => {
    const root = makeRoot();
    houseManifesto.mount(root, ctx(false));

    houseManifesto.destroy();

    expect(timelineMock.kill).toHaveBeenCalled();
    for (const result of splitTextMock.mock.results) {
      expect(result.value.revert).toHaveBeenCalled();
    }
  });
});
