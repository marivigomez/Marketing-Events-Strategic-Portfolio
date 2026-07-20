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
        <div class="p-8 bg-white border border-neutral-100 rounded-2xl hover:shadow-xl hover:shadow-neutral-100 transition-all group flex flex-col h-full">
            <span class="text-[10px] font-bold accent-pink uppercase tracking-widest block mb-4">${edu.period}</span>
            <div class="flex items-start justify-between mb-4">
                <h3 class="text-xl serif-font leading-tight group-hover:accent-pink transition-colors pr-2">${edu.degree}</h3>
                ${edu.neuro ? `<i data-lucide="brain" style="width:24px;height:24px" class="accent-pink/40"></i>` : ""}
            </div>
            <p class="text-[10px] font-bold uppercase tracking-tighter mb-4 text-neutral-400">${edu.institution}</p>
            <div class="inline-block px-3 py-1 bg-[#fa008a]/10 accent-pink text-[10px] font-bold rounded-full mb-6 w-fit">${edu.highlight}</div>
            <p class="text-xs text-neutral-500 font-light leading-relaxed mt-auto">${edu.details}</p>
        </div>`
    )
    .join("");
}

function renderSkills() {
  const container = document.getElementById("skills-container");
  container.innerHTML = t()
    .skills_items.map(
      (skill) => `
        <div class="bg-[#0A0A0A] p-12 group hover:bg-[#111111] transition-colors">
            <div class="accent-pink mb-8 transform group-hover:scale-110 transition-transform">
                <i data-lucide="${skill.icon}" style="width:20px;height:20px"></i>
            </div>
            <h3 class="text-xl font-medium mb-6 uppercase tracking-tight">${skill.name}</h3>
            <ul class="space-y-3">
                ${skill.tools.map((tool) => `<li class="text-xs font-bold uppercase tracking-widest text-neutral-500 border-l border-neutral-800 pl-3">${tool}</li>`).join("")}
            </ul>
        </div>`
    )
    .join("");
}

function renderExperience() {
  const dict = t();
  const filterName = dict.filters[activeFilterIndex];
  const filtered =
    activeFilterIndex === 0
      ? dict.experience_items
      : dict.experience_items.filter((exp) => exp.filterTags.includes(filterName));

  const container = document.getElementById("experience-container");
  container.innerHTML = filtered
    .map(
      (exp) => `
        <div class="group grid grid-cols-1 lg:grid-cols-12 gap-12 animate-slide-in">
            <div class="lg:col-span-4 lg:sticky lg:top-32 h-fit">
                <span class="text-xs font-bold accent-pink uppercase tracking-widest mb-4 block">${exp.period}</span>
                <h3 class="text-4xl serif-font text-black leading-none mb-2">${exp.role}</h3>
                <p class="text-xl text-neutral-400 italic mb-6">${exp.company}</p>
                <div class="flex flex-wrap gap-2">
                    ${exp.tags.map((tg) => `<span class="px-3 py-1 bg-neutral-100 text-[10px] font-bold uppercase rounded-full">${tg}</span>`).join("")}
                </div>
            </div>
            <div class="lg:col-span-8 border-l border-neutral-100 pl-8 lg:pl-16 space-y-6">
                ${exp.description.map((item) => `<p class="text-neutral-500 text-lg font-light leading-relaxed">${item}</p>`).join("")}
            </div>
        </div>`
    )
    .join("");
  lucide.createIcons();
}

function renderFilterButtons() {
  const dict = t();
  const container = document.getElementById("filter-buttons");
  container.innerHTML = dict.filters
    .map(
      (filter, idx) => `
        <button onclick="setFilter(${idx})" class="text-[10px] font-bold uppercase tracking-widest px-4 py-2 transition-all ${
        activeFilterIndex === idx ? "text-black border-b-2 border-[#fa008a]" : "text-neutral-400"
      }">${filter}</button>`
    )
    .join("");
}

function setFilter(idx) {
  activeFilterIndex = idx;
  renderFilterButtons();
  renderExperience();
}

// ============= AI: llamada al Worker (el token vive solo en el servidor) =============
async function callAI(prompt, options = {}) {
  if (!WORKER_URL || WORKER_URL.includes("YOUR-SUBDOMAIN")) {
    console.error("WORKER_URL no configurada. Edita config.js con la URL de tu Worker desplegado.");
    return null;
  }
  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, ...options }),
    });
    if (!response.ok) throw new Error("Worker/API error");
    const result = await response.json();
    if (Array.isArray(result) && result[0]?.generated_text) return result[0].generated_text.trim();
    if (result.error) throw new Error(result.error);
    return null;
  } catch (error) {
    console.error("AI Error:", error);
    return null;
  }
}

function chatMLPrompt(system, user) {
  return `<|im_start|>system\n${system}<|im_end|>\n<|im_start|>user\n${user}<|im_end|>\n<|im_start|>assistant\n`;
}

// ============= CHAT DRAWER =============
function openChat() {
  document.getElementById("chat-drawer").classList.remove("hidden");
  document.getElementById("chat-drawer").classList.add("flex");
  document.getElementById("floating-btn").classList.add("hidden");
  renderChatMessages();
}

function closeChat() {
  document.getElementById("chat-drawer").classList.add("hidden");
  document.getElementById("chat-drawer").classList.remove("flex");
  document.getElementById("floating-btn").classList.remove("hidden");
}

