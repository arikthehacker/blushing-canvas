// Super declutter: hides the dashboard except what is due before midnight tonight.
"use strict";

// your buddy holds the sign, and tapping the sign shows another secret quote
const CALM_QUOTES = [
  "Procrastination is just a high learning rate on the wrong objective. Retune and go.",
  "Every model starts with random weights. Starting messy still counts as starting.",
  "You do not need the global optimum tonight. A good local one ships.",
  "Gradient descent never sees the whole mountain. It only takes the next step. So can you.",
  "Loss is always highest at epoch one. That is not failure. That is the beginning.",
  "Overthinking is just overfitting to test cases that will never show up.",
  "Small steady updates beat one giant step that diverges.",
  "Your capacity is far larger than this assignment's parameter count.",
  "Even the biggest transformer reads one token at a time.",
  "Convergence is not about speed. It is about not stopping.",
  "Your prior said you could not. The evidence keeps saying you can.",
  "Momentum is real. The first step is the hardest, and then you accelerate.",
  "Done is a better metric than perfect.",
  "Universal approximation theorem: with enough small steps, you can learn anything.",
  "Noise is normal. The signal is you showing up anyway.",
  "Nobody remembers the failed runs. They remember what you shipped.",
];
let calmQuote = "";
let calmPet = { kind: "mochi", name: "Mochi" };
store.get("local", "bl:study").then(st =>
{
  if (st) calmPet = { kind: st.petKind || "mochi", name: st.petName || "Mochi" };
});
store.get("local", "bl:pet:custom").then(c =>
{
  if (self.BlushPets) self.BlushPets.setCustom(c);
});
chrome.storage.onChanged.addListener((ch, area) =>
{
  if (area !== "local") return;
  if (ch["bl:study"] && ch["bl:study"].newValue)
  {
    const st = ch["bl:study"].newValue;
    const changed = st.petKind !== calmPet.kind;
    calmPet = { kind: st.petKind || "mochi", name: st.petName || "Mochi" };
    if (changed && calmOn()) renderCalm();
  }
});
const pickQuote = () =>
{
  let q = calmQuote;
  while (q === calmQuote) q = CALM_QUOTES[Math.floor(Math.random() * CALM_QUOTES.length)];
  calmQuote = q;
};
function calmBuddyHTML()
{
  const pet = self.BlushPets ? self.BlushPets.svg(calmPet.kind, "happy", "bl-calm-pet-art") : "";
  return `<div class="bl-calm-buddy">
      <span class="bl-calm-spark is-a" aria-hidden="true">✦</span><span class="bl-calm-spark is-b" aria-hidden="true">✧</span><span class="bl-calm-spark is-c" aria-hidden="true">✦</span>
      <button class="bl-calm-sign" type="button" data-calm-quote aria-label="YOU GOT THIS! Tap for another quote from ${esc(calmPet.name)}">
        <span class="bl-calm-sign-board">YOU GOT THIS!!!</span>
        <span class="bl-calm-stick is-l" aria-hidden="true"></span><span class="bl-calm-stick is-r" aria-hidden="true"></span>
      </button>
      <button class="bl-calm-pet" type="button" data-calm-quote aria-label="Tap ${esc(calmPet.name)} for a secret quote">${pet}</button>
    </div>
    <p class="bl-calm-quote" aria-live="polite"${calmQuote ? "" : " hidden"}>${esc(calmQuote)}</p>`;
}
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
    el.innerHTML = '<div class="bl-calm-sky" aria-hidden="true"></div><div class="bl-calm-wrap"></div>';
    mountSky(el.querySelector(".bl-calm-sky"), "day");
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
      if (e.target.closest("[data-calm-quote]"))
      {
        pickQuote();
        const q = el.querySelector(".bl-calm-quote");
        if (q)
        {
          q.textContent = calmQuote;
          q.hidden = false;
        }
        const pet = el.querySelector(".bl-calm-pet");
        if (pet && pet.animate && !reduceMQ.matches)
          pet.animate(
            [
              { transform: "translateY(0)" },
              { transform: "translateY(-14px)" },
              { transform: "translateY(0)" },
            ],
            { duration: 500, easing: "ease-out" },
          );
        return;
      }
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
  if (wasHidden) calmQuote = ""; // quotes only show once you tap your buddy
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
  el.querySelector(".bl-calm-wrap").innerHTML = `
    <div class="bl-calm-inner">
      <p class="bl-eyebrow"><b>//</b> super declutter</p>
      <h2 class="bl-calm-h" id="bl-calm-h" tabindex="-1">${list && list.length && !open.length ? "Tonight is handled." : "Just tonight."}</h2>
      <p class="bl-calm-sub">${esc(sub)}</p>
      ${list && list.length ? `<ol class="bl-calm-list">${list.map(calmItemHTML).join("")}</ol>` : ""}
      ${next ? `<p class="bl-calm-next">Next thing on the horizon: <a href="${esc(next.url || "#")}">${esc(next.title)}</a> · ${esc(fmtDue(next.due))}</p>` : ""}
      ${calmBuddyHTML()}
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
