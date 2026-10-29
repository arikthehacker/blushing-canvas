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
    aria-label="Switch to ${dark ? "light" : "dark"} theme" title="${dark ? "Light" : "Dark"} theme">${dark ? ICON.sun : ICON.moon}</button>`;
}

const REFRESH_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>';
const DAY_MS = 86400000;
const timeOf = t => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// "in 1h 15m" for anything due within a day, empty otherwise
function leftText(iso)
{
  const min = Math.ceil((new Date(iso).getTime() - Date.now()) / 60000);
  if (min <= 0 || min > 1440) return "";
  if (min < 60) return `in ${min} min`;
  return `in ${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ""}`;
}
function lateText(iso)
{
  const d = new Date(iso);
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / DAY_MS);
  if (days >= 1) return `${days} day${days > 1 ? "s" : ""} late`;
  const min = Math.max(1, Math.floor((Date.now() - d.getTime()) / 60000));
  return min < 60 ? `${min} min late` : `${Math.floor(min / 60)}h late`;
}
function whenHTML(it, short)
{
  const when = short ? timeOf(it.due) : fmtDue(it.due);
  let extra = "";
  if (!isDone(it) && new Date(it.due).getTime() < Date.now()) extra = esc(lateText(it.due));
  else if (!isDone(it) && leftText(it.due))
    extra = `<b class="bl-left" data-left="${esc(it.due)}">${esc(leftText(it.due))}</b>`;
  // the no-break space keeps a wrapped line from starting with the dot
  return `<span class="bl-when">${esc(when)}${extra ? `<span class="bl-nw">&nbsp;· ${extra}</span>` : ""}</span>`;
}

function updatedText()
{
  const t = state.itemsAt;
  if (!t) return "";
  if (state.itemsError)
  {
    const from =
      dayKey(new Date(t)) === dayKey(new Date()) ? timeOf(t) : fmtDue(t).replace(/^Yesterday/, "yesterday");
    return `Couldn't refresh. Showing your list from ${from}.`;
  }
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1) return "Updated just now";
  if (min < 60) return `Updated ${min} min ago`;
  if (min < 1440) return `Updated ${Math.floor(min / 60)} hr ago`;
  return `Updated ${new Date(t).toLocaleDateString([], { month: "short", day: "numeric" })}`;
}
function updatedHTML()
{
  const busy = state.itemsBusy;
  return `<div class="bl-updated${state.itemsError ? " is-error" : ""}">
    <p class="bl-updated-text" data-updated>${esc(updatedText())}</p>
    <button class="bl-icon-btn bl-refresh${busy ? " is-busy" : ""}" type="button" data-act="refresh" data-fk="refresh"
      aria-label="Refresh from Canvas" title="Refresh from Canvas"${busy ? ' aria-busy="true"' : ""}>${REFRESH_ICON}</button>
  </div>`;
}
// keeps "Updated 3 min ago" and the countdowns current without redrawing the column
function tickPanels()
{
  if (document.hidden) return;
  for (const m of mounts)
  {
    if (!m.el.isConnected || m.el.hidden) continue;
    const u = m.el.querySelector("[data-updated]");
    if (u) u.textContent = updatedText();
    for (const el of m.el.querySelectorAll("[data-left]"))
    {
      const left = leftText(el.dataset.left);
      // something just came due, so it moves to Overdue
      if (!left) return renderPanels();
      el.textContent = left;
    }
  }
}

function welcomeHTML()
{
  if (state.welcomed) return "";
  return `<div class="bl-welcome">
    <p class="bl-eyebrow"><b>//</b> new here</p>
    <p class="bl-welcome-text"><kbd>Ctrl+K</kbd> jumps anywhere. <kbd>T</kbd> folds this column. <kbd>?</kbd> lists every shortcut. Your settings are under the Blush icon in Chrome's toolbar.</p>
    <div class="bl-row-end"><button class="bl-btn bl-btn-ghost" type="button" data-act="welcomed" data-fk="welcomed">Got it</button></div>
  </div>`;
}

