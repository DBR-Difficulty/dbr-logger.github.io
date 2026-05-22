const MODULE_VERSION = new URL(import.meta.url).search;

const { LAMP_OPTIONS } = await import(`../constants.js${MODULE_VERSION}`);
const { todayIso } = await import(`../utils/date.js${MODULE_VERSION}`);
const {
  getRecordPlayDate,
  normalizeRecordTimestamp,
  parseOptionalNumber,
  parseRecordTimestampMs,
  pickBetterLamp,
  sortRecords,
} = await import(`./data.js${MODULE_VERSION}`);
const {
  BPM_BUCKETS,
  CHART_DIFFICULTY_OPTIONS,
  SCORE_RANK_OPTIONS,
  SCORE_RANK_SUMMARY_OPTIONS,
  VERSION_ORDER_VALUES,
  filterHistoryByDateRange,
  getBpmBucketLabel,
  getBpmBucketOrderValue,
  getBpmBucketValue,
  getVersionBandLabel,
  getVersionOrderValue,
  matchesFiltersFor,
  normalizeDateRange,
  normalizeDateValue,
  normalizeVersionValue,
  parseBpmSortValue,
} = await import(`./filters.js${MODULE_VERSION}`);

export const PLAY_DATE_RESET_HOUR = 5;
export const PLAY_DATE_CHAIN_THRESHOLD_MS = 60 * 60 * 1000;
export const SCORE_RANKS = [
  { label: "MAX", numerator: 9 },
  { label: "AAA", numerator: 8 },
  { label: "AA", numerator: 7 },
  { label: "A", numerator: 6 },
  { label: "B", numerator: 5 },
  { label: "C", numerator: 4 },
  { label: "D", numerator: 3 },
  { label: "E", numerator: 2 },
  { label: "F", numerator: 0 },
];

export function getScoreMax(songOrRecord) {
  const rawScratch = songOrRecord?.scratch;
  if (rawScratch === null || rawScratch === undefined || rawScratch === "") {
    return null;
  }

  const notes = Number(songOrRecord?.notes);
  const scratch = Number(rawScratch);
  if (!Number.isFinite(notes) || notes <= 0 || !Number.isFinite(scratch)) {
    return null;
  }

  const keyNotes = notes - scratch;
  return keyNotes > 0 ? keyNotes * 4 : null;
}

export function getScoreRate(score, songOrRecord) {
  const maxScore = getScoreMax(songOrRecord);
  return Number.isFinite(score) && maxScore ? score / maxScore : null;
}

export function getScoreRankInfo(score, songOrRecord) {
  const maxScore = getScoreMax(songOrRecord);
  if (!maxScore) {
    return {
      label: "※",
      display: "※",
      rate: null,
      score: null,
    };
  }

  if (!Number.isFinite(score)) {
    return {
      label: "F",
      display: "-",
      rate: null,
      score: null,
    };
  }

  const normalizedScore = Math.max(0, Math.min(score, maxScore));
  let achievedRank = SCORE_RANKS[SCORE_RANKS.length - 1];
  for (const candidate of SCORE_RANKS) {
    if (normalizedScore >= Math.round(maxScore * (candidate.numerator / 9))) {
      achievedRank = candidate;
      break;
    }
  }

  return {
    label: achievedRank.label === "MAX" ? "MAX" : achievedRank.label,
    display: `${((normalizedScore / maxScore) * 100).toFixed(2)}%`,
    rate: normalizedScore / maxScore,
    score: normalizedScore,
  };
}

export function formatSaveScoreChangeValue(score, songOrRecord) {
  if (!Number.isFinite(score)) {
    return "-(-)";
  }

  const rate = getScoreRate(score, songOrRecord);
  if (rate === null) {
    return String(score);
  }

  return `${score}(${(rate * 100).toFixed(2)}%)`;
}

export function formatSaveBpChangeValue(bp) {
  return Number.isFinite(bp) ? String(bp) : "-";
}

