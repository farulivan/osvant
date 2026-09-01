// modules/newsletter.ts — footer newsletter mock (01 §5.5 exactly,
// 07 §3, ADR-012 — zero network).
//
// Flow: validate → ~600ms simulated latency → state.
// - Validation errors (RFC C3/C7 copy, eyebrow-size, --color--amber, below
//   the field): empty → `required`; invalid email → `check your email`;
//   forced failure (?demo=fail) → `didn't send — try again.` Each error
//   pulses the field line amber once (0.6s — duration unspecified for the
//   amber pulse; matched to the spec'd phosphor success pulse, flagged).
// - Success: input collapses, line pulses phosphor once (0.6s, 01 §5.5),
//   message `you're in the current.` (display cut, peak tone) + muted
//   sub-line `demo — no list connected.` (07 §3), then
//   track("newsletter_signup", { source: "footer" }) (07 §5).
//
// Reduced motion (M §9): states swap instantly — no collapse, no pulse.
// Lifecycle: submit listener removed, timers cleared, tweens killed, DOM
// restored in destroy() (03-eng §4.1).

import gsap from "gsap";
import { track } from "../core/track";
import { registry, type PageContext, type PageModule } from "../core/registry";

const SELECTOR = "[data-newsletter-form]";
const MOCK_LATENCY_MS = 600; // 07 §3
const PULSE_SECONDS = 0.6; // 01 §5.5

interface NewsletterState {
  el: HTMLElement;
  onSubmit: (event: SubmitEvent) => void;
  timer: ReturnType<typeof setTimeout> | undefined;
  tweens: gsap.core.Tween[];
}

export function createNewsletter(): PageModule {
  const states: NewsletterState[] = [];

  function pulse(
    state: NewsletterState,
    line: HTMLElement,
    color: string,
    reducedMotion: boolean,
  ): void {
    if (reducedMotion) return;
    // A "pulse once" = fade from the accent back to the resting line color.
    state.tweens.push(
      gsap.fromTo(
        line,
        { borderBottomColor: color },
        {
          borderBottomColor: "var(--color--ink-3)",
          duration: PULSE_SECONDS,
          ease: "none",
          clearProps: "borderBottomColor",
        },
      ),
    );
  }

  function showError(
    state: NewsletterState,
    msg: HTMLElement,
    line: HTMLElement,
    text: string,
    reducedMotion: boolean,
  ): void {
    msg.textContent = text;
    msg.hidden = false;
    msg.classList.add("newsletter-msg--error");
    pulse(state, line, "var(--color--amber)", reducedMotion);
  }

  return {
    selector: SELECTOR,

    mount(el: HTMLElement, ctx: PageContext): void {
      const form = el as HTMLFormElement;
      const input = form.querySelector<HTMLInputElement>('input[type="email"]');
      const msg = form.querySelector<HTMLElement>("[data-newsletter-msg]");
      const success = form.parentElement?.querySelector<HTMLElement>(
        "[data-newsletter-success]",
      );

      const state: NewsletterState = {
        el: form,
        timer: undefined,
        tweens: [],
        onSubmit: (event) => {
          event.preventDefault();
          if (!input || !msg) return;
          msg.classList.remove("newsletter-msg--error");

          const value = input.value.trim();
          if (value === "") {
            showError(state, msg, input, "required", ctx.reducedMotion);
            return;
          }
          if (!input.checkValidity()) {
            showError(state, msg, input, "check your email", ctx.reducedMotion);
            return;
          }

          msg.hidden = true;
          state.timer = setTimeout(() => {
            if (
              new URLSearchParams(window.location.search).get("demo") === "fail"
            ) {
              showError(
                state,
                msg,
                input,
                "didn't send — try again.",
                ctx.reducedMotion,
              );
              return;
            }

            // Success (01 §5.5): line pulses phosphor once, input collapses,
            // serif-italic message + muted demo sub-line.
            pulse(state, input, "var(--color--phosphor)", ctx.reducedMotion);
            if (ctx.reducedMotion) {
              form.hidden = true;
              if (success) success.hidden = false;
            } else {
              state.tweens.push(
                gsap.to(form, {
                  opacity: 0,
                  height: 0,
                  duration: 0.5,
                  ease: "power2.inOut", // UI move register (M §2)
                  onComplete: () => {
                    form.hidden = true;
                    if (success) success.hidden = false;
                  },
                }),
              );
            }
            track("newsletter_signup", { source: "footer" });
          }, MOCK_LATENCY_MS);
        },
      };

      form.addEventListener("submit", state.onSubmit);
      states.push(state);
    },

    destroy(): void {
      const state = states.pop();
      if (!state) return;
      state.el.removeEventListener("submit", state.onSubmit);
      clearTimeout(state.timer);
      for (const tween of state.tweens) tween.kill();
    },
  };
}

export const newsletter: PageModule = createNewsletter();
registry.registerModule(newsletter);