function renderChatMessages() {
  const container = document.getElementById("chat-messages");
  if (!container) return;
  container.innerHTML = chatMessages
    .map(
      (msg) => `
        <div class="flex ${msg.role === "user" ? "justify-end" : "justify-start"}">
            <div class="max-w-[90%] p-6 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-[#fa008a] text-white rounded-3xl rounded-tr-none shadow-xl shadow-[#fa008a]/30"
                : "bg-white border border-neutral-100 rounded-3xl rounded-tl-none shadow-sm"
            }">${msg.text}</div>
        </div>`
    )
    .join("");
  container.scrollTop = container.scrollHeight;
  lucide.createIcons();
}

async function sendMessage() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  input.disabled = true;

  chatMessages.push({ role: "user", text });
  chatMessages.push({ role: "assistant", text: `<div class="loader"></div> ${t().chat.thinking}` });
  renderChatMessages();

  const prompt = chatMLPrompt(t().ai_context, text);
  const reply = await callAI(prompt, { max_new_tokens: 250, temperature: 0.7 });

  chatMessages[chatMessages.length - 1].text = reply || t().chat.error;

  input.disabled = false;
  input.focus();
  renderChatMessages();
}

// ============= PROFILE SIMULATOR =============
async function analyzeMatch() {
  const desc = document.getElementById("job-description").value.trim();
  if (!desc) return;
  const dict = t();

  const btn = document.getElementById("analyze-btn");
  const originalLabel = btn.innerHTML;
  btn.innerHTML = `<div class="loader mr-2"></div> ${dict.ailab.analyzing}`;
  btn.disabled = true;

  const system = `${dict.ai_context}\nEvaluate how well Mariví Gómez fits the following job description. Respond EXACTLY in this format, nothing else:\nScore: [Number from 0 to 100]%\n- [Reason 1]\n- [Reason 2]\n- [Reason 3]`;
  const prompt = chatMLPrompt(system, `Job Description: ${desc}`);

  const aiResponse = await callAI(prompt, { max_new_tokens: 200, temperature: 0.6 });

  btn.innerHTML = originalLabel;
  btn.disabled = false;

  if (aiResponse) {
    const lines = aiResponse.split("\n").filter((l) => l.trim() !== "");
    const scoreLine = lines.find((l) => l.toLowerCase().includes("score"));
    const score = scoreLine ? scoreLine.replace(/[^0-9]/g, "") + "%" : "85%";
    const bulletLines = lines.filter((l) => l.trim().startsWith("-")).slice(0, 3);
    const reasons = bulletLines.length > 0 ? bulletLines : dict.ailab.default_reasons.map((r) => `- ${r}`);

    document.getElementById("score-value").innerText = score;
    document.getElementById("score-reasons").innerHTML = reasons.map((r) => `<li>${r.replace(/^-\s*/, "")}</li>`).join("");
    document.getElementById("match-score-container").classList.remove("hidden");
  } else {
    alert(dict.ailab.api_error);
  }
}

// ============= EVENT STRATEGIST =============
async function generateEventStrategy() {
  const goal = document.getElementById("event-goal").value.trim();
  if (!goal) return;
  const dict = t();

  const btn = document.getElementById("event-btn");
  const originalLabel = btn.innerHTML;
  btn.innerHTML = `<div class="loader mr-2"></div> ${dict.ailab.generating}`;
  btn.disabled = true;

  const system = `You are Mariví's AI Event Strategist. Generate a brief event proposal for the given goal, in the same language as the goal. Format EXACTLY like this:\nTITLE: [Catchy Event Name]\nCONCEPT: [2 sentences describing the creative concept]\nKPI 1: [Metric 1]\nKPI 2: [Metric 2]\nKPI 3: [Metric 3]`;
  const prompt = chatMLPrompt(system, `Goal: ${goal}`);

  const aiResponse = await callAI(prompt, { max_new_tokens: 220, temperature: 0.8 });

  btn.innerHTML = originalLabel;
  btn.disabled = false;

  if (aiResponse) {
    const titleMatch = aiResponse.match(/TITLE:\s*(.*)/i);
    const conceptMatch = aiResponse.match(/CONCEPT:\s*(.*)/i);
    const kpisMatch = [...aiResponse.matchAll(/KPI\s*\d*:\s*(.*)/gi)].map((m) => m[1]);

    document.getElementById("event-title").innerText = titleMatch ? titleMatch[1] : dict.ailab.default_event_title;
    document.getElementById("event-concept").innerText = conceptMatch ? conceptMatch[1] : dict.ailab.default_event_concept;

    const kpis = kpisMatch.length > 0 ? kpisMatch : dict.ailab.default_kpis;
    document.getElementById("event-kpis").innerHTML = kpis
      .slice(0, 3)
      .map((kpi) => `<span class="px-2 py-1 bg-black text-white rounded-md text-[9px] uppercase font-bold tracking-widest">${kpi}</span>`)
      .join("");

    document.getElementById("event-proposal-container").classList.remove("hidden");
  } else {
    alert(dict.ailab.api_error);
  }
}

// ============= INIT =============
window.addEventListener("DOMContentLoaded", () => {
  chatMessages = [{ role: "assistant", text: t().chat.welcome }];
  applyStaticTranslations();
  renderEducation();
  renderSkills();
  renderFilterButtons();
  renderExperience();
  renderChatMessages();
  lucide.createIcons();

  document.getElementById("chat-input").addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  });
});
