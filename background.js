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
