/* =========================================================================
   Shared matching engine: normalization + Levenshtein fuzzy matching
   + the drug search index built from DRUG_DB (see db.js).
   Used by both app.js (the checker UI) and eval.js (the accuracy benchmark).
   ========================================================================= */

// ---------- Normalization ----------
function normalize(str) {
  if (!str) return "";
  let s = str.toString().trim().toLowerCase();
  s = s.replace(/[\u064B-\u065F\u0670\u0640]/g, "");      // Arabic diacritics + tatweel
  s = s.replace(/[إأآا]/g, "ا");
  s = s.replace(/ى/g, "ي");
  s = s.replace(/ة/g, "ه");
  s = s.replace(/[^\p{L}\p{N}\s]/gu, " ");                 // strip punctuation
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// ---------- Levenshtein distance ----------
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prev = tmp;
    }
  }
  return dp[n];
}

// ---------- Similarity score in [0,1] ----------
function similarity(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return 0;
  const maxLen = Math.max(na.length, nb.length);
  const dist = levenshtein(na, nb);
  let score = 1 - dist / maxLen;
  if (na === nb) score = 1;
  else if (na.includes(nb) || nb.includes(na)) score = Math.max(score, 0.85);
  return Math.max(0, Math.min(1, score));
}

// ---------- Search index built from DRUG_DB (global, loaded via db.js) ----------
let SEARCH_INDEX = []; // {text, id}
function buildIndex() {
  SEARCH_INDEX = [];
  DRUG_DB.drugs.forEach(d => {
    SEARCH_INDEX.push({ text: d.active_en, id: d.id });
    SEARCH_INDEX.push({ text: d.active_ar, id: d.id });
    (d.brands || []).forEach(b => SEARCH_INDEX.push({ text: b, id: d.id }));
  });
}

function getDrug(id) {
  return DRUG_DB.drugs.find(d => d.id === id);
}

// Best-matching drug id(s) for a free-text token, using fuzzy matching.
function bestMatchesForToken(token, limit = 3, threshold = 0.55) {
  const bestPerDrug = new Map();
  SEARCH_INDEX.forEach(entry => {
    const score = similarity(token, entry.text);
    if (score < threshold) return;
    const cur = bestPerDrug.get(entry.id) || 0;
    if (score > cur) bestPerDrug.set(entry.id, score);
  });
  return [...bestPerDrug.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, score]) => ({ id, score }));
}

// General search across the index for the autocomplete box.
function searchDrugs(query, limit = 6) {
  const q = normalize(query);
  if (q.length < 2) return [];
  const bestPerDrug = new Map();
  SEARCH_INDEX.forEach(entry => {
    const score = similarity(query, entry.text);
    if (score < 0.45) return;
    const cur = bestPerDrug.get(entry.id) || 0;
    if (score > cur) bestPerDrug.set(entry.id, score);
  });
  return [...bestPerDrug.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, score]) => ({ id, score }));
}