export function buildSaveNotification(lines) {
  const visibleLines = lines.filter(Boolean);
  return visibleLines.length
    ? `保存しました。\n\n${visibleLines.join("\n")}`
    : "保存しました。";
}

export function applyPlayDateAdjustment(records) {
  const sortedRecords = [...records].sort(sortRecords);
  let previousRecord = null;
  let previousPlayDate = "";

  return sortedRecords.map((record) => {
    let playDate = record.date;
    const recordTime = parseRecordTimestampMs(record);
    const previousTime = parseRecordTimestampMs(previousRecord);
    const timestamp = normalizeRecordTimestamp(record.timestamp, record.date);
    const hour = Number(timestamp.slice(11, 13));
    const previousBaseDate = previousPlayDate || previousRecord?.date || "";
    const shouldInheritPlayDate = previousRecord
      && previousTime !== null
      && recordTime !== null
      && record.date !== previousBaseDate
      && recordTime - previousTime >= 0
      && recordTime - previousTime <= PLAY_DATE_CHAIN_THRESHOLD_MS
      && Number.isFinite(hour)
      && hour < PLAY_DATE_RESET_HOUR;

    if (shouldInheritPlayDate) {
      playDate = previousPlayDate || previousRecord.date;
    }

    previousRecord = record;
    previousPlayDate = playDate;

    return { ...record, playDate };
  });
}

