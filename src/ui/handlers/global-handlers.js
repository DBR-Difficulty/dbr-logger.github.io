const DIFFICULTY_TABLE_STALE_MS = 12 * 60 * 60 * 1000;
const MODULE_VERSION = new URL(import.meta.url).search;

const { datasetValueMatches, decodeDatasetValue } = await import(`../dataset.js${MODULE_VERSION}`);

export const THEME_STORAGE_KEY = "dbr-theme";
export const SUMMARY_FILTERS_OPEN_STORAGE_KEY = "dbr-summary-filters-open";

export function isDifficultyTableStale(updatedAt) {
  return Number.isFinite(updatedAt) && Date.now() - updatedAt >= DIFFICULTY_TABLE_STALE_MS;
}

export function getCurrentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function persistTheme(theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

export function loadSummaryFiltersOpen() {
  try {
    const value = window.localStorage.getItem(SUMMARY_FILTERS_OPEN_STORAGE_KEY);
    if (value === "false") {
      return false;
    }
    if (value === "true") {
      return true;
    }
  } catch {
    // ignore
  }

  return true;
}

export function persistSummaryFiltersOpen(open) {
  try {
    window.localStorage.setItem(SUMMARY_FILTERS_OPEN_STORAGE_KEY, open ? "true" : "false");
  } catch {
    // ignore
  }
}

export function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.dataset.theme = "dark";
  } else {
    delete document.documentElement.dataset.theme;
  }
}

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

export function bindFloatingOutsideHandlers({
  documentRef = document,
  getFloatingFilterOpen,
  closeFloatingFilter,
}) {
  let pointerState = null;

  documentRef.addEventListener("pointerdown", (event) => {
    if (!getFloatingFilterOpen()) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (target.closest(".floating-filter-panel")) {
      pointerState = null;
      return;
    }

    pointerState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  });

  documentRef.addEventListener("pointermove", (event) => {
    if (!pointerState || event.pointerId !== pointerState.pointerId) {
      return;
    }

    const deltaX = Math.abs(event.clientX - pointerState.startX);
    const deltaY = Math.abs(event.clientY - pointerState.startY);
    if (deltaX > 8 || deltaY > 8) {
      pointerState.moved = true;
    }
    if (deltaY > 16) {
      pointerState = null;
      closeFloatingFilter({ preserveScroll: true });
    }
  });

  documentRef.addEventListener("pointerup", (event) => {
    if (!pointerState || event.pointerId !== pointerState.pointerId) {
      return;
    }

    const moved = pointerState.moved;
    pointerState = null;
    if (moved) {
      return;
    }

    closeFloatingFilter({ preserveScroll: true });
  });

  documentRef.addEventListener("pointercancel", (event) => {
    if (!pointerState || event.pointerId !== pointerState.pointerId) {
      return;
    }

    pointerState = null;
    closeFloatingFilter({ preserveScroll: true });
  });
}

export function bindSummaryFilterPanelHandlers({
  nodes,
  store,
  todayIso,
  lampOptions,
  chartDifficultyOptions,
  scoreRankOptions,
  summaryDisplayModeOptions,
  getFilterDraft,
  setFilterDraft,
  getSummaryFiltersOpen,
  setSummaryFiltersOpen,
  persistSummaryFiltersOpen,
  renderFilterDraftPanel,
  readFiltersFromPanel,
  applyDifficultyFilters,
}) {
  nodes.summaryFiltersToggle?.addEventListener("click", () => {
    const nextOpen = !getSummaryFiltersOpen();
    setSummaryFiltersOpen(nextOpen);
    persistSummaryFiltersOpen(nextOpen);
    renderFilterDraftPanel();
  });

  nodes.summaryDisplaySelect?.addEventListener("change", () => {
    if (nodes.summaryDisplaySelect.disabled) {
      return;
    }

    const nextSummaryDisplayMode = summaryDisplayModeOptions.some((option) => option.value === nodes.summaryDisplaySelect.value)
      ? nodes.summaryDisplaySelect.value
      : "clear";
    setFilterDraft({
      ...(getFilterDraft() ?? store.getSnapshot().filters),
      summaryDisplayMode: nextSummaryDisplayMode,
    });
    applyDifficultyFilters({ summaryDisplayMode: nextSummaryDisplayMode }, { scrollToCatalog: false });
  });

  nodes.summaryFiltersPanel.addEventListener("input", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.name === "recommend") {
      const nextFilters = readFiltersFromPanel();
      setFilterDraft(nextFilters);
      applyDifficultyFilters(nextFilters, { scrollToCatalog: false });
    }
  });

  nodes.summaryFiltersPanel.addEventListener("change", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.name === "recommend") {
      return;
    }

    const nextFilters = readFiltersFromPanel();
    setFilterDraft(nextFilters);
    applyDifficultyFilters(nextFilters, { scrollToCatalog: false });
  });

  nodes.summaryFiltersPanel.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.closest("[data-summary-filters-clear]")) {
      return;
    }

    const nextFilters = {
      axisMode: getFilterDraft()?.axisMode ?? "splv",
      axisValue: getFilterDraft()?.axisValue ?? "",
      titleQuery: getFilterDraft()?.titleQuery ?? "",
      dateSelectionMode: getFilterDraft()?.dateSelectionMode ?? "single",
      dateSingle: getFilterDraft()?.dateSingle ?? todayIso(),
      dateStart: getFilterDraft()?.dateStart ?? "",
      dateEnd: getFilterDraft()?.dateEnd ?? "",
      displayMode: "all",
      summaryDisplayMode: getFilterDraft()?.summaryDisplayMode ?? "clear",
      inf: "all",
      acdelete: "all",
      recommend: ["", "△", "○", "◎", "☆"],
      chartDifficulties: [...chartDifficultyOptions],
      versionChartDifficulties: getFilterDraft()?.versionChartDifficulties ? [...getFilterDraft().versionChartDifficulties] : [...chartDifficultyOptions],
      scoreRanks: [...scoreRankOptions],
      lamps: getFilterDraft()?.lamps ? [...getFilterDraft().lamps] : [...lampOptions],
      includeUnrated: "all",
    };
    setFilterDraft(nextFilters);
    applyDifficultyFilters(nextFilters, { scrollToCatalog: false });
  });
}

