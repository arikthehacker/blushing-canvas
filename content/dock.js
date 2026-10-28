// The to-do column docked on the right, and the slim rail it folds into.
"use strict";

let dockMount = null;
function updateRail()
{
  if (!uiRoot) return;
  const n = openCount();
  const c = uiRoot.querySelector(".bl-rail-count");
  c.textContent = n;
  c.toggleAttribute("data-zero", n === 0);
  const ob = uiRoot.querySelector('[data-act="rail-open"]');
  ob.setAttribute("aria-label", `Open to-do column, ${n} due in the next 7 days`);
  ob.title = "Open column (T)";
  const tb = uiRoot.querySelector('[data-act="rail-theme"]');
  tb.setAttribute("aria-label", `Switch to ${isDark() ? "light" : "dark"} theme`);
  tb.title = isDark() ? "Light theme" : "Dark theme";
  tb.innerHTML = isDark() ? ICON.sun : ICON.moon;
}
function applyDock()
{
  if (!uiRoot || !dockMount) return;
  const open = !!settings.dockOpen;
  root.classList.add("bl-docked");
  root.classList.toggle("bl-dock-open", open);
  uiRoot.querySelector(".bl-dock").classList.toggle("is-open", open);
  dockMount.el.hidden = !open;
  uiRoot.querySelector(".bl-rail").hidden = open;
  uiRoot.querySelector('[data-act="rail-open"]').setAttribute("aria-expanded", String(open));
}
function setDock(open, moveFocus = true)
{
  settings.dockOpen = open;
  saveSettings();
  applyDock();
  if (open)
  {
    renderPanels();
    const h = moveFocus && dockMount.el.querySelector(`#bl-hello-${dockMount.id}`);
    if (h) h.focus();
  }
  else if (moveFocus)
  {
    uiRoot.querySelector('[data-act="rail-open"]').focus();
  }
}
// the "+1 overdue" line in the banner opens the column at its overdue group
function openOverdue()
{
  if (!dockMount) return;
  dockMount.tab = "due";
  if (settings.dockOpen) renderPanels();
  else setDock(true, false);
  const title = [...dockMount.el.querySelectorAll(".bl-group-title")].find(
    h => h.textContent.trim() === "Overdue",
  );
  const group =
    dockMount.el.querySelector('[aria-label="Overdue"]') || (title && (title.closest("section") || title));
  if (!group) return;
  group.scrollIntoView({ block: "start", behavior: reduceMQ.matches ? "auto" : "smooth" });
  const first = group.querySelector("a, input, button");
  if (first) first.focus({ preventScroll: true });
}
const closeDrawer = () => setDock(false);
const toggleDrawer = () => setDock(!settings.dockOpen);

function updateThemeButtons()
{
  renderPanels();
  if (uiRoot)
  {
    const tb = uiRoot.querySelector('[data-act="pal-theme"]');
    if (tb) tb.setAttribute("aria-label", `Switch to ${isDark() ? "light" : "dark"} theme`);
  }
}
