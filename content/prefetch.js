// Instant navigation: speculation rules that start loading a Canvas link as you press it.
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
// these pages mark things as read or start something when they open, so they're never loaded early
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
    // a single assignment, page or file counts as a view on Canvas's side, so only course-level pages qualify
    return !/\/(logout|login)|download|external_tools|\/lti\/|modules\/items|\/take|discussion_topics\/|announcements\/|conversations|quizzes\/|\/assignments\/\d|\/pages\/.|\/files\/\d/.test(
      u.pathname,
    );
  }
  catch (e)
  {
    return false;
  }
}
const specSupported = () => HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules");

// reinstalling the rules cancels what Chrome already started, so only redo them when the setting changes
let specFor = null;
function installSpeculation()
{
  if (specFor === settings.prefetch) return;
  specFor = settings.prefetch;
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
        // on press, not on hover: Canvas logs a view (and can tick off "view this" in a module) when a page loads
        eagerness: "conservative",
      },
    ],
    prefetch: [
      {
        source: "document",
        where: { and: [{ href_matches: "/*" }, { not: { or: UNSAFE.concat(NO_PRERENDER) } }] },
        eagerness: "conservative",
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
