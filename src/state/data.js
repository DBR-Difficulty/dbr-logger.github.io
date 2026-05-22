const MODULE_VERSION = new URL(import.meta.url).search;

const { LAMP_OPTIONS } = await import(`../constants.js${MODULE_VERSION}`);
const { exportVerticalCsv, importVerticalCsv } = await import(`../data/csv.js${MODULE_VERSION}`);
const { attachKatateToDifficultyTable, fetchDifficultyTable } = await import(`../data/difficulty.js${MODULE_VERSION}`);
const { exportDbrJson, importDbrJson } = await import(`../data/export-json.js${MODULE_VERSION}`);
const { loadStoredState, saveStoredState } = await import(`../data/storage.js${MODULE_VERSION}`);
const { compareIsoDates, formatLocalDateTime, todayIso } = await import(`../utils/date.js${MODULE_VERSION}`);

const CHART_SUFFIX_ORDER = new Map([
  ["B", 0],
  ["N", 1],
  ["H", 2],
  ["A", 3],
  ["L", 4],
]);
const RECORD_ID_PREFIX = "record--";

export function createRecordId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${RECORD_ID_PREFIX}${crypto.randomUUID()}`;
  }

  return `${RECORD_ID_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isCanonicalRecordId(id) {
  return typeof id === "string" && id.startsWith(RECORD_ID_PREFIX);
}

export function splitTitleAndSuffix(title) {
  const normalizedTitle = String(title ?? "");
  const match = normalizedTitle.match(/^(.*)\(([BNHAL])\)$/);
  if (!match) {
    return {
      baseTitle: normalizedTitle,
      suffix: "",
      suffixRank: Number.POSITIVE_INFINITY,
    };
  }

  return {
    baseTitle: match[1],
    suffix: match[2],
    suffixRank: CHART_SUFFIX_ORDER.get(match[2]) ?? Number.POSITIVE_INFINITY,
  };
}

export function compareTitlesWithSuffixOrder(aTitle, bTitle) {
  const a = splitTitleAndSuffix(aTitle);
  const b = splitTitleAndSuffix(bTitle);
  const baseCompare = a.baseTitle.localeCompare(b.baseTitle, "ja");
  if (baseCompare !== 0) {
    return baseCompare;
  }

  if (a.suffixRank !== b.suffixRank) {
    return a.suffixRank - b.suffixRank;
  }

  return String(aTitle).localeCompare(String(bTitle), "ja");
}

export function sortSongs(a, b) {
  return a.sortOrder - b.sortOrder || a.reserveOrder - b.reserveOrder || compareTitlesWithSuffixOrder(a.title, b.title);
}

export function normalizeRecordTimestamp(timestamp, date) {
  const normalized = String(timestamp ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized;
  }

  return date ? `${date}T00:00:00` : "";
}

export function compareRecordTimestamps(a, b) {
  const aTimestamp = normalizeRecordTimestamp(a?.timestamp, a?.date);
  const bTimestamp = normalizeRecordTimestamp(b?.timestamp, b?.date);
  return aTimestamp.localeCompare(bTimestamp);
}

export function sortRecords(a, b) {
  return compareRecordTimestamps(a, b) || compareIsoDates(a.date, b.date) || compareTitlesWithSuffixOrder(a.title, b.title);
}

export function parseOptionalNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseRecordTimestampMs(record) {
  const timestamp = normalizeRecordTimestamp(record?.timestamp, record?.date);
  if (!timestamp) {
    return null;
  }

  const parsed = new Date(timestamp).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function getLampRank(lamp) {
  const rank = LAMP_OPTIONS.indexOf(lamp);
  return rank >= 0 ? rank : 0;
}

export function pickBetterLamp(a, b) {
  return getLampRank(a) >= getLampRank(b) ? a : b;
}

export function getRecordPlayDate(record) {
  return record.playDate || record.date;
}

function normalizeRecordComparableValue(value) {
  return value === undefined ? null : value;
}

export function areCsvRecordValuesEqual(a, b) {
  return normalizeRecordTimestamp(a?.timestamp, a?.date) === normalizeRecordTimestamp(b?.timestamp, b?.date)
    && String(a?.date ?? "") === String(b?.date ?? "")
    && String(a?.title ?? "") === String(b?.title ?? "")
    && String(a?.textageKey ?? "") === String(b?.textageKey ?? "")
    && String(a?.lamp ?? "NO PLAY") === String(b?.lamp ?? "NO PLAY")
    && normalizeRecordComparableValue(parseOptionalNumber(a?.bp)) === normalizeRecordComparableValue(parseOptionalNumber(b?.bp))
    && normalizeRecordComparableValue(parseOptionalNumber(a?.score)) === normalizeRecordComparableValue(parseOptionalNumber(b?.score))
    && normalizeRecordComparableValue(parseOptionalNumber(a?.level)) === normalizeRecordComparableValue(parseOptionalNumber(b?.level))
    && normalizeRecordComparableValue(parseOptionalNumber(a?.splv)) === normalizeRecordComparableValue(parseOptionalNumber(b?.splv))
    && String(a?.source ?? "") === String(b?.source ?? "");
}

export function getCsvRecordMergeKey(record) {
  const timestamp = normalizeRecordTimestamp(record?.timestamp, record?.date);
  const textageKey = typeof record?.textageKey === "string" ? record.textageKey.trim() : "";
  const title = typeof record?.title === "string" ? record.title.trim() : "";

  if (textageKey) {
    return `textageKey:${textageKey}::timestamp:${timestamp}`;
  }

  return `title:${title}::timestamp:${timestamp}`;
}

export function getJsonRecordMergeKey(record) {
  const date = typeof record?.date === "string" ? record.date.trim() : "";
  const textageKey = typeof record?.textageKey === "string" ? record.textageKey.trim() : "";
  const title = typeof record?.title === "string" ? record.title.trim() : "";

  if (textageKey) {
    return `textageKey:${textageKey}::date:${date}`;
  }

  return `title:${title}::date:${date}`;
}

export function buildRecordIndex(records) {
  const index = new Map();

  records.forEach((record) => {
    if (!index.has(record.title)) {
      index.set(record.title, []);
    }
    index.get(record.title).push(record);
  });

  index.forEach((history) => history.sort(sortRecords));
  return index;
}

export function normalizeDifficultyTableUpdatedAt(stored) {
  if (Number.isFinite(stored?.difficultyTableUpdatedAt)) {
    return stored.difficultyTableUpdatedAt;
  }

  const importedAt = stored?.difficultyTable?.importedAt;
  if (typeof importedAt === "string") {
    const parsed = Date.parse(importedAt);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

export function normalizeRecords(records) {
  return [...(Array.isArray(records) ? records : [])]
    .filter((record) => record?.date && record?.title)
    .map((record) => ({
      id: isCanonicalRecordId(record.id) ? record.id : createRecordId(),
      timestamp: normalizeRecordTimestamp(record.timestamp, record.date),
      date: record.date,
      title: record.title,
      level: parseOptionalNumber(record.level),
      splv: parseOptionalNumber(record.splv),
      lamp: LAMP_OPTIONS.includes(record.lamp) ? record.lamp : "NO PLAY",
      bp: parseOptionalNumber(record.bp),
      score: parseOptionalNumber(record.score),
      textageKey: typeof record.textageKey === "string" ? record.textageKey : "",
      source: record.source || "manual",
    }))
    .sort(sortRecords);
}

export function normalizeSongs(songs) {
  return [...(Array.isArray(songs) ? songs : [])].sort(sortSongs);
}

export function needsRecordTimestampMigration(records) {
  if (!Array.isArray(records)) {
    return false;
  }

  return records.some((record) => (
    record?.date
    && record?.title
    && normalizeRecordTimestamp(record.timestamp, record.date) !== String(record.timestamp ?? "").trim()
  ));
}

export function needsRecordIdMigration(records) {
  if (!Array.isArray(records)) {
    return false;
  }

  return records.some((record) => (
    record?.date
    && record?.title
    && !isCanonicalRecordId(record.id)
  ));
}

export function loadAppData() {
  return loadStoredState();
}

export function saveAppData(payload) {
  saveStoredState(payload);
}

export function createPersistedState(state) {
  return {
    songs: state.songs,
    records: state.records,
    difficultyTable: state.difficultyTable,
    difficultyTableUpdatedAt: state.difficultyTableUpdatedAt,
    songNotes: state.songNotes,
    titleFilterBase: state.titleFilterBase,
    dateFilterBase: state.dateFilterBase,
    dateRangeMemory: state.dateRangeMemory,
    titleSortBase: state.titleSortBase,
    textQueryMemory: state.textQueryMemory,
    axisMemory: state.axisMemory,
    sortModeMemory: state.sortModeMemory,
    chartDifficultySortHead: state.chartDifficultySortHead,
    chartDifficultySortHeadMemory: state.chartDifficultySortHeadMemory,
    recommendSortHead: state.recommendSortHead,
    recommendSortHeadMemory: state.recommendSortHeadMemory,
    filters: state.filters,
    sortMode: state.sortMode,
    sortDirection: state.sortDirection,
    randomSeed: state.randomSeed,
    catalogViewMode: state.catalogViewMode,
  };
}

export function buildDifficultyTextageIndex(difficultyTable) {
  const index = new Map();

  difficultyTable?.entries?.forEach((entry) => {
    if (entry?.title && entry?.textageid && !index.has(entry.title)) {
      index.set(entry.title, entry.textageid);
    }
  });

  return index;
}

export function createTextageKeyFromCatalogEntry(entry) {
  if (!entry?.textageid || !entry?.title) {
    return "";
  }

  const suffix = entry.title.slice(-3);
  return /^\([A-Z]\)$/.test(suffix) ? `${entry.textageid}${suffix}` : "";
}

export function migrateRecordTitlesByTextageKey(records, difficultyTable) {
  const textageKeyToNewTitle = new Map();
  difficultyTable.entries.forEach((entry) => {
    if (!entry.textageid || !entry.title) return;
    const suffix = entry.title.slice(-3);
    if (!/^\([A-Z]\)$/.test(suffix)) return;
    const key = `${entry.textageid}${suffix}`;
    textageKeyToNewTitle.set(key, entry.title);
  });

  return records.map((record) => {
    if (!record.textageKey) return record;
    const newTitle = textageKeyToNewTitle.get(record.textageKey);
    if (!newTitle || newTitle === record.title) return record;
    return { ...record, title: newTitle };
  });
}

export function updateTextageKeyFromDifficultyTable(records, difficultyTable) {
  const titleToTextageKey = new Map();
  difficultyTable.entries.forEach((entry) => {
    if (!entry.textageid || !entry.title) return;
    const suffix = entry.title.slice(-3);
    if (!/^\([A-Z]\)$/.test(suffix)) return;
    titleToTextageKey.set(entry.title, `${entry.textageid}${suffix}`);
  });

  return records.map((record) => {
    const newTextageKey = titleToTextageKey.get(record.title);
    if (!newTextageKey || newTextageKey === record.textageKey) return record;
    return { ...record, textageKey: newTextageKey };
  });
}

export async function hydrateDifficultyTableWithKatate(difficultyTable) {
  return attachKatateToDifficultyTable(difficultyTable);
}

export async function loadRemoteDifficultyTable() {
  return fetchDifficultyTable();
}

export function getCurrentRecordDate() {
  return todayIso();
}

export function getCurrentRecordTimestamp() {
  return formatLocalDateTime();
}

export function exportRecordsAsCsv(records, songNotes, difficultyTable) {
  return exportVerticalCsv(records, songNotes, difficultyTable);
}

export function parseCsvRecords(text, difficultyTable) {
  return importVerticalCsv(text, difficultyTable);
}

export function exportRecordsAsDbrJson(records, difficultyTable, getBestRecordState) {
  const difficultyTextageIndex = buildDifficultyTextageIndex(difficultyTable);
  const recordIndex = buildRecordIndex(records);
  const exportEntries = [...recordIndex.entries()].map(([title, history]) => {
    const aggregate = typeof getBestRecordState === "function"
      ? getBestRecordState(title, history)
      : getDefaultBestRecordState(title, history, difficultyTextageIndex);

    return aggregate;
  });

  return exportDbrJson(exportEntries);
}

function getDefaultBestRecordState(title, history, difficultyTextageIndex) {
  const bestLamp = history.reduce((best, record) => pickBetterLamp(best, record.lamp), "NO PLAY");
  const bestBpValues = history.map((record) => record.bp).filter((value) => Number.isFinite(value));
  const bestBp = bestBpValues.length > 0 ? Math.min(...bestBpValues) : Number.POSITIVE_INFINITY;
  const bestScore = history.reduce((best, record) => (
    record.score === null || record.score === undefined ? best : Math.max(best, record.score)
  ), Number.NEGATIVE_INFINITY);
  const storedTextageKey = history.find((record) => record.textageKey)?.textageKey ?? "";
  const textageid = difficultyTextageIndex.get(title) ?? "";
  const suffix = title.slice(-3);
  const latestTextageKey = textageid && /^\([A-Z]\)$/.test(suffix) ? `${textageid}${suffix}` : storedTextageKey;

  return {
    title,
    entryCount: history.length,
    bestLamp,
    bestBp: Number.isFinite(bestBp) ? bestBp : null,
    bestScore: Number.isFinite(bestScore) ? bestScore : null,
    textageid,
    textageKey: latestTextageKey,
  };
}

export function parseDbrJsonRecords(payload, referenceDate = todayIso()) {
  return importDbrJson(payload, referenceDate);
}
