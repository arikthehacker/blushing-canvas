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
  study: true,
};
const BOOLS = ["calm", "hideClutter", "prefetch", "shortcuts", "cheers", "hero", "study"];
const PHOTOS_KEY = "bl:photos";

chrome.storage.sync.get("settings", ({ settings }) =>
{
  const s = { ...DEFAULTS, ...(settings || {}) };
  const paint = () =>
  {
    if (s.theme === "auto") document.documentElement.removeAttribute("data-bl-theme");
    else document.documentElement.setAttribute("data-bl-theme", s.theme);
    if (window.repaintLook) window.repaintLook();
  };
  window.popupTheme = () => s.theme;
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

// ---------- colors + fonts ----------
const BL = self.BlushLook;
const ROLES = [
  { key: "accent", label: "Accent", hint: "Buttons, links, highlights" },
  { key: "bg", label: "Background", hint: "Behind everything" },
  { key: "surface", label: "Cards", hint: "Panels and boxes" },
  { key: "text", label: "Text", hint: "Words" },
  { key: "nav", label: "Sidebar", hint: "Canvas left menu" },
];
const darkMQ = matchMedia("(prefers-color-scheme: dark)");

chrome.storage.sync.get("look", ({ look: stored }) =>
{
  const look = { ...BL.LOOK_DEFAULTS, ...(stored || {}) };
  look.colors = { ...BL.LOOK_DEFAULTS.colors, ...(look.colors || {}) };
  let role = "accent";
  let saveT = 0;
  const save = () =>
  {
    clearTimeout(saveT);
    saveT = setTimeout(() => chrome.storage.sync.set({ look }), 250);
  };

  const popupDark = () =>
  {
    const t = window.popupTheme ? window.popupTheme() : "auto";
    return t === "dark" || (t === "auto" && darkMQ.matches);
  };
  window.repaintLook = () => BL.applyLook(look, popupDark(), document.documentElement);
  darkMQ.addEventListener("change", window.repaintLook);

  // presets
  const presetBox = document.getElementById("presets");
  BL.PRESETS.forEach(p =>
  {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "preset";
    const dots = document.createElement("span");
    dots.className = "dots";
    ["bg", "accent", "nav"].forEach(k =>
    {
      const i = document.createElement("i");
      i.style.background = p.colors[k];
      dots.appendChild(i);
    });
    b.append(dots, document.createTextNode(p.name));
    b.addEventListener("click", () =>
    {
      look.colors = { ...p.colors };
      look.colorsOn = true;
      sync();
      save();
    });
    presetBox.appendChild(b);
  });

  // role rows
  const roleBox = document.getElementById("roles");
  const rows = {};
  ROLES.forEach(r =>
  {
    const row = document.createElement("div");
    row.className = "role";
    row.dataset.role = r.key;
    const color = document.createElement("input");
    color.type = "color";
    color.setAttribute("aria-label", `${r.label} color`);
    const name = document.createElement("span");
    name.innerHTML = `${r.label}<small>${r.hint}</small>`;
    const hex = document.createElement("input");
    hex.className = "hex";
    hex.maxLength = 7;
    hex.spellcheck = false;
    hex.setAttribute("aria-label", `${r.label} hex code`);
    const setColor = v =>
    {
      const h = BL.normHex(v);
      if (!h) return;
      look.colors[r.key] = h;
      look.colorsOn = true;
      sync(r.key);
      save();
    };
    color.addEventListener("input", () => setColor(color.value));
    hex.addEventListener("change", () => setColor(hex.value.startsWith("#") ? hex.value : "#" + hex.value));
    row.addEventListener("click", () =>
    {
      role = r.key;
      markRole();
    });
    row.append(color, name, hex);
    roleBox.appendChild(row);
    rows[r.key] = { row, color, hex };
  });
  const markRole = () =>
    Object.entries(rows).forEach(([k, x]) => x.row.classList.toggle("is-on", k === role));

  // palette swatches
  const palBox = document.getElementById("palette");
  const palHint = document.getElementById("palHint");
  function renderPalette()
  {
    palBox.innerHTML = "";
    (look.palette || []).forEach(h =>
    {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "sw";
      b.style.background = h;
      b.title = h;
      b.setAttribute("aria-label", `Use ${h}`);
      b.addEventListener("click", () =>
      {
        look.colors[role] = h;
        look.colorsOn = true;
        // move to the next role so you can tap through the palette
        const i = ROLES.findIndex(r => r.key === role);
        role = ROLES[(i + 1) % ROLES.length].key;
        sync();
        save();
      });
      palBox.appendChild(b);
    });
    palHint.hidden = !(look.palette || []).length;
  }
  function usePalette(list)
  {
    if (!list.length)
    {
      document.getElementById("contrastWarn").textContent =
        "No colors found in that. Try a picture of the palette or a list of hex codes.";
      return;
    }
    look.palette = list;
    const auto = BL.autoAssign(list, look.applyTo === "dark" || (look.applyTo !== "light" && popupDark()));
    if (auto) look.colors = auto;
    look.colorsOn = true;
    renderPalette();
    sync();
    save();
  }
  document.getElementById("palFile").addEventListener("change", async e =>
  {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try
    {
      usePalette(await BL.paletteFromFile(f));
    }
    catch (err)
    {
      usePalette([]);
    }
  });
  const paste = document.getElementById("palPaste");
  const usePaste = () =>
  {
    usePalette([...new Set(BL.hexesFromText(paste.value).map(BL.normHex).filter(Boolean))].slice(0, 16));
  };
  document.getElementById("palUse").addEventListener("click", usePaste);
  paste.addEventListener("keydown", e =>
  {
    if (e.key === "Enter") usePaste();
  });

  const autoPick = dark => () =>
  {
    const src = look.palette && look.palette.length ? look.palette : Object.values(look.colors);
    const auto = BL.autoAssign(src, dark);
    if (auto)
    {
      look.colors = auto;
      look.colorsOn = true;
      sync();
      save();
    }
  };
  document.getElementById("autoLight").addEventListener("click", autoPick(false));
  document.getElementById("autoDark").addEventListener("click", autoPick(true));
  document.getElementById("resetColors").addEventListener("click", () =>
  {
    look.colors = { ...BL.LOOK_DEFAULTS.colors };
    look.colorsOn = false;
    look.palette = [];
    renderPalette();
    sync();
    save();
  });

  document.getElementById(`a-${look.applyTo}`).checked = true;
  document.querySelectorAll('input[name="applyTo"]').forEach(r =>
    r.addEventListener("change", () =>
    {
      look.applyTo = r.value;
      sync();
      save();
    }),
  );
  const onSwitch = document.getElementById("colorsOn");
  onSwitch.addEventListener("change", () =>
  {
    look.colorsOn = onSwitch.checked;
    sync();
    save();
  });

  // keep every control in step with the saved look
  function sync(skipHexFor)
  {
    onSwitch.checked = !!look.colorsOn;
    ROLES.forEach(r =>
    {
      const v = look.colors[r.key];
      rows[r.key].color.value = v.toLowerCase();
      if (r.key !== skipHexFor || document.activeElement !== rows[r.key].hex) rows[r.key].hex.value = v;
    });
    markRole();
    const c = look.colors;
    const issues = [];
    if (BL.contrast(c.text, c.bg) < 4.5) issues.push("text on background");
    if (BL.contrast(c.text, c.surface) < 4.5) issues.push("text on cards");
    document.getElementById("contrastWarn").textContent = issues.length
      ? `Low contrast: ${issues.join(" and ")}. It may be hard to read.`
      : "";
    window.repaintLook();
  }

  // fonts
  function fontField(key, id)
  {
    const input = document.getElementById(id);
    const status = document.getElementById(id + "Status");
    const preview = document.getElementById(id + "Preview");
    input.value = look[key] || "";
    const show = fam =>
    {
      preview.style.fontFamily = fam ? `"${fam}", var(--bl-font)` : "";
    };
    show(look[key]);
    if (look[key]) status.textContent = `Using ${look[key]}`;
    let t = 0;
    const commit = async () =>
    {
      const raw = input.value.trim();
      if (!raw)
      {
        look[key] = "";
        status.textContent = "Using the default font";
        status.classList.remove("bad");
        show("");
        save();
        window.repaintLook();
        return;
      }
      const fam = BL.parseFontInput(raw);
      if (!fam)
      {
        status.textContent = "That link has no font name in it. Try the font page link.";
        status.classList.add("bad");
        return;
      }
      status.textContent = `Loading ${fam}...`;
      status.classList.remove("bad");
      const res = await BL.loadFont(fam);
      if (!res.ok)
      {
        status.textContent = res.error || `Could not find ${fam}`;
        status.classList.add("bad");
        return;
      }
      look[key] = res.family || fam;
      input.value = look[key];
      status.textContent = `Using ${look[key]}`;
      show(look[key]);
      save();
      window.repaintLook();
    };
    input.addEventListener("input", () =>
    {
      clearTimeout(t);
      t = setTimeout(commit, 700);
    });
    input.addEventListener("keydown", e =>
    {
      if (e.key === "Enter")
      {
        clearTimeout(t);
        commit();
      }
    });
  }
  fontField("fontBody", "fontBody");
  fontField("fontHeading", "fontHeading");

  // handwriting
  const hand = document.getElementById("hand");
  const handState = document.getElementById("handState");
  const paintHand = () =>
  {
    hand.setAttribute("aria-pressed", String(!!look.handwriting));
    handState.textContent = look.handwriting
      ? "On. All your Canvas material is in your handwriting."
      : "Off. Tap to write everything by hand.";
  };
  hand.addEventListener("click", () =>
  {
    look.handwriting = !look.handwriting;
    paintHand();
    save();
    window.repaintLook();
  });
  BL.loadHand();
  paintHand();

  // background photo
  const fade = document.getElementById("bgFade");
  fade.value = look.bgFade;
  fade.addEventListener("input", () =>
  {
    look.bgFade = +fade.value;
    save();
  });
  const bgPreview = document.getElementById("bgPreview");
  const paintBg = url =>
  {
    bgPreview.hidden = !url;
    bgPreview.style.backgroundImage = url ? `url("${url}")` : "";
    document.getElementById("bgTools").hidden = !url;
    document.getElementById("bgAddLabel").firstChild.textContent = url
      ? "Change background photo"
      : "Add a background photo";
  };
  chrome.storage.local.get("bl:bgimg", v => paintBg(v["bl:bgimg"]));
  document.getElementById("bgFile").addEventListener("change", async e =>
  {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try
    {
      const url = await BL.resizeImage(f, 2200, 0.82);
      chrome.storage.local.set({ "bl:bgimg": url }, () => paintBg(url));
    }
    catch (err)
    {
      /* unreadable picture */
    }
  });
  document
    .getElementById("bgRemove")
    .addEventListener("click", () => chrome.storage.local.remove("bl:bgimg", () => paintBg(null)));

  renderPalette();
  sync();
});
