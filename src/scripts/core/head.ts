// core/head.ts — head sync across taxi navigations (guide §8 trap #1).
//
// taxi swaps only `[data-taxi-view]`; everything in `<head>` is chrome and
// would otherwise keep the first-loaded page's metadata forever. Crawlers
// read the static HTML, so this is not an SEO mechanism — it keeps the
// live document honest for share-sheet/extension readers and for anyone
// inspecting the page mid-session.
//
// The synced nodes are marked with `data-*` attributes in BaseLayout, so
// this list and the layout stay mechanically paired.

/** [marker attribute, value attribute] for every element BaseLayout marks. */
const MARKED: ReadonlyArray<readonly [string, string]> = [
  ["data-meta-description", "content"],
  ["data-canonical", "href"],
  ["data-og-title", "content"],
  ["data-og-description", "content"],
  ["data-og-url", "content"],
  ["data-og-image", "content"],
  ["data-twitter-title", "content"],
  ["data-twitter-description", "content"],
  ["data-twitter-image", "content"],
];

const ROBOTS = 'meta[name="robots"]';
const JSON_LD = 'script[type="application/ld+json"]';

/** Replaces every `selector` node in `head` with the incoming document's. */
function replaceAll(head: Element, incoming: Document, selector: string): void {
  head.querySelectorAll(selector).forEach((node) => node.remove());
  incoming.head?.querySelectorAll(selector).forEach((node) => {
    head.append(node.cloneNode(true));
  });
}

/**
 * Copies the incoming page's metadata onto the live document head.
 * `title` stays the router's job — taxi already parses it for us.
 */
export function syncHead(incoming: Document | null | undefined): void {
  const head = document.head;
  // taxi always supplies a parsed Document, but an XML/fragment response
  // has no `.head` — sync nothing rather than half-syncing.
  if (!head || !incoming?.head) return;

  for (const [marker, attribute] of MARKED) {
    const target = head.querySelector(`[${marker}]`);
    const source = incoming.head.querySelector(`[${marker}]`);
    const value = source?.getAttribute(attribute);
    if (target && value !== null && value !== undefined) {
      target.setAttribute(attribute, value);
    }
  }

  // Presence-based, not value-based: `noindex` only exists on the error
  // routes, and PDPs are the only pages carrying Product JSON-LD — both
  // must disappear when navigating away.
  replaceAll(head, incoming, ROBOTS);
  replaceAll(head, incoming, JSON_LD);
}
