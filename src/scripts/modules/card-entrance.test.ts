import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageContext } from "../core/registry";

const setMock = vi.fn();
const toMock = vi.fn();
const registerPlugin = vi.fn();
const batchMock = vi.fn();

// Mounts are coalesced onto one gsap.ticker tick (never a bare rAF —
// guide §3 rule 3). The mock captures the scheduled callback so tests can
// flush it explicitly.
let scheduled: (() => void) | null = null;
const delayedCall = vi.fn((_delay: number, cb: () => void) => {
  scheduled = cb;
  return { kill: vi.fn() };
});

function flush(): void {
  const cb = scheduled;
  scheduled = null;
  cb?.();
}

vi.mock("gsap", () => ({
  default: { registerPlugin, set: setMock, to: toMock, delayedCall },
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

/** jsdom reports an all-zero rect, which reads as off-screen. */
function placeOnScreen(el: HTMLElement): void {
  el.getBoundingClientRect = () => ({ top: 10, bottom: 400 }) as DOMRect;
}

describe("modules/card-entrance (01 §5.3, M §3)", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    scheduled = null;
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
    flush();

    expect(setMock).toHaveBeenCalledWith(a, { opacity: 0, y: 24 });
    expect(setMock).toHaveBeenCalledWith(b, { opacity: 0, y: 24 });
    expect(batchMock).toHaveBeenLastCalledWith(
      [a, b],
      expect.objectContaining({ start: "top 85%", once: true }),
    );

    module.destroy();
    module.destroy();
  });

  it("coalesces every mount into ONE build so the group staggers together", async () => {
    const module = await load();
    const a = document.createElement("article");
    const b = document.createElement("article");
    document.body.append(a, b);

    module.mount(a, ctx(false));
    module.mount(b, ctx(false));

    // Nothing built yet — a per-mount build would batch [a] then [a, b].
    expect(batchMock).not.toHaveBeenCalled();

    flush();
    expect(batchMock).toHaveBeenCalledTimes(1);

    module.destroy();
    module.destroy();
  });

  it("plays on-screen cards immediately instead of on a trigger (OSV-06)", async () => {
    const module = await load();
    const visible = document.createElement("article");
    const below = document.createElement("article");
    placeOnScreen(visible);
    document.body.append(visible, below);

    module.mount(visible, ctx(false));
    module.mount(below, ctx(false));
    flush();

    // The visible card animates now...
    expect(toMock).toHaveBeenCalledWith(
      [visible],
      expect.objectContaining({ opacity: 1, y: 0 }),
    );
    // ...and only the off-screen one waits to be scrolled into.
    expect(batchMock).toHaveBeenLastCalledWith([below], expect.anything());

    module.destroy();
    module.destroy();
  });

  it("honors data-stagger override from the first card (03 §2 PLP: 0.05s)", async () => {
    const module = await load();
    const a = document.createElement("article");
    a.dataset.stagger = "0.05";
    document.body.append(a);

    module.mount(a, ctx(false));
    flush();

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
    flush();

    expect(setMock).not.toHaveBeenCalled();
    expect(batchMock).not.toHaveBeenCalled();
  });

  it("destroy() kills batch triggers and clears inline props (03-eng §4.1)", async () => {
    const module = await load();
    const el = document.createElement("article");
    document.body.append(el);

    module.mount(el, ctx(false));
    flush();
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
