// Single-key shortcuts: 1-9, G then a letter, T, P and friends.
"use strict";

function isTyping(e)
{
  const t = e.composedPath ? e.composedPath()[0] : e.target;
  if (!t || !t.tagName) return false;
  return (
    t.isContentEditable ||
    /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) ||
    !!(t.closest && t.closest('[role="textbox"], [contenteditable="true"]'))
  );
}
let gUntil = 0;
function gTarget(key)
{
  const cid = courseIdFromPath();
  const base = cid ? `/courses/${cid}` : null;
  const map = {
    d: "/",
    k: "/calendar",
    i: "/conversations",
    G: "/grades",
    h: base || "/",
    a: base && `${base}/assignments`,
    m: base && `${base}/modules`,
    g: base ? `${base}/grades` : "/grades",
    f: base ? `${base}/files` : "/files",
    s: base && `${base}/assignments/syllabus`,
    n: base && `${base}/announcements`,
    x: base && `${base}/discussion_topics`,
    p: base && `${base}/pages`,
  };
  return map[key] || null;
}
function onKeyDown(e)
{
  if (e.defaultPrevented) return;
  const typing = isTyping(e);
  const k = e.key;
  if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && k.toLowerCase() === "k")
  {
    if (pal.open)
    {
      e.preventDefault();
      closePalette();
      return;
    }
    if (!typing)
    {
      e.preventDefault();
      openPalette();
    }
    return;
  }
  if (k === "Escape")
  {
    if (pal.open)
    {
      e.preventDefault();
      closePalette();
      return;
    }
    const help = uiRoot.querySelector("#bl-help");
    if (!help.hidden)
    {
      e.preventDefault();
      closeHelp();
      return;
    }
    const d = uiRoot.querySelector(".bl-dock-panel");
    if (!d.hidden && d.contains(e.composedPath()[0]) && matchMedia("(max-width: 1099px)").matches)
    {
      e.preventDefault();
      closeDrawer();
    }
    return;
  }
  if (pal.open || !uiRoot.querySelector("#bl-help").hidden) return;
  if (!settings.shortcuts || typing || e.metaKey || e.ctrlKey || e.altKey) return;

  if (Date.now() < gUntil)
  {
    gUntil = 0;
    const url = gTarget(k);
    if (url)
    {
      e.preventDefault();
      go(url);
    }
    return;
  }
  if (k === "g")
  {
    gUntil = Date.now() + 1500;
    return;
  }
  if (k === "/")
  {
    e.preventDefault();
    openPalette();
    return;
  }
  if (k === "t")
  {
    e.preventDefault();
    toggleDrawer();
    return;
  }
  if (k === "p" && settings.study)
  {
    e.preventDefault();
    chrome.runtime.sendMessage({ type: "bl:study", act: "toggle" });
    return;
  }
  if (k === "?")
  {
    e.preventDefault();
    openHelp();
    return;
  }
  if (/^[1-9]$/.test(k))
  {
    const c = state.courses[+k - 1];
    if (c)
    {
      e.preventDefault();
      go(`/courses/${c.id}`);
    }
  }
}
