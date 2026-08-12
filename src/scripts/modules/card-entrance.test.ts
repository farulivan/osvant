import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageContext } from "../core/registry";

const setMock = vi.fn();
const registerPlugin = vi.fn();
const batchMock = vi.fn();

vi.mock("gsap", () => ({
  default: { registerPlugin, set: setMock, to: vi.fn() },
}));

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: { batch: batchMock },
}));

function ctx(reducedMotion: boolean): PageContext {
  return {
    url: new URL("https://osvant.test/"),
    firstLoad: true,
    reducedMotion,
  };
}

describe("modules/card-entrance (01 §5.3, M §3)", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    batchMock.mockReturnValue([{ kill: vi.fn() }]);
    document.body.innerHTML = "";
  });

  async function load() {
    const { createCardEntrance } = await import("./card-entrance");
    return createCardEntrance();
  }

  it("hides cards on mount and batches them as one stagger group", async () => {
    const module = await load();
    const a = document.createElement("article");
    const b = document.createElement("article");
    document.body.append(a, b);

    module.mount(a, ctx(false));
    module.mount(b, ctx(false));

    expect(setMock).toHaveBeenCalledWith(a, { opacity: 0, y: 24 });
    expect(setMock).toHaveBeenCalledWith(b, { opacity: 0, y: 24 });
    expect(batchMock).toHaveBeenLastCalledWith(
      [a, b],
      expect.objectContaining({ start: "top 85%", once: true }),
    );

    module.destroy();
    module.destroy();
  });

  it("honors data-stagger override from the first card (03 §2 PLP: 0.05s)", async () => {
    const toMock = (await import("gsap")).default.to as ReturnType<
      typeof vi.fn
    >;
    const module = await load();
    const a = document.createElement("article");
    a.dataset.stagger = "0.05";
    document.body.append(a);

    module.mount(a, ctx(false));

    const batchConfig = batchMock.mock.calls.at(-1)?.[1] as {
      onEnter: (group: HTMLElement[]) => void;
    };
    batchConfig.onEnter([a]);
    expect(toMock).toHaveBeenCalledWith(
      [a],
      expect.objectContaining({ stagger: 0.05 }),
    );

    module.destroy();
  });

  it("reduced motion: no hiding, no batch — static final state (M §9)", async () => {
    const module = await load();
    const el = document.createElement("article");
    document.body.append(el);

    module.mount(el, ctx(true));

    expect(setMock).not.toHaveBeenCalled();
    expect(batchMock).not.toHaveBeenCalled();
  });

  it("destroy() kills batch triggers and clears inline props (03-eng §4.1)", async () => {
    const module = await load();
    const el = document.createElement("article");
    document.body.append(el);

    module.mount(el, ctx(false));
    module.destroy();

    const trigger = batchMock.mock.results.at(-1)?.value[0] as {
      kill: () => void;
    };
    expect(trigger.kill).toHaveBeenCalled();
    expect(setMock).toHaveBeenCalledWith(el, {
      clearProps: "opacity,transform",
    });
  });
});
