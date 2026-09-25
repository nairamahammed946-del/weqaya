/* =========================================================================
   Accuracy benchmark: "raw OCR-style exact match" vs "fuzzy smart-correction".
   This simulates the kind of noisy text a handwriting-OCR engine would output
   (dropped/substituted letters, merged words) and measures how many test
   cases each strategy resolves to the CORRECT drug id.

   This is a synthetic benchmark (no real scanned prescriptions were used —
   see README.md for why, and how to replace it with a real labeled set).
   ========================================================================= */

// Each case: { noisy: "<simulated OCR output>", truth: "<correct drug id>" }
const TEST_CASES = [
  { noisy: "Cancor", truth: "bisoprolol" },
  { noisy: "Consor", truth: "bisoprolol" },
  { noisy: "كنكور", truth: "bisoprolol" },
  { noisy: "Voltaren", truth: "diclofenac" },
  { noisy: "Voltoren", truth: "diclofenac" },
  { noisy: "فولتارين", truth: "diclofenac" },
  { noisy: "فولتارن", truth: "diclofenac" },
  { noisy: "Glucofage", truth: "metformin" },
  { noisy: "Glucophag", truth: "metformin" },
  { noisy: "جلوكوفاچ", truth: "metformin" },
  { noisy: "Lasix", truth: "furosemide" },
  { noisy: "Lasiks", truth: "furosemide" },
  { noisy: "لازکس", truth: "furosemide" },
  { noisy: "Zestril", truth: "lisinopril" },
  { noisy: "Zestrill", truth: "lisinopril" },
  { noisy: "Coumadin", truth: "warfarin" },
  { noisy: "Coumadn", truth: "warfarin" },
  { noisy: "كومدين", truth: "warfarin" },
  { noisy: "Aldacton", truth: "spironolactone" },
  { noisy: "الداكتون", truth: "spironolactone" },
  { noisy: "Norvask", truth: "amlodipine" },
  { noisy: "نورفسك", truth: "amlodipine" },
  { noisy: "Lipitr", truth: "atorvastatin" },
  { noisy: "ليبتور", truth: "atorvastatin" },
  { noisy: "Plavx", truth: "clopidogrel" },
  { noisy: "بلافكس", truth: "clopidogrel" },
  { noisy: "Brufen", truth: "ibuprofen" },
  { noisy: "بروفن", truth: "ibuprofen" },
  { noisy: "Cordarne", truth: "amiodarone" },
  { noisy: "كوردرون", truth: "amiodarone" },
];

function normalizedExactMatch(token) {
  const nt = normalize(token);
  const hit = SEARCH_INDEX.find(e => normalize(e.text) === nt);
  return hit ? hit.id : null;
}

function fuzzyMatch(token) {
  const m = bestMatchesForToken(token, 1, 0.45);
  return m.length ? m[0].id : null;
}

function evaluate(predictFn) {
  let tp = 0, fp = 0, fn = 0;
  const rows = [];
  TEST_CASES.forEach(({ noisy, truth }) => {
    const pred = predictFn(noisy);
    let outcome;
    if (pred === truth) { tp++; outcome = "correct"; }
    else if (pred === null) { fn++; outcome = "no-match"; }
    else { fp++; outcome = "wrong-match"; }
    rows.push({ noisy, truth, pred, outcome });
  });
  const total = TEST_CASES.length;
  const accuracy = tp / total;
  const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
  const recall = tp / total; // every case has a real answer, so recall denom = total
  return { tp, fp, fn, total, accuracy, precision, recall, rows };
}

function pct(x) { return (x * 100).toFixed(1) + "%"; }

function renderBar(containerId, value, label) {
  const el = document.getElementById(containerId);
  el.querySelector(".bar-fill").style.width = pct(value);
  el.querySelector(".bar-value").textContent = pct(value);
}

function runBenchmark() {
  buildIndex();
  const rawResult = evaluate(normalizedExactMatch);
  const fuzzyResult = evaluate(fuzzyMatch);

  document.getElementById("rawAcc").querySelector(".bar-fill").style.width = pct(rawResult.accuracy);
  document.getElementById("rawAcc").querySelector(".bar-value").textContent = pct(rawResult.accuracy);
  document.getElementById("fuzzyAcc").querySelector(".bar-fill").style.width = pct(fuzzyResult.accuracy);
  document.getElementById("fuzzyAcc").querySelector(".bar-value").textContent = pct(fuzzyResult.accuracy);

  document.getElementById("rawPrec").textContent = pct(rawResult.precision);
  document.getElementById("rawRec").textContent = pct(rawResult.recall);
  document.getElementById("fuzzyPrec").textContent = pct(fuzzyResult.precision);
  document.getElementById("fuzzyRec").textContent = pct(fuzzyResult.recall);

  const improvement = (fuzzyResult.accuracy - rawResult.accuracy) * 100;
  document.getElementById("improvement").textContent =
    (improvement >= 0 ? "+" : "") + improvement.toFixed(1) + " " + "نقطة مئوية";

  const tbody = document.querySelector("#detailTable tbody");
  tbody.innerHTML = "";
  fuzzyResult.rows.forEach((row, i) => {
    const rawRow = rawResult.rows[i];
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.noisy}</td>
      <td>${getDrug(row.truth)?.active_en || row.truth}</td>
      <td class="${rawRow.outcome}">${rawRow.pred ? (getDrug(rawRow.pred)?.active_en || rawRow.pred) : "—"}</td>
      <td class="${row.outcome}">${row.pred ? (getDrug(row.pred)?.active_en || row.pred) : "—"}</td>
    `;
    tbody.appendChild(tr);
  });
}

document.addEventListener("DOMContentLoaded", runBenchmark);
