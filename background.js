/* Blush for Canvas: background worker
   Picks the banner image for the day and caches it as a data URL so the banner paints instantly.
   Paintings come from the Art Institute of Chicago open-access API (public domain, CC0). */

const POOL_KEY = "bl:artpool";
const CURRENT_KEY = "bl:art:current";
const PHOTOS_KEY = "bl:photos";
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
  let choice = pool[seed % pool.length];
  if (shuffle && current && pool.length > 1 && choice.id === current.id)
    choice = pool[(seed + 1) % pool.length];

  let result;
  if (choice.kind === "photo")
  {
    const p = photos.find(x => x.id === choice.id);
    result = { day, id: p.id, kind: "photo", dataUrl: p.dataUrl, title: "Your photo", artist: "", link: "" };
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
  const cached = await get(key);
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
      faces.push({ weight, style, unicodeRange: range, data: files.get(url) });
    }
    catch (e)
    {
      /* skip one file */
    }
  }
  if (!faces.length) return { ok: false, error: "Could not download that font" };
  const entry = { family: realName, faces, t: Date.now() };
  await set(key, entry);
  return { ok: true, ...entry };
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
      for (let i = 0; i < grow; i++) s.plants.push({ k: Math.floor(Math.random() * PLANT_KINDS), t: now });
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

async function catchUp()
{
  const s = await getStudy();
  if (s.running && s.endAt && s.endAt <= Date.now()) await putStudy(await finishPhase(s));
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
  switch (msg.act)
  {
    case "start":
      if (!s.running)
      {
        s.running = true;
        s.endAt = now + (s.left > 0 ? s.left : phaseMs(s));
        s.lastEvent = "start";
      }
      break;
    case "toggle":
      return studyAct({ act: s.running ? "pause" : "start" });
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
        s.focusMin = msg.min;
        if (s.mode === "focus" && !s.running) s.left = phaseMs(s);
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
      };
      if (NAMES[msg.kind])
      {
        // keep a name you picked and only swap the starter name
        if (!s.petName || s.petName === NAMES[s.petKind || "mochi"]) s.petName = NAMES[msg.kind];
        s.petKind = msg.kind;
      }
      break;
    }
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
  studyAct(msg).then(reply, () => reply(null));
  return true;
});
