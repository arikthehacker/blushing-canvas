// Quick jump (Ctrl+K or /): search courses, sections, assignments and recent pages.
"use strict";

const GLOBAL_PAGES = [
  { label: "Dashboard", url: "/", keys: "home start" },
  { label: "Calendar", url: "/calendar", keys: "schedule" },
  { label: "Inbox", url: "/conversations", keys: "messages mail" },
  { label: "All grades", url: "/grades", keys: "scores" },
  { label: "My files", url: "/files", keys: "uploads" },
  { label: "Account settings", url: "/profile/settings", keys: "profile" },
  { label: "Notification settings", url: "/profile/communication", keys: "notifications email" },
];
const SECTIONS = [
  ["Home", ""],
  ["Announcements", "/announcements"],
  ["Assignments", "/assignments"],
  ["Discussions", "/discussion_topics"],
  ["Grades", "/grades"],
  ["Modules", "/modules"],
  ["Files", "/files"],
  ["Syllabus", "/assignments/syllabus"],
  ["Quizzes", "/quizzes"],
  ["Pages", "/pages"],
  ["People", "/users"],
];

function paletteEntries(q)
{
  const out = [];
  if (!q)
  {
    for (const r of state.recents.slice(0, 5))
      out.push({ kind: "Recent", label: r.title, sub: r.url, url: r.url });
    const cid = courseIdFromPath();
    const here = cid && state.courses.find(c => String(c.id) === cid);
    if (here)
      for (const [name, path] of SECTIONS.slice(1, 8))
        out.push({ kind: "This course", label: name, sub: here.name, url: `/courses/${here.id}${path}` });
    state.courses.forEach((c, i) =>
      out.push({
        kind: "Course",
        label: c.name,
        sub: `${c.code}${i < 9 ? `  ·  press ${i + 1}` : ""}`,
        url: `/courses/${c.id}`,
      }),
    );
    for (const g of GLOBAL_PAGES) out.push({ kind: "Page", label: g.label, sub: g.url, url: g.url });
    return dedupe(out).slice(0, 40);
  }
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  const cands = [];
  for (const g of GLOBAL_PAGES)
    cands.push({ kind: "Page", label: g.label, sub: g.url, url: g.url, hay: `${g.label} ${g.keys}`, w: 3 });
  for (const c of state.courses)
  {
    cands.push({
      kind: "Course",
      label: c.name,
      sub: c.code,
      url: `/courses/${c.id}`,
      hay: `${c.code} ${c.name}`,
      w: 4,
    });
    for (const [name, path] of SECTIONS.slice(1))
    {
      cands.push({
        kind: name,
        label: `${name}`,
        sub: c.name,
        url: `/courses/${c.id}${path}`,
        hay: `${c.code} ${c.name} ${name}`,
        w: 2,
      });
    }
  }
  for (const it of state.items || [])
  {
    if (!it.url) continue;
    cands.push({
      kind: isDone(it) ? "Done" : "Due",
      label: it.title,
      sub: `${it.course} · ${fmtDue(it.due)}`,
      url: it.url,
      hay: `${it.title} ${it.course}`,
      w: isDone(it) ? 0 : 2,
    });
  }
  for (const r of state.recents)
    cands.push({ kind: "Recent", label: r.title, sub: r.url, url: r.url, hay: r.title, w: 1 });
  const scored = [];
  for (const c of cands)
  {
    const hay = c.hay.toLowerCase();
    let score = c.w;
    let ok = true;
    for (const t of tokens)
    {
      const i = hay.indexOf(t);
      if (i < 0)
      {
        ok = false;
        break;
      }
      score += i === 0 ? 6 : /[\s\-_:(]/.test(hay[i - 1]) ? 4 : 1;
    }
    if (ok) scored.push([score, c]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  return dedupe(scored.map(s => s[1])).slice(0, 40);
}
function dedupe(list)
{
  const seen = new Set();
  return list.filter(e => (seen.has(e.url) ? false : (seen.add(e.url), true)));
}

const pal = { open: false, results: [], active: 0, lastFocus: null };
let specTimer = 0;

function openPalette(prefill = "")
{
  if (pal.open) return;
  closeHelp();
  pal.open = true;
  pal.lastFocus = deepActive();
  const scrim = uiRoot.querySelector("#bl-pal");
  scrim.hidden = false;
  const input = scrim.querySelector("input");
  input.value = prefill;
  updatePalette();
  input.focus();
  document.documentElement.style.overflow = "hidden";
}
function closePalette()
{
  if (!pal.open) return;
  pal.open = false;
  uiRoot.querySelector("#bl-pal").hidden = true;
  document.documentElement.style.overflow = "";
  speculate(null);
  if (pal.lastFocus && pal.lastFocus.focus) pal.lastFocus.focus();
}
function updatePalette()
{
  const input = uiRoot.querySelector("#bl-pal-input");
  pal.results = paletteEntries(input.value.trim());
  pal.active = 0;
  const list = uiRoot.querySelector("#bl-pal-list");
  list.innerHTML = pal.results.length
    ? pal.results
        .map(
          (
            r,
            i,
          ) => `<li class="bl-opt" role="option" id="bl-opt-${i}" data-i="${i}" aria-selected="${i === 0}">
        <span class="bl-opt-kind">${esc(r.kind)}</span>
        <span class="bl-opt-label">${esc(r.label)}</span>
        <span class="bl-opt-sub">${esc(r.sub)}</span>
      </li>`,
        )
        .join("")
    : '<li class="bl-pal-empty" role="presentation">No matches. Try a course code or “grades”.</li>';
  uiRoot.querySelector("#bl-pal-status").textContent =
    `${pal.results.length} result${pal.results.length === 1 ? "" : "s"}`;
  setActive(0);
}
function setActive(i)
{
  if (!pal.results.length)
  {
    uiRoot.querySelector("#bl-pal-input").removeAttribute("aria-activedescendant");
    return;
  }
  pal.active = (i + pal.results.length) % pal.results.length;
  const list = uiRoot.querySelector("#bl-pal-list");
  list
    .querySelectorAll(".bl-opt")
    .forEach(o => o.setAttribute("aria-selected", String(+o.dataset.i === pal.active)));
  const el = list.querySelector(`#bl-opt-${pal.active}`);
  uiRoot.querySelector("#bl-pal-input").setAttribute("aria-activedescendant", `bl-opt-${pal.active}`);
  if (el) el.scrollIntoView({ block: "nearest" });
  clearTimeout(specTimer);
  specTimer = setTimeout(() => speculate(pal.results[pal.active] && pal.results[pal.active].url), 90);
}
function go(url, newTab)
{
  if (!url) return;
  if (newTab)
  {
    window.open(url, "_blank", "noopener");
    return;
  }
  location.assign(url);
}

// the real focused element, even when it sits inside a shadow root
function deepActive()
{
  let a = document.activeElement;
  while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
  return a;
}
