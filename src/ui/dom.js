export function collectRendererNodes(documentRef = document) {
  return {
    summaryPanel: documentRef.querySelector("#summary-cards")?.closest(".panel"),
    summary: documentRef.querySelector("#summary-cards"),
    summaryDisplayField: documentRef.querySelector("#summary-display-field"),
    summaryDisplaySelect: documentRef.querySelector("#summary-display-select"),
    summaryFiltersToggle: documentRef.querySelector("#summary-filters-toggle"),
    summaryFiltersPanel: documentRef.querySelector("#summary-filters-panel"),
    floatingAxisFilter: documentRef.querySelector("#floating-axis-filter"),
    catalogPanel: documentRef.querySelector("#song-catalog")?.closest(".panel"),
    catalogSortSelect: documentRef.querySelector("#catalog-sort-select"),
    catalogViewToggle: documentRef.querySelector("#catalog-view-toggle"),
    catalogMeta: documentRef.querySelector("#catalog-meta"),
    catalogPaginationTop: documentRef.querySelector("#catalog-pagination-top"),
    catalogPaginationBottom: documentRef.querySelector("#catalog-pagination-bottom"),
    catalog: documentRef.querySelector("#song-catalog"),
    selectedWorkspace: documentRef.querySelector("#selected-workspace"),
    selectedWorkspaceCloseButton: documentRef.querySelector("#selected-workspace-close"),
    selectedWorkspaceFormCloseButton: documentRef.querySelector("#selected-workspace-form-close"),
    analyticsPanel: documentRef.querySelector(".analytics-panel"),
    themeToggleButton: documentRef.querySelector("#theme-toggle-button"),
    selectedSong: documentRef.querySelector("#selected-song"),
    recordForm: documentRef.querySelector("#record-form"),
    recordSubmitButton: documentRef.querySelector("#record-submit-button"),
    recordDate: documentRef.querySelector("#record-date"),
    lampInput: documentRef.querySelector("#lamp-input"),
    bpInput: documentRef.querySelector("#bp-input"),
    badInput: documentRef.querySelector("#bad-input"),
    poorInput: documentRef.querySelector("#poor-input"),
    bpInputPanels: documentRef.querySelectorAll("[data-bp-input-panel]"),
    bpInputModeButtons: documentRef.querySelectorAll("[data-bp-input-mode]"),
    scoreInput: documentRef.querySelector("#score-input"),
    memoInput: documentRef.querySelector("#memo-input"),
    difficultyImportButton: documentRef.querySelector("#difficulty-import-button"),
    csvImportButton: documentRef.querySelector("#csv-import-button"),
    importButton: documentRef.querySelector("#import-button"),
    exportButton: documentRef.querySelector("#export-button"),
    csvExportButton: documentRef.querySelector("#csv-export-button"),
    clearAllButton: documentRef.querySelector("#clear-all-button"),
    csvImportFileInput: documentRef.querySelector("#csv-import-file-input"),
    importFileInput: documentRef.querySelector("#import-file-input"),
    chart: documentRef.querySelector("#chart-container"),
    scoreChart: documentRef.querySelector("#score-chart-container"),
    history: documentRef.querySelector("#history-body"),
    sendJsonToIrTestButton: documentRef.querySelector("#send-json-to-ir-test"),
  };
}

export function initializeRendererNodeClasses(nodes) {
  nodes.summaryPanel?.classList.add("summary-overview-panel");
}

export function syncDifficultyImportButton(button, shouldHighlight) {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  button.classList.toggle("button-primary", shouldHighlight);
  button.classList.toggle("button-secondary", !shouldHighlight);
  button.classList.toggle("is-difficulty-stale", shouldHighlight);
}

export function syncThemeToggleButton(button, theme) {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const isDark = theme === "dark";
  button.innerHTML = isDark
    ? `
      <span class="theme-toggle-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <circle cx="12" cy="12" r="4.25" fill="none" stroke="currentColor" stroke-width="1.8"></circle>
          <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8">
            <path d="M12 1.75v2.2"></path>
            <path d="M12 20.05v2.2"></path>
            <path d="M4.95 4.95l1.56 1.56"></path>
            <path d="M17.49 17.49l1.56 1.56"></path>
            <path d="M1.75 12h2.2"></path>
            <path d="M20.05 12h2.2"></path>
            <path d="M4.95 19.05l1.56-1.56"></path>
            <path d="M17.49 6.51l1.56-1.56"></path>
          </g>
        </svg>
      </span>
    `
    : `
      <span class="theme-toggle-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path
            d="M21 12.8A8.9 8.9 0 1 1 11.2 3a7.2 7.2 0 0 0 9.8 9.8Z"
            fill="none"
            stroke="currentColor"
            stroke-linejoin="round"
            stroke-width="1.8"
          ></path>
        </svg>
      </span>
    `;
  button.setAttribute("aria-label", isDark ? "ライトテーマに切り替え" : "ダークテーマに切り替え");
  button.setAttribute("aria-pressed", String(isDark));
  button.title = isDark ? "ライトテーマに切り替え" : "ダークテーマに切り替え";
}

export function updateSliderFill(slider) {
  if (!(slider instanceof HTMLInputElement) || slider.type !== "range") {
    return;
  }

  const min = Number(slider.min || 0);
  const max = Number(slider.max || 100);
  const value = Number(slider.value || min);
  const ratio = max <= min ? 0 : (value - min) / (max - min);
  const percent = Math.max(0, Math.min(ratio, 1)) * 100;
  slider.style.setProperty("--slider-fill", `${percent}%`);
}

export function setButtonLoading(button, isLoading, loadingText = "読み込み中...") {
  if (!button) {
    return;
  }

  if (isLoading) {
    if (!("originalText" in button.dataset)) {
      button.dataset.originalText = button.textContent ?? "";
    }

    button.disabled = true;
    button.textContent = loadingText;
    button.classList.add("is-busy");
    return;
  }

  button.disabled = false;
  button.textContent = button.dataset.originalText || button.textContent;
  button.classList.remove("is-busy");
  delete button.dataset.originalText;
}

export function lockHeroButtonsExcept(activeButton, documentRef = document) {
  documentRef.querySelectorAll(".hero-actions .button").forEach((button) => {
    if (button.id === "theme-toggle-button") {
      return;
    }

    if (button === activeButton) {
      return;
    }

    if ("disabled" in button) {
      button.disabled = true;
    }

    button.classList.add("is-locked");
    button.setAttribute("aria-disabled", "true");
  });
}

export function clearHeroButtonStates(documentRef = document) {
  documentRef.querySelectorAll(".hero-actions .button").forEach((button) => {
    if ("disabled" in button) {
      button.disabled = false;
    }

    button.classList.remove("is-busy", "is-locked");
    button.removeAttribute("aria-disabled");

    if ("originalText" in button.dataset) {
      button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  });
}
