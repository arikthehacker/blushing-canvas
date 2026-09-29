// Small shared helpers: escaping, dates, greetings, weekly progress and icons.
"use strict";

const esc = s =>
  String(s == null ? "" : s).replace(
    /[&<>"']/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const dayKey = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const startOfDay = d =>
{
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const courseIdFromPath = () =>
{
  const m = location.pathname.match(/^\/courses\/(\d+)/);
  return m ? m[1] : null;
};
const courseColor = id => state.colors[`course_${id}`] || "";
const uid = () => Math.random().toString(36).slice(2, 10);

function fmtDue(iso)
{
  if (!iso) return "No date";
  const d = new Date(iso);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const today = startOfDay(new Date());
  const diff = Math.round((startOfDay(d) - today) / 86400000);
  if (diff === 0) return `Today ${time}`;
  if (diff === 1) return `Tomorrow ${time}`;
  if (diff === -1) return `Yesterday ${time}`;
  if (diff > 1 && diff < 7) return `${d.toLocaleDateString([], { weekday: "short" })} ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}
function greeting()
{
  const h = new Date().getHours();
  const part = h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return state.user && state.user.name ? `${part}, ${state.user.name.split(" ")[0]}` : part;
}
function weekBounds()
{
  const now = new Date();
  const mon = startOfDay(now);
  mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
  const next = new Date(mon);
  next.setDate(next.getDate() + 7);
  return [mon, next];
}
function weekProgress()
{
  if (!state.items) return { done: 0, total: 0 };
  const [a, b] = weekBounds();
  const inWeek = state.items.filter(i => i.due && new Date(i.due) >= a && new Date(i.due) < b);
  return { done: inWeek.filter(isDone).length, total: inWeek.length };
}
function streak()
{
  let n = 0;
  const d = new Date();
  if (!state.wins[dayKey(d)]) d.setDate(d.getDate() - 1); // today not started yet still keeps yesterday's streak
  while (state.wins[dayKey(d)])
  {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
function openCount()
{
  if (!state.items) return 0;
  const horizon = Date.now() + 7 * 86400000;
  return state.items.filter(i => !isDone(i) && i.due && new Date(i.due).getTime() < horizon).length;
}

const ICON = {
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  trash:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
};

let uiRoot = null; // shadow root for fab/drawer/dialogs/toasts
const mounts = []; // { id, el (container), withClose }
let uiCssText = "";

async function makeShadow(host)
{
  const sr = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = uiCssText;
  sr.appendChild(style);
  return sr;
}
