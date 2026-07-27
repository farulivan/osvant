/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    // Core singletons (task 1.4) touch window/document — jsdom throughout.
    environment: "jsdom",
  },
});