function itemHTML(m, it, short)
{
  const done = isDone(it);
  const cid = `bl-${m.id}-${it.key.replace(/[^a-z0-9]/gi, "-")}`;
  const color = it.courseId ? courseColor(it.courseId) : "";
  const tag = it.submitted
    ? '<span class="bl-tag is-submitted">Submitted</span>'
    : it.missing && !it.marked
      ? '<span class="bl-tag is-missing">Missing</span>'
      : "";
  const pts = it.points != null ? `${esc(it.points)} pts` : "";
  const course = it.course
    ? `${esc(it.course)}${pts ? `<span class="bl-nw">&nbsp;· ${pts}</span>` : ""}`
    : `<span class="bl-nw">${pts}</span>`;
  const title = it.url
    ? `<a class="bl-item-title" href="${esc(it.url)}" data-fk="link:${esc(it.key)}">${esc(it.title)}</a>`
    : `<span class="bl-item-title">${esc(it.title)}</span>`;
  const sticker = done ? party.stickerHTML(it.key) : "";
  return `<li class="bl-item is-due${done ? " is-done" : ""}${sticker ? " has-sticker" : ""}">
    <input class="bl-check" type="checkbox" id="${cid}" data-act="item" data-key="${esc(it.key)}" data-fk="item:${esc(it.key)}"
      ${done ? "checked" : ""} ${it.submitted ? "disabled" : ""}
      aria-label="${it.submitted ? "Submitted: " : "Mark done: "}${esc(it.title)}"${it.submitted ? "" : ' title="Marks it done in your Canvas planner too"'}>
    <div class="bl-item-body">${title}
      <p class="bl-item-meta">${whenHTML(it, short)}${tag}</p>
      <p class="bl-item-course"><span class="bl-dot" style="${color ? `--c:${esc(color)}` : ""}" aria-hidden="true"></span>${course}</p>
    </div>${sticker}
  </li>`;
}

// the overdue pile folds to its 3 most pressing items, open or closed for this page only
let overdueOpen = false;
const OVERDUE_SHOWN = 3;

function groupHTML(m, g)
{
  const pts = g.list.reduce((sum, i) => sum + (i.points || 0), 0);
  const count = `${g.list.length}${pts >= 100 ? ` · ${Math.round(pts * 10) / 10} pts` : ""}`;
  const short = g.name === "Today" || g.name === "Tomorrow";
  const fold = g.name === "Overdue" && g.list.length > OVERDUE_SHOWN;
  const list = fold && !overdueOpen ? g.list.slice(0, OVERDUE_SHOWN) : g.list;
  const listId = `bl-list-${m.id}-${g.name.toLowerCase().replace(/\W+/g, "-")}`;
  const more = fold
    ? `<button class="bl-btn bl-btn-ghost bl-more" type="button" data-act="overdue" data-fk="overdue"
        aria-expanded="${overdueOpen}" aria-controls="${listId}">${
          overdueOpen ? "Show fewer overdue" : `Show ${g.list.length - OVERDUE_SHOWN} more overdue`
        }</button>`
    : "";
  return `<section class="bl-group" aria-label="${g.name}">
      <h3 class="bl-group-title ${g.cls || ""}"><span>${g.name}<span class="bl-group-count">&nbsp;· ${count}</span></span></h3>
      <ul class="bl-list" id="${listId}">${list.map(it => itemHTML(m, it, short)).join("")}</ul>
      ${more}
    </section>`;
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
  const groups = [
    { name: "Overdue", cls: "is-overdue", test: t => t < now, list: [] },
    { name: "Today", test: t => t < today + DAY_MS, list: [] },
    { name: "Tomorrow", test: t => t < today + 2 * DAY_MS, list: [] },
    { name: "Next 7 days", test: t => t < today + 8 * DAY_MS, list: [] },
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
  // missing first, then the most recent
  groups[0].list.sort((a, b) => b.missing - a.missing || new Date(b.due) - new Date(a.due));
  const shown = groups.filter(g => g.list.length);
  if (!shown.length)
  {
    return `<div class="bl-empty"><strong>All clear ✦</strong>Nothing due in the next four weeks. Enjoy the quiet.</div>${updatedHTML()}`;
  }
  return shown.map(g => groupHTML(m, g)).join("") + updatedHTML();
}

function todosHTML(m)
{
  const inputId = `bl-add-${m.id}`;
  const list = state.todos.length
    ? `<ul class="bl-list" style="margin-top:12px">${state.todos
      .map(t =>
      {
        const sticker = t.done ? party.stickerHTML("todo:" + t.id) : "";
        return `<li class="bl-item${t.done ? " is-done" : ""}${sticker ? " has-sticker" : ""}">
        <input class="bl-check" type="checkbox" data-act="todo" data-id="${esc(t.id)}" data-fk="todo:${esc(t.id)}" ${t.done ? "checked" : ""}
          aria-label="Mark done: ${esc(t.text)}">
        <div class="bl-item-body"><span class="bl-item-title">${esc(t.text)}</span></div>${sticker}
        <button class="bl-del" type="button" data-act="del" data-id="${esc(t.id)}" data-fk="del:${esc(t.id)}" aria-label="Delete: ${esc(t.text)}">${ICON.trash}</button>
      </li>`;
      })
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
        ${m.withClose ? `<button class="bl-icon-btn" type="button" data-act="close" data-fk="close" aria-label="Collapse panel" aria-keyshortcuts="t" title="Fold column (T)">${ICON.collapse}</button>` : ""}
      </div>
    </div>
    ${welcomeHTML()}
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
