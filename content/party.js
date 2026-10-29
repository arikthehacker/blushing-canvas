// Celebrations when you check something off: confetti, stardust, petals, bubbles and stickers, picked to match your theme.
"use strict";

const party = (() =>
{
  // per theme: what "match my theme" picks, plus the colors that fly
  const LOOKS = {
    Blush: {
      match: "petals",
      cols: ["#A3526A", "#E8A0B4", "#F6C9A8", "#F3D9A4", "#C9B6E4"],
      petals: ["#E8A0B4", "#D98CA3", "#F2B8C6", "#C9708C", "#F6C9A8"],
    },
    Sage: {
      match: "leaves",
      cols: ["#5E7D63", "#A9C4A0", "#E8D8A8", "#F2C6B4", "#C8D9B8"],
      petals: ["#7FA07F", "#A9C4A0", "#5E7D63", "#C8D9B8", "#D9C98A"],
    },
    Lavender: {
      match: "confetti",
      cols: ["#7A5AA6", "#B9A1DE", "#F2B8C6", "#A8D5E2", "#F3D9A4"],
      petals: ["#C9B6E4", "#B9A1DE", "#E4D9F2", "#9C7FC8"],
    },
    Ocean: {
      match: "bubbles",
      cols: ["#2F6F8F", "#7FC3DC", "#A8DCEB", "#F3D9A4", "#F2B8C6"],
      petals: ["#7FC3DC", "#A8DCEB", "#CFEFF6", "#5AA6C4"],
    },
    Cocoa: {
      match: "sprinkles",
      cols: ["#F2B8C6", "#F3D9A4", "#A8DCEB", "#C8E6B0", "#FFFFFF", "#E0A070"],
      petals: ["#E0A070", "#F3D9A4", "#F2B8C6"],
    },
    Night: {
      match: "stardust",
      cols: ["#E3A5B4", "#F7D6DE", "#FFFFFF", "#C9B6E4"],
      petals: ["#E3A5B4", "#F7D6DE", "#C9B6E4"],
    },
    "Night sky": {
      match: "stardust",
      cols: ["#F3D9A4", "#FFF3D6", "#ECE8F6", "#E3B9D0"],
      petals: ["#F3D9A4", "#E3B9D0", "#FFF3D6"],
    },
  };
  const WORDS = ["nice!", "yay!", "done!", "wow!"];
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  let stickers = {}; // item key -> [shape, word, tilt]
  let noted = null; // the checkbox that was just ticked
  let cv = null;
  let ctx = null;
  let W = 0;
  let H = 0;
  let parts = [];
  let running = false;
  let last = 0;
  let glowy = false;

  // ---------------------------------------------------------------- which theme is on
  function theme()
  {
    const B = self.BlushLook;
    const L = { ...B.LOOK_DEFAULTS, ...(look || {}) };
    const dark = lookDark === null ? isDark() : lookDark;
    const custom = L.colorsOn && (L.applyTo === "both" || (L.applyTo === "dark") === dark);
    const c = custom ? { ...B.LOOK_DEFAULTS.colors, ...L.colors } : null;
    const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
    const preset = c
      ? B.PRESETS.find(p => same(p.colors.accent, c.accent) && same(p.colors.bg, c.bg))
      : B.PRESETS.find(p => p.name === (dark ? "Night" : "Blush"));
    if (preset)
      return { ...LOOKS[preset.name], accent: preset.colors.accent, dark: isDarkHex(preset.colors.bg) };
    // your own palette: confetti in its colors
    const cols = [c.accent, c.nav, ...(L.palette || []).slice(0, 4)].filter(Boolean);
    const soft = [mixHex(c.accent, "#FFFFFF", 0.35), mixHex(c.accent, "#FFFFFF", 0.6), c.accent];
    return { match: "confetti", cols, petals: soft, accent: c.accent, dark: isDarkHex(c.bg) };
  }
  function rgb(h)
  {
    const n = parseInt(String(h).slice(1, 7), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mixHex(a, b, t)
  {
    const x = rgb(a);
    const y = rgb(b);
    return (
      "#" +
      x
        .map((v, i) =>
          Math.round(v + (y[i] - v) * t)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
    );
  }
  function isDarkHex(h)
  {
    const [r, g, b] = rgb(h);
    return 0.299 * r + 0.587 * g + 0.114 * b < 110;
  }
  const mode = () => settings.celebration || "match";
  const effectFor = t => (mode() === "match" ? t.match : mode());

  // ---------------------------------------------------------------- stickers
  function stickerSVG(t, shape, word)
  {
    const fill = t.accent;
    const ink = isDarkHex(fill) ? "#FFFFFF" : "#2A2025";
    const size = word.length > 8 ? 16 : 30;
    // inline style, since canvas's own css would beat svg attributes
    const label = `<text x="50" y="${size > 20 ? 60 : 56}" text-anchor="middle" style="font: 700 ${size}px 'Arik Hand', 'Segoe Print', cursive"`;
    const shapes = [
      '<path d="M50 6l12.4 25.2 27.8 4-20.1 19.6 4.7 27.7L50 69.4 25.2 82.5l4.7-27.7L9.8 35.2l27.8-4z" fill="#F3C969" stroke="#FFFFFF" stroke-width="5" stroke-linejoin="round"/>',
      `<circle cx="50" cy="50" r="42" fill="${fill}" stroke="#FFFFFF" stroke-width="5"/><circle cx="50" cy="50" r="33" fill="none" stroke="${ink}" stroke-opacity=".45" stroke-width="1.6" stroke-dasharray="3 4"/>${label} fill="${ink}">${word}</text>`,
      `<path d="M50 5c6 0 8 6 14 7s11-3 15 1-1 10 2 15 9 6 9 12-6 8-7 14 3 11-1 15-10-1-15 2-6 9-12 9-8-6-14-7-11 3-15-1 1-10-2-15-9-6-9-12 6-8 7-14-3-11 1-15 10 1 15-2 6-9 12-9z" fill="${t.dark ? mixHex(fill, "#FFFFFF", 0.15) : mixHex(fill, "#FFFFFF", 0.55)}" stroke="#FFFFFF" stroke-width="4"/>${label} fill="${t.dark ? "#2A2025" : mixHex(fill, "#000000", 0.3)}">${word}</text>`,
    ];
    return `<svg viewBox="0 0 100 100" aria-hidden="true">${shapes[shape] || shapes[0]}</svg>`;
  }
  function stickerHTML(key)
  {
    const s = stickers[key];
    if (!s || mode() !== "stickers") return "";
    return `<span class="bl-sticker" style="--r:${s[2]}deg" aria-hidden="true">${stickerSVG(theme(), s[0], WORDS[s[1]] || WORDS[0])}</span>`;
  }
  function saveStickers()
  {
    const keys = Object.keys(stickers);
    // keep the newest 150
    keys.slice(0, Math.max(0, keys.length - 150)).forEach(k => delete stickers[k]);
    store.set("local", "bl:stickers", stickers);
  }

  // ---------------------------------------------------------------- the moment you tick a box
  // runs before the list re-renders, while the checkbox is still where you clicked it
  function note(el, key, kind)
  {
    const sel = el.dataset.fk
      ? `[data-fk="${CSS.escape(el.dataset.fk)}"]`
      : el.dataset.calm
        ? `[data-calm="${CSS.escape(el.dataset.calm)}"]`
        : "";
    noted = { rect: el.getBoundingClientRect(), root: el.getRootNode(), sel, key, kind };
    if (kind === "focus") return;
    if (el.checked && mode() === "stickers")
    {
      stickers[key] = [
        Math.floor(Math.random() * 3),
        Math.floor(Math.random() * WORDS.length),
        Math.round(R(-16, 12)),
      ];
      saveStickers();
    }
    else if (!el.checked && stickers[key])
    {
      delete stickers[key];
      saveStickers();
    }
  }

  // runs after the re-render, so it can find the new checkbox and sticker
  function play(big)
  {
    const n = noted;
    noted = null;
    if (mode() === "off" || document.hidden) return;
    const t = theme();
    const fx = effectFor(t);
    const box = n && n.sel ? n.root.querySelector(n.sel) : null;
    const rect = box && box.isConnected ? box.getBoundingClientRect() : n && n.rect;
    const row = box && box.closest(".bl-item");
    const sticker = row && row.querySelector(".bl-sticker");
    if (reduceMQ.matches)
    {
      // reduce motion: a soft glow on the box, nothing flies
      if (box)
      {
        box.classList.add("bl-glow");
        setTimeout(() => box.classList.remove("bl-glow"), 700);
      }
      return;
    }
    if (sticker)
    {
      const r = getComputedStyle(sticker).getPropertyValue("--r") || "0deg";
      sticker.animate(
        [
          { transform: `scale(2) rotate(calc(${r} - 30deg))`, opacity: 0 },
          { transform: `scale(0.9) rotate(${r})`, opacity: 1, offset: 0.65 },
          { transform: `scale(1) rotate(${r})`, opacity: 1 },
        ],
        { duration: 340, easing: "cubic-bezier(.2,.9,.3,1.3)" },
      );
    }
    if (!start(t)) return;
    if (rect)
    {
      const z = zoom();
      const x = (rect.left + rect.width / 2) / z;
      const y = (rect.top + rect.height / 2) / z;
      (SMALL[fx] || SMALL.confetti)(x, y, t);
    }
    if (big) (BIG[fx] || BIG.confetti)(t);
  }

  // ---------------------------------------------------------------- canvas
  const zoom = () => parseFloat(root.style.zoom) || 1;
  function start(t)
  {
    if (!uiRoot) return false;
    if (!cv)
    {
      cv = document.createElement("canvas");
      cv.className = "bl-party";
      cv.setAttribute("aria-hidden", "true");
      uiRoot.appendChild(cv);
      ctx = cv.getContext("2d");
      addEventListener("resize", () =>
      {
        if (running) size();
      });
    }
    glowy = t.dark;
    if (!running) size();
    cv.hidden = false;
    return true;
  }
  function size()
  {
    const z = zoom();
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth / z;
    H = innerHeight / z;
    cv.width = Math.round(W * dpr * z);
    cv.height = Math.round(H * dpr * z);
    ctx.setTransform(dpr * z, 0, 0, dpr * z, 0, 0);
  }
  function add(p)
  {
    parts.push({ age: 0, rot: 0, vr: 0, g: 0, drag: 1, fade: 30, ...p });
    if (!running)
    {
      running = true;
      last = performance.now();
      requestAnimationFrame(loop);
    }
  }
  function loop(now)
  {
    const dt = Math.min(2.5, (now - last) / 16.67);
    last = now;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = glowy ? "lighter" : "source-over";
    const born = [];
    parts = parts.filter(p =>
    {
      p.age += dt;
      if (p.age < 0) return true;
      if (p.age > p.life)
      {
        if (p.onEnd) p.onEnd(p, born);
        return false;
      }
      step(p, dt);
      ctx.globalAlpha = Math.max(0, Math.min(1, (p.life - p.age) / p.fade, p.age / 4));
      draw(p);
      return true;
    });
    born.forEach(add);
    ctx.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(loop);
    else
    {
      // all landed: let the big canvas go until next time
      running = false;
      cv.width = 0;
      cv.height = 0;
      cv.hidden = true;
    }
  }
  function step(p, dt)
  {
    const d = Math.pow(p.drag, dt);
    p.vx *= d;
    p.vy = p.vy * d + p.g * dt;
    if (p.term && p.vy > p.term) p.vy = p.term;
    if (p.sway) p.x += Math.sin(p.age * p.swayF + p.phase) * p.sway * dt;
    if (p.wobble) p.x += Math.sin(p.age * 0.15 + p.phase) * p.wobble * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    if (p.trail)
    {
      p.trail.push([p.x, p.y]);
      if (p.trail.length > 16) p.trail.shift();
    }
  }
  function star4(r)
  {
    ctx.beginPath();
    for (let i = 0; i < 8; i++)
    {
      const a = (i * Math.PI) / 4;
      const rr = i % 2 ? r * 0.28 : r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  }
  function draw(p)
  {
    ctx.save();
    if (p.kind === "meteor")
    {
      const tr = p.trail;
      const fade = ctx.globalAlpha;
      ctx.strokeStyle = p.color;
      ctx.lineCap = "round";
      for (let i = 1; i < tr.length; i++)
      {
        ctx.globalAlpha = (i / tr.length) * fade;
        ctx.lineWidth = (i / tr.length) * 3;
        ctx.beginPath();
        ctx.moveTo(tr[i - 1][0], tr[i - 1][1]);
        ctx.lineTo(tr[i][0], tr[i][1]);
        ctx.stroke();
      }
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 14;
      star4(5);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    if (p.kind === "rect")
    {
      ctx.scale(1, Math.cos(p.age * p.flip + p.phase));
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    }
    else if (p.kind === "dot")
    {
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    else if (p.kind === "sprinkle")
    {
      ctx.lineCap = "round";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-p.len / 2, 0);
      ctx.lineTo(p.len / 2, 0);
      ctx.stroke();
    }
    else if (p.kind === "star")
    {
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      star4(p.r * (0.75 + 0.25 * Math.sin(p.age * p.tw + p.phase)));
      ctx.fill();
    }
    else if (p.kind === "dust")
    {
      ctx.globalAlpha *= 0.55 + 0.45 * Math.sin(p.age * p.tw + p.phase);
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    else if (p.kind === "petal")
    {
      const r = p.r;
      ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.cos(p.age * 0.06 + p.phase)));
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.bezierCurveTo(r * 0.9, -r * 0.6, r * 0.7, r * 0.7, 0, r);
      ctx.bezierCurveTo(-r * 0.7, r * 0.7, -r * 0.9, -r * 0.6, 0, -r);
      ctx.fill();
      ctx.globalAlpha *= 0.35;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.ellipse(-r * 0.15, -r * 0.3, r * 0.18, r * 0.4, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    else if (p.kind === "leaf")
    {
      const r = p.r;
      ctx.scale(1, 0.6 + 0.4 * Math.abs(Math.cos(p.age * 0.06 + p.phase)));
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r * 0.8, 0, 0, r);
      ctx.quadraticCurveTo(-r * 0.8, 0, 0, -r);
      ctx.fill();
      ctx.globalAlpha *= 0.4;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.8);
      ctx.lineTo(0, r * 1.1);
      ctx.stroke();
    }
    else if (p.kind === "bubble")
    {
      const r = p.r * (1 + 0.06 * Math.sin(p.age * 0.3));
      const a = ctx.globalAlpha * 0.85;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = a * 0.18;
      ctx.fill();
      ctx.globalAlpha = a;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.62, -2.5, -1.6);
      ctx.stroke();
    }
    else if (p.kind === "ring")
    {
      const k = p.age / p.life;
      ctx.lineWidth = p.lw * (1 - k) + 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, p.r0 + (p.r1 - p.r0) * (1 - Math.pow(1 - k, 3)), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- the effects
  function ring(x, y, color, r1 = 26, life = 26)
  {
    add({ kind: "ring", x, y, vx: 0, vy: 0, color, r0: 4, r1, lw: 3, life, fade: life });
  }
  function dust(x, y, t, n, speed, life)
  {
    for (let i = 0; i < n; i++)
    {
      const a = R(0, Math.PI * 2);
      const sp = R(speed[0], speed[1]);
      add({
        kind: "dust",
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 0.4,
        g: 0.013,
        drag: 0.95,
        color: pick(t.cols),
        r: R(0.6, 1.8),
        tw: R(0.2, 0.5),
        phase: R(0, 6),
        life: R(life[0], life[1]),
        fade: 50,
        age: -R(0, 10),
      });
    }
  }
  function confettiPiece(x, y, ang, sp, t, extra)
  {
    const base = {
      x,
      y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      g: 0.24,
      drag: 0.972,
      color: pick(t.cols),
      rot: R(0, 6),
      vr: R(-0.25, 0.25),
      life: R(90, 140),
      fade: 30,
      ...extra,
    };
    if (Math.random() < 0.2) add({ ...base, kind: "dot", r: R(2, 3.5) });
    else add({ ...base, kind: "rect", w: R(4, 7), h: R(8, 13), flip: R(0.1, 0.3), phase: R(0, 6) });
  }
  function meteor(x, y, ang, sp, t, life = 46, delay = 0)
  {
    add({
      kind: "meteor",
      x,
      y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      drag: 0.99,
      color: t.accent,
      trail: [],
      life,
      fade: 18,
      age: -delay,
      onEnd(p)
      {
        dust(p.x, p.y, t, 12, [0.3, 1.8], [60, 110]);
      },
    });
  }
  function bubble(x, y, t, delay, popAt, vy)
  {
    add({
      kind: "bubble",
      x,
      y,
      vx: R(-0.8, 0.8),
      vy,
      g: -0.015,
      drag: 0.985,
      wobble: R(0.3, 0.8),
      phase: R(0, 6),
      color: pick(t.petals.concat(t.accent)),
      r: R(4, 11),
      age: -delay,
      life: popAt,
      fade: 3,
      onEnd(p, born)
      {
        born.push({
          kind: "ring",
          x: p.x,
          y: p.y,
          vx: 0,
          vy: 0,
          color: p.color,
          r0: p.r,
          r1: p.r * 1.9,
          lw: 1.5,
          life: 14,
          fade: 14,
        });
        for (let i = 0; i < 6; i++)
        {
          const a = (i / 6) * Math.PI * 2;
          born.push({
            kind: "dot",
            x: p.x,
            y: p.y,
            vx: Math.cos(a) * 1.6,
            vy: Math.sin(a) * 1.6,
            g: 0.05,
            drag: 0.92,
            color: p.color,
            r: 1.4,
            life: 22,
            fade: 12,
          });
        }
      },
    });
  }
  function fall(kind, x, y, t, extra)
  {
    add({
      kind,
      x,
      y,
      g: 0.07,
      term: R(0.9, 1.6),
      drag: 0.955,
      color: pick(t.petals),
      r: R(5, 9),
      sway: R(0.4, 1.1),
      swayF: R(0.04, 0.07),
      phase: R(0, 6),
      rot: R(0, 6),
      vr: R(-0.05, 0.05),
      life: R(150, 210),
      fade: 50,
      ...extra,
    });
  }

  // a burst from the checkbox
  const SMALL = {
    confetti(x, y, t)
    {
      ring(x, y, t.accent);
      for (let i = 0; i < 64; i++) confettiPiece(x, y, -Math.PI / 2 + R(-0.95, 0.95), R(4, 11), t);
    },
    sprinkles(x, y, t)
    {
      ring(x, y, t.accent);
      for (let i = 0; i < 56; i++)
      {
        const a = -Math.PI / 2 + R(-1, 1);
        const sp = R(4, 10);
        add({
          kind: "sprinkle",
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          g: 0.26,
          drag: 0.972,
          color: pick(t.cols),
          len: R(6, 10),
          rot: R(0, 6),
          vr: R(-0.2, 0.2),
          life: R(80, 120),
        });
      }
    },
    stardust(x, y, t)
    {
      ring(x, y, t.accent, 30, 30);
      for (let i = 0; i < 12; i++)
      {
        const a = R(0, Math.PI * 2);
        const sp = R(2.5, 6.5);
        add({
          kind: "star",
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 1,
          g: 0.035,
          drag: 0.92,
          color: pick(t.cols),
          r: R(4, 9),
          tw: R(0.15, 0.3),
          phase: R(0, 6),
          life: R(70, 110),
          fade: 40,
          vr: R(-0.03, 0.03),
        });
      }
      dust(x, y, t, 70, [0.4, 3.6], [90, 170]);
      meteor(x, y, -Math.PI / 2 + R(0.35, 0.7), 10, t);
    },
    petals(x, y, t, kind = "petal")
    {
      for (let i = 0; i < 24; i++)
      {
        const a = -Math.PI / 2 + R(-1.1, 1.1);
        const sp = R(3, 7.5);
        fall(kind, x, y, t, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
      }
    },
    leaves(x, y, t)
    {
      SMALL.petals(x, y, t, "leaf");
    },
    bubbles(x, y, t)
    {
      for (let i = 0; i < 16; i++) bubble(x + R(-8, 8), y, t, i * 3, R(45, 110), R(-1.2, -3));
    },
    stickers(x, y, t)
    {
      dust(x, y, t, 10, [1, 3], [30, 45]);
    },
  };

  // the whole week is done: across the whole screen
  const BIG = {
    confetti(t)
    {
      [
        [0, H, -Math.PI / 3],
        [W, H, (-2 * Math.PI) / 3],
      ].forEach(([x, y, a], s) =>
      {
        for (let w = 0; w < 2; w++)
          for (let i = 0; i < 90; i++)
            confettiPiece(x, y, a + R(-0.35, 0.35), R(10, 19) * (w ? 0.75 : 1), t, {
              g: 0.26,
              drag: 0.975,
              life: R(150, 220),
              fade: 40,
              age: -w * 16 - s * 4,
            });
      });
    },
    sprinkles(t)
    {
      for (let i = 0; i < 180; i++)
        add({
          kind: "sprinkle",
          x: R(0, W),
          y: R(-80, -10),
          vx: R(-0.5, 0.5),
          vy: R(2, 5),
          g: 0.12,
          drag: 0.99,
          color: pick(t.cols),
          len: R(7, 11),
          rot: R(0, 6),
          vr: R(-0.1, 0.1),
          life: R(160, 240),
          age: -R(0, 50),
        });
    },
    stardust(t)
    {
      for (let i = 0; i < 12; i++)
        meteor(
          R(W * 0.3, W * 1.1),
          R(-40, H * 0.3),
          Math.PI * 0.78 + R(-0.08, 0.08),
          R(11, 15),
          t,
          70,
          i * 9,
        );
      for (let i = 0; i < 160; i++)
        add({
          kind: "dust",
          x: R(0, W),
          y: R(0, H * 0.8),
          vx: R(-0.2, 0.2),
          vy: R(0.1, 0.5),
          color: pick(t.cols),
          r: R(0.6, 2),
          tw: R(0.1, 0.35),
          phase: R(0, 6),
          life: R(140, 240),
          fade: 80,
          age: -R(0, 60),
        });
      for (let i = 0; i < 18; i++)
        add({
          kind: "star",
          x: R(W * 0.1, W * 0.9),
          y: R(H * 0.08, H * 0.6),
          vx: 0,
          vy: 0.15,
          color: pick(t.cols),
          r: R(5, 11),
          tw: R(0.1, 0.2),
          phase: R(0, 6),
          life: R(120, 200),
          fade: 60,
          age: -R(10, 80),
        });
    },
    petals(t, kind = "petal")
    {
      for (let i = 0; i < 90; i++)
        fall(kind, R(-20, W + 20), R(-120, -10), t, {
          vx: R(-0.3, 0.6),
          vy: R(0.6, 1.4),
          g: 0.01,
          term: R(1, 1.8),
          r: R(6, 11),
          life: R(260, 380),
          fade: 60,
          age: -R(0, 90),
        });
    },
    leaves(t)
    {
      BIG.petals(t, "leaf");
    },
    bubbles(t)
    {
      for (let i = 0; i < 80; i++) bubble(R(0, W), H + 20, t, R(0, 70), R(90, 220), R(-2, -4.5));
    },
    stickers(t)
    {
      const el = document.createElement("span");
      el.className = "bl-sticker is-big";
      el.setAttribute("aria-hidden", "true");
      el.innerHTML = stickerSVG(t, 1, "week done!");
      uiRoot.appendChild(el);
      el.animate(
        [
          { transform: "scale(2.4) rotate(-40deg)", opacity: 0 },
          { transform: "scale(0.92) rotate(-8deg)", opacity: 1, offset: 0.6 },
          { transform: "scale(1) rotate(-8deg)", opacity: 1, offset: 0.75 },
          { transform: "scale(1) rotate(-8deg)", opacity: 1, offset: 0.92 },
          { transform: "scale(1.05) rotate(-8deg)", opacity: 0 },
        ],
        { duration: 2600, easing: "ease-out" },
      ).onfinish = () => el.remove();
      BIG.confetti(t);
    },
  };

  return {
    load(v)
    {
      stickers = v && typeof v === "object" ? v : {};
    },
    note,
    play,
    stickerHTML,
  };
})();
