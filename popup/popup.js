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
  stress: false,
  petWalk: true,
};
const BOOLS = ["calm", "hideClutter", "prefetch", "shortcuts", "cheers", "hero", "study", "petWalk"];
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

  const stress = document.getElementById("stress");
  const paintStress = () =>
  {
    stress.setAttribute("aria-pressed", String(!!s.stress));
    document.getElementById("stressState").textContent = s.stress
      ? "On. Your dashboard only shows tonight. Tap again to bring it all back."
      : "Hides everything on your dashboard except what is due tonight.";
  };
  stress.addEventListener("click", () =>
  {
    s.stress = !s.stress;
    paintStress();
    save();
  });
  paintStress();

  // greetings for each time of day
  s.greet = s.greet || {};
  let gt = 0;
  document.querySelectorAll(".greets input").forEach(inp =>
  {
    inp.value = s.greet[inp.dataset.slot] || "";
    inp.addEventListener("input", () =>
    {
      s.greet[inp.dataset.slot] = inp.value.trim();
      clearTimeout(gt);
      gt = setTimeout(save, 400);
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
      const scale = Math.min(1, 2560 / img.width);
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
      // some presets come with a banner picture, picked the same way as tapping it under Banner
      const pic = p.banner && document.getElementById(`s-${p.banner}`);
      if (pic && !pic.checked)
      {
        pic.checked = true;
        pic.dispatchEvent(new Event("change"));
      }
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

// ---------- study buddy picker ----------
(() =>
{
  const box = document.getElementById("pets");
  const nameIn = document.getElementById("petName");
  const studyAct = (act, extra = {}) =>
    new Promise(r =>
      chrome.runtime.sendMessage({ type: "bl:study", act, ...extra }, res =>
      {
        void chrome.runtime.lastError;
        r(res);
      }),
    );
  const paint = st =>
  {
    const kind = (st && st.petKind) || "mochi";
    box
      .querySelectorAll(".pet")
      .forEach(b => b.setAttribute("aria-pressed", String(b.dataset.kind === kind)));
    if (document.activeElement !== nameIn) nameIn.value = (st && st.petName) || "Mochi";
    const len = document.getElementById(`l-${(st && st.focusMin) || 25}`);
    if (len) len.checked = true;
  };
  document
    .querySelectorAll('input[name="focusLen"]')
    .forEach(r =>
      r.addEventListener("change", async () => paint(await studyAct("length", { min: +r.value }))),
    );
  document.getElementById("studyReset").addEventListener("click", async () => paint(await studyAct("reset")));
  const POSES = [
    { key: "idle", label: "Standing", hint: "needed" },
    { key: "step", label: "Step", hint: "waddle" },
    { key: "study", label: "Studying", hint: "focus" },
    { key: "happy", label: "Happy", hint: "cheer" },
  ];
  const CUSTOM_KEY = "bl:pet:custom";
  const getCustom = () => new Promise(r => chrome.storage.local.get(CUSTOM_KEY, v => r(v[CUSTOM_KEY] || {})));
  // keep transparency: shrink to 256 px and save as PNG
  const toPet = file =>
    new Promise((resolve, reject) =>
    {
      const img = new Image();
      img.onload = () =>
      {
        const scale = Math.min(1, 256 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  // the sheet template: 1184 x 366, four 256 px boxes starting at x = 32, 320, 608, 896 and y = 92
  const SHEET = { w: 1184, h: 366, y: 92, xs: [32, 320, 608, 896], size: 256 };
  const sheetStatus = document.getElementById("sheetStatus");
  function splitSheet(file)
  {
    return new Promise((resolve, reject) =>
    {
      const img = new Image();
      img.onload = () =>
      {
        URL.revokeObjectURL(img.src);
        const k = img.width / SHEET.w;
        if (Math.abs(img.height / k - SHEET.h) > SHEET.h * 0.06)
        {
          reject(new Error("shape"));
          return;
        }
        const out = {};
        let opaque = 0;
        POSES.forEach((p, i) =>
        {
          const c = document.createElement("canvas");
          c.width = SHEET.size;
          c.height = SHEET.size;
          const ctx = c.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(
            img,
            SHEET.xs[i] * k,
            SHEET.y * k,
            SHEET.size * k,
            SHEET.size * k,
            0,
            0,
            SHEET.size,
            SHEET.size,
          );
          const d = ctx.getImageData(0, 0, SHEET.size, SHEET.size).data;
          let ink = 0;
          for (let j = 3; j < d.length; j += 4) if (d[j] > 20) ink++;
          const share = ink / (SHEET.size * SHEET.size);
          if (share > 0.97) opaque++;
          if (ink > 60) out[p.key] = c.toDataURL("image/png"); // empty boxes are skipped
        });
        if (opaque)
        {
          reject(new Error("opaque"));
          return;
        }
        resolve(out);
      };
      img.onerror = () => reject(new Error("read"));
      img.src = URL.createObjectURL(file);
    });
  }
  document.getElementById("sheetFile").addEventListener("change", async e =>
  {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try
    {
      const found = await splitSheet(f);
      const keys = Object.keys(found);
      if (!keys.length)
      {
        sheetStatus.textContent = "All four boxes look empty. Draw at least the Standing pose.";
        return;
      }
      const next = { ...(await getCustom()), ...found };
      await new Promise(r => chrome.storage.local.set({ [CUSTOM_KEY]: next }, r));
      if (next.idle) paint(await studyAct("kind", { kind: "custom" }));
      const names = POSES.filter(p => found[p.key])
        .map(p => p.label)
        .join(", ");
      sheetStatus.textContent =
        found.idle || next.idle
          ? `Found ${keys.length} pose${keys.length > 1 ? "s" : ""}: ${names}. Your buddy is ready.`
          : `Found ${names}, but the Standing box is empty. Your buddy needs that one.`;
      renderPoses();
    }
    catch (err)
    {
      sheetStatus.textContent =
        err.message === "shape"
          ? "That does not look like the Blush sheet. Export the whole sheet without cropping or resizing it unevenly."
          : err.message === "opaque"
            ? "The background is not transparent. Hide the guide layer and any background layer, then export as PNG again."
            : "That picture would not load. Try exporting it as PNG again.";
    }
  });

  const poseBox = document.getElementById("poses");
  let customTile = null;
  async function renderPoses()
  {
    const cur = await getCustom();
    self.BlushPets.setCustom(cur);
    poseBox.innerHTML = "";
    POSES.forEach(p =>
    {
      const lab = document.createElement("label");
      lab.className = "pose";
      lab.innerHTML = `<span class="pv"${cur[p.key] ? ` style="background-image:url('${cur[p.key]}')"` : ""}></span><span>${p.label}</span><small>${p.hint}</small><input type="file" accept="image/png,image/webp,image/gif,image/*" aria-label="Upload ${p.label} pose">`;
      lab.querySelector("input").addEventListener("change", async e =>
      {
        const f = e.target.files[0];
        if (!f) return;
        try
        {
          const next = { ...(await getCustom()), [p.key]: await toPet(f) };
          await new Promise(r => chrome.storage.local.set({ [CUSTOM_KEY]: next }, r));
          if (p.key === "idle") paint(await studyAct("kind", { kind: "custom" }));
          renderPoses();
        }
        catch (err)
        {
          /* unreadable image */
        }
      });
      if (cur[p.key])
      {
        const x = document.createElement("button");
        x.type = "button";
        x.className = "x";
        x.textContent = "×";
        x.setAttribute("aria-label", `Remove ${p.label} pose`);
        x.addEventListener("click", async e =>
        {
          e.preventDefault();
          const next = { ...(await getCustom()) };
          delete next[p.key];
          await new Promise(r => chrome.storage.local.set({ [CUSTOM_KEY]: next }, r));
          if (p.key === "idle") paint(await studyAct("kind", { kind: "mochi" }));
          renderPoses();
        });
        lab.appendChild(x);
      }
      poseBox.appendChild(lab);
    });
    // "Yours" tile in the picker once a standing pose exists
    if (cur.idle)
    {
      if (!customTile)
      {
        customTile = document.createElement("button");
        customTile.type = "button";
        customTile.className = "pet";
        customTile.dataset.kind = "custom";
        customTile.addEventListener("click", async () => paint(await studyAct("kind", { kind: "custom" })));
        box.appendChild(customTile);
      }
      customTile.innerHTML = `${self.BlushPets.svg("custom", "idle", "pet-svg")}<span>Yours</span>`;
    }
    else if (customTile)
    {
      customTile.remove();
      customTile = null;
    }
    studyAct("noop").then(paint);
  }

  self.BlushPets.KINDS.forEach(k =>
  {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pet";
    b.dataset.kind = k.id;
    b.innerHTML = `${self.BlushPets.svg(k.id, "idle", "pet-svg")}<span>${k.label}</span>`;
    b.addEventListener("click", async () => paint(await studyAct("kind", { kind: k.id })));
    box.appendChild(b);
  });
  let t = 0;
  nameIn.addEventListener("input", () =>
  {
    clearTimeout(t);
    t = setTimeout(() => studyAct("name", { name: nameIn.value }), 400);
  });
  renderPoses();
})();

// ---------- your own quotes ----------
(() =>
{
  const ta = document.getElementById("myQuotes");
  const only = document.getElementById("quotesOnly");
  const count = document.getElementById("quotesCount");
  const KEY = "bl:quotes";
  const show = n =>
  {
    count.textContent = n
      ? `${n} quote${n === 1 ? "" : "s"} saved. Your buddy says these when you tap it, on the banner and on the super declutter page.`
      : "Your buddy says these when you tap it, on the banner and on the super declutter page.";
  };
  chrome.storage.local.get(KEY, v =>
  {
    const q = v[KEY] || { list: [], only: false };
    ta.value = (q.list || []).join("\n");
    only.checked = !!q.only;
    show((q.list || []).length);
  });
  let t = 0;
  const save = () =>
  {
    const list = ta.value
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => l.slice(0, 200))
      .slice(0, 100);
    chrome.storage.local.set({ [KEY]: { list, only: only.checked } });
    show(list.length);
  };
  ta.addEventListener("input", () =>
  {
    clearTimeout(t);
    t = setTimeout(save, 400);
  });
  only.addEventListener("change", save);
})();

// ---------- your school's own Canvas address ----------
(async () =>
{
  const box = document.getElementById("school");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!box || !tab || !/^https:\/\//.test(tab.url || "")) return;
  const { origin, hostname } = new URL(tab.url);
  if (/\.instructure\.com$/.test(hostname)) return;
  if (await chrome.permissions.contains({ origins: [`${origin}/*`] })) return;

  // only offer it on pages that look like Canvas
  const probe = await chrome.scripting
    .executeScript({
      target: { tabId: tab.id },
      func: () => !!document.querySelector("#application.ic-app, .ic-app-header"),
    })
    .catch(() => []);
  if (!probe[0] || !probe[0].result) return;

  document.getElementById("schoolHost").textContent = hostname;
  box.hidden = false;
  document.getElementById("schoolOn").addEventListener("click", async () =>
  {
    if (!(await chrome.permissions.request({ origins: [`${origin}/*`] }))) return;
    await chrome.runtime.sendMessage({ type: "bl:schools" });
    chrome.tabs.reload(tab.id);
    window.close();
  });
})();
