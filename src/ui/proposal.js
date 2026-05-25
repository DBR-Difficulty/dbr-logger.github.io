const MODULE_VERSION = new URL(import.meta.url).search;

const { todayIso } = await import(`../utils/date.js${MODULE_VERSION}`);
const { escapeHtml } = await import(`../utils/html.js${MODULE_VERSION}`);

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbwAqEgEmymWS0Ztge7CKinjSiEPW8gYvCnA_qk1qxjk-gLo1xjT4dBhrGkISHZeTKZR/exec";

const RECOMMEND_OPTIONS = [
  { value: "", label: "（選択）" },
  { value: "☆", label: "☆：強くおすすめできる" },
  { value: "◎", label: "◎：おすすめできる" },
  { value: "○", label: "○：やって損はしない" },
  { value: "△", label: "△：やるのもよい" },
  { value: "", label: "無記入：そうでもない" },
];
const NEW_PROPOSAL_DUPLICATE_ERROR =
  "Error: 既に同曲、同譜面に対しての提案が存在します。管理用スプレッドシートをご確認ください。提案内容に対して異議がある場合、異議申し立て列に記載してください。";

function todayFormatted() {
  const [year, month, day] = todayIso().split("-").map(Number);
  return `${year}/${month}/${day}`;
}

function findDifficultyEntry(difficultyTable, title) {
  return difficultyTable?.entries?.find((e) => e.title === title) ?? null;
}

async function postToGas(rowData) {
  const encodedData = encodeURIComponent(JSON.stringify({ data: rowData }));
  const params = new URLSearchParams();
  params.append("data", encodedData);

  const response = await fetch(GAS_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export function renderProposalButton(container, selectedSong, difficultyTable) {
  container.querySelector("#proposal-area")?.remove();

  if (!selectedSong || !difficultyTable) return;

  const entry = findDifficultyEntry(difficultyTable, selectedSong.title);
  if (!entry) return;

  const isProposed = selectedSong.isProposed ?? false;
  const isUnrated = !entry.level || entry.level === "";

  const area = document.createElement("div");
  area.id = "proposal-area";
  area.className = "proposal-area";

  if (isProposed) {
    const warning = document.createElement("p");
    warning.className = "proposal-warning";
    warning.append("⚠️ 現在、新規提案中の譜面です。");
    warning.appendChild(document.createElement("br"));
    warning.append("レベル・おすすめ度に違和感がある場合は、");
    const link = document.createElement("a");
    link.className = "proposal-link";
    link.href = "https://docs.google.com/spreadsheets/d/1R-bgS7CZ1BBTzsk4KRKRSmBAZWNotZnQLfWtZFQr-Ek/edit?gid=1709558806#gid=1709558806";
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "新規提案シート";
    warning.appendChild(link);
    warning.append("の「異議申し立て」列に記載することができます（外部スプレッドシートを開きます）。");
    area.appendChild(warning);
  } else if (isUnrated) {
    const actions = document.createElement("div");
    actions.className = "proposal-open-actions";
    const button = document.createElement("button");
    button.className = "button button-secondary proposal-open-btn proposal-action-btn";
    button.type = "button";
    button.dataset.type = "new";
    button.textContent = "新規提案";
    actions.appendChild(button);
    area.appendChild(actions);
  } else {
    const actions = document.createElement("div");
    actions.className = "action-group proposal-open-actions";
    [
      ["change", "変更提案"],
      ["recommend", "おすすめ提案"],
    ].forEach(([type, label]) => {
      const button = document.createElement("button");
      button.className = "button button-secondary proposal-open-btn proposal-action-btn";
      button.type = "button";
      button.dataset.type = type;
      button.textContent = label;
      actions.appendChild(button);
    });
    area.appendChild(actions);
  }

  const formContainer = document.createElement("div");
  formContainer.id = "proposal-form-container";
  formContainer.className = "proposal-form-container";
  area.appendChild(formContainer);
  container.appendChild(area);

  area.querySelectorAll(".proposal-open-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;
      if (formContainer.dataset.openType === type) {
        formContainer.replaceChildren();
        formContainer.dataset.openType = "";
        return;
      }
      formContainer.dataset.openType = type;
      renderProposalForm(formContainer, type, entry);
    });
  });
}

