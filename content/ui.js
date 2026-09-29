// Builds the shadow roots and the markup for the dock, quick jump and the shortcut list.
"use strict";

async function buildUI()
{
  try
  {
    uiCssText = await (await fetch(chrome.runtime.getURL("styles/ui.css"))).text();
  }
  catch (e)
  {
    uiCssText = "";
  }

  const host = document.createElement("div");
  host.id = "blush-root";
  document.body.appendChild(host);
  uiRoot = await makeShadow(host);

  const shell = document.createElement("div");
  shell.innerHTML = `
    <button class="bl-fab" type="button" aria-expanded="false" aria-controls="bl-drawer" aria-keyshortcuts="t">
      <span class="bl-fab-spark" aria-hidden="true">✦</span><span aria-hidden="true">To do</span>
      <span class="bl-fab-count" aria-hidden="true">·</span>
    </button>
    <aside class="bl-drawer" id="bl-drawer" aria-label="Blush to-do panel" hidden></aside>
    <div class="bl-toasts" aria-hidden="true"></div>
    <div class="bl-sr" id="bl-live" role="status" aria-live="polite"></div>

    <div class="bl-scrim" id="bl-pal" hidden>
      <div class="bl-dialog" role="dialog" aria-modal="true" aria-label="Quick jump">
        <div class="bl-pal-top">
          <span class="bl-fab-spark" aria-hidden="true">${ICON.search}</span>
          <input class="bl-pal-input" id="bl-pal-input" type="text" role="combobox" aria-expanded="true"
            aria-controls="bl-pal-list" aria-autocomplete="list" aria-label="Jump to a course, page, or assignment"
            placeholder="Jump to a course, page, or assignment…" autocomplete="off" spellcheck="false">
          <span class="bl-hint" aria-hidden="true">esc</span>
        </div>
        <ul class="bl-pal-list" id="bl-pal-list" role="listbox" aria-label="Results"></ul>
        <div class="bl-sr" id="bl-pal-status" role="status" aria-live="polite"></div>
        <div class="bl-pal-foot" aria-hidden="true">
          <span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span>
          <span><kbd>Ctrl</kbd> + <kbd>Enter</kbd> new tab</span><span>try “bio grades”</span>
        </div>
      </div>
    </div>

    <div class="bl-scrim" id="bl-help" hidden>
      <div class="bl-dialog" role="dialog" aria-modal="true" aria-labelledby="bl-help-title">
        <div class="bl-help">
          <div class="bl-head">
            <div><p class="bl-eyebrow"><b>//</b> Blush</p><h2 id="bl-help-title">Keyboard shortcuts</h2></div>
            <button class="bl-icon-btn" type="button" data-act="help-close" aria-label="Close shortcuts">${ICON.close}</button>
          </div>
          <table>
            <tr><th colspan="2" scope="colgroup">Anywhere</th></tr>
            <tr><td><kbd>Ctrl</kbd> + <kbd>K</kbd> or <kbd>/</kbd></td><td>Quick jump</td></tr>
            <tr><td><kbd>T</kbd></td><td>Open or close the to-do panel</td></tr>
            <tr><td><kbd>1</kbd> to <kbd>9</kbd></td><td>Open your 1st to 9th course</td></tr>
            <tr><td><kbd>G</kbd> then <kbd>D</kbd></td><td>Dashboard</td></tr>
            <tr><td><kbd>G</kbd> then <kbd>K</kbd></td><td>Calendar</td></tr>
            <tr><td><kbd>G</kbd> then <kbd>I</kbd></td><td>Inbox</td></tr>
            <tr><td><kbd>G</kbd> then <kbd>Shift</kbd> + <kbd>G</kbd></td><td>All grades</td></tr>
            <tr><td><kbd>?</kbd></td><td>This list</td></tr>
            <tr><th colspan="2" scope="colgroup">Inside a course</th></tr>
            <tr><td><kbd>G</kbd> then <kbd>H</kbd></td><td>Course home</td></tr>
            <tr><td><kbd>G</kbd> then <kbd>A</kbd></td><td>Assignments</td></tr>
            <tr><td><kbd>G</kbd> then <kbd>M</kbd></td><td>Modules</td></tr>
            <tr><td><kbd>G</kbd> then <kbd>G</kbd></td><td>Grades</td></tr>
            <tr><td><kbd>G</kbd> then <kbd>S</kbd></td><td>Syllabus</td></tr>
            <tr><td><kbd>G</kbd> then <kbd>N</kbd></td><td>Announcements</td></tr>
            <tr><td><kbd>G</kbd> then <kbd>X</kbd></td><td>Discussions</td></tr>
            <tr><td><kbd>G</kbd> then <kbd>F</kbd></td><td>Files</td></tr>
            <tr><td><kbd>G</kbd> then <kbd>P</kbd></td><td>Pages</td></tr>
          </table>
          <p class="bl-note">Single-key shortcuts pause while you type, and you can turn them off in the Blush popup.</p>
        </div>
      </div>
    </div>`;
  while (shell.firstChild) uiRoot.appendChild(shell.firstChild);

  // drawer mount
  drawerMount = { id: "d", el: uiRoot.querySelector(".bl-drawer"), withClose: true, tab: "due" };
  mounts.push(drawerMount);
  handlePanelEvents(drawerMount.el, drawerMount);
  uiRoot.querySelector(".bl-fab").addEventListener("click", toggleDrawer);

  // dashboard inline mount
  const rs = location.pathname === "/" && document.getElementById("right-side");
  if (rs)
  {
    const ih = document.createElement("div");
    ih.id = "blush-inline";
    rs.prepend(ih);
    rs.classList.add("bl-has-inline");
    const isr = await makeShadow(ih);
    const wrap = document.createElement("div");
    wrap.className = "bl-inline";
    isr.appendChild(wrap);
    const m = { id: "i", el: wrap, withClose: false, tab: "due" };
    mounts.push(m);
    handlePanelEvents(wrap, m);
  }

  // palette events
  const input = uiRoot.querySelector("#bl-pal-input");
  input.addEventListener("input", updatePalette);
  input.addEventListener("keydown", e =>
  {
    if (e.key === "ArrowDown")
    {
      e.preventDefault();
      setActive(pal.active + 1);
    }
    else if (e.key === "ArrowUp")
    {
      e.preventDefault();
      setActive(pal.active - 1);
    }
    else if (e.key === "PageDown")
    {
      e.preventDefault();
      setActive(Math.min(pal.active + 8, pal.results.length - 1));
    }
    else if (e.key === "PageUp")
    {
      e.preventDefault();
      setActive(Math.max(pal.active - 8, 0));
    }
    else if (e.key === "Enter")
    {
      e.preventDefault();
      const r = pal.results[pal.active];
      if (r)
      {
        const nt = e.ctrlKey || e.metaKey;
        if (nt) closePalette();
        go(r.url, nt);
      }
    }
    else if (e.key === "Tab")
    {
      e.preventDefault();
    } // focus stays in the dialog
  });
  const list = uiRoot.querySelector("#bl-pal-list");
  list.addEventListener("mousemove", e =>
  {
    const o = e.target.closest(".bl-opt");
    if (o && +o.dataset.i !== pal.active) setActive(+o.dataset.i);
  });
  list.addEventListener("click", e =>
  {
    const o = e.target.closest(".bl-opt");
    if (o) go(pal.results[+o.dataset.i].url, e.ctrlKey || e.metaKey);
  });
  uiRoot.querySelector("#bl-pal").addEventListener("mousedown", e =>
  {
    if (e.target.id === "bl-pal") closePalette();
  });

  // help events + focus trap
  const help = uiRoot.querySelector("#bl-help");
  help.addEventListener("mousedown", e =>
  {
    if (e.target.id === "bl-help") closeHelp();
  });
  help.querySelector('[data-act="help-close"]').addEventListener("click", closeHelp);
  help.addEventListener("keydown", e =>
  {
    if (e.key === "Tab")
    {
      e.preventDefault();
      help.querySelector('[data-act="help-close"]').focus();
    }
  });

  document.addEventListener("keydown", onKeyDown, true);
}
