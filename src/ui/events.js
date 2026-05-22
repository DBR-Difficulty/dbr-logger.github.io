export function bindThemeToggle(button, {
  getCurrentTheme,
  applyTheme,
  persistTheme,
  syncThemeToggleButton,
}) {
  button?.addEventListener("click", () => {
    const nextTheme = getCurrentTheme() === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    persistTheme(nextTheme);
    syncThemeToggleButton(button, nextTheme);
  });
}

export function bindWindowResize(windowRef, onResize) {
  windowRef.addEventListener("resize", onResize);
}

export function bindNumberInputWheelGuard(documentRef) {
  documentRef.addEventListener("wheel", (event) => {
    const input = event.target.closest('input[type="number"]');
    if (!input || documentRef.activeElement !== input) {
      return;
    }

    event.preventDefault();
  }, { passive: false });
}

export function bindFloatingScroll(windowRef, onScroll) {
  windowRef.addEventListener("scroll", onScroll, { passive: true });
}
