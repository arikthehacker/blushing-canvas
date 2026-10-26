/* Blush for Canvas: study buddy
   A pomodoro timer with a little pet and a garden that grows one plant for every 25 focused minutes.
   The timer itself lives in background.js, so it keeps running across pages and tabs. */
(() =>
{
  "use strict";

  const KEY = "bl:study";
  const UI_KEY = "bl:study:ui";
  let state = null;
  let settings = { study: true, calm: true, petWalk: true };
  let ui = { open: true };
  let host = null,
    sr = null,
    tick = 0,
    seenDone = 0,
    bubbleT = 0;
  let stage = null,
    stageOn = false,
    stageCss = "",
    sayT = 0;

  const send = (act, extra = {}) =>
    new Promise(r =>
      chrome.runtime.sendMessage({ type: "bl:study", act, ...extra }, res =>
      {
        void chrome.runtime.lastError;
        r(res);
      }),
    );
  // your buddy walks unless you switch walking off in the popup
  const motion = () => settings.petWalk !== false;

  // ---------------------------------------------------------------- art
  const PETAL = ["var(--bl-accent)", "#EBA2B6", "#F2C46D", "#B9A6E3", "#F4A6A0", "#8FCBB0"];
  const LEAF = "#7DAF7F",
    STEM = "#6A9C6E";

  function plantSVG(kind, stage, i = 0)
  {
    // stage: 0 seed, 1 sprout, 2 bud, 3 bloom
    const c = PETAL[(kind + i) % PETAL.length];
    const soil = '<ellipse cx="12" cy="30" rx="7" ry="2" fill="var(--bl-sb-soil)"/>';
    if (stage === 0)
      return `<svg viewBox="0 0 24 32" aria-hidden="true">${soil}<ellipse cx="12" cy="28.6" rx="2.6" ry="1.8" fill="#A07A5C"/></svg>`;
    const leaves = `<path d="M12 26 C8 25 6.5 22.5 7 21 C9.5 21 11.5 23 12 26Z" fill="${LEAF}"/><path d="M12 24 C16 23 17.5 20.5 17 19 C14.5 19 12.5 21 12 24Z" fill="${LEAF}"/>`;
    if (stage === 1)
      return `<svg viewBox="0 0 24 32" aria-hidden="true">${soil}<path d="M12 30 V22" stroke="${STEM}" stroke-width="1.6" stroke-linecap="round"/><path d="M12 23 C9 22.5 8 20.5 8.4 19.4 C10.6 19.4 11.8 21 12 23Z" fill="${LEAF}"/><path d="M12 23 C15 22.5 16 20.5 15.6 19.4 C13.4 19.4 12.2 21 12 23Z" fill="${LEAF}"/></svg>`;
    const stem = `<path d="M12 30 V${stage === 2 ? 14 : 12}" stroke="${STEM}" stroke-width="1.6" stroke-linecap="round"/>`;
    if (stage === 2)
      return `<svg viewBox="0 0 24 32" aria-hidden="true">${soil}${stem}${leaves}<ellipse cx="12" cy="12.5" rx="2.8" ry="3.6" fill="${c}"/><path d="M9.6 14 Q12 17 14.4 14" fill="${LEAF}"/></svg>`;
    let bloom = "";
    switch (kind % 6)
    {
      case 0: // tulip
        bloom = `<path d="M7.5 8 L9.5 11 L12 7 L14.5 11 L16.5 8 C17 13.5 15 15 12 15 C9 15 7 13.5 7.5 8Z" fill="${c}"/>`;
        break;
      case 1: // daisy
        bloom =
          [0, 45, 90, 135, 180, 225, 270, 315]
            .map(
              a =>
                `<ellipse cx="12" cy="7.2" rx="1.6" ry="3" fill="#FFFFFF" stroke="${c}" stroke-width=".6" transform="rotate(${a} 12 11)"/>`,
            )
            .join("") + '<circle cx="12" cy="11" r="2.2" fill="#F2C46D"/>';
        break;
      case 2: // round bloom
        bloom =
          [0, 60, 120, 180, 240, 300]
            .map(a => `<circle cx="12" cy="7.6" r="2.8" fill="${c}" transform="rotate(${a} 12 11)"/>`)
            .join("") + '<circle cx="12" cy="11" r="2.4" fill="#FFF3D6"/>';
        break;
      case 3: // lavender sprig
        bloom =
          [4, 6.5, 9, 11.5]
            .map(
              (y, n) => `<ellipse cx="${n % 2 ? 13.3 : 10.7}" cy="${y}" rx="1.7" ry="2" fill="${PETAL[3]}"/>`,
            )
            .join("") + `<ellipse cx="12" cy="2.6" rx="1.4" ry="1.8" fill="${PETAL[3]}"/>`;
        break;
      case 4: // mushroom
        return `<svg viewBox="0 0 24 32" aria-hidden="true">${soil}<path d="M9.5 29.5 C9.8 25 10 22 12 22 C14 22 14.2 25 14.5 29.5Z" fill="#FFF6EC"/><path d="M4.5 22.5 C4.5 16 8 13 12 13 C16 13 19.5 16 19.5 22.5Z" fill="${c}"/><circle cx="9" cy="18" r="1.3" fill="#FFFFFF"/><circle cx="14.5" cy="16.6" r="1.1" fill="#FFFFFF"/><circle cx="15.6" cy="20.2" r=".9" fill="#FFFFFF"/></svg>`;
      default: // little cactus with a flower
        return `<svg viewBox="0 0 24 32" aria-hidden="true">${soil}<rect x="9.5" y="13" width="5" height="17" rx="2.5" fill="#7DB08A"/><path d="M9.5 21 H7.5 A1.5 1.5 0 0 1 6 19.5 V17" stroke="#7DB08A" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M14.5 19 H16.5 A1.5 1.5 0 0 0 18 17.5 V15.5" stroke="#7DB08A" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="12" cy="12.4" r="2" fill="${c}"/></svg>`;
    }
    return `<svg viewBox="0 0 24 32" aria-hidden="true">${soil}${stem}${leaves}${bloom}</svg>`;
  }

  const petSVG = (mood, cls) => self.BlushPets.svg((state && state.petKind) || "mochi", mood, cls);
  const ICONS = {
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7.5-4.5z" fill="currentColor"/></svg>',
    pause:
      '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="3.5" width="2.8" height="9" rx="1" fill="currentColor"/><rect x="9.2" y="3.5" width="2.8" height="9" rx="1" fill="currentColor"/></svg>',
    skip: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5v9l6-4.5z" fill="currentColor"/><rect x="10.5" y="3.5" width="2.2" height="9" rx="1" fill="currentColor"/></svg>',
    down: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  // ---------------------------------------------------------------- helpers
  const fmt = ms =>
  {
    const t = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  };
  const phaseMs = s =>
    (s.mode === "focus" ? s.focusMin : s.mode === "long" ? 15 : s.focusMin >= 50 ? 10 : 5) * 60000;
  const leftMs = s => (s.running ? s.endAt - Date.now() : s.left || phaseMs(s));
  const progress = s => Math.min(1, Math.max(0, 1 - leftMs(s) / phaseMs(s)));
  const dayKey = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayCount = s => (s.today && s.today.day === dayKey() ? s.today.n : 0);
  const level = s => Math.floor((s.total || 0) / 4) + 1;
  const esc = t =>
    String(t).replace(
      /[&<>"']/g,
      c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  const modeLabel = s => (s.mode === "focus" ? "Focus" : s.mode === "long" ? "Long break" : "Break");
  const justDone = s => s.lastDone && Date.now() - s.lastDone < 8000;
  const isPaused = s => !s.running && s.left && s.left < phaseMs(s);
  function mood(s)
  {
    if (justDone(s)) return "happy";
    if (s.running && s.mode === "focus") return "focus";
    if (s.mode !== "focus") return "happy";
    return "idle";
  }
  function line(s)
  {
    const n = todayCount(s);
    if (justDone(s)) return "New sprout! A statistically significant result.";
    if (s.running && s.mode === "focus")
    {
      const p = progress(s);
      return p < 0.1
        ? "Initializing weights. Focus mode on."
        : p < 0.6
          ? "Gradients look stable. Keep descending."
          : p < 0.9
            ? "Validation loss is dropping nicely."
            : "Nearly converged. No early stopping.";
    }
    if (s.running)
      return s.mode === "long"
        ? "Long break. Let the weights settle."
        : "Regularization break. Hydrate your neurons.";
    if (s.mode !== "focus") return "Break paused. Learning rate set to zero.";
    if (isPaused(s)) return "Checkpoint saved. Resume when ready.";
    return n ? `${n} epochs today. Shall we run another?` : "Ready to minimize some loss?";
  }
  const QUIPS = [
    "Attention is all you need. Also snacks.",
    "My posterior says you will ace this.",
    "A local minimum of motivation? We can escape it.",
    "Each pomodoro is a mini-batch.",
    "Your focus has remarkably low variance today.",
    "Overfitting to procrastination? Not today.",
    "Backpropagate that worry and move on.",
    "Peer-reviewed opinion: you are doing great.",
    "Correlation is not causation, but studying helps.",
    "I have updated my priors. You have got this.",
  ];
  const mainLabel = s =>
    s.running ? "Pause" : isPaused(s) ? "Resume" : s.mode === "focus" ? "Start focus" : "Start break";

  async function onAction(b)
  {
    const act = b.dataset.sb;
    if (act === "collapse" || act === "expand")
    {
      ui.open = act === "expand";
      chrome.storage.local.set({ [UI_KEY]: ui });
      render(true);
      const f = sr.querySelector(ui.open ? '[data-sb="collapse"]' : '[data-sb="expand"]');
      if (f) f.focus();
    }
    else if (act === "length")
    {
      await send("length", { min: +b.dataset.min });
    }
    else if (act === "rename")
    {
      const name = prompt("Name your study buddy", state.petName || "Mochi");
      if (name !== null) await send("name", { name });
    }
    else if (act === "pet")
    {
      // tapping shows how the session is going, or a quip
      const r = Math.random();
      say(
        r < 0.3
          ? "YOU GOT THIS!!!"
          : r < 0.55
            ? line(state)
            : QUIPS[Math.floor(Math.random() * QUIPS.length)],
        3200,
      );
      hop();
    }
    else
    {
      await send(act);
    }
  }

  // ---------------------------------------------------------------- the side card (garden, or the whole timer when the banner is off)
  async function build()
  {
    try
    {
      stageCss = await (await fetch(chrome.runtime.getURL("styles/stage.css"))).text();
    }
    catch (e)
    {
      stageCss = "";
    }
    let css = "";
    try
    {
      css = await (await fetch(chrome.runtime.getURL("styles/study.css"))).text();
    }
    catch (e)
    {
      /* unstyled is still usable */
    }
    host = document.createElement("div");
    host.id = "blush-study";
    sr = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = css;
    sr.appendChild(style);
    const wrap = document.createElement("div");
    wrap.className = "sb";
    sr.appendChild(wrap);
    document.body.appendChild(host);
    wrap.addEventListener("click", e =>
    {
      const b = e.target.closest("[data-sb]");
      if (b) onAction(b);
    });
  }

  function hop()
  {
    const pet = (stageOn && stage && stage.querySelector(".sb-hop")) || sr.querySelector(".sb-pet");
    if (!pet || !motion() || !pet.animate) return;
    pet.animate(
      [
        { transform: "translateY(0)" },
        { transform: "translateY(-12px)" },
        { transform: "translateY(0)" },
        { transform: "translateY(-5px)" },
        { transform: "translateY(0)" },
      ],
      { duration: 650, easing: "ease-out" },
    );
  }
  function say(text, ms = 2600)
  {
    if (stageOn && stage)
    {
      const b = stage.querySelector(".sb-say");
      b.textContent = text;
      // keep the bubble inside the banner when the buddy is near an edge
      const w = stage.querySelector(".sb-walker").getBoundingClientRect();
      const g = stage.getBoundingClientRect();
      const mid = w.left + w.width / 2 - g.left;
      b.classList.toggle("is-left", mid < 150);
      b.classList.toggle("is-right", mid > g.width - 150);
      b.classList.add("is-on");
      clearTimeout(sayT);
      sayT = setTimeout(() => b.classList.remove("is-on"), ms);
      return;
    }
    const el = sr.querySelector(".sb-line");
    if (!el) return;
    el.textContent = text;
    clearTimeout(bubbleT);
    bubbleT = setTimeout(() => render(true), 2200);
  }
  function hearts()
  {
    const box = (stageOn && stage && stage.querySelector(".sb-walker")) || sr.querySelector(".sb-pet");
    if (!box || !motion()) return;
    for (let i = 0; i < 5; i++)
    {
      const h = document.createElement("span");
      h.className = "sb-heart";
      h.textContent = "♥";
      h.style.left = `${20 + Math.random() * 60}%`;
      h.style.animationDelay = `${i * 120}ms`;
      box.appendChild(h);
      setTimeout(() => h.remove(), 1800);
    }
  }

  function gardenHTML()
  {
    const p = progress(state);
    const plants = (state.plants || []).slice(-14);
    const growing = state.mode === "focus" && (state.running || p > 0);
    const stg = p < 0.25 ? 0 : p < 0.6 ? 1 : 2;
    return `<div class="sb-garden" aria-label="Your garden: ${(state.plants || []).length} plants">
        <div class="sb-bed">
          ${plants.map((pl, i) => `<span class="sb-plant${state.lastDone && pl.t === state.lastDone ? " is-new" : ""}">${plantSVG(pl.k, 3, i)}</span>`).join("")}
          ${growing ? `<span class="sb-plant is-growing" data-stage="${stg}" title="Growing">${plantSVG(0, stg)}</span>` : ""}
          ${!plants.length && !growing ? '<span class="sb-empty">Finish a 25 minute focus to plant your first flower.</span>' : ""}
        </div>
        <p class="sb-stats">
          <button class="sb-name" type="button" data-sb="rename" aria-label="Rename ${esc(state.petName)}">${esc(state.petName)}</button>
          <span>lv ${level(state)}</span><span>${(state.plants || []).length} plants</span><span>${todayCount(state)} today</span>
        </p>
      </div>`;
  }
  const lengthsHTML = () => `<div class="sb-lengths" role="group" aria-label="Focus length">
      ${[15, 25, 50].map(m => `<button type="button" class="sb-chip" data-sb="length" data-min="${m}" aria-pressed="${state.focusMin === m}">${m} min</button>`).join("")}
    </div>`;

  function render(full)
  {
    if (!sr || !state) return;
    const wrap = sr.querySelector(".sb");
    host.hidden = !settings.study || stageOn;
    if (stage) stage.hidden = !settings.study || !stageOn;
    if (!settings.study)
    {
      stopTick();
      return;
    }
    renderStage(full);
    if (stageOn) return; // pet, timer, and garden are all in the banner
    wrap.classList.toggle("is-motion", motion());
    wrap.classList.toggle("is-running", !!state.running);
    wrap.classList.toggle("is-garden", stageOn);
    wrap.dataset.mode = state.mode;
    const p = progress(state);

    if (!ui.open)
    {
      if (full || !wrap.querySelector(".sb-pill"))
      {
        wrap.classList.remove("is-open");
        wrap.innerHTML = stageOn
          ? `<button class="sb-pill" type="button" data-sb="expand" aria-label="Open your garden">
              <span class="sb-pill-plant">${plantSVG(((state.plants || []).slice(-1)[0] || { k: 2 }).k, 3)}</span>
              <span class="sb-pill-time">${(state.plants || []).length}</span>
            </button>`
          : `<button class="sb-pill" type="button" data-sb="expand" aria-label="Open study timer, ${esc(modeLabel(state))} ${fmt(leftMs(state))} left">
              <span class="sb-pill-pet">${petSVG(mood(state))}</span>
              <span class="sb-pill-time">${fmt(leftMs(state))}</span>
              <span class="sb-pill-bar"><i style="width:${(p * 100).toFixed(1)}%"></i></span>
            </button>`;
      }
      else if (!stageOn)
      {
        wrap.querySelector(".sb-pill-time").textContent = fmt(leftMs(state));
        wrap.querySelector(".sb-pill-bar i").style.width = `${(p * 100).toFixed(1)}%`;
      }
      return;
    }

    const r = 44,
      circ = 2 * Math.PI * r;
    if (full || !wrap.querySelector(".sb-card"))
    {
      wrap.classList.add("is-open");
      if (stageOn)
      {
        // the pet and timer live in the banner, so this card is just the garden
        wrap.innerHTML = `
          <section class="sb-card is-garden" aria-label="Your garden">
            <header class="sb-head">
              <p class="sb-eyebrow"><b>//</b> garden</p>
              <button class="sb-icon" type="button" data-sb="collapse" aria-label="Shrink garden">${ICONS.down}</button>
            </header>
            ${gardenHTML()}
            <div class="sb-row">${lengthsHTML()}<button class="sb-chip is-plain" type="button" data-sb="reset" aria-label="Restart this timer">Restart</button></div>
          </section>`;
        return;
      }
      wrap.innerHTML = `
        <section class="sb-card" aria-label="Study timer">
          <header class="sb-head">
            <p class="sb-eyebrow"><b>//</b> study buddy</p>
            <button class="sb-icon" type="button" data-sb="collapse" aria-label="Shrink study timer">${ICONS.down}</button>
          </header>
          <div class="sb-top">
            <button class="sb-pet" type="button" data-sb="pet" aria-label="Pet ${esc(state.petName)}">
              <svg class="sb-ring" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="${r}" class="sb-ring-track"/>
                <circle cx="50" cy="50" r="${r}" class="sb-ring-fill" stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${(circ * (1 - p)).toFixed(2)}"/>
              </svg>
              ${petSVG(mood(state))}
            </button>
            <div class="sb-info">
              <p class="sb-mode">${esc(modeLabel(state))}</p>
              <p class="sb-time" aria-live="off">${fmt(leftMs(state))}</p>
              <p class="sb-line" aria-live="polite"></p>
            </div>
          </div>
          <div class="sb-controls">
            <button class="sb-btn is-main" type="button" data-sb="${state.running ? "pause" : "start"}">${mainLabel(state)}</button>
            <button class="sb-btn" type="button" data-sb="reset" aria-label="Restart this timer">Restart</button>
            <button class="sb-btn" type="button" data-sb="skip" aria-label="${state.mode === "focus" ? "Skip to break" : "Skip break"}">Skip</button>
          </div>
          ${lengthsHTML()}
          ${gardenHTML()}
        </section>`;
    }
    else
    {
      const t = wrap.querySelector(".sb-time");
      if (t) t.textContent = fmt(leftMs(state));
      const ring = wrap.querySelector(".sb-ring-fill");
      if (ring) ring.setAttribute("stroke-dashoffset", (circ * (1 - p)).toFixed(2));
      const g = wrap.querySelector(".sb-plant.is-growing");
      const stg = p < 0.25 ? 0 : p < 0.6 ? 1 : 2;
      if (g && g.dataset.stage !== String(stg))
      {
        g.dataset.stage = stg;
        g.innerHTML = plantSVG(0, stg);
      }
    }
  }

  // ---------------------------------------------------------------- the banner garden: grass along the bottom, a little pomodoro sign, a walking pet
  let laneRO = null,
    laneMO = null,
    lastMood = "",
    lastKind = "",
    plantsKey = "";
  const GRASS = '<svg class="sb-grass" aria-hidden="true" preserveAspectRatio="none"></svg>';
  let grassKey = "";
  // grass that looks drawn by hand: two layers of blades with different heights and a little lean
  function drawGrass(W, slim)
  {
    const svg = stage && stage.querySelector(".sb-grass");
    if (!svg) return;
    const H = slim ? 12 : 16;
    const key = `${W}|${slim}`;
    if (key === grassKey) return;
    grassKey = key;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const blade = (x, h, lean, w) =>
      `M${(x - w).toFixed(1)} ${H} Q${(x + lean * 0.4).toFixed(1)} ${(H - h * 0.6).toFixed(1)} ${(x + lean).toFixed(1)} ${(H - h).toFixed(1)} Q${(x + lean * 0.3 + w * 0.3).toFixed(1)} ${(H - h * 0.5).toFixed(1)} ${(x + w).toFixed(1)} ${H}Z`;
    let back = "",
      front = "",
      bits = "";
    for (let x = 0, i = 0; x < W + 6; i++)
    {
      back += blade(x, (slim ? 6 : 8) + rnd(i * 3 + 1) * (slim ? 5 : 8), (rnd(i * 5 + 2) - 0.5) * 5, 1.6);
      x += 3 + rnd(i * 7 + 3) * 3;
    }
    for (let x = 2, i = 0; x < W + 6; i++)
    {
      front += blade(
        x,
        (slim ? 3.5 : 4.5) + rnd(i * 11 + 4) * (slim ? 3.5 : 5),
        (rnd(i * 13 + 5) - 0.5) * 4,
        1.4,
      );
      x += 4 + rnd(i * 17 + 6) * 4;
    }
    // a few tiny clover dots and pebbles
    for (let i = 0; i < W / 60; i++)
    {
      const x = rnd(i * 19 + 7) * W;
      bits +=
        rnd(i * 23 + 8) > 0.5
          ? `<circle cx="${x.toFixed(1)}" cy="${H - 2.4}" r="1.3" fill="var(--sb-clover)"/>`
          : `<ellipse cx="${x.toFixed(1)}" cy="${H - 1.2}" rx="2" ry="1.1" fill="var(--sb-pebble)"/>`;
    }
    svg.innerHTML = `<path d="${back}" fill="var(--sb-blade-back)"/><rect x="0" y="${H - 2}" width="${W}" height="2" fill="var(--sb-blade-back)"/><path d="${front}" fill="var(--sb-blade-front)"/>${bits}`;
  }
  const heroSection = () =>
  {
    const h = document.getElementById("blush-hero");
    return h && h.shadowRoot ? h.shadowRoot.querySelector(".bl-hero") : null;
  };
  // tiny seeded random so each plant keeps its spot
  const rnd = n =>
  {
    let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
    x ^= x >>> 13;
    x = Math.imul(x, 0xc2b2ae35);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  };

  function findHero()
  {
    if (stage && stage.isConnected) return;
    const hero = heroSection();
    if (!hero) return;
    const sroot = hero.getRootNode();
    if (!sroot.querySelector("style[data-sb]"))
    {
      const st = document.createElement("style");
      st.dataset.sb = "1";
      st.textContent = stageCss;
      sroot.appendChild(st);
    }
    stage = document.createElement("div");
    stage.className = "sb-ground";
    stage.hidden = true;
    stage.innerHTML = `
      ${GRASS}
      <div class="sb-plants" aria-hidden="true"></div>
      <div class="sb-sign">
        <div class="sb-board" role="group" aria-label="Pomodoro timer">
          <span class="sb-slabel"></span>
          <span class="sb-srow">
            <span class="sb-ttime"></span>
            <button class="sb-sbtn is-main" type="button" data-sb="start"></button>
            <button class="sb-sbtn" type="button" data-sb="skip" aria-label="Skip">${ICONS.skip}</button>
          </span>
          <i class="sb-sbar"></i>
        </div>
        <span class="sb-post" aria-hidden="true"></span>
      </div>
      <div class="sb-walker">
        <div class="sb-say" aria-live="polite"></div>
        <div class="sb-hop"><div class="sb-flip"><button class="sb-petbtn" type="button" data-sb="pet"></button></div></div>
      </div>`;
    hero.appendChild(stage);
    stage.addEventListener("click", e =>
    {
      const b = e.target.closest("[data-sb]");
      if (b) onAction(b);
    });
    laneRO = new ResizeObserver(layoutStage);
    laneRO.observe(hero);
    laneMO = new MutationObserver(() => requestAnimationFrame(layoutStage));
    laneMO.observe(hero.querySelector(".bl-hero-content") || hero, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    lastMood = "";
    lastKind = "";
    plantsKey = "";
    grassKey = "";
    layoutStage();
  }

  function layoutStage()
  {
    const hero = heroSection();
    const was = stageOn;
    if (!stage || !hero || !hero.isConnected || hero.getRootNode().host.hidden || !settings.study)
    {
      stageOn = false;
      if (hero) hero.classList.remove("has-garden");
    }
    else
    {
      const H = hero.getBoundingClientRect();
      stageOn = H.width >= 320;
      hero.classList.toggle("has-garden", stageOn);
      if (stageOn)
      {
        const slim = hero.classList.contains("is-slim");
        stage.dataset.size = slim ? "slim" : "full";
        // the sign sits in the open space between the greeting and the clock
        let signX = H.width * 0.5;
        const greet = hero.querySelector(".bl-hero-greet");
        const side = hero.querySelector(".bl-clock");
        if (greet && side)
        {
          const rg = document.createRange();
          rg.selectNodeContents(greet);
          const gr = rg.getBoundingClientRect().right - H.left;
          const sl = side.getBoundingClientRect().left - H.left;
          if (sl - gr > 120) signX = (gr + sl) / 2;
        }
        stage.style.setProperty("--sb-sign-x", `${Math.round(signX)}px`);
        stage.dataset.signX = Math.round(signX);
        stage.style.setProperty("--sb-lane", `${Math.round(H.width)}px`);
        drawGrass(Math.round(H.width), slim);
        renderPlants(true);
      }
    }
    if (stage) stage.hidden = !stageOn || !settings.study;
    if (was !== stageOn) render(true);
  }

  // spread the plants along the ground, keeping clear of the sign
  function renderPlants(force)
  {
    if (!stage || !state) return;
    const box = stage.querySelector(".sb-plants");
    const W = stage.clientWidth || 600;
    const slim = stage.dataset.size === "slim";
    const pw = slim ? 13 : 16;
    const signX = +stage.dataset.signX || W / 2;
    const p = progress(state);
    const growing = state.mode === "focus" && (state.running || p > 0);
    const stg = p < 0.25 ? 0 : p < 0.6 ? 1 : 2;
    const max = Math.max(4, Math.floor(W / (pw + 4)) - 6);
    const list = (state.plants || []).slice(-max);
    const key = `${W}|${slim}|${signX}|${list.length}|${state.lastDone}|${growing}|${stg}`;
    if (!force && key === plantsKey) return;
    plantsKey = key;
    const clear = slim ? 50 : 58;
    const usable = W - 24 - clear * 2;
    box.innerHTML =
      list
        .map((pl, i) =>
        {
          let x = 12 + rnd((pl.t || 0) + i * 7919) * usable;
          if (x > signX - clear) x += clear * 2; // hop over the sign
          const tilt = (rnd(i + 31) - 0.5) * 8;
          const fresh = state.lastDone && pl.t === state.lastDone;
          return `<span class="sb-plant${fresh ? " is-new" : ""}" style="left:${x.toFixed(0)}px;--t:${tilt.toFixed(1)}deg">${plantSVG(pl.k, 3, i)}</span>`;
        })
        .join("") +
      (growing
        ? `<span class="sb-plant is-growing" style="left:${(signX + clear - 6).toFixed(0)}px">${plantSVG(0, stg)}</span>`
        : "");
  }

  function renderStage()
  {
    if (!stage || !stageOn || !state) return;
    const m = mood(state);
    stage.classList.toggle("is-walk", motion() && !(state.running && state.mode === "focus"));
    stage.classList.toggle("is-break", state.mode !== "focus");
    stage.classList.toggle("is-running", !!state.running);
    stage.classList.toggle("is-motion", motion());
    stage.querySelector(".sb-slabel").textContent =
      state.mode === "focus" ? "pomodoro" : state.mode === "long" ? "long break" : "break";
    stage.querySelector(".sb-ttime").textContent = fmt(leftMs(state));
    const main = stage.querySelector(".sb-sbtn.is-main");
    main.dataset.sb = state.running ? "pause" : "start";
    const icon = state.running ? "pause" : "play";
    if (main.dataset.icon !== icon)
    {
      main.innerHTML = ICONS[icon];
      main.dataset.icon = icon;
    }
    main.setAttribute("aria-label", mainLabel(state));
    stage.querySelector(".sb-board").title =
      `${state.petName}: lv ${level(state)} · ${(state.plants || []).length} plants · ${todayCount(state)} today`;
    stage.querySelector(".sb-sbar").style.width = `${(progress(state) * 100).toFixed(1)}%`;
    const kind = state.petKind || "mochi";
    if (m !== lastMood || kind !== lastKind)
    {
      const btn = stage.querySelector(".sb-petbtn");
      btn.innerHTML = petSVG(m);
      btn.setAttribute("aria-label", `Pet ${state.petName}`);
      lastMood = m;
      lastKind = kind;
    }
    renderPlants(false);
  }

  function startTick()
  {
    if (tick) return;
    tick = setInterval(() =>
    {
      if (!state) return;
      // the worker finishes the phase, and this catches an alarm that fired late
      if (state.running && state.endAt <= Date.now() - 1500) send("noop");
      render(false);
    }, 1000);
  }
  function stopTick()
  {
    clearInterval(tick);
    tick = 0;
  }

  function onState(next)
  {
    const prevDone = seenDone;
    state = next;
    seenDone = state.lastDone || 0;
    render(true);
    if (state.running && settings.study) startTick();
    else stopTick();
    if (prevDone && seenDone > prevDone && Date.now() - seenDone < 10000)
    {
      hearts();
      hop();
    }
  }

  // ---------------------------------------------------------------- start
  async function init()
  {
    const [{ settings: s }, local] = await Promise.all([
      new Promise(r => chrome.storage.sync.get("settings", r)),
      new Promise(r => chrome.storage.local.get([KEY, UI_KEY, "bl:pet:custom"], r)),
    ]);
    self.BlushPets.setCustom(local["bl:pet:custom"]);
    settings = { ...settings, ...(s || {}) };
    ui = { ...ui, ...(local[UI_KEY] || {}) };
    await build();
    const fresh = await send("noop"); // also lets the worker catch up on a finished phase
    seenDone = (fresh || local[KEY] || {}).lastDone || 0;
    onState(
      fresh || {
        mode: "focus",
        running: false,
        left: 25 * 60000,
        focusMin: 25,
        plants: [],
        total: 0,
        petName: "Mochi",
        petKind: "mochi",
      },
    );

    // banner.js builds the banner a moment later, so keep checking in case it comes or goes
    findHero();
    setInterval(() =>
    {
      findHero();
      layoutStage();
    }, 1500);
    window.addEventListener("resize", layoutStage);

    chrome.storage.onChanged.addListener((changes, area) =>
    {
      if (area === "local" && changes["bl:pet:custom"])
      {
        self.BlushPets.setCustom(changes["bl:pet:custom"].newValue);
        lastKind = ""; // redraw the buddy
        render(true);
      }
      if (area === "local" && changes[KEY] && changes[KEY].newValue) onState(changes[KEY].newValue);
      if (area === "sync" && changes.settings)
      {
        settings = { ...settings, ...(changes.settings.newValue || {}) };
        setTimeout(layoutStage, 50);
        render(true);
        if (state && state.running && settings.study) startTick();
        else stopTick();
      }
    });
    document.addEventListener("visibilitychange", () =>
    {
      if (!document.hidden && state) render(true);
    });
  }

  if (window.top !== window) return;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
