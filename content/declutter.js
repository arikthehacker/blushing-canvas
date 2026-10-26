// Super declutter: hides the dashboard except what is due before midnight tonight.
"use strict";

// On the dashboard, hides everything except what is due before midnight tonight.
const calmOn = () => !!settings.stress && location.pathname === "/";
function tonightItems()
{
  if (!state.items) return null;
  const start = startOfDay(new Date()).getTime();
  const end = start + 86400000;
  return state.items
    .filter(i => i.due && new Date(i.due).getTime() >= start && new Date(i.due).getTime() < end)
    .filter(i => !isDone(i) || i.calmSeen)
    .sort((a, b) => new Date(a.due) - new Date(b.due));
}
function untilText(iso)
{
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "time passed, still worth turning in";
  const h = Math.floor(ms / 3600000),
    m = Math.round((ms % 3600000) / 60000);
  return h ? `in ${h}h ${m}m` : `in ${m} min`;
}
function calmItemHTML(it)
{
  const done = isDone(it);
  const time = new Date(it.due).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const title = it.url
    ? `<a class="bl-calm-title" href="${esc(it.url)}">${esc(it.title)}</a>`
    : `<span class="bl-calm-title">${esc(it.title)}</span>`;
  return `<li class="bl-calm-item${done ? " is-done" : ""}">
    <input class="bl-check bl-calm-check" type="checkbox" data-calm="${esc(it.key)}" ${done ? "checked" : ""} ${it.submitted ? "disabled" : ""}
      aria-label="${it.submitted ? "Submitted: " : "Mark done: "}${esc(it.title)}">
    <div class="bl-calm-body">
      ${title}
      <p class="bl-calm-meta">${esc(it.course)}${it.course ? " · " : ""}${it.points != null ? `${esc(it.points)} pts` : ""}</p>
    </div>
    <div class="bl-calm-when"><strong>${esc(time)}</strong><span>${done ? "done" : esc(untilText(it.due))}</span></div>
  </li>`;
}
function renderCalm()
{
  if (!uiRoot) return;
  let el = uiRoot.querySelector("#bl-calm");
  const on = calmOn();
  root.classList.toggle("bl-stress", on);
  if (!on)
  {
    if (el) el.hidden = true;
    return;
  }
  if (!el)
  {
    el = document.createElement("div");
    el.id = "bl-calm";
    el.className = "bl-calm";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "bl-calm-h");
    uiRoot.appendChild(el);
    el.addEventListener("change", e =>
    {
      const key = e.target.dataset.calm;
      if (!key) return;
      const it = state.items.find(i => i.key === key);
      if (it) it.calmSeen = true; // keep it on screen, crossed off
      setItemDone(key, e.target.checked);
    });
    el.addEventListener("click", e =>
    {
      if (e.target.closest("[data-calm-exit]"))
      {
        settings.stress = false;
        saveSettings();
        applySettings();
        renderCalm();
      }
    });
  }
  const wasHidden = el.hidden;
  el.hidden = false;
  const list = tonightItems();
  const open = list ? list.filter(i => !isDone(i)) : [];
  const next = !list || list.length ? null : nextUp();
  let sub;
  if (!list) sub = "Checking what is due tonight…";
  else if (!list.length) sub = "Nothing is due tonight. You can breathe.";
  else if (!open.length) sub = "All of tonight is done. You did it.";
  else
    sub = `${open.length === 1 ? "Just one thing is" : `${open.length} things are`} due before midnight. That is it. Everything else can wait.`;
  el.innerHTML = `
    <div class="bl-calm-inner">
      <p class="bl-eyebrow"><b>//</b> super declutter</p>
      <h2 class="bl-calm-h" id="bl-calm-h" tabindex="-1">${list && list.length && !open.length ? "Tonight is handled." : "Just tonight."}</h2>
      <p class="bl-calm-sub">${esc(sub)}</p>
      ${list && list.length ? `<ol class="bl-calm-list">${list.map(calmItemHTML).join("")}</ol>` : ""}
      ${next ? `<p class="bl-calm-next">Next thing on the horizon: <a href="${esc(next.url || "#")}">${esc(next.title)}</a> · ${esc(fmtDue(next.due))}</p>` : ""}
      <div class="bl-calm-breathe" aria-hidden="true"><span class="bl-calm-dot"></span><span>Breathe in for 4, out for 6. One thing at a time.</span></div>
      <button class="bl-calm-exit" type="button" data-calm-exit>I feel better. Bring my dashboard back.</button>
    </div>`;
  if (wasHidden)
  {
    const h = el.querySelector("#bl-calm-h");
    if (h) h.focus();
  }
}
setInterval(() =>
{
  if (calmOn()) renderCalm();
}, 60000);
