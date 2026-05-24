const MODULE_VERSION = new URL(import.meta.url).search;

const { todayIso } = await import(`../../utils/date.js${MODULE_VERSION}`);

const DBR_IR_IMPORT_TEST_URL = "https://dbr-difficulty.github.io/dbr_ir_from_logger.html";
const DBR_IR_IMPORT_TEST_ORIGIN = "https://dbr-difficulty.github.io";

const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
const FILE_SIZE_LIMIT_MESSAGE = "ファイルサイズが大きすぎます。5MB以下のCSV/JSONファイルを選択してください。";

function isImportFileSizeOk(file) {
  return Number.isFinite(file?.size) && file.size <= MAX_IMPORT_FILE_BYTES;
}

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

function formatExportDateStamp() {
  return todayIso().replaceAll("-", "");
}

export function bindIoHandlers({
  nodes,
  store,
  setButtonLoading,
  lockHeroButtonsExcept,
  clearHeroButtonStates,
}) {
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
      window.alert(`難易度表を読み込みました。\n曲数: ${result.titleCount}`);
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

    if (!isImportFileSizeOk(file)) {
      window.alert(FILE_SIZE_LIMIT_MESSAGE);
      nodes.csvImportFileInput.value = "";
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

    if (!isImportFileSizeOk(file)) {
      window.alert(FILE_SIZE_LIMIT_MESSAGE);
      nodes.importFileInput.value = "";
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
}
