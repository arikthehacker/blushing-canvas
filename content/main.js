// Starts everything once the page is ready.
"use strict";

async function init()
{
  ready = true;
  applySettings();
  await buildUI();

  const [todos, wins, recents, focus, welcomed] = await Promise.all([
    store.get("local", lk("todos")),
    store.get("local", "bl:wins"),
    store.get("local", lk("recents")),
    store.get("local", "bl:focus"),
    store.get("local", "bl:welcomed"),
  ]);
  state.focus = focus || null;
  state.welcomed = !!welcomed;
  state.todos = Array.isArray(todos) ? todos : [];
  state.wins = wins || {};
  state.recents = Array.isArray(recents) ? recents : [];
  recordVisit();
  renderPanels();
  loadArt();
  startColorFixer();

  swr("user", 24 * 3600e3, loadUser, v =>
  {
    if (v)
    {
      state.user = v;
      renderPanels();
    }
  });
  swr("courses", 6 * 3600e3, loadCourses, v =>
  {
    if (v)
    {
      state.courses = v.courses;
      state.colors = v.colors || {};
      renderPanels();
      if (pal.open) updatePalette();
    }
  });
  // the dashboard always asks Canvas again after the saved copy, so a just-submitted assignment shows as done
  if (location.pathname === "/")
  {
    store.get("local", lk("items")).then(cached =>
    {
      if (cached) setItems(cached.v, null, cached.t);
      refreshItems();
    });
    document.addEventListener("visibilitychange", () =>
    {
      if (document.visibilityState === "visible" && Date.now() - state.itemsAt > 60e3) refreshItems();
    });
  }
  else swr("items", 3 * 60e3, loadItems, setItems);
  setInterval(tickPanels, 30e3);
}

// only Canvas's app pages get Blush (not the login screen or raw API responses),
// and a page Chrome loaded ahead of a click waits until it's actually shown
function start()
{
  if (!document.getElementById("application") && !document.querySelector(".ic-app")) return;
  if (document.prerendering) document.addEventListener("prerenderingchange", init, { once: true });
  else init();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
