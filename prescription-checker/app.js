/* =========================================================================
   وِقاية — Prescription Interaction Checker
   Core logic: normalization, Levenshtein fuzzy matching, drug search,
   interaction lookup, and (experimental) OCR-assisted entry.
   ========================================================================= */

const state = {
  selected: [],       // array of drug ids, in the order added
  lastOcrCandidates: [] // {token, matches:[{id, score}]}
};

// normalize, levenshtein, similarity, buildIndex, getDrug, searchDrugs,
// bestMatchesForToken and SEARCH_INDEX all come from match.js (loaded before this file).

function displayName(id) {
  const d = getDrug(id);
  if (!d) return id;
  return currentLang === "ar" ? d.active_ar : d.active_en;
}

function subLabel(id) {
  const d = getDrug(id);
  if (!d) return "";
  const brands = (d.brands || []).filter(b => /[A-Za-z]/.test(b));
  return brands.slice(0, 2).join(" / ");
}

// ---------- Chips / selection ----------
function addDrug(id) {
  if (!id || state.selected.includes(id)) return;
  state.selected.push(id);
  renderChips();
  renderResults();
}

function removeDrug(id) {
  state.selected = state.selected.filter(x => x !== id);
  renderChips();
  renderResults();
}

function renderChips() {
  const list = document.getElementById("chipList");
  list.innerHTML = "";
  state.selected.forEach(id => {
    const chip = document.createElement("div");
    chip.className = "chip";
    const label = document.createElement("span");
    label.textContent = displayName(id);
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.setAttribute("aria-label", "remove");
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => removeDrug(id));
    chip.appendChild(label);
    chip.appendChild(removeBtn);
    list.appendChild(chip);
  });
}

// ---------- Interaction lookup ----------
function findInteraction(idA, idB) {
  return DRUG_DB.interactions.find(
    it => (it.a === idA && it.b === idB) || (it.a === idB && it.b === idA)
  );
}

const SEVERITY_ORDER = { "خطير": 0, "متوسط": 1, "خفيف": 2 };
const SEVERITY_CLASS = { "خطير": "severe", "متوسط": "moderate", "خفيف": "mild" };
const SEVERITY_LABEL_KEY = { "خطير": "severity_severe", "متوسط": "severity_moderate", "خفيف": "severity_mild" };

function renderResults() {
  const empty = document.getElementById("resultsEmpty");
  const list = document.getElementById("resultsList");
  list.innerHTML = "";

  if (state.selected.length < 2) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  const found = [];
  for (let i = 0; i < state.selected.length; i++) {
    for (let j = i + 1; j < state.selected.length; j++) {
      const it = findInteraction(state.selected[i], state.selected[j]);
      if (it) found.push(it);
    }
  }
  found.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  if (found.length === 0) {
    const note = document.createElement("div");
    note.className = "results-safe-note";
    note.textContent = I18N[currentLang].safe_note;
    list.appendChild(note);
    return;
  }

  found.forEach(it => {
    const card = document.createElement("div");
    card.className = `result-card severity-${it.severity}`;
    const top = document.createElement("div");
    top.className = "result-top";
    const pair = document.createElement("span");
    pair.className = "result-pair";
    pair.textContent = `${displayName(it.a)} + ${displayName(it.b)}`;
    const tag = document.createElement("span");
    tag.className = `severity-tag ${SEVERITY_CLASS[it.severity]}`;
    tag.textContent = I18N[currentLang][SEVERITY_LABEL_KEY[it.severity]];
    top.appendChild(pair);
    top.appendChild(tag);
    const desc = document.createElement("p");
    desc.className = "result-desc";
    desc.textContent = currentLang === "ar" ? it.desc_ar : it.desc_en;
    card.appendChild(top);
    card.appendChild(desc);
    list.appendChild(card);
  });
}

