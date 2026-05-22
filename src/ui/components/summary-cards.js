const MODULE_VERSION = new URL(import.meta.url).search;

const { LAMP_OPTIONS } = await import(`../../constants.js${MODULE_VERSION}`);
const { formatIsoDate, todayIso } = await import(`../../utils/date.js${MODULE_VERSION}`);
const { escapeHtml } = await import(`../../utils/html.js${MODULE_VERSION}`);

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
const CHART_DIFFICULTY_OPTIONS = ["B", "N", "H", "A", "L"];
const SCORE_RANK_OPTIONS = ["AAA", "AA", "A", "B", "C", "D", "E", "F", "※"];
const SCORE_RANK_SUMMARY_OPTIONS = ["AAA", "AA", "A", "B", "C", "D", "E", "F"];
const SCORE_RANK_FILTER_OPTIONS = ["F", "E", "D", "C", "B", "A", "AA", "AAA"];
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

const getLampColor = (lamp) => LAMP_COLORS[lamp] ?? "transparent";
const getScoreRankColor = (rank) => SCORE_RANK_COLORS[rank] ?? "transparent";
const getSummaryBandLampColor = (lamp) => getLampColor(lamp);
const getScoreRankSummaryLabel = (rank) => rank === "F" ? "F/※" : rank;

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

function isAxisRangeMode(filters) {
  return isNumericAxisMode(filters.axisMode)
    && (isRangeOnlyAxisMode(filters.axisMode) || Boolean(filters.axisRangeModeByAxis?.[filters.axisMode]));
}

function formatKatateFilterValue(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return "";
  }

  if (numberValue === 13) {
    return "12-10";
  }

  return numberValue.toFixed(1).replace(".", "-");
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

function getActiveChartDifficultiesForSummary(filters) {
  const chartDifficulties = filters.chartDifficulties ?? CHART_DIFFICULTY_OPTIONS;

  if (filters.axisMode !== "version") {
    return chartDifficulties;
  }

  const versionChartDifficulties = filters.versionChartDifficulties ?? CHART_DIFFICULTY_OPTIONS;
  return chartDifficulties.filter((option) => versionChartDifficulties.includes(option));
}

function getSummaryChartDifficultyOptions(filters) {
  return filters.chartDifficulties ?? CHART_DIFFICULTY_OPTIONS;
}

function formatChartDifficultySelection(values) {
  const selected = Array.isArray(values) ? values : CHART_DIFFICULTY_OPTIONS;
  const ordered = CHART_DIFFICULTY_OPTIONS.filter((option) => selected.includes(option));
  return ordered.length ? ordered.join("/") : "-";
}

function summarizeSummaryFilterCaption(filters, bounds) {
  if (filters.axisMode !== "version") {
    return summarizeAxisFilter(filters, bounds);
  }

  const versionLabel = isAxisRangeMode(filters)
    ? formatAxisRangeValue(filters.axisMode, getNormalizedAxisRange(filters, getAxisRangeValues(bounds, filters.axisMode)))
    : formatAxisValue(filters.axisMode, filters.axisValue);

  const selectedChartDifficulties = getActiveChartDifficultiesForSummary(filters);
  const visibleChartDifficulties = getSummaryChartDifficultyOptions(filters);
  if (visibleChartDifficulties.length > 0 && selectedChartDifficulties.length === visibleChartDifficulties.length) {
    return versionLabel;
  }

  return `${versionLabel} (${formatChartDifficultySelection(selectedChartDifficulties)})`;
}

function renderSummaryChartDifficultyFilter(filters) {
  if (filters.axisMode !== "version") {
    return "";
  }

  const selectedChartDifficulties = getActiveChartDifficultiesForSummary(filters);
  const visibleChartDifficulties = getSummaryChartDifficultyOptions(filters);
  const chartDifficultyMarkup = visibleChartDifficulties.map((option) => {
    const checked = selectedChartDifficulties.includes(option) ? "checked" : "";
    return `
      <label class="recommend-chip summary-chart-difficulty-chip">
        <input type="checkbox" data-summary-chart-difficulty="${escapeHtml(option)}" value="${escapeHtml(option)}" ${checked} />
        <span>${escapeHtml(option)}</span>
      </label>
    `;
  }).join("");

  return `
    <div class="summary-chart-difficulty-filter">
      <span class="recommend-label">譜面難易度</span>
      <div class="recommend-options">
        ${chartDifficultyMarkup}
      </div>
    </div>
  `;
}

