const MODULE_VERSION = new URL(import.meta.url).search;

const { datasetValueMatches, decodeDatasetValue } = await import(`../dataset.js${MODULE_VERSION}`);

function getCatalogItemKey(song) {
  return song?.catalogItemKey || `title:${song?.title ?? ""}`;
}

const TABLE_SORT_ROTATIONS = {
  bestBp: [
    ["bestBp", "asc"],
    ["bestBp", "desc"],
    ["latestBp", "asc"],
    ["latestBp", "desc"],
  ],
  bestScore: [
    ["bestScore", "asc"],
    ["bestScore", "desc"],
    ["latestScore", "asc"],
    ["latestScore", "desc"],
  ],
};

function resolveCatalogSelectionFromDataset(button, store) {
  const rawTitle = button.dataset.title ?? "";
  const rawCatalogKey = button.dataset.catalogKey ?? "";
  const snapshot = store.getSnapshot();
  const songs = snapshot.visibleSongs ?? snapshot.pagedSongs ?? [];
  const catalogItem = rawCatalogKey
    ? songs.find((song) => datasetValueMatches(rawCatalogKey, getCatalogItemKey(song)))
    : null;
  const titleItem = catalogItem ?? songs.find((song) => datasetValueMatches(rawTitle, song.title));

  if (titleItem) {
    return {
      title: titleItem.title,
      catalogItemKey: rawCatalogKey ? getCatalogItemKey(titleItem) : null,
    };
  }

  return {
    title: decodeDatasetValue(rawTitle),
    catalogItemKey: rawCatalogKey ? decodeDatasetValue(rawCatalogKey) : null,
  };
}

export function bindCatalogHandlers({
  nodes,
  store,
  openSelectedWorkspace = () => {},
  setPendingCatalogBottomNextScroll,
  setPendingCatalogBottomLock,
  setPendingCatalogViewScrollY,
}) {
  function handleTableSortClick(button) {
    const nextSortMode = button.dataset.tableSortMode;
    if (!nextSortMode) {
      return;
    }

    const snapshot = store.getSnapshot();
    const rotation = TABLE_SORT_ROTATIONS[nextSortMode];
    if (rotation) {
      const currentIndex = rotation.findIndex(([sortMode, sortDirection]) => (
        snapshot.sortMode === sortMode && snapshot.sortDirection === sortDirection
      ));
      const [rotatedSortMode, rotatedSortDirection] = rotation[(currentIndex + 1) % rotation.length];
      store.setTableSortState(rotatedSortMode, rotatedSortDirection);
      return;
    }

    if (snapshot.sortMode === nextSortMode) {
      store.toggleSortDirection();
      return;
    }

    store.setSortMode(nextSortMode);
  }

  function selectCatalogItemFromElement(element) {
    const selection = resolveCatalogSelectionFromDataset(element, store);
    store.selectSong(selection.title, selection.catalogItemKey);
    openSelectedWorkspace();
  }

  nodes.catalog.addEventListener("click", (event) => {
    const tableSortButton = event.target.closest("[data-table-sort-mode]");
    if (tableSortButton) {
      handleTableSortClick(tableSortButton);
      return;
    }

    const button = event.target.closest("[data-title]");
    if (!button) {
      return;
    }
    selectCatalogItemFromElement(button);
  });

  nodes.catalog.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const target = event.target;
    const tableSortButton = target instanceof Element ? target.closest("[data-table-sort-mode]") : null;
    if (tableSortButton) {
      return;
    }

    const item = target instanceof Element ? target.closest("[data-title]") : null;
    if (!item) {
      return;
    }

    event.preventDefault();
    selectCatalogItemFromElement(item);
  });

  function handlePaginationClick(event, anchorToBottom = false) {
    const randomSortButton = event.target.closest("[data-random-sort-toggle]");
    if (randomSortButton) {
      const snapshot = store.getSnapshot();
      if (snapshot.sortMode === "random") {
        store.toggleSortDirection();
      } else {
        store.setSortMode("random");
      }
      return;
    }

    const chartDifficultyHeadButton = event.target.closest("[data-chart-difficulty-head-toggle]");
    if (chartDifficultyHeadButton) {
      store.rotateChartDifficultySortHead();
      return;
    }

    const recommendHeadButton = event.target.closest("[data-recommend-head-toggle]");
    if (recommendHeadButton) {
      store.rotateRecommendSortHead();
      return;
    }

    const sortDirectionButton = event.target.closest("[data-sort-direction-toggle]");
    if (sortDirectionButton) {
      store.toggleSortDirection();
      return;
    }

    const button = event.target.closest("[data-page]");
    if (!button) {
      return;
    }

    if (anchorToBottom && button.dataset.page === "next") {
      setPendingCatalogBottomNextScroll(true);
    } else if (anchorToBottom && nodes.catalogPanel) {
      setPendingCatalogBottomLock(nodes.catalogPanel.getBoundingClientRect().bottom);
    }

    const snapshot = store.getSnapshot();
    if (button.dataset.page === "prev") {
      store.setPage(snapshot.pagination.currentPage - 1);
      return;
    }

    if (button.dataset.page === "next") {
      store.setPage(snapshot.pagination.currentPage + 1);
    }
  }

  nodes.catalogPaginationTop.addEventListener("click", (event) => handlePaginationClick(event, false));
  nodes.catalogPaginationBottom.addEventListener("click", (event) => handlePaginationClick(event, true));
  nodes.catalogSortSelect?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    store.setSortMode(target.value);
  });
  nodes.catalogViewToggle?.addEventListener("click", () => {
    setPendingCatalogViewScrollY(window.scrollY);
    store.toggleCatalogViewMode();
  });
}

