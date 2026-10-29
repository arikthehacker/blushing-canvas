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
    { id: "fish", label: "Music fish", name: "Melody" },
    { id: "turtle", label: "Turtle", name: "Turdy Turt" },
    { id: "best", label: "Best cat", name: "Best" },
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

    // the next three are redrawn from Arik's own sketches

  // pink betta with music notes, swimming a little above the grass with note bubbles
  fish: mood =>
  {
    const eye = mood === "focus"
      ? `<path d="M44 33.5 q2.2 1.8 4.4 0" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>`
      : mood === "happy"
        ? `<path d="M44 34 q2.2 -2.6 4.4 0" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>`
        : `<g class="sb-blink" style="transform-origin:46px 33px"><ellipse cx="46.2" cy="33" rx="2" ry="2.3" fill="${INK}"/><circle cx="46.9" cy="32.2" r=".7" fill="#FFFFFF"/></g>`;
    const note = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${INK}" stroke="${INK}"><path d="M0 0 V-6 L5 -7.2 V-1.2" fill="none" stroke-width=".9"/><path d="M0 -6 L5 -7.2 L5 -5.6 L0 -4.4Z" stroke="none"/><ellipse cx="-1" cy="0.2" rx="1.4" ry="1.05" transform="rotate(-20 -1 .2)" stroke="none"/><ellipse cx="4" cy="-1" rx="1.4" ry="1.05" transform="rotate(-20 4 -1)" stroke="none"/></g>`;
    const bubble = (x, y, r, inner) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFFFFF" fill-opacity=".75" stroke="#B8C9E8" stroke-width=".6"/><path d="M${x - r * 0.45} ${y - r * 0.35} q${r * 0.3} -${r * 0.35} ${r * 0.7} -${r * 0.2}" stroke="#FFFFFF" stroke-width=".7" fill="none" stroke-linecap="round"/>${inner || ""}`;
    const tiny = (x, y) => `<g fill="${INK}"><ellipse cx="${x}" cy="${y}" rx=".9" ry=".7"/><path d="M${x + 0.8} ${y} V${y - 3.2}" stroke="${INK}" stroke-width=".6"/></g>`;
    return `
      <g class="sb-swim" transform="translate(32 34) scale(1.12) translate(-32 -34)">
        <path d="M17 33 C12 26 6 22 1.5 22.5 C4 27 4.5 30 3 33 C5.5 34 6.5 37 4 41.5 C9 42 13 39 17 35Z" fill="#F7B3CB" stroke="${INK}" stroke-width=".8" stroke-linejoin="round"/>
        <path d="M5 26 C8 28 11 30 14 32.5 M4 33.6 C8 33.6 11 33.8 14.5 34 M5.5 39.5 C8.5 38 11.5 36.6 14.5 35.2" stroke="#E57FA8" stroke-width=".7" fill="none" stroke-linecap="round"/>
        <path d="M32 27.5 C30 20 26 13 20 9.5 C21.5 16 23 22 24 29Z" fill="#F4A3C2" stroke="${INK}" stroke-width=".8" stroke-linejoin="round"/>
        <path d="M37 39 C33 46 26 51 17 52.5 C22 48 26 44 29 39.5Z" fill="#F4A3C2" stroke="${INK}" stroke-width=".8" stroke-linejoin="round"/>
        <path d="M15.5 33.5 C20 27.5 30 25.5 40 27 C48 28.2 54.5 31 55.5 34.5 C54.5 38.5 48 40.6 40 41 C30 41.5 20 39.5 15.5 35Z" fill="#F9C4D6" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"/>
        <path d="M40 27.4 C48 28.2 54.5 31 55.5 34.5 C54.5 38.5 48 40.6 40 41 C43 37 43 31 40 27.4Z" fill="#FCD8E3"/>
        <path d="M21 29.5 q1.2 5 0 9.5 M24.5 28.4 q1.4 5.6 0 11.4 M28 28 q1 5.6 -.2 11.6" stroke="#E57FA8" stroke-width=".7" fill="none" stroke-linecap="round"/>
        <path d="M15.5 33.5 C20 27.5 30 25.5 40 27" stroke="#F6B26B" stroke-width=".6" fill="none" opacity=".8" transform="translate(-.6 -.6)"/>
        <path d="M40 41 C30 41.5 20 39.5 15.5 35" stroke="#8CB6E8" stroke-width=".6" fill="none" opacity=".8" transform="translate(.6 .7)"/>
        ${note(32, 36.5, 0.95)}
        ${eye}
        <ellipse cx="44" cy="37" rx="2" ry="1.2" fill="var(--bl-sb-cheek, #F5A9BC)" opacity=".8"/>
        <path d="M54.2 35.4 q-1 .9 -2.2 .7" stroke="${INK}" stroke-width=".8" fill="none" stroke-linecap="round"/>
      </g>
      <g class="sb-bubbles">${bubble(59, 25, 3.4, tiny(58.7, 26.4))}${bubble(61, 15, 2.2)}${bubble(57.5, 8, 1.4)}</g>`;
  },

  // Turdy Turt: big speckled dome shell, bulgy eyes on top of the head, chunky white feet
  turtle: mood =>
  {
    const eyeIn = (x, y) => mood === "focus"
      ? `<path d="M${x - 2.3} ${y + .2} q2.3 1.9 4.6 0" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>`
      : mood === "happy"
        ? `<path d="M${x - 2.3} ${y + .8} q2.3 -2.6 4.6 0" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>`
        : `<g class="sb-blink" style="transform-origin:${x}px ${y}px"><circle cx="${x}" cy="${y}" r="2.1" fill="${INK}"/><circle cx="${x + .7}" cy="${y - .7}" r=".6" fill="#FFFFFF"/></g>`;
    return `
      <path d="M41 44 C44 42 45 39 46 36" stroke="#CFC6B9" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M9 55 C8 51 10 49 13.5 49.5 C16.5 50 17 53 16 55.5Z M19 56 C18.5 52 21 50.5 24 51.2 C26.6 52 26.6 54.6 25.5 56.5Z M30 56.5 C29.6 52.6 32 51.2 35 52 C37.4 52.8 37.4 55 36.4 57Z M38 55.5 C38 52.4 40.5 51.2 43 52 C45.2 52.8 45 55 44 56.5Z" fill="#FBF8F3" stroke="${LINE}" stroke-width=".9"/>
      <path d="M5 47 C4 32 13 19 27 18.5 C40 18 47 29 46.5 43 C46.3 48 43 50.5 37 51 C28 51.8 15 51.6 9.5 50.6 C6.5 50 5.2 49 5 47Z" fill="#D9D0C3" stroke="${INK}" stroke-width=".9" stroke-opacity=".55"/>
      <path d="M12 27 C16 24 21 23 24 25 M30 21.5 C35 22 39 25 41 29 M9 39 C12 37 15 37.5 17 40 M22 33 C26 31 30 32 32 35 M36 37 C39 36 42 37.5 43.5 40 M15 46 C18 44.5 22 45 24 47.5 M30 45.5 C33 44 37 44.5 39 47" stroke="#B3A595" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".75"/>
      <circle cx="19" cy="31" r="1.1" fill="#B3A595" opacity=".7"/><circle cx="34" cy="28" r=".9" fill="#B3A595" opacity=".7"/><circle cx="28" cy="40" r="1" fill="#B3A595" opacity=".7"/>
      <path d="M45 37 C45 31 49.5 28.5 54 29 C59 29.5 62 33 61.5 38 C61 43 57 46 52 46 C47.5 46 45 42.5 45 37Z" fill="#E4DDD3" stroke="${INK}" stroke-width=".9" stroke-opacity=".55"/>
      <circle cx="48.8" cy="29.6" r="4.4" fill="#E4DDD3" stroke="${INK}" stroke-width=".9" stroke-opacity=".55"/>
      <circle cx="57.6" cy="30.2" r="4.4" fill="#E4DDD3" stroke="${INK}" stroke-width=".9" stroke-opacity=".55"/>
      <circle cx="48.8" cy="29.6" r="3" fill="#FFFFFF"/><circle cx="57.6" cy="30.2" r="3" fill="#FFFFFF"/>
      ${eyeIn(49.1, 29.8)}${eyeIn(57.9, 30.4)}
      <ellipse cx="53.6" cy="39.2" rx="5.6" ry="4" fill="#D3CABE"/>
      <ellipse cx="51.6" cy="38.6" rx=".8" ry=".6" fill="${INK}" opacity=".6"/><ellipse cx="55.6" cy="38.6" rx=".8" ry=".6" fill="${INK}" opacity=".6"/>
      ${mood === "focus" ? `<path d="M51.8 42.4 h3.6" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/>` : `<path d="M50.8 42 q2.8 2.2 5.6 0" stroke="${INK}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`}
      <ellipse cx="47.2" cy="40.6" rx="1.8" ry="1.1" fill="var(--bl-sb-cheek, #F5A9BC)" opacity=".75"/><ellipse cx="60" cy="40.6" rx="1.8" ry="1.1" fill="var(--bl-sb-cheek, #F5A9BC)" opacity=".75"/>`;
  },

  // Best: purple line-drawn cat face on soft butter yellow, one eyebrow raised
  best: mood =>
  {
    const P = "#7B68D6";
    const eyes = mood === "focus"
      ? `<path d="M22 35 q3 2.2 6 0 M36.5 35 q3 2.2 6 0" fill="none" stroke="${P}" stroke-width="1.8" stroke-linecap="round"/>`
      : mood === "happy"
        ? `<path d="M22 36 q3 -3.2 6 0 M36.5 36 q3 -3.2 6 0" fill="none" stroke="${P}" stroke-width="1.8" stroke-linecap="round"/>`
        : `<g class="sb-blink" style="transform-origin:32px 34px"><ellipse cx="25" cy="34.5" rx="2.2" ry="3.3" fill="${P}"/><ellipse cx="39.5" cy="34.5" rx="2.2" ry="3.3" fill="${P}"/></g>`;
    return `
      <ellipse cx="24" cy="56.2" rx="4.6" ry="2.3" fill="#FFF3CF" stroke="${P}" stroke-width="1.1"/><ellipse cx="40" cy="56.2" rx="4.6" ry="2.3" fill="#FFF3CF" stroke="${P}" stroke-width="1.1"/>
      <path d="M12.5 27 L14 10 C14.3 8.8 15.4 8.6 16.2 9.4 L26 18.5 M38 18.2 L47.6 8.6 C48.4 7.8 49.6 8.2 49.8 9.4 L51.5 27" fill="#FFF3CF" stroke="${P}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M12.5 27 C10.5 33 10.4 40 13 45.5 C17 53.5 25 56 32 56 C39.5 56 47 53.5 51 46 C53.6 40.5 53.6 33 51.5 27 C48 20 41 17 32 17 C23 17 16 20 12.5 27Z" fill="#FFF3CF"/>
      <path d="M16.5 13.5 L17.2 21.4 M47 13.2 L46.4 21" stroke="#C8B8F2" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M26 18.5 C29 17.5 31 17.8 32 18.6 C33.5 17.4 35.6 17.4 38 18.2" fill="none" stroke="${P}" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="2.2 1.4"/>
      <path d="M12.5 27 C10.5 33 10.4 40 13 45.5" fill="none" stroke="${P}" stroke-width="1.5" stroke-linecap="round" opacity=".85"/>
      <path d="M51.5 27 C53.6 33 53.6 40.5 51 46" fill="none" stroke="${P}" stroke-width="1.5" stroke-linecap="round" opacity=".85"/>
      <path d="M11.6 34 l-2.6 -1.4 M11.4 37.4 l-2.8 -.2 M51.8 34 l2.4 -1.6" stroke="${P}" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>
      <path d="M21.6 29.4 q3.2 -1.6 6.4 -.4" stroke="${P}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <path d="M36 27.6 q3.4 -2.6 7.2 -.6" stroke="${P}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      ${eyes}
      <path d="M30.2 40.4 L34 40.2 L32.3 43.2Z" fill="#B57FD6" stroke="#B57FD6" stroke-width=".8" stroke-linejoin="round"/>
      <path d="M32.3 43.2 C32.4 44.6 31.6 45.6 30.2 45.4" stroke="#B57FD6" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      ${mood === "focus" ? `<path d="M26 48 q6 1.6 12 0" stroke="${P}" stroke-width="1.6" fill="none" stroke-linecap="round"/>` : `<path d="M20.5 45.5 C25 51.5 39 51.5 44 45" stroke="${P}" stroke-width="1.7" fill="none" stroke-linecap="round"/>`}
      <path d="M8 41 C12 40 16 40.4 19.4 41.4 M8.6 45 C12 43.8 16 43.4 19.6 43.6 M44.6 41.6 C48 40.4 52 40.2 56 41 M44.4 44 C48 43.6 52 43.8 55.4 45.2" stroke="#9A8BE0" stroke-width="1" fill="none" stroke-linecap="round"/>`;
  },
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

  // ---------------------------------------------------------------- garden plants
  // the six plants, in the order the garden numbers them
  const PLANTS = ["Tulip", "Daisy", "Round bloom", "Lavender", "Mushroom", "Cactus"];
  const PETAL = ["var(--bl-accent)", "#EBA2B6", "#F2C46D", "#B9A6E3", "#F4A6A0", "#8FCBB0"];
  const LEAF = "#7DAF7F",
    STEM = "#6A9C6E";

  function plantSVG(kind, stage, i = 0)
  {
    // stage: 0 seed, 1 sprout, 2 bud, 3 bloom
    const c = PETAL[(kind + i) % PETAL.length];
    const soil = '<ellipse cx="12" cy="30" rx="7" ry="2" fill="var(--bl-sb-soil)"/>';
    if (stage === 0)
      return `<svg viewBox="0 0 24 32" aria-hidden="true">${soil}<ellipse cx="12" cy="28.6" rx="2.6" ry="1.8" fill="#A07A5C"/></svg>`;
    const leaves = `<path d="M12 26 C8 25 6.5 22.5 7 21 C9.5 21 11.5 23 12 26Z" fill="${LEAF}"/><path d="M12 24 C16 23 17.5 20.5 17 19 C14.5 19 12.5 21 12 24Z" fill="${LEAF}"/>`;
    if (stage === 1)
      return `<svg viewBox="0 0 24 32" aria-hidden="true">${soil}<path d="M12 30 V22" stroke="${STEM}" stroke-width="1.6" stroke-linecap="round"/><path d="M12 23 C9 22.5 8 20.5 8.4 19.4 C10.6 19.4 11.8 21 12 23Z" fill="${LEAF}"/><path d="M12 23 C15 22.5 16 20.5 15.6 19.4 C13.4 19.4 12.2 21 12 23Z" fill="${LEAF}"/></svg>`;
    const stem = `<path d="M12 30 V${stage === 2 ? 14 : 12}" stroke="${STEM}" stroke-width="1.6" stroke-linecap="round"/>`;
    if (stage === 2)
      return `<svg viewBox="0 0 24 32" aria-hidden="true">${soil}${stem}${leaves}<ellipse cx="12" cy="12.5" rx="2.8" ry="3.6" fill="${c}"/><path d="M9.6 14 Q12 17 14.4 14" fill="${LEAF}"/></svg>`;
    let bloom = "";
    switch (kind % 6)
    {
      case 0: // tulip
        bloom = `<path d="M7.5 8 L9.5 11 L12 7 L14.5 11 L16.5 8 C17 13.5 15 15 12 15 C9 15 7 13.5 7.5 8Z" fill="${c}"/>`;
        break;
      case 1: // daisy
        bloom =
          [0, 45, 90, 135, 180, 225, 270, 315]
            .map(
              a =>
                `<ellipse cx="12" cy="7.2" rx="1.6" ry="3" fill="#FFFFFF" stroke="${c}" stroke-width=".6" transform="rotate(${a} 12 11)"/>`,
            )
            .join("") + '<circle cx="12" cy="11" r="2.2" fill="#F2C46D"/>';
        break;
      case 2: // round bloom
        bloom =
          [0, 60, 120, 180, 240, 300]
            .map(a => `<circle cx="12" cy="7.6" r="2.8" fill="${c}" transform="rotate(${a} 12 11)"/>`)
            .join("") + '<circle cx="12" cy="11" r="2.4" fill="#FFF3D6"/>';
        break;
      case 3: // lavender sprig
        bloom =
          [4, 6.5, 9, 11.5]
            .map(
              (y, n) => `<ellipse cx="${n % 2 ? 13.3 : 10.7}" cy="${y}" rx="1.7" ry="2" fill="${PETAL[3]}"/>`,
            )
            .join("") + `<ellipse cx="12" cy="2.6" rx="1.4" ry="1.8" fill="${PETAL[3]}"/>`;
        break;
      case 4: // mushroom
        return `<svg viewBox="0 0 24 32" aria-hidden="true">${soil}<path d="M9.5 29.5 C9.8 25 10 22 12 22 C14 22 14.2 25 14.5 29.5Z" fill="#FFF6EC"/><path d="M4.5 22.5 C4.5 16 8 13 12 13 C16 13 19.5 16 19.5 22.5Z" fill="${c}"/><circle cx="9" cy="18" r="1.3" fill="#FFFFFF"/><circle cx="14.5" cy="16.6" r="1.1" fill="#FFFFFF"/><circle cx="15.6" cy="20.2" r=".9" fill="#FFFFFF"/></svg>`;
      default: // little cactus with a flower
        return `<svg viewBox="0 0 24 32" aria-hidden="true">${soil}<rect x="9.5" y="13" width="5" height="17" rx="2.5" fill="#7DB08A"/><path d="M9.5 21 H7.5 A1.5 1.5 0 0 1 6 19.5 V17" stroke="#7DB08A" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M14.5 19 H16.5 A1.5 1.5 0 0 0 18 17.5 V15.5" stroke="#7DB08A" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="12" cy="12.4" r="2" fill="${c}"/></svg>`;
    }
    return `<svg viewBox="0 0 24 32" aria-hidden="true">${soil}${stem}${leaves}${bloom}</svg>`;
  }

  self.BlushPets = {
    KINDS,
    svg,
    PLANTS,
    plantSVG,
    defaultName: kind => (kind === "custom" ? "Buddy" : (KINDS.find(k => k.id === kind) || KINDS[0]).name),
    setCustom: c =>
    {
      custom = c && c.idle ? c : null;
    },
    hasCustom: () => !!custom,
  };
})();
