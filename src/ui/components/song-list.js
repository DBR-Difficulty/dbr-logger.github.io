const MODULE_VERSION = new URL(import.meta.url).search;

const { formatIsoDate } = await import(`../../utils/date.js${MODULE_VERSION}`);
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

const getLampColor = (lamp) => LAMP_COLORS[lamp] ?? "transparent";
const getScoreRankColor = (rank) => SCORE_RANK_COLORS[rank] ?? "transparent";
const getCardLampColor = (lamp) => lamp === "NO PLAY" ? "transparent" : getLampColor(lamp);
const getCardBandColor = (song, summaryDisplayMode = "clear") => (
  summaryDisplayMode === "score"
    ? (song?.currentScore === null || song?.currentScore === undefined ? "transparent" : getScoreRankColor(song?.cardScoreFilterRank ?? song?.scoreFilterRank ?? "F"))
    : getCardLampColor(song?.bestLamp)
);

function badge(label, className) {
  return `<span class="pill ${className}">${escapeHtml(label)}</span>`;
}

function formatDifficultyLabel(song) {
  if (song.level) {
    return `☆${song.level}`;
  }

  return "未査定";
}

function formatSplvLabel(song) {
  return song.splv ? `SP☆${song.splv}` : null;
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

function getPrimaryResultBadge(song) {
  const lampBadge = song?.displayMode !== "score"
    ? badge(song.bestLamp, "pill-lamp")
    : "";
  const scoreBadge = song?.displayMode === "score" || song?.displayMode === "all"
    ? badge(formatScoreRankDisplay(song.scoreRank), "pill-lamp")
    : "";
  return [lampBadge, scoreBadge].filter(Boolean).join("");
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
    ? badge(`BP ${formatBp(song.bestBp)}/${formatBp(song.currentBp)}`, "pill-neutral")
    : "";
  const scoreBadge = song?.displayMode === "score" || song?.displayMode === "all"
    ? (() => {
        const bestScoreLabel = formatScoreRankDisplay(song.bestScoreLabel);
        const currentScoreLabel = formatScoreRankDisplay(song.currentScoreLabel);
        return badge(bestScoreLabel === "※" ? "※" : `${bestScoreLabel}/${currentScoreLabel}`, "pill-neutral");
      })()
    : "";
  const dateBadge = badge(song.latestDate ? formatIsoDate(song.latestDate).slice(5) : "履歴なし", "pill-neutral");
  const historyBadge = song.entryCount > 0
    ? badge(`履歴 ${song.entryCount} 件`, "pill-neutral")
    : "";
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

  return badges.filter(Boolean).join("");
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

  if (!selectedSong || songs.length === 0) {
    selectedSongContainer.innerHTML = '<div class="empty-state">表示できる曲がありません。</div>';
    return;
  }

  selectedSongContainer.classList.toggle("is-proposed", Boolean(selectedSong.isProposed));
  selectedSongContainer.style.setProperty("--card-lamp-color", getCardBandColor(selectedSong, options.summaryDisplayMode));

  const historyCountBadge = selectedSong.entryCount > 0
    ? badge(`履歴 ${selectedSong.entryCount} 件`, "pill-neutral")
    : "";
  const katateTitleSuffix = formatSortTitleSuffix(selectedSong, options.sortMode, options.axisMode);
  const katateTitleSuffixHtml = katateTitleSuffix
    ? `<span class="song-card-title-katate">${escapeHtml(katateTitleSuffix)}</span>`
    : "";

  selectedSongContainer.innerHTML = `
    <p class="eyebrow selected-song-eyebrow">Selected Song</p>
    <div class="selected-song-meta">
      <div class="selected-song-meta-row">
        ${selectedSong.isProposed ? badge("新規提案中", "pill-proposed") : ""}
        ${badge(formatDifficultyLabel(selectedSong), "pill-level")}
        ${formatSplvLabel(selectedSong) ? badge(formatSplvLabel(selectedSong), "pill-splv") : ""}
        ${getPrimaryResultBadge(selectedSong)}
      </div>
    </div>
    <h3 class="selected-song-title">${escapeHtml(selectedSong.title)}${katateTitleSuffixHtml}</h3>
    <p class="selected-song-note">${escapeHtml(formatSongMemoDisplay(selectedSong))}</p>
    <div class="selected-song-meta">
      <div class="selected-song-meta-row">
        ${getSupplementalBadges(selectedSong, options.sortMode, options.summaryDisplayMode)}
      </div>
    </div>
  `;
}

export function renderCatalog(catalogContainer, songs, selectedTitle, options = {}) {
  catalogContainer.classList.toggle("is-list-view", options.viewMode === "list");

  if (songs.length === 0) {
    catalogContainer.innerHTML = '<div class="empty-state">該当する曲がありません。</div>';
    return;
  }

  catalogContainer.innerHTML = songs.map((song) => {
    const catalogItemKey = song.catalogItemKey || `title:${song.title}`;
    const selectedClass = options.selectedCatalogKey
      ? (catalogItemKey === options.selectedCatalogKey ? "is-selected" : "")
      : (song.title === selectedTitle ? "is-selected" : "");
    const proposedClass = song.isProposed ? "is-proposed" : "";
    const deletedRecordClass = song.isDeletedRecordScopedCard ? "is-deleted-record" : "";
    const encodedTitle = encodeURIComponent(song.title);
    const encodedCatalogItemKey = encodeURIComponent(catalogItemKey);
    const lampColor = getCardBandColor(song, options.summaryDisplayMode);
    const historyCountBadge = song.entryCount > 0
      ? badge(`履歴 ${song.entryCount} 件`, "pill-neutral")
      : "";
    const katateTitleSuffix = formatSortTitleSuffix(song, options.sortMode, options.axisMode);
    const katateTitleSuffixHtml = katateTitleSuffix
      ? `<span class="song-card-title-katate">${escapeHtml(katateTitleSuffix)}</span>`
      : "";

    if (options.viewMode === "list") {
      const listMetaCore = getBpOrScoreMetaTextBySort(song, options.sortMode, options.summaryDisplayMode);
      const splvMeta = formatSplvLabel(song);
      const listMetaText = [splvMeta, listMetaCore].filter(Boolean).join(", ");

      return `
        <button class="song-card ${selectedClass} ${proposedClass} ${deletedRecordClass}" type="button" data-title="${encodedTitle}" data-catalog-key="${encodedCatalogItemKey}" style="--card-lamp-color:${escapeHtml(lampColor)}">
          <p class="song-card-title">
            <span class="song-card-list-title-tags">
              ${badge(formatDifficultyLabel(song), "pill-level")}
            </span>
            <span class="song-card-list-title-text">${escapeHtml(song.title)}${katateTitleSuffixHtml}</span>
          </p>
          <p class="song-card-note">
            <span>${escapeHtml(formatSongMemoDisplay(song))}</span>
            <span class="song-card-list-meta-text">${escapeHtml(listMetaText)}</span>
          </p>
        </button>
      `;
    }

    return `
      <button class="song-card ${selectedClass} ${proposedClass} ${deletedRecordClass}" type="button" data-title="${encodedTitle}" data-catalog-key="${encodedCatalogItemKey}" style="--card-lamp-color:${escapeHtml(lampColor)}">
        <div class="song-card-meta">
          <div class="song-card-meta-row">
            ${song.isProposed ? badge("新規提案中", "pill-proposed") : ""}
            ${badge(formatDifficultyLabel(song), "pill-level")}
            ${formatSplvLabel(song) ? badge(formatSplvLabel(song), "pill-splv") : ""}
            ${getPrimaryResultBadge(song)}
          </div>
        </div>
        <p class="song-card-title">${escapeHtml(song.title)}${katateTitleSuffixHtml}</p>
        <p class="song-card-note">${escapeHtml(formatSongMemoDisplay(song))}</p>
        <div class="song-card-meta">
          <div class="song-card-meta-row">
            ${getSupplementalBadges(song, options.sortMode, options.summaryDisplayMode)}
          </div>
        </div>
      </button>
    `;
  }).join("");
}