export function createScrollController({
  nodes,
  getScrollOffset,
  setProgrammaticScroll,
  setSuppressBottomDockState,
  syncFloatingDockClass,
}) {
  let activeScrollFrame = null;

  function easeInOutCubic(progress) {
    return progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  }

  function cancelActiveScrollAnimation() {
    if (activeScrollFrame === null) {
      return;
    }

    window.cancelAnimationFrame(activeScrollFrame);
    activeScrollFrame = null;
    setProgrammaticScroll(false);
  }

  function scrollElementIntoView(element, offset = getScrollOffset()) {
    if (!element) {
      return;
    }

    cancelActiveScrollAnimation();

    const startY = window.scrollY;
    const targetY = Math.max(0, window.scrollY + element.getBoundingClientRect().top - offset);
    const distance = targetY - startY;
    const duration = 760;
    const startTime = performance.now();
    setSuppressBottomDockState(true);
    setProgrammaticScroll(true);

    if (Math.abs(distance) < 1) {
      window.scrollTo(0, targetY);
      setProgrammaticScroll(false);
      window.requestAnimationFrame(() => {
        setSuppressBottomDockState(false);
        syncFloatingDockClass();
      });
      return;
    }

    const step = (timestamp) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeInOutCubic(progress);
      window.scrollTo(0, startY + distance * eased);

      if (progress < 1) {
        activeScrollFrame = window.requestAnimationFrame(step);
        return;
      }

      activeScrollFrame = null;
      setProgrammaticScroll(false);
      window.requestAnimationFrame(() => {
        setSuppressBottomDockState(false);
        syncFloatingDockClass();
      });
    };

    activeScrollFrame = window.requestAnimationFrame(step);
  }

  function scrollEntryPanelIntoView() {
    scrollElementIntoView(document.querySelector("#entry-panel"));
  }

  function scrollSelectedCardIntoView() {
    const encodedCatalogKey = nodes.selectedSong?.dataset.catalogKey;
    if (encodedCatalogKey) {
      const catalogKey = decodeDatasetValue(encodedCatalogKey);
      const card = Array.from(nodes.catalog?.querySelectorAll(".song-card") ?? [])
        .find((item) => datasetValueMatches(item.dataset.catalogKey, catalogKey));
      if (card) {
        scrollElementIntoView(card);
        return;
      }
    }

    const encodedTitle = nodes.selectedSong?.dataset.title;
    if (!encodedTitle) {
      return;
    }

    const title = decodeDatasetValue(encodedTitle);
    const card = Array.from(nodes.catalog?.querySelectorAll(".song-card") ?? [])
      .find((item) => datasetValueMatches(item.dataset.title, title));
    if (card) {
      scrollElementIntoView(card);
    }
  }

  function scrollCatalogPanelIntoView() {
    scrollElementIntoView(nodes.catalogPanel ?? nodes.catalog);
  }

  return {
    scrollElementIntoView,
    scrollEntryPanelIntoView,
    scrollSelectedCardIntoView,
    scrollCatalogPanelIntoView,
  };
}
