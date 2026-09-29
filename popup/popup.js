// The toolbar popup. It reads your Blush settings from chrome.storage and saves each change right away.
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
const BOOLS = ["calm", "hideClutter", "prefetch", "shortcuts", "cheers", "hero"];
const PHOTOS_KEY = "bl:photos";

chrome.storage.sync.get("settings", ({ settings }) =>
{
  const s = { ...DEFAULTS, ...(settings || {}) };
  const paint = () =>
  {
    if (s.theme === "auto") document.documentElement.removeAttribute("data-bl-theme");
    else document.documentElement.setAttribute("data-bl-theme", s.theme);
  };
  paint();
  const save = () => chrome.storage.sync.set({ settings: s });

  document.getElementById(`t-${s.theme}`).checked = true;
  document.querySelectorAll('input[name="theme"]').forEach(r =>
    r.addEventListener("change", () =>
    {
      s.theme = r.value;
      paint();
      save();
    }),
  );

  BOOLS.forEach(k =>
  {
    const el = document.getElementById(k);
    el.checked = !!s[k];
    el.addEventListener("change", () =>
    {
      s[k] = el.checked;
      save();
    });
  });

  const name = document.getElementById("name");
  name.value = s.name || "";
  let t = 0;
  name.addEventListener("input", () =>
  {
    clearTimeout(t);
    t = setTimeout(() =>
    {
      s.name = name.value.trim();
      save();
    }, 300);
  });

  document.getElementById(`s-${s.artSource}`).checked = true;
  document.querySelectorAll('input[name="src"]').forEach(r =>
    r.addEventListener("change", () =>
    {
      s.artSource = r.value;
      chrome.storage.sync.set({ settings: s }, () =>
        chrome.runtime.sendMessage({ type: "bl:art", force: true }),
      );
    }),
  );
});

// ---------- your photos ----------
const getPhotos = () => new Promise(r => chrome.storage.local.get(PHOTOS_KEY, v => r(v[PHOTOS_KEY] || [])));
const setPhotos = p => new Promise(r => chrome.storage.local.set({ [PHOTOS_KEY]: p }, r));

async function renderPhotos()
{
  const photos = await getPhotos();
  const box = document.getElementById("photos");
  box.innerHTML = "";
  photos.forEach((p, i) =>
  {
    const div = document.createElement("div");
    div.className = "photo";
    const img = document.createElement("img");
    img.src = p.dataUrl;
    img.alt = `Your photo ${i + 1}`;
    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "×";
    del.setAttribute("aria-label", `Remove photo ${i + 1}`);
    del.addEventListener("click", async () =>
    {
      await setPhotos((await getPhotos()).filter(x => x.id !== p.id));
      renderPhotos();
    });
    div.append(img, del);
    box.appendChild(div);
  });
}

// shrink big images so storage stays light and the banner loads instantly
function resize(file)
{
  return new Promise((resolve, reject) =>
  {
    const img = new Image();
    img.onload = () =>
    {
      const scale = Math.min(1, 1800 / img.width);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.86));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

const isFirefox = navigator.userAgent.includes("Firefox");
const inPopup = (() =>
{
  try
  {
    return chrome.extension.getViews({ type: "popup" }).includes(window);
  }
  catch (e)
  {
    return false;
  }
})();
if (!inPopup) document.body.style.margin = "32px auto";
if (isFirefox && inPopup)
{
  const label = document.querySelector(".add-photo");
  label.addEventListener("click", e =>
  {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

document.getElementById("file").addEventListener("change", async e =>
{
  const files = [...e.target.files];
  const photos = await getPhotos();
  for (const f of files)
  {
    try
    {
      photos.push({ id: Math.random().toString(36).slice(2, 10), dataUrl: await resize(f) });
    }
    catch (err)
    {
      /* skip unreadable */
    }
  }
  await setPhotos(photos);
  e.target.value = "";
  renderPhotos();
  chrome.runtime.sendMessage({ type: "bl:art", force: true });
});

renderPhotos();
