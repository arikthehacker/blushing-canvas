/* Blush for Canvas: background worker
   Picks the banner image for the day and caches it as a data URL so the banner paints instantly.
   Paintings come from the Art Institute of Chicago open-access API (public domain, CC0). */

const POOL_KEY = "bl:artpool";
const CURRENT_KEY = "bl:art:current";
const PHOTOS_KEY = "bl:photos"; // [{ id }] in the order you added them
const PHOTO_PREFIX = "bl:photo:"; // each picture under its own key, so one change never rewrites the rest

// 3.5 and earlier kept every picture inside the list itself. move them to their own keys once.
async function movePhotosToKeys()
{
  const list = (await get(PHOTOS_KEY)) || [];
  if (!list.some(p => p.dataUrl)) return;
  const each = {};
  for (const p of list) if (p.dataUrl) each[PHOTO_PREFIX + p.id] = p.dataUrl;
  await new Promise(r =>
    chrome.storage.local.set({ ...each, [PHOTOS_KEY]: list.map(p => ({ id: p.id })) }, r),
  );
  // today's banner used to carry its own copy of the photo too
  const cur = await get("bl:art:current");
  if (cur && cur.kind === "photo" && cur.dataUrl) await set("bl:art:current", { ...cur, dataUrl: undefined });
}
chrome.runtime.onInstalled.addListener(movePhotosToKeys);
chrome.runtime.onStartup.addListener(movePhotosToKeys);
const POOL_MAX_AGE = 14 * 86400000;

// soft, light, figurative painters that fit the dreamy pink look
const QUERIES = [
  "Mary Cassatt",
  "Berthe Morisot",
  "Pierre-Auguste Renoir",
  "John Singer Sargent",
  "Frederick Carl Frieseke",
  "Thomas Wilmer Dewing",
  "Claude Monet",
  "James McNeill Whistler",
  "Edgar Degas pastel",
  "Henri Fantin-Latour",
  "Childe Hassam",
  "Lilla Cabot Perry",
];

const get = key => new Promise(res => chrome.storage.local.get(key, v => res(v[key])));
const set = (key, val) => new Promise(res => chrome.storage.local.set({ [key]: val }, res));

