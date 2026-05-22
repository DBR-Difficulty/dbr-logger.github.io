const MODULE_VERSION = new URL(import.meta.url).search;

const { createStore: createCoreStore } = await import(`./store-core.js${MODULE_VERSION}`);

export function createStore() {
  return createCoreStore();
}