export function bindSummaryHandlers({
  nodes,
  store,
  lampOptions,
  chartDifficultyOptions,
  scoreRankOptions,
  scoreRankSummaryOptions,
  summaryLampDoubleClickMs,
  summaryLampSwipeSoloThreshold,
  getFilterDraft,
  setFilterDraft,
  getEffectiveSummaryDisplayMode,
  isTextAxisMode,
  isHoverNoneEnvironment,
  applyDifficultyFilters,
  deferDifficultyFilters,
}) {
  let lastSummaryLampClick = { lamp: "", timestamp: 0 };
  let summaryLampPointerState = null;

  function getActiveFilters() {
    return getFilterDraft() ?? store.getSnapshot().filters;
  }

  function applySummaryLampVisualState(activeLamps) {
    const activeSet = new Set(activeLamps);
    const isScoreMode = getEffectiveSummaryDisplayMode(getActiveFilters()) === "score";

    nodes.summary.querySelectorAll("[data-summary-lamp]").forEach((button) => {
      const lamp = button.dataset.summaryLamp;
      const isActive = isScoreMode && lamp === "F"
        ? activeSet.has("F") || activeSet.has("※")
        : activeSet.has(lamp);

      button.classList.toggle("is-active", isActive);
      button.classList.toggle("is-inactive", !isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function getActiveSummaryFilterConfig() {
    const isScoreMode = getEffectiveSummaryDisplayMode(getActiveFilters()) === "score";
    return {
      key: isScoreMode ? "scoreRanks" : "lamps",
      options: isScoreMode ? scoreRankSummaryOptions : lampOptions,
    };
  }

  function isSummaryLampFilterInteractionDisabled() {
    return isTextAxisMode(store.getSnapshot().filters.axisMode);
  }

  function toggleSummaryLampFilter(lamp) {
    if (isSummaryLampFilterInteractionDisabled()) {
      return;
    }

    const { key, options } = getActiveSummaryFilterConfig();
    const filters = getActiveFilters();
    const isScoreMode = getEffectiveSummaryDisplayMode(filters) === "score";
    const allValues = isScoreMode ? scoreRankOptions : options;
    const currentLamps = getFilterDraft()?.[key] ? [...getFilterDraft()[key]] : [...allValues];
    const isActive = isScoreMode && lamp === "F"
      ? currentLamps.includes("F") || currentLamps.includes("※")
      : currentLamps.includes(lamp);
    let nextLamps = isActive
      ? currentLamps.filter((value) => (
        isScoreMode && lamp === "F" ? value !== "F" && value !== "※" : value !== lamp
      ))
      : [...currentLamps, lamp, ...(isScoreMode && lamp === "F" ? ["※"] : [])];
    nextLamps = [...new Set(nextLamps)];

    if (nextLamps.length === 0) {
      nextLamps = [...allValues];
    }

    setFilterDraft({
      ...getActiveFilters(),
      [key]: nextLamps,
    });
    applySummaryLampVisualState(nextLamps);
    deferDifficultyFilters({ [key]: nextLamps }, { scrollToCatalog: false });
  }

  function soloSummaryLampFilter(lamp) {
    if (isSummaryLampFilterInteractionDisabled()) {
      return;
    }

    const { key } = getActiveSummaryFilterConfig();
    const filters = getActiveFilters();
    const isScoreMode = getEffectiveSummaryDisplayMode(filters) === "score";
    const nextLamps = isScoreMode && lamp === "F" ? ["F", "※"] : [lamp];
    setFilterDraft({
      ...getActiveFilters(),
      [key]: nextLamps,
    });
    applySummaryLampVisualState(nextLamps);
    deferDifficultyFilters({ [key]: nextLamps }, { scrollToCatalog: false });
  }

  function toggleSummaryChartDifficultyFilter(chartDifficulty) {
    if (!chartDifficultyOptions.includes(chartDifficulty)) {
      return;
    }

    const filters = getActiveFilters();
    if (filters.axisMode !== "version") {
      return;
    }

    const currentValues = filters.versionChartDifficulties ? [...filters.versionChartDifficulties] : [...chartDifficultyOptions];
    const nextValues = currentValues.includes(chartDifficulty)
      ? currentValues.filter((value) => value !== chartDifficulty)
      : [...currentValues, chartDifficulty];
    const orderedValues = chartDifficultyOptions.filter((option) => nextValues.includes(option));

    setFilterDraft({
      ...filters,
      versionChartDifficulties: orderedValues,
    });
    applyDifficultyFilters({ versionChartDifficulties: orderedValues }, { scrollToCatalog: false });
  }

  function handleSummaryLampActivation(lamp, timestamp = performance.now()) {
    if (isSummaryLampFilterInteractionDisabled()) {
      return;
    }

    const { key } = getActiveSummaryFilterConfig();
    if (lastSummaryLampClick.lamp === lamp && timestamp - lastSummaryLampClick.timestamp <= summaryLampDoubleClickMs) {
      const filters = getActiveFilters();
      const isScoreMode = getEffectiveSummaryDisplayMode(filters) === "score";
      const nextLamps = isScoreMode && lamp === "F" ? ["F", "※"] : [lamp];
      setFilterDraft({
        ...getActiveFilters(),
        [key]: nextLamps,
      });
      applySummaryLampVisualState(nextLamps);
      deferDifficultyFilters({ [key]: nextLamps }, { scrollToCatalog: false });
      lastSummaryLampClick = { lamp: "", timestamp: 0 };
      return;
    }

    lastSummaryLampClick = { lamp, timestamp };
    toggleSummaryLampFilter(lamp);
  }

  function getSummaryLampButton(target) {
    if (!(target instanceof HTMLElement)) {
      return null;
    }

    const button = target.closest("[data-summary-lamp]");
    return button instanceof HTMLElement ? button : null;
  }

  function clearSummaryLampSwipeStyle(button) {
    if (!(button instanceof HTMLElement)) {
      return;
    }

    button.style.transition = "";
    button.style.transform = "";
  }

  function animateSummaryLampSwipeReturn(button) {
    if (!(button instanceof HTMLElement)) {
      return;
    }

    const currentTransform = button.style.transform || "translateX(0)";
    button.style.transition = "none";
    button.style.transform = currentTransform;
    button.getBoundingClientRect();
    button.style.transition = "transform 180ms ease";
    button.style.transform = "translateX(0)";
    window.setTimeout(() => {
      clearSummaryLampSwipeStyle(button);
    }, 190);
  }

  function animateSummaryLampSwipeSolo(button, onComplete) {
    clearSummaryLampSwipeStyle(button);
    onComplete();
  }

  nodes.summary.addEventListener("pointerdown", (event) => {
    if (isSummaryLampFilterInteractionDisabled()) {
      summaryLampPointerState = null;
      return;
    }

    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    const button = getSummaryLampButton(event.target);
    if (!button) {
      summaryLampPointerState = null;
      return;
    }

    const lamp = button.dataset.summaryLamp;
    if (!lamp || !getActiveSummaryFilterConfig().options.includes(lamp)) {
      summaryLampPointerState = null;
      return;
    }

    summaryLampPointerState = {
      lamp,
      button,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastDeltaX: 0,
      lastDeltaY: 0,
      moved: false,
    };
  });

  nodes.summary.addEventListener("pointermove", (event) => {
    if (!summaryLampPointerState || event.pointerId !== summaryLampPointerState.pointerId) {
      return;
    }

    const deltaX = event.clientX - summaryLampPointerState.startX;
    const deltaY = event.clientY - summaryLampPointerState.startY;
    summaryLampPointerState.lastDeltaX = deltaX;
    summaryLampPointerState.lastDeltaY = deltaY;
    if (Math.abs(deltaX) > 12 || Math.abs(deltaY) > 12) {
      summaryLampPointerState.moved = true;
    }

    if (!isHoverNoneEnvironment() || !(summaryLampPointerState.button instanceof HTMLElement)) {
      return;
    }

    if (deltaX >= 0) {
      summaryLampPointerState.button.style.transition = "none";
      summaryLampPointerState.button.style.transform = "translateX(0)";
      return;
    }

    const clampedOffset = Math.max(-summaryLampSwipeSoloThreshold, deltaX);
    summaryLampPointerState.button.style.transition = "none";
    summaryLampPointerState.button.style.transform = `translateX(${clampedOffset}px)`;
  });

  nodes.summary.addEventListener("pointerup", (event) => {
    if (!summaryLampPointerState || event.pointerId !== summaryLampPointerState.pointerId) {
      return;
    }

    const lamp = summaryLampPointerState.lamp;
    const moved = summaryLampPointerState.moved;
    const activeButton = summaryLampPointerState.button;
    const deltaX = event.clientX - summaryLampPointerState.startX;
    const deltaY = event.clientY - summaryLampPointerState.startY;
    summaryLampPointerState = null;

    const button = getSummaryLampButton(event.target);
    if (!lamp || !getActiveSummaryFilterConfig().options.includes(lamp)) {
      return;
    }

    if (isHoverNoneEnvironment()) {
      const absDeltaX = Math.abs(deltaX);
      const isLeftSwipe = deltaX <= -summaryLampSwipeSoloThreshold;
      if (isLeftSwipe) {
        lastSummaryLampClick = { lamp: "", timestamp: 0 };
        animateSummaryLampSwipeSolo(activeButton, () => {
          soloSummaryLampFilter(lamp);
        });
        return;
      }

      const targetLamp = button?.dataset.summaryLamp;
      const isTap = absDeltaX <= 12 && Math.abs(deltaY) <= 12 && button && lamp === targetLamp;
      if (isTap) {
        clearSummaryLampSwipeStyle(activeButton);
        toggleSummaryLampFilter(lamp);
        return;
      }

      animateSummaryLampSwipeReturn(activeButton);
      return;
    }

    if (!button || moved) {
      return;
    }

    const targetLamp = button.dataset.summaryLamp;
    if (lamp !== targetLamp) {
      return;
    }

    handleSummaryLampActivation(lamp, Number.isFinite(event.timeStamp) ? event.timeStamp : performance.now());
  });

  nodes.summary.addEventListener("pointercancel", () => {
    const pointerState = summaryLampPointerState;
    if (!pointerState) {
      return;
    }

    if (isHoverNoneEnvironment() && pointerState.lastDeltaX <= -summaryLampSwipeSoloThreshold) {
      lastSummaryLampClick = { lamp: "", timestamp: 0 };
      animateSummaryLampSwipeSolo(pointerState.button, () => {
        soloSummaryLampFilter(pointerState.lamp);
      });
      summaryLampPointerState = null;
      return;
    }

    animateSummaryLampSwipeReturn(pointerState.button);
    summaryLampPointerState = null;
  });

  nodes.summary.addEventListener("change", (event) => {
    const chartDifficultyInput = event.target instanceof HTMLInputElement
      ? event.target.closest("[data-summary-chart-difficulty]")
      : null;
    if (chartDifficultyInput instanceof HTMLInputElement) {
      toggleSummaryChartDifficultyFilter(chartDifficultyInput.dataset.summaryChartDifficulty ?? "");
    }
  });

  nodes.summary.addEventListener("click", (event) => {
    if (isSummaryLampFilterInteractionDisabled()) {
      return;
    }

    if (event.detail !== 0) {
      return;
    }

    const button = getSummaryLampButton(event.target);
    if (!button) {
      return;
    }

    const lamp = button.dataset.summaryLamp;
    if (!lamp || !getActiveSummaryFilterConfig().options.includes(lamp)) {
      return;
    }

    if (isHoverNoneEnvironment()) {
      toggleSummaryLampFilter(lamp);
      return;
    }

    handleSummaryLampActivation(lamp, performance.now());
  });
}