function dayKey(d = new Date())
{
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function hash(str)
{
  let h = 2166136261;
  for (let i = 0; i < str.length; i++)
  {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

async function buildPool()
{
  const cached = await get(POOL_KEY);
  if (cached && Date.now() - cached.t < POOL_MAX_AGE && cached.items.length) return cached.items;
  const fields = "id,title,artist_title,image_id,color,artwork_type_title,is_public_domain";
  const seen = new Set();
  const items = [];
  await Promise.all(
    QUERIES.map(async q =>
    {
      try
      {
        const url =
          `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(q)}` +
          `&query[term][is_public_domain]=true&fields=${fields}&limit=40`;
        const res = await fetch(url, {
          headers: { "AIC-User-Agent": "Blush for Canvas (personal extension)" },
        });
        if (!res.ok) return;
        const json = await res.json();
        for (const a of json.data || [])
        {
          if (!a.image_id || !a.is_public_domain || seen.has(a.id)) continue;
          if (!/Painting|Drawing|Watercolor|Pastel/i.test(a.artwork_type_title || "")) continue;
          // keep the light, airy ones
          if (a.color && typeof a.color.l === "number" && a.color.l < 48) continue;
          seen.add(a.id);
          items.push({
            id: a.id,
            title: a.title || "Untitled",
            artist: a.artist_title || "",
            image: a.image_id,
          });
        }
      }
      catch (e)
      {
        /* one painter failing is fine */
      }
    }),
  );
  if (items.length) await set(POOL_KEY, { t: Date.now(), items });
  return items.length ? items : cached ? cached.items : [];
}

async function toDataUrl(url)
{
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000)
    bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return `data:${res.headers.get("content-type") || "image/jpeg"};base64,${btoa(bin)}`;
}

async function pick({ shuffle = false } = {})
{
  const settings = (await new Promise(r => chrome.storage.sync.get("settings", v => r(v.settings)))) || {};
  const source = settings.artSource || "both";
  if (source === "stars") return null; // the banner draws its own sky
  await movePhotosToKeys();
  const photos = (await get(PHOTOS_KEY)) || [];
  const day = dayKey();
  const seed = shuffle ? Math.floor(Math.random() * 1e9) : hash(day);

  let pool = [];
  if (source !== "mine")
  {
    try
    {
      pool = (await buildPool()).map(a => ({ kind: "art", ...a }));
    }
    catch (e)
    {
      pool = [];
    }
  }
  if (source !== "art") pool = pool.concat(photos.map(p => ({ kind: "photo", id: p.id })));
  // with "both", your own photos show up about half the time
  if (source === "both" && photos.length && pool.length)
  {
    const useMine = seed % 2 === 0;
    const subset = pool.filter(p => (useMine ? p.kind === "photo" : p.kind === "art"));
    if (subset.length) pool = subset;
  }
  if (!pool.length) return null;

  const current = await get(CURRENT_KEY);
  // the low bit already chose photo or painting, so index with the rest of the seed
  const pickSeed = Math.floor(seed / 2);
  let choice = pool[pickSeed % pool.length];
  if (shuffle && current && pool.length > 1 && choice.id === current.id)
    choice = pool[(pickSeed + 1) % pool.length];

  let result;
  if (choice.kind === "photo")
  {
    // the banner reads the picture from its own key, so it isn't stored twice
    result = { day, id: choice.id, kind: "photo", title: "Your photo", artist: "", link: "" };
  }
  else
  {
    const dataUrl = await toDataUrl(`https://www.artic.edu/iiif/2/${choice.image}/full/1686,/0/default.jpg`);
    result = {
      day,
      id: choice.id,
      kind: "art",
      dataUrl,
      title: choice.title,
      artist: choice.artist,
      link: `https://www.artic.edu/artworks/${choice.id}`,
    };
  }
  await set(CURRENT_KEY, result);
  return result;
}

let inFlight = null;
chrome.runtime.onMessage.addListener((msg, _sender, reply) =>
{
  if (!msg || msg.type !== "bl:art") return false;
  const run = async () =>
  {
    const current = await get(CURRENT_KEY);
    if (!msg.shuffle && !msg.force && current && current.day === dayKey()) return current;
    if (!inFlight)
      inFlight = pick({ shuffle: !!msg.shuffle }).finally(() =>
      {
        inFlight = null;
      });
    return inFlight;
  };
  run().then(reply, () => reply(null));
  return true; // async reply
});

// ---------- Google Fonts ----------
// Fetches a family from Google Fonts once, keeps the latin files as base64 in local storage,
// and hands them to the page so it can load them as binary (no page CSP issues).
const FONT_PREFIX = "bl:font:";

function bufToB64(buf)
{
  const u = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < u.length; i += 0x8000)
    bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function fetchFontCss(family)
{
  const fam = encodeURIComponent(family).replace(/%20/g, "+");
  const tries = [
    `https://fonts.googleapis.com/css2?family=${fam}:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap`,
    `https://fonts.googleapis.com/css2?family=${fam}:wght@400;500;600;700&display=swap`,
    `https://fonts.googleapis.com/css2?family=${fam}:wght@400;700&display=swap`,
    `https://fonts.googleapis.com/css2?family=${fam}&display=swap`,
  ];
  let reached = false;
  for (const url of tries)
  {
    try
    {
      const res = await fetch(url);
      reached = true;
      if (res.ok) return { css: await res.text() };
    }
    catch (e)
    {
      /* try the next shape */
    }
  }
  return { css: null, offline: !reached };
}

async function getFont(family)
{
  const key = FONT_PREFIX + family.toLowerCase();
  let cached = await get(key);
  if (cached && cached.faces && cached.faces.length && !cached.files)
  {
    // 3.5 and earlier kept a copy of the file in every face. keep each file once.
    cached = shareFontFiles(cached);
    await set(key, cached);
  }
  if (cached && cached.faces && cached.faces.length) return { ok: true, ...cached };

  const { css, offline } = await fetchFontCss(family);
  if (!css)
    return {
      ok: false,
      error: offline
        ? "Could not reach Google Fonts. Check your connection."
        : `Google Fonts has no font called "${family}". Check the spelling.`,
    };

  // each block looks like: /* latin */ @font-face { font-family: 'X'; font-style: normal; font-weight: 400; src: url(...) format('woff2'); unicode-range: ...; }
  const blocks = [...css.matchAll(/(?:\/\*\s*([\w-]+)\s*\*\/\s*)?@font-face\s*{([^}]*)}/g)];
  const wanted = blocks.filter(b => !b[1] || b[1] === "latin" || b[1] === "latin-ext");
  const seen = new Set();
  const files = new Map(); // variable fonts reuse one file for every weight
  const faces = [];
  let realName = family;
  for (const b of wanted)
  {
    const body = b[2];
    const src = (body.match(/url\(([^)]+)\)/) || [])[1];
    if (!src) continue;
    const url = src.replace(/["']/g, "");
    const weight = ((body.match(/font-weight:\s*([^;]+);/) || [])[1] || "400").trim();
    const style = ((body.match(/font-style:\s*([^;]+);/) || [])[1] || "normal").trim();
    const range = ((body.match(/unicode-range:\s*([^;]+);/) || [])[1] || "").trim();
    const name = (body.match(/font-family:\s*['"]?([^;'"]+)['"]?;/) || [])[1];
    if (name) realName = name.trim();
    const id = `${url}|${weight}|${style}|${range}`;
    if (seen.has(id)) continue;
    seen.add(id);
    try
    {
      if (!files.has(url))
      {
        const res = await fetch(url);
        if (!res.ok) continue;
        files.set(url, bufToB64(await res.arrayBuffer()));
      }
      faces.push({ weight, style, unicodeRange: range, file: url });
    }
    catch (e)
    {
      /* skip one file */
    }
  }
  if (!faces.length) return { ok: false, error: "Could not download that font" };
  // each file once (a variable font uses one file for every weight), and the faces point at it
  const entry = { family: realName, files: Object.fromEntries(files), faces, t: Date.now() };
  await set(key, entry);
  await dropUnusedFonts(key);
  return { ok: true, ...entry };
}

function shareFontFiles(old)
{
  const files = {};
  const byData = new Map();
  const faces = old.faces.map(f =>
  {
    if (!byData.has(f.data))
    {
      const id = String(byData.size);
      byData.set(f.data, id);
      files[id] = f.data;
    }
    const { data, ...face } = f;
    return { ...face, file: byData.get(f.data) };
  });
  return { ...old, files, faces };
}

// keep only the fonts your look uses now, plus the one just fetched
async function dropUnusedFonts(keep)
{
  const look = (await new Promise(r => chrome.storage.sync.get("look", v => r(v.look)))) || {};
  const used = new Set(
    [keep, look.fontBody, look.fontHeading]
      .filter(Boolean)
      .map(f => (f.startsWith(FONT_PREFIX) ? f : FONT_PREFIX + f.toLowerCase())),
  );
  const all = await new Promise(r => chrome.storage.local.get(null, r));
  const stale = Object.keys(all).filter(k => k.startsWith(FONT_PREFIX) && !used.has(k));
  if (stale.length) await new Promise(r => chrome.storage.local.remove(stale, r));
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) =>
{
  if (!msg || msg.type !== "bl:font" || !msg.family) return false;
  getFont(String(msg.family).slice(0, 60)).then(reply, () =>
    reply({ ok: false, error: "Font failed to load" }),
  );
  return true;
});

// ---------- study timer (pomodoro + garden + pet) ----------
// The worker owns the timer so it keeps going across Canvas pages and tabs.
const STUDY_KEY = "bl:study";
const PLANT_KINDS = 6;
const STUDY_DEFAULTS = {
  mode: "focus",
  running: false,
  endAt: 0,
  left: 25 * 60000,
  focusMin: 25,
  cycle: 0,
  plants: [],
  nextPlant: null, // the plant you picked for next time, or null for a surprise
  total: 0,
  today: { day: "", n: 0 },
  petName: "Mochi",
  petKind: "mochi",
  lastDone: 0,
  lastEvent: "",
};
const phaseMs = s =>
  (s.mode === "focus" ? s.focusMin : s.mode === "long" ? 15 : s.focusMin >= 50 ? 10 : 5) * 60000;

async function getStudy()
{
  return { ...STUDY_DEFAULTS, ...((await get(STUDY_KEY)) || {}) };
}
async function putStudy(s)
{
  await set(STUDY_KEY, s);
  if (s.running) chrome.alarms.create("bl:study", { when: s.endAt });
  else chrome.alarms.clear("bl:study");
  return s;
}

function notify(title, message)
{
  try
  {
    chrome.notifications.create(
      "",
      { type: "basic", iconUrl: "icons/icon128.png", title, message, priority: 1 },
      () => void chrome.runtime.lastError,
    );
  }
  catch (e)
  {
    /* notifications are a bonus */
  }
}

async function finishPhase(s, { credit = true } = {})
{
  const now = Date.now();
  if (s.mode === "focus")
  {
    if (credit)
    {
      const grow = Math.max(1, Math.round(s.focusMin / 25)); // one plant for every 25 minutes
      for (let i = 0; i < grow; i++)
      {
        const picked = i === 0 && Number.isInteger(s.nextPlant) ? s.nextPlant : null;
        s.plants.push({ k: picked ?? Math.floor(Math.random() * PLANT_KINDS), t: now });
      }
      s.nextPlant = null;
      if (s.plants.length > 200) s.plants = s.plants.slice(-200);
      s.total += 1;
      const day = dayKey();
      s.today = s.today && s.today.day === day ? { day, n: s.today.n + 1 } : { day, n: 1 };
      s.lastDone = now;
      s.lastEvent = "grew";
      notify("Focus done, garden grew", `${s.petName} is so proud of you. Take a little break.`);
    }
    s.cycle = (s.cycle || 0) + 1;
    s.mode = s.cycle % 4 === 0 ? "long" : "short";
    // breaks start on their own
    s.running = true;
    s.left = phaseMs(s);
    s.endAt = now + s.left;
  }
  else
  {
    s.mode = "focus";
    s.running = false;
    s.left = phaseMs(s);
    s.endAt = 0;
    s.lastEvent = "break-over";
    if (credit) notify("Break is over", `${s.petName} is ready when you are.`);
  }
  return s;
}

// one timer change at a time: open tabs, the alarm and a P press can all arrive together
let studyQueue = Promise.resolve();
function queueStudy(fn)
{
  const run = studyQueue.then(fn);
  studyQueue = run.catch(() =>
  {});
  return run;
}

function catchUp()
{
  return queueStudy(async () =>
  {
    const s = await getStudy();
    if (s.running && s.endAt && s.endAt <= Date.now()) await putStudy(await finishPhase(s));
  });
}
chrome.alarms.onAlarm.addListener(a =>
{
  if (a.name === "bl:study") catchUp();
});
chrome.runtime.onStartup.addListener(catchUp);

async function studyAct(msg)
{
  let s = await getStudy();
  const now = Date.now();
  if (s.running && s.endAt <= now) s = await finishPhase(s);
  // toggle works on the state that was just caught up, so a finished phase is never finished twice
  const act = msg.act === "toggle" ? (s.running ? "pause" : "start") : msg.act;
  switch (act)
  {
    case "start":
      if (!s.running)
      {
        s.running = true;
        s.endAt = now + (s.left > 0 ? s.left : phaseMs(s));
        s.lastEvent = "start";
      }
      break;
    case "pause":
      if (s.running)
      {
        s.left = Math.max(0, s.endAt - now);
        s.running = false;
        s.endAt = 0;
        s.lastEvent = "pause";
      }
      break;
    case "reset":
      s.running = false;
      s.endAt = 0;
      s.left = phaseMs(s);
      s.lastEvent = "reset";
      break;
    case "skip":
      s = await finishPhase(s, { credit: false });
      if (s.mode !== "focus")
      {
        s.running = false;
        s.endAt = 0;
      }
      break;
    case "length":
      if ([15, 25, 50].includes(msg.min))
      {
        // a running focus keeps its length, so its plants and progress ring stay honest
        if (s.mode === "focus" && s.running) break;
        s.focusMin = msg.min;
        if (s.mode === "focus") s.left = phaseMs(s);
      }
      break;
    case "name":
      s.petName =
        String(msg.name || "")
          .trim()
          .slice(0, 20) || "Mochi";
      break;
    case "kind": {
      const NAMES = {
        mochi: "Mochi",
        bunny: "Clover",
        kitty: "Biscuit",
        frog: "Pickle",
        duck: "Puddle",
        bear: "Honey",
        penguin: "Pebble",
        fish: "Melody",
        turtle: "Turdy Turt",
        best: "Best",
        custom: "Buddy",
      };
      if (NAMES[msg.kind])
      {
        // keep a name you picked and only swap the starter name
        if (!s.petName || s.petName === NAMES[s.petKind || "mochi"]) s.petName = NAMES[msg.kind];
        s.petKind = msg.kind;
      }
      break;
    }
    case "nextPlant":
      s.nextPlant = Number.isInteger(msg.kind) && msg.kind >= 0 && msg.kind < PLANT_KINDS ? msg.kind : null;
      break;
    case "clearGarden":
      s.plants = [];
      break;
    default:
      break;
  }
  return putStudy(s);
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) =>
{
  if (!msg || msg.type !== "bl:study") return false;
  queueStudy(() => studyAct(msg)).then(reply, () => reply(null));
  return true;
});

