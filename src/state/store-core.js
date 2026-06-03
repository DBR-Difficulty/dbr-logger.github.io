const MODULE_VERSION = new URL(import.meta.url).search;

const CATALOG_VIEW_MODES = ["card", "list", "table"];
const TABLE_PAGE_SIZE = 500;

const { LAMP_OPTIONS } = await import(`../constants.js${MODULE_VERSION}`);
const {
  areCsvRecordValuesEqual,
  buildDifficultyTextageIndex,
  buildRecordIndex,
  createPersistedState,
  createRecordId,
  getSongNoteKey,
  createTextageKeyFromCatalogEntry,
  exportRecordsAsCsv,
  exportRecordsAsDbrJson,
  getCsvRecordMergeKey,
  getLampRank,
  getCurrentRecordDate,
  getCurrentRecordTimestamp,
  getJsonRecordMergeKey,
  loadAppData,
  loadRemoteDifficultyTable,
  hydrateDifficultyTableWithKatate,
  migrateRecordTitlesByTextageKey,
  needsRecordIdMigration,
  normalizeDifficultyTableUpdatedAt,
  needsRecordTimestampMigration,
  normalizeRecordTimestamp,
  normalizeRecords,
  normalizeSongs,
  parseCsvRecords,
  parseDbrJsonRecords,
  parseOptionalNumber,
  pickBetterLamp,
  saveAppData,
  sortRecords,
  updateTextageKeyFromDifficultyTable,
} = await import(`./data.js${MODULE_VERSION}`);
const {
  AXIS_MEMORY_MODES,
  AXIS_RANGE_MODE_DISABLED,
  CHART_DIFFICULTY_OPTIONS,
  PAGE_SIZE,
  RECOMMEND_OPTIONS,
  RECOMMEND_SORT_OPTIONS,
  SCORE_RANK_OPTIONS,
  applySortDirectionFallbackIfNoPrimaryEffect,
  compareCatalogSongs,
  compareVisibleSongPriority: compareVisibleSongPriorityForFilters,
  createRecordScopedCatalogItem,
  deriveFilterBounds,
  deriveHistoryDates,
  getCatalogItemKey,
  getChartDifficultyRotationState,
  getDateFilterReturnBase,
  getDefaultDateRangeFromRecords,
  getDefaultSortModeForAxis,
  getEffectiveSummaryDisplayMode,
  filterHistoryByDateRange,
  getRecommendSortChoicesFromSongs,
  isTextAxisMode,
  matchesFiltersFor,
  matchesRecordScopedResultFilter,
  normalizeAxisMode,
  normalizeAxisRangeModeByAxis,
  shouldUseRecordScopedCatalog,
  normalizeAxisRanges,
  normalizeAxisSingleReturnValues,
  normalizeCatalogViewMode,
  normalizeChartDifficultySelection,
  normalizeChartDifficultySortHead,
  normalizeChartDifficultySortHeadForChoices,
  normalizeChartDifficultySortHeadMemory,
  normalizeDateRange,
  normalizeDateRangeMemory,
  normalizeDateSelectionMode,
  normalizeDateValue,
  normalizeBooleanFilter,
  normalizeDisplayMode,
  normalizeLampSelection,
  normalizeRecommendSelection,
  normalizeScoreRankSelection,
  normalizeRecommendSortHead,
  normalizeRecommendSortHeadForChoices,
  normalizeRecommendSortHeadMemory,
  normalizeSortDirection,
  normalizeSortMode,
  normalizeSortModeForDisplay,
  normalizeSortModeMemory,
  normalizeStoredFilters,
  normalizeSongDataFilterPair,
  normalizeSummaryDisplayMode,
  normalizeUnratedFilter,
  normalizeRandomSeed,
  normalizeAxisMemory,
} = await import(`./filters.js${MODULE_VERSION}`);
const {
  applyDateScopedDisplayValues,
  applyPlayDateAdjustment,
  buildCatalogSummary,
  buildSaveNotification,
  createDifficultyCatalogEntries,
  deriveSongState,
  formatSaveBpChangeValue,
  formatSaveScoreChangeValue,
  getScoreRankInfo,
} = await import(`./stats.js${MODULE_VERSION}`);
const { createEventBus } = await import(`./events.js${MODULE_VERSION}`);

function nowTimestamp() {
  return Date.now();
}

function splitStoredSongNotes(stored) {
  const v2Source = (typeof stored.songNotesV2 === "object" && stored.songNotesV2 !== null) ? stored.songNotesV2 : {};
  const notesSource = (typeof stored.songNotes === "object" && stored.songNotes !== null) ? stored.songNotes : {};

  const songNotes = {};
  const legacySongNotesTitleKeyed = {};

  Object.entries(v2Source).forEach(([key, value]) => {
    if (typeof value !== "string" || !value) return;
    songNotes[key] = value;
  });

  Object.entries(notesSource).forEach(([key, value]) => {
    if (typeof value !== "string" || !value) return;
    if (key.startsWith("textageKey:") || key.startsWith("title:")) {
      if (!(key in songNotes)) {
        songNotes[key] = value;
      }
    } else if (!(key in legacySongNotesTitleKeyed)) {
      legacySongNotesTitleKeyed[key] = value;
    }
  });

  return { songNotes, legacySongNotesTitleKeyed };
}

function normalizeStoredData(stored) {
  const normalizedFilters = normalizeStoredFilters(stored.filters);
  
  const normalizedTextQueryMemory = {
    title: typeof stored.textQueryMemory?.title === "string" ? stored.textQueryMemory.title : "",
    memo: typeof stored.textQueryMemory?.memo === "string" ? stored.textQueryMemory.memo : "",
  };
  
  if (isTextAxisMode(normalizedFilters.axisMode)) {
    normalizedTextQueryMemory[normalizedFilters.axisMode] = normalizedFilters.titleQuery;
  }
  
  const normalizedTitleFilterBase = stored.titleFilterBase ? normalizeStoredFilters(stored.titleFilterBase) : null;
  const normalizedDateFilterBase = stored.dateFilterBase ? normalizeStoredFilters(stored.dateFilterBase) : null;
  const normalizedDateRangeMemory = normalizeDateRangeMemory(stored.dateRangeMemory);
  const normalizedSortModeMemory = normalizeSortModeMemory(stored.sortModeMemory);
  const restoredFilters = isTextAxisMode(normalizedFilters.axisMode)
    ? (normalizedTitleFilterBase ? { ...normalizedTitleFilterBase } : {
      ...normalizedFilters,
      axisMode: "splv",
      axisValue: "",
      titleQuery: "",
    })
    : normalizedFilters;
  const normalizedSortMode = normalizedFilters.axisMode === "title"
    ? normalizeSortMode(stored.titleSortBase ?? stored.sortMode)
    : normalizeSortMode(stored.sortMode);

  return {
    songs: normalizeSongs(stored.songs),
    records: normalizeRecords(stored.records),
    difficultyTable: stored.difficultyTable ?? null,
    difficultyTableUpdatedAt: normalizeDifficultyTableUpdatedAt(stored),
    ...splitStoredSongNotes(stored),
    filters: restoredFilters,
    titleFilterBase: null,
    dateFilterBase: normalizedDateFilterBase,
    dateRangeMemory: normalizedDateRangeMemory,
    textQueryMemory: normalizedTextQueryMemory,
    axisMemory: normalizeAxisMemory(stored.axisMemory),
    sortMode: normalizeSortModeForDisplay(normalizedSortMode, normalizedFilters.displayMode),
    sortModeMemory: {
      ...normalizedSortModeMemory,
      [normalizedFilters.axisMode]: normalizeSortMode(stored.sortMode),
      [restoredFilters.axisMode]: normalizedSortMode,
    },
    chartDifficultySortHead: normalizeChartDifficultySortHead(stored.chartDifficultySortHead),
    chartDifficultySortHeadMemory: {
      ...normalizeChartDifficultySortHeadMemory(stored.chartDifficultySortHeadMemory),
      [normalizedFilters.axisMode]: normalizeChartDifficultySortHead(stored.chartDifficultySortHead),
      [restoredFilters.axisMode]: normalizeChartDifficultySortHead(stored.chartDifficultySortHead),
    },
    recommendSortHead: normalizeRecommendSortHead(stored.recommendSortHead),
    recommendSortHeadMemory: {
      ...normalizeRecommendSortHeadMemory(stored.recommendSortHeadMemory),
      [normalizedFilters.axisMode]: normalizeRecommendSortHead(stored.recommendSortHead),
      [restoredFilters.axisMode]: normalizeRecommendSortHead(stored.recommendSortHead),
    },
    sortDirection: normalizeSortDirection(stored.sortDirection),
    randomSeed: normalizeRandomSeed(stored.randomSeed),
    catalogViewMode: normalizeCatalogViewMode(stored.catalogViewMode),
    titleSortBase: normalizeSortMode(stored.titleSortBase),
  };
}

