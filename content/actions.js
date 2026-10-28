// What happens when you check something off: the Canvas planner sync, cheers and toasts.
"use strict";

// one Canvas request at a time per item, in click order, so a quick check and uncheck can't race
const itemSync = new Map();
async function setItemDone(key, done)
{
  const it = state.items && state.items.find(i => i.key === key);
  if (!it || it.submitted) return;
  it.marked = done;
  it.markedAt = Date.now();
  recordWin(done ? 1 : -1);
  renderPanels();
  if (done) cheer();
  const run = (itemSync.get(key) || Promise.resolve()).then(() => syncItem(it, done));
  itemSync.set(
    key,
    run.catch(() =>
    {}),
  );
  try
  {
    await run;
    store.set("local", lk("items"), { t: state.itemsAt || Date.now(), v: state.items });
  }
  catch (e)
  {
    // a refresh may have swapped in a new copy of the item meanwhile
    const cur = state.items.find(i => i.key === key) || it;
    it.marked = cur.marked = !done;
    recordWin(done ? -1 : 1);
    renderPanels();
    toast("Could not sync that with Canvas. Try again in a moment.", false);
  }
}
async function syncItem(it, done)
{
  if (it.overrideId)
  {
    await api(`/api/v1/planner/overrides/${it.overrideId}`, {
      method: "PUT",
      body: { marked_complete: done },
    });
    return;
  }
  const o = await api("/api/v1/planner/overrides", {
    method: "POST",
    body: { plannable_type: it.type, plannable_id: it.id, marked_complete: done },
  });
  if (o && o.id) it.overrideId = o.id;
}

function saveTodos()
{
  store.set("local", lk("todos"), state.todos);
}
function recordWin(delta)
{
  const key = dayKey(new Date());
  state.wins[key] = Math.max(0, (state.wins[key] || 0) + delta);
  if (!state.wins[key]) delete state.wins[key];
  // keep about 120 days
  const keys = Object.keys(state.wins).sort();
  while (keys.length > 120) delete state.wins[keys.shift()];
  store.set("local", "bl:wins", state.wins);
}

const CHEERS = [
  "One down. Look at you go.",
  "Checked off. Future you says thanks.",
  "Small wins stack up.",
  "Progress, logged.",
  "Clean. On to the next.",
  "You are on a roll.",
  "That is how it gets done.",
  "Momentum looks good on you.",
  "Done and dusted.",
  "Another one handled.",
];
function cheer()
{
  if (!settings.cheers) return;
  const today = state.wins[dayKey(new Date())] || 0;
  const { done, total } = weekProgress();
  const s = streak();
  let msg = CHEERS[Math.floor(Math.random() * CHEERS.length)];
  if (total && done === total) msg = "Everything due this week is done. Take a breather.";
  else if (today === 1 && s > 1) msg = `${s} day streak. Keep it glowing.`;
  else if (today === 3 || today === 5 || today === 10)
    msg = `${today} things done today. That is a real day.`;
  toast(msg, true);
}

function toast(msg, sparkle)
{
  if (!uiRoot) return;
  const wrap = uiRoot.querySelector(".bl-toasts");
  const el = document.createElement("div");
  el.className = "bl-toast";
  el.innerHTML = `${sparkle ? '<span class="bl-toast-spark" aria-hidden="true">✦</span>' : ""}<span>${esc(msg)}</span>`;
  wrap.appendChild(el);
  const live = uiRoot.querySelector("#bl-live");
  live.textContent = "";
  setTimeout(() =>
  {
    live.textContent = msg;
  }, 30);
  const motion = !settings.calm && !reduceMQ.matches;
  if (motion && el.animate)
  {
    el.animate(
      [
        { opacity: 0, transform: "translateY(8px) scale(0.98)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 180, easing: "ease-out" },
    );
  }
  setTimeout(() => el.remove(), 3200);
}

function handlePanelEvents(container, m)
{
  container.addEventListener("click", e =>
  {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "theme")
    {
      settings.theme = isDark() ? "light" : "dark";
      applySettings();
      saveSettings();
    }
    else if (act === "close")
    {
      closeDrawer();
    }
    else if (act === "refresh")
    {
      refreshItems().then(ok =>
      {
        const live = uiRoot.querySelector("#bl-live");
        if (!live || ok === undefined) return;
        live.textContent = "";
        setTimeout(() =>
        {
          live.textContent = ok ? "Your list is up to date." : "Couldn't refresh. Showing your saved list.";
        }, 30);
      });
    }
    else if (act === "overdue")
    {
      overdueOpen = !overdueOpen;
      renderPanels();
    }
    else if (act === "welcomed")
    {
      state.welcomed = true;
      store.set("local", "bl:welcomed", true);
      renderPanels();
    }
    else if (act === "tab")
    {
      m.tab = btn.dataset.tab;
      renderPanels();
    }
    else if (act === "del")
    {
      state.todos = state.todos.filter(t => t.id !== btn.dataset.id);
      saveTodos();
      renderPanels();
      const input = m.el.querySelector('[data-fk="add-input"]');
      if (input) input.focus();
    }
    else if (act === "clear")
    {
      state.todos = state.todos.filter(t => !t.done);
      saveTodos();
      renderPanels();
      const input = m.el.querySelector('[data-fk="add-input"]');
      if (input) input.focus();
    }
  });
  container.addEventListener("change", e =>
  {
    const el = e.target;
    if (el.dataset.act === "item") setItemDone(el.dataset.key, el.checked);
    if (el.dataset.act === "todo")
    {
      const t = state.todos.find(x => x.id === el.dataset.id);
      if (!t) return;
      t.done = el.checked;
      recordWin(t.done ? 1 : -1);
      saveTodos();
      renderPanels();
      if (t.done) cheer();
    }
  });
  container.addEventListener("submit", e =>
  {
    e.preventDefault();
    const input = e.target.querySelector("input");
    const text = input.value.trim();
    if (!text) return;
    state.todos.unshift({ id: uid(), text, done: false, created: Date.now() });
    input.value = "";
    saveTodos();
    renderPanels();
    const again = m.el.querySelector('[data-fk="add-input"]');
    if (again) again.focus();
  });
  // arrow keys move between tabs (ARIA tabs pattern)
  container.addEventListener("keydown", e =>
  {
    const tab = e.target.closest && e.target.closest('[role="tab"]');
    if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    m.tab = m.tab === "mine" ? "due" : "mine";
    if (e.key === "Home") m.tab = "due";
    if (e.key === "End") m.tab = "mine";
    renderPanels();
    const next = m.el.querySelector(`[data-fk="tab:${m.tab}"]`);
    if (next) next.focus();
  });
}
