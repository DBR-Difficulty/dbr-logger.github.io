export function createEventBus() {
  const listeners = new Set();

  function emit(payload) {
    listeners.forEach((listener) => {
      listener(payload);
    });
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      return () => {};
    }

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function clear() {
    listeners.clear();
  }

  return {
    emit,
    subscribe,
    clear,
  };
}
