/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    // No unit tests exist until the core runtime lands (M1 task 1.4).
    passWithNoTests: true,
  },
});
