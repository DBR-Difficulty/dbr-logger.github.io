const MODULE_VERSION = new URL(import.meta.url).search;

const { LAMP_OPTIONS } = await import(`../constants.js${MODULE_VERSION}`);
const { renderBpChart, renderScoreChart } = await import(`./chart.js${MODULE_VERSION}`);
const { todayIso } = await import(`../utils/date.js${MODULE_VERSION}`);
const { renderProposalButton } = await import(`./proposal.js${MODULE_VERSION}`);
const {
  renderCatalogSortOptions: renderCatalogSortOptionsComponent,
  renderDifficultyFilters: renderDifficultyFiltersComponent,
  renderFloatingAxisFilter: renderFloatingAxisFilterComponent,
} = await import(`./components/filter-panel.js${MODULE_VERSION}`);
const { renderHistory: renderHistoryComponent } = await import(`./components/history-table.js${MODULE_VERSION}`);
const { renderPagination: renderPaginationComponent } = await import(`./components/pagination.js${MODULE_VERSION}`);
const {
  renderCatalog: renderCatalogComponent,
  renderSelectedSong: renderSelectedSongComponent,
} = await import(`./components/song-list.js${MODULE_VERSION}`);
const { renderSummary: renderSummaryComponent } = await import(`./components/summary-cards.js${MODULE_VERSION}`);
const {
  clearEntryBpInputs: clearEntryBpInputsComponent,
  focusNextRecordFormField,
  getEntryBpValue: getEntryBpValueComponent,
  initializeRecordForm,
  limitNumberInput,
  loadEntryBpInputMode: loadEntryBpInputModeComponent,
  persistEntryBpInputMode: persistEntryBpInputModeComponent,
  syncEntryBpInputMode: syncEntryBpInputModeComponent,
  syncRecordFormWithSnapshot,
} = await import(`./components/record-form.js${MODULE_VERSION}`);
const {
  clearHeroButtonStates,
  collectRendererNodes,
  initializeRendererNodeClasses,
  lockHeroButtonsExcept,
  setButtonLoading,
  syncDifficultyImportButton,
  syncThemeToggleButton,
  updateSliderFill,
} = await import(`./dom.js${MODULE_VERSION}`);
const {
  RECOMMEND_OPTIONS,
  RECOMMEND_SORT_VALUES,
  CHART_DIFFICULTY_OPTIONS,
  CHART_SUFFIX_ORDER,
  DISPLAY_MODE_OPTIONS,
  SUMMARY_DISPLAY_MODE_OPTIONS,
  CATALOG_SORT_OPTIONS,
  SCORE_RANK_OPTIONS,
  SCORE_RANK_SUMMARY_OPTIONS,
  SCORE_RANK_FILTER_OPTIONS,
  SONG_DATA_FILTER_OPTIONS,
  SUMMARY_LAMP_DOUBLE_CLICK_MS,
  SUMMARY_LAMP_SWIPE_SOLO_THRESHOLD,
  THEME_STORAGE_KEY,
  ENTRY_BP_INPUT_MODE_STORAGE_KEY,
  SUMMARY_FILTERS_OPEN_STORAGE_KEY,
  ENTRY_BP_INPUT_MODES,
  AXIS_OPTIONS,
  AXIS_SHORTCUT_KEYS,
  HIDDEN_FLOATING_CLEAR_AXES,
  BPM_BUCKETS,
  BPM_RANGE_POINTS,
  VERSION_ORDER_VALUES,
  VERSION_LABELS,
  isTextAxisMode,
  isDateAxisMode,
  isNumericAxisMode,
  isRangeOnlyAxisMode,
  getSongDataFilterOption,
  isDifficultyTableStale,
  getCurrentTheme,
  persistTheme,
  loadSummaryFiltersOpen,
  persistSummaryFiltersOpen,
  applyTheme,
  parseKatateFilterValue,
  formatKatateFilterValue,
  getAxisLabel,
  getAxisValues,
  getAxisRangeValues,
  getBpmBucket,
  getBpmRangePoint,
  formatBpmRangeValue,
  formatAxisValue,
  formatDateRangeValue,
  isAxisRangeMode,
  hasAxisCandidate,
  getAxisRangeMinGap,
  getNormalizedAxisRange,
  formatAxisRangeValue,
  getHistoryDateNeighbor,
  summarizeAxisFilter,
  getEffectiveSummaryDisplayMode,
  findClosestValue,
  findValueIndex,
  getSummaryBandLampColor,
  getCardBandColor,
  getScoreRankSummaryLabel,
  bindCatalogHandlers,
  bindSummaryHandlers,
  bindFloatingOutsideHandlers,
  bindFloatingFilterHandlers,
  bindFloatingScroll,
  bindIoHandlers,
  bindKeyboardHandlers,
  bindNumberInputWheelGuard,
  bindRecordFormHandlers,
  bindSummaryFilterPanelHandlers,
  bindThemeToggle,
  bindWindowResize,
  createScrollController,
} = await import(`./handlers.js${MODULE_VERSION}`);

