const STORAGE_KEY = "eightFistDietCheckin.v1";
const RESOURCE_VERSION = "20260807t1";
const TOTAL_TARGET = 8;

const CATEGORIES = [
  {
    id: "low",
    label: "低热量",
    quota: 1,
    kcalPerFist: 75,
    examples: "黄瓜、番茄、蔬菜沙拉、生菜、海带",
    note: "低油低糖，主要用来增加饱腹感。"
  },
  {
    id: "protein",
    label: "蛋白质",
    quota: 3,
    kcalPerFist: 160,
    examples: "鸡蛋、鸡胸、鱼虾、牛肉、豆腐",
    note: "优先选清蒸、少油煎、卤煮。"
  },
  {
    id: "carb",
    label: "碳水",
    quota: 3,
    kcalPerFist: 180,
    examples: "米饭、面、红薯、玉米、燕麦",
    note: "正常主食单独记录，不再和零食合并计算。"
  },
  {
    id: "snack",
    label: "零食可选",
    quota: 1,
    limitOnly: true,
    kcalPerFist: 150,
    examples: "饼干、蛋糕、薯片、奶茶小份",
    note: "单独记录，方便控制嘴馋，不计入碳水进度。"
  },
  {
    id: "fruit",
    label: "水果",
    quota: 1,
    kcalPerFist: 80,
    examples: "苹果、橙子、莓果、猕猴桃",
    note: "优先完整水果，不用果汁替代。"
  }
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((item) => [item.id, item]));
const AMOUNTS = [0.5, 1, 1.5, 2, 2.5, 3];
const TABS = ["today", "plan", "rules", "records"];
const PLAN_TEMPLATE = [
  { id: "low-1", category: "low", fists: 1, title: "低热量 1拳", placeholder: "黄瓜、番茄、蔬菜沙拉" },
  { id: "protein-1", category: "protein", fists: 1, title: "蛋白质 1拳", placeholder: "鸡蛋、鸡胸、鱼虾" },
  { id: "protein-2", category: "protein", fists: 1, title: "蛋白质 1拳", placeholder: "牛肉、豆腐、虾仁" },
  { id: "protein-3", category: "protein", fists: 1, title: "蛋白质 1拳", placeholder: "鱼、鸡胸、鸡蛋" },
  { id: "carb-1", category: "carb", fists: 1, title: "碳水 1拳", placeholder: "米饭、红薯、玉米" },
  { id: "carb-2", category: "carb", fists: 1, title: "碳水 1拳", placeholder: "燕麦、面、土豆" },
  { id: "carb-3", category: "carb", fists: 1, title: "碳水 1拳", placeholder: "米饭、玉米、红薯" },
  { id: "fruit-1", category: "fruit", fists: 1, title: "水果 1拳", placeholder: "苹果、橙子、莓果" }
];

const nodes = {
  resetTodayBtn: document.querySelector("#resetTodayBtn"),
  todayDate: document.querySelector("#todayDate"),
  usedText: document.querySelector("#usedText"),
  remainText: document.querySelector("#remainText"),
  progressBar: document.querySelector("#progressBar"),
  statusText: document.querySelector("#statusText"),
  categoryGrid: document.querySelector("#categoryGrid"),
  draftHint: document.querySelector("#draftHint"),
  foodNameInput: document.querySelector("#foodNameInput"),
  categoryButtons: document.querySelector("#categoryButtons"),
  amountButtons: document.querySelector("#amountButtons"),
  customAmount: document.querySelector("#customAmount"),
  addEntryBtn: document.querySelector("#addEntryBtn"),
  openEntryBtn: document.querySelector("#openEntryBtn"),
  closeEntryBtn: document.querySelector("#closeEntryBtn"),
  entrySheet: document.querySelector("#entrySheet"),
  entryCountText: document.querySelector("#entryCountText"),
  entryList: document.querySelector("#entryList"),
  completeTodayBtn: document.querySelector("#completeTodayBtn"),
  planProgressText: document.querySelector("#planProgressText"),
  planList: document.querySelector("#planList"),
  addSnackPlanBtn: document.querySelector("#addSnackPlanBtn"),
  resetPlanBtn: document.querySelector("#resetPlanBtn"),
  ruleList: document.querySelector("#ruleList"),
  statsGrid: document.querySelector("#statsGrid"),
  historyCountText: document.querySelector("#historyCountText"),
  historyList: document.querySelector("#historyList")
};