// ---------- your school's own Canvas address ----------
// *.instructure.com is in the manifest. A school with its own address gets the same
// content scripts once you allow it from the popup.
const SCHOOL_SCRIPTS = "blush-schools";
const BUILT_IN = /\.instructure\.com$|artic\.edu$|fonts\.(googleapis|gstatic)\.com$/;

// Allowing a site fires permissions.onAdded and the popup's own "bl:schools" message at the same moment,
// so syncs run one at a time, and each one updates the registration instead of adding a second copy.
let schoolSync = Promise.resolve();
function syncSchools()
{
  const run = schoolSync.then(writeSchoolScripts);
  schoolSync = run.catch(() =>
  {});
  return run;
}

async function writeSchoolScripts()
{
  const { origins = [] } = await chrome.permissions.getAll();
  const matches = origins.filter(
    o => /^https:\/\/[^*]+\/\*$/.test(o) && !BUILT_IN.test(new URL(o.slice(0, -1)).hostname),
  );
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [SCHOOL_SCRIPTS] });
  if (!matches.length)
  {
    if (existing.length) await chrome.scripting.unregisterContentScripts({ ids: [SCHOOL_SCRIPTS] });
    return;
  }
  const cs = chrome.runtime.getManifest().content_scripts[0];
  const script = { id: SCHOOL_SCRIPTS, matches, css: cs.css, js: cs.js, runAt: cs.run_at, allFrames: false };
  if (existing.length) await chrome.scripting.updateContentScripts([script]);
  else await chrome.scripting.registerContentScripts([script]);
}

const syncQuietly = () =>
  syncSchools().catch(err => console.warn("Blush could not update your school's address", err));
chrome.runtime.onInstalled.addListener(syncQuietly);
chrome.runtime.onStartup.addListener(syncQuietly);
chrome.permissions.onAdded.addListener(syncQuietly);
chrome.permissions.onRemoved.addListener(syncQuietly);
chrome.runtime.onMessage.addListener((msg, _sender, reply) =>
{
  if (msg && msg.type === "bl:schools")
  {
    syncSchools().then(
      () => reply(true),
      () => reply(false),
    );
    return true;
  }
});
