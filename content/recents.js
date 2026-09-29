// Remembers the last pages you opened so quick jump can offer them.
"use strict";

function recordVisit()
{
  const url = location.pathname + location.search;
  if (/^\/(login|logout|api)/.test(location.pathname)) return;
  const title = (document.title || "").replace(/\s*[:|]\s*Canvas.*$/i, "").trim() || url;
  state.recents = [{ url, title }].concat(state.recents.filter(r => r.url !== url)).slice(0, 12);
  store.set("local", lk("recents"), state.recents);
}
