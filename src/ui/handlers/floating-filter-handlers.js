export function bindFloatingFilterHandlers({
  nodes, store, state, todayIso,
  getAxisValues, getAxisRangeValues, getAxisRangeMinGap,
  isAxisRangeMode, isDateAxisMode, isHoverNoneEnvironment,
  isNumericAxisMode, isRangeOnlyAxisMode, isTextAxisMode,
  getActiveAxisRange, getFloatingAxisSinglePointerIndex, getFloatingAxisRangePointerIndex,
  previewFloatingAxisSliderToIndex, previewFloatingAxisRangeToIndex,
  releaseFloatingAxisSinglePointerCapture, releaseFloatingAxisRangePointerCapture,
  updateFloatingRangeDisplay, updateFloatingSingleSliderDisplay,
  renderFloatingFilterShell, syncQueryScrollLockState, applyFiltersPreservingOverviewPosition,
  toggleFloatingFilter, clearFloatingAxisFilter, closeFloatingFilter,
  shouldScrollCatalogPanelUpward, scrollCatalogPanelIntoView,
  toggleDateSelectionMode, moveSingleDateFilterBy, toggleAxisRangeMode,
  commitFloatingAxisSliderShortcut, commitFloatingAxisRange, rememberFloatingAxisValue,
  shouldCloseFloatingFilterAfterSliderCommit, applyDifficultyFilters,
  isDateFilterInput, scheduleDateFilterCommitIfBlurred,
  applyTitleQueryFilter, applyDateFilter, isTitleQueryElement,
}) {
  const getActiveFilters = () => state.filterDraft ?? store.getSnapshot().filters;

  nodes.floatingAxisFilter.addEventListener("click", (event) => {
    event.stopPropagation();
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.closest("[data-floating-toggle]")) {
      event.stopPropagation();
      toggleFloatingFilter();
      return;
    }

    if (target.closest("[data-floating-clear]")) {
      event.preventDefault();
      event.stopPropagation();
      const activeFilters = getActiveFilters();
      clearFloatingAxisFilter();
      if (!isTextAxisMode(activeFilters.axisMode) && !isDateAxisMode(activeFilters.axisMode)) {
        closeFloatingFilter({ preserveScroll: !shouldScrollCatalogPanelUpward() });
      }
      return;
    }

    if (target.closest("[data-date-reset]")) {
      event.preventDefault();
      event.stopPropagation();
      state.pendingQueryBlurIntent = "clear";
      const { filters, dateDefaultRange } = store.getSnapshot();
      const nextDateFilters = filters.dateSelectionMode === "single"
        ? { dateSelectionMode: "single", dateSingle: dateDefaultRange?.dateEnd || todayIso() }
        : { dateSelectionMode: "range", ...dateDefaultRange };
      applyFiltersPreservingOverviewPosition({ axisMode: "date", axisValue: "", ...nextDateFilters }, { scrollToCatalog: false });
      return;
    }

    if (target.closest("[data-date-mode-toggle]")) {
      event.preventDefault();
      event.stopPropagation();
      toggleDateSelectionMode();
      return;
    }

    const dateShiftButton = target.closest("[data-date-single-shift]");
    if (dateShiftButton) {
      event.preventDefault();
      event.stopPropagation();
      moveSingleDateFilterBy(Number(dateShiftButton.dataset.dateSingleShift));
      return;
    }

    if (target.closest("[data-axis-range-toggle]")) {
      event.preventDefault();
      event.stopPropagation();
      toggleAxisRangeMode(getActiveFilters().axisMode);
    }
  });

  nodes.floatingAxisFilter.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const singleWrap = target.closest(".floating-filter-single-wrap");
    if (singleWrap instanceof HTMLElement) {
      event.preventDefault();
      const activeFilters = getActiveFilters();
      const slider = singleWrap.querySelector("input[data-axis-slider]");
      if (!(slider instanceof HTMLInputElement) || slider.disabled) {
        return;
      }

      state.floatingAxisSingleDragState = {
        axisMode: activeFilters.axisMode,
        sliderWrap: singleWrap,
        pointerId: event.pointerId,
      };
      singleWrap.setPointerCapture?.(event.pointerId);
      previewFloatingAxisSliderToIndex(activeFilters.axisMode, getFloatingAxisSinglePointerIndex(event, singleWrap));
      return;
    }

    const rangeWrap = target.closest(".floating-filter-range-wrap");
    if (rangeWrap instanceof HTMLElement) {
      event.preventDefault();
      const activeFilters = getActiveFilters();
      const range = state.floatingAxisRangePreviewMode === activeFilters.axisMode && state.floatingAxisRangePreviewValue
        ? state.floatingAxisRangePreviewValue
        : getActiveAxisRange(activeFilters);
      const pointerIndex = getFloatingAxisRangePointerIndex(event, rangeWrap);
      const handle = range.startIndex === range.endIndex
        ? "auto"
        : Math.abs(pointerIndex - range.startIndex) <= Math.abs(pointerIndex - range.endIndex) ? "start" : "end";
      state.floatingAxisRangeDragState = {
        axisMode: activeFilters.axisMode,
        handle,
        rangeWrap,
        pointerId: event.pointerId,
      };
      rangeWrap.setPointerCapture?.(event.pointerId);
      const activeHandle = previewFloatingAxisRangeToIndex(activeFilters.axisMode, pointerIndex, handle);
      if (activeHandle && !(handle === "auto" && pointerIndex === range.startIndex)) {
        state.floatingAxisRangeDragState.handle = activeHandle;
      }
      return;
    }

    if (target.closest("[data-axis-mode]")) {
      state.pendingQueryBlurIntent = "axis-mode";
      if (!isHoverNoneEnvironment() && performance.now() - state.lastUserScrollAt < 450) {
        event.preventDefault();
      }
      return;
    }

    state.pendingQueryBlurIntent = null;
  });

  nodes.floatingAxisFilter.addEventListener("pointermove", (event) => {
    if (state.floatingAxisSingleDragState) {
      event.preventDefault();
      const { axisMode, sliderWrap } = state.floatingAxisSingleDragState;
      previewFloatingAxisSliderToIndex(axisMode, getFloatingAxisSinglePointerIndex(event, sliderWrap));
      return;
    }

    if (!state.floatingAxisRangeDragState) {
      return;
    }

    event.preventDefault();
    const { axisMode, handle, rangeWrap } = state.floatingAxisRangeDragState;
    const pointerIndex = getFloatingAxisRangePointerIndex(event, rangeWrap);
    const range = state.floatingAxisRangePreviewMode === axisMode && state.floatingAxisRangePreviewValue
      ? state.floatingAxisRangePreviewValue
      : getActiveAxisRange({ ...getActiveFilters(), axisMode });
    const activeHandle = previewFloatingAxisRangeToIndex(axisMode, pointerIndex, handle);
    if (handle === "auto" && activeHandle && pointerIndex !== range.startIndex) {
      state.floatingAxisRangeDragState.handle = activeHandle;
    }
  });

  nodes.floatingAxisFilter.addEventListener("pointerup", (event) => {
    if (state.floatingAxisSingleDragState) {
      event.preventDefault();
      releaseFloatingAxisSinglePointerCapture();
      state.floatingAxisSingleDragState = null;
      const shouldScroll = shouldScrollCatalogPanelUpward();
      if (commitFloatingAxisSliderShortcut() && shouldScroll) {
        window.requestAnimationFrame(scrollCatalogPanelIntoView);
      }
      return;
    }

    if (state.floatingAxisRangeDragState) {
      event.preventDefault();
      releaseFloatingAxisRangePointerCapture();
      state.floatingAxisRangeDragState = null;
      const shouldScroll = shouldScrollCatalogPanelUpward();
      if (commitFloatingAxisRange() && shouldScroll) {
        window.requestAnimationFrame(scrollCatalogPanelIntoView);
      }
    }
  });

  nodes.floatingAxisFilter.addEventListener("pointercancel", (event) => {
    if (state.floatingAxisSingleDragState) {
      event.preventDefault();
      releaseFloatingAxisSinglePointerCapture();
      state.floatingAxisSingleDragState = null;
      state.floatingAxisPreviewMode = null;
      state.floatingAxisPreviewValue = null;
      renderFloatingFilterShell();
      return;
    }

    if (!state.floatingAxisRangeDragState) {
      return;
    }

    event.preventDefault();
    releaseFloatingAxisRangePointerCapture();
    state.floatingAxisRangeDragState = null;
    state.floatingAxisRangePreviewMode = null;
    state.floatingAxisRangePreviewValue = null;
    state.floatingAxisRangeShortcutPending = false;
    renderFloatingFilterShell();
  });

  nodes.floatingAxisFilter.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target instanceof HTMLInputElement
      && (target.hasAttribute("data-axis-range-start") || target.hasAttribute("data-axis-range-end"))
    ) {
      const activeFilters = getActiveFilters();
      const axisValues = getAxisRangeValues(state.latestFilterBounds, activeFilters.axisMode);
      const currentRange = state.floatingAxisRangePreviewMode === activeFilters.axisMode && state.floatingAxisRangePreviewValue
        ? state.floatingAxisRangePreviewValue
        : getActiveAxisRange(activeFilters);
      const minGap = getAxisRangeMinGap(activeFilters.axisMode);
      let startIndex = currentRange.startIndex;
      let endIndex = currentRange.endIndex;

      if (target.hasAttribute("data-axis-range-start")) {
        startIndex = Math.min(Number(target.value), endIndex - minGap);
        state.floatingAxisRangeActiveHandleByAxis[activeFilters.axisMode] = "start";
      } else {
        endIndex = Math.max(Number(target.value), startIndex + minGap);
        state.floatingAxisRangeActiveHandleByAxis[activeFilters.axisMode] = "end";
      }

      const nextRange = {
        start: String(axisValues[startIndex] ?? ""),
        end: String(axisValues[endIndex] ?? ""),
        startIndex,
        endIndex,
        valid: axisValues.length > 0,
      };
      state.floatingAxisRangePreviewMode = activeFilters.axisMode;
      state.floatingAxisRangePreviewValue = nextRange;
      state.floatingAxisRangeShortcutPending = true;
      updateFloatingRangeDisplay(activeFilters.axisMode, nextRange);
      return;
    }

    if (target instanceof HTMLInputElement && target.hasAttribute("data-axis-slider")) {
      const activeFilters = getActiveFilters();
      const sliderStops = ["", ...getAxisValues(state.latestFilterBounds, activeFilters.axisMode)];
      const index = Number(target.value);
      const nextValue = sliderStops[index] ?? "";
      const previewValue = nextValue === "" ? "" : String(nextValue);

      state.floatingAxisPreviewMode = activeFilters.axisMode;
      state.floatingAxisPreviewValue = previewValue;
      updateFloatingSingleSliderDisplay(activeFilters.axisMode, Number.isFinite(index) ? index : 0, previewValue);
      return;
    }

    if (target instanceof HTMLInputElement && target.hasAttribute("data-axis-query")) {
      state.floatingQuerySelection = {
        start: target.selectionStart ?? target.value.length,
        end: target.selectionEnd ?? target.value.length,
      };
    }
  });

  nodes.floatingAxisFilter.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target instanceof HTMLInputElement
      && (target.hasAttribute("data-axis-range-start") || target.hasAttribute("data-axis-range-end"))
    ) {
      commitFloatingAxisRange();
      return;
    }

    if (target instanceof HTMLInputElement && target.hasAttribute("data-axis-slider")) {
      const activeFilters = getActiveFilters();
      const committedValue = state.floatingAxisPreviewMode === activeFilters.axisMode
        ? state.floatingAxisPreviewValue
        : ["", ...getAxisValues(state.latestFilterBounds, activeFilters.axisMode)][Number(target.value)] ?? "";
      const nextAxisValue = committedValue === "" ? "" : String(committedValue);
      rememberFloatingAxisValue(activeFilters.axisMode, nextAxisValue);
      state.floatingAxisPreviewMode = null;
      state.floatingAxisPreviewValue = null;
      if (shouldCloseFloatingFilterAfterSliderCommit()) {
        state.floatingQueryFocused = false;
        state.floatingFilterOpen = false;
        syncQueryScrollLockState();
      }
      applyDifficultyFilters({ axisValue: nextAxisValue });
      return;
    }

    if (target instanceof HTMLInputElement && target.hasAttribute("data-axis-query")) {
      state.floatingQuerySelection = {
        start: target.selectionStart ?? target.value.length,
        end: target.selectionEnd ?? target.value.length,
      };
      return;
    }

    if (isDateFilterInput(target)) {
      scheduleDateFilterCommitIfBlurred();
      return;
    }

    if (target instanceof HTMLSelectElement && target.hasAttribute("data-axis-mode")) {
      const nextAxisMode = target.value;
      if (state.floatingAxisModeCommitTimer !== null) {
        window.clearTimeout(state.floatingAxisModeCommitTimer);
        state.floatingAxisModeCommitTimer = null;
      }

      state.floatingAxisModeCommitTimer = window.setTimeout(() => {
        state.floatingAxisModeCommitTimer = null;
        state.pendingQueryBlurIntent = null;
        state.floatingAxisPreviewMode = null;
        state.floatingAxisPreviewValue = null;
        state.floatingQueryFocused = false;
        syncQueryScrollLockState();
        const currentFilters = store.getSnapshot().filters;
        const nextAxisFilters = { axisMode: nextAxisMode };
        if (isRangeOnlyAxisMode(nextAxisMode)) {
          nextAxisFilters.axisRangeModeByAxis = {
            ...currentFilters.axisRangeModeByAxis,
            [nextAxisMode]: true,
          };
        }
        if (isNumericAxisMode(nextAxisMode) && isAxisRangeMode({ ...currentFilters, axisMode: nextAxisMode })) {
          const axisValues = getAxisRangeValues(state.latestFilterBounds, nextAxisMode);
          const rawRange = currentFilters.axisRanges?.[nextAxisMode] ?? { start: "", end: "" };
          const startIndex = axisValues.findIndex((value) => String(value) === String(rawRange.start));
          const endIndex = axisValues.findIndex((value) => String(value) === String(rawRange.end));
          if (axisValues.length && (startIndex < 0 || endIndex < 0 || startIndex > endIndex)) {
            nextAxisFilters.axisRanges = {
              ...currentFilters.axisRanges,
              [nextAxisMode]: {
                start: String(axisValues[0]),
                end: String(axisValues[axisValues.length - 1]),
              },
            };
          }
        }
        applyFiltersPreservingOverviewPosition(nextAxisFilters);
      }, 0);
    }
  });

  nodes.floatingAxisFilter.addEventListener("pointerup", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.hasAttribute("data-axis-slider")) {
      return;
    }

    const activeFilters = getActiveFilters();
    if (state.floatingAxisPreviewMode !== activeFilters.axisMode) {
      return;
    }

    const committedValue = state.floatingAxisPreviewMode === activeFilters.axisMode
      ? state.floatingAxisPreviewValue
      : ["", ...getAxisValues(state.latestFilterBounds, activeFilters.axisMode)][Number(target.value)] ?? "";
    const nextAxisValue = committedValue === "" ? "" : String(committedValue);
    if (String(nextAxisValue ?? "") !== String(activeFilters.axisValue ?? "")) {
      return;
    }

    rememberFloatingAxisValue(activeFilters.axisMode, nextAxisValue);
    state.floatingAxisPreviewMode = null;
    state.floatingAxisPreviewValue = null;
    if (shouldCloseFloatingFilterAfterSliderCommit()) {
      state.floatingQueryFocused = false;
      state.floatingFilterOpen = false;
      syncQueryScrollLockState();
    }
    applyDifficultyFilters({ axisValue: nextAxisValue });
  });

  nodes.floatingAxisFilter.addEventListener("search", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.hasAttribute("data-axis-query") || state.floatingQueryComposing) {
      return;
    }

    state.floatingQuerySelection = {
      start: target.selectionStart ?? target.value.length,
      end: target.selectionEnd ?? target.value.length,
    };
    if (target.value === "") {
      applyTitleQueryFilter(target, { keepFocus: true, scrollToCatalog: false });
    }
  });

  nodes.floatingAxisFilter.addEventListener("keydown", (event) => {
    const target = event.target;
    if (isDateFilterInput(target)) {
      state.dateFilterKeyboardEditUntil = performance.now() + 900;
      if (event.key === "Enter" && !event.isComposing) {
        target.blur();
      }
      return;
    }

    if (target instanceof HTMLInputElement
      && target.hasAttribute("data-axis-query")
      && event.key === "Enter"
      && !event.isComposing
      && !state.floatingQueryComposing
    ) {
      target.blur();
    }
  });

  nodes.floatingAxisFilter.addEventListener("compositionstart", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.hasAttribute("data-axis-query")) {
      state.floatingQueryComposing = true;
    }
  });

  nodes.floatingAxisFilter.addEventListener("focusin", (event) => {
    if (!isTitleQueryElement(event.target)) {
      return;
    }

    state.floatingQueryFocused = true;
    state.floatingQueryRestoreFocus = false;
    syncQueryScrollLockState();
  });

  nodes.floatingAxisFilter.addEventListener("focusout", (event) => {
    const target = event.target;
    if (!isTitleQueryElement(target)) {
      return;
    }

    window.requestAnimationFrame(() => {
      const activeElement = document.activeElement;
      syncQueryScrollLockState();
      if (isTitleQueryElement(activeElement)
        || (activeElement instanceof HTMLSelectElement && activeElement.hasAttribute("data-axis-mode"))
        || state.floatingQueryRestoreFocus
        || (event.relatedTarget instanceof HTMLElement && event.relatedTarget.closest("[data-floating-clear]"))
      ) {
        return;
      }

      if (state.pendingQueryBlurIntent === "clear" || state.pendingQueryBlurIntent === "escape") {
        state.pendingQueryBlurIntent = null;
        return;
      }

      applyTitleQueryFilter(target, { keepFocus: false, scrollToCatalog: false });
      closeFloatingFilter({ preserveScroll: false });
    });
  });

  nodes.floatingAxisFilter.addEventListener("focusout", (event) => {
    const target = event.target;
    if (!isDateFilterInput(target)) {
      return;
    }

    window.requestAnimationFrame(() => {
      if (isDateFilterInput(document.activeElement)) {
        return;
      }

      if (state.dateFilterCommitTimer !== null) {
        window.clearTimeout(state.dateFilterCommitTimer);
        state.dateFilterCommitTimer = null;
      }

      if (state.pendingQueryBlurIntent === "escape") {
        state.pendingQueryBlurIntent = null;
        return;
      }

      applyDateFilter();
    });
  });

  nodes.floatingAxisFilter.addEventListener("compositionend", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.hasAttribute("data-axis-query")) {
      state.floatingQueryComposing = false;
    }
  });
}