const state = loadState();

function defaultState() {
  return {
    tab: "today",
    draftCategory: "low",
    draftAmount: 1,
    draftName: "",
    days: {}
  };
}

function loadState() {
  const base = defaultState();
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      tab: TABS.includes(stored.tab) ? stored.tab : base.tab,
      draftCategory: CATEGORY_MAP[stored.draftCategory] ? stored.draftCategory : base.draftCategory,
      draftAmount: validAmount(stored.draftAmount) ? Number(stored.draftAmount) : base.draftAmount,
      draftName: String(stored.draftName || "").slice(0, 30),
      days: normalizeDays(stored.days)
    };
  } catch {
    return base;
  }
}

function normalizeDays(rawDays) {
  if (!rawDays || typeof rawDays !== "object") return {};
  const result = {};
  Object.entries(rawDays).forEach(([date, day]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day || typeof day !== "object") return;
    const entries = Array.isArray(day.entries) ? day.entries.map(normalizeEntry).filter(Boolean).slice(0, 80) : [];
    result[date] = {
      date,
      entries,
      plan: Array.isArray(day.plan) ? day.plan.map(normalizePlanItem).filter(Boolean).slice(0, 12) : [],
      completed: Boolean(day.completed)
    };
  });
  return result;
}

function normalizeEntry(item) {
  const category = CATEGORY_MAP[item?.category] ? item.category : "low";
  const fists = validAmount(item?.fists) ? Number(item.fists) : 0;
  if (!fists) return null;
  const entry = {
    id: String(item.id || Date.now() + Math.random()),
    category,
    fists,
    time: String(item.time || timeLabel(new Date()))
  };
  if (item.name) entry.name = String(item.name).slice(0, 30);
  if (item.planId) entry.planId = String(item.planId).slice(0, 40);
  return entry;
}

function defaultPlan() {
  return PLAN_TEMPLATE.map((item) => ({
    ...item,
    name: "",
    checked: false,
    entryId: ""
  }));
}

