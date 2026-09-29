// Instant navigation: speculation rules that prerender safe Canvas links on hover.
"use strict";

const UNSAFE = [
  { href_matches: "/logout*" },
  { href_matches: "/login*" },
  { href_matches: "/*download*" },
  { href_matches: "/*/external_tools/*" },
  { href_matches: "/*/lti/*" },
  { href_matches: "/courses/*/modules/items/*" },
  { href_matches: "/*/take*" },
  { selector_matches: '[data-method], [download], [target="_blank"], [href^="#"]' },
];
// these pages mark things as read or start something when they open, so fetch their HTML but never run it early
const NO_PRERENDER = [
  { href_matches: "/*/discussion_topics/*" },
  { href_matches: "/*/announcements/*" },
  { href_matches: "/conversations*" },
  { href_matches: "/*/quizzes/*" },
];
function isSafeUrl(url)
{
  try
  {
    const u = new URL(url, location.href);
    if (u.origin !== location.origin) return false;
    return !/\/(logout|login)|download|external_tools|\/lti\/|modules\/items|\/take|discussion_topics\/|announcements\/|conversations|quizzes\//.test(
      u.pathname,
    );
  }
  catch (e)
  {
    return false;
  }
}
const specSupported = () => HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules");

let hoverPrefetchOn = false;
const prefetched = new Set();
function hoverPrefetch(e)
{
  if (!settings.prefetch) return;
  const a = e.target && e.target.closest && e.target.closest("a[href]");
  if (!a || a.hasAttribute("download") || a.hasAttribute("data-method") || a.target === "_blank") return;
  const url = a.href;
  if (prefetched.has(url) || !isSafeUrl(url) || url.split("#")[0] === location.href.split("#")[0]) return;
  const t = setTimeout(() =>
  {
    prefetched.add(url);
    const l = document.createElement("link");
    l.rel = "prefetch";
    l.href = url;
    document.head.appendChild(l);
  }, 90);
  a.addEventListener("mouseleave", () => clearTimeout(t), { once: true });
}
function installSpeculation()
{
  if (!specSupported() && !hoverPrefetchOn)
  {
    hoverPrefetchOn = true;
    document.addEventListener("mouseover", hoverPrefetch, { passive: true });
    document.addEventListener("focusin", hoverPrefetch);
  }
  const old = document.getElementById("bl-spec");
  if (old) old.remove();
  if (!settings.prefetch || !specSupported()) return;
  const s = document.createElement("script");
  s.type = "speculationrules";
  s.id = "bl-spec";
  s.textContent = JSON.stringify({
    prerender: [
      {
        source: "document",
        where: { and: [{ href_matches: "/*" }, { not: { or: UNSAFE.concat(NO_PRERENDER) } }] },
        eagerness: "moderate",
      },
    ],
    prefetch: [
      {
        source: "document",
        where: { and: [{ href_matches: "/*" }, { not: { or: UNSAFE } }] },
        eagerness: "moderate",
      },
    ],
  });
  (document.head || document.documentElement).appendChild(s);
}
// prerender whichever palette result is highlighted so Enter lands instantly
function speculate(url)
{
  const old = document.getElementById("bl-spec-pal");
  if (old) old.remove();
  if (!url || !settings.prefetch || !specSupported() || !isSafeUrl(url)) return;
  const s = document.createElement("script");
  s.type = "speculationrules";
  s.id = "bl-spec-pal";
  s.textContent = JSON.stringify({ prerender: [{ source: "list", urls: [url], eagerness: "immediate" }] });
  document.head.appendChild(s);
}
