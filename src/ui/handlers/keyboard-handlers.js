export function bindKeyboardHandlers({
  documentRef = document,
  nodes,
  store,
  axisShortcutKeys,
  getFloatingFilterOpen,
  getSelectedWorkspaceOpen,
  getFloatingDateShortcutPending,
  getFloatingAxisRangeShortcutPending,
  closeSelectedWorkspace,
  setPendingQueryBlurIntent,
  isTextAxisMode,
  isEscapeBlurTarget,
  isShortcutEditableTarget,
  getCatalogNumberShortcutIndex,
  selectCatalogSongByShortcut,
  previewFloatingDateBy,
  previewFloatingAxisRangeBy,
  previewFloatingAxisSliderBy,
  openFloatingFilterIfClosed,
  toggleFloatingFilter,
  switchFloatingAxisByShortcut,
  applyTitleQueryFilter,
  commitFloatingDateShortcut,
  commitFloatingAxisRange,
  commitFloatingAxisSliderShortcut,
}) {
  documentRef.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !event.isComposing) {
      const target = event.target;
      const shouldCloseSelectedWorkspace = getSelectedWorkspaceOpen();
      if (isEscapeBlurTarget(target)) {
        event.preventDefault();
        event.stopPropagation();
        setPendingQueryBlurIntent("escape");
        target.blur();
      }
      if (shouldCloseSelectedWorkspace) {
        event.preventDefault();
        event.stopPropagation();
        closeSelectedWorkspace();
      }
      return;
    }

    if (event.key === "Delete"
      && !event.repeat
      && !event.isComposing
      && !event.ctrlKey
      && !event.altKey
      && !event.metaKey
    ) {
      const target = event.target;
      if (target instanceof HTMLElement && isShortcutEditableTarget(target)) {
        return;
      }

      const { filters } = store.getSnapshot();
      if (!getFloatingFilterOpen() || !isTextAxisMode(filters.axisMode)) {
        return;
      }

      const queryInput = nodes.floatingAxisFilter.querySelector('input[data-axis-query]');
      if (!(queryInput instanceof HTMLInputElement)) {
        return;
      }

      event.preventDefault();
      queryInput.value = "";
      applyTitleQueryFilter(queryInput, { keepFocus: true, scrollToCatalog: false });
      return;
    }

    const shortcutKey = event.key.toLowerCase();
    const catalogShortcutIndex = getCatalogNumberShortcutIndex(event);

    if (catalogShortcutIndex >= 0
      && !event.repeat
      && !event.isComposing
      && !event.ctrlKey
      && !event.altKey
      && !event.metaKey
    ) {
      const target = event.target;
      if (target instanceof HTMLElement && isShortcutEditableTarget(target)) {
        return;
      }

      if (selectCatalogSongByShortcut(catalogShortcutIndex)) {
        event.preventDefault();
      }

      return;
    }

    if ((shortcutKey === "a" || shortcutKey === "d")
      && !event.isComposing
      && !event.ctrlKey
      && !event.altKey
      && !event.metaKey
    ) {
      const target = event.target;
      if (target instanceof HTMLElement && isShortcutEditableTarget(target)) {
        return;
      }

      const dateMoved = previewFloatingDateBy(shortcutKey === "a" ? -1 : 1, event.shiftKey ? "end" : "start");
      if (dateMoved) {
        openFloatingFilterIfClosed();
        event.preventDefault();
        return;
      }

      const rangeMoved = previewFloatingAxisRangeBy(shortcutKey === "a" ? -1 : 1, event.shiftKey ? "end" : "start");
      if (rangeMoved) {
        openFloatingFilterIfClosed();
        event.preventDefault();
        return;
      }

      const moved = previewFloatingAxisSliderBy(shortcutKey === "a" ? -1 : 1);
      if (!moved) {
        return;
      }

      openFloatingFilterIfClosed();
      event.preventDefault();
      return;
    }

    const axisShortcutMode = axisShortcutKeys[shortcutKey];

    if (event.repeat
      || event.isComposing
      || event.ctrlKey
      || event.altKey
      || event.metaKey
      || (shortcutKey !== "q" && !axisShortcutMode)
    ) {
      return;
    }

    const target = event.target;
    if (target instanceof HTMLElement && isShortcutEditableTarget(target)) {
      return;
    }

    event.preventDefault();

    if (shortcutKey === "q") {
      toggleFloatingFilter();
      return;
    }

    if (axisShortcutMode) {
      switchFloatingAxisByShortcut(axisShortcutMode);
    }
  });

  documentRef.addEventListener("keyup", (event) => {
    const shortcutKey = event.key.toLowerCase();
    if (shortcutKey !== "a" && shortcutKey !== "d") {
      return;
    }

    if (event.isComposing || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    if (getFloatingDateShortcutPending()) {
      commitFloatingDateShortcut();
      event.preventDefault();
      return;
    }

    if (getFloatingAxisRangeShortcutPending()) {
      commitFloatingAxisRange();
      event.preventDefault();
      return;
    }

    if (commitFloatingAxisSliderShortcut()) {
      event.preventDefault();
    }
  });
}
