// The to-do panel: due soon, your own list, the weekly ring and the streak.
"use strict";

function ringSVG(done, total)
{
  const r = 19,
    c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return `<svg class="bl-ring" viewBox="0 0 46 46" aria-hidden="true">
    <circle class="bl-ring-track" cx="23" cy="23" r="${r}" fill="none" stroke-width="5"/>
    <circle class="bl-ring-fill" cx="23" cy="23" r="${r}" fill="none" stroke-width="5"
      stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(2)}"/>
  </svg>`;
}

function themeBtnHTML()
{
  const dark = isDark();
  return `<button class="bl-icon-btn" type="button" data-act="theme" data-fk="theme"
    aria-label="Switch to ${dark ? "light" : "dark"} theme">${dark ? ICON.sun : ICON.moon}</button>`;
}

function itemHTML(m, it)
{
  const done = isDone(it);
  const cid = `bl-${m.id}-${it.key.replace(/[^a-z0-9]/gi, "-")}`;
  const color = it.courseId ? courseColor(it.courseId) : "";
  const meta = [
    `<span class="bl-dot" style="${color ? `--c:${esc(color)}` : ""}" aria-hidden="true"></span>`,
    it.course ? `<span class="bl-seg">${esc(it.course)}</span>` : "",
    `<span class="bl-seg">${esc(fmtDue(it.due))}</span>`,
    it.points != null ? `<span class="bl-seg">${esc(it.points)} pts</span>` : "",
  ].join("");
  const tag = it.submitted
    ? '<span class="bl-tag is-submitted">Submitted</span>'
    : it.missing && !it.marked
      ? '<span class="bl-tag is-missing">Missing</span>'
      : "<span></span>";
  const title = it.url
    ? `<a class="bl-item-title" href="${esc(it.url)}" data-fk="link:${esc(it.key)}">${esc(it.title)}</a>`
    : `<span class="bl-item-title">${esc(it.title)}</span>`;
  return `<li class="bl-item${done ? " is-done" : ""}">
    <input class="bl-check" type="checkbox" id="${cid}" data-act="item" data-key="${esc(it.key)}" data-fk="item:${esc(it.key)}"
      ${done ? "checked" : ""} ${it.submitted ? "disabled" : ""}
      aria-label="${it.submitted ? "Submitted: " : "Mark done: "}${esc(it.title)}">
    <div class="bl-item-body">${title}<p class="bl-item-meta">${meta}</p></div>
    ${tag}
  </li>`;
}

function dueHTML(m)
{
  if (state.items === null)
  {
    return state.itemsError
      ? '<div class="bl-empty"><strong>Could not reach the Canvas planner</strong>Refresh the page to try again.</div>'
      : '<div class="bl-empty" aria-busy="true"><strong>Loading your week…</strong></div>';
  }
  const now = Date.now();
  const today = startOfDay(new Date()).getTime();
  const day = 86400000;
  const groups = [
    { name: "Overdue", cls: "is-overdue", test: t => t < now, list: [] },
    { name: "Today", test: t => t < today + day, list: [] },
    { name: "Tomorrow", test: t => t < today + 2 * day, list: [] },
    { name: "Next 7 days", test: t => t < today + 8 * day, list: [] },
    { name: "Later", test: () => true, list: [] },
  ];
  const items = state.items
    .filter(i => i.due && !(isDone(i) && new Date(i.due).getTime() < today))
    .sort((a, b) => new Date(a.due) - new Date(b.due));
  for (const it of items)
  {
    const t = new Date(it.due).getTime();
    if (t < now && isDone(it))
    {
      groups[1].list.push(it);
      continue;
    }
    groups.find(g => g.test(t)).list.push(it);
  }
  const shown = groups.filter(g => g.list.length);
  if (!shown.length)
  {
    return '<div class="bl-empty"><strong>All clear ✦</strong>Nothing due in the next four weeks. Enjoy the quiet.</div>';
  }
  return (
    shown
      .map(
        g => `<section class="bl-group" aria-label="${g.name}">
      <h3 class="bl-group-title ${g.cls || ""}">${g.name}</h3>
      <ul class="bl-list">${g.list.map(it => itemHTML(m, it)).join("")}</ul>
    </section>`,
      )
      .join("") + '<p class="bl-note">Checking an item marks it done in your Canvas planner too.</p>'
  );
}

