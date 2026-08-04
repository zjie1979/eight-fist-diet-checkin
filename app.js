const STORAGE_KEY = "eightFistDietCheckin.v1";
const TOTAL_TARGET = 8;

const CATEGORIES = [
  {
    id: "low",
    label: "低热量",
    quota: 1,
    kcalPerFist: 30,
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
const TABS = ["today", "rules", "records"];

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
  entryCountText: document.querySelector("#entryCountText"),
  entryList: document.querySelector("#entryList"),
  completeTodayBtn: document.querySelector("#completeTodayBtn"),
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
  return entry;
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
      completed: false
    };
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
    return `
      <article class="category-card ${over ? "over" : ""}">
        <div>
          <strong>${category.label}</strong>
          <span>${formatFists(categoryTotal)} / ${quotaText(category)}</span>
        </div>
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
  if (!day.entries.length) return "先输入食物名称，再选择类别和拳头数。";
  if (isOver) return `总量已经超过 ${formatFists(Math.abs(remain))}，仍可作为真实记录保存。`;
  if (categoryOver.length) return `${categoryOver.join("、")} 已超过目标，后面尽量换到其他类别。`;
  return `还剩 ${formatFists(remain)}，按今天实际吃的继续记录。`;
}

function renderEntryList(day) {
  if (!day.entries.length) {
    return `<p class="empty-text">今天还没有记录。</p>`;
  }
  return day.entries.map((entry) => {
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
  renderAll();
}

function removeEntry(id) {
  const day = getToday();
  day.entries = day.entries.filter((entry) => entry.id !== id);
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
    completed: false
  };
  saveState();
  renderAll();
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
nodes.completeTodayBtn.addEventListener("click", completeToday);
nodes.resetTodayBtn.addEventListener("click", resetToday);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js?v=20260803t1").catch(() => {});
  });
}

renderAll();
