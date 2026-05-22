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

export {
  getSummaryBandLampColor,
  getCardBandColor,
  getScoreRankSummaryLabel
};

export { bindIoHandlers } from "./handlers/io-handlers.js";
export {
  bindFloatingOutsideHandlers,
  bindFloatingScroll,
  bindNumberInputWheelGuard,
  bindSummaryFilterPanelHandlers,
  bindThemeToggle,
  bindWindowResize,
  createScrollController,
  isDifficultyTableStale,
  getCurrentTheme,
  persistTheme,
  loadSummaryFiltersOpen,
  persistSummaryFiltersOpen,
  applyTheme,
  THEME_STORAGE_KEY,
  SUMMARY_FILTERS_OPEN_STORAGE_KEY,
} from "./handlers/global-handlers.js";
export { bindCatalogHandlers, bindSummaryHandlers } from "./handlers/catalog-handlers.js";
export { bindKeyboardHandlers } from "./handlers/keyboard-handlers.js";
export {
  bindRecordFormHandlers,
  ENTRY_BP_INPUT_MODE_STORAGE_KEY,
  ENTRY_BP_INPUT_MODES,
} from "./handlers/form-handlers.js";
export * from "./filter-options.js";
export * from "./handlers/floating-filter-handlers.js";