function normalizePlanItem(item) {
  if (!item || typeof item !== "object") return null;
  const category = CATEGORY_MAP[item.category] ? item.category : "low";
  const fists = validAmount(item.fists) ? Number(item.fists) : 1;
  return {
    id: String(item.id || `${category}-${Date.now()}`).slice(0, 40),
    category,
    fists,
    title: String(item.title || `${CATEGORY_MAP[category].label} ${formatFistsTight(fists)}`).slice(0, 20),
    placeholder: String(item.placeholder || CATEGORY_MAP[category].examples).slice(0, 40),
    name: String(item.name || "").slice(0, 30),
    checked: Boolean(item.checked),
    entryId: String(item.entryId || "").slice(0, 40)
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayLabel() {
  const date = new Date();
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function timeLabel(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getToday() {
  const key = todayKey();
  if (!state.days[key]) {
    state.days[key] = {
      date: key,
      entries: [],
      plan: defaultPlan(),
      completed: false
    };
  }
  if (!Array.isArray(state.days[key].plan) || !state.days[key].plan.length) {
    state.days[key].plan = defaultPlan();
  }
  return state.days[key];
}

function validAmount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number <= 8;
}

function roundTenth(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function formatFists(value) {
  const rounded = roundTenth(value);
  return Number.isInteger(rounded) ? `${rounded} 拳` : `${rounded.toFixed(1)} 拳`;
}

function formatFistsTight(value) {
  return formatFists(value).replace(" ", "");
}

function formatCalories(value) {
  const rounded = roundTenth(value);
  return Number.isInteger(rounded) ? `${rounded} 千卡` : `${rounded.toFixed(1)} 千卡`;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}

function usedFists(day) {
  return roundTenth(day.entries.reduce((sum, entry) => sum + Number(entry.fists || 0), 0));
}

function categoryUsed(day, categoryId) {
  return roundTenth(day.entries
    .filter((entry) => entry.category === categoryId)
    .reduce((sum, entry) => sum + Number(entry.fists || 0), 0));
}

function quotaText(category) {
  return category.limitOnly ? `最多 ${formatFists(category.quota)}` : formatFists(category.quota);
}

function categoryBalance(category, used) {
  const remain = roundTenth(category.quota - used);
  if (remain < 0) return { text: `超${formatFistsTight(Math.abs(remain))}`, tone: "over" };
  if (remain === 0) return { text: category.limitOnly ? "已到上限" : "已满", tone: "done" };
  return { text: `${category.limitOnly ? "还可" : "还剩"}${formatFistsTight(remain)}`, tone: "open" };
}

function quotaTextTight(category) {
  return category.limitOnly ? `最多${formatFistsTight(category.quota)}` : formatFistsTight(category.quota);
}

function entryCalories(entry) {
  const category = CATEGORY_MAP[entry.category] || CATEGORY_MAP.low;
  return roundTenth(Number(entry.fists || 0) * category.kcalPerFist);
}

function dayCalories(day) {
  return roundTenth(day.entries.reduce((sum, entry) => sum + entryCalories(entry), 0));
}

function dayStatus(day) {
  const total = usedFists(day);
  const overTotal = total > TOTAL_TARGET;
  const categoryOver = CATEGORIES.some((category) => categoryUsed(day, category.id) > category.quota);
  if (!day.completed && !day.entries.length) return { text: "未开始", tone: "" };
  if (!day.completed) return { text: overTotal || categoryOver ? "已超额" : "进行中", tone: overTotal || categoryOver ? "over" : "" };
  return overTotal || categoryOver ? { text: "超额", tone: "over" } : { text: "完成", tone: "done" };
}

function renderAll() {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view.id === `view${capitalize(state.tab)}`);
  });
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === state.tab);
  });
  renderToday();
  renderPlan();
  renderRules();
  renderRecords();
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function switchTab(tab) {
  if (!TABS.includes(tab)) return;
  state.tab = tab;
  saveState();
  renderAll();
}

function renderToday() {
  const day = getToday();
  const used = usedFists(day);
  const remain = roundTenth(TOTAL_TARGET - used);
  const percent = Math.min(100, Math.round((used / TOTAL_TARGET) * 100));
  const isOver = used > TOTAL_TARGET;

  nodes.todayDate.textContent = todayLabel();
  nodes.usedText.textContent = formatFists(used);
  nodes.remainText.textContent = remain >= 0 ? formatFists(remain) : `超 ${formatFists(Math.abs(remain))}`;
  nodes.progressBar.style.width = `${percent}%`;
  nodes.progressBar.parentElement.classList.toggle("over", isOver);
  nodes.statusText.textContent = statusSentence(day, remain, isOver);

  nodes.categoryGrid.innerHTML = CATEGORIES.map((category) => {
    const categoryTotal = categoryUsed(day, category.id);
    const categoryPercent = Math.min(100, Math.round((categoryTotal / category.quota) * 100));
    const over = categoryTotal > category.quota;
    const balance = categoryBalance(category, categoryTotal);
    return `
      <article class="category-card ${over ? "over" : ""}">
        <div>
          <strong>${category.label}</strong>
          <span>已吃 ${formatFistsTight(categoryTotal)} / ${quotaTextTight(category)}</span>
        </div>
        <em class="category-balance ${balance.tone}">${balance.text}</em>
        <div class="mini-track"><i style="width:${categoryPercent}%"></i></div>
      </article>
    `;
  }).join("");

  if (document.activeElement !== nodes.foodNameInput) nodes.foodNameInput.value = state.draftName;
  nodes.categoryButtons.innerHTML = CATEGORIES.map((category) =>
    `<button class="segment-button ${category.id === state.draftCategory ? "is-active" : ""}" type="button" data-category="${category.id}">${category.label}</button>`
  ).join("");
  nodes.amountButtons.innerHTML = AMOUNTS.map((amount) =>
    `<button class="amount-button ${Math.abs(amount - state.draftAmount) < 0.0001 ? "is-active" : ""}" type="button" data-amount="${amount}">+${formatFists(amount)}</button>`
  ).join("");
  nodes.customAmount.value = state.draftAmount;
  nodes.draftHint.textContent = `${CATEGORY_MAP[state.draftCategory].label} · ${formatFists(state.draftAmount)}`;
  nodes.entryCountText.textContent = `${day.entries.length} 条`;
  nodes.entryList.innerHTML = renderEntryList(day);
  nodes.completeTodayBtn.disabled = day.entries.length === 0;
  nodes.completeTodayBtn.textContent = day.completed ? "今天已完成" : "完成今天";
}

