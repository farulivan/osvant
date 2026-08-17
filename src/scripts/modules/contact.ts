// modules/contact.ts — contact form behavior (03 §6, 01 §5.5 line style,
// RFC-001 C3/C7).
//
// Mock relay (07 § integrations pattern — same shape as the newsletter
// mock): ~600ms simulated latency, `?demo=fail` forces the failure
// state. Validation per C3 verbatim — amber message at eyebrow size
// below the offending field, amber line on the input:
//   empty required    → `required`
//   malformed email   → `check your email`
//   submit failure    → `didn't send — try again.`
//   success           → `sent. we'll be in touch.` (form swaps out)
// A muted `demo — no message sent.` notice sits below the form so the
// mock never impersonates a real send (mirrors the newsletter demo
// notice).
//
// Reduced motion (M §9): no animations here — state swaps are instant
// either way.
// Lifecycle: listeners die in destroy() (03-eng §4.1).

import { registry, type PageModule } from "../core/registry";

const SELECTOR = "[data-contact-form]";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ContactState {
  el: HTMLElement;
  cleanups: Array<() => void>;
}

export function createContact(): PageModule {
  const states: ContactState[] = [];

  function showError(
    state: ContactState,
    field: string,
    message: string,
  ): void {
    const input = state.el.querySelector<HTMLInputElement>(
      `[data-field="${field}"]`,
    );
    const errorEl = state.el.querySelector<HTMLElement>(
      `[data-error-for="${field}"]`,
    );
    if (input) input.style.borderBottomColor = "var(--color--amber)";
    if (errorEl) errorEl.textContent = message;
  }

  function clearErrors(state: ContactState): void {
    for (const input of state.el.querySelectorAll<HTMLInputElement>(
      "[data-field]",
    )) {
      input.style.borderBottomColor = "";
    }
    for (const errorEl of state.el.querySelectorAll<HTMLElement>(
      "[data-error-for]",
    )) {
      errorEl.textContent = "";
    }
  }

  return {
    selector: SELECTOR,

    mount(el: HTMLElement): void {
      const state: ContactState = { el, cleanups: [] };
      const form = el as HTMLFormElement;
      const failMock =
        new URLSearchParams(window.location.search).get("demo") === "fail";

      const onSubmit = async (event: SubmitEvent) => {
        event.preventDefault();
        clearErrors(state);

        const name = form.querySelector<HTMLInputElement>(
          '[data-field="name"]',
        );
        const email = form.querySelector<HTMLInputElement>(
          '[data-field="email"]',
        );
        const message = form.querySelector<HTMLTextAreaElement>(
          '[data-field="message"]',
        );

        let valid = true;
        if (!name?.value.trim()) {
          showError(state, "name", "required");
          valid = false;
        }
        if (!email?.value.trim()) {
          showError(state, "email", "required");
          valid = false;
        } else if (!EMAIL_RE.test(email.value.trim())) {
          showError(state, "email", "check your email");
          valid = false;
        }
        if (!message?.value.trim()) {
          showError(state, "message", "required");
          valid = false;
        }
        if (!valid) return;

        const submit = form.querySelector<HTMLButtonElement>(
          "[data-contact-submit]",
        );
        if (submit) submit.disabled = true;

        await new Promise((resolve) => setTimeout(resolve, 600)); // mock latency

        if (failMock) {
          showError(state, "message", "didn't send — try again.");
          if (submit) submit.disabled = false;
          return;
        }

        const success = form.parentElement?.querySelector<HTMLElement>(
          "[data-contact-success]",
        );
        form.hidden = true;
        if (success) success.hidden = false;
      };

      form.addEventListener("submit", onSubmit);
      state.cleanups.push(() => form.removeEventListener("submit", onSubmit));

      states.push(state);
    },

    destroy(): void {
      const state = states.pop();
      if (!state) return;
      for (const cleanup of state.cleanups) cleanup();
    },
  };
}

export const contact: PageModule = createContact();
registry.registerModule(contact);
