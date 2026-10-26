/* Blush for Canvas: study pets
   Original little characters drawn in a 64x64 box. Moods: idle, focus (reading), happy. */
(() =>
{
  "use strict";

  const INK = "#2E2328";
  const LINE = "rgba(46, 35, 40, 0.14)";
  const CHEEK = "var(--bl-sb-cheek, #F5A9BC)";

  const KINDS = [
    { id: "mochi", label: "Mochi", name: "Mochi" },
    { id: "bunny", label: "Bunny", name: "Clover" },
    { id: "kitty", label: "Kitty", name: "Biscuit" },
    { id: "frog", label: "Frog", name: "Pickle" },
    { id: "duck", label: "Duckling", name: "Puddle" },
    { id: "bear", label: "Bear cub", name: "Honey" },
    { id: "penguin", label: "Penguin", name: "Pebble" },
  ];

  // a round body every pet shares, with a soft outline so it reads on light banners
  const blob = (fill, cy = 36, rx = 23, ry = 21) =>
    `<ellipse cx="32" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${LINE}" stroke-width="1"/>`;
  const feet = fill =>
    `<ellipse cx="23" cy="56" rx="5" ry="2.6" fill="${fill}"/><ellipse cx="41" cy="56" rx="5" ry="2.6" fill="${fill}"/>`;

  function eyes(mood, y = 34, dx = 7, ink = INK)
  {
    const l = 32 - dx,
      r = 32 + dx;
    if (mood === "focus")
      return `<path d="M${l - 3} ${y} q3 2.4 6 0 M${r - 3} ${y} q3 2.4 6 0" fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round"/>`;
    if (mood === "happy")
      return `<path d="M${l - 3} ${y + 1} q3 -3.4 6 0 M${r - 3} ${y + 1} q3 -3.4 6 0" fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round"/>`;
    return `<g class="sb-blink" style="transform-origin:32px ${y}px"><ellipse cx="${l}" cy="${y}" rx="2.4" ry="3" fill="${ink}"/><ellipse cx="${r}" cy="${y}" rx="2.4" ry="3" fill="${ink}"/><circle cx="${l + 0.8}" cy="${y - 1.2}" r=".8" fill="#FFFFFF"/><circle cx="${r + 0.8}" cy="${y - 1.2}" r=".8" fill="#FFFFFF"/></g>`;
  }
  const cheeks = (y = 40, dx = 12.5, fill = CHEEK) =>
    `<ellipse cx="${32 - dx}" cy="${y}" rx="3.6" ry="2.3" fill="${fill}" opacity=".9"/><ellipse cx="${32 + dx}" cy="${y}" rx="3.6" ry="2.3" fill="${fill}" opacity=".9"/>`;
  const smile = (mood, y = 40) =>
    mood === "focus"
      ? `<path d="M30 ${y + 0.5} h4" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`
      : `<path d="M29 ${y} q3 3 6 0" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  const book = mood =>
    mood === "focus"
      ? '<g transform="translate(20 45)"><path d="M0 2 L12 0 L24 2 V12 L12 10 L0 12Z" fill="var(--bl-accent, #A3526A)"/><path d="M12 0 V10" stroke="#FFFFFF" stroke-width="1" opacity=".7"/></g>'
      : "";

  const PARTS = {
    mochi: mood => `
      <path d="M32 9 C30 4 33.5 1.5 37 2.5 C36.5 6 34.5 8.5 32 9Z" fill="#7DAF7F"/>
      <path d="M32 10 V13" stroke="#6A9C6E" stroke-width="1.6" stroke-linecap="round"/>
      <ellipse cx="17" cy="20" rx="5" ry="6" fill="var(--bl-sb-pet, #EBC7D1)" transform="rotate(-18 17 20)"/>
      <ellipse cx="47" cy="20" rx="5" ry="6" fill="var(--bl-sb-pet, #EBC7D1)" transform="rotate(18 47 20)"/>
      <path d="M32 12 C47 12 55 23 55 36 C55 49 45 56 32 56 C19 56 9 49 9 36 C9 23 17 12 32 12Z" fill="var(--bl-sb-pet, #EBC7D1)" stroke="${LINE}"/>
      ${cheeks(39)}${eyes(mood, 33)}${smile(mood, 39.5)}`,

    bunny: mood => `
      <ellipse cx="24" cy="13" rx="4.6" ry="12" fill="#FFF7F4" stroke="${LINE}" transform="rotate(-10 24 13)"/>
      <ellipse cx="24" cy="13.5" rx="2.2" ry="8.5" fill="#F7C3CF" transform="rotate(-10 24 13.5)"/>
      <ellipse cx="40" cy="13" rx="4.6" ry="12" fill="#FFF7F4" stroke="${LINE}" transform="rotate(10 40 13)"/>
      <ellipse cx="40" cy="13.5" rx="2.2" ry="8.5" fill="#F7C3CF" transform="rotate(10 40 13.5)"/>
      ${feet("#FFF7F4")}${blob("#FFF7F4", 37, 21, 19)}
      <circle cx="52" cy="46" r="4" fill="#FFFFFF" stroke="${LINE}"/>
      ${cheeks(41, 11.5)}${eyes(mood, 35, 6.5)}
      <path d="M30.6 39.2 h2.8 l-1.4 1.6z" fill="#E88FA6"/>${smile(mood, 41.4)}`,

    kitty: mood => `
      <path d="M48 48 C58 46 58 36 54 33" fill="none" stroke="#F3C68F" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M13 22 L15 8 L26 17Z" fill="#F3C68F" stroke="${LINE}"/><path d="M15.5 19 L16.5 11.5 L22.5 16.5Z" fill="#F6B8C4"/>
      <path d="M51 22 L49 8 L38 17Z" fill="#F3C68F" stroke="${LINE}"/><path d="M48.5 19 L47.5 11.5 L41.5 16.5Z" fill="#F6B8C4"/>
      ${feet("#F3C68F")}${blob("#F3C68F", 36, 22, 20)}
      <path d="M29 17.5 q3 3 6 0 M27 21 q5 3 10 0" fill="none" stroke="#DDA161" stroke-width="1.6" stroke-linecap="round"/>
      <ellipse cx="32" cy="43" rx="9" ry="6.5" fill="#FFF1DF"/>
      ${cheeks(40, 12.5)}${eyes(mood, 34)}
      <path d="M30.8 38.6 h2.4 l-1.2 1.4z" fill="#D9798F"/>${smile(mood, 41)}
      <path d="M11 37 h7 M11 41 l7 -1.5 M53 37 h-7 M53 41 l-7 -1.5" stroke="${INK}" stroke-width=".9" stroke-linecap="round" opacity=".55"/>`,

    frog: mood => `
      ${feet("#86C483")}${blob("#9ED39A", 38, 24, 18)}
      <circle cx="21" cy="22" r="8" fill="#9ED39A" stroke="${LINE}"/><circle cx="43" cy="22" r="8" fill="#9ED39A" stroke="${LINE}"/>
      <circle cx="21" cy="22" r="5" fill="#FFFFFF"/><circle cx="43" cy="22" r="5" fill="#FFFFFF"/>
      ${eyes(mood, 22, 11)}
      <ellipse cx="32" cy="46" rx="11" ry="6" fill="#C9EBC2"/>
      ${cheeks(37, 14)}
      ${mood === "focus" ? smile(mood, 38) : `<path d="M24 37 q8 6 16 0" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`}`,

    duck: mood => `
      <path d="M31 13 C29 8 33 6 34 9 C35 6 39 8 36 13" fill="#FFD85E"/>
      ${feet("#F59E4C")}${blob("#FFE07A", 36, 22, 21)}
      <ellipse cx="11.5" cy="40" rx="4" ry="8" fill="#FFD85E" transform="rotate(20 11.5 40)"/>
      <ellipse cx="52.5" cy="40" rx="4" ry="8" fill="#FFD85E" transform="rotate(-20 52.5 40)"/>
      ${cheeks(40, 13)}${eyes(mood, 32)}
      <path d="M26 38 Q32 35 38 38 Q32 44 26 38Z" fill="#F59E4C"/>`,

    bear: mood => `
      <circle cx="15" cy="19" r="7" fill="#C99A6E" stroke="${LINE}"/><circle cx="15" cy="19" r="3.6" fill="#E9C3A0"/>
      <circle cx="49" cy="19" r="7" fill="#C99A6E" stroke="${LINE}"/><circle cx="49" cy="19" r="3.6" fill="#E9C3A0"/>
      ${feet("#B5865B")}${blob("#C99A6E", 36, 23, 21)}
      <ellipse cx="32" cy="41" rx="8.5" ry="6.5" fill="#EBD0B4"/>
      ${cheeks(39, 14)}${eyes(mood, 32, 8)}
      <ellipse cx="32" cy="38.6" rx="2.4" ry="1.7" fill="${INK}"/>
      ${mood === "focus" ? "" : `<path d="M30 42 q2 1.8 4 0" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`}`,

    penguin: mood => `
      ${feet("#F59E4C")}${blob("#3E4A66", 35, 22, 22)}
      <ellipse cx="11" cy="39" rx="3.8" ry="9" fill="#34405A" transform="rotate(18 11 39)"/>
      <ellipse cx="53" cy="39" rx="3.8" ry="9" fill="#34405A" transform="rotate(-18 53 39)"/>
      <path d="M32 21 C42 21 47 28 46 36 C45 47 39 53 32 53 C25 53 19 47 18 36 C17 28 22 21 32 21Z" fill="#FFFFFF"/>
      ${cheeks(38, 10)}${eyes(mood, 32, 6.5)}
      <path d="M29 36.5 L35 36.5 L32 40.5Z" fill="#F59E4C"/>`,
  };

  // your own pet: PNG poses uploaded in the popup
  let custom = null;
  function customHTML(mood, cls)
  {
    const main = (mood === "focus" && custom.study) || (mood === "happy" && custom.happy) || custom.idle;
    const step = mood === "idle" && custom.step ? custom.step : "";
    return `<span class="sb-pet-custom ${cls}${step ? " has-step" : ""}" aria-hidden="true"><img class="sb-f1" src="${main}" alt="">${step ? `<img class="sb-f2" src="${step}" alt="">` : ""}</span>`;
  }

  function svg(kind, mood = "idle", cls = "sb-pet-svg")
  {
    if (kind === "custom" && custom && custom.idle) return customHTML(mood, cls);
    const draw = PARTS[kind] || PARTS.mochi;
    return `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="59" rx="16" ry="2.4" fill="#000" opacity=".08"/>
      <g class="sb-bob">${draw(mood)}${book(mood)}</g>
    </svg>`;
  }

  self.BlushPets = {
    KINDS,
    svg,
    defaultName: kind => (kind === "custom" ? "Buddy" : (KINDS.find(k => k.id === kind) || KINDS[0]).name),
    setCustom: c =>
    {
      custom = c && c.idle ? c : null;
    },
    hasCustom: () => !!custom,
  };
})();
