export const ENTRY_BP_INPUT_MODE_STORAGE_KEY = "dbr-entry-bp-input-mode";
export const ENTRY_BP_INPUT_MODES = new Set(["bp", "split"]);

export function bindRecordFormHandlers({
  nodes,
  store,
  focusNextRecordFormField,
  getEntryBpValue,
  clearEntryBpInputs,
  setEntryFormDirty,
  getEntryFormDirty,
  limitNumberInput,
  setEntryBpInputMode,
  scrollSelectedCardIntoView,
}) {
  [nodes.bpInput, nodes.badInput, nodes.poorInput, nodes.scoreInput].forEach((input) => input?.addEventListener("wheel", (event) => {
    if (document.activeElement === input) {
      event.preventDefault();
      input.blur();
    }
  }, { passive: false }));

  [
    [nodes.bpInput, 4],
    [nodes.badInput, 4],
    [nodes.poorInput, 4],
    [nodes.scoreInput, 5],
  ].forEach(([input, limit]) => {
    input?.addEventListener("input", () => {
      limitNumberInput(input, limit);
    });
  });

  nodes.recordForm.addEventListener("keydown", (event) => {
    focusNextRecordFormField(event, [
      nodes.lampInput,
      nodes.bpInput,
      nodes.badInput,
      nodes.poorInput,
      nodes.scoreInput,
      nodes.memoInput,
    ]);
  });

  nodes.recordForm.addEventListener("input", () => {
    setEntryFormDirty(true);
  });

  nodes.recordForm.addEventListener("change", () => {
    setEntryFormDirty(true);
  });

  nodes.recordForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!getEntryFormDirty()) {
      return;
    }

    const bpResult = getEntryBpValue();
    if (!bpResult.ok) {
      window.alert(bpResult.message);
      return;
    }

    setEntryFormDirty(false);

    const result = store.saveRecord({
      lamp: nodes.lampInput.value,
      bp: bpResult.value,
      score: nodes.scoreInput.value,
      memo: nodes.memoInput.value,
    });

    if (result.ok) {
      clearEntryBpInputs();
      nodes.scoreInput.value = "";
    } else {
      setEntryFormDirty(true);
      window.alert(result.message);
    }
  });

  nodes.bpInputModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setEntryBpInputMode(button.dataset.bpInputMode);
    });
  });

  nodes.backToCardButton?.addEventListener("click", () => {
    scrollSelectedCardIntoView();
  });
}


