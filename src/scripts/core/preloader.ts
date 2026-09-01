// core/preloader.ts — the `decanting…` preloader (M §6). A core singleton
// (guide §6.3: "cart drawer + nav + preloader are core singletons, not page
// modules") — runs once per browser session, gated on real asset loads.
//
// Gated assets (M §6.2, RFC A2): the Mosvita woff2 cuts + `logo.riv` +
// `page-transition.riv` + hero `vapor.riv`. The three Rive assets are still
// CSS/SVG placeholders (06-asset-pipeline §1) with no network load of their
// own, so GATES only lists `document.fonts.ready` today — add the real
// Rive-load promises here the moment each `.riv` lands; nothing else in
// this module needs to change.
import { transition } from "./transition";

const SESSION_KEY = "osvant:preloader-shown";
const HARD_CAP_MS = 3000;
const FADE_MS = 300;

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const GATES: Array<() => Promise<unknown>> = [
  () => document.fonts?.ready ?? Promise.resolve(),
];

function getPreloader(): HTMLElement | undefined {
  return document.querySelector<HTMLElement>("[data-preloader]") ?? undefined;
}

function setPercent(el: HTMLElement, percent: number): void {
  const counter = el.querySelector<HTMLElement>("[data-preloader-count]");
  if (counter) counter.textContent = `${Math.round(percent)}%`;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function exit(el: HTMLElement): Promise<void> {
  el.style.transition = `opacity ${FADE_MS}ms`;
  el.style.opacity = "0";
  await wait(FADE_MS);

  // M §9: reduced motion drops the viewport wipe entirely — counter only.
  if (!reducedMotion()) {
    await transition.out(() => {
      // Hero reveal overlap hook (M §6.3) — consumed by the hero module (M2).
      window.dispatchEvent(new CustomEvent("osvant:hero-reveal"));
    });
  }

  el.remove();
}

async function run(): Promise<void> {
  const el = getPreloader();
  if (!el) return;

  if (sessionStorage.getItem(SESSION_KEY)) {
    el.remove();
    return;
  }
  sessionStorage.setItem(SESSION_KEY, "true");

  const total = GATES.length;
  let resolved = 0;

  const allGates = Promise.all(
    GATES.map((gate) =>
      gate().then(() => {
        resolved += 1;
        setPercent(el, (resolved / total) * 100);
      }),
    ),
  );

  await Promise.race([allGates, wait(HARD_CAP_MS)]);
  setPercent(el, 100);

  await exit(el);
}

export const preloader = { run };
