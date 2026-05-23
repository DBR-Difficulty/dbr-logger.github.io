const MODULE_VERSION = new URL(import.meta.url).search;

const { formatIsoDate } = await import(`../../utils/date.js${MODULE_VERSION}`);

function formatBp(value) {
  return value === null || value === undefined ? "-" : String(value);
}

function formatScore(value) {
  return value === null || value === undefined ? "-" : String(value);
}

export function renderHistory(historyContainer, records, storeRef) {
  historyContainer.replaceChildren();

  if (records.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "履歴がありません。";
    row.appendChild(cell);
    historyContainer.appendChild(row);
    return;
  }

  const fragment = document.createDocumentFragment();
  records.forEach((record) => {
    const row = document.createElement("tr");
    [
      formatIsoDate(record.date),
      record.lamp,
      formatBp(record.bp),
      formatScore(record.score),
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = String(value ?? "");
      row.appendChild(cell);
    });

    const actionCell = document.createElement("td");
    const link = document.createElement("a");
    link.href = "#";
    link.className = "delete-link";
    link.dataset.recordId = String(record.id ?? "");
    link.textContent = "削除";
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const recordId = link.dataset.recordId;
      if (recordId && window.confirm("この記録を削除しますか？")) {
        const result = storeRef.deleteRecord(recordId);
        if (!result.ok) {
          window.alert(result.message);
        }
      }
    });
    actionCell.appendChild(link);
    row.appendChild(actionCell);
    fragment.appendChild(row);
  });
  historyContainer.appendChild(fragment);
}
