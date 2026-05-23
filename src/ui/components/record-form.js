const MODULE_VERSION = new URL(import.meta.url).search;

const { LAMP_OPTIONS } = await import(`../../constants.js${MODULE_VERSION}`);
const { formatIsoDate, todayIso } = await import(`../../utils/date.js${MODULE_VERSION}`);
const { escapeHtml } = await import(`../../utils/html.js${MODULE_VERSION}`);
const { encodeDatasetValue } = await import(`../dataset.js${MODULE_VERSION}`);

const ENTRY_BP_INPUT_MODE_STORAGE_KEY = "dbr-entry-bp-input-mode";
export const ENTRY_BP_INPUT_MODES = new Set(["bp", "split"]);

export function loadEntryBpInputMode() {
  try {
    const mode = window.localStorage.getItem(ENTRY_BP_INPUT_MODE_STORAGE_KEY);
    return ENTRY_BP_INPUT_MODES.has(mode) ? mode : "bp";
  } catch {
    return "bp";
  }
}

export function persistEntryBpInputMode(mode) {
  try {
    window.localStorage.setItem(ENTRY_BP_INPUT_MODE_STORAGE_KEY, mode);
  } catch {}
}

function formatBp(value) {
  return value === null || value === undefined ? "-" : String(value);
}

function formatScore(value) {
  return value === null || value === undefined ? "-" : String(value);
}

export function formatBpPlaceholder(selectedSong) {
  const best = formatBp(selectedSong.bestBp);
  const latest = formatBp(selectedSong.currentBp);
  return `最小値 ${best} / 現在値 ${latest}`;
}

export function formatScorePlaceholder(selectedSong) {
  const best = formatScore(selectedSong.bestScore);
  const latest = formatScore(selectedSong.currentScore);
  return `最高値 ${best} / 現在値 ${latest}`;
}

export function renderLampOptions(select) {
  if (!(select instanceof HTMLSelectElement)) {
    return;
  }

  select.innerHTML = LAMP_OPTIONS.map((lamp) => `<option value="${escapeHtml(lamp)}">${escapeHtml(lamp)}</option>`).join("");
}

export function syncEntryBpInputMode({ panels, buttons }, mode) {
  const normalizedMode = ENTRY_BP_INPUT_MODES.has(mode) ? mode : "bp";

  panels?.forEach((panel) => {
    const active = panel.dataset.bpInputPanel === normalizedMode;
    panel.hidden = !active;
  });

  buttons?.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.bpInputMode === normalizedMode));
  });
}

export function setRecordSubmitDirty(submitButton, dirty) {
  if (submitButton instanceof HTMLButtonElement) {
    submitButton.disabled = !dirty;
  }
}

export function clearEntryBpInputs({ bpInput, badInput, poorInput }) {
  if (bpInput?.value !== "") {
    bpInput.value = "";
  }
  if (badInput?.value !== "") {
    badInput.value = "";
  }
  if (poorInput?.value !== "") {
    poorInput.value = "";
  }
}

export function parseSplitBpInputValue(input, label) {
  const rawValue = String(input?.value ?? "").trim();
  if (rawValue === "") {
    return { ok: true, value: null };
  }

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < 0) {
    return { ok: false, message: `${label}は0以上の整数で入力してください。` };
  }

  return { ok: true, value };
}

export function getEntryBpValue({ mode, bpInput, badInput, poorInput }) {
  if (mode !== "split") {
    return { ok: true, value: bpInput?.value ?? "" };
  }

  const badResult = parseSplitBpInputValue(badInput, "BAD");
  if (!badResult.ok) {
    return badResult;
  }

  const poorResult = parseSplitBpInputValue(poorInput, "POOR");
  if (!poorResult.ok) {
    return poorResult;
  }

  const hasBad = badResult.value !== null;
  const hasPoor = poorResult.value !== null;

  if (hasBad !== hasPoor) {
    return { ok: false, message: "BADとPOORは両方入力するか、両方空にしてください。" };
  }

  return {
    ok: true,
    value: hasBad && hasPoor ? badResult.value + poorResult.value : "",
  };
}

export function limitNumberInput(input, limit) {
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  const nextValue = String(input.value ?? "").replace(/\D/g, "").slice(0, limit);
  if (input.value !== nextValue) {
    input.value = nextValue;
  }
}