export function getLatestFiniteValue(history, key) {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const value = history[index]?.[key];
    if (Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

export function deriveSongState(song, history = []) {
  const latest = history.at(-1) ?? null;
  const latestBp = getLatestFiniteValue(history, "bp");
  const latestScore = getLatestFiniteValue(history, "score");
  const bestLamp = history.reduce((best, record) => pickBetterLamp(best, record.lamp), song.initialLamp);
  const historicalBpValues = history.map((record) => record.bp).filter((value) => Number.isFinite(value));
  const historicalBest = historicalBpValues.length > 0 ? Math.min(...historicalBpValues) : Number.POSITIVE_INFINITY;
  const historicalBestScore = history.reduce((best, record) => (
    record.score === null || record.score === undefined ? best : Math.max(best, record.score)
  ), Number.NEGATIVE_INFINITY);
  const bestCandidates = [song.initialBestBp, Number.isFinite(historicalBest) ? historicalBest : null].filter((value) => value != null);
  const bestScore = Number.isFinite(historicalBestScore) ? historicalBestScore : null;
  const bestScoreRank = getScoreRankInfo(bestScore, song);
  const latestScoreRank = getScoreRankInfo(latestScore, song);
  const scoreMax = getScoreMax(song);

  return {
    ...song,
    history,
    entryCount: history.length,
    latestDate: latest?.date ?? null,
    latestTimestamp: latest ? normalizeRecordTimestamp(latest.timestamp, latest.date) : null,
    latestLamp: latest?.lamp ?? song.initialLamp,
    bestLamp,
    currentBp: latestBp ?? song.initialBestBp,
    bestBp: bestCandidates.length > 0 ? Math.min(...bestCandidates) : null,
    currentScore: latestScore,
    bestScore,
    scoreMax,
    bestScoreRate: bestScoreRank.rate,
    currentScoreRate: latestScoreRank.rate,
    bestScoreLabel: bestScoreRank.display,
    currentScoreLabel: latestScoreRank.display,
    scoreRank: bestScoreRank.label,
    scoreFilterRank: bestScoreRank.label === "MAX" ? "AAA" : bestScoreRank.label,
  };
}

export function applyDateScopedDisplayValues(songState, filters) {
  if (filters.axisMode !== "date") {
    return songState;
  }

  const dateScopedHistory = filterHistoryByDateRange(songState.history, filters);
  const dateScopedLatestBp = getLatestFiniteValue(dateScopedHistory, "bp");
  const dateScopedLatestScore = getLatestFiniteValue(dateScopedHistory, "score");
  const dateScopedBestScore = dateScopedHistory.reduce((best, record) => (
    record.score === null || record.score === undefined ? best : Math.max(best, record.score)
  ), Number.NEGATIVE_INFINITY);
  const bestScore = Number.isFinite(dateScopedBestScore) ? dateScopedBestScore : null;
  const bestScoreRank = getScoreRankInfo(bestScore, songState);
  const latestScoreRank = getScoreRankInfo(dateScopedLatestScore, songState);

  return {
    ...songState,
    bestLamp: dateScopedHistory.reduce((best, record) => pickBetterLamp(best, record.lamp), songState.initialLamp),
    currentBp: dateScopedLatestBp,
    currentScore: dateScopedLatestScore,
    bestScore,
    bestScoreRate: bestScoreRank.rate,
    currentScoreRate: latestScoreRank.rate,
    bestScoreLabel: bestScoreRank.display,
    currentScoreLabel: latestScoreRank.display,
    scoreRank: bestScoreRank.label,
    scoreFilterRank: bestScoreRank.label === "MAX" ? "AAA" : bestScoreRank.label,
  };
}

export function createDifficultyCatalogEntries(difficultyTable) {
  const chartMap = new Map();

  difficultyTable.entries.forEach((entry) => {
    const chartKey = `${entry.title}|${entry.textageid || ""}`;
    const isProposal = entry.level && entry.splv === "新規提案";

    if (!chartMap.has(chartKey)) {
      chartMap.set(chartKey, { ...entry, isProposed: isProposal });
    } else {
      const existing = chartMap.get(chartKey);
      if (isProposal && !existing.isProposed) {
        chartMap.set(chartKey, {
          ...entry,
          splv: existing.splv && existing.splv !== "新規提案" ? existing.splv : entry.splv,
          isProposed: true,
        });
      } else if (!isProposal && existing.isProposed) {
        if (entry.splv && entry.splv !== "新規提案") {
          existing.splv = entry.splv;
        }
      }
    }
  });

  return [...chartMap.values()].map((entry, index) => {
    const scratch = entry.scratch === null || entry.scratch === undefined || entry.scratch === ""
      ? null
      : Number(entry.scratch);

    return {
      id: `difficulty:${entry.title}:${entry.textageid || "none"}:${entry.splv || "none"}:${entry.level || "none"}:${index}`,
      title: entry.title,
      level: entry.level,
      levelValue: parseOptionalNumber(entry.level),
      splv: entry.splv,
      splvValue: parseOptionalNumber(entry.splv),
      katate: entry.katate,
      katateValue: parseOptionalNumber(entry.katate),
      version: normalizeVersionValue(entry.ver),
      versionOrder: getVersionOrderValue(entry.ver),
      bpm: entry.bpm,
      bpmValue: parseBpmSortValue(entry.bpm),
      recommend: entry.recommend,
      inf: entry.inf,
      infAvailable: entry.inf === "○",
      acdelete: Boolean(entry.acdelete),
      notes: Number(entry.notes) || 0,
      scratch: Number.isFinite(scratch) ? scratch : null,
      textageid: entry.textageid,
      isProposed: entry.isProposed ?? false,
      chartType: entry.splv || entry.level ? "difficulty" : "difficulty-raw",
      initialLamp: "NO PLAY",
      initialBestBp: null,
    };
  });
}

export function createLampCounts() {
  return LAMP_OPTIONS.reduce((counts, lamp) => {
    counts[lamp] = 0;
    return counts;
  }, {});
}

export function createScoreRankCounts() {
  return SCORE_RANK_SUMMARY_OPTIONS.reduce((counts, rank) => {
    counts[rank] = 0;
    return counts;
  }, {});
}

export function normalizeScoreRankForSummary(scoreRank) {
  return scoreRank === "※" ? "F" : scoreRank;
}

export function buildSummary(allSongStates, bandSongStates, targetSongStates, axisMode, displayMode = "clear") {
  const isScoreMode = displayMode === "score";
  const countsFactory = isScoreMode ? createScoreRankCounts : createLampCounts;
  const countKey = isScoreMode ? "scoreFilterRank" : "bestLamp";
  const lampCounts = countsFactory();

  targetSongStates.forEach((song) => {
    const summaryKey = isScoreMode ? normalizeScoreRankForSummary(song[countKey]) : song[countKey];
    if (isScoreMode && !SCORE_RANK_SUMMARY_OPTIONS.includes(summaryKey)) {
      return;
    }

    lampCounts[summaryKey] += 1;
  });

  const bandMap = new Map();

  allSongStates.forEach((song) => {
    const value = getSummaryBandValue(song, axisMode);
    const key = value === null ? "null" : String(value);
    if (!bandMap.has(key)) {
      bandMap.set(key, {
        key,
        value,
        label: formatSummaryBandLabel(value, axisMode),
        total: 0,
        lampCounts: countsFactory(),
      });
    }
  });

  addFixedSummaryBands(bandMap, axisMode, countsFactory);

  bandSongStates.forEach((song) => {
    const summaryKey = isScoreMode ? normalizeScoreRankForSummary(song[countKey]) : song[countKey];
    if (isScoreMode && !SCORE_RANK_SUMMARY_OPTIONS.includes(summaryKey)) {
      return;
    }

    const value = getSummaryBandValue(song, axisMode);
    const key = value === null ? "null" : String(value);
    const band = bandMap.get(key);
    band.total += 1;
    band.lampCounts[summaryKey] += 1;
  });

  const bands = [...bandMap.values()].sort((a, b) => {
    if (a.value === null && b.value === null) {
      return 0;
    }
    if (a.value === null) {
      return 1;
    }
    if (b.value === null) {
      return -1;
    }
    return a.value - b.value;
  });

  return {
    axisMode,
    bandTotalSongs: isScoreMode
      ? bandSongStates.filter((song) => SCORE_RANK_SUMMARY_OPTIONS.includes(normalizeScoreRankForSummary(song[countKey]))).length
      : bandSongStates.length,
    totalSongs: isScoreMode
      ? targetSongStates.filter((song) => SCORE_RANK_SUMMARY_OPTIONS.includes(normalizeScoreRankForSummary(song[countKey]))).length
      : targetSongStates.length,
    lampCounts,
    displayMode: isScoreMode ? "score" : "clear",
    bands,
  };
}

function addFixedSummaryBands(bandMap, axisMode, countsFactory) {
  if (axisMode === "version") {
    VERSION_ORDER_VALUES.forEach((version, index) => {
      bandMap.set(String(index), {
        key: String(index),
        value: index,
        label: getVersionBandLabel(version),
        total: 0,
        lampCounts: countsFactory(),
      });
    });
  }

  if (axisMode === "bpm") {
    BPM_BUCKETS.forEach((bucket, index) => {
      bandMap.set(String(index), {
        key: String(index),
        value: index,
        label: bucket.label,
        total: 0,
        lampCounts: countsFactory(),
      });
    });
  }
}

export function getSummaryBandValue(song, axisMode) {
  if (axisMode === "splv") {
    return song.splvValue;
  }

  if (axisMode === "katate") {
    return song.katateValue;
  }

  if (axisMode === "version") {
    return song.versionOrder;
  }

  if (axisMode === "bpm") {
    const bucketValue = getBpmBucketValue(song.bpmValue);
    return bucketValue ? getBpmBucketOrderValue(bucketValue) : null;
  }

  return song.levelValue;
}

export function formatSummaryBandLabel(value, axisMode) {
  if (axisMode === "version") {
    return value === null ? "-" : getVersionBandLabel(VERSION_ORDER_VALUES[value] ?? "");
  }

  if (axisMode === "bpm") {
    return value === null ? "-" : getBpmBucketLabel(BPM_BUCKETS[value]?.value ?? "");
  }

  if (value === null) {
    return "☆-";
  }

  if (axisMode === "level" || axisMode === "date") {
    return `☆${Number(value).toFixed(2)}`;
  }

  if (axisMode === "katate" && Number(value) === 13) {
    return "☆12-10";
  }

  if (axisMode === "katate") {
    return `☆${Number(value).toFixed(1).replace(".", "-")}`;
  }

  return `☆${String(value)}`;
}

export function formatDateBandLabel(date) {
  const [, month, day] = String(date ?? "").split("-").map(Number);
  return `${month}/${day}`;
}

export function getDateSummaryRange(filters) {
  const { dateStart, dateEnd } = normalizeDateRange(filters.dateStart, filters.dateEnd);

  if (filters.dateSelectionMode === "single") {
    const dateSingle = normalizeDateValue(filters.dateSingle) || todayIso();
    return { start: dateSingle, end: dateSingle, sliceMode: "all", limit: null };
  }

  if (dateStart && dateEnd) {
    return { start: dateStart, end: dateEnd, sliceMode: "all", limit: null };
  }

  if (dateStart) {
    return { start: dateStart, end: "", sliceMode: "all", limit: null };
  }

  if (dateEnd) {
    return { start: "", end: dateEnd, sliceMode: "all", limit: null };
  }

  return { start: "", end: "", sliceMode: "all", limit: null };
}

export function getDateSummarySingleTargetDates(records, visibleTitles, dateSingle) {
  const selectedDate = normalizeDateValue(dateSingle) || todayIso();
  const historyDates = [...new Set(records
    .filter((record) => visibleTitles.has(record.title))
    .map((record) => getRecordPlayDate(record))
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  const beforeDates = historyDates.filter((date) => date < selectedDate).slice(-7);
  const afterDates = historyDates.filter((date) => date > selectedDate).slice(0, 7);
  return new Set([...beforeDates, selectedDate, ...afterDates]);
}

export function buildDateSummary(records, baseSongs, countSongs, filters) {
  const visibleTitles = new Set(baseSongs.map((song) => song.title));
  const countTitles = new Set(countSongs.map((song) => song.title));
  const baseSongByTitle = new Map(baseSongs.map((song) => [song.title, song]));
  const countSongByTitle = new Map(countSongs.map((song) => [song.title, song]));
  const isScoreMode = filters.displayMode === "score";
  const countsFactory = isScoreMode ? createScoreRankCounts : createLampCounts;
  const { start, end, sliceMode, limit } = getDateSummaryRange(filters);
  const singleTargetDates = filters.dateSelectionMode === "single"
    ? getDateSummarySingleTargetDates(records, visibleTitles, filters.dateSingle)
    : null;
  const bandMap = new Map();
  const getRecordSummaryKey = (record, song) => {
    if (isScoreMode) {
      const scoreRank = getScoreRankInfo(record.score, song).label;
      return normalizeScoreRankForSummary(scoreRank === "MAX" ? "AAA" : scoreRank);
    }

    return LAMP_OPTIONS.includes(record.lamp) ? record.lamp : "NO PLAY";
  };

  const targetDates = new Set();
  records.forEach((record) => {
    if (!visibleTitles.has(record.title)) return;
    const playDate = getRecordPlayDate(record);
    if (singleTargetDates) {
      if (!singleTargetDates.has(playDate)) return;
    } else {
      if (start && playDate < start) return;
      if (end && playDate > end) return;
    }
    targetDates.add(playDate);
  });

  [...targetDates].sort((a, b) => a.localeCompare(b)).forEach((playDate) => {
    const band = {
      key: playDate,
      value: playDate,
      label: formatDateBandLabel(playDate),
      total: 0,
      lampCounts: countsFactory(),
      baseTotal: 0,
      baseLampCounts: countsFactory(),
    };

    records.forEach((record) => {
      if (record.title === undefined || !visibleTitles.has(record.title) || getRecordPlayDate(record) !== playDate) {
        return;
      }

      const song = baseSongByTitle.get(record.title);
      const countKey = getRecordSummaryKey(record, song);
      if (isScoreMode && !SCORE_RANK_SUMMARY_OPTIONS.includes(countKey)) {
        return;
      }

      band.baseTotal += 1;
      band.baseLampCounts[countKey] += 1;

      const selectedScoreRanks = filters.scoreRanks ?? SCORE_RANK_OPTIONS;
      const isSelected = isScoreMode
        ? selectedScoreRanks.includes(countKey) || (countKey === "F" && selectedScoreRanks.includes("※"))
        : filters.lamps.includes(countKey);

      if (isSelected) {
        band.total += 1;
        band.lampCounts[countKey] += 1;
      }
    });

    if (band.baseTotal > 0) {
      bandMap.set(playDate, band);
    }
  });

  let bands = [...bandMap.values()].sort((a, b) => String(a.value).localeCompare(String(b.value)));
  if (limit !== null) {
    bands = sliceMode === "first" ? bands.slice(0, limit) : bands.slice(-limit);
  }

  const lampCounts = countsFactory();
  records.forEach((record) => {
    if (!countTitles.has(record.title)) {
      return;
    }
    const playDate = getRecordPlayDate(record);
    if (filters.dateSelectionMode === "single") {
      const dateSingle = normalizeDateValue(filters.dateSingle) || todayIso();
      if (playDate !== dateSingle) {
        return;
      }
    } else {
      if (start && playDate < start) return;
      if (end && playDate > end) return;
    }

    const song = countSongByTitle.get(record.title);
    const summaryKey = getRecordSummaryKey(record, song);
    if (isScoreMode && !SCORE_RANK_SUMMARY_OPTIONS.includes(summaryKey)) {
      return;
    }

    lampCounts[summaryKey] += 1;
  });

  return {
    axisMode: "date",
    bandTotalSongs: bands.reduce((total, band) => total + band.total, 0),
    totalSongs: Object.values(lampCounts).reduce((total, count) => total + count, 0),
    totalLabel: "総記録数",
    totalUnit: "件",
    emptyMessage: "該当する履歴がありません。",
    lampCounts,
    displayMode: isScoreMode ? "score" : "clear",
    bands,
  };
}

export function buildCatalogSummary({
  playDateAdjustedRecords,
  songStates,
  summaryBandBaseSongs,
  summaryGraphFilters,
  summaryScopeFilters,
  summaryCountFilters,
}) {
  const summarySongs = summaryBandBaseSongs.filter((entry) => matchesFiltersFor(entry, summaryScopeFilters));
  const summaryCountSongs = songStates.filter((entry) => matchesFiltersFor(entry, summaryCountFilters));

  if (summaryGraphFilters.axisMode === "date") {
    const dateSummaryBaseFilters = {
      ...summaryCountFilters,
      axisMode: "splv",
      axisValue: "",
      inf: "all",
      acdelete: "all",
      includeUnrated: "all",
      chartDifficulties: [...CHART_DIFFICULTY_OPTIONS],
      versionChartDifficulties: [...CHART_DIFFICULTY_OPTIONS],
    };
    const dateSummaryBaseSongs = summaryBandBaseSongs.filter((entry) => matchesFiltersFor(entry, dateSummaryBaseFilters));
    return buildDateSummary(playDateAdjustedRecords, dateSummaryBaseSongs, summaryCountSongs, summaryGraphFilters);
  }

  return buildSummary(
    summaryBandBaseSongs,
    summarySongs,
    summaryCountSongs,
    summaryGraphFilters.axisMode,
    summaryGraphFilters.displayMode,
  );
}