function statusSentence(day, remain, isOver) {
  const categoryOver = CATEGORIES.filter((category) => categoryUsed(day, category.id) > category.quota)
    .map((category) => category.label);
  if (day.completed && (isOver || categoryOver.length)) return "今天已保存，但总量或分类已经超过目标。";
  if (day.completed) return "今天已完成，记录已保存在本机。";
  if (!day.entries.length) return "点下方 + 记录食物，开始记录今天吃了几拳。";
  if (isOver) return `总量已经超过 ${formatFists(Math.abs(remain))}，仍可作为真实记录保存。`;
  if (categoryOver.length) return `${categoryOver.join("、")} 已超过目标，后面尽量换到其他类别。`;
  return `还剩 ${formatFists(remain)}，按今天实际吃的继续记录。`;
}

function renderEntryList(day) {
  if (!day.entries.length) {
    return `<p class="empty-text">今天还没有记录。</p>`;
  }
  const latestEntry = day.entries[day.entries.length - 1];
  const hiddenCount = Math.max(0, day.entries.length - 1);
  const entryHtml = [latestEntry].map((entry) => {
    const category = CATEGORY_MAP[entry.category] || CATEGORY_MAP.low;
    return `
      <article class="entry-item">
        <div class="entry-main">
          <strong>${category.label} · ${formatFists(entry.fists)}${entry.name ? ` · ${escapeHtml(entry.name)}` : ""}</strong>
          <p class="entry-meta">约 ${formatCalories(entryCalories(entry))} · ${entry.time}</p>
        </div>
        <button class="entry-remove" type="button" data-remove-entry="${escapeHtml(entry.id)}" aria-label="删除这条记录">×</button>
      </article>
    `;
  }).join("");
  const moreText = hiddenCount ? `<p class="more-text">其余 ${hiddenCount} 条已计入今天，第三页看统计。</p>` : "";
  return entryHtml + moreText;
}

function syncPlanLinks(day) {
  const entryIds = new Set(day.entries.map((entry) => entry.id));
  day.plan.forEach((item) => {
    if (item.checked && (!item.entryId || !entryIds.has(item.entryId))) {
      item.checked = false;
      item.entryId = "";
    }
  });
}

function renderPlan() {
  const day = getToday();
  syncPlanLinks(day);
  const checkedFists = roundTenth(day.plan
    .filter((item) => item.checked)
    .reduce((sum, item) => sum + Number(item.fists || 0), 0));
  nodes.planProgressText.textContent = `${formatFistsTight(checkedFists)}/8 已打卡`;
  nodes.planList.innerHTML = day.plan.map(renderPlanItem).join("");
}

function renderPlanItem(item) {
  const category = CATEGORY_MAP[item.category] || CATEGORY_MAP.low;
  const checked = Boolean(item.checked);
  return `
    <article class="plan-item ${checked ? "is-checked" : ""}">
      <div class="plan-item-head">
        <span class="plan-tag">${category.label}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <em>${formatFistsTight(item.fists)}</em>
      </div>
      <div class="plan-item-body">
        <input
          class="plan-input"
          type="text"
          autocomplete="off"
          data-plan-name="${escapeHtml(item.id)}"
          value="${escapeHtml(item.name)}"
          placeholder="${escapeHtml(item.placeholder)}"
          aria-label="${escapeHtml(item.title)}计划吃什么"
        >
        <button class="plan-check ${checked ? "is-checked" : ""}" type="button" data-plan-toggle="${escapeHtml(item.id)}">
          ${checked ? "已打卡" : "打卡"}
        </button>
      </div>
    </article>
  `;
}

