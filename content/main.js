// Starts everything once the page is ready.
"use strict";

async function init()
{
  ready = true;
  applySettings();
  await buildUI();

  const [todos, wins, recents, focus] = await Promise.all([
    store.get("local", lk("todos")),
    store.get("local", "bl:wins"),
    store.get("local", lk("recents")),
    store.get("local", "bl:focus"),
  ]);
  state.focus = focus || null;
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
  swr("items", 3 * 60e3, loadItems, (v, err) =>
  {
    if (v)
    {
      state.items = v;
      state.itemsError = false;
    }
    else if (err) state.itemsError = true;
    renderPanels();
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