function formatPercent(value, total) {
  if (total === 0) {
    return "0.0%";
  }
  return `${((value / total) * 100).toFixed(1)}%`;
}

function renderSummaryBands(summary) {
  if (!summary.bands.length) {
    return `<div class="summary-chart-empty empty-state">${escapeHtml(summary.emptyMessage ?? "難易度表が未読み込みです。")}</div>`;
  }

  const rows = summary.bands.map((band) => {
    const categoryOptions = summary.displayMode === "score" ? SCORE_RANK_SUMMARY_OPTIONS : LAMP_OPTIONS;
    const segmentOrder = summary.displayMode === "score" ? categoryOptions : [...categoryOptions].reverse();
    const emptyKey = summary.displayMode === "score" ? "F" : "NO PLAY";
    const getColor = summary.displayMode === "score" ? getScoreRankColor : getSummaryBandLampColor;
    const segments = (band.total === 0 ? [emptyKey] : segmentOrder).map((key) => {
      const count = band.lampCounts[key] ?? 0;
      if (count <= 0 && band.total !== 0) {
        return "";
      }

      const flexGrow = band.total === 0 ? 1 : count;
      const segment = `
        <span
          class="summary-band-segment"
          style="flex:${flexGrow} 1 0px;background:${getColor(key)}"
          aria-hidden="true"
        ></span>
      `;
      return segment;
    }).join("");

    return `
      <div class="summary-band-row">
        <div class="summary-band-label">${escapeHtml(band.label)}</div>
        <div class="summary-band-track" role="img" aria-label="${escapeHtml(band.label)} のクリアランプ内訳">
          ${segments}
        </div>
        <div class="summary-band-total">${band.total}</div>
      </div>
    `;
  }).join("");
  const scrollableClass = summary.bands.length >= 1000 ? " is-scrollable" : "";

  return `
    <div class="summary-chart-wrap">
      <div class="summary-chart-heading">
        <span>${escapeHtml(summary.totalLabel ?? "総曲数")}</span>
        <strong>${summary.bandTotalSongs ?? summary.totalSongs} ${escapeHtml(summary.totalUnit ?? "曲")}</strong>
      </div>
      <div class="summary-band-chart${scrollableClass}">
        ${rows}
      </div>
    </div>
  `;
}

export function renderSummary(summaryContainer, summary, filters, bounds, activeFilters = filters) {
  const lampFilterDisabled = isTextAxisMode(activeFilters.axisMode);
  const isScoreMode = summary.displayMode === "score";
  const legendOptions = isScoreMode ? SCORE_RANK_FILTER_OPTIONS : LAMP_OPTIONS;
  const selectedValues = isScoreMode
    ? (filters.scoreRanks ?? SCORE_RANK_OPTIONS)
    : filters.lamps;
  const getLegendColor = isScoreMode ? getScoreRankColor : getLampColor;

  const legend = legendOptions.map((lamp) => {
    const isActive = isScoreMode && lamp === "F"
      ? selectedValues.includes("F") || selectedValues.includes("※")
      : selectedValues.includes(lamp);
    const label = isScoreMode ? getScoreRankSummaryLabel(lamp) : lamp;

    return `
      <button
        class="summary-lamp-item ${isActive ? "is-active" : "is-inactive"}"
        type="button"
        data-summary-lamp="${escapeHtml(lamp)}"
        aria-pressed="${isActive ? "true" : "false"}"
        ${lampFilterDisabled ? "disabled aria-disabled=\"true\"" : ""}
      >
        <div class="summary-lamp-main">
          <span class="summary-lamp-dot" style="background:${getLegendColor(lamp)}"></span>
          <span class="summary-lamp-label">${escapeHtml(label)}</span>
        </div>
        <div class="summary-lamp-values">
          <strong>${summary.lampCounts[lamp] ?? 0}</strong>
          <span>${formatPercent(summary.lampCounts[lamp] ?? 0, summary.totalSongs)}</span>
        </div>
      </button>
    `;
  }).join("");
  const summaryFilterCaption = summarizeSummaryFilterCaption(filters, bounds);

  summaryContainer.innerHTML = `
    <div class="summary-panel">
      ${renderSummaryBands(summary)}
      ${renderSummaryChartDifficultyFilter(filters)}
      <div class="summary-filter-caption">${escapeHtml(summaryFilterCaption)}</div>
      <div class="summary-legend">
        ${legend}
      </div>
    </div>
  `;
}