export function createRenderer(store) {
  let activeChartResizeFrame = null;
  let latestChartHistory = [];
  let latestScoreChartHistory = [];
  let latestFilterBounds = {
    level: { min: 0, max: 15, step: 0.01, values: [] },
    splv: { min: 1, max: 12, step: 1, values: [] },
    katate: { min: 11, max: 13, step: 0.1, values: [] },
    version: { min: 0, max: 0, step: 1, values: [] },
  };
  let latestHistoryDates = [];
  let latestVisibleCount = 0;
  let filterDraft = null;
  let appliedFilterSignature = "";
  let deferredFilterTimer = null;
  let deferredFilterRevision = 0;
  let pendingCatalogBottomLock = null;
  let floatingAxisModeCommitTimer = null;
  let dateFilterCommitTimer = null;
  let dateFilterKeyboardEditUntil = 0;
  let entryBpInputMode = loadEntryBpInputModeComponent();
  let entryFormDirty = false;
  let summaryFiltersOpen = loadSummaryFiltersOpen();
  let floatingFilterOpen = false;
  let floatingAxisPreviewMode = null;
  let floatingAxisPreviewValue = null;
  let floatingAxisRangePreviewMode = null;
  let floatingAxisRangePreviewValue = null;
  let floatingAxisShortcutPending = false;
  let floatingAxisRangeShortcutPending = false;
  let floatingDateShortcutPending = false;
  let floatingDatePreviewValue = null;
  let selectedWorkspaceOpen = false;
  let floatingAxisLastValues = {
    level: "",
    splv: "",
    katate: "",
    version: "",
    bpm: "",
  };
  let floatingAxisRangeActiveHandleByAxis = {
    level: "end",
    splv: "end",
    katate: "end",
    version: "end",
    bpm: "end",
  };
  let floatingQuerySelection = null;
  let floatingQueryComposing = false;
  let floatingQueryFocused = false;
  let floatingQueryRestoreFocus = false;
  let pendingQueryBlurIntent = null;
  let floatingAxisSingleDragState = null;
  let floatingAxisRangeDragState = null;
  let selectedWorkspaceDragState = null;
  let selectedWorkspaceBackgroundScrollY = null;
  let selectedWorkspaceScrollTop = 0;
  let selectedWorkspaceViewportHeight = window.visualViewport?.height ?? window.innerHeight;
  let lastScrollY = window.scrollY;
  let lastUserScrollAt = 0;
  let floatingDockSide = "bottom";
  let pendingCatalogBottomNextScroll = false;
  let scrollDirectionStreak = null;
  let scrollDirectionDistance = 0;
  let scrollDirectionTimestamp = 0;
  let isProgrammaticScroll = false;
  let suppressBottomDockState = false;

  function getScrollOffset() {
    return isMobileViewport() ? 68 : 78;
  }

  function getFloatingFilterInset() {
    return isMobileViewport() ? 14 : 16;
  }

  let scrollEntryPanelIntoView;
  let scrollCatalogPanelIntoView;

  function lockSelectedWorkspaceBackground() {
    if (!isMobileViewport() || selectedWorkspaceBackgroundScrollY !== null) {
      return;
    }

    selectedWorkspaceBackgroundScrollY = window.scrollY;
    document.body.style.setProperty("--selected-workspace-background-offset", `-${selectedWorkspaceBackgroundScrollY}px`);
    document.documentElement.classList.add("selected-workspace-scroll-lock");
    document.body.classList.add("selected-workspace-scroll-lock");
  }

  function unlockSelectedWorkspaceBackground() {
    if (selectedWorkspaceBackgroundScrollY === null) {
      return;
    }

    const restoreY = selectedWorkspaceBackgroundScrollY;
    selectedWorkspaceBackgroundScrollY = null;
    document.documentElement.classList.remove("selected-workspace-scroll-lock");
    document.body.classList.remove("selected-workspace-scroll-lock");
    document.body.style.removeProperty("--selected-workspace-background-offset");
    window.scrollTo(0, restoreY);
  }

  function handleSelectedWorkspaceViewportResize() {
    const nextHeight = window.visualViewport?.height ?? window.innerHeight;
    const viewportExpanded = nextHeight > selectedWorkspaceViewportHeight + 1;
    selectedWorkspaceViewportHeight = nextHeight;

    if (!selectedWorkspaceOpen || selectedWorkspaceBackgroundScrollY === null || !viewportExpanded || !nodes.selectedWorkspace) {
      return;
    }

    const restoreScrollTop = selectedWorkspaceScrollTop;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (selectedWorkspaceOpen && nodes.selectedWorkspace) {
          nodes.selectedWorkspace.scrollTop = restoreScrollTop;
        }
      });
    });
  }

  function openSelectedWorkspace() {
    selectedWorkspaceOpen = true;
    lockSelectedWorkspaceBackground();
    if (nodes.selectedWorkspace) {
      nodes.selectedWorkspace.scrollTop = 0;
      selectedWorkspaceScrollTop = 0;
      nodes.selectedWorkspace.classList.add("is-open");
    }
  }

  function closeSelectedWorkspace() {
    selectedWorkspaceOpen = false;
    if (nodes.selectedWorkspace) {
      nodes.selectedWorkspace.classList.remove("is-open", "is-dragging");
      nodes.selectedWorkspace.style.removeProperty("--drawer-drag-y");
    }
    unlockSelectedWorkspaceBackground();
  }

  function isSelectedWorkspaceSwipeEnvironment() {
    return window.matchMedia("(hover: none)").matches
      || window.matchMedia("(pointer: coarse)").matches;
  }

  function isDrawerSwipeIgnoredTarget(target) {
    return target instanceof Element && Boolean(target.closest("input, select, textarea, button, a, [contenteditable='true']"));
  }

  function getTouchPoint(event, changed = false) {
    const touches = changed ? event.changedTouches : event.touches;
    return touches.length === 1 ? touches[0] : null;
  }

  function handleSelectedWorkspaceTouchStart(event) {
    const point = getTouchPoint(event);
    if (
      !point
      || !isSelectedWorkspaceSwipeEnvironment()
      || !nodes.selectedWorkspace
      || (!selectedWorkspaceOpen && !nodes.selectedWorkspace.classList.contains("is-open"))
      || nodes.selectedWorkspace.scrollTop > 0
      || isDrawerSwipeIgnoredTarget(event.target)
    ) {
      return;
    }

    selectedWorkspaceDragState = {
      startX: point.clientX,
      startY: point.clientY,
      lastY: point.clientY,
      lastTimestamp: event.timeStamp,
      velocityY: 0,
      dragging: false,
    };
  }

  function handleSelectedWorkspaceTouchMove(event) {
    const point = getTouchPoint(event);
    if (!point || !selectedWorkspaceDragState || !nodes.selectedWorkspace) {
      return;
    }

    const deltaX = point.clientX - selectedWorkspaceDragState.startX;
    const deltaY = point.clientY - selectedWorkspaceDragState.startY;
    if (!selectedWorkspaceDragState.dragging) {
      if (Math.abs(deltaX) > 24 && Math.abs(deltaX) > Math.abs(deltaY)) {
        selectedWorkspaceDragState = null;
        return;
      }
      if (deltaY > 0) {
        event.preventDefault();
      }
      if (deltaY <= 4) {
        return;
      }
      selectedWorkspaceDragState.dragging = true;
      nodes.selectedWorkspace.classList.add("is-dragging");
    }

    const dragY = Math.max(0, deltaY);
    const elapsed = Math.max(1, event.timeStamp - selectedWorkspaceDragState.lastTimestamp);
    selectedWorkspaceDragState.velocityY = (point.clientY - selectedWorkspaceDragState.lastY) / elapsed;
    nodes.selectedWorkspace.style.setProperty("--drawer-drag-y", `${dragY}px`);
    selectedWorkspaceDragState.lastY = point.clientY;
    selectedWorkspaceDragState.lastTimestamp = event.timeStamp;
    event.preventDefault();
  }

  function finishSelectedWorkspaceTouch(event) {
    const point = getTouchPoint(event, true);
    if (!point || !selectedWorkspaceDragState || !nodes.selectedWorkspace) {
      return;
    }

    const deltaY = point.clientY - selectedWorkspaceDragState.startY;
    const velocityY = selectedWorkspaceDragState.velocityY;
    const endingUpward = point.clientY < selectedWorkspaceDragState.lastY || velocityY < -0.05;
    const shouldClose = selectedWorkspaceDragState.dragging
      && !endingUpward
      && (deltaY >= 80 || (deltaY >= 40 && velocityY > 0.5));

    nodes.selectedWorkspace.classList.remove("is-dragging");
    selectedWorkspaceDragState = null;

    if (shouldClose) {
      closeSelectedWorkspace();
      return;
    }

    nodes.selectedWorkspace.style.setProperty("--drawer-drag-y", "0px");
    window.requestAnimationFrame(() => {
      nodes.selectedWorkspace?.style.removeProperty("--drawer-drag-y");
    });
  }

  function resetFloatingFilterFocusState() {
    floatingQueryFocused = false;
    floatingQueryRestoreFocus = false;
    syncQueryScrollLockState();
  }

  function closeFloatingFilter({ preserveScroll = false } = {}) {
    resetFloatingFilterFocusState();
    floatingFilterOpen = false;
    renderFloatingFilterShell();
    syncQueryScrollLockState();
    if (!preserveScroll) {
      scrollCatalogPanelIntoView();
    }
  }

  function canAutoScrollElementUpward(element, offset = getScrollOffset()) {
    if (!element) {
      return false;
    }

    const startY = window.scrollY;
    const targetY = Math.max(0, window.scrollY + element.getBoundingClientRect().top - offset);
    return targetY < startY - 1;
  }

  function canAutoScrollElement(element, offset = getScrollOffset()) {
    if (!element) {
      return false;
    }

    const startY = window.scrollY;
    const targetY = Math.max(0, window.scrollY + element.getBoundingClientRect().top - offset);
    return Math.abs(targetY - startY) >= 1;
  }

  function applyFiltersPreservingOverviewPosition(nextFilters, options = {}) {
    const overviewPanel = nodes.summaryPanel;
    const catalogTarget = nodes.catalogPanel ?? nodes.catalog;
    const shouldScroll = options.scrollToCatalog ?? canAutoScrollElementUpward(catalogTarget);

    if (!overviewPanel) {
      applyDifficultyFilters(nextFilters, { scrollToCatalog: shouldScroll });
      return;
    }

    const beforeRect = overviewPanel.getBoundingClientRect();
    const isOverviewAboveViewport = beforeRect.top < 0;
    const scrollOffset = getScrollOffset();
    const shouldPreserve = beforeRect.top < scrollOffset;

    store.setDifficultyFilters(nextFilters);

    if (shouldPreserve) {
      const afterRect = overviewPanel.getBoundingClientRect();
      const delta = isOverviewAboveViewport
        ? afterRect.bottom - beforeRect.bottom
        : afterRect.top - beforeRect.top;

      if (Math.abs(delta) >= 1) {
        window.scrollBy(0, delta);
      }

      const clampedRect = overviewPanel.getBoundingClientRect();
      if (clampedRect.top > scrollOffset && Math.abs(clampedRect.top - scrollOffset) >= 1) {
        window.scrollBy(0, clampedRect.top - scrollOffset);
      }
    }

    if (shouldScroll) {
      window.requestAnimationFrame(scrollCatalogPanelIntoView);
    }
  }

  function renderFloatingFilterShell() {
    const snapshot = store.getSnapshot();
    renderFloatingAxisFilterComponent(
      nodes.floatingAxisFilter,
      filterDraft ?? snapshot.filters,
      { ...latestFilterBounds, historyDates: latestHistoryDates },
      floatingFilterOpen,
      {
        mode: floatingAxisPreviewMode,
        value: floatingAxisPreviewValue,
        rangeMode: floatingAxisRangePreviewMode,
        range: floatingAxisRangePreviewValue,
      },
      snapshot.dateDefaultRange,
    );
    syncFloatingDockClass();
    if (floatingFilterOpen) {
      if (floatingQueryFocused) {
        pinFloatingFilterToDocument();
        return;
      }

      releaseFloatingFilterPosition();
      return;
    }

    releaseFloatingFilterPosition();
  }

  function toggleFloatingFilter() {
    floatingFilterOpen = !floatingFilterOpen;
    renderFloatingFilterShell();
    syncQueryScrollLockState();
  }

  function openFloatingFilterIfClosed() {
    if (floatingFilterOpen) {
      return;
    }

    floatingFilterOpen = true;
    renderFloatingFilterShell();
    syncQueryScrollLockState();
  }

  function focusFloatingTitleQuery() {
    const queryInput = nodes.floatingAxisFilter.querySelector('input[data-axis-query]');
    if (!(queryInput instanceof HTMLInputElement)) {
      return;
    }

    queryInput.focus();
    queryInput.select?.();
  }

  function focusFloatingAxisControl(axisMode) {
    if (isTextAxisMode(axisMode)) {
      focusFloatingTitleQuery();
      syncQueryScrollLockState();
      return;
    }
  }  

  function isMobileViewport() {
    return window.matchMedia("(max-width: 720px)").matches;
  }

  function isHoverNoneEnvironment() {
    return window.matchMedia("(hover: none)").matches;
  }

  function setQueryScrollLock(locked) {
    document.documentElement.classList.toggle("search-focus-scroll-lock", locked);
    document.body.classList.toggle("search-focus-scroll-lock", locked);
  }

  function isTitleQueryElement(element) {
    return element instanceof HTMLInputElement && element.hasAttribute("data-axis-query");
  }

  function isNumericAxisMode(axisMode) {
    return axisMode === "level" || axisMode === "splv" || axisMode === "katate" || axisMode === "version" || axisMode === "bpm";
  }

  function hasAxisValue(axisMode, value) {
    if (value === "" || value === null || value === undefined) {
      return false;
    }

    return getAxisValues(latestFilterBounds, axisMode)
      .some((candidate) => String(candidate) === String(value));
  }

  function rememberFloatingAxisValue(axisMode, value) {
    if (!isNumericAxisMode(axisMode) || value === "" || value === null || value === undefined) {
      return;
    }

    floatingAxisLastValues[axisMode] = String(value);
  }

  function getActiveAxisRange(filters = filterDraft ?? store.getSnapshot().filters) {
    const axisValues = getAxisRangeValues(latestFilterBounds, filters.axisMode);
    return getNormalizedAxisRange(filters, axisValues);
  }

  function updateFloatingSingleSliderDisplay(axisMode, index, previewValue) {
    const slider = nodes.floatingAxisFilter.querySelector("input[data-axis-slider]");
    const wrap = nodes.floatingAxisFilter.querySelector(".floating-filter-single-wrap");

    if (slider instanceof HTMLInputElement) {
      slider.value = String(index);
      updateSliderFill(slider);
    }

    if (wrap instanceof HTMLElement) {
      const max = Math.max(1, Number(wrap.dataset.singleMax ?? 0));
      wrap.style.setProperty("--range-start", "0%");
      wrap.style.setProperty("--range-end", `${(index / max) * 100}%`);
    }

    const valueNode = nodes.floatingAxisFilter.querySelector(".floating-filter-value span");
    if (valueNode) {
      valueNode.textContent = formatAxisValue(axisMode, previewValue);
    }
  }

  function previewFloatingAxisSliderToIndex(axisMode, targetIndex) {
    const activeFilters = filterDraft ?? store.getSnapshot().filters;

    if (isTextAxisMode(axisMode) || isDateAxisMode(axisMode) || isAxisRangeMode({ ...activeFilters, axisMode })) {
      return false;
    }

    const axisValues = getAxisValues(latestFilterBounds, axisMode);
    const sliderStops = ["", ...axisValues];

    if (sliderStops.length <= 1) {
      return false;
    }

    const nextIndex = Math.max(0, Math.min(targetIndex, sliderStops.length - 1));
    const nextValue = sliderStops[nextIndex] ?? "";
    const previewValue = nextValue === "" ? "" : String(nextValue);

    floatingAxisPreviewMode = axisMode;
    floatingAxisPreviewValue = previewValue;
    floatingAxisShortcutPending = true;

    updateFloatingSingleSliderDisplay(axisMode, nextIndex, previewValue);
    return true;
  }

  function getFloatingAxisSinglePointerIndex(event, sliderWrap) {
    const rect = sliderWrap.getBoundingClientRect();
    const ratio = rect.width > 0
      ? Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
      : 0;
    const max = Math.max(1, Number(sliderWrap.dataset.singleMax ?? 0));
    return Math.round(ratio * max);
  }

  function updateFloatingRangeDisplay(axisMode, range) {
    const wrap = nodes.floatingAxisFilter.querySelector(".floating-filter-range-wrap");
    if (wrap instanceof HTMLElement) {
      const max = Math.max(1, Number(wrap.dataset.rangeMax ?? 0));
      wrap.style.setProperty("--range-start", `${(range.startIndex / max) * 100}%`);
      wrap.style.setProperty("--range-end", `${(range.endIndex / max) * 100}%`);
      wrap.classList.toggle("is-start-active", (floatingAxisRangeActiveHandleByAxis[axisMode] ?? "end") === "start");
      wrap.classList.toggle("is-end-active", (floatingAxisRangeActiveHandleByAxis[axisMode] ?? "end") === "end");
    }

    const valueNode = nodes.floatingAxisFilter.querySelector(".floating-filter-value span");
    if (valueNode) {
      valueNode.textContent = formatAxisRangeValue(axisMode, range);
    }

    const startInput = nodes.floatingAxisFilter.querySelector("input[data-axis-range-start]");
    if (startInput instanceof HTMLInputElement) {
      startInput.value = String(range.startIndex);
      updateSliderFill(startInput);
    }

    const endInput = nodes.floatingAxisFilter.querySelector("input[data-axis-range-end]");
    if (endInput instanceof HTMLInputElement) {
      endInput.value = String(range.endIndex);
      updateSliderFill(endInput);
    }
  }

  function buildFiltersWithAxisRange(axisMode, range, extraFilters = {}) {
    const currentFilters = store.getSnapshot().filters;
    return {
      ...extraFilters,
      axisRangeModeByAxis: {
        ...currentFilters.axisRangeModeByAxis,
        [axisMode]: true,
      },
      axisRanges: {
        ...currentFilters.axisRanges,
        [axisMode]: { start: range.start, end: range.end },
      },
    };
  }

  function commitFloatingAxisRange(range = floatingAxisRangePreviewValue) {
    if (!floatingAxisRangeShortcutPending || !floatingAxisRangePreviewMode || !range) {
      return false;
    }

    const axisMode = floatingAxisRangePreviewMode;
    floatingAxisRangeShortcutPending = false;
    floatingAxisRangePreviewMode = null;
    floatingAxisRangePreviewValue = null;
    applyDifficultyFilters(buildFiltersWithAxisRange(axisMode, range), { scrollToCatalog: false });
    return true;
  }

  function previewFloatingAxisRangeBy(delta, handle) {
    const activeFilters = filterDraft ?? store.getSnapshot().filters;
    if (!isAxisRangeMode(activeFilters)) {
      return false;
    }

    const axisValues = getAxisRangeValues(latestFilterBounds, activeFilters.axisMode);
    if (!axisValues.length) {
      return false;
    }

    const baseRange = floatingAxisRangePreviewMode === activeFilters.axisMode && floatingAxisRangePreviewValue
      ? floatingAxisRangePreviewValue
      : getActiveAxisRange(activeFilters);
    const range = { ...baseRange };
    const activeHandle = handle === "end" ? "end" : "start";
    const minGap = getAxisRangeMinGap(activeFilters.axisMode);

    const nextRange = { ...range };
    if (activeHandle === "start") {
      nextRange.startIndex = Math.max(0, Math.min(range.startIndex + delta, range.endIndex - minGap));
      nextRange.start = String(axisValues[nextRange.startIndex]);
    } else {
      nextRange.endIndex = Math.max(range.startIndex + minGap, Math.min(range.endIndex + delta, axisValues.length - 1));
      nextRange.end = String(axisValues[nextRange.endIndex]);
    }

    floatingAxisRangeActiveHandleByAxis[activeFilters.axisMode] = activeHandle;
    floatingAxisRangePreviewMode = activeFilters.axisMode;
    floatingAxisRangePreviewValue = nextRange;
    floatingAxisRangeShortcutPending = true;
    updateFloatingRangeDisplay(activeFilters.axisMode, nextRange);
    return true;
  }

  function previewFloatingAxisRangeToIndex(axisMode, targetIndex, handle) {
    const activeFilters = filterDraft ?? store.getSnapshot().filters;
    const axisValues = getAxisRangeValues(latestFilterBounds, axisMode);
    if (!axisValues.length) {
      return false;
    }

    const baseRange = floatingAxisRangePreviewMode === axisMode && floatingAxisRangePreviewValue
      ? floatingAxisRangePreviewValue
      : getActiveAxisRange({ ...activeFilters, axisMode });
    const nextRange = { ...baseRange };
    const nextIndex = Math.max(0, Math.min(targetIndex, axisValues.length - 1));
    const minGap = getAxisRangeMinGap(axisMode);
    const activeHandle = handle === "auto" && nextRange.startIndex === nextRange.endIndex && nextIndex !== nextRange.startIndex
      ? (nextIndex > nextRange.startIndex ? "end" : "start")
      : (handle === "end" ? "end" : "start");

    if (activeHandle === "start") {
      nextRange.startIndex = Math.min(nextIndex, nextRange.endIndex - minGap);
      nextRange.start = String(axisValues[nextRange.startIndex] ?? "");
    } else {
      nextRange.endIndex = Math.max(nextIndex, nextRange.startIndex + minGap);
      nextRange.end = String(axisValues[nextRange.endIndex] ?? "");
    }

    floatingAxisRangeActiveHandleByAxis[axisMode] = activeHandle;
    floatingAxisRangePreviewMode = axisMode;
    floatingAxisRangePreviewValue = nextRange;
    floatingAxisRangeShortcutPending = true;
    updateFloatingRangeDisplay(axisMode, nextRange);
    return activeHandle;
  }

  function getFloatingAxisRangePointerIndex(event, rangeWrap) {
    const rect = rangeWrap.getBoundingClientRect();
    const ratio = rect.width > 0 ? Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) : 0;
    const max = Math.max(1, Number(rangeWrap.dataset.rangeMax ?? 0));
    return Math.round(ratio * max);
  }

  function releaseFloatingAxisSinglePointerCapture() {
    if (!floatingAxisSingleDragState) {
      return;
    }

    try {
      floatingAxisSingleDragState.sliderWrap.releasePointerCapture?.(floatingAxisSingleDragState.pointerId);
    } catch {
      // The capture can already be released by the browser.
    }
  }

  function releaseFloatingAxisRangePointerCapture() {
    if (!floatingAxisRangeDragState) {
      return;
    }

    try {
      floatingAxisRangeDragState.rangeWrap.releasePointerCapture?.(floatingAxisRangeDragState.pointerId);
    } catch {
      // The capture can already be released by the browser.
    }
  }

  function isShortcutEditableTarget(element) {
    return element instanceof HTMLInputElement
      || element instanceof HTMLTextAreaElement
      || Boolean(element instanceof HTMLElement && element.isContentEditable);
  }

  function isEscapeBlurTarget(element) {
    return element instanceof HTMLInputElement
      || element instanceof HTMLTextAreaElement
      || element instanceof HTMLSelectElement;
  }

  function syncQueryScrollLockState() {
    setQueryScrollLock(false);
  }

  function shouldCloseFloatingFilterAfterSliderCommit() {
    if (isMobileViewport()) {
      return true;
    }

    return canAutoScrollElement(nodes.catalogPanel ?? nodes.catalog);
  }

  function shouldScrollCatalogPanelUpward() {
    return canAutoScrollElementUpward(nodes.catalogPanel ?? nodes.catalog);
  }

  function syncFloatingDockClass() {
    if (!nodes.floatingAxisFilter) {
      return;
    }

    nodes.floatingAxisFilter.classList.toggle("is-docked-top", floatingDockSide === "top");
    nodes.floatingAxisFilter.classList.toggle("is-docked-bottom", floatingDockSide === "bottom");
    nodes.floatingAxisFilter.classList.toggle(
      "is-at-bottom",
      !floatingFilterOpen && !suppressBottomDockState && isAtPageBottom(),
    );
  }

  function isDifficultyImportButtonTopVisible() {
    if (!nodes.csvImportButton) {
      return false;
    }

    const rect = nodes.csvImportButton.getBoundingClientRect();
    return rect.top >= 0 && rect.top <= window.innerHeight;
  }

  function isAtPageBottom() {
    const doc = document.documentElement;
    const scrollBottom = window.scrollY + window.innerHeight;
    return scrollBottom >= doc.scrollHeight - 2;
  }

  function syncFloatingDockSideFromViewport() {
    floatingDockSide = !isDifficultyImportButtonTopVisible() ? "top" : "bottom";
    lastScrollY = window.scrollY;
    syncFloatingDockClass();
  }

  function freezeFloatingFilterPosition() {
    if (!isMobileViewport() || !nodes.floatingAxisFilter) {
      return;
    }

    const rect = nodes.floatingAxisFilter.getBoundingClientRect();
    nodes.floatingAxisFilter.style.position = "";
    nodes.floatingAxisFilter.style.top = `${Math.max(getFloatingFilterInset(), rect.top)}px`;
    nodes.floatingAxisFilter.style.bottom = "auto";
  }

  function pinFloatingFilterToDocument() {
    if (!isMobileViewport() || !nodes.floatingAxisFilter) {
      return;
    }

    const rect = nodes.floatingAxisFilter.getBoundingClientRect();
    const inset = getFloatingFilterInset();
    nodes.floatingAxisFilter.style.position = "absolute";
    nodes.floatingAxisFilter.style.top = `${window.scrollY + rect.top}px`;
    nodes.floatingAxisFilter.style.bottom = "auto";
    nodes.floatingAxisFilter.style.left = `${inset}px`;
    nodes.floatingAxisFilter.style.right = `${inset}px`;
    nodes.floatingAxisFilter.style.width = "auto";
  }

  function releaseFloatingFilterPosition() {
    if (!nodes.floatingAxisFilter) {
      return;
    }

    nodes.floatingAxisFilter.style.position = "";
    nodes.floatingAxisFilter.style.top = "";
    nodes.floatingAxisFilter.style.bottom = "";
    nodes.floatingAxisFilter.style.left = "";
    nodes.floatingAxisFilter.style.right = "";
    nodes.floatingAxisFilter.style.width = "";
  }

  function getCatalogNumberShortcutIndex(event) {
    if (event.key >= "1" && event.key <= "9") {
      return Number(event.key) - 1;
    }

    if (event.key === "0") {
      return 9;
    }

    return -1;
  }

  function selectCatalogSongByShortcut(index) {
    if (selectedWorkspaceOpen) {
      return false;
    }

    const snapshot = store.getSnapshot();
    const song = snapshot.pagedSongs[index];

    if (!song) {
      return false;
    }

    store.selectSong(song.title, song.catalogItemKey || `title:${song.title}`);
    openSelectedWorkspace();

    window.requestAnimationFrame(() => {
      nodes.lampInput?.focus({ preventScroll: true });
    });

    return true;
  }  

  const nodes = collectRendererNodes();

  initializeRendererNodeClasses(nodes);
  nodes.selectedWorkspaceCloseButton?.addEventListener("click", closeSelectedWorkspace);
  nodes.selectedWorkspaceFormCloseButton?.addEventListener("click", closeSelectedWorkspace);
  nodes.selectedWorkspace?.addEventListener("touchstart", handleSelectedWorkspaceTouchStart, { passive: true });
  nodes.selectedWorkspace?.addEventListener("touchmove", handleSelectedWorkspaceTouchMove, { passive: false });
  nodes.selectedWorkspace?.addEventListener("touchend", finishSelectedWorkspaceTouch);
  nodes.selectedWorkspace?.addEventListener("touchcancel", finishSelectedWorkspaceTouch);
  nodes.selectedWorkspace?.addEventListener("scroll", () => {
    selectedWorkspaceScrollTop = nodes.selectedWorkspace?.scrollTop ?? 0;
  }, { passive: true });
  window.visualViewport?.addEventListener("resize", handleSelectedWorkspaceViewportResize);
  ({
    scrollEntryPanelIntoView,
    scrollCatalogPanelIntoView,
  } = createScrollController({
    nodes,
    getScrollOffset,
    setProgrammaticScroll: (value) => { isProgrammaticScroll = value; },
    setSuppressBottomDockState: (value) => { suppressBottomDockState = value; },
    syncFloatingDockClass,
  }));

  function syncEntryBpInputMode() {
    syncEntryBpInputModeComponent({
      panels: nodes.bpInputPanels,
      buttons: nodes.bpInputModeButtons,
    }, entryBpInputMode);
  }

  function setEntryBpInputMode(mode) {
    if (!ENTRY_BP_INPUT_MODES.has(mode) || mode === entryBpInputMode) {
      return;
    }

    entryBpInputMode = mode;
    persistEntryBpInputModeComponent(entryBpInputMode);
    syncEntryBpInputMode();
  }

  function syncEntrySubmitButton() {
    if (nodes.recordSubmitButton) {
      nodes.recordSubmitButton.disabled = !entryFormDirty;
    }
  }

  function setEntryFormDirty(dirty) {
    entryFormDirty = Boolean(dirty);
    syncEntrySubmitButton();
  }

  function syncAnalyticsChartOrder(summaryDisplayMode) {
    const bpBlock = nodes.chart?.closest(".analytics-block");
    const scoreBlock = nodes.scoreChart?.closest(".analytics-block");
    if (!(bpBlock instanceof HTMLElement) || !(scoreBlock instanceof HTMLElement)) {
      return;
    }

    const scoreFirst = summaryDisplayMode === "score";
    bpBlock.style.order = scoreFirst ? "3" : "2";
    scoreBlock.style.order = scoreFirst ? "2" : "3";
  }

  function clearEntryBpInputs() {
    clearEntryBpInputsComponent(nodes);
  }

  function getEntryBpValue() {
    return getEntryBpValueComponent({
      mode: entryBpInputMode,
      bpInput: nodes.bpInput,
      badInput: nodes.badInput,
      poorInput: nodes.poorInput,
    });
  }

  initializeRecordForm(nodes, entryBpInputMode);
  syncThemeToggleButton(nodes.themeToggleButton, getCurrentTheme());
  requestAnimationFrame(() => {
    syncFloatingDockSideFromViewport();
    requestAnimationFrame(syncFloatingDockSideFromViewport);
  });

  bindThemeToggle(nodes.themeToggleButton, {
    getCurrentTheme,
    applyTheme,
    persistTheme,
    syncThemeToggleButton,
  });

  bindWindowResize(window, () => {
    if (activeChartResizeFrame !== null) {
      window.cancelAnimationFrame(activeChartResizeFrame);
    }

    activeChartResizeFrame = window.requestAnimationFrame(() => {
      renderBpChart(nodes.chart, latestChartHistory);
      renderScoreChart(nodes.scoreChart, latestChartHistory);
      syncFloatingDockClass();
      activeChartResizeFrame = null;
    });
  });

  bindNumberInputWheelGuard(document);

  bindFloatingScroll(window, () => {
    if (!isProgrammaticScroll) {
      lastUserScrollAt = performance.now();
    }
    
    if (isProgrammaticScroll) {
      return;
    }

    if (window.scrollY <= 0) {
      floatingDockSide = "bottom";
      lastScrollY = window.scrollY;
      syncFloatingDockClass();
      return;
    }

    if (!isDifficultyImportButtonTopVisible()) {
      floatingDockSide = "top";
      lastScrollY = window.scrollY;
      syncFloatingDockClass();
      return;
    }

    const currentScrollY = window.scrollY;
    const delta = currentScrollY - lastScrollY;
    if (Math.abs(delta) < 4) {
      return;
    }

    const direction = delta > 0 ? "down" : "up";
    const now = performance.now();
    if (scrollDirectionStreak !== direction) {
      scrollDirectionStreak = direction;
      scrollDirectionDistance = 0;
    }

    scrollDirectionDistance += Math.abs(delta);
    scrollDirectionTimestamp = now;

    if (scrollDirectionDistance >= 72) {
      floatingDockSide = direction === "down" ? "top" : "bottom";
      scrollDirectionDistance = 0;
    }

    lastScrollY = currentScrollY;
    syncFloatingDockClass();
  });

  function readFiltersFromPanel() {
    const panel = nodes.summaryFiltersPanel;
    const currentFilters = filterDraft ?? store.getSnapshot().filters;
    const selectedRecommend = RECOMMEND_OPTIONS.map((option) => option.value);
    const chartDifficultyInputs = Array.from(panel.querySelectorAll('input[data-filter="chartDifficulty"]'));
    const selectedChartDifficulties = chartDifficultyInputs.some((input) => input.disabled)
      ? [...(currentFilters.chartDifficulties ?? CHART_DIFFICULTY_OPTIONS)]
      : chartDifficultyInputs.filter((input) => input.checked).map((input) => input.value);
    const readSelectFilter = (name, fallback = "all") => {
      const select = panel.querySelector(`select[data-filter="${name}"]`);
      if (!(select instanceof HTMLSelectElement) || select.disabled) {
        return currentFilters[name] ?? fallback;
      }

      return select.value;
    };
    const songDataSelect = panel.querySelector('select[data-filter="songData"]');
    const songDataFilter = (songDataSelect instanceof HTMLSelectElement && !songDataSelect.disabled)
      ? getSongDataFilterOption(songDataSelect.value)
      : {
          inf: currentFilters.inf ?? "all",
          acdelete: currentFilters.acdelete ?? "all",
        };

    return {
      axisMode: currentFilters.axisMode ?? "splv",
      axisValue: currentFilters.axisValue ?? "",
      titleQuery: currentFilters.titleQuery ?? "",
      dateSelectionMode: currentFilters.dateSelectionMode ?? "single",
      dateSingle: currentFilters.dateSingle ?? todayIso(),
      dateStart: currentFilters.dateStart ?? "",
      dateEnd: currentFilters.dateEnd ?? "",
      axisRangeModeByAxis: currentFilters.axisRangeModeByAxis,
      axisRanges: currentFilters.axisRanges,
      axisLastRanges: currentFilters.axisLastRanges,
      axisSingleReturnValues: currentFilters.axisSingleReturnValues,
      displayMode: readSelectFilter("displayMode", "all"),
      summaryDisplayMode: currentFilters.summaryDisplayMode ?? "clear",
      inf: songDataFilter.inf,
      acdelete: songDataFilter.acdelete,
      recommend: selectedRecommend,
      chartDifficulties: selectedChartDifficulties,
      versionChartDifficulties: currentFilters.versionChartDifficulties ? [...currentFilters.versionChartDifficulties] : [...CHART_DIFFICULTY_OPTIONS],
      scoreRanks: currentFilters.scoreRanks ? [...currentFilters.scoreRanks] : [...SCORE_RANK_OPTIONS],
      lamps: currentFilters.lamps ? [...currentFilters.lamps] : [...LAMP_OPTIONS],
      includeUnrated: readSelectFilter("includeUnrated"),
    };
  }

  function applyDifficultyFilters(nextFilters, options = {}) {
    store.setDifficultyFilters(nextFilters);
    const activeAxisMode = nextFilters.axisMode ?? store.getSnapshot().filters.axisMode;
    const shouldScroll = options.scrollToCatalog ?? (
      isTextAxisMode(activeAxisMode)
        ? canAutoScrollElement(nodes.catalogPanel ?? nodes.catalog)
        : canAutoScrollElementUpward(nodes.catalogPanel ?? nodes.catalog)
    );
    if (shouldScroll) {
      window.requestAnimationFrame(scrollCatalogPanelIntoView);
    }
  }

  function previewFloatingAxisSliderBy(delta) {
    const activeFilters = filterDraft ?? store.getSnapshot().filters;

    if (isTextAxisMode(activeFilters.axisMode) || isDateAxisMode(activeFilters.axisMode)) {
      return false;
    }

    const slider = nodes.floatingAxisFilter.querySelector("input[data-axis-slider]");
    if (!(slider instanceof HTMLInputElement) || slider.disabled) {
      return false;
    }

    const axisValues = getAxisValues(latestFilterBounds, activeFilters.axisMode);
    const sliderStops = ["", ...axisValues];

    if (sliderStops.length <= 1) {
      return false;
    }

    const currentIndex = Number(slider.value);
    if (!Number.isFinite(currentIndex)) {
      return false;
    }

    const nextIndex = Math.max(0, Math.min(currentIndex + delta, sliderStops.length - 1));
    if (nextIndex === currentIndex) {
      return true;
    }

    return previewFloatingAxisSliderToIndex(activeFilters.axisMode, nextIndex);
  }
  
  function commitFloatingAxisSliderShortcut() {
    if (!floatingAxisShortcutPending) {
      return false;
    }

    const activeFilters = filterDraft ?? store.getSnapshot().filters;

    if (floatingAxisPreviewMode !== activeFilters.axisMode) {
      floatingAxisShortcutPending = false;
      floatingAxisPreviewMode = null;
      floatingAxisPreviewValue = null;
      return false;
    }

    const committedValue = floatingAxisPreviewValue === "" ? "" : String(floatingAxisPreviewValue);
    rememberFloatingAxisValue(activeFilters.axisMode, committedValue);

    floatingAxisShortcutPending = false;
    floatingAxisPreviewMode = null;
    floatingAxisPreviewValue = null;

    applyDifficultyFilters({ axisValue: committedValue }, { scrollToCatalog: false });
    return true;
  }  
  
  function switchFloatingAxisByShortcut(axisMode) {
    if (!AXIS_OPTIONS.some((option) => option.value === axisMode)) {
      return false;
    }

    const wasOpen = floatingFilterOpen;
    const { filters } = store.getSnapshot();
    const isSameAxis = wasOpen && filters.axisMode === axisMode;

    if (!floatingFilterOpen) {
      floatingFilterOpen = true;
      renderFloatingFilterShell();
      syncQueryScrollLockState();
    }

    if (isSameAxis && isNumericAxisMode(axisMode) && !isRangeOnlyAxisMode(axisMode)) {
      toggleAxisRangeMode(axisMode);
      return true;
    }

    if (isSameAxis && isDateAxisMode(axisMode)) {
      toggleDateSelectionMode();
      return true;
    }

    if (filters.axisMode === axisMode) {
      focusFloatingAxisControl(axisMode);
      return true;
    }

    floatingFilterOpen = true;
    floatingQueryRestoreFocus = isTextAxisMode(axisMode);
    floatingQuerySelection = null;
    pendingQueryBlurIntent = null;
    floatingAxisPreviewMode = null;
    floatingAxisPreviewValue = null;

    const nextFilters = { axisMode };
    if (isNumericAxisMode(axisMode) && isAxisRangeMode({ ...filters, axisMode })) {
      const axisValues = getAxisRangeValues(latestFilterBounds, axisMode);
      const rawRange = filters.axisRanges?.[axisMode] ?? { start: "", end: "" };
      const startIndex = axisValues.findIndex((value) => String(value) === String(rawRange.start));
      const endIndex = axisValues.findIndex((value) => String(value) === String(rawRange.end));
      if (axisValues.length && (startIndex < 0 || endIndex < 0 || startIndex > endIndex)) {
        nextFilters.axisRanges = {
          ...filters.axisRanges,
          [axisMode]: {
            start: String(axisValues[0]),
            end: String(axisValues[axisValues.length - 1]),
          },
        };
      }
    }

    applyFiltersPreservingOverviewPosition(nextFilters, { scrollToCatalog: false });

    return true;
  }  

  function toggleAxisRangeMode(axisMode) {
    if (!isNumericAxisMode(axisMode)) {
      return false;
    }

    const { filters } = store.getSnapshot();
    const axisValues = getAxisRangeValues(latestFilterBounds, axisMode);
    if (!axisValues.length) {
      return false;
    }

    const enabled = isAxisRangeMode({ ...filters, axisMode });
    floatingAxisPreviewMode = null;
    floatingAxisPreviewValue = null;
    floatingAxisRangePreviewMode = null;
    floatingAxisRangePreviewValue = null;
    floatingAxisRangeShortcutPending = false;

    if (!enabled) {
      const currentRange = getNormalizedAxisRange(filters, axisValues);
      const range = currentRange.valid ? currentRange : {
        start: String(axisValues[0]),
        end: String(axisValues[axisValues.length - 1]),
      };
      applyFiltersPreservingOverviewPosition({
        axisValue: "",
        axisRangeModeByAxis: {
          ...filters.axisRangeModeByAxis,
          [axisMode]: true,
        },
        axisRanges: {
          ...filters.axisRanges,
          [axisMode]: { start: range.start, end: range.end },
        },
        axisSingleReturnValues: {
          ...filters.axisSingleReturnValues,
          [axisMode]: filters.axisValue ?? "",
        },
      }, { scrollToCatalog: false });
      return true;
    }

    const returnValue = filters.axisSingleReturnValues?.[axisMode] ?? "";
    applyFiltersPreservingOverviewPosition({
      axisValue: returnValue === "" || hasAxisValue(axisMode, returnValue) ? returnValue : "",
      axisRangeModeByAxis: {
        ...filters.axisRangeModeByAxis,
        [axisMode]: false,
      },
    }, { scrollToCatalog: false });
    return true;
  }

  function applyTitleQueryFilter(input, options = {}) {
    floatingQuerySelection = {
      start: input.selectionStart ?? input.value.length,
      end: input.selectionEnd ?? input.value.length,
    };
    floatingQueryRestoreFocus = options.keepFocus ?? true;
    applyDifficultyFilters(
      { titleQuery: input.value, axisValue: "" },
      { scrollToCatalog: options.scrollToCatalog ?? false },
    );
  }

  function isDateFilterInput(element) {
    return element instanceof HTMLInputElement
      && (
        element.hasAttribute("data-date-single")
        || element.hasAttribute("data-date-start")
        || element.hasAttribute("data-date-end")
      );
  }

  function applyDateFilter() {
    const activeFilters = filterDraft ?? store.getSnapshot().filters;
    const dateSelectionMode = activeFilters.dateSelectionMode === "range" ? "range" : "single";
    applyFiltersPreservingOverviewPosition({
      axisMode: "date",
      axisValue: "",
      dateSelectionMode,
      dateSingle: nodes.floatingAxisFilter.querySelector("[data-date-single]")?.value ?? activeFilters.dateSingle ?? todayIso(),
      dateStart: nodes.floatingAxisFilter.querySelector("[data-date-start]")?.value ?? activeFilters.dateStart ?? "",
      dateEnd: nodes.floatingAxisFilter.querySelector("[data-date-end]")?.value ?? activeFilters.dateEnd ?? "",
    });
  }

  function shiftIsoDate(isoDate, delta) {
    const base = String(isoDate || todayIso());
    const date = new Date(`${base}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return todayIso();
    }

    date.setDate(date.getDate() + delta);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function shiftHistoryDate(isoDate, delta) {
    if (!latestHistoryDates.length) {
      return shiftIsoDate(isoDate, delta);
    }

    const base = String(isoDate || todayIso());
    const direction = delta < 0 ? -1 : 1;
    let index = latestHistoryDates.indexOf(base);

    if (index < 0) {
      index = direction < 0
        ? latestHistoryDates.findLastIndex((date) => date <= base)
        : latestHistoryDates.findIndex((date) => date >= base);

      if (index < 0) {
        index = direction < 0 ? 0 : latestHistoryDates.length - 1;
      }
    } else {
      index += direction;
    }

    index = Math.max(0, Math.min(index, latestHistoryDates.length - 1));
    return latestHistoryDates[index] ?? base;
  }

  function getShiftedHistoryDateOrEmpty(isoDate, delta) {
    return getHistoryDateNeighbor(latestHistoryDates, isoDate, delta);
  }

  function updateFloatingDateDisplay(filters) {
    const valueNode = nodes.floatingAxisFilter.querySelector(".floating-filter-date-summary span");
    if (valueNode) {
      valueNode.textContent = formatDateRangeValue(filters);
    }

    const singleInput = nodes.floatingAxisFilter.querySelector("input[data-date-single]");
    if (singleInput instanceof HTMLInputElement) {
      singleInput.value = filters.dateSingle || todayIso();
    }

    const startInput = nodes.floatingAxisFilter.querySelector("input[data-date-start]");
    if (startInput instanceof HTMLInputElement) {
      startInput.value = filters.dateStart || "";
    }

    const endInput = nodes.floatingAxisFilter.querySelector("input[data-date-end]");
    if (endInput instanceof HTMLInputElement) {
      endInput.value = filters.dateEnd || "";
    }
  }

  function previewFloatingDateBy(delta, handle) {
    const activeFilters = filterDraft ?? store.getSnapshot().filters;
    if (!isDateAxisMode(activeFilters.axisMode)) {
      return false;
    }

    const baseFilters = floatingDatePreviewValue ?? activeFilters;
    let nextFilters;

    if (baseFilters.dateSelectionMode === "range") {
      const activeHandle = handle === "end" ? "end" : "start";
      const currentStart = baseFilters.dateStart || todayIso();
      const currentEnd = baseFilters.dateEnd || todayIso();
      let nextStart = currentStart;
      let nextEnd = currentEnd;

      if (activeHandle === "end") {
        nextEnd = shiftHistoryDate(currentEnd, delta);
        if (nextEnd < nextStart) {
          nextEnd = nextStart;
        }
      } else {
        nextStart = shiftHistoryDate(currentStart, delta);
        if (nextStart > nextEnd) {
          nextStart = nextEnd;
        }
      }

      nextFilters = {
        ...baseFilters,
        dateSelectionMode: "range",
        dateStart: nextStart,
        dateEnd: nextEnd,
      };
    } else {
      nextFilters = {
        ...baseFilters,
        dateSelectionMode: "single",
        dateSingle: shiftHistoryDate(baseFilters.dateSingle || todayIso(), delta),
      };
    }

    floatingDatePreviewValue = nextFilters;
    floatingDateShortcutPending = true;
    updateFloatingDateDisplay(nextFilters);
    return true;
  }

  function commitFloatingDateShortcut() {
    if (!floatingDateShortcutPending || !floatingDatePreviewValue) {
      return false;
    }

    const nextFilters = floatingDatePreviewValue;
    floatingDateShortcutPending = false;
    floatingDatePreviewValue = null;
    applyFiltersPreservingOverviewPosition({
      axisMode: "date",
      axisValue: "",
      dateSelectionMode: nextFilters.dateSelectionMode,
      dateSingle: nextFilters.dateSingle || todayIso(),
      dateStart: nextFilters.dateStart || "",
      dateEnd: nextFilters.dateEnd || "",
    }, { scrollToCatalog: false });
    return true;
  }

  function moveSingleDateFilterBy(delta) {
    const { filters } = store.getSnapshot();
    if (!isDateAxisMode(filters.axisMode) || filters.dateSelectionMode !== "single") {
      return false;
    }

    const nextDate = getShiftedHistoryDateOrEmpty(filters.dateSingle || todayIso(), delta);
    if (!nextDate) {
      return false;
    }

    applyFiltersPreservingOverviewPosition({
      axisMode: "date",
      axisValue: "",
      dateSelectionMode: "single",
      dateSingle: nextDate,
      dateStart: filters.dateStart,
      dateEnd: filters.dateEnd,
    });
    return true;
  }

  function toggleDateSelectionMode() {
    const { filters } = store.getSnapshot();
    const nextMode = filters.dateSelectionMode === "single" ? "range" : "single";
    applyFiltersPreservingOverviewPosition({
      axisMode: "date",
      axisValue: "",
      dateSelectionMode: nextMode,
      dateSingle: filters.dateSingle || todayIso(),
      dateStart: filters.dateStart,
      dateEnd: filters.dateEnd,
    }, { scrollToCatalog: false });
  }

  function scheduleDateFilterCommitIfBlurred() {
    if (dateFilterCommitTimer !== null) {
      window.clearTimeout(dateFilterCommitTimer);
      dateFilterCommitTimer = null;
    }

    dateFilterCommitTimer = window.setTimeout(() => {
      dateFilterCommitTimer = null;

      if (isDateFilterInput(document.activeElement) && performance.now() < dateFilterKeyboardEditUntil) {
        return;
      }

      applyDateFilter();
    }, 150);
  }

  function renderFilterDraftPanel() {
    renderDifficultyFiltersComponent(nodes.summaryFiltersPanel, filterDraft);
    nodes.summaryFiltersPanel.classList.toggle("is-collapsed", !summaryFiltersOpen);
    if (nodes.summaryFiltersToggle) {
      nodes.summaryFiltersToggle.setAttribute("aria-expanded", summaryFiltersOpen ? "true" : "false");
      const label = nodes.summaryFiltersToggle.querySelector(".summary-filters-toggle-label");
      if (label) {
        label.textContent = summaryFiltersOpen ? "環境設定を閉じる" : "環境設定を開く";
      }
    }
  }

  function deferDifficultyFilters(nextFilters, options = {}) {
    deferredFilterRevision += 1;
    const revision = deferredFilterRevision;

    if (deferredFilterTimer !== null) {
      window.clearTimeout(deferredFilterTimer);
      deferredFilterTimer = null;
    }

    deferredFilterTimer = window.setTimeout(() => {
      deferredFilterTimer = null;

      if (revision !== deferredFilterRevision) {
        return;
      }

      applyDifficultyFilters(nextFilters, options);
    }, 300);
  }

  function clearFloatingAxisFilter() {
    const activeFilters = filterDraft ?? store.getSnapshot().filters;
    pendingQueryBlurIntent = "clear";

    if (isTextAxisMode(activeFilters.axisMode)) {
      store.clearTitleFilter();
      closeFloatingFilter({
        preserveScroll: !shouldScrollCatalogPanelUpward(),
      });
      return;
    }

    if (isDateAxisMode(activeFilters.axisMode)) {
      store.clearDateFilter();
      closeFloatingFilter({
        preserveScroll: !shouldScrollCatalogPanelUpward(),
      });
      return;
    }

    floatingAxisPreviewMode = null;
    floatingAxisPreviewValue = null;
    applyFiltersPreservingOverviewPosition({ axisValue: "" }, { scrollToCatalog: false });
  }

  bindSummaryFilterPanelHandlers({
    nodes,
    store,
    todayIso,
    lampOptions: LAMP_OPTIONS,
    chartDifficultyOptions: CHART_DIFFICULTY_OPTIONS,
    scoreRankOptions: SCORE_RANK_OPTIONS,
    summaryDisplayModeOptions: SUMMARY_DISPLAY_MODE_OPTIONS,
    getFilterDraft: () => filterDraft,
    setFilterDraft: (value) => { filterDraft = value; },
    getSummaryFiltersOpen: () => summaryFiltersOpen,
    setSummaryFiltersOpen: (value) => { summaryFiltersOpen = value; },
    persistSummaryFiltersOpen,
    renderFilterDraftPanel,
    readFiltersFromPanel,
    applyDifficultyFilters,
  });

  const floatingHandlerState = {
    get filterDraft() { return filterDraft; },
    set filterDraft(value) { filterDraft = value; },
    get latestFilterBounds() { return latestFilterBounds; },
    get floatingAxisModeCommitTimer() { return floatingAxisModeCommitTimer; },
    set floatingAxisModeCommitTimer(value) { floatingAxisModeCommitTimer = value; },
    get dateFilterCommitTimer() { return dateFilterCommitTimer; },
    set dateFilterCommitTimer(value) { dateFilterCommitTimer = value; },
    get dateFilterKeyboardEditUntil() { return dateFilterKeyboardEditUntil; },
    set dateFilterKeyboardEditUntil(value) { dateFilterKeyboardEditUntil = value; },
    get floatingFilterOpen() { return floatingFilterOpen; },
    set floatingFilterOpen(value) { floatingFilterOpen = value; },
    get floatingAxisPreviewMode() { return floatingAxisPreviewMode; },
    set floatingAxisPreviewMode(value) { floatingAxisPreviewMode = value; },
    get floatingAxisPreviewValue() { return floatingAxisPreviewValue; },
    set floatingAxisPreviewValue(value) { floatingAxisPreviewValue = value; },
    get floatingAxisRangePreviewMode() { return floatingAxisRangePreviewMode; },
    set floatingAxisRangePreviewMode(value) { floatingAxisRangePreviewMode = value; },
    get floatingAxisRangePreviewValue() { return floatingAxisRangePreviewValue; },
    set floatingAxisRangePreviewValue(value) { floatingAxisRangePreviewValue = value; },
    get floatingAxisRangeShortcutPending() { return floatingAxisRangeShortcutPending; },
    set floatingAxisRangeShortcutPending(value) { floatingAxisRangeShortcutPending = value; },
    get floatingAxisSingleDragState() { return floatingAxisSingleDragState; },
    set floatingAxisSingleDragState(value) { floatingAxisSingleDragState = value; },
    get floatingAxisRangeDragState() { return floatingAxisRangeDragState; },
    set floatingAxisRangeDragState(value) { floatingAxisRangeDragState = value; },
    get floatingAxisRangeActiveHandleByAxis() { return floatingAxisRangeActiveHandleByAxis; },
    get floatingQuerySelection() { return floatingQuerySelection; },
    set floatingQuerySelection(value) { floatingQuerySelection = value; },
    get floatingQueryComposing() { return floatingQueryComposing; },
    set floatingQueryComposing(value) { floatingQueryComposing = value; },
    get floatingQueryFocused() { return floatingQueryFocused; },
    set floatingQueryFocused(value) { floatingQueryFocused = value; },
    get floatingQueryRestoreFocus() { return floatingQueryRestoreFocus; },
    set floatingQueryRestoreFocus(value) { floatingQueryRestoreFocus = value; },
    get pendingQueryBlurIntent() { return pendingQueryBlurIntent; },
    set pendingQueryBlurIntent(value) { pendingQueryBlurIntent = value; },
    get lastUserScrollAt() { return lastUserScrollAt; },
  };

  bindFloatingFilterHandlers({
    nodes,
    store,
    state: floatingHandlerState,
    todayIso,
    getAxisValues,
    getAxisRangeValues,
    getAxisRangeMinGap,
    isAxisRangeMode,
    isDateAxisMode,
    isHoverNoneEnvironment,
    isNumericAxisMode,
    isRangeOnlyAxisMode,
    isTextAxisMode,
    getActiveAxisRange,
    getFloatingAxisSinglePointerIndex,
    getFloatingAxisRangePointerIndex,
    previewFloatingAxisSliderToIndex,
    previewFloatingAxisRangeToIndex,
    releaseFloatingAxisSinglePointerCapture,
    releaseFloatingAxisRangePointerCapture,
    updateFloatingRangeDisplay,
    updateFloatingSingleSliderDisplay,
    renderFloatingFilterShell,
    syncQueryScrollLockState,
    applyFiltersPreservingOverviewPosition,
    toggleFloatingFilter,
    clearFloatingAxisFilter,
    closeFloatingFilter,
    shouldScrollCatalogPanelUpward,
    scrollCatalogPanelIntoView,
    toggleDateSelectionMode,
    moveSingleDateFilterBy,
    toggleAxisRangeMode,
    commitFloatingAxisSliderShortcut,
    commitFloatingAxisRange,
    rememberFloatingAxisValue,
    shouldCloseFloatingFilterAfterSliderCommit,
    applyDifficultyFilters,
    isDateFilterInput,
    scheduleDateFilterCommitIfBlurred,
    applyTitleQueryFilter,
    applyDateFilter,
    isTitleQueryElement,
  });

  bindSummaryHandlers({
    nodes,
    store,
    lampOptions: LAMP_OPTIONS,
    chartDifficultyOptions: CHART_DIFFICULTY_OPTIONS,
    scoreRankOptions: SCORE_RANK_OPTIONS,
    scoreRankSummaryOptions: SCORE_RANK_SUMMARY_OPTIONS,
    summaryLampDoubleClickMs: SUMMARY_LAMP_DOUBLE_CLICK_MS,
    summaryLampSwipeSoloThreshold: SUMMARY_LAMP_SWIPE_SOLO_THRESHOLD,
    getFilterDraft: () => filterDraft,
    setFilterDraft: (value) => { filterDraft = value; },
    getEffectiveSummaryDisplayMode,
    isTextAxisMode,
    isHoverNoneEnvironment,
    applyDifficultyFilters,
    deferDifficultyFilters,
  });

  bindCatalogHandlers({
    nodes,
    store,
    openSelectedWorkspace,
    setPendingCatalogBottomNextScroll: (value) => { pendingCatalogBottomNextScroll = value; },
    setPendingCatalogBottomLock: (value) => { pendingCatalogBottomLock = value; },
  });

  bindKeyboardHandlers({
    nodes,
    store,
    axisShortcutKeys: AXIS_SHORTCUT_KEYS,
    getFloatingFilterOpen: () => floatingFilterOpen,
    getSelectedWorkspaceOpen: () => selectedWorkspaceOpen,
    getFloatingDateShortcutPending: () => floatingDateShortcutPending,
    getFloatingAxisRangeShortcutPending: () => floatingAxisRangeShortcutPending,
    closeSelectedWorkspace,
    setPendingQueryBlurIntent: (value) => { pendingQueryBlurIntent = value; },
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
  });

  bindRecordFormHandlers({
    nodes,
    store,
    focusNextRecordFormField,
    getEntryBpValue,
    clearEntryBpInputs,
    setEntryFormDirty,
    getEntryFormDirty: () => entryFormDirty,
    limitNumberInput,
    setEntryBpInputMode,
  });

  bindIoHandlers({
    nodes,
    store,
    setButtonLoading,
    lockHeroButtonsExcept,
    clearHeroButtonStates,
  });

  bindFloatingOutsideHandlers({
    getFloatingFilterOpen: () => floatingFilterOpen,
    closeFloatingFilter,
  });

  return {
    render(snapshot) {
      const snapshotFilterSignature = JSON.stringify(snapshot.filters);
      if (filterDraft === null || snapshotFilterSignature !== appliedFilterSignature) {
        filterDraft = structuredClone(snapshot.filters);
        appliedFilterSignature = snapshotFilterSignature;
      }

      latestFilterBounds = snapshot.filterBounds;
      const summaryBandScrollTop = nodes.summary?.querySelector(".summary-band-chart")?.scrollTop ?? 0;
      renderSummaryComponent(nodes.summary, snapshot.summary, snapshot.summaryFilters, latestFilterBounds, snapshot.filters);
      const summaryBandChart = nodes.summary?.querySelector(".summary-band-chart");
      if (summaryBandChart) {
        summaryBandChart.scrollTop = summaryBandScrollTop;
      }
      latestHistoryDates = snapshot.historyDates;
      latestVisibleCount = snapshot.visibleSongs.length;
      if (nodes.summaryDisplaySelect) {
        const effectiveSummaryDisplayMode = snapshot.effectiveSummaryDisplayMode;
        const canSelectSummaryDisplayMode = snapshot.filters.displayMode === "all";
        nodes.summaryDisplaySelect.disabled = !canSelectSummaryDisplayMode;
        nodes.summaryDisplayField?.toggleAttribute("hidden", !canSelectSummaryDisplayMode);
        if (nodes.summaryDisplaySelect.value !== effectiveSummaryDisplayMode) {
          nodes.summaryDisplaySelect.value = effectiveSummaryDisplayMode;
        }
      }
      const effectiveSummaryDisplayMode = snapshot.effectiveSummaryDisplayMode;
      syncAnalyticsChartOrder(effectiveSummaryDisplayMode);
      renderFilterDraftPanel();
      renderFloatingFilterShell();
      syncFloatingDockClass();
      if (floatingQueryRestoreFocus && isTextAxisMode(snapshot.filters.axisMode) && floatingFilterOpen) {
        const queryInput = nodes.floatingAxisFilter.querySelector('input[data-axis-query]');
        if (queryInput instanceof HTMLInputElement) {
          queryInput.focus();
          const start = floatingQuerySelection?.start ?? queryInput.value.length;
          const end = floatingQuerySelection?.end ?? queryInput.value.length;
          queryInput.setSelectionRange(start, end);
        }
        floatingQueryRestoreFocus = false;
      }
      floatingQuerySelection = null;
      renderCatalogComponent(nodes.catalog, snapshot.pagedSongs, snapshot.selectedSong?.title ?? null, {
        viewMode: snapshot.catalogViewMode,
        selectedCatalogKey: snapshot.selectedCatalogKey,
        sortMode: snapshot.sortMode,
        sortDirection: snapshot.sortDirection,
        axisMode: snapshot.filters.axisMode,
        summaryDisplayMode: effectiveSummaryDisplayMode,
      });
      renderPaginationComponent(nodes.catalogPaginationTop, snapshot.pagination, {
        showRandomSortButton: snapshot.catalogViewMode === "table",
        showSortDirectionToggle: snapshot.catalogViewMode !== "table",
        sortDirection: snapshot.sortDirection,
        sortMode: snapshot.sortMode,
        chartDifficultySortHead: snapshot.effectiveChartDifficultySortHead ?? snapshot.chartDifficultySortHead,
        recommendSortHead: snapshot.effectiveRecommendSortHead ?? snapshot.recommendSortHead,
      });
      renderPaginationComponent(nodes.catalogPaginationBottom, snapshot.pagination, {
        sortMode: snapshot.sortMode,
      });
      renderSelectedSongComponent(nodes.selectedSong, snapshot.selectedSong, snapshot.pagedSongs, {
        sortMode: snapshot.sortMode,
        axisMode: snapshot.filters.axisMode,
        summaryDisplayMode: effectiveSummaryDisplayMode,
      });
      renderProposalButton(
        nodes.selectedSong,
        snapshot.selectedSong,
        snapshot.difficultyTable
      );
      syncDifficultyImportButton(
        nodes.difficultyImportButton,
        !snapshot.difficultyTable || isDifficultyTableStale(snapshot.difficultyTableUpdatedAt)
      );
      renderHistoryComponent(nodes.history, snapshot.selectedHistory, store);
      latestChartHistory = snapshot.selectedHistory.slice().reverse();
      latestScoreChartHistory = latestChartHistory;
      nodes.scoreChart.dataset.maxScore = snapshot.selectedSong?.scoreMax ? String(snapshot.selectedSong.scoreMax) : "";
      renderBpChart(nodes.chart, latestChartHistory);
      renderScoreChart(nodes.scoreChart, latestChartHistory);

      if (pendingCatalogBottomNextScroll) {
        pendingCatalogBottomNextScroll = false;
        window.requestAnimationFrame(scrollCatalogPanelIntoView);
      }

      if (pendingCatalogBottomLock !== null && nodes.catalogPanel) {
        const newBottom = nodes.catalogPanel.getBoundingClientRect().bottom;
        window.scrollBy(0, newBottom - pendingCatalogBottomLock);
        pendingCatalogBottomLock = null;
      }

      nodes.catalogMeta.textContent = "";

      syncRecordFormWithSnapshot(nodes, snapshot, { setDirty: setEntryFormDirty });
      if (nodes.catalogSortSelect) {
        renderCatalogSortOptionsComponent(nodes.catalogSortSelect, snapshot.filters.displayMode, snapshot.sortMode);
        nodes.catalogSortSelect.closest(".header-select")?.toggleAttribute("hidden", snapshot.catalogViewMode === "table");
      }
      if (nodes.catalogViewToggle) {
        const viewToggleStates = {
          card: {
            icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="3" rx="1.5"></rect><rect x="4" y="10.5" width="16" height="3" rx="1.5"></rect><rect x="4" y="16" width="16" height="3" rx="1.5"></rect></svg>',
            title: "一覧表示に切り替え",
            label: "現在は箱型表示です。一覧表示に切り替え",
          },
          list: {
            icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM4 10h16M4 14.5h16M12 5v14" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.6"></path></svg>',
            title: "テーブル表示に切り替え",
            label: "現在は一覧表示です。テーブル表示に切り替え",
          },
          table: {
            icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5"></rect><rect x="13" y="4" width="7" height="7" rx="1.5"></rect><rect x="4" y="13" width="7" height="7" rx="1.5"></rect><rect x="13" y="13" width="7" height="7" rx="1.5"></rect></svg>',
            title: "箱型表示に切り替え",
            label: "現在はテーブル表示です。箱型表示に切り替え",
          },
        };
        const viewToggleState = viewToggleStates[snapshot.catalogViewMode] ?? viewToggleStates.card;
        nodes.catalogViewToggle.innerHTML = viewToggleState.icon;
        nodes.catalogViewToggle.removeAttribute("aria-pressed");
        nodes.catalogViewToggle.setAttribute("aria-label", viewToggleState.label);
        nodes.catalogViewToggle.title = viewToggleState.title;
      }
    },
  };
}
