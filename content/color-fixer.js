// Repaints the parts of Canvas that hard-code white boxes and blue text.
"use strict";

// Canvas hard-codes white panels, dark grey text and blue links in hundreds of places.
// This reads each element's real colors once and tags it, so the dark theme (and the
// rule that turns blue text pink) reach parts plain CSS selectors miss.
const DF_SKIP_TAGS = new Set([
  "IMG",
  "VIDEO",
  "CANVAS",
  "PICTURE",
  "IFRAME",
  "SCRIPT",
  "STYLE",
  "LINK",
  "META",
  "NOSCRIPT",
  "BR",
  "OBJECT",
  "EMBED",
  "SOURCE",
  "TEMPLATE",
  "svg",
  "SVG",
  "MATH",
  "math",
]);
const DF_SKIP_SEL =
  "#blush-root, #blush-hero, .ic-DashboardCard__header_hero, .ic-DashboardCard__header_image, .mce-tinymce, .tox";
const dfApplied = new WeakMap();
const dfQueue = [];
let dfScheduled = false;

function parseRGB(str)
{
  const m = /rgba?\(([^)]+)\)/.exec(str || "");
  if (!m) return null;
  const p = m[1]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(Number);
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}
function lumOf(c)
{
  const f = v =>
  {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
function hslOf(c)
{
  const r = c.r / 255,
    g = c.g / 255,
    b = c.b / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    l = (max + min) / 2,
    d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  return { h, s, l };
}
const isBlue = hsl => hsl.s > 0.35 && hsl.h >= 190 && hsl.h <= 235;

function dfDecide(el)
{
  const cs = getComputedStyle(el);
  const out = { cls: [], vars: null };
  const bg = parseRGB(cs.backgroundColor);
  const leaf = !el.firstElementChild && !el.textContent.trim();
  if (bg && bg.a > 0.4 && !/url\(/.test(cs.backgroundImage))
  {
    const L = lumOf(bg),
      hsl = hslOf(bg);
    if (L > 0.5)
    {
      if (hsl.s < 0.25) out.cls.push("bl-df-bg");
      else if (!leaf)
      {
        out.cls.push("bl-df-tint");
        out.vars = { "--bl-df-t": `hsl(${hsl.h} ${Math.round(Math.min(hsl.s, 0.45) * 100)}% 19%)` };
      }
    }
    else if (isBlue(hsl) && !leaf)
    {
      out.cls.push("bl-df-accentbg");
    }
  }
  const fg = parseRGB(cs.color);
  if (fg)
  {
    const L = lumOf(fg),
      hsl = hslOf(fg);
    if (isBlue(hsl)) out.cls.push("bl-df-link");
    else if (hsl.s < 0.3 && L < 0.1) out.cls.push("bl-df-fg");
    else if (hsl.s < 0.3 && L < 0.3) out.cls.push("bl-df-muted");
    else if (hsl.s >= 0.3 && L < 0.3)
    {
      out.cls.push("bl-df-hue");
      out.vars = {
        ...(out.vars || {}),
        "--bl-df-c": `hsl(${hsl.h} ${Math.round(Math.min(hsl.s, 0.75) * 100)}% 74%)`,
      };
    }
  }
  const bt = parseRGB(cs.borderTopColor),
    bb = parseRGB(cs.borderBottomColor);
  const bl = parseRGB(cs.borderLeftColor);
  if ([bt, bb, bl].some(c => c && c.a > 0.3 && isBlue(hslOf(c)))) out.cls.push("bl-df-bdblue");
  if (
    (parseFloat(cs.borderTopWidth) > 0 && bt && lumOf(bt) > 0.45 && hslOf(bt).s < 0.3) ||
    (parseFloat(cs.borderBottomWidth) > 0 && bb && lumOf(bb) > 0.45 && hslOf(bb).s < 0.3)
  )
    out.cls.push("bl-df-bd");
  return out;
}

function dfCollect(rootEl, list)
{
  if (!rootEl || rootEl.nodeType !== 1) return;
  if (DF_SKIP_TAGS.has(rootEl.tagName) || rootEl.matches(DF_SKIP_SEL)) return;
  list.push(rootEl);
  for (let c = rootEl.firstElementChild; c; c = c.nextElementSibling) dfCollect(c, list);
}
function dfEnqueue(node)
{
  if (node.nodeType !== 1 || (node.closest && node.closest(DF_SKIP_SEL))) return;
  dfCollect(node, dfQueue);
  if (!dfScheduled)
  {
    dfScheduled = true;
    requestAnimationFrame(dfFlush);
  }
}
function dfFlush()
{
  dfScheduled = false;
  const batch = dfQueue.splice(0, 1500);
  // read everything first, then write, so the browser recalculates styles once per batch
  const decisions = batch.map(el => (el.isConnected ? dfDecide(el) : null));
  batch.forEach((el, i) =>
  {
    const d = decisions[i];
    if (!d) return;
    const prev = dfApplied.get(el) || [];
    const next = Array.from(new Set(prev.concat(d.cls)));
    if (next.length)
    {
      el.classList.add(...next);
      dfApplied.set(el, next);
    }
    if (d.vars) for (const k in d.vars) el.style.setProperty(k, d.vars[k]);
  });
  if (dfQueue.length)
  {
    dfScheduled = true;
    requestAnimationFrame(dfFlush);
  }
}
function startColorFixer()
{
  dfEnqueue(document.body);
  new MutationObserver(records =>
  {
    for (const r of records)
    {
      if (r.type === "childList") r.addedNodes.forEach(dfEnqueue);
      else if (r.type === "attributes")
      {
        // React re-renders can wipe our classes, so put them back
        const want = dfApplied.get(r.target);
        if (want && want.some(c => !r.target.classList.contains(c))) r.target.classList.add(...want);
      }
    }
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
}
