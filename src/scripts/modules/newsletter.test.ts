import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageContext } from "../core/registry";

const fromToMock = vi.fn();
const toMock = vi.fn();

vi.mock("gsap", () => ({
  default: { fromTo: fromToMock, to: toMock },
}));

const trackMock = vi.fn();

vi.mock("../core/track", () => ({
  track: trackMock,
}));

function fakeTween() {
  return { kill: vi.fn() };
}

function ctx(reducedMotion: boolean): PageContext {
  return {
    url: new URL("https://osvant.test/"),
    firstLoad: true,
    reducedMotion,
  };
}

function makeForm() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <form data-newsletter-form>
      <input type="email" name="email" />
      <button type="submit"><span data-btn-label>join</span></button>
      <p data-newsletter-msg hidden></p>
    </form>
    <p data-newsletter-success hidden>you're in the current.</p>
  `;
  document.body.append(wrap);
  return {
    form: wrap.querySelector<HTMLFormElement>("form")!,
    input: wrap.querySelector<HTMLInputElement>("input")!,
    msg: wrap.querySelector<HTMLElement>("[data-newsletter-msg]")!,
    success: wrap.querySelector<HTMLElement>("[data-newsletter-success]")!,
  };
}

function submit(form: HTMLFormElement) {
  form.dispatchEvent(new SubmitEvent("submit", { cancelable: true }));
}

describe("modules/newsletter (01 §5.5, 07 §3)", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    fromToMock.mockImplementation(fakeTween);
    toMock.mockImplementation(
      (_: unknown, vars: { onComplete?: () => void }) => {
        vars.onComplete?.();
        return fakeTween();
      },
    );
    document.body.innerHTML = "";
    window.history.replaceState({}, "", "/");
  });

  async function load() {
    const { createNewsletter } = await import("./newsletter");
    return createNewsletter();
  }

  it("empty submit → `required`, amber message below field, line pulses amber once (0.6s)", async () => {
    const module = await load();
    const { form, msg, input } = makeForm();
    module.mount(form, ctx(false));

    submit(form);

    expect(msg.hidden).toBe(false);
    expect(msg.textContent).toBe("required");
    expect(msg.classList.contains("newsletter-msg--error")).toBe(true);
    expect(fromToMock).toHaveBeenCalledWith(
      input,
      { borderBottomColor: "var(--color--amber)" },
      expect.objectContaining({ duration: 0.6 }),
    );
  });

  it("invalid email → `check your email`", async () => {
    const module = await load();
    const { form, input, msg } = makeForm();
    module.mount(form, ctx(false));

    input.value = "not-an-email";
    submit(form);

    expect(msg.textContent).toBe("check your email");
  });

  it("?demo=fail → `didn't send — try again.` after the mock latency (07 §3)", async () => {
    vi.useFakeTimers();
    window.history.replaceState({}, "", "/?demo=fail");
    const module = await load();
    const { form, input, msg } = makeForm();
    module.mount(form, ctx(false));

    input.value = "a@b.co";
    submit(form);
    vi.advanceTimersByTime(650);

    expect(msg.textContent).toBe("didn't send — try again.");
    expect(trackMock).not.toHaveBeenCalled();

    module.destroy();
    vi.useRealTimers();
  });

  it("success: UV pulse, input collapses, success message shows, newsletter_signup tracked (footer)", async () => {
    vi.useFakeTimers();
    const module = await load();
    const { form, input, success } = makeForm();
    module.mount(form, ctx(false));

    input.value = "a@b.co";
    submit(form);
    vi.advanceTimersByTime(650);

    expect(fromToMock).toHaveBeenCalledWith(
      input,
      { borderBottomColor: "var(--color--phosphor)" },
      expect.objectContaining({ duration: 0.6 }),
    );
    expect(toMock).toHaveBeenCalledWith(
      form,
      expect.objectContaining({ opacity: 0, height: 0, duration: 0.5 }),
    );
    expect(form.hidden).toBe(true); // via onComplete (mock runs it)
    expect(success.hidden).toBe(false);
    expect(trackMock).toHaveBeenCalledWith("newsletter_signup", {
      source: "footer",
    });

    module.destroy();
    vi.useRealTimers();
  });

  it("reduced motion: instant state swap — no pulse, no collapse tween (M §9)", async () => {
    vi.useFakeTimers();
    const module = await load();
    const { form, input, success } = makeForm();
    module.mount(form, ctx(true));

    input.value = "a@b.co";
    submit(form);
    vi.advanceTimersByTime(650);

    expect(fromToMock).not.toHaveBeenCalled();
    expect(toMock).not.toHaveBeenCalled();
    expect(form.hidden).toBe(true);
    expect(success.hidden).toBe(false);

    module.destroy();
    vi.useRealTimers();
  });

  it("destroy() unbinds submit and clears the pending timer (03-eng §4.1)", async () => {
    vi.useFakeTimers();
    const module = await load();
    const { form, input, msg } = makeForm();
    module.mount(form, ctx(false));
    module.destroy();

    input.value = "a@b.co";
    submit(form);
    vi.advanceTimersByTime(1000);

    expect(msg.hidden).toBe(true); // listener removed — nothing ran
    vi.useRealTimers();
  });
});