function renderRules() {
  nodes.ruleList.innerHTML = CATEGORIES.map((category) => `
    <article class="rule-row">
      <strong>${category.label} · ${quotaText(category)}</strong>
      <p>${category.examples}</p>
      <span>${category.note}</span>
    </article>
  `).join("");
}

function renderRecords() {
  const days = Object.values(state.days)
    .filter((day) => day.entries.length || day.completed)
    .sort((a, b) => b.date.localeCompare(a.date));
  const today = getToday();
  const completed = days.filter((day) => day.completed);
  const withinTarget = completed.filter((day) => dayStatus(day).tone !== "over");
  const totalUsed = days.reduce((sum, day) => sum + usedFists(day), 0);
  const avg = days.length ? roundTenth(totalUsed / days.length) : 0;

  nodes.statsGrid.innerHTML = [
    statCard("今日拳头", formatFists(usedFists(today))),
    statCard("今日粗算", today.entries.length ? formatCalories(dayCalories(today)) : "--"),
    statCard("打卡天数", `${completed.length} 天`),
    statCard("达标天数", `${withinTarget.length} 天`),
    statCard("累计拳头", formatFists(totalUsed)),
    statCard("日均拳头", days.length ? formatFists(avg) : "--")
  ].join("");

  nodes.historyCountText.textContent = `${days.length} 天`;
  nodes.historyList.innerHTML = days.length ? days.slice(0, 30).map(renderHistoryItem).join("") : `<p class="empty-text">完成今天后，这里会出现记录。</p>`;
}

function statCard(label, value) {
  return `
    <article class="stat-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `;
}

function renderHistoryItem(day) {
  const result = dayStatus(day);
  return `
    <article class="history-item">
      <div class="history-main">
        <strong>${day.date} · ${formatFists(usedFists(day))} / 8 拳</strong>
        <p class="history-meta">全天约 ${formatCalories(dayCalories(day))} · ${day.entries.length} 条记录</p>
      </div>
      <span class="result-pill ${result.tone}">${result.text}</span>
    </article>
  `;
}

function addEntry() {
  if (!validAmount(state.draftAmount)) return;
  const day = getToday();
  day.completed = false;
  const entry = {
    id: String(Date.now()),
    category: state.draftCategory,
    fists: Number(state.draftAmount),
    time: timeLabel(new Date())
  };
  const name = state.draftName.trim();
  if (name) entry.name = name;
  day.entries.push(entry);
  state.draftName = "";
  saveState();
  closeEntrySheet();
  renderAll();
}

function updatePlanName(id, value) {
  const day = getToday();
  const item = day.plan.find((planItem) => planItem.id === id);
  if (!item) return;
  item.name = value.slice(0, 30);
  if (item.checked && item.entryId) {
    const linkedEntry = day.entries.find((entry) => entry.id === item.entryId);
    if (linkedEntry) linkedEntry.name = item.name || item.title;
  }
  saveState();
}

function togglePlanItem(id) {
  const day = getToday();
  const item = day.plan.find((planItem) => planItem.id === id);
  if (!item) return;
  if (item.checked) {
    day.entries = day.entries.filter((entry) => entry.id !== item.entryId);
    item.checked = false;
    item.entryId = "";
    day.completed = false;
  } else {
    const entry = {
      id: String(Date.now()),
      category: item.category,
      fists: Number(item.fists),
      time: timeLabel(new Date()),
      name: item.name.trim() || item.title,
      planId: item.id
    };
    day.entries.push(entry);
    item.checked = true;
    item.entryId = entry.id;
    day.completed = false;
  }
  saveState();
  renderAll();
}

