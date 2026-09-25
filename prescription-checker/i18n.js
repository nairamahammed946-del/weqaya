// ---- Simple bilingual dictionary (Arabic default / English) ----
const I18N = {
  ar: {
    app_name: "وِقاية",
    hero_title: "دواء يعالج ودواء يتعارض — قبل ما ياخدهم كبير السن مع بعض، اتأكدي.",
    hero_sub: "لما المريض بيروح لأكتر من دكتور، كل دكتور بيكتب من غير ما يشوف روشتة التاني. هنا بتجمعي كل الأدوية في مكان واحد وتشوفي أي تعارض خطير بينهم.",
    add_title: "1) ضيفي الأدوية",
    add_hint: "اكتبي الاسم التجاري أو الاسم العلمي (عربي أو إنجليزي) — هيظهرلك اقتراحات تلقائيًا حتى لو الإملاء مش مظبوط.",
    search_placeholder: "مثال: كونكور، Voltaren، ميتفورمين ...",
    ocr_title: "2) أو صوّري الروشتة (تجريبي)",
    badge_experimental: "تجريبي",
    ocr_hint: "قراءة خط الأطباء بالكاميرا لسه في تطوير — النتيجة بتتحسن بمقارنة كل كلمة مستخرجة بأقرب اسم دواء حقيقي في القاعدة (تصحيح ذكي)، لكن التسجيل اليدوي فوق أدق وأضمن.",
    ocr_upload: "اختاري صورة روشتة",
    ocr_raw_title: "النص المستخرج (خام)",
    ocr_matched_title: "أقرب أدوية مطابقة — راجعيها قبل الإضافة",
    results_title: "3) نتيجة الفحص",
    results_empty: "ضيفي دوائين على الأقل عشان نبدأ نفحص التعارضات بينهم.",
    about_title: "عن الأداة",
    about_1: "قاعدة التعارضات المستخدمة هنا عينة تجريبية للتوضيح، مش القاعدة الكاملة لـ DrugBank أو RxNorm. لاستخدام حقيقي في العيادة أو الصيدلية، لازم ربطها بقاعدة بيانات رسمية محدّثة.",
    about_2: "الأداة دي مش بديل عن الطبيب أو الصيدلي — استخدميها كتنبيه أولي وارجعي للصيدلي أو الدكتور لو ظهر تعارض متوسط أو خطير.",
    footer_text: "صُمم لمساعدة كبار السن وأسرهم — راجعي أي تنبيه مع الصيدلي دايمًا.",
    ocr_reading: "بنقرأ الصورة... ممكن ياخد شوية وقت.",
    ocr_error: "معرفناش نقرأ الصورة، جربي صورة أوضح أو ضيفي الدواء يدويًا.",
    ocr_done: "تم استخراج النص. راجعي المطابقات تحت واضغطي إضافة.",
    add_btn: "إضافة",
    safe_note: "مفيش تعارض معروف في قاعدة البيانات بين الأدوية المختارة. ده مش ضمان كامل — البيانات هنا عينة تجريبية فقط.",
    severity_severe: "خطير",
    severity_moderate: "متوسط",
    severity_mild: "خفيف",
    no_close_match: "مفيش اسم دواء قريب من الكلمة دي."
  },
  en: {
    app_name: "Wiqaya",
    hero_title: "One medicine can undo another — check before an elderly patient takes them together.",
    hero_sub: "When a patient sees several doctors, each one prescribes without seeing what the others wrote. Bring every medication together here and catch dangerous interactions before they happen.",
    add_title: "1) Add the medications",
    add_hint: "Type the brand or active-ingredient name, in Arabic or English — suggestions appear automatically even with imperfect spelling.",
    search_placeholder: "e.g. Concor, Voltaren, Metformin ...",
    ocr_title: "2) Or scan the prescription (experimental)",
    badge_experimental: "Experimental",
    ocr_hint: "Reading a doctor's handwriting from a photo is still evolving — accuracy improves by matching each extracted word to the closest real drug name in the database (smart correction), but manual entry above is more reliable.",
    ocr_upload: "Choose a prescription photo",
    ocr_raw_title: "Extracted text (raw)",
    ocr_matched_title: "Closest drug matches — review before adding",
    results_title: "3) Interaction check results",
    results_empty: "Add at least two medications to start checking for interactions.",
    about_title: "About this tool",
    about_1: "The interaction data here is a demo sample, not the full DrugBank or RxNorm database. For real clinical or pharmacy use, it must be connected to an official, up-to-date database.",
    about_2: "This tool is not a substitute for a doctor or pharmacist — treat it as an early warning, and confirm any moderate or severe interaction with a professional.",
    footer_text: "Built to help elderly patients and their families — always confirm alerts with a pharmacist.",
    ocr_reading: "Reading the image... this can take a moment.",
    ocr_error: "Couldn't read that image. Try a clearer photo or add the medication manually.",
    ocr_done: "Text extracted. Review the matches below and tap Add.",
    add_btn: "Add",
    safe_note: "No known interaction found in the database between the selected medications. This is not a full guarantee — the data here is only a demo sample.",
    severity_severe: "Severe",
    severity_moderate: "Moderate",
    severity_mild: "Mild",
    no_close_match: "No drug name close enough to this word."
  }
};

let currentLang = "ar";

function applyTranslations() {
  const dict = I18N[currentLang];
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (dict[key]) el.setAttribute("placeholder", dict[key]);
  });
  document.documentElement.lang = currentLang === "ar" ? "ar" : "en";
  document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";
  document.getElementById("langToggle").textContent = currentLang === "ar" ? "EN" : "AR";
  if (typeof onLanguageChanged === "function") onLanguageChanged();
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("langToggle").addEventListener("click", () => {
    currentLang = currentLang === "ar" ? "en" : "ar";
    applyTranslations();
  });
  applyTranslations();
});