export function createStore() {
  const events = createEventBus();
  const state = {
    songs: [],
    records: [],
    difficultyTable: null,
    difficultyTableUpdatedAt: 0,
    songNotes: {},
    legacySongNotesTitleKeyed: {},
    catalogVisibleSignature: "",
    catalogVisibleTitleOrder: [],
    catalogVisibleItemSnapshot: [],
    preserveVisibleCatalogItemsOnce: false,
    titleFilterBase: null,
    dateFilterBase: null,
    dateRangeMemory: {
      dateStart: "",
      dateEnd: "",
    },
    titleSortBase: "splv",
    axisMemory: {
      level: "",
      splv: "",
      katate: "",
      version: "",
      bpm: "",
    },
    sortModeMemory: {},
    chartDifficultySortHead: CHART_DIFFICULTY_OPTIONS[0],
    chartDifficultySortHeadMemory: {},
    recommendSortHead: RECOMMEND_SORT_OPTIONS[0],
    recommendSortHeadMemory: {},
    textQueryMemory: {
      title: "",
      memo: "",
    },
    filters: {
      axisMode: "splv",
      axisValue: "",
      titleQuery: "",
      dateSelectionMode: "single",
      dateSingle: getCurrentRecordDate(),
      dateStart: "",
      dateEnd: "",
      axisRangeModeByAxis: normalizeAxisRangeModeByAxis(),
      axisRanges: normalizeAxisRanges(),
      axisLastRanges: normalizeAxisRanges(),
      axisSingleReturnValues: normalizeAxisSingleReturnValues(),
      displayMode: "all",
      summaryDisplayMode: "clear",
      recommend: [...RECOMMEND_OPTIONS],
      chartDifficulties: [...CHART_DIFFICULTY_OPTIONS],
      versionChartDifficulties: [...CHART_DIFFICULTY_OPTIONS],
      lamps: [...LAMP_OPTIONS],
      scoreRanks: [...SCORE_RANK_OPTIONS],
      inf: "all",
      acdelete: "all",
      includeUnrated: "all",
    },
    sortMode: "splv",
    sortDirection: "asc",
    randomSeed: 1,
    catalogViewMode: "card",
    currentPage: 1,
    selectedTitle: null,
    selectedCatalogKey: null,
    statusMessage: "",
    sourceLabel: "",
    ready: false,
    error: "",
  };

  let catalogSnapshotCache = null;

  function invalidateCatalogSnapshot() {
    catalogSnapshotCache = null;
  }

  let deleteAnchor = null;
  let deleteAnchorTimer = null;

  function emit(snapshot = getSnapshot()) {
    events.emit(snapshot);
  }

  function persist() {
    saveAppData(createPersistedState(state));
  }

  function getSongNote(entry) {
    const key = getSongNoteKey(entry);
    return state.songNotes[key] ?? "";
  }

  function setSongNote(entry, note) {
    const key = getSongNoteKey(entry);
    const normalizedNote = String(note ?? "").trim();
    if (normalizedNote) {
      state.songNotes[key] = normalizedNote;
    } else {
      delete state.songNotes[key];
    }
  }

  function migrateSongNotesToStableKeys() {
    const legacy = state.legacySongNotesTitleKeyed;
    if (!legacy || Object.keys(legacy).length === 0) {
      return false;
    }

    const catalogEntries = getCatalogEntries();
    let changed = false;

    catalogEntries.forEach((entry) => {
      const key = getSongNoteKey(entry);
      const legacyNote = legacy[entry.title];
      if (!legacyNote || state.songNotes[key]) {
        return;
      }

      state.songNotes[key] = legacyNote;
      changed = true;
    });

    state.legacySongNotesTitleKeyed = {};

    return changed;
  }

  function clearDeleteAnchor() {
    deleteAnchor = null;
    if (deleteAnchorTimer !== null) {
      window.clearTimeout(deleteAnchorTimer);
      deleteAnchorTimer = null;
    }
  }

  function setDeleteAnchor(title, date) {
    clearDeleteAnchor();

    const expiresAt = nowTimestamp() + 60_000;
    deleteAnchor = { title, date, expiresAt };
    deleteAnchorTimer = window.setTimeout(() => {
      deleteAnchor = null;
      deleteAnchorTimer = null;
      emit();
    }, 60_000);
  }

  function getDeleteAnchorDate(title) {
    if (!deleteAnchor || deleteAnchor.title !== title) {
      return null;
    }

    if (nowTimestamp() >= deleteAnchor.expiresAt) {
      clearDeleteAnchor();
      return null;
    }

    return deleteAnchor.date;
  }
  
  function createCatalogVisibleSignature() {
    const { summaryDisplayMode, ...catalogFilters } = state.filters;
    return JSON.stringify({
      filters: catalogFilters,
      sortMode: state.sortMode,
      chartDifficultySortHead: state.chartDifficultySortHead,
      recommendSortHead: state.recommendSortHead,
      randomSeed: state.randomSeed,
    });
  }
  
  function invalidateCatalogVisibleOrder() {
    state.catalogVisibleSignature = "";
    state.catalogVisibleTitleOrder = [];
    state.catalogVisibleItemSnapshot = [];
    state.preserveVisibleCatalogItemsOnce = false;
    invalidateCatalogSnapshot();
  }

  function createDeletedRecordScopedCatalogItem(snapshotItem, currentSongState) {
    return {
      ...snapshotItem,
      history: currentSongState.history,
      entryCount: currentSongState.entryCount,
      note: currentSongState.note,
      catalogItemKey: getCatalogItemKey(snapshotItem),
      isRecordScopedCard: true,
      isDeletedRecordScopedCard: true,
    };
  }

  function createRecordScopedPreservePool(visibleSongs, songStates) {
    if (!shouldUseRecordScopedCatalog(state.filters)) {
      return songStates;
    }

    const visibleKeys = new Set(visibleSongs.map((song) => getCatalogItemKey(song)));
    const songStateByTitle = new Map(songStates.map((song) => [song.title, song]));
    const deletedRecordItems = state.catalogVisibleItemSnapshot
      .filter((item) => item?.isRecordScopedCard && !visibleKeys.has(getCatalogItemKey(item)))
      .map((item) => {
        const currentSongState = songStateByTitle.get(item.title);
        return currentSongState ? createDeletedRecordScopedCatalogItem(item, currentSongState) : null;
      })
      .filter(Boolean);

    return [...visibleSongs, ...deletedRecordItems];
  }
  
  function applyStableVisibleOrder(visibleSongs, allSongStates = visibleSongs, options = {}) {
    const signature = createCatalogVisibleSignature();

    if (
      state.catalogVisibleSignature === signature
      && state.catalogVisibleTitleOrder.length > 0
    ) {
      const visibleSongByKey = new Map(visibleSongs.map((song) => [getCatalogItemKey(song), song]));
      const allSongByKey = new Map(allSongStates.map((song) => [getCatalogItemKey(song), song]));
      const usedKeys = new Set();
      const shouldKeepPreviousPool = state.sortMode === "latest" || options.preserveMissingItems;

      const stableSongs = state.catalogVisibleTitleOrder
        .map((key) => {
          const song = visibleSongByKey.get(key)
            ?? (shouldKeepPreviousPool ? allSongByKey.get(key) : null);

          if (song) {
            usedKeys.add(key);
          }

          return song;
        })
        .filter(Boolean);

      const appendedSongs = visibleSongs.filter((song) => !usedKeys.has(getCatalogItemKey(song)));

      const stableVisibleSongs = [...stableSongs, ...appendedSongs];
      state.catalogVisibleItemSnapshot = stableVisibleSongs;
      return stableVisibleSongs;
    }

    state.catalogVisibleSignature = signature;
    state.catalogVisibleTitleOrder = visibleSongs.map((song) => getCatalogItemKey(song));
    state.catalogVisibleItemSnapshot = visibleSongs;
    return visibleSongs;
  }

  function rememberTextQuery(axisMode, query) {
    if (!isTextAxisMode(axisMode)) {
      return;
    }
  
    state.textQueryMemory[axisMode] = typeof query === "string" ? query : "";
  }
  
  function getRememberedTextQuery(axisMode) {
    return isTextAxisMode(axisMode)
      ? state.textQueryMemory[axisMode] ?? ""
      : "";
  }

  function mergeTextAxisBaseFixedFilters(baseFilters, sourceFilters) {
    if (!baseFilters) {
      return null;
    }

    return {
      ...baseFilters,
      inf: sourceFilters.inf,
      acdelete: sourceFilters.acdelete,
      includeUnrated: sourceFilters.includeUnrated,
      displayMode: sourceFilters.displayMode,
      summaryDisplayMode: sourceFilters.summaryDisplayMode,
      recommend: [...sourceFilters.recommend],
      chartDifficulties: [...(sourceFilters.chartDifficulties ?? CHART_DIFFICULTY_OPTIONS)],
      scoreRanks: [...(sourceFilters.scoreRanks ?? SCORE_RANK_OPTIONS)],
    };
  }  

  function ensureSelectedSong(snapshot = getSnapshot()) {
    const visibleTitles = new Set(snapshot.pagedSongs.map((song) => song.title));
    const visibleKeys = new Set(snapshot.pagedSongs.map((song) => getCatalogItemKey(song)));

    if (!state.selectedTitle || !visibleTitles.has(state.selectedTitle) || (state.selectedCatalogKey && !visibleKeys.has(state.selectedCatalogKey))) {
      const nextSong = snapshot.pagedSongs[0] ?? snapshot.visibleSongs[0] ?? null;
      state.selectedTitle = nextSong?.title ?? null;
      state.selectedCatalogKey = nextSong ? getCatalogItemKey(nextSong) : null;
      return getSnapshot();
    }

    return snapshot;
  }

  function getCatalogEntries() {
    return state.difficultyTable?.entries?.length ? createDifficultyCatalogEntries(state.difficultyTable) : [];
  }

  async function initialize() {
    try {
      const stored = loadAppData();

      if (stored) {
        const needsTimestampMigration = needsRecordTimestampMigration(stored.records);
        const needsIdMigration = needsRecordIdMigration(stored.records);
        const normalized = normalizeStoredData(stored);
        let didMutateStoredData = needsTimestampMigration || needsIdMigration;
        state.songs = normalized.songs;
        state.records = normalized.records;
        state.difficultyTable = normalized.difficultyTable;
        state.difficultyTableUpdatedAt = normalized.difficultyTableUpdatedAt;
        state.songNotes = normalized.songNotes;
        state.legacySongNotesTitleKeyed = normalized.legacySongNotesTitleKeyed;
        state.titleFilterBase = normalized.titleFilterBase;
        state.dateFilterBase = normalized.dateFilterBase;
        state.dateRangeMemory = normalized.dateRangeMemory;
        state.titleSortBase = normalized.titleSortBase;
        state.textQueryMemory = normalized.textQueryMemory;
        state.axisMemory = normalized.axisMemory;
        state.sortModeMemory = normalized.sortModeMemory;
        state.chartDifficultySortHead = normalized.chartDifficultySortHead;
        state.chartDifficultySortHeadMemory = normalized.chartDifficultySortHeadMemory;
        state.recommendSortHead = normalized.recommendSortHead;
        state.recommendSortHeadMemory = normalized.recommendSortHeadMemory;
        state.filters = normalized.filters;
        state.sortMode = normalized.sortMode;
        state.sortDirection = normalized.sortDirection;
        state.catalogViewMode = normalized.catalogViewMode;

        if (state.filters.axisMode === "date" && (!state.filters.dateStart || !state.filters.dateEnd)) {
          const defaultDateRange = getDefaultDateRangeFromRecords(state.records);
          state.filters = {
            ...state.filters,
            ...defaultDateRange,
          };
          didMutateStoredData = true;
        }

        if (state.difficultyTable?.entries?.length) {
          try {
            const { table, changedCount } = await hydrateDifficultyTableWithKatate(state.difficultyTable);
            state.difficultyTable = table;
            if (changedCount > 0) {
              didMutateStoredData = true;
            }
          } catch {
            // Keep existing data if local katate hydration fails.
          }
        }

        if (migrateSongNotesToStableKeys()) {
          didMutateStoredData = true;
        }

        if (didMutateStoredData) {
          persist();
        }

        state.sourceLabel = "ローカルストレージから復元";
        if (!state.statusMessage) {
          state.statusMessage = `保存済みデータを読み込みました。記録数 ${state.records.length} 件`;
        }
      } else {
        state.songs = [];
        state.records = [];
        state.difficultyTable = null;
        state.difficultyTableUpdatedAt = 0;
        state.songNotes = {};
        state.legacySongNotesTitleKeyed = {};
        state.sourceLabel = "";
        state.statusMessage = "難易度表を読み込むと曲一覧を表示できます。";
        persist();
      }

      state.ready = true;
      ensureSelectedSong();
      emit();
    } catch (error) {
      state.error = error instanceof Error ? error.message : "初期化に失敗しました。";
      state.statusMessage = state.error;
      state.ready = true;
      emit();
    }
  }

  function setDifficultyFilters(nextFilters) {
    const previousFilters = state.filters;
    const nextAxisMode = normalizeAxisMode(nextFilters.axisMode ?? state.filters.axisMode);
    const nextDisplayMode = normalizeDisplayMode(nextFilters.displayMode ?? state.filters.displayMode);
    const requestedSummaryDisplayMode = normalizeSummaryDisplayMode(nextFilters.summaryDisplayMode ?? state.filters.summaryDisplayMode);
    const nextSummaryDisplayMode = nextDisplayMode === "all" ? requestedSummaryDisplayMode : nextDisplayMode;
    const axisModeChanged = nextAxisMode !== previousFilters.axisMode;
    const nextAxisMemory = { ...state.axisMemory };
    const nextSortModeMemory = { ...state.sortModeMemory };
    const nextChartDifficultySortHeadMemory = { ...state.chartDifficultySortHeadMemory };
    const nextRecommendSortHeadMemory = { ...state.recommendSortHeadMemory };

    if (AXIS_MEMORY_MODES.includes(previousFilters.axisMode)) {
      nextAxisMemory[previousFilters.axisMode] = previousFilters.axisValue;
    }

    if (previousFilters.axisMode === "date") {
      state.dateRangeMemory = normalizeDateRange(previousFilters.dateStart, previousFilters.dateEnd);
    }

    let nextAxisValue = typeof nextFilters.axisValue === "string"
      ? nextFilters.axisValue
      : state.filters.axisValue;
    let nextTitleQuery = typeof nextFilters.titleQuery === "string"
      ? nextFilters.titleQuery
      : state.filters.titleQuery;
    let nextDateStart = nextFilters.dateStart ?? state.filters.dateStart;
    let nextDateEnd = nextFilters.dateEnd ?? state.filters.dateEnd;
    let nextDateSelectionMode = normalizeDateSelectionMode(nextFilters.dateSelectionMode ?? state.filters.dateSelectionMode);
    let nextDateSingle = nextFilters.dateSingle ?? state.filters.dateSingle ?? getCurrentRecordDate();

    if (axisModeChanged) {
      const wasTextAxisMode = isTextAxisMode(previousFilters.axisMode);
      const nextIsTextAxisMode = isTextAxisMode(nextAxisMode);
      nextSortModeMemory[previousFilters.axisMode] = state.sortMode;
      nextChartDifficultySortHeadMemory[previousFilters.axisMode] = state.chartDifficultySortHead;
      nextRecommendSortHeadMemory[previousFilters.axisMode] = state.recommendSortHead;
    
      if (wasTextAxisMode) {
        rememberTextQuery(previousFilters.axisMode, previousFilters.titleQuery);
      }
    
      if (nextIsTextAxisMode) {
        if (!wasTextAxisMode) {
          state.titleFilterBase = { ...previousFilters };
          state.titleSortBase = state.sortMode;
        }
    
        nextAxisValue = "";
        nextTitleQuery = getRememberedTextQuery(nextAxisMode);
        state.dateFilterBase = null;
      } else if (nextAxisMode === "date") {
        const defaultDateRange = getDefaultDateRangeFromRecords(state.records);
        const rememberedDateRange = normalizeDateRangeMemory(state.dateRangeMemory);
        state.dateFilterBase = getDateFilterReturnBase(previousFilters, state.titleFilterBase);
        state.titleFilterBase = null;
        nextAxisValue = "";
        nextTitleQuery = "";
        nextDateSelectionMode = normalizeDateSelectionMode(nextFilters.dateSelectionMode ?? state.filters.dateSelectionMode);
        nextDateSingle = typeof nextFilters.dateSingle === "string"
          ? nextFilters.dateSingle
          : state.filters.dateSingle || getCurrentRecordDate();
        nextDateStart = typeof nextFilters.dateStart === "string"
          ? nextFilters.dateStart
          : rememberedDateRange.dateStart || defaultDateRange.dateStart;
        nextDateEnd = typeof nextFilters.dateEnd === "string"
          ? nextFilters.dateEnd
          : rememberedDateRange.dateEnd || defaultDateRange.dateEnd;
      } else {
        state.titleFilterBase = null;
        state.dateFilterBase = null;
        nextAxisValue = nextAxisMode === "date"
          ? ""
          : (typeof nextFilters.axisValue === "string"
            ? nextFilters.axisValue
            : nextAxisMemory[nextAxisMode] ?? "");
        nextTitleQuery = "";
      }

      state.sortMode = normalizeSortModeForDisplay(
        nextSortModeMemory[nextAxisMode] ?? getDefaultSortModeForAxis(nextAxisMode),
        nextDisplayMode,
      );
      state.chartDifficultySortHead = normalizeChartDifficultySortHead(nextChartDifficultySortHeadMemory[nextAxisMode]);
      state.recommendSortHead = normalizeRecommendSortHead(nextRecommendSortHeadMemory[nextAxisMode]);
      state.sortDirection = "asc";
      nextSortModeMemory[nextAxisMode] = state.sortMode;
      nextChartDifficultySortHeadMemory[nextAxisMode] = state.chartDifficultySortHead;
      nextRecommendSortHeadMemory[nextAxisMode] = state.recommendSortHead;
    }

    const nextDateRange = normalizeDateRange(
      nextDateStart,
      nextDateEnd,
    );

    const nextStateFilters = {
      ...state.filters,
      ...nextFilters,
      axisMode: nextAxisMode,
      axisValue: typeof nextAxisValue === "string" ? nextAxisValue : "",
      titleQuery: typeof nextTitleQuery === "string" ? nextTitleQuery : "",
      dateSelectionMode: nextDateSelectionMode,
      dateSingle: normalizeDateValue(nextDateSingle) || getCurrentRecordDate(),
      dateStart: nextDateRange.dateStart,
      dateEnd: nextDateRange.dateEnd,
      axisRangeModeByAxis: nextFilters.axisRangeModeByAxis
        ? normalizeAxisRangeModeByAxis(nextFilters.axisRangeModeByAxis)
        : state.filters.axisRangeModeByAxis,
      axisRanges: nextFilters.axisRanges
        ? normalizeAxisRanges(nextFilters.axisRanges)
        : state.filters.axisRanges,
      axisLastRanges: nextFilters.axisLastRanges
        ? normalizeAxisRanges(nextFilters.axisLastRanges)
        : state.filters.axisLastRanges,
      axisSingleReturnValues: nextFilters.axisSingleReturnValues
        ? normalizeAxisSingleReturnValues(nextFilters.axisSingleReturnValues)
        : state.filters.axisSingleReturnValues,
      displayMode: nextDisplayMode,
      summaryDisplayMode: nextSummaryDisplayMode,
      recommend: nextFilters.recommend ? normalizeRecommendSelection(nextFilters.recommend) : state.filters.recommend,
      chartDifficulties: nextFilters.chartDifficulties
        ? normalizeChartDifficultySelection(nextFilters.chartDifficulties)
        : state.filters.chartDifficulties,
      versionChartDifficulties: nextFilters.versionChartDifficulties
        ? normalizeChartDifficultySelection(nextFilters.versionChartDifficulties)
        : state.filters.versionChartDifficulties,
      lamps: nextFilters.lamps ? normalizeLampSelection(nextFilters.lamps) : state.filters.lamps,
      scoreRanks: nextFilters.scoreRanks ? normalizeScoreRankSelection(nextFilters.scoreRanks) : state.filters.scoreRanks,
      inf: nextFilters.inf ? normalizeBooleanFilter(nextFilters.inf) : state.filters.inf,
      acdelete: nextFilters.acdelete ? normalizeBooleanFilter(nextFilters.acdelete) : state.filters.acdelete,
      includeUnrated: normalizeUnratedFilter(nextFilters.includeUnrated ?? state.filters.includeUnrated),
    };
    const songDataFilter = normalizeSongDataFilterPair(nextStateFilters.inf, nextStateFilters.acdelete);
    nextStateFilters.inf = songDataFilter.inf;
    nextStateFilters.acdelete = songDataFilter.acdelete;

    if (!axisModeChanged) {
      const normalizedSortMode = normalizeSortModeForDisplay(state.sortMode, nextStateFilters.displayMode);
      if (normalizedSortMode !== state.sortMode) {
        state.sortMode = normalizedSortMode;
        nextSortModeMemory[nextStateFilters.axisMode] = normalizedSortMode;
      }
    }

    if (nextStateFilters.includeUnrated === "unrated" && nextStateFilters.axisMode === "level") {
      nextStateFilters.axisValue = "";
    }

    if (isTextAxisMode(nextStateFilters.axisMode)) {
      rememberTextQuery(nextStateFilters.axisMode, nextStateFilters.titleQuery);
    } else if (AXIS_MEMORY_MODES.includes(nextStateFilters.axisMode)) {
      nextAxisMemory[nextStateFilters.axisMode] = nextStateFilters.axisValue;
    }

    if (nextStateFilters.axisMode === "date") {
      state.dateRangeMemory = {
        dateStart: nextStateFilters.dateStart,
        dateEnd: nextStateFilters.dateEnd,
      };
    }

    if (isTextAxisMode(nextStateFilters.axisMode) && state.titleFilterBase) {
      state.titleFilterBase = mergeTextAxisBaseFixedFilters(
        state.titleFilterBase,
        nextStateFilters,
      );
    }

    state.axisMemory = nextAxisMemory;
    state.sortModeMemory = nextSortModeMemory;
    state.chartDifficultySortHeadMemory = nextChartDifficultySortHeadMemory;
    state.recommendSortHeadMemory = nextRecommendSortHeadMemory;
    state.filters = nextStateFilters;
    invalidateCatalogVisibleOrder();
    state.currentPage = 1;
    persist();
    
    let snapshot = getSnapshot();
    snapshot = ensureSelectedSong(snapshot);
    emit(snapshot);
  }

  function clearTitleFilter() {
    if (!state.titleFilterBase) {
      return;
    }

    rememberTextQuery(state.filters.axisMode, state.filters.titleQuery);
    state.sortModeMemory = {
      ...state.sortModeMemory,
      [state.filters.axisMode]: state.sortMode,
    };
    state.chartDifficultySortHeadMemory = {
      ...state.chartDifficultySortHeadMemory,
      [state.filters.axisMode]: state.chartDifficultySortHead,
    };
    state.recommendSortHeadMemory = {
      ...state.recommendSortHeadMemory,
      [state.filters.axisMode]: state.recommendSortHead,
    };
    state.filters = { ...state.titleFilterBase };
    state.titleFilterBase = null;
    state.sortMode = normalizeSortModeForDisplay(state.titleSortBase, state.filters.displayMode);
    state.chartDifficultySortHead = normalizeChartDifficultySortHead(state.chartDifficultySortHeadMemory[state.filters.axisMode]);
    state.recommendSortHead = normalizeRecommendSortHead(state.recommendSortHeadMemory[state.filters.axisMode]);
    state.sortModeMemory = {
      ...state.sortModeMemory,
      [state.filters.axisMode]: state.sortMode,
    };
    invalidateCatalogVisibleOrder();
    state.currentPage = 1;
    persist();
    ensureSelectedSong();
    emit();
  }

  function clearDateFilter() {
    state.sortModeMemory = {
      ...state.sortModeMemory,
      [state.filters.axisMode]: state.sortMode,
    };
    state.chartDifficultySortHeadMemory = {
      ...state.chartDifficultySortHeadMemory,
      [state.filters.axisMode]: state.chartDifficultySortHead,
    };
    state.recommendSortHeadMemory = {
      ...state.recommendSortHeadMemory,
      [state.filters.axisMode]: state.recommendSortHead,
    };
    state.dateRangeMemory = normalizeDateRange(state.filters.dateStart, state.filters.dateEnd);
    state.filters = state.dateFilterBase
      ? { ...state.dateFilterBase }
      : {
        ...state.filters,
        axisMode: "splv",
        axisValue: "",
        titleQuery: "",
        dateSelectionMode: "single",
        dateSingle: getCurrentRecordDate(),
        dateStart: "",
        dateEnd: "",
      };
    state.dateFilterBase = null;
    state.sortMode = normalizeSortModeForDisplay(
      state.sortModeMemory[state.filters.axisMode] ?? getDefaultSortModeForAxis(state.filters.axisMode),
      state.filters.displayMode,
    );
    state.chartDifficultySortHead = normalizeChartDifficultySortHead(state.chartDifficultySortHeadMemory[state.filters.axisMode]);
    state.recommendSortHead = normalizeRecommendSortHead(state.recommendSortHeadMemory[state.filters.axisMode]);
    state.sortModeMemory = {
      ...state.sortModeMemory,
      [state.filters.axisMode]: state.sortMode,
    };
    invalidateCatalogVisibleOrder();
    state.currentPage = 1;
    persist();
    ensureSelectedSong();
    emit();
  }

  function setPage(nextPage) {
    const snapshot = getSnapshot();
    const totalPages = snapshot.pagination.totalPages;
    const normalized = Math.max(1, Math.min(nextPage, totalPages));

    if (normalized === state.currentPage) {
      return;
    }

    state.currentPage = normalized;
    invalidateCatalogSnapshot();
    ensureSelectedSong();
    emit();
  }

  function setSortMode(nextSortMode) {
    const normalized = normalizeSortMode(nextSortMode);
    if (normalized === state.sortMode) {
      return;
    }

    state.sortMode = normalized;
    state.sortDirection = "asc";
    if (normalized === "random") {
      state.randomSeed = nowTimestamp();
    }
    state.sortModeMemory = {
      ...state.sortModeMemory,
      [state.filters.axisMode]: normalized,
    };
    state.chartDifficultySortHeadMemory = {
      ...state.chartDifficultySortHeadMemory,
      [state.filters.axisMode]: state.chartDifficultySortHead,
    };
    state.recommendSortHeadMemory = {
      ...state.recommendSortHeadMemory,
      [state.filters.axisMode]: state.recommendSortHead,
    };
    invalidateCatalogVisibleOrder();
    state.currentPage = 1;
    persist();
    ensureSelectedSong();
    emit();
  }

  function setTableSortState(nextSortMode, nextSortDirection) {
    const normalizedSortMode = normalizeSortMode(nextSortMode);
    const normalizedSortDirection = normalizeSortDirection(nextSortDirection);
    if (normalizedSortMode === state.sortMode && normalizedSortDirection === state.sortDirection) {
      return;
    }

    state.sortMode = normalizedSortMode;
    state.sortDirection = normalizedSortDirection;
    if (normalizedSortMode === "random") {
      state.randomSeed = nowTimestamp();
    }
    state.sortModeMemory = {
      ...state.sortModeMemory,
      [state.filters.axisMode]: normalizedSortMode,
    };
    state.chartDifficultySortHeadMemory = {
      ...state.chartDifficultySortHeadMemory,
      [state.filters.axisMode]: state.chartDifficultySortHead,
    };
    state.recommendSortHeadMemory = {
      ...state.recommendSortHeadMemory,
      [state.filters.axisMode]: state.recommendSortHead,
    };
    invalidateCatalogVisibleOrder();
    state.currentPage = 1;
    persist();
    ensureSelectedSong();
    emit();
  }

  function toggleSortDirection() {
    if (state.sortMode === "random") {
      state.randomSeed = nowTimestamp();
      invalidateCatalogVisibleOrder();
      state.currentPage = 1;
      persist();
      ensureSelectedSong();
      emit();
      return;
    }

    state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
    invalidateCatalogVisibleOrder();
    state.currentPage = 1;
    persist();
    ensureSelectedSong();
    emit();
  }

  function rotateChartDifficultySortHead() {
    if (state.sortMode !== "chartDifficulty") {
      return;
    }

    const rotationState = getChartDifficultyRotationState(getCatalogSnapshot().visibleSongs, state.chartDifficultySortHead);
    if (rotationState.choices.length === 0) {
      return;
    }

    const currentIndex = rotationState.choices.indexOf(rotationState.head);
    const nextIndex = ((currentIndex >= 0 ? currentIndex : 0) + 1) % rotationState.choices.length;
    state.chartDifficultySortHead = rotationState.choices[nextIndex];
    state.chartDifficultySortHeadMemory = {
      ...state.chartDifficultySortHeadMemory,
      [state.filters.axisMode]: state.chartDifficultySortHead,
    };
    invalidateCatalogVisibleOrder();
    state.currentPage = 1;
    persist();
    ensureSelectedSong();
    emit();
  }

  function rotateRecommendSortHead() {
    if (state.sortMode !== "recommend") {
      return;
    }

    const choices = getRecommendSortChoicesFromSongs(getCatalogSnapshot().visibleSongs);
    if (choices.length === 0) {
      return;
    }

    const currentHead = normalizeRecommendSortHeadForChoices(state.recommendSortHead, choices);
    const currentIndex = choices.indexOf(currentHead);
    const nextIndex = ((currentIndex >= 0 ? currentIndex : 0) + 1) % choices.length;
    state.recommendSortHead = choices[nextIndex];
    state.recommendSortHeadMemory = {
      ...state.recommendSortHeadMemory,
      [state.filters.axisMode]: state.recommendSortHead,
    };
    invalidateCatalogVisibleOrder();
    state.currentPage = 1;
    persist();
    ensureSelectedSong();
    emit();
  }

  function toggleCatalogViewMode() {
    const currentIndex = CATALOG_VIEW_MODES.indexOf(state.catalogViewMode);
    const nextIndex = ((currentIndex >= 0 ? currentIndex : 0) + 1) % CATALOG_VIEW_MODES.length;
    state.catalogViewMode = CATALOG_VIEW_MODES[nextIndex];
    invalidateCatalogSnapshot();
    persist();
    ensureSelectedSong();
    emit();
  }

  function selectSong(title, catalogItemKey = null) {
    const normalizedTitle = typeof title === "string" ? title : "";
    const normalizedCatalogKey = typeof catalogItemKey === "string" ? catalogItemKey : null;

    if (!normalizedTitle || (normalizedTitle === state.selectedTitle && normalizedCatalogKey === state.selectedCatalogKey)) {
      return;
    }

    state.selectedTitle = normalizedTitle;
    state.selectedCatalogKey = normalizedCatalogKey;
    emit();
  }

  function saveRecord({ lamp, bp, score, memo }) {
    if (!state.selectedTitle) {
      return { ok: false, message: "曲を選択してください。" };
    }

    const selectedEntry = getCatalogEntries().find((item) => item.title === state.selectedTitle);
    if (!selectedEntry) {
      return { ok: false, message: "選択中の曲情報が見つかりません。" };
    }

    const normalizedMemo = String(memo ?? "").trim();
    const normalizedBp = parseOptionalNumber(bp);
    const normalizedScore = parseOptionalNumber(score);
    const isValidLamp = LAMP_OPTIONS.includes(lamp);
    const hasBp = normalizedBp !== null;
    const hasScore = normalizedScore !== null;
    const hasMemo = normalizedMemo !== "";
    const canSaveRecord = lamp !== "NO PLAY" || hasBp || hasScore;

    if (hasBp && (!Number.isInteger(normalizedBp) || normalizedBp < 0)) {
      return { ok: false, message: "BPは0以上の整数で入力してください。" };
    }

    if (hasScore && (!Number.isInteger(normalizedScore) || normalizedScore < 0)) {
      return { ok: false, message: "スコアは0以上の整数で入力してください。" };
    }

    if (!isValidLamp) {
      return { ok: false, message: "ランプを選択してください。" };
    }

    if (!canSaveRecord) {
      return saveSongNote(normalizedMemo);
    }

    const previousHistory = buildRecordIndex(state.records).get(selectedEntry.title) ?? [];
    const previousState = deriveSongState(selectedEntry, previousHistory);
    const notificationLines = [
      `${previousState.bestLamp} → ${lamp}`,
      `${formatSaveScoreChangeValue(previousState.bestScore, selectedEntry)} → ${formatSaveScoreChangeValue(normalizedScore, selectedEntry)}`,
      `BP ${formatSaveBpChangeValue(previousState.bestBp)} → ${formatSaveBpChangeValue(normalizedBp)}`,
      `メモ：${normalizedMemo}`,
    ];

    if (hasMemo) {
      setSongNote(selectedEntry, normalizedMemo);
    } else {
      setSongNote(selectedEntry, "");
    }

    const date = getCurrentRecordDate();
    const timestamp = getCurrentRecordTimestamp();
    const chartSuffix = selectedEntry.title.match(/\(([BNHAL])\)$/)?.[0] ?? "";
    state.records.push({
      id: createRecordId(),
      timestamp,
      date,
      title: selectedEntry.title,
      level: selectedEntry.levelValue ?? null,
      splv: selectedEntry.splvValue ?? null,
      lamp,
      bp: normalizedBp,
      score: normalizedScore,
      textageKey: selectedEntry.textageid ? `${selectedEntry.textageid}${chartSuffix}` : "",
      source: "manual",
    });
    state.statusMessage = `${selectedEntry.title} の記録を保存しました。`;

    state.records.sort(sortRecords);
    state.preserveVisibleCatalogItemsOnce = true;
    invalidateCatalogSnapshot();
    persist();
    emit();
    return { ok: true, message: state.statusMessage, notificationMessage: buildSaveNotification(notificationLines) };
  }

  function deleteRecord(recordId) {
    const recordIndex = state.records.findIndex((record) => record.id === recordId);
    if (recordIndex === -1) {
      return { ok: false, message: "記録が見つかりません。" };
    }

    state.records.splice(recordIndex, 1);
    state.statusMessage = "記録を削除しました。";
    state.preserveVisibleCatalogItemsOnce = true;
    invalidateCatalogSnapshot();
    persist();
    emit();
    return { ok: true, message: state.statusMessage };
  }

  function saveSongNote(note) {
    if (!state.selectedTitle) {
      return { ok: false, message: "曲を選択してください。" };
    }

    const selectedEntry = getCatalogEntries().find((item) => item.title === state.selectedTitle);
    if (!selectedEntry) {
      return { ok: false, message: "選択中の曲情報が見つかりません。" };
    }

    const normalizedMemo = String(note ?? "").trim();
    if (normalizedMemo) {
      setSongNote(selectedEntry, normalizedMemo);
      state.statusMessage = `${selectedEntry.title} のメモを保存しました。`;
    } else {
      setSongNote(selectedEntry, "");
      state.statusMessage = `${selectedEntry.title} のメモを削除しました。`;
    }

    invalidateCatalogSnapshot();
    persist();
    emit();
    return { ok: true, message: state.statusMessage, notificationMessage: buildSaveNotification([`メモ：${normalizedMemo}`]) };
  }

  function getExportJson() {
    return exportRecordsAsDbrJson(state.records, state.difficultyTable, (title, history) => {
      const bestLamp = history.reduce((best, record) => pickBetterLamp(best, record.lamp), "NO PLAY");
      const bestBpValues = history.map((record) => record.bp).filter((value) => Number.isFinite(value));
      const bestBp = bestBpValues.length > 0 ? Math.min(...bestBpValues) : Number.POSITIVE_INFINITY;
      const bestScore = history.reduce((best, record) => (
        record.score === null || record.score === undefined ? best : Math.max(best, record.score)
      ), Number.NEGATIVE_INFINITY);
      const difficultyTextageIndex = buildDifficultyTextageIndex(state.difficultyTable);
      const storedTextageKey = history.find((record) => record.textageKey)?.textageKey ?? "";
      const textageid = difficultyTextageIndex.get(title) ?? "";
      const suffix = title.slice(-3);
      const latestTextageKey = textageid && /^\([A-Z]\)$/.test(suffix) ? textageid + suffix : storedTextageKey;

      return {
        title,
        entryCount: history.length,
        bestLamp,
        bestBp: Number.isFinite(bestBp) ? bestBp : null,
        bestScore: Number.isFinite(bestScore) ? bestScore : null,
        textageid,
        textageKey: latestTextageKey,
      };
    });
  }

  function getExportCsv() {
    const exportSongNotes = {};
    getCatalogEntries().forEach((entry) => {
      const note = getSongNote(entry);
      if (note) {
        exportSongNotes[entry.title] = note;
      }
    });
    return exportRecordsAsCsv(state.records, exportSongNotes, state.difficultyTable);
  }

  function normalizeJsonImportLamp(value) {
    return LAMP_OPTIONS.includes(value) && value !== "NO PLAY" ? value : null;
  }

  function normalizeJsonImportNumber(value) {
    const parsed = parseOptionalNumber(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function isJsonRecordImprovement(record, currentState) {
    const importedLamp = normalizeJsonImportLamp(record?.lamp);
    const importedBp = normalizeJsonImportNumber(record?.bp);
    const importedScore = normalizeJsonImportNumber(record?.score);

    const currentBestLamp = currentState?.bestLamp ?? "NO PLAY";
    const currentBestBp = currentState?.bestBp ?? null;
    const currentBestScore = currentState?.bestScore ?? null;

    const lampImproved = importedLamp !== null
      && getLampRank(importedLamp) > getLampRank(currentBestLamp);

    const bpImproved = importedBp !== null
      && (!Number.isFinite(currentBestBp) || importedBp < currentBestBp);

    const scoreImproved = importedScore !== null
      && (!Number.isFinite(currentBestScore) || importedScore > currentBestScore);

    return lampImproved || bpImproved || scoreImproved;
  }

  function removeJsonAggregateReflectedValues(record, currentFullState) {
    const importedLamp = normalizeJsonImportLamp(record?.lamp);
    const importedBp = normalizeJsonImportNumber(record?.bp);
    const importedScore = normalizeJsonImportNumber(record?.score);

    const nextRecord = { ...record };

    if (importedLamp !== null && importedLamp === currentFullState?.bestLamp) {
      nextRecord.lamp = "NO PLAY";
    }

    if (importedBp !== null && importedBp === currentFullState?.bestBp) {
      nextRecord.bp = null;
    }

    if (importedScore !== null && importedScore === currentFullState?.bestScore) {
      nextRecord.score = null;
    }

    return nextRecord;
  }

  function hasJsonImportValue(record) {
    return normalizeJsonImportLamp(record?.lamp) !== null
      || normalizeJsonImportNumber(record?.bp) !== null
      || normalizeJsonImportNumber(record?.score) !== null;
  }

  function importJsonData(payload, referenceDate = getCurrentRecordDate()) {
    const catalogEntryByTitle = new Map(getCatalogEntries().map((entry) => [entry.title, entry]));

    const comparableRecordIndex = buildRecordIndex(
      state.records.filter((record) => record.date && record.date <= referenceDate),
    );

    const fullRecordIndex = buildRecordIndex(state.records);

    const importedRecords = parseDbrJsonRecords(payload, referenceDate)
      .map((record) => {
        const selectedEntry = catalogEntryByTitle.get(record.title);

        if (!selectedEntry) {
          return null;
        }

        const comparableState = deriveSongState(
          selectedEntry,
          comparableRecordIndex.get(selectedEntry.title) ?? [],
        );

        if (!isJsonRecordImprovement(record, comparableState)) {
          return null;
        }

        const currentFullState = deriveSongState(
          selectedEntry,
          fullRecordIndex.get(selectedEntry.title) ?? [],
        );

        const nextRecord = removeJsonAggregateReflectedValues(record, currentFullState);
        return hasJsonImportValue(nextRecord) ? nextRecord : null;
      })
      .filter(Boolean)
      .map((record) => {
        const selectedEntry = catalogEntryByTitle.get(record.title);
        const level = selectedEntry?.levelValue ?? record.level ?? null;
        const splv = selectedEntry?.splvValue ?? record.splv ?? null;

        return {
          id: createRecordId(),
          timestamp: normalizeRecordTimestamp(record.timestamp, record.date),
          date: record.date,
          title: record.title,
          level,
          splv,
          lamp: LAMP_OPTIONS.includes(record.lamp) ? record.lamp : "NO PLAY",
          bp: record.bp,
          score: record.score,
          textageKey: record.textageKey,
          source: record.source,
        };
      });

    const importedKeys = new Set(importedRecords.map(getJsonRecordMergeKey));
    const preservedRecords = state.records.filter((record) => !importedKeys.has(getJsonRecordMergeKey(record)));

    state.records = [...preservedRecords, ...importedRecords].sort(sortRecords);
    invalidateCatalogVisibleOrder();
    state.currentPage = 1;
    state.statusMessage = `JSONを読み込みました。${importedRecords.length} 件を取り込み、合計 ${state.records.length} 件になりました。`;
    persist();
    ensureSelectedSong();
    emit();
    return { count: importedRecords.length, totalCount: state.records.length };
  }

  function importCsvData(text) {
    const { records, songNotes: importedNotesByTitle } = parseCsvRecords(text, state.difficultyTable);
    const catalogEntryByTitle = new Map(getCatalogEntries().map((entry) => [entry.title, entry]));
    const importedRecords = records.map((record) => {
      const selectedEntry = catalogEntryByTitle.get(record.title);
      const level = selectedEntry?.levelValue ?? record.level ?? null;
      const splv = selectedEntry?.splvValue ?? record.splv ?? null;
      const textageKey = typeof record.textageKey === "string" && record.textageKey
        ? record.textageKey
        : createTextageKeyFromCatalogEntry(selectedEntry);

      return {
        id: createRecordId(),
        timestamp: normalizeRecordTimestamp(record.timestamp, record.date),
        date: record.date,
        title: record.title,
        level,
        splv,
        lamp: LAMP_OPTIONS.includes(record.lamp) ? record.lamp : "NO PLAY",
        bp: record.bp,
        score: record.score ?? null,
        textageKey,
        source: record.source,
      };
    });

    const existingRecordByKey = new Map(
      state.records.map((record) => [getCsvRecordMergeKey(record), record]),
    );

    const updatedRecordCount = importedRecords.reduce((count, record) => {
      const existing = existingRecordByKey.get(getCsvRecordMergeKey(record));

      if (!existing) {
        return count + 1;
      }

      return areCsvRecordValuesEqual(existing, record) ? count : count + 1;
    }, 0);

    const importedKeys = new Set(importedRecords.map(getCsvRecordMergeKey));
    const preservedRecords = state.records.filter((record) => !importedKeys.has(getCsvRecordMergeKey(record)));

    state.records = [...preservedRecords, ...importedRecords].sort(sortRecords);
    if (state.difficultyTable) {
      state.records = migrateRecordTitlesByTextageKey(state.records, state.difficultyTable);
      state.records = updateTextageKeyFromDifficultyTable(state.records, state.difficultyTable);
      state.records = state.records.sort(sortRecords);
    }    
    state.legacySongNotesTitleKeyed = {
      ...state.legacySongNotesTitleKeyed,
      ...importedNotesByTitle,
    };
    migrateSongNotesToStableKeys();
    invalidateCatalogVisibleOrder();
    state.currentPage = 1;
    state.statusMessage = `CSVを読み込みました。${updatedRecordCount} 件を取り込み、合計 ${state.records.length} 件になりました。`;
    persist();
    ensureSelectedSong();
    emit();
    return { count: updatedRecordCount, totalCount: state.records.length };
  }

  function clearAllRecords() {
    state.records = [];
    state.songNotes = {};
    state.legacySongNotesTitleKeyed = {};
    invalidateCatalogVisibleOrder();
    state.currentPage = 1;
    state.statusMessage = "プレー記録をすべて削除しました。";
    persist();
    ensureSelectedSong();
    emit();
  }

  async function importDifficultyTable() {
    const result = await loadRemoteDifficultyTable();
    state.difficultyTable = result;
    state.difficultyTableUpdatedAt = nowTimestamp();
    state.records = migrateRecordTitlesByTextageKey(state.records, result);
    state.records = updateTextageKeyFromDifficultyTable(state.records, result);
    invalidateCatalogVisibleOrder();
    state.statusMessage = `難易度表を読み込みました。${result.titleCount}曲 / ${result.entries.length}譜面`;
    persist();
    emit();
    return result;
  }

  function getCatalogSnapshot() {
    if (catalogSnapshotCache) {
      return catalogSnapshotCache;
    }

    const catalogEntries = getCatalogEntries();
    const playDateAdjustedRecords = applyPlayDateAdjustment(state.records);
    const recordIndex = buildRecordIndex(playDateAdjustedRecords);
    const dateDefaultRange = getDefaultDateRangeFromRecords(playDateAdjustedRecords);

    const allSongStates = catalogEntries.map((entry) => ({
      ...deriveSongState(entry, recordIndex.get(entry.title) ?? []),
      note: getSongNote(entry),
      displayMode: state.filters.displayMode,
    }));

    const songStates = allSongStates.map((entry) => ({
      ...applyDateScopedDisplayValues(entry, state.filters),
      note: getSongNote(entry),
      displayMode: state.filters.displayMode,
    })).sort((a, b) => compareCatalogSongs(
      a,
      b,
      state.sortMode,
      state.sortDirection,
      state.filters.axisMode,
      state.randomSeed,
      state.chartDifficultySortHead,
      state.recommendSortHead,
    ));

    const catalogBaseFilters = state.filters.axisMode === "date"
      ? {
          ...state.filters,
          lamps: [...LAMP_OPTIONS],
          scoreRanks: [...SCORE_RANK_OPTIONS],
        }
      : state.filters;
    let filteredVisibleSongs = songStates.filter((entry) => matchesFiltersFor(entry, catalogBaseFilters));
    const hasTitleSearch = state.filters.axisMode === "title" && state.filters.titleQuery.trim();

    if (hasTitleSearch && state.sortMode !== "chartDifficulty") {
      const songOrder = new Map(songStates.map((song, index) => [song.title, index]));

      filteredVisibleSongs.sort((a, b) => {
        const priority = compareVisibleSongPriorityForFilters(a, b, state.filters);
        if (priority !== 0) {
          return priority;
        }

        return (songOrder.get(a.title) ?? 0) - (songOrder.get(b.title) ?? 0);
      });
    }

    if (shouldUseRecordScopedCatalog(state.filters)) {
      filteredVisibleSongs = filteredVisibleSongs
        .flatMap((entry) => filterHistoryByDateRange(entry.history, state.filters)
          .map((record) => createRecordScopedCatalogItem(entry, record, getScoreRankInfo)))
        .filter((entry) => matchesRecordScopedResultFilter(entry, state.filters))
        .sort((a, b) => compareCatalogSongs(
          a,
          b,
          state.sortMode,
          state.sortDirection,
          state.filters.axisMode,
          state.randomSeed,
          state.chartDifficultySortHead,
          state.recommendSortHead,
        ));
    }

    const chartDifficultyRotationState = getChartDifficultyRotationState(filteredVisibleSongs, state.chartDifficultySortHead);
    const effectiveChartDifficultySortHead = state.sortMode === "chartDifficulty"
      ? state.catalogViewMode === "table"
        ? (
            state.sortDirection === "desc"
              ? (chartDifficultyRotationState.choices.at(-1) ?? CHART_DIFFICULTY_OPTIONS.at(-1))
              : (chartDifficultyRotationState.choices[0] ?? CHART_DIFFICULTY_OPTIONS[0])
          )
        : chartDifficultyRotationState.head
      : state.chartDifficultySortHead;
    const effectiveChartDifficultySortDirection = state.sortMode === "chartDifficulty"
      ? state.catalogViewMode === "table"
        ? state.sortDirection
        : chartDifficultyRotationState.direction
      : null;
    const recommendSortChoices = getRecommendSortChoicesFromSongs(filteredVisibleSongs);
    const effectiveRecommendSortHead = state.sortMode === "recommend" && recommendSortChoices.length > 0
      ? normalizeRecommendSortHeadForChoices(state.recommendSortHead, recommendSortChoices)
      : state.recommendSortHead;

    if (state.sortMode === "chartDifficulty" || (state.sortMode === "recommend" && effectiveRecommendSortHead !== state.recommendSortHead)) {
      filteredVisibleSongs = [...filteredVisibleSongs].sort((a, b) => compareCatalogSongs(
        a,
        b,
        state.sortMode,
        state.sortDirection,
        state.filters.axisMode,
        state.randomSeed,
        effectiveChartDifficultySortHead,
        effectiveRecommendSortHead,
        effectiveChartDifficultySortDirection,
      ));
    }

    if (hasTitleSearch && state.sortMode === "chartDifficulty") {
      const songOrder = new Map(filteredVisibleSongs.map((song, index) => [song.title, index]));

      filteredVisibleSongs.sort((a, b) => {
        const priority = compareVisibleSongPriorityForFilters(a, b, state.filters);
        if (priority !== 0) {
          return priority;
        }

        return (songOrder.get(a.title) ?? 0) - (songOrder.get(b.title) ?? 0);
      });
    }

    const directionAdjustedVisibleSongs = applySortDirectionFallbackIfNoPrimaryEffect(
      filteredVisibleSongs,
      state.sortMode,
      state.sortDirection,
      effectiveChartDifficultySortHead,
      effectiveRecommendSortHead,
    );

    const shouldPreserveVisibleCatalogItems = state.preserveVisibleCatalogItemsOnce;
    const stableOrderPool = createRecordScopedPreservePool(directionAdjustedVisibleSongs, songStates);
    const visibleSongs = applyStableVisibleOrder(
      directionAdjustedVisibleSongs,
      stableOrderPool,
      { preserveMissingItems: shouldPreserveVisibleCatalogItems },
    );
    state.preserveVisibleCatalogItemsOnce = false;

    const summaryFilters = isTextAxisMode(state.filters.axisMode) && state.titleFilterBase
      ? state.titleFilterBase
      : state.filters;
    const summaryDisplayMode = getEffectiveSummaryDisplayMode(state.filters);
    const summaryGraphFilters = {
      ...summaryFilters,
      summaryDisplayMode,
      displayMode: summaryDisplayMode,
    };

    const summaryScopeFilters = isTextAxisMode(summaryGraphFilters.axisMode)
      ? { ...summaryGraphFilters }
      : {
          ...summaryGraphFilters,
          axisValue: "",
          axisRangeModeByAxis: normalizeAxisRangeModeByAxis(AXIS_RANGE_MODE_DISABLED),
        };

    const summaryBandBaseSongs = summaryGraphFilters.axisMode === "katate"
      ? songStates.filter((entry) => entry.katateValue !== null)
      : songStates;

    const summary = buildCatalogSummary({
      playDateAdjustedRecords,
      songStates,
      summaryBandBaseSongs,
      summaryGraphFilters,
      summaryScopeFilters,
      summaryCountFilters: {
        ...summaryGraphFilters,
        lamps: [...LAMP_OPTIONS],
        scoreRanks: [...SCORE_RANK_OPTIONS],
      },
    });
    const pageSize = state.catalogViewMode === "table" ? TABLE_PAGE_SIZE : PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(visibleSongs.length / pageSize));
    const currentPage = Math.max(1, Math.min(state.currentPage, totalPages));
    const pageStart = (currentPage - 1) * pageSize;
    const pagedSongs = visibleSongs.slice(pageStart, pageStart + pageSize);
    const pageRanges = Array.from({ length: totalPages }, (_, index) => {
      const rangeStart = index * pageSize;
      const pageSongs = visibleSongs.slice(rangeStart, rangeStart + pageSize);
      return {
        page: index + 1,
        first: pageSongs[0] ?? null,
        last: pageSongs[pageSongs.length - 1] ?? null,
      };
    });

    catalogSnapshotCache = {
      currentPage,
      allSongStates,
      songStates,
      visibleSongs,
      pagedSongs,
      pagination: {
        currentPage,
        totalPages,
        pageSize,
        totalItems: visibleSongs.length,
        startIndex: visibleSongs.length === 0 ? 0 : pageStart + 1,
        endIndex: Math.min(pageStart + pageSize, visibleSongs.length),
        pageRanges,
      },
      summary,
      summaryFilters,
      filterBounds: deriveFilterBounds(songStates),
      historyDates: deriveHistoryDates(songStates),
      effectiveSummaryDisplayMode: summaryDisplayMode,
      dateDefaultRange,
      chartDifficultySortChoices: chartDifficultyRotationState.choices,
      effectiveChartDifficultySortHead,
      recommendSortChoices,
      effectiveRecommendSortHead,
    };

    return catalogSnapshotCache;
  }

  function getSnapshot() {
    const catalogSnapshot = getCatalogSnapshot();

    const selectedCatalogItem = catalogSnapshot.pagedSongs.find((song) => getCatalogItemKey(song) === state.selectedCatalogKey)
      ?? catalogSnapshot.pagedSongs.find((song) => song.title === state.selectedTitle)
      ?? catalogSnapshot.pagedSongs[0]
      ?? catalogSnapshot.visibleSongs[0]
      ?? null;
    const selectedSong = catalogSnapshot.allSongStates.find((song) => song.title === selectedCatalogItem?.title)
      ?? selectedCatalogItem;

    const selectedHistory = selectedSong
      ? [...selectedSong.history].sort((a, b) => sortRecords(b, a))
      : [];

    return {
      ...state,
      ...catalogSnapshot,
      selectedSong,
      selectedCatalogKey: selectedCatalogItem ? getCatalogItemKey(selectedCatalogItem) : null,
      selectedHistory,
      difficultyTable: state.difficultyTable,
    };
  }

  return {
    initialize,
    setDifficultyFilters,
    clearTitleFilter,
    clearDateFilter,
    setSortMode,
    setTableSortState,
    toggleSortDirection,
    rotateChartDifficultySortHead,
    rotateRecommendSortHead,
    toggleCatalogViewMode,
    setPage,
    selectSong,
    saveRecord,
    deleteRecord,
    saveSongNote,
    importDifficultyTable,
    getExportJson,
    getExportCsv,
    importCsvData,
    importJsonData,
    clearAllRecords,
    getSnapshot,
    subscribe: events.subscribe,
  };
}
