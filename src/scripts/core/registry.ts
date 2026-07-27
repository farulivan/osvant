// core/registry.ts — PageModule contract + module registry
// (00-implementation-guide.md §6.2, 01-architecture.md §3.2).
//
// The router (task 1.5) scans the incoming taxi view for `[data-module]`,
// calls `mountModules` (nav-theme observer registers first, so it always
// mounts first — 01-arch §3.3), and calls the returned destroyers on leave.

export interface PageContext {
  url: URL;
  /** undefined on first load */
  fromUrl?: URL;
  firstLoad: boolean;
  /** matchMedia, evaluated at mount */
  reducedMotion: boolean;
}

export interface PageModule {
  /** '[data-module="<name>"]' */
  selector: string;
  mount(el: HTMLElement, ctx: PageContext): void | Promise<void>;
  /** MUST kill only what it created */
  destroy(): void;
}

export interface ModuleRegistry {
  registerModule(module: PageModule): void;
  getRegisteredModules(): readonly PageModule[];
  mountModules(root: ParentNode, ctx: PageContext): Promise<Array<() => void>>;
}

/**
 * Isolated registry instance — used directly in tests, and wrapped by the
 * `registry` singleton below for production use.
 */
export function createModuleRegistry(): ModuleRegistry {
  const modules: PageModule[] = [];

  function registerModule(module: PageModule): void {
    modules.push(module);
  }

  function getRegisteredModules(): readonly PageModule[] {
    return modules;
  }

  async function mountModules(
    root: ParentNode,
    ctx: PageContext,
  ): Promise<Array<() => void>> {
    const destroyers: Array<() => void> = [];

    for (const module of modules) {
      const elements = root.querySelectorAll<HTMLElement>(module.selector);

      for (const el of elements) {
        await module.mount(el, ctx);
        destroyers.push(() => module.destroy());
      }
    }

    return destroyers;
  }

  return { registerModule, getRegisteredModules, mountModules };
}

// The one module-scope registry every PageModule registers against (01-arch §3.1).
export const registry: ModuleRegistry = createModuleRegistry();
