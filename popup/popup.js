// The toolbar popup. It reads your Blush settings from chrome.storage and saves each change right away.
const DEFAULTS = {
  theme: "auto",
  calm: true,
  hideClutter: true,
  shortcuts: true,
  prefetch: true,
  cheers: true,
};
const BOOLS = ["calm", "hideClutter", "prefetch", "shortcuts", "cheers"];

chrome.storage.sync.get("settings", ({ settings }) =>
{
  const s = { ...DEFAULTS, ...(settings || {}) };
  const paint = () =>
  {
    if (s.theme === "auto") document.documentElement.removeAttribute("data-bl-theme");
    else document.documentElement.setAttribute("data-bl-theme", s.theme);
  };
  paint();
  document.getElementById(`t-${s.theme}`).checked = true;
  BOOLS.forEach(k =>
  {
    document.getElementById(k).checked = !!s[k];
  });

  const save = () => chrome.storage.sync.set({ settings: s });
  document.querySelectorAll('input[name="theme"]').forEach(r =>
    r.addEventListener("change", () =>
    {
      s.theme = r.value;
      paint();
      save();
    }),
  );
  BOOLS.forEach(k =>
    document.getElementById(k).addEventListener("change", e =>
    {
      s[k] = e.target.checked;
      save();
    }),
  );
});
