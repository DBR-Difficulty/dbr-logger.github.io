const MODULE_VERSION = new URL(import.meta.url).search;

const { formatIsoDate } = await import(`../../utils/date.js${MODULE_VERSION}`);
const { VERSION_BAND_LABELS } = await import(`../../state/filters.js${MODULE_VERSION}`);
const { encodeDatasetValue } = await import(`../dataset.js${MODULE_VERSION}`);

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

const getLampColor = (lamp) => LAMP_COLORS[lamp] ?? "transparent";
const getScoreRankColor = (rank) => SCORE_RANK_COLORS[rank] ?? "transparent";
const getCardLampColor = (lamp) => lamp === "NO PLAY" ? "transparent" : getLampColor(lamp);
const getCardBandColor = (song, summaryDisplayMode = "clear") => (
  summaryDisplayMode === "score"
    ? (song?.currentScore === null || song?.currentScore === undefined ? "transparent" : getScoreRankColor(song?.cardScoreFilterRank ?? song?.scoreFilterRank ?? "F"))
    : getCardLampColor(song?.bestLamp)
);

function createBadge(label, className) {
  const badge = document.createElement("span");
  badge.className = `pill ${className}`;
  badge.textContent = label;
  return badge;
}

function appendBadge(parent, label, className) {
  parent.appendChild(createBadge(label, className));
}

function appendTitleWithSuffix(parent, title, suffix) {
  parent.append(document.createTextNode(title));
  if (!suffix) {
    return;
  }

  const suffixNode = document.createElement("span");
  suffixNode.className = "song-card-title-katate";
  suffixNode.textContent = suffix;
  parent.appendChild(suffixNode);
}

function formatDifficultyLabel(song) {
  if (song.level) {
    return `☆${song.level}`;
  }

  return "未査定";
}

function formatTableDifficultyLabel(song) {
  return song.level || "未査定";
}

function formatSplvLabel(song) {
  return song.splv ? `SP☆${song.splv}` : null;
}

