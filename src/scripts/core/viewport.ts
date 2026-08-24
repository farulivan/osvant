// core/viewport.ts — shared "is this already on screen?" test for entrance
// modules (review OSV-06 rule 1).
//
// An element that is fully visible but sitting at 20% opacity waiting for a
// scroll trigger does not read as a reveal; it reads as a rendering
// failure. Anything on screen when its module mounts plays immediately
// instead of waiting to be scrolled into.

/** True when the element's top edge is already inside the viewport. */
export function isOnScreen(el: Element): boolean {
  const { top, bottom } = el.getBoundingClientRect();
  return top < window.innerHeight && bottom > 0;
}
