const MODULE_VERSION = new URL(import.meta.url).search;

const { createRenderer: createCoreRenderer } = await import(`./render-core.js${MODULE_VERSION}`);

export function createRenderer(store) {
  return createCoreRenderer(store);
}