function renderProposalForm(container, type, entry) {
  container.replaceChildren();

  const today = todayFormatted();
  const typeLabel =
    type === "new" ? "新規提案" : type === "change" ? "変更提案" : "おすすめ提案";

  const formEl = document.createElement("form");
  formEl.className = "proposal-form";

  formEl.innerHTML = `
    <div class="proposal-form-title">${typeLabel}フォーム</div>
    <hr class="proposal-divider">
    <div class="proposal-form-body">
      ${buildFormFields(type, entry)}
    </div>
    <div class="action-group proposal-form-actions">
      <button type="button" class="button button-primary proposal-submit-btn">送信</button>
      <button type="button" class="button button-tertiary proposal-cancel-btn">キャンセル</button>
    </div>
    <div class="proposal-status"></div>
  `;

  const currentLevelNode = formEl.querySelector("[data-current-level-label]");
  if (currentLevelNode) {
    const currentLevel = entry.level ? entry.level.replace(/^[☆†]*[☆†]/, "") : "";
    currentLevelNode.textContent = `☆${currentLevel}`;
  }
  const currentLevelInput = formEl.querySelector("[name=level_change]");
  if (currentLevelInput instanceof HTMLInputElement) {
    const currentLevel = entry.level ? entry.level.replace(/^[☆†]*[☆†]/, "") : "";
    currentLevelInput.dataset.current = currentLevel;
  }
  const currentRecommendNode = formEl.querySelector("[data-current-recommend-label]");
  if (currentRecommendNode) {
    currentRecommendNode.textContent = entry.recommend || "無記入";
  }

  container.appendChild(formEl);


  formEl.querySelector(".proposal-cancel-btn").addEventListener("click", () => {
    container.replaceChildren();
    container.dataset.openType = "";
  });

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
  });

  formEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target instanceof HTMLElement && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
    }
  });

  formEl.querySelector(".proposal-submit-btn").addEventListener("click", () => {
    handleProposalSubmit(formEl, type, entry, today);
  });

  formEl.querySelectorAll(".proposal-textarea").forEach((textarea) => {
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return;
    }

    const resizeTextarea = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    resizeTextarea();
    textarea.addEventListener("input", resizeTextarea);
  });
}

