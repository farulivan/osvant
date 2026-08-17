import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageContext } from "../core/registry";

const CTX: PageContext = {
  url: new URL("https://osvant.test/contact/"),
  firstLoad: true,
  reducedMotion: false,
};

function makeContact() {
  document.body.innerHTML = `
    <form data-contact-form novalidate>
      <input data-field="name" />
      <p data-error-for="name" role="status"></p>
      <input data-field="email" />
      <p data-error-for="email" role="status"></p>
      <textarea data-field="message"></textarea>
      <p data-error-for="message" role="status"></p>
      <button type="submit" data-contact-submit>send</button>
    </form>
    <p data-contact-success hidden role="status">sent. we'll be in touch.</p>
  `;
  return document.querySelector<HTMLFormElement>("[data-contact-form]")!;
}

function fill(
  form: HTMLFormElement,
  name = "a",
  email = "a@b.co",
  message = "hi",
): void {
  form.querySelector<HTMLInputElement>('[data-field="name"]')!.value = name;
  form.querySelector<HTMLInputElement>('[data-field="email"]')!.value = email;
  form.querySelector<HTMLTextAreaElement>('[data-field="message"]')!.value =
    message;
}

function submit(form: HTMLFormElement): void {
  form.dispatchEvent(new SubmitEvent("submit", { cancelable: true }));
}

describe("modules/contact (03 §6, 01 §5.5, RFC-001 C3)", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = "";
    history.replaceState(null, "", "/contact/");
  });

  async function load() {
    const { createContact } = await import("./contact");
    return createContact();
  }

  it("empty fields: `required` under each (C3 verbatim)", async () => {
    const module = await load();
    const form = makeContact();
    module.mount(form, CTX);

    submit(form);

    expect(form.querySelector('[data-error-for="name"]')!.textContent).toBe(
      "required",
    );
    expect(form.querySelector('[data-error-for="email"]')!.textContent).toBe(
      "required",
    );
    expect(form.querySelector('[data-error-for="message"]')!.textContent).toBe(
      "required",
    );
    expect(
      document.querySelector<HTMLElement>("[data-contact-success]")!.hidden,
    ).toBe(true);

    module.destroy();
  });

  it("malformed email: `check your email`, no submit", async () => {
    const module = await load();
    const form = makeContact();
    module.mount(form, CTX);
    fill(form, "a", "not-an-email", "hi");

    submit(form);

    expect(form.querySelector('[data-error-for="email"]')!.textContent).toBe(
      "check your email",
    );

    module.destroy();
  });

  it("success: form swaps out, `sent. we'll be in touch.` shows", async () => {
    vi.useFakeTimers();
    const module = await load();
    const form = makeContact();
    module.mount(form, CTX);
    fill(form);

    submit(form);
    await vi.runAllTimersAsync();

    expect(form.hidden).toBe(true);
    const success = document.querySelector<HTMLElement>(
      "[data-contact-success]",
    )!;
    expect(success.hidden).toBe(false);

    vi.useRealTimers();
    module.destroy();
  });

  it("?demo=fail: `didn't send — try again.`, form stays editable (C7)", async () => {
    vi.useFakeTimers();
    history.replaceState(null, "", "/contact/?demo=fail");
    const module = await load();
    const form = makeContact();
    module.mount(form, CTX);
    fill(form);

    submit(form);
    await vi.runAllTimersAsync();

    expect(form.querySelector('[data-error-for="message"]')!.textContent).toBe(
      "didn't send — try again.",
    );
    expect(form.hidden).toBe(false);
    expect(
      form.querySelector<HTMLButtonElement>("[data-contact-submit]")!.disabled,
    ).toBe(false);

    vi.useRealTimers();
    module.destroy();
  });

  it("destroy() removes the submit listener (03-eng §4.1)", async () => {
    const module = await load();
    const form = makeContact();
    module.mount(form, CTX);
    module.destroy();
    fill(form);

    submit(form);

    expect(form.querySelector('[data-error-for="name"]')!.textContent).toBe("");
    expect(
      document.querySelector<HTMLElement>("[data-contact-success]")!.hidden,
    ).toBe(true);
  });
});
