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
};
const root = document.documentElement;
const darkMQ = matchMedia("(prefers-color-scheme: dark)");
const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
let settings = { ...DEFAULTS };
let ready = false;

const store = {
  get: (area, key) => new Promise(res => chrome.storage[area].get(key, v => res(v ? v[key] : undefined))),
  set: (area, key, val) => new Promise(res => chrome.storage[area].set({ [key]: val }, res)),
};
const lk = name => `${HOST}:${name}`;

const isDark = () => settings.theme === "dark" || (settings.theme === "auto" && darkMQ.matches);

function applySettings()
{
  if (settings.theme === "auto") root.removeAttribute("data-bl-theme");
  else root.setAttribute("data-bl-theme", settings.theme);
  root.classList.toggle("bl-dark", isDark());
  root.classList.toggle("bl-motion", !settings.calm);
  root.classList.toggle("bl-show-clutter", !settings.hideClutter);
  if (ready)
  {
    updateThemeButtons();
    installSpeculation();
    applyDock();
    renderHero();
  }
}
root.classList.toggle("bl-dark", darkMQ.matches);
darkMQ.addEventListener("change", applySettings);

store.get("sync", "settings").then(s =>
{
  settings = { ...DEFAULTS, ...(s || {}) };
  applySettings();
});
chrome.storage.onChanged.addListener((changes, area) =>
{
  if (area === "sync" && changes.settings)
  {
    settings = { ...DEFAULTS, ...(changes.settings.newValue || {}) };
    applySettings();
  }
  if (area === "local" && changes["bl:art:current"] && changes["bl:art:current"].newValue)
  {
    if (ready) setArt(changes["bl:art:current"].newValue);
  }
});
const saveSettings = () => store.set("sync", "settings", settings);
