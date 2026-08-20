// app.js — Render, i18n, chat e integración de IA (vía Worker seguro)

let currentLang = localStorage.getItem("marivi_lang") || "es";
let activeFilterIndex = 0; // índice sobre filters[currentLang], 0 = "Todos"/"All"
let chatMessages = [];

function t() {
  return i18n[currentLang];
}

// ============= i18n RENDER =============
function applyStaticTranslations() {
  document.documentElement.lang = currentLang;
  const dict = t();

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const path = el.getAttribute("data-i18n");
    const value = path.split(".").reduce((o, k) => (o ? o[k] : null), dict);
    if (value != null) el.textContent = value;
  });

  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const path = el.getAttribute("data-i18n-html");
    const value = path.split(".").reduce((o, k) => (o ? o[k] : null), dict);
    if (value != null) el.innerHTML = value;
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const path = el.getAttribute("data-i18n-placeholder");
    const value = path.split(".").reduce((o, k) => (o ? o[k] : null), dict);
    if (value != null) el.placeholder = value;
  });

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
  });
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem("marivi_lang", lang);
  activeFilterIndex = 0;
  chatMessages = [{ role: "assistant", text: t().chat.welcome }];
  applyStaticTranslations();
  renderEducation();
  renderSkills();
  renderFilterButtons();
  renderExperience();
  renderChatMessages();
  lucide.createIcons();
}

// ============= RENDER FUNCTIONS =============
function renderEducation() {
  const container = document.getElementById("education-container");
  container.innerHTML = t()
    .education_items.map(
      (edu) => `
        <div class="lift-card p-8 bg-white border border-neutral-100 rounded-2xl hover:shadow-xl hover:shadow-neutral-100 group flex flex-col h-full">
            <span class="text-[10px] font-bold accent-pink uppercase tracking-widest block mb-4">${edu.period}</span>
            <div class="flex items-start justify-between mb-4">
                <h3 class="text-xl serif-font leading-tight group-hover:accent-pink transition-colors pr-2">${edu.degree}</h3>
                ${edu.neuro ? `<i data-lucide="brain" style="width:24px;height:24px" class="accent-pink/40"></i>` : ""}
            </div>
            <p class="text-[10px] font-bold uppercase tracking-tighter mb-4 text-neutral-400">${edu.institution}</p>
            <div class="inline-block px-3 py-1 bg-[#fa008a]/10 accent-pink text-[10px] font-bold rounded-full mb-6 w-fit">${edu.highlight}</div>
            <p class="text-xs text-neutral-500 font-light leading-relaxed mt-auto">${edu.details}</p>