function todosHTML(m)
{
  const inputId = `bl-add-${m.id}`;
  const list = state.todos.length
    ? `<ul class="bl-list" style="margin-top:12px">${state.todos
      .map(
        t => `<li class="bl-item${t.done ? " is-done" : ""}">
        <input class="bl-check" type="checkbox" data-act="todo" data-id="${esc(t.id)}" data-fk="todo:${esc(t.id)}" ${t.done ? "checked" : ""}
          aria-label="Mark done: ${esc(t.text)}">
        <div class="bl-item-body"><span class="bl-item-title">${esc(t.text)}</span></div>
        <button class="bl-del" type="button" data-act="del" data-id="${esc(t.id)}" data-fk="del:${esc(t.id)}" aria-label="Delete: ${esc(t.text)}">${ICON.trash}</button>
      </li>`,
      )
      .join("")}</ul>`
    : '<div class="bl-empty"><strong>Your list is empty</strong>Add anything: readings, emails, a nap.</div>';
  const anyDone = state.todos.some(t => t.done);
  return `<form class="bl-add" data-act="add">
      <label class="bl-sr" for="${inputId}">Add a to-do</label>
      <input class="bl-input" id="${inputId}" data-fk="add-input" maxlength="200" autocomplete="off" placeholder="Add something to do…">
      <button class="bl-btn" type="submit" data-fk="add-btn">Add</button>
    </form>
    ${list}
    ${anyDone ? '<div class="bl-row-end"><button class="bl-btn bl-btn-ghost" type="button" data-act="clear" data-fk="clear">Clear done</button></div>' : ""}`;
}

function panelHTML(m)
{
  const { done, total } = weekProgress();
  const s = streak();
  const tab = m.tab || "due";
  const openN = openCount();
  const todoOpen = state.todos.filter(t => !t.done).length;
  const date = new Date().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  return `<div class="bl-panel">
    <div class="bl-head">
      <div>
        <p class="bl-eyebrow"><b>//</b> ${settings.hero ? "your week" : esc(date)}</p>
        <h2 class="bl-hello" id="bl-hello-${m.id}" tabindex="-1">${settings.hero ? "Up next" : esc(greeting())}</h2>
      </div>
      <div class="bl-head-actions">
        ${themeBtnHTML()}
        ${m.withClose ? `<button class="bl-icon-btn" type="button" data-act="close" data-fk="close" aria-label="Collapse panel" aria-keyshortcuts="t">${ICON.collapse}</button>` : ""}
      </div>
    </div>
    <div class="bl-stats">
      ${ringSVG(done, total)}
      <div>
        <p class="bl-stat-big">${done}/${total}</p>
        <p class="bl-stat-label">done this week</p>
      </div>
      <div class="bl-streak">
        <p class="bl-stat-big">${s}</p>
        <p class="bl-stat-label">day streak</p>
      </div>
    </div>
    <div class="bl-tabs" role="tablist" aria-label="Lists">
      <button class="bl-tab" type="button" role="tab" id="bl-tab-due-${m.id}" data-act="tab" data-tab="due" data-fk="tab:due"
        aria-selected="${tab === "due"}" aria-controls="bl-tp-${m.id}" tabindex="${tab === "due" ? 0 : -1}">
        Due soon <span class="bl-count">${openN}</span></button>
      <button class="bl-tab" type="button" role="tab" id="bl-tab-mine-${m.id}" data-act="tab" data-tab="mine" data-fk="tab:mine"
        aria-selected="${tab === "mine"}" aria-controls="bl-tp-${m.id}" tabindex="${tab === "mine" ? 0 : -1}">
        My list <span class="bl-count">${todoOpen}</span></button>
    </div>
    <div role="tabpanel" id="bl-tp-${m.id}" aria-labelledby="bl-tab-${tab}-${m.id}">
      ${tab === "due" ? dueHTML(m) : todosHTML(m)}
    </div>
  </div>`;
}

function renderPanels()
{
  for (const m of mounts)
  {
    if (!m.el.isConnected || m.el.hidden) continue;
    const active = m.el.getRootNode().activeElement;
    const fk = active && m.el.contains(active) ? active.getAttribute("data-fk") : null;
    const draft = m.el.querySelector('[data-fk="add-input"]');
    const draftVal = draft ? draft.value : "";
    m.el.innerHTML = panelHTML(m);
    const newDraft = m.el.querySelector('[data-fk="add-input"]');
    if (newDraft) newDraft.value = draftVal;
    if (fk)
    {
      const target =
        m.el.querySelector(`[data-fk="${CSS.escape(fk)}"]`) || m.el.querySelector(`#bl-hello-${m.id}`);
      if (target) target.focus();
    }
  }
  updateRail();
  renderHero();
  renderCalm();
}
