const MODULE_VERSION = new URL(import.meta.url).search;

const { formatIsoDate } = await import(`../../utils/date.js${MODULE_VERSION}`);
const { escapeHtml } = await import(`../../utils/html.js${MODULE_VERSION}`);

function formatBp(value) {
  return value === null || value === undefined ? "-" : String(value);
}

function formatScore(value) {
  return value === null || value === undefined ? "-" : String(value);
}

export function renderHistory(historyContainer, records, storeRef) {
  if (records.length === 0) {
    historyContainer.innerHTML = '<tr><td colspan="5">履歴がありません。</td></tr>';
    return;
  }

  historyContainer.innerHTML = records.map((record) => `
    <tr>
      <td>${escapeHtml(formatIsoDate(record.date))}</td>
      <td>${escapeHtml(record.lamp)}</td>
      <td>${escapeHtml(formatBp(record.bp))}</td>
      <td>${escapeHtml(formatScore(record.score))}</td>
      <td><a href="#" class="delete-link" data-record-id="${escapeHtml(record.id)}">削除</a></td>
    </tr>
  `).join("");

  historyContainer.querySelectorAll(".delete-link").forEach((link) => {
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
  });
}
