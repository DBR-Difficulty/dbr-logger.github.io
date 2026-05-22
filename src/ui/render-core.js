const MODULE_VERSION = new URL(import.meta.url).search;

const { LAMP_OPTIONS } = await import(`../constants.js${MODULE_VERSION}`);
const { renderBpChart, renderScoreChart } = await import(`./chart.js${MODULE_VERSION}`);
const { formatIsoDate, todayIso } = await import(`../utils/date.js${MODULE_VERSION}`);
const { renderProposalButton } = await import(`./proposal.js${MODULE_VERSION}`);
const { escapeHtml } = await import(`../utils/html.js${MODULE_VERSION}`);
const {
  deriveFilterBounds: deriveFilterBoundsComponent,
  deriveHistoryDates: deriveHistoryDatesComponent,
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
  bindFloatingScroll,
  bindNumberInputWheelGuard,
  bindThemeToggle,
  bindWindowResize,
} = await import(`./events.js${MODULE_VERSION}`);

const LAMP_COLORS = {
  "NO PLAY": "var(--lamp-no-play)",
  FAILED: "var(--lamp-failed)",
  ASSIST: "var(--lamp-assist)",
  EASY: "var(--lamp-easy)",
  CLEAR: "var(--lamp-clear)",
  HARD: "var(--lamp-hard)",
  EXH: "var(--lamp-exh)",
  FC: "var(--lamp-fc)",
};
const getLampColor = (lamp) => LAMP_COLORS[lamp] ?? "transparent";
const SCORE_RANK_COLORS = {
  MAX: "var(--lamp-fc)",
  AAA: "var(--lamp-fc)",
  AA: "var(--lamp-exh)",
  A: "var(--lamp-hard)",
  B: "var(--lamp-clear)",
  C: "var(--lamp-easy)",
  D: "var(--lamp-assist)",
  E: "var(--lamp-failed)",
  F: "var(--lamp-no-play)",
  "※": "var(--lamp-no-play)",
};
const getScoreRankColor = (rank) => SCORE_RANK_COLORS[rank] ?? "transparent";
const getSummaryBandLampColor = (lamp) => getLampColor(lamp);
const getCardLampColor = (lamp) => lamp === "NO PLAY" ? "transparent" : getLampColor(lamp);
const getCardBandColor = (song, summaryDisplayMode = "clear") => (
  summaryDisplayMode === "score"
    ? (song?.currentScore === null || song?.currentScore === undefined ? "transparent" : getScoreRankColor(song?.cardScoreFilterRank ?? song?.scoreFilterRank ?? "F"))
    : getCardLampColor(song?.bestLamp)
);
const getScoreRankSummaryLabel = (rank) => rank === "F" ? "F/※" : rank;
const RECOMMEND_OPTIONS = [
  { value: "", label: "－" },
  { value: "△", label: "△" },
  { value: "○", label: "○" },
  { value: "◎", label: "◎" },
  { value: "☆", label: "☆" },
];
const RECOMMEND_SORT_VALUES = ["☆", "◎", "○", "△", ""];
const CHART_DIFFICULTY_OPTIONS = ["B", "N", "H", "A", "L"];
const CHART_SUFFIX_ORDER = new Map([
  ["B", 0],
  ["N", 1],
  ["H", 2],
  ["A", 3],
  ["L", 4],
]);
const DISPLAY_MODE_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "clear", label: "クリア" },
  { value: "score", label: "スコア" },
];
const SUMMARY_DISPLAY_MODE_OPTIONS = [
  { value: "clear", label: "クリア" },
  { value: "score", label: "スコア" },
];
const CATALOG_SORT_OPTIONS = [
  { value: "title", label: "曲名", modes: ["all", "clear", "score"] },
  { value: "version", label: "バージョン", modes: ["all", "clear", "score"] },
  { value: "chartDifficulty", label: "譜面難易度", modes: ["all", "clear", "score"] },
  { value: "splv", label: "SPLv.", modes: ["all", "clear", "score"] },
  { value: "level", label: "DBRLv.", modes: ["all", "clear", "score"] },
  { value: "katate", label: "片手Lv.", modes: ["all", "clear", "score"] },
  { value: "bpm", label: "BPM", modes: ["all", "clear", "score"] },
  { value: "recommend", label: "おすすめ度", modes: ["all", "clear", "score"] },
  { value: "clear", label: "クリアランプ", modes: ["all", "clear", "score"] },
  { value: "bestBp", label: "最小BP", modes: ["all", "clear"] },
  { value: "latestBp", label: "最新BP", modes: ["all", "clear"] },
  { value: "bestScore", label: "最高スコア", modes: ["all", "score"] },
  { value: "latestScore", label: "最新スコア", modes: ["all", "score"] },
  { value: "latest", label: "最終プレー", modes: ["all", "clear", "score"] },
  { value: "entryCount", label: "プレー回数", modes: ["all", "clear", "score"] },
  { value: "memo", label: "メモ", modes: ["all", "clear", "score"] },
  { value: "random", label: "ランダム", modes: ["all", "clear", "score"] },
];
const SCORE_RANK_OPTIONS = ["AAA", "AA", "A", "B", "C", "D", "E", "F", "※"];
const SCORE_RANK_SUMMARY_OPTIONS = ["AAA", "AA", "A", "B", "C", "D", "E", "F"];
const SCORE_RANK_FILTER_OPTIONS = ["F", "E", "D", "C", "B", "A", "AA", "AAA"];
const SONG_DATA_FILTER_OPTIONS = [
  { value: "all", label: "すべて", inf: "all", acdelete: "all" },
  { value: "ac", label: "AC", inf: "all", acdelete: "no" },
  { value: "infinitas", label: "INFINITAS", inf: "yes", acdelete: "all" },
  { value: "acOnly", label: "AC限定", inf: "no", acdelete: "no" },
  { value: "infinitasOnly", label: "INFINITAS限定", inf: "yes", acdelete: "yes" },
  { value: "csDeleted", label: "CS限定/削除曲のみ", inf: "no", acdelete: "yes" },
];
const SUMMARY_LAMP_DOUBLE_CLICK_MS = 220;
const SUMMARY_LAMP_SWIPE_SOLO_THRESHOLD = 40;
const DIFFICULTY_TABLE_STALE_MS = 12 * 60 * 60 * 1000;
const THEME_STORAGE_KEY = "dbr-theme";
const ENTRY_BP_INPUT_MODE_STORAGE_KEY = "dbr-entry-bp-input-mode";
const SUMMARY_FILTERS_OPEN_STORAGE_KEY = "dbr-summary-filters-open";
const ENTRY_BP_INPUT_MODES = new Set(["bp", "split"]);
const AXIS_OPTIONS = [
  { value: "splv", label: "SPLv." },
  { value: "level", label: "DBRLv." },
  { value: "katate", label: "片手Lv." },
  { value: "version", label: "バージョン" },
  { value: "bpm", label: "BPM" },
  { value: "date", label: "プレー日" },
  { value: "title", label: "曲名" },
  { value: "memo", label: "メモ" },
];
const AXIS_SHORTCUT_KEYS = {
  f: "level",
  w: "splv",
  e: "katate",
  v: "version",
  b: "bpm",
  r: "date",
  s: "title",
  t: "memo",
};
const HIDDEN_FLOATING_CLEAR_AXES = new Set(["level", "splv", "katate", "version", "bpm", "date"]);
const RANGE_ONLY_AXIS_MODES = new Set();
const BPM_BUCKETS = [
  { value: "lt120", label: "min-119" },
  ...Array.from({ length: 10 }, (_, index) => {
    const bpm = 120 + index * 10;
    return { value: String(bpm), label: `${bpm}-${bpm + 9}` };
  }),
  { value: "220", label: "220-249" },
  { value: "250", label: "250-max" },
];
const BPM_RANGE_POINTS = [
  { value: "min", startLabel: "min", endLabel: "min" },
  ...Array.from({ length: 11 }, (_, index) => {
    const bpm = 120 + index * 10;
    return { value: String(bpm), startLabel: String(bpm), endLabel: String(bpm - 1) };
  }),
  { value: "250", startLabel: "250", endLabel: "249" },
  { value: "max", startLabel: "max", endLabel: "max" },
];
const VERSION_ORDER_VALUES = ["0", "1", "s", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33"];
const VERSION_LABELS = new Map([
  ["0", "CS/INFINITAS"],
  ["1", "1st style"],
  ["s", "substream"],
  ["2", "2nd style"],
  ["3", "3rd style"],
  ["4", "4th style"],
  ["5", "5th style"],
  ["6", "6th style"],
  ["7", "7th style"],
  ["8", "8th style"],
  ["9", "9th style"],
  ["10", "10th style"],
  ["11", "RED"],
  ["12", "HAPPY SKY"],
  ["13", "DistorteD"],
  ["14", "GOLD"],
  ["15", "DJ TROOPERS"],
  ["16", "EMPRESS"],
  ["17", "SIRIUS"],
  ["18", "Resort Anthem"],
  ["19", "Lincle"],
  ["20", "tricoro"],
  ["21", "SPADA"],
  ["22", "PENDUAL"],
  ["23", "copula"],
  ["24", "SINOBUZ"],
  ["25", "CANNON BALLERS"],
  ["26", "Rootage"],
  ["27", "HEROIC VERSE"],
  ["28", "BISTROVER"],
  ["29", "CastHour"],
  ["30", "RESIDENT"],
  ["31", "EPOLIS"],
  ["32", "Pinky Crush"],
  ["33", "Sparkle Shower"],
]);

// DBR IR送信
const DBR_IR_IMPORT_TEST_URL = "https://dbr-difficulty.github.io/dbr_ir_from_logger.html";
const DBR_IR_IMPORT_TEST_ORIGIN = "https://dbr-difficulty.github.io";

function openDbrIrImportPage() {
  const targetUrl = new URL(DBR_IR_IMPORT_TEST_URL, window.location.href);
  const targetWindow = window.open(targetUrl.href, "_blank");

  if (!targetWindow) {
    window.alert("DBR IR受け取りページを開けませんでした。ポップアップブロックを確認してください。");
    return null;
  }

  return targetWindow;
}

function sendJsonToDbrIrPage(targetWindow, jsonText) {
  if (!targetWindow) {
    return;
  }

  let sent = false;

  function sendJson() {
    if (sent) {
      return;
    }

    sent = true;

    targetWindow.postMessage({
      type: "dbr-ir-import-json",
      payload: jsonText,
      filename: "dbr-logger.json",
    }, DBR_IR_IMPORT_TEST_ORIGIN);
  }

  function handleReady(event) {
    if (event.origin !== DBR_IR_IMPORT_TEST_ORIGIN) {
      return;
    }

    if (event.source !== targetWindow) {
      return;
    }

    if (!event.data || event.data.type !== "dbr-ir-import-ready") {
      return;
    }

    window.removeEventListener("message", handleReady);
    sendJson();
  }

  window.addEventListener("message", handleReady);

  window.setTimeout(() => {
    window.removeEventListener("message", handleReady);
    sendJson();
  }, 1000);
}

function isTextAxisMode(axisMode) {
  return axisMode === "title" || axisMode === "memo";
}

function isDateAxisMode(axisMode) {
  return axisMode === "date";
}

function isNumericAxisMode(axisMode) {
  return axisMode === "level" || axisMode === "splv" || axisMode === "katate" || axisMode === "version" || axisMode === "bpm";
}

function isRangeOnlyAxisMode(axisMode) {
  return RANGE_ONLY_AXIS_MODES.has(axisMode);
}

function getSongDataFilterOption(value) {
  return SONG_DATA_FILTER_OPTIONS.find((option) => option.value === value)
    ?? SONG_DATA_FILTER_OPTIONS[0];
}

function isDifficultyTableStale(updatedAt) {
  return Number.isFinite(updatedAt) && Date.now() - updatedAt >= DIFFICULTY_TABLE_STALE_MS;
}

function getCurrentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function persistTheme(theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

function loadSummaryFiltersOpen() {
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

function persistSummaryFiltersOpen(open) {
  try {
    window.localStorage.setItem(SUMMARY_FILTERS_OPEN_STORAGE_KEY, open ? "true" : "false");
  } catch {
    // ignore
  }
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.dataset.theme = "dark";
  } else {
    delete document.documentElement.dataset.theme;
  }
}

function parseKatateFilterValue(rawValue) {
  const normalized = String(rawValue ?? "").trim();
  if (!normalized) {
    return Number.NaN;
  }

  if (normalized === "12.10") {
    return 13;
  }

  return Number(normalized);
}

function formatKatateFilterValue(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "";
  }

  if (numericValue === 13) {
    return "12-10";
  }

  return numericValue.toFixed(1).replace(".", "-");
}

function extractBalancedJsonObject(text) {
  let depth = 0;
  let startIndex = -1;
  let inString = false;
  let escaping = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaping) {
        escaping = false;
        continue;
      }

      if (char === "\\") {
        escaping = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        startIndex = index;
      }
      depth += 1;
      continue;
    }

    if (char === "}") {
      if (depth === 0) {
        continue;
      }

      depth -= 1;
      if (depth === 0 && startIndex >= 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function findFirstSectionIndex(text) {
  const sectionPattern = /"?((bp|lamp|score|textageKey))"?\s*:\s*\{/g;
  let firstIndex = -1;

  for (const match of text.matchAll(sectionPattern)) {
    if (match.index === undefined) {
      continue;
    }

    if (firstIndex === -1 || match.index < firstIndex) {
      firstIndex = match.index;
    }
  }

  return firstIndex;
}

function parseImportedJsonText(text) {
  const normalized = String(text ?? "").replace(/^\uFEFF/, "").trim();
  if (!normalized) {
    throw new Error("JSONテキストが空です。");
  }

  try {
    return JSON.parse(normalized);
  } catch {}

  const fenceMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]);
    } catch {}
  }

  const objectText = extractBalancedJsonObject(normalized);
  if (objectText) {
    try {
      return JSON.parse(objectText);
    } catch {}
  }

  const firstBraceIndex = normalized.indexOf("{");
  const lastBraceIndex = normalized.lastIndexOf("}");
  if (firstBraceIndex >= 0 && lastBraceIndex > firstBraceIndex) {
    try {
      return JSON.parse(normalized.slice(firstBraceIndex, lastBraceIndex + 1));
    } catch {}
  }

  const firstSectionIndex = findFirstSectionIndex(normalized);
  if (firstSectionIndex >= 0) {
    const tail = normalized.slice(firstSectionIndex);
    const tailObject = extractBalancedJsonObject(`{${tail}}`);
    if (tailObject) {
      try {
        return JSON.parse(tailObject);
      } catch {}
    }

    const tailLastBraceIndex = tail.lastIndexOf("}");
    if (tailLastBraceIndex >= 0) {
      try {
        return JSON.parse(`{${tail.slice(0, tailLastBraceIndex + 1)}}`);
      } catch {}
    }
  }

  throw new Error("テキスト内から有効なJSON本体を見つけられませんでした。");
}

