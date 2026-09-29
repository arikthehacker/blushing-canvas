// The keyboard shortcut list (?).
"use strict";

let helpLastFocus = null;
function openHelp()
{
  closePalette();
  helpLastFocus = deepActive();
  const h = uiRoot.querySelector("#bl-help");
  h.hidden = false;
  h.querySelector('[data-act="help-close"]').focus();
}
function closeHelp()
{
  const h = uiRoot && uiRoot.querySelector("#bl-help");
  if (!h || h.hidden) return;
  h.hidden = true;
  if (helpLastFocus && helpLastFocus.focus) helpLastFocus.focus();
}
