// The banner: greeting, clock, today's focus, next up and the picture behind it.
"use strict";

let heroRoot = null;
let clockTimer = 0;
const art = { current: null, busy: false };

function nextUp()
{
  if (!state.items) return null;
  const now = Date.now();
  return (
    state.items
      .filter(i => !isDone(i) && i.due && new Date(i.due).getTime() >= now)
      .sort((a, b) => new Date(a.due) - new Date(b.due))[0] || null
  );
}
const focusToday = () => (state.focus && state.focus.day === dayKey(new Date()) ? state.focus : null);
function heroIsFull()
{
  if (settings.heroFull === "always") return true;
  if (settings.heroFull === "never") return false;
  return location.pathname === "/";
}
const clockText = () =>
{
  const d = new Date();
  return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const longDate = () => new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

function focusHTML(full)
{
  const f = focusToday();
  if (!full)
  {
    return f
      ? `<p class="bl-hero-focus-slim"><span>Focus</span> ${esc(f.text)}${f.done ? " ✓" : ""}</p>`
      : "";
  }
  if (!f)
  {
    return `<form class="bl-focus" data-act="focus-set">
        <label class="bl-focus-q" for="bl-focus-in">What is your main focus today?</label>
        <input class="bl-focus-input" id="bl-focus-in" data-fk="focus-input" maxlength="120" autocomplete="off">
      </form>`;
  }
  return `<div class="bl-focus is-set">
      <p class="bl-focus-q">Today's focus</p>
      <div class="bl-focus-row">
        <input class="bl-check" type="checkbox" data-act="focus-done" data-fk="focus-done" ${f.done ? "checked" : ""}
          aria-label="Mark focus done: ${esc(f.text)}">
        <span class="bl-focus-text${f.done ? " is-done" : ""}">${esc(f.text)}</span>
        <button class="bl-glass-btn is-small" type="button" data-act="focus-clear" data-fk="focus-clear" aria-label="Clear today's focus">${ICON.close}</button>
      </div>
    </div>`;
}

function renderHero()
{
  if (!heroRoot) return;
  heroRoot.host.hidden = !settings.hero;
  if (!settings.hero) return;
  const full = heroIsFull();
  const hero = heroRoot.querySelector(".bl-hero");
  hero.classList.toggle("is-full", full);
  hero.classList.toggle("is-slim", !full);
  const content = heroRoot.querySelector(".bl-hero-content");

  const active = heroRoot.activeElement;
  const fk = active ? active.getAttribute("data-fk") : null;
  const draftEl = heroRoot.querySelector('[data-fk="focus-input"]');
  const draft = draftEl ? draftEl.value : "";

  const nu = nextUp();
  const a = art.current;
  const credit =
    a && a.kind === "art"
      ? `<a class="bl-credit" href="${esc(a.link)}" target="_blank" rel="noopener" data-fk="credit">${esc(a.artist ? `${a.artist}, ` : "")}${esc(a.title)}</a>`
      : a
        ? '<span class="bl-credit">Your photo</span>'
        : "";

  content.innerHTML = `
    <div class="bl-hero-main">
      <p class="bl-hero-date">${esc(longDate())}</p>
      <p class="bl-hero-greet" data-greet>${esc(greeting())}.</p>
      ${focusHTML(full)}
    </div>
    <div class="bl-hero-side">
      <p class="bl-clock" aria-hidden="true" data-clock>${clockText()}</p>
      ${
        nu
          ? `<a class="bl-next" href="${esc(nu.url || "#")}" data-fk="next">
            <span class="bl-next-label">Next up</span>
            <span class="bl-next-title">${esc(nu.title)}</span>
            <span class="bl-next-due">${esc(nu.course)}${nu.course ? " · " : ""}${esc(fmtDue(nu.due))}</span>
          </a>`
          : `<p class="bl-next is-clear"><span class="bl-next-label">Next up</span><span class="bl-next-title">${state.items ? "Nothing due." : "Loading…"}</span></p>`
      }
    </div>
    <div class="bl-hero-foot">
      ${credit}
      ${location.pathname === "/" ? '<button class="bl-stress-btn" type="button" data-act="stress" data-fk="stress">AHHH I\'M STRESSED. SUPER DECLUTTER</button>' : ""}
      <button class="bl-glass-btn" type="button" data-act="shuffle" data-fk="shuffle" aria-label="Show a different picture" ${art.busy ? 'aria-busy="true"' : ""}>${ICON.shuffle}</button>
      <button class="bl-glass-btn" type="button" data-act="size" data-fk="size" aria-label="${full ? "Make banner smaller" : "Make banner bigger"}">${full ? ICON.shrink : ICON.grow}</button>
    </div>`;

  const newDraft = heroRoot.querySelector('[data-fk="focus-input"]');
  if (newDraft) newDraft.value = draft;
  if (fk)
  {
    const t = heroRoot.querySelector(`[data-fk="${CSS.escape(fk)}"]`);
    if (t) t.focus();
  }
}

function tickClock()
{
  clearTimeout(clockTimer);
  if (heroRoot)
  {
    const c = heroRoot.querySelector("[data-clock]");
    if (c) c.textContent = clockText();
    const g = heroRoot.querySelector("[data-greet]");
    if (g) g.textContent = `${greeting()}.`;
  }
  const now = new Date();
  clockTimer = setTimeout(tickClock, 60000 - now.getSeconds() * 1000 - now.getMilliseconds() + 50);
}

function setArt(a)
{
  if (!heroRoot || !a || !a.dataUrl) return;
  art.current = a;
  const img = heroRoot.querySelector(".bl-hero-img");
  img.style.backgroundImage = `url("${a.dataUrl}")`;
  heroRoot.querySelector(".bl-hero").classList.add("has-art");
  renderHero();
}
function requestArt(msg)
{
  try
  {
    chrome.runtime.sendMessage({ type: "bl:art", ...msg }, res =>
    {
      void chrome.runtime.lastError;
      art.busy = false;
      if (res) setArt(res);
      else renderHero();
    });
  }
  catch (e)
  {
    art.busy = false;
  }
}
async function loadArt()
{
  const cur = await store.get("local", "bl:art:current");
  if (cur) setArt(cur);
  if (!cur || cur.day !== dayKey(new Date())) requestArt({});
}

async function buildHero()
{
  const host = document.createElement("div");
  host.id = "blush-hero";
  host.className = "bl-hero-host";
  const wrapper = document.getElementById("wrapper") || document.querySelector(".ic-Layout-wrapper");
  if (wrapper) wrapper.prepend(host);
  else document.body.prepend(host);
  heroRoot = await makeShadow(host);
  const section = document.createElement("section");
  section.className = "bl-hero";
  section.setAttribute("aria-label", "Today");
  section.innerHTML =
    '<div class="bl-hero-img" aria-hidden="true"></div><div class="bl-hero-wash" aria-hidden="true"></div><div class="bl-hero-content"></div>';
  heroRoot.appendChild(section);

  // drop a picture on the banner to add it to your photos and show it right away
  section.addEventListener("dragover", e =>
  {
    if (hasImageDrag(e))
    {
      e.preventDefault();
      section.classList.add("is-drop");
    }
  });
  section.addEventListener("dragleave", () => section.classList.remove("is-drop"));
  section.addEventListener("drop", async e =>
  {
    const file = imageFromDrop(e);
    section.classList.remove("is-drop");
    if (!file) return;
    e.preventDefault();
    try
    {
      const dataUrl = await self.BlushLook.resizeImage(file);
      const photos = (await store.get("local", "bl:photos")) || [];
      const id = Math.random().toString(36).slice(2, 10);
      photos.push({ id, dataUrl });
      await store.set("local", "bl:photos", photos);
      await store.set("local", "bl:art:current", {
        day: dayKey(new Date()),
        id,
        kind: "photo",
        dataUrl,
        title: "Your photo",
        artist: "",
        link: "",
      });
      toast("Added to your banner photos.", true);
    }
    catch (err)
    {
      toast("That picture would not load.");
    }
  });

  section.addEventListener("submit", e =>
  {
    e.preventDefault();
    const input = e.target.querySelector("input");
    const text = input.value.trim();
    if (!text) return;
    state.focus = { day: dayKey(new Date()), text, done: false };
    store.set("local", "bl:focus", state.focus);
    renderHero();
    const cb = heroRoot.querySelector('[data-fk="focus-done"]');
    if (cb) cb.focus();
  });
  section.addEventListener("change", e =>
  {
    if (e.target.dataset.act !== "focus-done" || !state.focus) return;
    state.focus.done = e.target.checked;
    store.set("local", "bl:focus", state.focus);
    recordWin(state.focus.done ? 1 : -1);
    renderHero();
    if (state.focus.done && settings.cheers) toast("Main focus, done. That was the big one.", true);
  });
  section.addEventListener("click", e =>
  {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "focus-clear")
    {
      state.focus = null;
      store.set("local", "bl:focus", null);
      renderHero();
      const input = heroRoot.querySelector('[data-fk="focus-input"]');
      if (input) input.focus();
    }
    else if (act === "stress")
    {
      settings.stress = true;
      saveSettings();
      renderCalm();
    }
    else if (act === "shuffle")
    {
      art.busy = true;
      renderHero();
      requestArt({ shuffle: true });
    }
    else if (act === "size")
    {
      const full = heroIsFull();
      const onDash = location.pathname === "/";
      settings.heroFull = full ? (onDash ? "never" : "dashboard") : onDash ? "dashboard" : "always";
      saveSettings();
      renderHero();
    }
  });
  renderHero();
  tickClock();
}
