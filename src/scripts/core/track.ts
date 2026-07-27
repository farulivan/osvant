// core/track.ts — no-op analytics emitter (01-architecture.md §3.1, 07 §5,
// ADR-012: zero third-party scripts). Console table in dev + a
// `window.dataLayer` push always, so wiring a real vendor later is a
// one-function swap of this file's body — call sites never change.

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export function track(
  event: string,
  params: Record<string, unknown> = {},
): void {
  const payload = { event, ...params };

  if (import.meta.env.DEV) {
    console.table([payload]);
  }

  window.dataLayer ??= [];
  window.dataLayer.push(payload);
}