// ---------- Suggestions UI ----------
function renderSuggestions(matches) {
  const box = document.getElementById("suggestions");
  box.innerHTML = "";
  if (!matches.length) { box.hidden = true; return; }
  matches.forEach(({ id }) => {
    const row = document.createElement("div");
    row.className = "suggestion-item";
    const name = document.createElement("span");
    name.className = "suggestion-name";
    name.textContent = displayName(id);
    const sub = document.createElement("span");
    sub.className = "suggestion-sub";
    sub.textContent = subLabel(id);
    row.appendChild(name);
    row.appendChild(sub);
    row.addEventListener("click", () => {
      addDrug(id);
      document.getElementById("drugInput").value = "";
      box.hidden = true;
    });
    box.appendChild(row);
  });
  box.hidden = false;
}

// ---------- OCR (experimental) ----------
function renderOcrMatches(rawText) {
  const tokens = rawText
    .split(/[\n,،.;:\/\\|]+/)
    .flatMap(line => line.split(/\s+/))
    .map(t => t.trim())
    .filter(t => normalize(t).length >= 3);

  const uniqueTokens = [...new Set(tokens)];
  const perDrugBest = new Map(); // id -> {score, token}

  uniqueTokens.forEach(token => {
    const matches = bestMatchesForToken(token, 2);
    matches.forEach(({ id, score }) => {
      const cur = perDrugBest.get(id);
      if (!cur || score > cur.score) perDrugBest.set(id, { score, token });
    });
  });

  const ranked = [...perDrugBest.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 8);

  const box = document.getElementById("ocrMatches");
  box.innerHTML = "";
  if (ranked.length === 0) {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = I18N[currentLang].no_close_match;
    box.appendChild(p);
    return;
  }
  ranked.forEach(([id, info]) => {
    const row = document.createElement("div");
    row.className = "ocr-match-row";
    const label = document.createElement("span");
    label.textContent = `"${info.token}" → ${displayName(id)} (${Math.round(info.score * 100)}%)`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = I18N[currentLang].add_btn;
    btn.addEventListener("click", () => addDrug(id));
    row.appendChild(label);
    row.appendChild(btn);
    box.appendChild(row);
  });
}

function setupOcr() {
  const fileInput = document.getElementById("fileInput");
  const fileDrop = document.getElementById("fileDrop");
  const statusBox = document.getElementById("ocrStatus");
  const rawBox = document.getElementById("ocrRaw");
  const rawText = document.getElementById("ocrRawText");

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;

    statusBox.hidden = false;
    statusBox.textContent = I18N[currentLang].ocr_reading;
    rawBox.hidden = true;

    try {
      if (typeof Tesseract === "undefined") throw new Error("Tesseract.js not loaded (no internet?)");
      const { data } = await Tesseract.recognize(file, "eng+ara");
      const text = (data && data.text) || "";
      state.lastOcrCandidates = text;
      rawText.textContent = text.trim() || "(—)";
      rawBox.hidden = false;
      statusBox.textContent = I18N[currentLang].ocr_done;
      renderOcrMatches(text);
    } catch (err) {
      console.error(err);
      statusBox.textContent = I18N[currentLang].ocr_error;
      rawBox.hidden = true;
    }
  });

  fileDrop.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") fileInput.click();
  });
}

// ---------- Wire up search input ----------
function setupSearch() {
  const input = document.getElementById("drugInput");
  const box = document.getElementById("suggestions");

  input.addEventListener("input", () => {
    const matches = searchDrugs(input.value);
    renderSuggestions(matches);
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const matches = searchDrugs(input.value, 1);
      if (matches.length) {
        addDrug(matches[0].id);
        input.value = "";
        box.hidden = true;
      }
    } else if (e.key === "Escape") {
      box.hidden = true;
    }
  });

  document.addEventListener("click", e => {
    if (!box.contains(e.target) && e.target !== input) box.hidden = true;
  });
}

// Called by i18n.js whenever the language toggle is used
function onLanguageChanged() {
  renderChips();
  renderResults();
  if (!document.getElementById("ocrRaw").hidden && state.lastOcrCandidates) {
    renderOcrMatches(state.lastOcrCandidates);
  }
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  buildIndex();
  setupSearch();
  setupOcr();
  renderResults();
});
