// Settings, theme and the chrome.storage helpers every other content file uses.
"use strict";

const HOST = location.host;
const DEFAULTS = {
  theme: "auto",
  calm: true,
  hideClutter: true,
  shortcuts: true,
  prefetch: true,
  cheers: true,
  hero: true,
  heroFull: "dashboard",
  artSource: "both",
  name: "",
  dockOpen: true,
  study: true,
  stress: false,
  hideDashHeader: false,
  hideCardImages: false,
  hideCardIcons: false,
  stressSign: false,
  textSize: 100,
};
const root = document.documentElement;
const darkMQ = matchMedia("(prefers-color-scheme: dark)");
const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
let settings = { ...DEFAULTS };
let look = null; // custom colors + fonts from the popup
let lookDark = null; // a custom palette used for both modes decides light or dark itself
let ready = false;

// after Blush is updated, tabs opened before it can't reach storage anymore, so reads come back empty
// and writes are skipped instead of throwing
const store = {
  get: (area, key) =>
    new Promise(res =>
    {
      try
      {
        chrome.storage[area].get(key, v => res(v ? v[key] : undefined));
      }
      catch (e)
      {
        res(undefined);
      }
    }),
  set: (area, key, val) =>
    new Promise(res =>
    {
      try
      {
        chrome.storage[area].set({ [key]: val }, res);
      }
      catch (e)
      {
        res();
      }
    }),
};
const lk = name => `${HOST}:${name}`;

const isDark = () => settings.theme === "dark" || (settings.theme === "auto" && darkMQ.matches);

function applySettings()
{
  if (settings.theme === "auto") root.removeAttribute("data-bl-theme");
  else root.setAttribute("data-bl-theme", settings.theme);
  lookDark = self.BlushLook ? self.BlushLook.applyLook(look, isDark(), root) : null;
  root.classList.toggle("bl-dark", lookDark === null ? isDark() : lookDark);
  root.classList.toggle("bl-motion", !settings.calm);
  root.classList.toggle("bl-show-clutter", !settings.hideClutter);
  root.classList.toggle("bl-hide-dash-header", !!settings.hideDashHeader);
  root.classList.toggle("bl-hide-card-images", !!settings.hideCardImages);
  root.classList.toggle("bl-hide-card-icons", !!settings.hideCardIcons);
  root.classList.toggle("bl-stress-sign", !!settings.stressSign);
  // the size slider zooms canvas and blush together, like the browser zoom but only here
  root.style.zoom = settings.textSize && settings.textSize !== 100 ? String(settings.textSize / 100) : "";
  if (ready)
  {
    updateThemeButtons();
    installSpeculation();
    applyDock();
    skies.forEach(k => k.refresh()); // stars pick up new palette colors
  }
}
root.classList.toggle("bl-dark", darkMQ.matches);
darkMQ.addEventListener("change", applySettings);

let settingsLoaded = false;
Promise.all([store.get("sync", "settings"), store.get("sync", "look")]).then(([s, l]) =>
{
  settings = { ...DEFAULTS, ...(s || {}) };
  settingsLoaded = true;
  look = l || null;
  applySettings();
});
chrome.storage.onChanged.addListener((changes, area) =>
{
  if (area === "sync" && (changes.settings || changes.look))
  {
    if (changes.settings) settings = { ...DEFAULTS, ...(changes.settings.newValue || {}) };
    if (changes.look) look = changes.look.newValue || null;
    applySettings();
  }
  if (area === "local" && changes["bl:bgimg"]) applyPageImage(changes["bl:bgimg"].newValue || null);
  if (area === "local" && changes["bl:art:current"] && changes["bl:art:current"].newValue)
  {
    if (ready) setArt(changes["bl:art:current"].newValue);
  }
});
// nothing is saved until the stored settings have loaded, so the defaults never overwrite them
const saveSettings = () => settingsLoaded && store.set("sync", "settings", settings);
