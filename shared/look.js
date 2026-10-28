/* Blush for Canvas: custom look (colors + fonts)
   Shared by the popup and the content script. Stored in chrome.storage.sync under "look". */
(() =>
{
  "use strict";

  const LOOK_DEFAULTS = {
    colorsOn: false,
    applyTo: "both", // both | light | dark
    colors: { accent: "#A3526A", bg: "#FAF6F6", surface: "#FFFFFF", text: "#2A2025", nav: "#35262D" },
    palette: [], // swatches from an uploaded palette
    fontBody: "", // Google Fonts family name, '' = Blush default
    fontHeading: "",
    handwriting: false, // Arik Hand everywhere
    bgFade: 70, // how much the page color covers a background photo (0-95)
  };

  const PRESETS = [
    {
      name: "Blush",
      colors: { accent: "#A3526A", bg: "#FAF6F6", surface: "#FFFFFF", text: "#2A2025", nav: "#35262D" },
    },
    {
      name: "Sage",
      colors: { accent: "#5E7D63", bg: "#F5F7F2", surface: "#FFFFFF", text: "#1F2A21", nav: "#2B3A2E" },
    },
    {
      name: "Lavender",
      colors: { accent: "#7A5AA6", bg: "#F7F5FB", surface: "#FFFFFF", text: "#241F2E", nav: "#2F2740" },
    },
    {
      name: "Ocean",
      colors: { accent: "#2F6F8F", bg: "#F3F7F9", surface: "#FFFFFF", text: "#17252D", nav: "#1C2F3A" },
    },
    {
      name: "Cocoa",
      colors: { accent: "#B0703F", bg: "#1E1916", surface: "#2A231F", text: "#F1E7DF", nav: "#141110" },
    },
    {
      name: "Night",
      colors: { accent: "#E3A5B4", bg: "#14151B", surface: "#1F2029", text: "#E8E6EE", nav: "#0C0D11" },
    },
    {
      // indigo sky, gold stars and lavender text, and the banner turns into the twinkling stars
      name: "Night sky",
      colors: {
        accent: "#F3D9A4",
        bg: "#1C1937",
        surface: "#2A2650",
        text: "#ECE8F6",
        nav: "#16152B",
        glow: "#966E8C",
      },
      banner: "stars",
    },
  ];

  // ---------------------------------------------------------------- color math
  const clamp = (n, a = 0, b = 255) => Math.max(a, Math.min(b, n));
  function toRgb(hex)
  {
    let h = String(hex || "")
      .replace("#", "")
      .trim();
    if (h.length === 3)
      h = h
        .split("")
        .map(c => c + c)
        .join("");
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const toHex = rgb =>
    "#" +
    rgb
      .map(v => clamp(Math.round(v)).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  const normHex = hex =>
  {
    const r = toRgb(hex);
    return r ? toHex(r) : null;
  };
  const mix = (a, b, t) =>
  {
    const x = toRgb(a),
      y = toRgb(b);
    return toHex(x.map((v, i) => v + (y[i] - v) * t));
  };
  function lum(hex)
  {
    const c = toRgb(hex).map(v =>
    {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  const contrast = (a, b) =>
  {
    const x = lum(a),
      y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const isDarkColor = hex => lum(hex) < 0.18;
  function saturation(hex)
  {
    const [r, g, b] = toRgb(hex).map(v => v / 255);
    const mx = Math.max(r, g, b),
      mn = Math.min(r, g, b);
    if (mx === mn) return 0;
    const l = (mx + mn) / 2;
    return (mx - mn) / (1 - Math.abs(2 * l - 1));
  }
  const rgba = (hex, a) =>
  {
    const [r, g, b] = toRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };
  // nudge a color toward black or white until it reads on the background
  function readableOn(color, bg, target = 4.5)
  {
    let c = color;
    const dir = isDarkColor(bg) ? "#FFFFFF" : "#000000";
    for (let i = 0; i < 20 && contrast(c, bg) < target; i++) c = mix(c, dir, 0.12);
    return c;
  }

  // five picked colors -> every --bl-* token the theme uses
  function deriveTokens(c)
  {
    const dark = isDarkColor(c.bg);
    const accent = c.accent;
    const textAccent = readableOn(accent, c.surface, 4.5);
    const navDark = isDarkColor(c.nav);
    return {
      "--bl-bg": c.bg,
      "--bl-grid": rgba(accent, dark ? 0.07 : 0.09),
      "--bl-surface": c.surface,
      "--bl-surface-2": mix(c.surface, accent, dark ? 0.1 : 0.07),
      "--bl-border": mix(c.surface, c.text, dark ? 0.16 : 0.12),
      "--bl-border-ui": mix(c.surface, c.text, 0.42),
      "--bl-text": c.text,
      "--bl-muted": readableOn(mix(c.text, c.bg, 0.35), c.surface, 4.5),
      "--bl-accent": textAccent,
      "--bl-accent-strong": mix(textAccent, dark ? "#FFFFFF" : "#000000", 0.16),
      "--bl-accent-soft": mix(c.surface, accent, dark ? 0.22 : 0.16),
      "--bl-on-accent":
        contrast(textAccent, "#FFFFFF") >= contrast(textAccent, "#111111") ? "#FFFFFF" : "#111111",
      "--bl-nav": c.nav,
      "--bl-nav-text": navDark ? mix(c.nav, "#FFFFFF", 0.92) : mix(c.nav, "#000000", 0.88),
      "--bl-nav-muted": navDark ? mix(c.nav, "#FFFFFF", 0.7) : mix(c.nav, "#000000", 0.6),
      "--bl-focus": textAccent,
      "--bl-c-hero-text": c.text,
      "--bl-c-hero-muted": readableOn(mix(c.text, c.bg, 0.3), c.bg, 4.5),
      "--bl-c-hero-accent": readableOn(accent, c.bg, 4.5),
      "--bl-c-hero-bg": c.bg,
      "--bl-c-hero-tint": accent,
      "--bl-sky-glow": c.glow || accent, // the soft color blobs behind the stars
      "--bl-on-wood": readableOn(accent, "#EFD5B0", 4.5), // writing on the wooden signs
      "color-scheme": dark ? "dark" : "light",
    };
  }
  const TOKEN_NAMES = Object.keys(deriveTokens(LOOK_DEFAULTS.colors));

  // pick roles from a palette: background, cards, text, accent, sidebar
  function autoAssign(list, wantDark)
  {
    const cols = [...new Set(list.map(normHex).filter(Boolean))];
    if (!cols.length) return null;
    const byLum = [...cols].sort((a, b) => lum(a) - lum(b));
    const darkest = byLum[0],
      lightest = byLum[byLum.length - 1];
    if (wantDark === undefined) wantDark = false;
    let bg = wantDark ? darkest : lightest;
    // tone very loud backgrounds down so pages stay easy to read
    if (!wantDark && lum(bg) < 0.75) bg = mix(bg, "#FFFFFF", 0.85);
    if (wantDark && lum(bg) > 0.04) bg = mix(bg, "#000000", 0.8);
    const surface = wantDark ? mix(bg, "#FFFFFF", 0.06) : lum(bg) > 0.9 ? "#FFFFFF" : mix(bg, "#FFFFFF", 0.6);
    let text = wantDark ? lightest : darkest;
    if (contrast(text, surface) < 7) text = wantDark ? mix(text, "#FFFFFF", 0.7) : mix(text, "#000000", 0.7);
    const rest = cols.filter(x => x !== lightest && x !== darkest);
    const accent = (rest.length ? rest : cols).slice().sort((a, b) => saturation(b) - saturation(a))[0];
    const navBase = rest.length > 1 ? rest.slice().sort((a, b) => lum(a) - lum(b))[0] : darkest;
    const nav = wantDark
      ? mix(navBase, "#000000", 0.75)
      : lum(navBase) > 0.1
        ? mix(navBase, "#000000", 0.6)
        : navBase;
    return {
      bg: normHex(bg),
      surface: normHex(surface),
      text: normHex(text),
      accent: normHex(accent),
      nav: normHex(nav),
    };
  }

  // ---------------------------------------------------------------- palette files
  function hexesFromText(text)
  {
    const out = [];
    // coolors links: coolors.co/palette/264653-2a9d8f-e9c46a or coolors.co/264653-2a9d8f
    const coolors = text.match(/coolors\.co\/(?:palette\/)?([0-9a-f]{6}(?:-[0-9a-f]{6})+)/i);
    if (coolors) coolors[1].split("-").forEach(h => out.push("#" + h));
    (text.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi) || []).forEach(h => out.push(h));
    (text.match(/rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}/gi) || []).forEach(m =>
    {
      const n = m.match(/\d{1,3}/g).map(Number);
      out.push(toHex(n));
    });
    // bare hex values like 264653 in JSON or plain lists
    if (!out.length) (text.match(/\b[0-9a-f]{6}\b/gi) || []).forEach(h => out.push("#" + h));
    return out;
  }
  function hexesFromGpl(text)
  {
    const out = [];
    text.split(/\r?\n/).forEach(line =>
    {
      const m = line.match(/^\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})/);
      if (m) out.push(toHex([+m[1], +m[2], +m[3]]));
    });
    return out;
  }
  // Adobe Swatch Exchange (.ase): RGB, CMYK, and gray entries
  function hexesFromAse(buf)
  {
    const v = new DataView(buf);
    if (v.getUint32(0) !== 0x41534546) return []; // "ASEF"
    const out = [];
    const count = v.getUint32(8);
    let p = 12;
    for (let i = 0; i < count && p < v.byteLength; i++)
    {
      const type = v.getUint16(p);
      const len = v.getUint32(p + 2);
      const start = p + 6;
      if (type === 0x0001)
      {
        const nameLen = v.getUint16(start);
        let q = start + 2 + nameLen * 2;
        const model = String.fromCharCode(
          v.getUint8(q),
          v.getUint8(q + 1),
          v.getUint8(q + 2),
          v.getUint8(q + 3),
        ).trim();
        q += 4;
        const f = k => v.getFloat32(q + k * 4);
        if (model === "RGB") out.push(toHex([f(0) * 255, f(1) * 255, f(2) * 255]));
        else if (model === "CMYK")
        {
          const [c, m, y, k] = [f(0), f(1), f(2), f(3)];
          out.push(toHex([255 * (1 - c) * (1 - k), 255 * (1 - m) * (1 - k), 255 * (1 - y) * (1 - k)]));
        }
        else if (model === "Gray") out.push(toHex([f(0) * 255, f(0) * 255, f(0) * 255]));
      }
      p = start + len;
    }
    return out;
  }
  // pull the main colors out of a palette picture (Pinterest, Coolors PNG, a screenshot...)
  function hexesFromImage(file)
  {
    return new Promise((resolve, reject) =>
    {
      const img = new Image();
      img.onload = () =>
      {
        const size = 80;
        const cv = document.createElement("canvas");
        const scale = Math.min(1, size / Math.max(img.width, img.height));
        cv.width = Math.max(1, Math.round(img.width * scale));
        cv.height = Math.max(1, Math.round(img.height * scale));
        const ctx = cv.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(img.src);
        const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
        const buckets = new Map();
        for (let i = 0; i < d.length; i += 4)
        {
          if (d[i + 3] < 128) continue;
          const key = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
          const b = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
          b.n++;
          b.r += d[i];
          b.g += d[i + 1];
          b.b += d[i + 2];
          buckets.set(key, b);
        }
        const ranked = [...buckets.values()]
          .sort((a, b) => b.n - a.n)
          .map(b => toHex([b.r / b.n, b.g / b.n, b.b / b.n]));
        const picked = [];
        const dist = (a, b) =>
        {
          const x = toRgb(a),
            y = toRgb(b);
          return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
        };
        for (const c of ranked)
        {
          if (picked.every(p => dist(p, c) > 48)) picked.push(c);
          if (picked.length >= 8) break;
        }
        resolve(picked);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
  async function paletteFromFile(file)
  {
    const name = file.name.toLowerCase();
    let list = [];
    if (file.type.startsWith("image/") && !name.endsWith(".svg")) list = await hexesFromImage(file);
    else if (name.endsWith(".ase")) list = hexesFromAse(await file.arrayBuffer());
    else
    {
      const text = await file.text();
      list = name.endsWith(".gpl") ? hexesFromGpl(text) : hexesFromText(text);
    }
    return [...new Set(list.map(normHex).filter(Boolean))].slice(0, 16);
  }

  // ---------------------------------------------------------------- fonts
  // accepts a family name, a fonts.google.com link, a fonts.googleapis.com link, or a <link> / @import snippet
  function parseFontInput(raw)
  {
    const s = String(raw || "").trim();
    if (!s) return "";
    let m = s.match(/[?&]family=([^&:"'>\s]+)/i);
    if (m) return decodeURIComponent(m[1].replace(/\+/g, " ")).trim();
    m = s.match(/fonts\.google\.com\/(?:specimen|share)\/([^/?#"'\s]+)/i);
    if (m) return decodeURIComponent(m[1].replace(/\+/g, " ")).trim();
    if (/^https?:|[<>{}]/.test(s)) return "";
    return s.replace(/["';]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
  }
  const FALLBACK =
    '"Inter", "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
  const fontStack = fam => (fam ? `"${fam}", ${FALLBACK}` : "");
  const b64ToBuf = b64 =>
  {
    const bin = atob(b64);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  };

  // the background worker fetches + caches the font files; we load them as binary so page CSP never blocks them
  const pending = new Map();
  function loadFont(family, doc = document)
  {
    if (!family) return Promise.resolve({ ok: true });
    if (pending.has(family)) return pending.get(family);
    const p = new Promise(resolve =>
    {
      chrome.runtime.sendMessage({ type: "bl:font", family }, res =>
      {
        if (chrome.runtime.lastError || !res || !res.ok)
        {
          pending.delete(family); // let a later try go through
          resolve(res || { ok: false, error: "Could not reach Google Fonts" });
          return;
        }
        res.faces.forEach(f =>
        {
          try
          {
            const face = new FontFace(res.family, b64ToBuf(f.data), {
              weight: f.weight,
              style: f.style,
              unicodeRange: f.unicodeRange || "U+0-10FFFF",
              display: "swap",
            });
            doc.fonts.add(face);
            face.load().catch(() =>
            {});
          }
          catch (e)
          {
            /* skip a bad face */
          }
        });
        resolve({ ok: true, family: res.family });
      });
    });
    pending.set(family, p);
    return p;
  }

  // the bundled handwriting font
  const HAND = "Arik Hand";
  let handLoad = null;
  function loadHand(doc = document)
  {
    if (handLoad) return handLoad;
    handLoad = fetch(chrome.runtime.getURL("fonts/ArikHand-Regular.ttf"))
      .then(r => r.arrayBuffer())
      .then(buf =>
      {
        const f = new FontFace(HAND, buf, { display: "swap" });
        doc.fonts.add(f);
        return f.load();
      })
      .catch(() =>
      {
        handLoad = null;
      });
    return handLoad;
  }

  // shrink a picture so storage stays light and pages paint fast
  function resizeImage(file, max = 1800, quality = 0.86)
  {
    return new Promise((resolve, reject) =>
    {
      const img = new Image();
      img.onload = () =>
      {
        const scale = Math.min(1, max / img.width);
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // ---------------------------------------------------------------- apply
  // inline custom properties on <html> win over theme.css and work under any page CSP
  function applyLook(look, darkNow, el = document.documentElement)
  {
    const L = { ...LOOK_DEFAULTS, ...(look || {}) };
    const useColors = L.colorsOn && (L.applyTo === "both" || (L.applyTo === "dark") === !!darkNow);
    const tokens = useColors ? deriveTokens({ ...LOOK_DEFAULTS.colors, ...L.colors }) : null;
    TOKEN_NAMES.forEach(k =>
    {
      if (tokens) el.style.setProperty(k, tokens[k]);
      else el.style.removeProperty(k);
    });
    el.classList.toggle("bl-custom-colors", !!tokens);
    const body = L.handwriting ? fontStack(HAND) : fontStack(L.fontBody);
    const head = L.handwriting ? fontStack(HAND) : fontStack(L.fontHeading);
    el.classList.toggle("bl-hand", !!L.handwriting);
    if (L.handwriting) loadHand(el.ownerDocument);
    el.style.setProperty("--bl-bg-fade", `${Math.max(0, Math.min(95, +L.bgFade || 0))}%`);
    if (body) el.style.setProperty("--bl-font", body);
    else el.style.removeProperty("--bl-font");
    if (head) el.style.setProperty("--bl-font-heading", head);
    else el.style.removeProperty("--bl-font-heading");
    if (!L.handwriting)
    {
      loadFont(L.fontBody, el.ownerDocument);
      loadFont(L.fontHeading, el.ownerDocument);
    }
    // when one palette covers both modes, the palette decides light or dark
    return tokens && L.applyTo === "both" ? isDarkColor(L.colors.bg) : null;
  }

  self.BlushLook = {
    LOOK_DEFAULTS,
    PRESETS,
    deriveTokens,
    autoAssign,
    paletteFromFile,
    hexesFromText,
    parseFontInput,
    loadFont,
    loadHand,
    resizeImage,
    applyLook,
    contrast,
    normHex,
    isDarkColor,
  };
})();