function addSnackPlan() {
  const day = getToday();
  if (day.plan.some((item) => item.category === "snack")) return;
  day.plan.push({
    id: `snack-${Date.now()}`,
    category: "snack",
    fists: 1,
    title: "零食可选 1拳",
    placeholder: "饼干、蛋糕、奶茶小份",
    name: "",
    checked: false,
    entryId: ""
  });
  saveState();
  renderAll();
}

function resetPlan() {
  const day = getToday();
  if (!window.confirm("确定重置今天的饮食计划吗？已通过计划打卡生成的记录也会同步删除。")) return;
  const planEntryIds = new Set(day.plan.map((item) => item.entryId).filter(Boolean));
  day.entries = day.entries.filter((entry) => !planEntryIds.has(entry.id));
  day.plan = defaultPlan();
  day.completed = false;
  saveState();
  renderAll();
}

function removeEntry(id) {
  const day = getToday();
  day.entries = day.entries.filter((entry) => entry.id !== id);
  day.plan.forEach((item) => {
    if (item.entryId === id) {
      item.checked = false;
      item.entryId = "";
    }
  });
  if (!day.entries.length) day.completed = false;
  saveState();
  renderAll();
}

function completeToday() {
  const day = getToday();
  if (!day.entries.length) return;
  day.completed = true;
  saveState();
  renderAll();
}

function resetToday() {
  const day = getToday();
  if (!day.entries.length && !day.completed) return;
  if (!window.confirm("确定清空今天的记录吗？")) return;
  state.days[todayKey()] = {
    date: todayKey(),
    entries: [],
    plan: defaultPlan(),
    completed: false
  };
  saveState();
  renderAll();
}

function openEntrySheet() {
  nodes.entrySheet.hidden = false;
  document.body.classList.add("sheet-open");
  window.setTimeout(() => nodes.foodNameInput.focus(), 80);
}

function closeEntrySheet() {
  nodes.entrySheet.hidden = true;
  document.body.classList.remove("sheet-open");
}

document.body.addEventListener("click", (event) => {
  const tabButton = event.target.closest("[data-tab]");
  if (tabButton) {
    switchTab(tabButton.dataset.tab);
    return;
  }

  const categoryButton = event.target.closest("[data-category]");
  if (categoryButton) {
    state.draftCategory = categoryButton.dataset.category;
    saveState();
    renderAll();
    return;
  }

  const amountButton = event.target.closest("[data-amount]");
  if (amountButton) {
    state.draftAmount = Number(amountButton.dataset.amount);
    saveState();
    renderAll();
    return;
  }

  const removeButton = event.target.closest("[data-remove-entry]");
  if (removeButton) {
    removeEntry(removeButton.dataset.removeEntry);
    return;
  }

  const planToggle = event.target.closest("[data-plan-toggle]");
  if (planToggle) {
    togglePlanItem(planToggle.dataset.planToggle);
    return;
  }

  if (event.target === nodes.entrySheet) {
    closeEntrySheet();
  }
});

document.body.addEventListener("input", (event) => {
  const planInput = event.target.closest("[data-plan-name]");
  if (planInput) {
    updatePlanName(planInput.dataset.planName, planInput.value);
  }
});

nodes.foodNameInput.addEventListener("input", (event) => {
  state.draftName = event.target.value.slice(0, 30);
  saveState();
  renderToday();
});

nodes.customAmount.addEventListener("input", (event) => {
  const value = Number(event.target.value);
  if (!validAmount(value)) return;
  state.draftAmount = value;
  saveState();
  renderAll();
});

nodes.addEntryBtn.addEventListener("click", addEntry);
nodes.openEntryBtn.addEventListener("click", openEntrySheet);
nodes.closeEntryBtn.addEventListener("click", closeEntrySheet);
nodes.completeTodayBtn.addEventListener("click", completeToday);
nodes.resetTodayBtn.addEventListener("click", resetToday);
nodes.addSnackPlanBtn.addEventListener("click", addSnackPlan);
nodes.resetPlanBtn.addEventListener("click", resetPlan);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !nodes.entrySheet.hidden) closeEntrySheet();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`./sw.js?v=${RESOURCE_VERSION}`).catch(() => {});
  });
}

renderAll();
