// scripts/main.ts — the client entry, loaded once from BaseLayout.astro.
// Import order matters: nav-theme must register before any other
// PageModule (01-arch §3.3 "mount order: nav themes first").
import "./core/nav";
import { initRouter } from "./core/router";

initRouter();