function askJsonImportDate() {
  const defaultDate = todayIso();
  let promptValue = defaultDate;

  while (true) {
    const response = window.prompt(
      "JSONの記録日を入力してください。空欄なら今日として読み込みます。",
      promptValue,
    );

    if (response === null) {
      return null;
    }

    const normalized = response.trim();

    if (!normalized) {
      return defaultDate;
    }

    promptValue = normalized;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      window.alert("記録日は YYYY-MM-DD 形式で入力してください。");
      continue;
    }

    const parsed = new Date(`${normalized}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) {
      window.alert("記録日の形式が不正です。");
      continue;
    }

    const [year, month, day] = normalized.split("-").map(Number);

    if (
      parsed.getFullYear() !== year
      || parsed.getMonth() + 1 !== month
      || parsed.getDate() !== day
    ) {
      window.alert("存在しない日付です。");
      continue;
    }

    if (normalized > defaultDate) {
      window.alert("未来の日付は指定できません。");
      continue;
    }

    return normalized;
  }
}

function getAxisLabel(axisMode) {
  return AXIS_OPTIONS.find((option) => option.value === axisMode)?.label ?? "DBRLv.";
}

function getAxisValues(bounds, axisMode) {
  if (axisMode === "level") {
    return bounds.level.values ?? [];
  }

  if (axisMode === "splv") {
    return bounds.splv.values ?? [];
  }

  if (axisMode === "katate") {
    return bounds.katate.values ?? [];
  }

  if (axisMode === "version") {
    return bounds.version.values ?? [];
  }

  if (axisMode === "bpm") {
    return BPM_BUCKETS.map((bucket) => bucket.value);
  }

  return [];
}

function getAxisRangeValues(bounds, axisMode) {
  if (axisMode === "bpm") {
    return BPM_RANGE_POINTS.map((point) => point.value);
  }

  return getAxisValues(bounds, axisMode);
}

function getBpmBucket(value) {
  return BPM_BUCKETS.find((bucket) => bucket.value === String(value));
}

function getBpmRangePoint(value) {
  return BPM_RANGE_POINTS.find((point) => point.value === String(value));
}

function formatBpmRangeValue(range) {
  const startLabel = getBpmRangePoint(range.start)?.startLabel ?? String(range.start ?? "");
  const endLabel = getBpmRangePoint(range.end)?.endLabel ?? String(range.end ?? "");
  return `${startLabel} ～ ${endLabel}`;
}

function formatAxisValue(axisMode, value) {
  if (value === "" || value === null || value === undefined) {
    return "ALL";
  }

  if (axisMode === "level") {
    return `☆${Number(value).toFixed(2)}`;
  }

  if (axisMode === "splv") {
    return `☆${value}`;
  }

  if (axisMode === "katate") {
    return `☆${formatKatateFilterValue(value)}`;
  }

  if (axisMode === "version") {
    return VERSION_LABELS.get(String(value)) ?? String(value);
  }

  if (axisMode === "bpm") {
    return getBpmBucket(value)?.label ?? String(value);
  }

  return String(value);
}

function formatExportDateStamp() {
  return todayIso().replaceAll("-", "");
}

function formatDateRangeValue(filters) {
  if (filters.dateSelectionMode === "single") {
    return formatIsoDate(filters.dateSingle || todayIso());
  }

  if (!filters.dateStart && !filters.dateEnd) {
    return "ALL";
  }

  if (filters.dateStart && filters.dateEnd) {
    return `${formatIsoDate(filters.dateStart)} ～ ${formatIsoDate(filters.dateEnd)}`;
  }

  if (filters.dateStart) {
    return `${formatIsoDate(filters.dateStart)} ～`;
  }

  return `～ ${formatIsoDate(filters.dateEnd)}`;
}

function isAxisRangeMode(filters) {
  return isNumericAxisMode(filters.axisMode)
    && (isRangeOnlyAxisMode(filters.axisMode) || Boolean(filters.axisRangeModeByAxis?.[filters.axisMode]));
}

function hasAxisCandidate(axisValues, value) {
  if (value === "" || value === null || value === undefined) {
    return false;
  }

  return axisValues.some((candidate) => String(candidate) === String(value));
}

function getAxisRangeMinGap(axisMode) {
  return axisMode === "bpm" ? 1 : 0;
}

function getNormalizedAxisRange(filters, axisValues) {
  const axisMode = filters.axisMode;
  const range = filters.axisRanges?.[axisMode] ?? { start: "", end: "" };
  const startValue = String(range.start ?? "");
  const endValue = String(range.end ?? "");

  if (!axisValues.length) {
    return { start: "", end: "", startIndex: 0, endIndex: 0, valid: false };
  }

  const startIndex = axisValues.findIndex((value) => String(value) === startValue);
  const endIndex = axisValues.findIndex((value) => String(value) === endValue);
  if (startIndex >= 0 && endIndex >= 0 && startIndex + getAxisRangeMinGap(axisMode) <= endIndex) {
    return { start: startValue, end: endValue, startIndex, endIndex, valid: true };
  }

  const fallbackStart = String(axisValues[0]);
  const fallbackEnd = String(axisValues[axisValues.length - 1]);
  return {
    start: fallbackStart,
    end: fallbackEnd,
    startIndex: 0,
    endIndex: axisValues.length - 1,
    valid: true,
  };
}

function formatAxisRangeValue(axisMode, range) {
  if (axisMode === "bpm") {
    return formatBpmRangeValue(range);
  }

  return `${formatAxisValue(axisMode, range.start)} ～ ${formatAxisValue(axisMode, range.end)}`;
}

function getHistoryDateNeighbor(historyDates, isoDate, delta) {
  if (!Array.isArray(historyDates) || !historyDates.length) {
    return "";
  }

  const base = String(isoDate || todayIso());
  return delta < 0
    ? [...historyDates].reverse().find((date) => date < base) ?? ""
    : historyDates.find((date) => date > base) ?? "";
}

function summarizeAxisFilter(filters, bounds) {
  if (isTextAxisMode(filters.axisMode)) {
    return filters.titleQuery.trim()
      ? `${getAxisLabel(filters.axisMode)} ${filters.titleQuery.trim()}`
      : `${getAxisLabel(filters.axisMode)} ALL`;
  }

  if (isDateAxisMode(filters.axisMode)) {
    return formatDateRangeValue(filters);
  }

  if (filters.axisMode === "version") {
    return isAxisRangeMode(filters)
      ? formatAxisRangeValue(filters.axisMode, getNormalizedAxisRange(filters, getAxisRangeValues(bounds, filters.axisMode)))
      : formatAxisValue(filters.axisMode, filters.axisValue);
  }

  if (isAxisRangeMode(filters)) {
    return `${getAxisLabel(filters.axisMode)} ${formatAxisRangeValue(filters.axisMode, getNormalizedAxisRange(filters, getAxisRangeValues(bounds, filters.axisMode)))}`;
  }

  return `${getAxisLabel(filters.axisMode)} ${formatAxisValue(filters.axisMode, filters.axisValue)}`;
}

function getEffectiveSummaryDisplayMode(filters) {
  if (filters.displayMode === "clear" || filters.displayMode === "score") {
    return filters.displayMode;
  }

  return filters.summaryDisplayMode === "score" ? "score" : "clear";
}

function findClosestValue(values, rawValue, fallbackValue) {
  if (!values.length) {
    return fallbackValue;
  }

  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue)) {
    return fallbackValue;
  }

  return values.reduce((closest, candidate) => (
    Math.abs(candidate - numericValue) < Math.abs(closest - numericValue) ? candidate : closest
  ), values[0]);
}

function findValueIndex(values, rawValue, fallbackIndex = 0) {
  if (!values.length) {
    return 0;
  }

  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue)) {
    return fallbackIndex;
  }

  const exactIndex = values.findIndex((value) => value === numericValue);
  if (exactIndex >= 0) {
    return exactIndex;
  }

  const nearest = findClosestValue(values, numericValue, values[Math.max(0, Math.min(fallbackIndex, values.length - 1))]);
  return values.indexOf(nearest);
}

export function createRenderer(store) {
  let activeScrollFrame = null;
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
  let lastSummaryLampClick = { lamp: "", timestamp: 0 };
  let summaryLampPointerState = null;
  let floatingOutsidePointerState = null;
  let lastScrollY = window.scrollY;
  let lastUserScrollAt = 0;
  let floatingDockSide = "bottom";
  let pendingCatalogBottomNextScroll = false;
  let scrollDirectionStreak = null;
  let scrollDirectionDistance = 0;
  let scrollDirectionTimestamp = 0;
  let isProgrammaticScroll = false;
  let suppressBottomDockState = false;

  function easeInOutCubic(progress) {
    return progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - ((-2 * progress + 2) ** 3) / 2;
  }

  function getScrollOffset() {
    return isMobileViewport() ? 68 : 78;
  }

  function getFloatingFilterInset() {
    return isMobileViewport() ? 14 : 16;
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
    suppressBottomDockState = true;
    isProgrammaticScroll = true;

    if (Math.abs(distance) < 1) {
      window.scrollTo(0, targetY);
      isProgrammaticScroll = false;
      window.requestAnimationFrame(() => {
        suppressBottomDockState = false;
        syncFloatingDockClass();
      });
      return;
    }

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);
      window.scrollTo(0, startY + distance * eased);

      if (progress < 1) {
        activeScrollFrame = window.requestAnimationFrame(step);
        return;
      }

      activeScrollFrame = null;
      isProgrammaticScroll = false;
      window.requestAnimationFrame(() => {
        suppressBottomDockState = false;
        syncFloatingDockClass();
      });
    }

    activeScrollFrame = window.requestAnimationFrame(step);
  }

  function cancelActiveScrollAnimation() {
    if (activeScrollFrame === null) {
      return;
    }

    window.cancelAnimationFrame(activeScrollFrame);
    activeScrollFrame = null;
    isProgrammaticScroll = false;
  }

  function scrollEntryPanelIntoView() {
    scrollElementIntoView(document.querySelector("#entry-panel"));
  }

  function scrollSelectedCardIntoView() {
    const encodedCatalogKey = nodes.selectedSong?.dataset.catalogKey;
    if (encodedCatalogKey) {
      const card = nodes.catalog?.querySelector(`[data-catalog-key="${encodedCatalogKey}"]`);
      if (card) {
        scrollElementIntoView(card);
        return;
      }
    }

    const encodedTitle = nodes.selectedSong?.dataset.title;
    if (!encodedTitle) {
      return;
    }

    const card = nodes.catalog?.querySelector(`[data-title="${encodedTitle}"]`);
    if (!card) {
      return;
    }

    scrollElementIntoView(card);
  }

  function scrollCatalogPanelIntoView() {
    scrollElementIntoView(nodes.catalogPanel ?? nodes.catalog);
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
      // || element instanceof HTMLSelectElement
      // || element instanceof HTMLButtonElement
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
    const snapshot = store.getSnapshot();
    const song = snapshot.pagedSongs[index];

    if (!song) {
      return false;
    }

    store.selectSong(song.title, song.catalogItemKey || `title:${song.title}`);

    window.requestAnimationFrame(() => {
      nodes.lampInput?.focus({ preventScroll: true });
    });

    // ショートカット操作時はスクロールしない
    // window.requestAnimationFrame(scrollEntryPanelIntoView);
    return true;
  }  

  const nodes = collectRendererNodes();

  initializeRendererNodeClasses(nodes);

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
    }, { scrollToCatalog: false });
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

  nodes.summaryFiltersToggle?.addEventListener("click", () => {
    summaryFiltersOpen = !summaryFiltersOpen;
    persistSummaryFiltersOpen(summaryFiltersOpen);
    renderFilterDraftPanel();
  });

  nodes.summaryDisplaySelect?.addEventListener("change", () => {
    if (nodes.summaryDisplaySelect.disabled) {
      return;
    }

    const nextSummaryDisplayMode = SUMMARY_DISPLAY_MODE_OPTIONS.some((option) => option.value === nodes.summaryDisplaySelect.value)
      ? nodes.summaryDisplaySelect.value
      : "clear";
    filterDraft = {
      ...(filterDraft ?? store.getSnapshot().filters),
      summaryDisplayMode: nextSummaryDisplayMode,
    };
    applyDifficultyFilters({ summaryDisplayMode: nextSummaryDisplayMode }, { scrollToCatalog: false });
  });

  nodes.summaryFiltersPanel.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (!target.closest("[data-filter]")) {
      return;
    }

    filterDraft = readFiltersFromPanel();
    applyDifficultyFilters(filterDraft, { scrollToCatalog: false });
  });

  nodes.summaryFiltersPanel.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.closest("[data-filter]")) {
      filterDraft = readFiltersFromPanel();
      applyDifficultyFilters(filterDraft, { scrollToCatalog: false });
    }
  });

  nodes.summaryFiltersPanel.addEventListener("click", (event) => {
    const resetButton = event.target.closest('[data-filter-action="reset"]');

    if (!resetButton) {
      return;
    }

    filterDraft = {
      axisMode: filterDraft?.axisMode ?? "splv",
      axisValue: filterDraft?.axisValue ?? "",
      titleQuery: filterDraft?.titleQuery ?? "",
      dateSelectionMode: filterDraft?.dateSelectionMode ?? "single",
      dateSingle: filterDraft?.dateSingle ?? todayIso(),
      dateStart: filterDraft?.dateStart ?? "",
      dateEnd: filterDraft?.dateEnd ?? "",
      displayMode: "all",
      summaryDisplayMode: filterDraft?.summaryDisplayMode ?? "clear",
      inf: "all",
      acdelete: "all",
      recommend: ["", "△", "○", "◎", "☆"],
      chartDifficulties: ["B", "N", "H", "A", "L"],
      versionChartDifficulties: filterDraft?.versionChartDifficulties ? [...filterDraft.versionChartDifficulties] : [...CHART_DIFFICULTY_OPTIONS],
      scoreRanks: [...SCORE_RANK_OPTIONS],
      lamps: filterDraft?.lamps ? [...filterDraft.lamps] : [...LAMP_OPTIONS],
      includeUnrated: "all",
    };
    floatingAxisPreviewMode = null;
    floatingAxisPreviewValue = null;
    applyDifficultyFilters(filterDraft, { scrollToCatalog: false });
  });

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
      const activeFilters = filterDraft ?? store.getSnapshot().filters;
      clearFloatingAxisFilter();
      if (!isTextAxisMode(activeFilters.axisMode) && !isDateAxisMode(activeFilters.axisMode)) {
        closeFloatingFilter({ preserveScroll: !shouldScrollCatalogPanelUpward() });
      }
      return;
    }

    if (target.closest("[data-date-reset]")) {
      event.preventDefault();
      event.stopPropagation();
      pendingQueryBlurIntent = "clear";
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
      const activeFilters = filterDraft ?? store.getSnapshot().filters;
      toggleAxisRangeMode(activeFilters.axisMode);
      return;
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

      const activeFilters = filterDraft ?? store.getSnapshot().filters;
      const slider = singleWrap.querySelector("input[data-axis-slider]");

      if (!(slider instanceof HTMLInputElement) || slider.disabled) {
        return;
      }

      const pointerIndex = getFloatingAxisSinglePointerIndex(event, singleWrap);

      floatingAxisSingleDragState = {
        axisMode: activeFilters.axisMode,
        sliderWrap: singleWrap,
        pointerId: event.pointerId,
      };

      singleWrap.setPointerCapture?.(event.pointerId);
      previewFloatingAxisSliderToIndex(activeFilters.axisMode, pointerIndex);
      return;
    }    

    const rangeWrap = target.closest(".floating-filter-range-wrap");
    if (rangeWrap instanceof HTMLElement) {
      event.preventDefault();
      const activeFilters = filterDraft ?? store.getSnapshot().filters;
      const range = floatingAxisRangePreviewMode === activeFilters.axisMode && floatingAxisRangePreviewValue
        ? floatingAxisRangePreviewValue
        : getActiveAxisRange(activeFilters);
      const pointerIndex = getFloatingAxisRangePointerIndex(event, rangeWrap);
      const handle = range.startIndex === range.endIndex
        ? "auto"
        : Math.abs(pointerIndex - range.startIndex) <= Math.abs(pointerIndex - range.endIndex) ? "start" : "end";
      floatingAxisRangeDragState = {
        axisMode: activeFilters.axisMode,
        handle,
        rangeWrap,
        pointerId: event.pointerId,
      };
      rangeWrap.setPointerCapture?.(event.pointerId);
      const activeHandle = previewFloatingAxisRangeToIndex(activeFilters.axisMode, pointerIndex, handle);
      if (activeHandle && !(handle === "auto" && pointerIndex === range.startIndex)) {
        floatingAxisRangeDragState.handle = activeHandle;
      }
      return;
    }  

    if (target.closest("[data-axis-mode]")) {
      pendingQueryBlurIntent = "axis-mode";
    
      if (!isHoverNoneEnvironment() && performance.now() - lastUserScrollAt < 450) {
        event.preventDefault();
        return;
      }
    
      return;
    }

    pendingQueryBlurIntent = null;
  });

  nodes.floatingAxisFilter.addEventListener("pointermove", (event) => {
    if (floatingAxisSingleDragState) {
      event.preventDefault();

      const { axisMode, sliderWrap } = floatingAxisSingleDragState;
      const pointerIndex = getFloatingAxisSinglePointerIndex(event, sliderWrap);
      previewFloatingAxisSliderToIndex(axisMode, pointerIndex);
      return;
    }

    if (!floatingAxisRangeDragState) {
      return;
    }

    event.preventDefault();
    const { axisMode, handle, rangeWrap } = floatingAxisRangeDragState;
    const pointerIndex = getFloatingAxisRangePointerIndex(event, rangeWrap);
    const range = floatingAxisRangePreviewMode === axisMode && floatingAxisRangePreviewValue
      ? floatingAxisRangePreviewValue
      : getActiveAxisRange({ ...(filterDraft ?? store.getSnapshot().filters), axisMode });
    const activeHandle = previewFloatingAxisRangeToIndex(axisMode, pointerIndex, handle);
    if (handle === "auto" && activeHandle && pointerIndex !== range.startIndex) {
      floatingAxisRangeDragState.handle = activeHandle;
    }
  });

  nodes.floatingAxisFilter.addEventListener("pointerup", (event) => {
    if (floatingAxisSingleDragState) {
      event.preventDefault();

      releaseFloatingAxisSinglePointerCapture();
      floatingAxisSingleDragState = null;

      const shouldScroll = shouldScrollCatalogPanelUpward();
      if (commitFloatingAxisSliderShortcut() && shouldScroll) {
        window.requestAnimationFrame(scrollCatalogPanelIntoView);
      }

      return;
    }

    if (floatingAxisRangeDragState) {
      event.preventDefault();

      releaseFloatingAxisRangePointerCapture();
      floatingAxisRangeDragState = null;

      const shouldScroll = shouldScrollCatalogPanelUpward();
      if (commitFloatingAxisRange() && shouldScroll) {
        window.requestAnimationFrame(scrollCatalogPanelIntoView);
      }

      return;
    }
  });

  nodes.floatingAxisFilter.addEventListener("pointercancel", (event) => {
    if (floatingAxisSingleDragState) {
      event.preventDefault();

      releaseFloatingAxisSinglePointerCapture();
      floatingAxisSingleDragState = null;
      floatingAxisPreviewMode = null;
      floatingAxisPreviewValue = null;
      renderFloatingFilterShell();
      return;
    }

    if (!floatingAxisRangeDragState) {
      return;
    }

    event.preventDefault();
    releaseFloatingAxisRangePointerCapture();
    floatingAxisRangeDragState = null;
    floatingAxisRangePreviewMode = null;
    floatingAxisRangePreviewValue = null;
    floatingAxisRangeShortcutPending = false;
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
      const activeFilters = filterDraft ?? store.getSnapshot().filters;
      const axisValues = getAxisRangeValues(latestFilterBounds, activeFilters.axisMode);
      const currentRange = floatingAxisRangePreviewMode === activeFilters.axisMode && floatingAxisRangePreviewValue
        ? floatingAxisRangePreviewValue
        : getActiveAxisRange(activeFilters);
      const minGap = getAxisRangeMinGap(activeFilters.axisMode);
      let startIndex = currentRange.startIndex;
      let endIndex = currentRange.endIndex;

      if (target.hasAttribute("data-axis-range-start")) {
        startIndex = Math.min(Number(target.value), endIndex - minGap);
        floatingAxisRangeActiveHandleByAxis[activeFilters.axisMode] = "start";
      } else {
        endIndex = Math.max(Number(target.value), startIndex + minGap);
        floatingAxisRangeActiveHandleByAxis[activeFilters.axisMode] = "end";
      }

      const nextRange = {
        start: String(axisValues[startIndex] ?? ""),
        end: String(axisValues[endIndex] ?? ""),
        startIndex,
        endIndex,
        valid: axisValues.length > 0,
      };
      floatingAxisRangePreviewMode = activeFilters.axisMode;
      floatingAxisRangePreviewValue = nextRange;
      floatingAxisRangeShortcutPending = true;
      updateFloatingRangeDisplay(activeFilters.axisMode, nextRange);
      return;
    }

    if (target instanceof HTMLInputElement && target.hasAttribute("data-axis-slider")) {
      const activeFilters = filterDraft ?? store.getSnapshot().filters;
      const axisValues = getAxisValues(latestFilterBounds, activeFilters.axisMode);
      const sliderStops = ["", ...axisValues];
      const index = Number(target.value);
      const nextValue = sliderStops[index] ?? "";
      const previewValue = nextValue === "" ? "" : String(nextValue);

      floatingAxisPreviewMode = activeFilters.axisMode;
      floatingAxisPreviewValue = previewValue;

      updateFloatingSingleSliderDisplay(activeFilters.axisMode, Number.isFinite(index) ? index : 0, previewValue);
      return;
    }

    if (target instanceof HTMLInputElement && target.hasAttribute("data-axis-query")) {
      floatingQuerySelection = {
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
      const activeFilters = filterDraft ?? store.getSnapshot().filters;
      const committedValue = floatingAxisPreviewMode === activeFilters.axisMode
        ? floatingAxisPreviewValue
        : ["", ...getAxisValues(latestFilterBounds, activeFilters.axisMode)][Number(target.value)] ?? "";
      const nextAxisValue = committedValue === "" ? "" : String(committedValue);
      rememberFloatingAxisValue(activeFilters.axisMode, nextAxisValue);
      floatingAxisPreviewMode = null;
      floatingAxisPreviewValue = null;
      if (shouldCloseFloatingFilterAfterSliderCommit()) {
        floatingQueryFocused = false;
        floatingFilterOpen = false;
        syncQueryScrollLockState();
      }
      applyDifficultyFilters({ axisValue: nextAxisValue });
      return;
    }

    if (target instanceof HTMLInputElement && target.hasAttribute("data-axis-query")) {
      floatingQuerySelection = {
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
      if (floatingAxisModeCommitTimer !== null) {
        window.clearTimeout(floatingAxisModeCommitTimer);
        floatingAxisModeCommitTimer = null;
      }

      floatingAxisModeCommitTimer = window.setTimeout(() => {
        floatingAxisModeCommitTimer = null;
        pendingQueryBlurIntent = null;
        floatingAxisPreviewMode = null;
        floatingAxisPreviewValue = null;
        floatingQueryFocused = false;
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
          const axisValues = getAxisRangeValues(latestFilterBounds, nextAxisMode);
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

    const activeFilters = filterDraft ?? store.getSnapshot().filters;
    if (floatingAxisPreviewMode !== activeFilters.axisMode) {
      return;
    }

    const committedValue = floatingAxisPreviewMode === activeFilters.axisMode
      ? floatingAxisPreviewValue
      : ["", ...getAxisValues(latestFilterBounds, activeFilters.axisMode)][Number(target.value)] ?? "";
    const nextAxisValue = committedValue === "" ? "" : String(committedValue);

    if (String(nextAxisValue ?? "") !== String(activeFilters.axisValue ?? "")) {
      return;
    }

    rememberFloatingAxisValue(activeFilters.axisMode, nextAxisValue);
    floatingAxisPreviewMode = null;
    floatingAxisPreviewValue = null;

    if (shouldCloseFloatingFilterAfterSliderCommit()) {
      floatingQueryFocused = false;
      floatingFilterOpen = false;
      syncQueryScrollLockState();
    }

    applyDifficultyFilters({ axisValue: nextAxisValue });
  });

  nodes.floatingAxisFilter.addEventListener("search", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.hasAttribute("data-axis-query")) {
      return;
    }

    if (floatingQueryComposing) {
      return;
    }

    floatingQuerySelection = {
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
      dateFilterKeyboardEditUntil = performance.now() + 900;
      if (event.key === "Enter" && !event.isComposing) {
        target.blur();
      }
      return;
    }

    if (!(target instanceof HTMLInputElement) || !target.hasAttribute("data-axis-query")) {
      return;
    }

    if (event.key !== "Enter" || event.isComposing || floatingQueryComposing) {
      return;
    }

    target.blur();
  });

  nodes.floatingAxisFilter.addEventListener("compositionstart", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.hasAttribute("data-axis-query")) {
      return;
    }

    floatingQueryComposing = true;
  });

  nodes.floatingAxisFilter.addEventListener("focusin", (event) => {
    const target = event.target;
    if (!isTitleQueryElement(target)) {
      return;
    }

    floatingQueryFocused = true;
    floatingQueryRestoreFocus = false;
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
      if (isTitleQueryElement(activeElement)) {
        return;
      }

      if (activeElement instanceof HTMLSelectElement && activeElement.hasAttribute("data-axis-mode")) {
        return;
      }

      if (floatingQueryRestoreFocus) {
        return;
      }

      if (event.relatedTarget instanceof HTMLElement && event.relatedTarget.closest("[data-floating-clear]")) {
        return;
      }

      if (pendingQueryBlurIntent === "clear") {
        pendingQueryBlurIntent = null;
        return;
      }

      if (pendingQueryBlurIntent === "escape") {
        pendingQueryBlurIntent = null;
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
      const activeElement = document.activeElement;
      if (isDateFilterInput(activeElement)) {
        return;
      }

      if (dateFilterCommitTimer !== null) {
        window.clearTimeout(dateFilterCommitTimer);
        dateFilterCommitTimer = null;
      }

      if (pendingQueryBlurIntent === "escape") {
        pendingQueryBlurIntent = null;
        return;
      }

      applyDateFilter();
    });
  });

  nodes.floatingAxisFilter.addEventListener("compositionend", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.hasAttribute("data-axis-query")) {
      return;
    }

    floatingQueryComposing = false;
  });

  function applySummaryLampVisualState(activeLamps) {
    const activeSet = new Set(activeLamps);
    const filters = filterDraft ?? store.getSnapshot().filters;
    const isScoreMode = getEffectiveSummaryDisplayMode(filters) === "score";
  
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
    const filters = filterDraft ?? store.getSnapshot().filters;
    const isScoreMode = getEffectiveSummaryDisplayMode(filters) === "score";
    return {
      key: isScoreMode ? "scoreRanks" : "lamps",
      options: isScoreMode ? SCORE_RANK_SUMMARY_OPTIONS : LAMP_OPTIONS,
    };
  }

  function isSummaryLampFilterInteractionDisabled() {
    return isTextAxisMode(store.getSnapshot().filters.axisMode);
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

  function toggleSummaryLampFilter(lamp) {
    if (isSummaryLampFilterInteractionDisabled()) {
      return;
    }

    const { key, options } = getActiveSummaryFilterConfig();
    const filters = filterDraft ?? store.getSnapshot().filters;
    const isScoreMode = getEffectiveSummaryDisplayMode(filters) === "score";
    const allValues = isScoreMode ? SCORE_RANK_OPTIONS : options;
    const currentLamps = filterDraft?.[key] ? [...filterDraft[key]] : [...allValues];
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

    filterDraft = {
      ...(filterDraft ?? store.getSnapshot().filters),
      [key]: nextLamps,
    };
    applySummaryLampVisualState(nextLamps);
    deferDifficultyFilters({ [key]: nextLamps }, { scrollToCatalog: false });
  }

  function soloSummaryLampFilter(lamp) {
    if (isSummaryLampFilterInteractionDisabled()) {
      return;
    }

    const { key } = getActiveSummaryFilterConfig();
    const filters = filterDraft ?? store.getSnapshot().filters;
    const isScoreMode = getEffectiveSummaryDisplayMode(filters) === "score";
    const nextLamps = isScoreMode && lamp === "F" ? ["F", "※"] : [lamp];
    filterDraft = {
      ...(filterDraft ?? store.getSnapshot().filters),
      [key]: nextLamps,
    };
    applySummaryLampVisualState(nextLamps);
    deferDifficultyFilters({ [key]: nextLamps }, { scrollToCatalog: false });
  }

  function toggleSummaryChartDifficultyFilter(chartDifficulty) {
    if (!CHART_DIFFICULTY_OPTIONS.includes(chartDifficulty)) {
      return;
    }

    const filters = filterDraft ?? store.getSnapshot().filters;
    if (filters.axisMode !== "version") {
      return;
    }

    const currentValues = filters.versionChartDifficulties ? [...filters.versionChartDifficulties] : [...CHART_DIFFICULTY_OPTIONS];
    const nextValues = currentValues.includes(chartDifficulty)
      ? currentValues.filter((value) => value !== chartDifficulty)
      : [...currentValues, chartDifficulty];
    const orderedValues = CHART_DIFFICULTY_OPTIONS.filter((option) => nextValues.includes(option));

    filterDraft = {
      ...filters,
      versionChartDifficulties: orderedValues,
    };
    applyDifficultyFilters({ versionChartDifficulties: orderedValues }, { scrollToCatalog: false });
  }

  function handleSummaryLampActivation(lamp, timestamp = performance.now()) {
    if (isSummaryLampFilterInteractionDisabled()) {
      return;
    }

    const { key } = getActiveSummaryFilterConfig();
    if (lastSummaryLampClick.lamp === lamp && timestamp - lastSummaryLampClick.timestamp <= SUMMARY_LAMP_DOUBLE_CLICK_MS) {
      const filters = filterDraft ?? store.getSnapshot().filters;
      const isScoreMode = getEffectiveSummaryDisplayMode(filters) === "score";
      const nextLamps = isScoreMode && lamp === "F" ? ["F", "※"] : [lamp];
      filterDraft = {
        ...(filterDraft ?? store.getSnapshot().filters),
        [key]: nextLamps,
      };
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

    const clampedOffset = Math.max(-SUMMARY_LAMP_SWIPE_SOLO_THRESHOLD, deltaX);
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
      const isLeftSwipe = deltaX <= -SUMMARY_LAMP_SWIPE_SOLO_THRESHOLD;
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

    if (isHoverNoneEnvironment() && pointerState.lastDeltaX <= -SUMMARY_LAMP_SWIPE_SOLO_THRESHOLD) {
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
      return;
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

  nodes.catalog.addEventListener("click", (event) => {
    const button = event.target.closest("[data-title]");
    if (!button) {
      return;
    }
    store.selectSong(
      decodeURIComponent(button.dataset.title),
      button.dataset.catalogKey ? decodeURIComponent(button.dataset.catalogKey) : null,
    );
    window.requestAnimationFrame(scrollEntryPanelIntoView);
  });

  function handlePaginationClick(event, anchorToBottom = false) {
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
      pendingCatalogBottomNextScroll = true;
    } else if (anchorToBottom && nodes.catalogPanel) {
      pendingCatalogBottomLock = nodes.catalogPanel.getBoundingClientRect().bottom;
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
    store.toggleCatalogViewMode();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !event.isComposing) {
      const target = event.target;
      if (isEscapeBlurTarget(target)) {
        event.preventDefault();
        event.stopPropagation();
        pendingQueryBlurIntent = "escape";
        target.blur();
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
      if (!floatingFilterOpen || !isTextAxisMode(filters.axisMode)) {
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

    const axisShortcutMode = AXIS_SHORTCUT_KEYS[shortcutKey];

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

  document.addEventListener("keyup", (event) => {
    const shortcutKey = event.key.toLowerCase();
    if (shortcutKey !== "a" && shortcutKey !== "d") {
      return;
    }

    if (event.isComposing || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    if (floatingDateShortcutPending) {
      commitFloatingDateShortcut();
      event.preventDefault();
      return;
    }

    if (floatingAxisRangeShortcutPending) {
      commitFloatingAxisRange();
      event.preventDefault();
      return;
    }

    if (commitFloatingAxisSliderShortcut()) {
      event.preventDefault();
    }
  });  

  [nodes.bpInput, nodes.badInput, nodes.poorInput, nodes.scoreInput].forEach((input) => input?.addEventListener("wheel", (event) => {
    if (document.activeElement === input) {
      event.preventDefault();
      input.blur();
    }
  }, { passive: false }));

  [
    [nodes.bpInput, 4],
    [nodes.badInput, 4],
    [nodes.poorInput, 4],
    [nodes.scoreInput, 5],
  ].forEach(([input, limit]) => {
    input?.addEventListener("input", () => {
      limitNumberInput(input, limit);
    });
  });

  nodes.recordForm.addEventListener("keydown", (event) => {
    focusNextRecordFormField(event, [
      nodes.lampInput,
      nodes.bpInput,
      nodes.badInput,
      nodes.poorInput,
      nodes.scoreInput,
      nodes.memoInput,
    ]);
  });

  nodes.recordForm.addEventListener("input", () => {
    setEntryFormDirty(true);
  });

  nodes.recordForm.addEventListener("change", () => {
    setEntryFormDirty(true);
  });

  nodes.recordForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!entryFormDirty) {
      return;
    }

    const bpResult = getEntryBpValue();
    if (!bpResult.ok) {
      window.alert(bpResult.message);
      return;
    }

    setEntryFormDirty(false);

    const result = store.saveRecord({
      lamp: nodes.lampInput.value,
      bp: bpResult.value,
      score: nodes.scoreInput.value,
      memo: nodes.memoInput.value,
    });

    if (result.ok) {
      clearEntryBpInputs();
      nodes.scoreInput.value = "";
    } else {
      setEntryFormDirty(true);
      window.alert(result.message);
    }
  });

  nodes.bpInputModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setEntryBpInputMode(button.dataset.bpInputMode);
    });
  });

  nodes.backToCardButton?.addEventListener("click", () => {
    scrollSelectedCardIntoView();
  });

  // 難易度表読み込み失敗時のスキップ機能へ接続
  async function tryRefreshDifficultyTableForIo(actionLabel) {
    try {
      await store.importDifficultyTable();
      return true;
    } catch (error) {
      console.error(`${actionLabel}前の難易度表読み込みに失敗:`, error);
      return false;
    }
  }

  nodes.difficultyImportButton.addEventListener("click", async () => {
    setButtonLoading(nodes.difficultyImportButton, true, "読み込み中...");
    lockHeroButtonsExcept(nodes.difficultyImportButton);

    try {
      const result = await store.importDifficultyTable();
      window.alert(`難易度表を読み込みました。\n曲数: ${result.titleCount}\n譜面数: ${result.entries.length}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "難易度表の読み込みに失敗しました。";
      window.alert(message);
    } finally {
      clearHeroButtonStates();
    }
  });

  nodes.importButton.addEventListener("click", () => {
    nodes.importFileInput.click();
  });

  nodes.csvImportButton.addEventListener("click", () => {
    nodes.csvImportFileInput.click();
  });

  nodes.csvImportFileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setButtonLoading(nodes.csvImportButton, true, "読み込み中...");
    lockHeroButtonsExcept(nodes.csvImportButton);

    try {
      await tryRefreshDifficultyTableForIo("CSV読み込み");

      const text = await file.text();
      const result = store.importCsvData(text);
      window.alert(`CSVを読み込みました。\n取込件数: ${result.count}\n合計件数: ${result.totalCount}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "CSVの読み込みに失敗しました。";
      window.alert(message);
    } finally {
      nodes.csvImportFileInput.value = "";
      clearHeroButtonStates();
    }
  });

  nodes.importFileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const referenceDate = askJsonImportDate();
      if (referenceDate === null) {
        return;
      }

      setButtonLoading(nodes.importButton, true, "読み込み中...");
      lockHeroButtonsExcept(nodes.importButton);

      await tryRefreshDifficultyTableForIo("JSON読み込み");

      const text = await file.text();
      const payload = parseImportedJsonText(text);
      const result = store.importJsonData(payload, referenceDate);
      window.alert(`JSONを読み込みました。\n取込件数: ${result.count}\n合計件数: ${result.totalCount}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "JSONの読み込みに失敗しました。";
      window.alert(message);
    } finally {
      nodes.importFileInput.value = "";
      clearHeroButtonStates();
    }
  });

  nodes.exportButton.addEventListener("click", async () => {
    setButtonLoading(nodes.exportButton, true, "書き出し中...");
    lockHeroButtonsExcept(nodes.exportButton);

    try {
      await tryRefreshDifficultyTableForIo("JSON書き出し");

      const payload = store.getExportJson();
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = `dbr_data_${formatExportDateStamp()}.json`;
      anchor.click();

      URL.revokeObjectURL(url);
    } finally {
      clearHeroButtonStates();
    }
  });

  nodes.csvExportButton.addEventListener("click", async () => {
    setButtonLoading(nodes.csvExportButton, true, "書き出し中...");
    lockHeroButtonsExcept(nodes.csvExportButton);

    try {
      await tryRefreshDifficultyTableForIo("CSV書き出し");

      const csv = store.getExportCsv();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = `dbr_records_${formatExportDateStamp()}.csv`;
      anchor.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "CSVの書き出しに失敗しました。";
      window.alert(message);
    } finally {
      clearHeroButtonStates();
    }
  });

  nodes.clearAllButton.addEventListener("click", () => {
    const confirmed = window.confirm("保存済みのプレー記録をすべて削除します。よろしいですか？");
    if (!confirmed) {
      return;
    }

    const reconfirmed = window.confirm("この操作は取り消せません。本当にすべて削除しますか？");
    if (!reconfirmed) {
      return;
    }

    store.clearAllRecords();
  });

  // DBR IR送信
  nodes.sendJsonToIrTestButton?.addEventListener("click", async () => {
    const targetWindow = openDbrIrImportPage();
    if (!targetWindow) {
      return;
    }

    setButtonLoading(nodes.sendJsonToIrTestButton, true, "送信準備中...");
    lockHeroButtonsExcept(nodes.sendJsonToIrTestButton);

    try {
      await tryRefreshDifficultyTableForIo("DBR IR送信");

      const jsonText = JSON.stringify(store.getExportJson(), null, 2);
      sendJsonToDbrIrPage(targetWindow, jsonText);
    } catch (error) {
      const message = error instanceof Error ? error.message : "DBR IR送信に失敗しました。";
      window.alert(message);
    } finally {
      clearHeroButtonStates();
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (!floatingFilterOpen) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (target.closest(".floating-filter-panel")) {
      floatingOutsidePointerState = null;
      return;
    }

    floatingOutsidePointerState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  });

  document.addEventListener("pointermove", (event) => {
    if (!floatingOutsidePointerState || event.pointerId !== floatingOutsidePointerState.pointerId) {
      return;
    }

    const deltaX = Math.abs(event.clientX - floatingOutsidePointerState.startX);
    const deltaY = Math.abs(event.clientY - floatingOutsidePointerState.startY);
    if (deltaX > 8 || deltaY > 8) {
      floatingOutsidePointerState.moved = true;
    }
    if (deltaY > 16) {
      floatingOutsidePointerState = null;
      closeFloatingFilter({ preserveScroll: true });
    }    
  });

  document.addEventListener("pointerup", (event) => {
    if (!floatingOutsidePointerState || event.pointerId !== floatingOutsidePointerState.pointerId) {
      return;
    }

    const moved = floatingOutsidePointerState.moved;
    floatingOutsidePointerState = null;
    if (moved) {
      return;
    }

    closeFloatingFilter({ preserveScroll: true });
  });

  document.addEventListener("pointercancel", (event) => {
    if (!floatingOutsidePointerState || event.pointerId !== floatingOutsidePointerState.pointerId) {
      return;
    }

    floatingOutsidePointerState = null;
    closeFloatingFilter({ preserveScroll: true });
  });

  return {
    render(snapshot) {
      const snapshotFilterSignature = JSON.stringify(snapshot.filters);
      if (filterDraft === null || snapshotFilterSignature !== appliedFilterSignature) {
        filterDraft = structuredClone(snapshot.filters);
        appliedFilterSignature = snapshotFilterSignature;
      }

      latestFilterBounds = deriveFilterBoundsComponent(snapshot.songStates);
      const summaryBandScrollTop = nodes.summary?.querySelector(".summary-band-chart")?.scrollTop ?? 0;
      renderSummaryComponent(nodes.summary, snapshot.summary, snapshot.summaryFilters, latestFilterBounds, snapshot.filters);
      const summaryBandChart = nodes.summary?.querySelector(".summary-band-chart");
      if (summaryBandChart) {
        summaryBandChart.scrollTop = summaryBandScrollTop;
      }
      latestHistoryDates = deriveHistoryDatesComponent(snapshot.songStates);
      latestVisibleCount = snapshot.visibleSongs.length;
      if (nodes.summaryDisplaySelect) {
        const effectiveSummaryDisplayMode = getEffectiveSummaryDisplayMode(snapshot.filters);
        const canSelectSummaryDisplayMode = snapshot.filters.displayMode === "all";
        nodes.summaryDisplaySelect.disabled = !canSelectSummaryDisplayMode;
        nodes.summaryDisplayField?.toggleAttribute("hidden", !canSelectSummaryDisplayMode);
        if (nodes.summaryDisplaySelect.value !== effectiveSummaryDisplayMode) {
          nodes.summaryDisplaySelect.value = effectiveSummaryDisplayMode;
        }
      }
      const effectiveSummaryDisplayMode = getEffectiveSummaryDisplayMode(snapshot.filters);
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
        axisMode: snapshot.filters.axisMode,
        summaryDisplayMode: effectiveSummaryDisplayMode,
      });
      renderPaginationComponent(nodes.catalogPaginationTop, snapshot.pagination, {
        showSortDirectionToggle: true,
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
      const selectedCardExists = snapshot.selectedSong
        ? Boolean(nodes.catalog?.querySelector(snapshot.selectedCatalogKey
          ? `[data-catalog-key="${encodeURIComponent(snapshot.selectedCatalogKey)}"]`
          : `[data-title="${encodeURIComponent(snapshot.selectedSong.title)}"]`))
        : false;

      syncRecordFormWithSnapshot(nodes, snapshot, { setDirty: setEntryFormDirty });

      if (nodes.backToCardButton) {
        nodes.backToCardButton.disabled = !selectedCardExists;
      }
      if (nodes.catalogSortSelect) {
        renderCatalogSortOptionsComponent(nodes.catalogSortSelect, snapshot.filters.displayMode, snapshot.sortMode);
      }
      if (nodes.catalogViewToggle) {
        const isListView = snapshot.catalogViewMode === "list";
        nodes.catalogViewToggle.innerHTML = isListView
          ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5"></rect><rect x="13" y="4" width="7" height="7" rx="1.5"></rect><rect x="4" y="13" width="7" height="7" rx="1.5"></rect><rect x="13" y="13" width="7" height="7" rx="1.5"></rect></svg>'
          : '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="3" rx="1.5"></rect><rect x="4" y="10.5" width="16" height="3" rx="1.5"></rect><rect x="4" y="16" width="16" height="3" rx="1.5"></rect></svg>';
        nodes.catalogViewToggle.setAttribute("aria-pressed", isListView ? "true" : "false");
        nodes.catalogViewToggle.title = isListView ? "箱型表示に切り替え" : "一覧表示に切り替え";
      }
    },
  };
}