function buildFormFields(type, entry) {
  const recommendOptions = RECOMMEND_OPTIONS.map(
    (o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`
  ).join("");

  if (type === "new") {
    return `
      <div class="proposal-field">
        <div class="proposal-stack-label field"><span>レベル（必須）</span>
          <input class="proposal-input proposal-input-level" name="level_new" required aria-label="レベル（必須）"
          pattern="^[0-9]{1,2}\\.[0-9]{2}$" maxlength="5"
          title="小数点以下2桁（例: 11.00）">
        </div>
      </div>
      <div class="proposal-field">
        <div class="proposal-stack-label field"><span>おすすめ度（任意）</span>
          <div class="field-select proposal-select-wrap">
            <select class="proposal-select" name="recommend_new" aria-label="おすすめ度（任意）">${recommendOptions}</select>
          </div>
        </div>
      </div>
      <div class="proposal-field">
        <div class="proposal-stack-label field"><span>コメント（任意）</span>
          <textarea class="proposal-textarea" name="comment_new" rows="3" aria-label="コメント（任意）"></textarea>
        </div>
        <small class="proposal-note">※譜面傾向、攻略情報などなんでも（表に反映されます）</small>
      </div>
      <div class="proposal-field">
        <div class="proposal-stack-label field"><span>備考（任意）</span>
          <textarea class="proposal-textarea" name="note_new" rows="3" aria-label="備考（任意）"></textarea>
        </div>
        <small class="proposal-note">※提案内容の補足など（表に反映されません）</small>
      </div>
    `;
  }

  if (type === "change") {
    return `
      <div class="proposal-field proposal-current">
        現在のレベル <strong data-current-level-label></strong>
      </div>
      <div class="proposal-field">
        <div class="proposal-stack-label field"><span>変更後レベル（必須）</span>
          <input class="proposal-input proposal-input-level" name="level_change" required aria-label="変更後レベル（必須）"
          pattern="^[0-9]{1,2}\\.[0-9]{2}$" maxlength="5"
          title="小数点以下2桁（例: 11.00）">
        </div>
      </div>
      <div class="proposal-field">
        <div class="proposal-stack-label field"><span>提案理由（必須）</span>
          <textarea class="proposal-textarea" name="reason_change" rows="3" required aria-label="提案理由（必須）"></textarea>
        </div>
      </div>
    `;
  }

  return `
    <div class="proposal-field proposal-current">
      現在のおすすめ度 <strong data-current-recommend-label></strong>
    </div>
    <div class="proposal-field">
      <div class="proposal-stack-label field"><span>変更後おすすめ度（必須）</span>
        <div class="field-select proposal-select-wrap">
          <select class="proposal-select" name="recommend_change" required aria-label="変更後おすすめ度（必須）">
            ${recommendOptions}
          </select>
        </div>
      </div>
    </div>
    <div class="proposal-field">
      <div class="proposal-stack-label field"><span>提案理由（必須）</span>
        <textarea class="proposal-textarea" name="reason_recommend" rows="3" required aria-label="提案理由（必須）"></textarea>
      </div>
    </div>
  `;
}

function getProposalTypeLabel(type) {
  if (type === "new") {
    return "新規提案";
  }

  if (type === "change") {
    return "変更提案";
  }

  return "おすすめ提案";
}

function getProposalSheetLabel(type) {
  if (type === "new") {
    return "新規提案シート";
  }

  if (type === "change") {
    return "変更提案シート";
  }

  return "おすすめ提案シート";
}

function getSafeSheetUrl(sheetUrl) {
  try {
    const url = new URL(String(sheetUrl ?? ""));
    return url.protocol === "https:" && url.hostname === "docs.google.com"
      ? url.href
      : "https://docs.google.com/";
  } catch {
    return "https://docs.google.com/";
  }
}

function renderProposalSuccess(container, type, sheetUrl) {
  if (!container) {
    return;
  }

  const typeLabel = getProposalTypeLabel(type);

  container.replaceChildren();
  const success = document.createElement("div");
  success.className = "proposal-success";
  const title = document.createElement("p");
  title.className = "proposal-success-title";
  title.textContent = `${typeLabel}を送信しました。`;
  const body = document.createElement("p");
  body.className = "proposal-success-body";
  body.append("送信内容を確認する場合は、");
  const link = document.createElement("a");
  link.href = getSafeSheetUrl(sheetUrl);
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = `${typeLabel}シート`;
  body.appendChild(link);
  body.append("を参照してください（外部スプレッドシートを開きます）。");
  success.append(title, body);
  container.appendChild(success);

  container.dataset.openType = "success";
}

function renderProposalError(statusEl, type, message, sheetUrl) {
  if (String(message ?? "").trim() === NEW_PROPOSAL_DUPLICATE_ERROR) {
    const sheetLabel = getProposalSheetLabel(type);
    statusEl.replaceChildren();
    const error = document.createElement("div");
    error.className = "proposal-status-error";
    const title = document.createElement("p");
    title.textContent = "この譜面はすでに提案されています。";
    const body = document.createElement("p");
    body.append("提案内容を確認する場合は、");
    const link = document.createElement("a");
    link.className = "proposal-link";
    link.href = getSafeSheetUrl(sheetUrl);
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = sheetLabel;
    body.appendChild(link);
    body.append("を参照してください（外部スプレッドシートを開きます）。");
    error.append(title, body);
    statusEl.appendChild(error);
    return;
  }

  statusEl.textContent = `送信に失敗しました: ${message ?? "不明なエラー"}`;
}

function buildProposalConfirmMessage(type, entry, fd) {
  const lines = [
    "以下の内容を難易度表側に送信します。よろしいですか?",
    "",
    `種別: ${getProposalTypeLabel(type)}`,
    `楽曲: ${entry.title}`,
  ];

  if (type === "new") {
    lines.push(`レベル: ☆${fd.level_new}`);
    lines.push(`おすすめ度: ${fd.recommend_new || "無記入"}`);
    if (fd.comment_new) lines.push(`コメント: ${fd.comment_new}`);
    if (fd.note_new) lines.push(`備考: ${fd.note_new}`);
  } else if (type === "change") {
    const currentLevel = entry.level ? entry.level.replace(/^[☆†]*[☆†]/, "") : "";
    lines.push(`現在のレベル: ☆${currentLevel}`);
    lines.push(`変更後レベル: ☆${fd.level_change}`);
    lines.push(`理由: ${fd.reason_change}`);
  } else {
    lines.push(`現在のおすすめ度: ${entry.recommend || "無記入"}`);
    lines.push(`変更後おすすめ度: ${fd.recommend_change || "無記入"}`);
    lines.push(`理由: ${fd.reason_recommend}`);
  }

  return lines.join("\n");
}

async function handleProposalSubmit(formEl, type, entry, today) {
  const statusEl = formEl.querySelector(".proposal-status");
  const submitBtn = formEl.querySelector(".proposal-submit-btn");

  if (type === "change") {
    const levelInput = formEl.querySelector("[name=level_change]");
    if (levelInput.dataset.current && levelInput.value === levelInput.dataset.current) {
      alert("変更後のレベルが現在のレベルと一致しています。変更してください。");
      return;
    }
  }
  if (type === "recommend") {
    const newRecommend = formEl.querySelector("[name=recommend_change]")?.value;
    if (newRecommend === entry.recommend) {
      alert("変更後のおすすめ度が現在のおすすめ度と一致しています。変更してください。");
      return;
    }
  }

  if (!formEl.checkValidity()) {
    formEl.reportValidity();
    return;
  }

  const fd = Object.fromEntries(new FormData(formEl).entries());

  if (!window.confirm(buildProposalConfirmMessage(type, entry, fd))) {
    return;
  }

  submitBtn.disabled = true;
  statusEl.textContent = "送信中…";

  let rowData;
  let sheetUrl;

  if (type === "new") {
    const infVal = entry.inf || "";
    const infPack = entry.infpack || "";

    rowData = [
      today,
      entry.ver || "",
      fd.level_new,
      entry.title,
      entry.video ?? "",
      entry.textageid ?? "",
      entry.notes ?? "",
      entry.scratch ?? "",
      entry.bpm ?? "",
      fd.recommend_new ?? "",
      infVal,
      entry.acdelete ? "○" : "",
      fd.comment_new ?? "",
      infPack,
      fd.note_new ?? "",
      "new",
    ];
    sheetUrl = "https://docs.google.com/spreadsheets/d/1R-bgS7CZ1BBTzsk4KRKRSmBAZWNotZnQLfWtZFQr-Ek/edit?gid=1709558806#gid=1709558806";
  } else if (type === "change") {
    const currentLevel = entry.level ? entry.level.replace(/^[☆†]*[☆†]/, "") : "";
    rowData = [
      today,
      currentLevel,
      fd.level_change,
      entry.title,
      fd.reason_change,
      "change",
    ];
    sheetUrl = "https://docs.google.com/spreadsheets/d/1R-bgS7CZ1BBTzsk4KRKRSmBAZWNotZnQLfWtZFQr-Ek/edit?gid=1267054778#gid=1267054778";
  } else {
    rowData = [
      today,
      entry.recommend ?? "",
      fd.recommend_change,
      entry.title,
      fd.reason_recommend,
      "recommend",
    ];
    sheetUrl = "https://docs.google.com/spreadsheets/d/1R-bgS7CZ1BBTzsk4KRKRSmBAZWNotZnQLfWtZFQr-Ek/edit?gid=1779953087#gid=1779953087";
  }

  try {
    const result = await postToGas(rowData);

    if (result.result === "success") {
      const container = formEl.parentElement;
      renderProposalSuccess(container, type, sheetUrl);
    } else {
      renderProposalError(statusEl, type, result.message, sheetUrl);
      submitBtn.disabled = false;
    }
  } catch (err) {
    console.error("提案送信エラー:", err);
    statusEl.textContent = "送信に失敗しました。時間をおいて再試行してください。";
    submitBtn.disabled = false;
  }
}
