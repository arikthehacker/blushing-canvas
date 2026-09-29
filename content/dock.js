// The floating to-do button and the drawer it opens.
"use strict";

let drawerMount = null;
function updateFab()
{
  if (!uiRoot) return;
  const n = openCount();
  const count = uiRoot.querySelector(".bl-fab-count");
  count.textContent = n;
  count.toggleAttribute("data-zero", n === 0);
  uiRoot.querySelector(".bl-fab").setAttribute("aria-label", `To-do panel, ${n} due in the next 7 days`);
}
function openDrawer()
{
  const d = uiRoot.querySelector(".bl-drawer");
  d.hidden = false;
  uiRoot.querySelector(".bl-fab").setAttribute("aria-expanded", "true");
  renderPanels();
  const h = d.querySelector(`#bl-hello-${drawerMount.id}`);
  if (h) h.focus();
}
function closeDrawer()
{
  const d = uiRoot.querySelector(".bl-drawer");
  if (d.hidden) return;
  d.hidden = true;
  const fab = uiRoot.querySelector(".bl-fab");
  fab.setAttribute("aria-expanded", "false");
  fab.focus();
}
const toggleDrawer = () => (uiRoot.querySelector(".bl-drawer").hidden ? openDrawer() : closeDrawer());

function updateThemeButtons()
{
  renderPanels();
  if (uiRoot)
  {
    const tb = uiRoot.querySelector('[data-act="pal-theme"]');
    if (tb) tb.setAttribute("aria-label", `Switch to ${isDark() ? "light" : "dark"} theme`);
  }
}
