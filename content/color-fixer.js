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
  "#blush-root, #blush-hero, #blush-study, .bl-card-tools, .ic-DashboardCard__header_hero, .ic-DashboardCard__header_image, .mce-tinymce, .tox";
const dfApplied = new WeakMap();
const dfQueue = [];
const dfQueued = new Set(); // elements already waiting, so a re-mounted subtree isn't checked twice
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

// colors that already come from Blush (or your own palette) are never "Canvas blue",
// so a teal or blue palette does not get re-tinted by the fixer
const DF_TOKENS = [
  "--bl-text",
  "--bl-muted",
  "--bl-accent",
  "--bl-accent-strong",
  "--bl-surface",
  "--bl-surface-2",
  "--bl-bg",
  "--bl-nav",
  "--bl-nav-text",
  "--bl-nav-muted",
  "--bl-on-accent",
  "--bl-border",
  "--bl-border-ui",
  "--bl-accent-soft",
];
let dfOwn = new Set();
function dfReadTokens()
{
  const cs = getComputedStyle(root);
  dfOwn = new Set();
  DF_TOKENS.forEach(k =>
  {
    let h = cs.getPropertyValue(k).trim().replace("#", "");
    if (h.length === 3)
      h = h
        .split("")
        .map(c => c + c)
        .join("");
    if (/^[0-9a-f]{6}$/i.test(h))
      dfOwn.add(
        `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`,
      );
  });
}
const dfIsOwn = c => dfOwn.has(`${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)}`);

function dfDecide(el)
{
  const cs = getComputedStyle(el);
  const out = { cls: [], vars: null };
  const bg = parseRGB(cs.backgroundColor);
  const leaf = !el.firstElementChild && !el.textContent.trim();
  if (bg && bg.a > 0.4 && !dfIsOwn(bg) && !/url\(/.test(cs.backgroundImage))
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
  if (fg && !dfIsOwn(fg))
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
  if (!dfQueued.has(rootEl))
  {
    dfQueued.add(rootEl);
    list.push(rootEl);
  }
  for (let c = rootEl.firstElementChild; c; c = c.nextElementSibling) dfCollect(c, list);
}
function dfEnqueue(node)
{
  if (node.nodeType !== 1 || (node.closest && node.closest(DF_SKIP_SEL))) return;
  dfCollect(node, dfQueue);
  dfSchedule();
}
function dfSchedule()
{
  if (dfScheduled) return;
  dfScheduled = true;
  requestAnimationFrame(dfFlush);
}
function dfFlush()
{
  dfScheduled = false;
  dfReadTokens();
  // small batches until about 8 ms of this frame is used, so a big page never stalls
  const until = performance.now() + 8;
  while (dfQueue.length && performance.now() < until) dfApply(dfQueue.splice(0, 300));
  if (dfQueue.length) dfSchedule();
}
function dfApply(batch)
{
  batch.forEach(el => dfQueued.delete(el));
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
}
function cleanCardTitles(scope)
{
  if (!scope || scope.nodeType !== 1) return;
  const titles = scope.matches(".ic-DashboardCard__header-title")
    ? [scope]
    : scope.querySelectorAll(".ic-DashboardCard__header-title");
  titles.forEach(t =>
  {
    const walker = document.createTreeWalker(t, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode())
    {
      if (!n.nodeValue.trim()) continue;
      const clean = cleanCourseName(n.nodeValue);
      if (clean !== n.nodeValue.trim())
      {
        if (!t.getAttribute("title")) t.setAttribute("title", n.nodeValue.trim());
        n.nodeValue = clean;
      }
    }
  });
}
function startColorFixer()
{
  cleanCardTitles(document.body);
  decorateCards(document.body);
  dfEnqueue(document.body);
  new MutationObserver(records =>
  {
    for (const r of records)
    {
      if (r.type === "childList")
        r.addedNodes.forEach(n =>
        {
          dfEnqueue(n);
          cleanCardTitles(n);
          decorateCards(n);
        });
      else if (r.type === "attributes")
      {
        // when Canvas rewrites an element's classes it may have changed state (a selected tab, a new alert type),
        // so look at its real colors again instead of forcing the old answer back on
        const want = dfApplied.get(r.target);
        if (want && want.some(c => !r.target.classList.contains(c)) && !dfQueued.has(r.target))
        {
          dfApplied.delete(r.target);
          dfQueued.add(r.target);
          dfQueue.push(r.target);
          dfSchedule();
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
}