export function focusNextRecordFormField(event, fields) {
  if (event.key !== "Enter" || event.isComposing) {
    return false;
  }

  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
    return false;
  }

  event.preventDefault();

  const memoInput = fields.find((field) => field?.id === "memo-input");
  if (target === memoInput) {
    target.blur();
    return true;
  }

  const activeFields = fields.filter((field) => field && !field.disabled && !field.closest("[hidden]"));
  const currentIndex = activeFields.indexOf(target);
  if (currentIndex < 0) {
    return true;
  }

  const nextField = activeFields[currentIndex + 1];
  if (nextField instanceof HTMLElement) {
    nextField.focus();
    if (nextField instanceof HTMLInputElement) {
      nextField.select?.();
    }
  }

  return true;
}

export function initializeRecordForm(nodes, mode = loadEntryBpInputMode()) {
  renderLampOptions(nodes.lampInput);
  syncEntryBpInputMode({
    panels: nodes.bpInputPanels,
    buttons: nodes.bpInputModeButtons,
  }, mode);

  if (nodes.recordDate instanceof HTMLInputElement) {
    nodes.recordDate.value = formatIsoDate(todayIso());
  }
}

export function syncRecordFormWithSnapshot(nodes, snapshot, options = {}) {
  const setDirty = typeof options.setDirty === "function" ? options.setDirty : () => {};

  if (nodes.recordDate instanceof HTMLInputElement) {
    nodes.recordDate.value = formatIsoDate(todayIso());
  }

  if (snapshot.selectedSong) {
    const selectedTitle = encodeDatasetValue(snapshot.selectedSong.title);
    const selectedCatalogKey = snapshot.selectedCatalogKey ? encodeDatasetValue(snapshot.selectedCatalogKey) : "";
    const nextBpPlaceholder = formatBpPlaceholder(snapshot.selectedSong);
    const nextScorePlaceholder = formatScorePlaceholder(snapshot.selectedSong);
    const nextMemoValue = snapshot.selectedSong.note ?? "";
    const selectedSongChanged = nodes.selectedSong?.dataset.title !== selectedTitle;

    if (selectedSongChanged && nodes.selectedSong) {
      nodes.selectedSong.dataset.title = selectedTitle;
    }
    if (selectedCatalogKey && nodes.selectedSong) {
      nodes.selectedSong.dataset.catalogKey = selectedCatalogKey;
    } else if (nodes.selectedSong) {
      delete nodes.selectedSong.dataset.catalogKey;
    }

    if (nodes.lampInput?.value !== LAMP_OPTIONS[0]) {
      nodes.lampInput.value = LAMP_OPTIONS[0];
    }

    if (selectedSongChanged) {
      clearEntryBpInputs(nodes);
      if (nodes.scoreInput?.value !== "") {
        nodes.scoreInput.value = "";
      }
      setDirty(false);
    }

    if (nodes.bpInput?.placeholder !== nextBpPlaceholder) {
      nodes.bpInput.placeholder = nextBpPlaceholder;
    }
    if (nodes.scoreInput?.placeholder !== nextScorePlaceholder) {
      nodes.scoreInput.placeholder = nextScorePlaceholder;
    }
    if (nodes.memoInput?.value !== nextMemoValue) {
      nodes.memoInput.value = nextMemoValue;
    }
    return;
  }

  if (nodes.selectedSong) {
    delete nodes.selectedSong.dataset.title;
    delete nodes.selectedSong.dataset.catalogKey;
  }
  if (nodes.lampInput?.value !== LAMP_OPTIONS[0]) {
    nodes.lampInput.value = LAMP_OPTIONS[0];
  }
  clearEntryBpInputs(nodes);
  if (nodes.scoreInput?.value !== "") {
    nodes.scoreInput.value = "";
  }
  if (nodes.bpInput?.placeholder !== "BPを入力") {
    nodes.bpInput.placeholder = "BPを入力";
  }
  if (nodes.scoreInput?.placeholder !== "スコアを入力") {
    nodes.scoreInput.placeholder = "スコアを入力";
  }
  if (nodes.memoInput?.value !== "") {
    nodes.memoInput.value = "";
  }
  setDirty(false);
}