function formatTableSplv(song) {
  return song.splv || "-";
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

function formatKatateTitleSuffix(song) {
  if (song.katateValue === null || song.katateValue === undefined || song.katateValue === "") {
    return "";
  }

  const label = formatKatateFilterValue(song.katateValue);
  return label ? `片手☆${label}` : "";
}

function formatTableKatate(song) {
  if (song.katateValue === null || song.katateValue === undefined || song.katateValue === "") {
    return "-";
  }

  return formatKatateFilterValue(song.katateValue) || "-";
}

function formatTableVersion(song) {
  const normalized = String(song?.version ?? "").trim();
  return (VERSION_BAND_LABELS.get(normalized) ?? normalized) || "-";
}

function formatTableChartDifficulty(song) {
  const match = String(song?.title ?? "").match(/\(([BNHAL])\)$/);
  return match ? match[1] : "-";
}

function formatBpmTitleSuffix(song) {
  const bpm = String(song?.bpm ?? "").trim();
  if (!bpm) {
    return "";
  }

  return `BPM${bpm}`;
}

function formatSortTitleSuffix(song, sortMode, axisMode = "") {
  const suffixes = [];

  if (sortMode === "katate") {
    suffixes.push(formatKatateTitleSuffix(song));
  }

  if (sortMode === "bpm") {
    suffixes.push(formatBpmTitleSuffix(song));
  }

  if (axisMode === "katate" && sortMode !== "katate") {
    suffixes.push(formatKatateTitleSuffix(song));
  }

  if (axisMode === "bpm" && sortMode !== "bpm") {
    suffixes.push(formatBpmTitleSuffix(song));
  }

  return suffixes.filter(Boolean).map((suffix) => `(${suffix})`).join(" ");
}

function formatRecommendDisplay(recommend) {
  const normalized = String(recommend ?? "").trim();
  return normalized || "－";
}

function formatSongMemoDisplay(song) {
  const recommend = formatRecommendDisplay(song?.recommend);
  const memo = String(song?.note ?? "").replace(/\s+/g, " ").trim();

  if (!memo) {
    return recommend;
  }

  return `${recommend}：${memo}`;
}

function formatBp(value) {
  return value === null || value === undefined ? "-" : String(value);
}

function formatScoreRankDisplay(value) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

function formatTableBpPair(song) {
  return `${formatBp(song.bestBp)}/${formatBp(song.currentBp)}`;
}

function formatTableScorePair(song) {
  const bestScoreLabel = formatScoreRankDisplay(song.bestScoreLabel);
  const currentScoreLabel = formatScoreRankDisplay(song.currentScoreLabel);
  return bestScoreLabel === "※" ? "※" : `${bestScoreLabel}/${currentScoreLabel}`;
}

function formatDate(value) {
  return value ? formatIsoDate(value).slice(5) : "-";
}

function getPrimaryResultBadge(song) {
  const badges = [];
  if (song?.displayMode !== "score") {
    badges.push([song.bestLamp, "pill-lamp"]);
  }
  if (song?.displayMode === "score" || song?.displayMode === "all") {
    badges.push([formatScoreRankDisplay(song.scoreRank), "pill-lamp"]);
  }
  return badges;
}

function moveFirstItemToFront(items, target) {
  const index = items.indexOf(target);
  if (index <= 0) {
    return items;
  }

  return [target, ...items.slice(0, index), ...items.slice(index + 1)];
}

function getSupplementalBadges(song, sortMode = "", summaryDisplayMode = "clear") {
  const bpBadge = song?.displayMode !== "score"
    ? [`BP ${formatBp(song.bestBp)}/${formatBp(song.currentBp)}`, "pill-neutral"]
    : null;
  const scoreBadge = song?.displayMode === "score" || song?.displayMode === "all"
    ? (() => {
        const bestScoreLabel = formatScoreRankDisplay(song.bestScoreLabel);
        const currentScoreLabel = formatScoreRankDisplay(song.currentScoreLabel);
        return [bestScoreLabel === "※" ? "※" : `${bestScoreLabel}/${currentScoreLabel}`, "pill-neutral"];
      })()
    : null;
  const dateBadge = [song.latestDate ? formatIsoDate(song.latestDate).slice(5) : "履歴なし", "pill-neutral"];
  const historyBadge = song.entryCount > 0
    ? [`履歴 ${song.entryCount} 件`, "pill-neutral"]
    : null;
  const defaultBadges = summaryDisplayMode === "score"
    ? [scoreBadge, bpBadge, dateBadge, historyBadge]
    : [bpBadge, scoreBadge, dateBadge, historyBadge];
  let badges = defaultBadges;

  if (sortMode === "bestBp" || sortMode === "latestBp") {
    badges = moveFirstItemToFront(defaultBadges, bpBadge);
  } else if (sortMode === "bestScore" || sortMode === "latestScore") {
    badges = moveFirstItemToFront(defaultBadges, scoreBadge);
  } else if (sortMode === "latest") {
    badges = moveFirstItemToFront(defaultBadges, dateBadge);
  } else if (sortMode === "entryCount") {
    badges = moveFirstItemToFront(defaultBadges, historyBadge || dateBadge);
  }

  return badges.filter(Boolean);
}

function getBpOrScoreMetaTextBySort(song, sortMode = "", summaryDisplayMode = "clear") {
  const bpText = song?.displayMode !== "score"
    ? `BP ${formatBp(song.bestBp)}/${formatBp(song.currentBp)}`
    : "";
  const scoreText = song?.displayMode === "score" || song?.displayMode === "all"
    ? (() => {
        const bestScoreLabel = formatScoreRankDisplay(song.bestScoreLabel);
        const currentScoreLabel = formatScoreRankDisplay(song.currentScoreLabel);
        return bestScoreLabel === "※" ? "※" : `${bestScoreLabel}/${currentScoreLabel}`;
      })()
    : "";
  const dateText = song.latestDate ? formatIsoDate(song.latestDate).slice(5) : "履歴なし";
  const historyText = song.entryCount > 0 ? `履歴 ${song.entryCount} 件` : "";
  const defaultValues = summaryDisplayMode === "score"
    ? [scoreText, bpText, dateText, historyText]
    : [bpText, scoreText, dateText, historyText];
  const values = sortMode === "bestBp" || sortMode === "latestBp"
    ? moveFirstItemToFront(defaultValues, bpText)
    : sortMode === "bestScore" || sortMode === "latestScore"
      ? moveFirstItemToFront(defaultValues, scoreText)
      : sortMode === "latest"
        ? moveFirstItemToFront(defaultValues, dateText)
        : sortMode === "entryCount"
          ? moveFirstItemToFront(defaultValues, historyText || dateText)
          : defaultValues;

  return values.filter(Boolean).join(", ");
}

export function renderSelectedSong(selectedSongContainer, selectedSong, songs, options = {}) {
  selectedSongContainer.classList.remove("is-proposed");
  selectedSongContainer.style.removeProperty("--card-lamp-color");
  selectedSongContainer.replaceChildren();

  if (!selectedSong || songs.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "表示できる曲がありません。";
    selectedSongContainer.appendChild(empty);
    return;
  }

  selectedSongContainer.classList.toggle("is-proposed", Boolean(selectedSong.isProposed));
  selectedSongContainer.style.setProperty("--card-lamp-color", getCardBandColor(selectedSong, options.summaryDisplayMode));

  const katateTitleSuffix = formatSortTitleSuffix(selectedSong, options.sortMode, options.axisMode);

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow selected-song-eyebrow";
  eyebrow.textContent = "Selected Song";

  const topMeta = document.createElement("div");
  topMeta.className = "selected-song-meta";
  const topRow = document.createElement("div");
  topRow.className = "selected-song-meta-row";
  if (selectedSong.isProposed) {
    appendBadge(topRow, "新規提案中", "pill-proposed");
  }
  appendBadge(topRow, formatDifficultyLabel(selectedSong), "pill-level");
  const splvLabel = formatSplvLabel(selectedSong);
  if (splvLabel) {
    appendBadge(topRow, splvLabel, "pill-splv");
  }
  getPrimaryResultBadge(selectedSong).forEach(([label, className]) => appendBadge(topRow, label, className));
  topMeta.appendChild(topRow);

  const title = document.createElement("h3");
  title.className = "selected-song-title";
  appendTitleWithSuffix(title, selectedSong.title, katateTitleSuffix);

  const note = document.createElement("p");
  note.className = "selected-song-note";
  note.textContent = formatSongMemoDisplay(selectedSong);

  const bottomMeta = document.createElement("div");
  bottomMeta.className = "selected-song-meta";
  const bottomRow = document.createElement("div");
  bottomRow.className = "selected-song-meta-row";
  getSupplementalBadges(selectedSong, options.sortMode, options.summaryDisplayMode)
    .forEach(([label, className]) => appendBadge(bottomRow, label, className));
  bottomMeta.appendChild(bottomRow);

  selectedSongContainer.append(eyebrow, topMeta, title, note, bottomMeta);
}

function commitCatalogChildren(catalogContainer, payload) {
  const previousHeight = catalogContainer.getBoundingClientRect().height;
  if (previousHeight > 0) {
    catalogContainer.style.minHeight = `${previousHeight}px`;
  }
  try {
    catalogContainer.replaceChildren(payload);
  } finally {
    window.requestAnimationFrame(() => {
      catalogContainer.style.minHeight = "";
    });
  }
}

function appendTableCell(row, text, className = "") {
  const cell = document.createElement("td");
  if (className) {
    cell.className = className;
  }
  cell.textContent = text;
  row.appendChild(cell);
  return cell;
}

function appendLampBandCell(row) {
  const cell = document.createElement("td");
  cell.className = "song-table-lamp-band-cell";
  cell.setAttribute("aria-hidden", "true");
  row.appendChild(cell);
  return cell;
}

const TABLE_COLUMNS = [
  { label: "DBR", fullLabel: "DBRLv.", sortMode: "level", className: "song-table-col-level" },
  { label: "SP", fullLabel: "SPLv.", sortMode: "splv", className: "song-table-col-splv" },
  { label: "片手", fullLabel: "片手Lv.", sortMode: "katate", className: "song-table-col-katate" },
  { label: "ver", fullLabel: "バージョン", sortMode: "version", className: "song-table-col-version" },
  { label: "diff", fullLabel: "譜面難易度", sortMode: "chartDifficulty", className: "song-table-col-chart-difficulty" },
  { label: "title", fullLabel: "曲名", sortMode: "title", className: "song-table-col-title" },
  { label: "BPM", fullLabel: "BPM", sortMode: "bpm", className: "song-table-col-bpm" },
  { label: "rec", fullLabel: "おすすめ度", sortMode: "recommend", className: "song-table-col-recommend" },
  { label: "lamp", fullLabel: "クリアランプ", sortMode: "clear", className: "song-table-col-lamp" },
  {
    label: "BP",
    fullLabel: "BP",
    sortMode: "bestBp",
    sortModes: ["bestBp", "latestBp"],
    className: "song-table-col-bp",
  },
  {
    label: "score",
    fullLabel: "スコア",
    sortMode: "bestScore",
    sortModes: ["bestScore", "latestScore"],
    className: "song-table-col-score",
  },
  { label: "last", fullLabel: "最終プレー", sortMode: "latest", className: "song-table-col-date" },
  { label: "plays", fullLabel: "履歴件数", sortMode: "entryCount", className: "song-table-col-count" },
];

function getTableColumnSortState(column, sortMode, sortDirection) {
  const sortModes = column.sortModes ?? [column.sortMode];
  if (!sortModes.includes(sortMode)) {
    return null;
  }

  const sortModeIndex = sortModes.indexOf(sortMode);
  return {
    sortModeIndex,
    direction: sortDirection === "desc" ? "desc" : "asc",
  };
}

function formatTableColumnLabel(column, sortState) {
  return column.label;
}

function formatTableColumnSortLabel(column, sortState) {
  if (!sortState || !column.sortModes) {
    return `${column.fullLabel}で並び替え`;
  }

  const directionLabel = sortState.direction === "desc" ? "降順" : "昇順";
  const primaryLabels = column.sortModes[0] === "bestBp"
    ? ["最小BP", "最新BP"]
    : ["最高スコア", "最新スコア"];
  return `${column.fullLabel}: ${primaryLabels[sortState.sortModeIndex]} ${directionLabel}`;
}

function createTableSortIndicator(direction) {
  const indicator = document.createElement("span");
  indicator.className = "song-table-sort-indicator";
  indicator.textContent = direction === "desc" ? "▼" : "▲";
  return indicator;
}

function renderCatalogTable(songs, selectedTitle, options = {}) {
  const wrap = document.createElement("div");
  wrap.className = "song-table-wrap";

  const table = document.createElement("table");
  table.className = "song-table";

  const headerRow = document.createElement("tr");
  const bandHeader = document.createElement("th");
  bandHeader.className = "song-table-lamp-band-header";
  bandHeader.scope = "col";
  bandHeader.setAttribute("aria-hidden", "true");
  headerRow.appendChild(bandHeader);

  TABLE_COLUMNS.forEach((column) => {
    const sortState = getTableColumnSortState(column, options.sortMode, options.sortDirection);
    const isActiveSort = Boolean(sortState);
    const header = document.createElement("th");
    header.className = column.className;
    header.scope = "col";
    if (isActiveSort) {
      header.classList.add("is-active-sort");
      header.setAttribute("aria-sort", options.sortDirection === "desc" ? "descending" : "ascending");
    }

    const button = document.createElement("button");
    button.className = "song-table-sort-button";
    if (isActiveSort) {
      button.classList.add("is-active");
    }
    button.type = "button";
    button.dataset.tableSortMode = column.sortMode;
    const label = document.createElement("span");
    label.className = "song-table-sort-label";
    label.textContent = formatTableColumnLabel(column, sortState);
    button.appendChild(label);
    button.title = formatTableColumnSortLabel(column, sortState);
    button.setAttribute("aria-label", formatTableColumnSortLabel(column, sortState));
    if (isActiveSort && column.sortModes) {
      const group = document.createElement("span");
      group.className = "song-table-sort-composite";
      const indicator = createTableSortIndicator(options.sortDirection);
      if (sortState.sortModeIndex === 0) {
        group.append(indicator, document.createTextNode("/"));
      } else {
        group.append(document.createTextNode("/"), indicator);
      }
      button.appendChild(group);
    } else if (isActiveSort) {
      button.appendChild(createTableSortIndicator(options.sortDirection));
    }

    header.appendChild(button);
    headerRow.appendChild(header);
  });

  const thead = document.createElement("thead");
  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");

  songs.forEach((song) => {
    const catalogItemKey = song.catalogItemKey || `title:${song.title}`;
    const selectedClass = options.selectedCatalogKey
      ? catalogItemKey === options.selectedCatalogKey
      : song.title === selectedTitle;
    const encodedTitle = encodeDatasetValue(song.title);
    const encodedCatalogItemKey = encodeDatasetValue(catalogItemKey);
    const lampColor = getCardBandColor(song, options.summaryDisplayMode);

    const row = document.createElement("tr");
    row.className = "song-card song-table-row";
    if (selectedClass) {
      row.classList.add("is-selected");
    }
    if (song.isProposed) {
      row.classList.add("is-proposed");
    }
    if (song.isDeletedRecordScopedCard) {
      row.classList.add("is-deleted-record");
    }
    row.tabIndex = 0;
    row.dataset.title = encodedTitle;
    row.dataset.catalogKey = encodedCatalogItemKey;
    row.style.setProperty("--card-lamp-color", lampColor);

    appendLampBandCell(row);
    appendTableCell(row, formatTableDifficultyLabel(song), "song-table-number song-table-col-level");
    appendTableCell(row, formatTableSplv(song), "song-table-number song-table-col-splv");
    appendTableCell(row, formatTableKatate(song), "song-table-number song-table-col-katate");
    appendTableCell(row, formatTableVersion(song), "song-table-version song-table-col-version");
    appendTableCell(row, formatTableChartDifficulty(song), "song-table-number song-table-col-chart-difficulty");

    const titleCell = appendTableCell(row, "", "song-table-title-cell song-table-col-title");
    const titleText = document.createElement("span");
    titleText.className = "song-table-title";
    titleText.textContent = song.title;
    titleCell.appendChild(titleText);
    const memoText = String(song?.note ?? "").replace(/\s+/g, " ").trim();
    if (memoText) {
      const memo = document.createElement("span");
      memo.className = "song-table-title-memo";
      memo.textContent = memoText;
      titleCell.appendChild(memo);
    }

    appendTableCell(row, String(song?.bpm ?? "").trim() || "-", "song-table-number song-table-col-bpm");
    appendTableCell(row, formatRecommendDisplay(song.recommend), "song-table-recommend song-table-col-recommend");
    appendTableCell(row, song.bestLamp || "NO PLAY", "song-table-lamp song-table-col-lamp");
    appendTableCell(row, formatTableBpPair(song), "song-table-number song-table-col-bp");
    appendTableCell(row, formatTableScorePair(song), "song-table-number song-table-col-score");
    appendTableCell(row, formatDate(song.latestDate), "song-table-number song-table-col-date");
    appendTableCell(row, String(song.entryCount ?? 0), "song-table-number song-table-col-count");

    tbody.appendChild(row);
  });

  table.append(thead, tbody);
  wrap.appendChild(table);
  return wrap;
}

export function renderCatalog(catalogContainer, songs, selectedTitle, options = {}) {
  const previousTableScrollLeft = catalogContainer.querySelector(".song-table-wrap")?.scrollLeft ?? 0;
  catalogContainer.classList.toggle("is-list-view", options.viewMode === "list");
  catalogContainer.classList.toggle("is-table-view", options.viewMode === "table");

  if (songs.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "該当する曲がありません。";
    commitCatalogChildren(catalogContainer, empty);
    return;
  }

  if (options.viewMode === "table") {
    const tableWrap = renderCatalogTable(songs, selectedTitle, options);
    commitCatalogChildren(catalogContainer, tableWrap);
    window.requestAnimationFrame(() => {
      const levelHeader = tableWrap.querySelector("th.song-table-col-level");
      if (levelHeader) {
        tableWrap.style.setProperty("--song-table-level-width", `${levelHeader.getBoundingClientRect().width}px`);
      }
      tableWrap.scrollLeft = previousTableScrollLeft;
    });
    return;
  }

  const fragment = document.createDocumentFragment();
  songs.forEach((song) => {
    const catalogItemKey = song.catalogItemKey || `title:${song.title}`;
    const selectedClass = options.selectedCatalogKey
      ? catalogItemKey === options.selectedCatalogKey
      : song.title === selectedTitle;
    const encodedTitle = encodeDatasetValue(song.title);
    const encodedCatalogItemKey = encodeDatasetValue(catalogItemKey);
    const lampColor = getCardBandColor(song, options.summaryDisplayMode);
    const katateTitleSuffix = formatSortTitleSuffix(song, options.sortMode, options.axisMode);

    const button = document.createElement("button");
    button.className = "song-card";
    if (selectedClass) {
      button.classList.add("is-selected");
    }
    if (song.isProposed) {
      button.classList.add("is-proposed");
    }
    if (song.isDeletedRecordScopedCard) {
      button.classList.add("is-deleted-record");
    }
    button.type = "button";
    button.dataset.title = encodedTitle;
    button.dataset.catalogKey = encodedCatalogItemKey;
    button.style.setProperty("--card-lamp-color", lampColor);

    if (options.viewMode === "list") {
      const listMetaCore = getBpOrScoreMetaTextBySort(song, options.sortMode, options.summaryDisplayMode);
      const splvMeta = formatSplvLabel(song);
      const listMetaText = [splvMeta, listMetaCore].filter(Boolean).join(", ");

      const title = document.createElement("p");
      title.className = "song-card-title";
      const tags = document.createElement("span");
      tags.className = "song-card-list-title-tags";
      appendBadge(tags, formatDifficultyLabel(song), "pill-level");
      const titleText = document.createElement("span");
      titleText.className = "song-card-list-title-text";
      appendTitleWithSuffix(titleText, song.title, katateTitleSuffix);
      title.append(tags, titleText);

      const note = document.createElement("p");
      note.className = "song-card-note";
      const noteText = document.createElement("span");
      noteText.textContent = formatSongMemoDisplay(song);
      const metaText = document.createElement("span");
      metaText.className = "song-card-list-meta-text";
      metaText.textContent = listMetaText;
      note.append(noteText, metaText);

      button.append(title, note);
      fragment.appendChild(button);
      return;
    }

    const topMeta = document.createElement("div");
    topMeta.className = "song-card-meta";
    const topRow = document.createElement("div");
    topRow.className = "song-card-meta-row";
    if (song.isProposed) {
      appendBadge(topRow, "新規提案中", "pill-proposed");
    }
    appendBadge(topRow, formatDifficultyLabel(song), "pill-level");
    const splvLabel = formatSplvLabel(song);
    if (splvLabel) {
      appendBadge(topRow, splvLabel, "pill-splv");
    }
    getPrimaryResultBadge(song).forEach(([label, className]) => appendBadge(topRow, label, className));
    topMeta.appendChild(topRow);

    const title = document.createElement("p");
    title.className = "song-card-title";
    appendTitleWithSuffix(title, song.title, katateTitleSuffix);

    const note = document.createElement("p");
    note.className = "song-card-note";
    note.textContent = formatSongMemoDisplay(song);

    const bottomMeta = document.createElement("div");
    bottomMeta.className = "song-card-meta";
    const bottomRow = document.createElement("div");
    bottomRow.className = "song-card-meta-row";
    getSupplementalBadges(song, options.sortMode, options.summaryDisplayMode)
      .forEach(([label, className]) => appendBadge(bottomRow, label, className));
    bottomMeta.appendChild(bottomRow);

    button.append(topMeta, title, note, bottomMeta);
    fragment.appendChild(button);
  });
  commitCatalogChildren(catalogContainer, fragment);
}
