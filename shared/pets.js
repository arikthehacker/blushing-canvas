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

  // big shiny eyes for the cute versions
  const bigEyes = (mood, lx, rx, y, ink = INK, r = 3.1) =>
    mood === "focus"
      ? `<path d="M${lx - 3} ${y} q3 2.6 6 0 M${rx - 3} ${y} q3 2.6 6 0" fill="none" stroke="${ink}" stroke-width="1.7" stroke-linecap="round"/>`
      : mood === "happy"
        ? `<path d="M${lx - 3} ${y + 1} q3 -3.6 6 0 M${rx - 3} ${y + 1} q3 -3.6 6 0" fill="none" stroke="${ink}" stroke-width="1.7" stroke-linecap="round"/>`
        : `<g class="sb-blink" style="transform-origin:${(lx + rx) / 2}px ${y}px"><ellipse cx="${lx}" cy="${y}" rx="${r * 0.86}" ry="${r}" fill="${ink}"/><ellipse cx="${rx}" cy="${y}" rx="${r * 0.86}" ry="${r}" fill="${ink}"/><circle cx="${lx + r * 0.32}" cy="${y - r * 0.38}" r="${r * 0.34}" fill="#FFFFFF"/><circle cx="${rx + r * 0.32}" cy="${y - r * 0.38}" r="${r * 0.34}" fill="#FFFFFF"/><circle cx="${lx - r * 0.3}" cy="${y + r * 0.4}" r="${r * 0.16}" fill="#FFFFFF"/><circle cx="${rx - r * 0.3}" cy="${y + r * 0.4}" r="${r * 0.16}" fill="#FFFFFF"/></g>`;
  const blush = (lx, rx, y) => `<ellipse cx="${lx}" cy="${y}" rx="3.4" ry="2.1" fill="var(--bl-sb-cheek, #F5A9BC)" opacity=".9"/><ellipse cx="${rx}" cy="${y}" rx="3.4" ry="2.1" fill="var(--bl-sb-cheek, #F5A9BC)" opacity=".9"/>`;
  const mouth = (mood, x, y) => mood === "focus"
    ? `<path d="M${x - 1.6} ${y + .4} h3.2" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>`
    : `<path d="M${x - 2.6} ${y} q1.3 1.8 2.6 0 q1.3 1.8 2.6 0" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

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

    // the next three are redrawn from Arik's own sketches, chibi style
  // Melody: a round little betta with a flowy striped tail, a music note on its side and note bubbles
  fish: mood => `
      <g class="sb-swim">
        <path d="M18 30 C13 22 6 19 2.5 21 C4.5 26 5 30 3.5 34 C5 38 4.8 42 3 46.5 C7 48 13 45 18 38Z" fill="#F7B6CC" stroke="${LINE}"/>
        <path d="M6 25 Q11 29 15 32.5 M5 34 Q10 34 15 34.5 M5.5 43 Q10.5 40 15 36.5" stroke="#EE8DB2" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".8"/>
        <path d="M30 18 C28 11 23 8 19.5 9 C21 13 22 17 23.5 21Z" fill="#F4A6C3" stroke="${LINE}"/>
        <path d="M31 47 C28 53 22 55.5 18.5 54.5 C21 51 23 48 25 45Z" fill="#F4A6C3" stroke="${LINE}"/>
        <ellipse cx="35" cy="34" rx="20" ry="16.5" fill="#FBC9DA" stroke="${LINE}"/>
        <ellipse cx="40" cy="38" rx="11" ry="8.5" fill="#FDE1EA"/>
        <g fill="${INK}" opacity=".85" transform="translate(23.5 32)"><path d="M0 0 V-7 L6 -8.4 V-1.4" fill="none" stroke="${INK}" stroke-width="1"/><path d="M0 -7 L6 -8.4 V-6.6 L0 -5.2Z"/><ellipse cx="-1.2" cy=".3" rx="1.7" ry="1.25" transform="rotate(-20 -1.2 .3)"/><ellipse cx="4.8" cy="-1.1" rx="1.7" ry="1.25" transform="rotate(-20 4.8 -1.1)"/></g>
        ${bigEyes(mood, 39, 48.5, 31, INK, 3.2)}
        ${blush(36.5, 51, 37.5)}
        ${mouth(mood, 44, 38.5)}
      </g>
      <g class="sb-bubbles">
        <circle cx="59" cy="22" r="3.8" fill="#FFFFFF" fill-opacity=".8" stroke="#B9CBEA" stroke-width=".7"/>
        <path d="M57.6 23.4 V20 L60.4 19.4 V22.6" fill="none" stroke="${INK}" stroke-width=".7"/><ellipse cx="57.1" cy="23.6" rx=".9" ry=".7" fill="${INK}"/><ellipse cx="59.9" cy="22.9" rx=".9" ry=".7" fill="${INK}"/>
        <circle cx="61" cy="12.5" r="2.3" fill="#FFFFFF" fill-opacity=".8" stroke="#B9CBEA" stroke-width=".7"/>
        <circle cx="57.6" cy="6" r="1.4" fill="#FFFFFF" fill-opacity=".8" stroke="#B9CBEA" stroke-width=".7"/>
      </g>`,

  // Turdy Turt: a round shell with soft spots, a big friendly head with bubble eyes on top, stubby feet
  turtle: mood => `
      <ellipse cx="13" cy="54.5" rx="5" ry="3.6" fill="#FFFDF8" stroke="${LINE}"/>
      <ellipse cx="25" cy="56" rx="5" ry="3.4" fill="#FFFDF8" stroke="${LINE}"/>
      <ellipse cx="36.5" cy="55.6" rx="5" ry="3.4" fill="#FFFDF8" stroke="${LINE}"/>
      <path d="M4 48 C4 33 13 23 25 23 C37 23 45 32 45 46 C45 50 42 52 37 52.5 C29 53.3 18 53.3 11 52.5 C6.5 52 4 51 4 48Z" fill="#EADFCB" stroke="${LINE}"/>
      <path d="M4.5 47 C14 49.5 34 49.5 44.6 46.5" stroke="#D6C5A9" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <ellipse cx="24.5" cy="34" rx="6" ry="4.4" fill="#DCC9AA"/>
      <ellipse cx="13.5" cy="40" rx="4.2" ry="3.4" fill="#DCC9AA"/>
      <ellipse cx="35.5" cy="40" rx="4.2" ry="3.4" fill="#DCC9AA"/>
      <ellipse cx="24.5" cy="44" rx="3.6" ry="2.6" fill="#DCC9AA"/>
      <path d="M41.5 41 C43 38 45 36 47 35" stroke="#EDE6DC" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="51" cy="38" r="11" fill="#EFE8DE" stroke="${LINE}"/>
      <circle cx="46.2" cy="27.6" r="5.2" fill="#EFE8DE" stroke="${LINE}"/>
      <circle cx="56" cy="27.6" r="5.2" fill="#EFE8DE" stroke="${LINE}"/>
      <circle cx="46.2" cy="27.6" r="3.9" fill="#FFFFFF"/><circle cx="56" cy="27.6" r="3.9" fill="#FFFFFF"/>
      ${bigEyes(mood, 46.6, 56.4, 28, INK, 2.6)}
      ${blush(44.5, 58, 41)}
      ${mood === "focus" ? `<path d="M49.4 43.4 h3.2" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>` : `<path d="M47.4 42.4 q3.6 3.4 7.2 0" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`}`,

  // Best: a round purple-lined cat face on butter yellow, one eyebrow up, a tiny w mouth
  best: mood =>
  {
    const P = "#7B68D6";
    return `
      <ellipse cx="24" cy="56.4" rx="4.6" ry="2.4" fill="#FFF4D2" stroke="${P}" stroke-width="1.2"/>
      <ellipse cx="40" cy="56.4" rx="4.6" ry="2.4" fill="#FFF4D2" stroke="${P}" stroke-width="1.2"/>
      <path d="M13.5 26 L14.6 11.4 C14.8 9.6 16.4 9 17.6 10.2 L26 18.6 M38 18.6 L46.4 10.2 C47.6 9 49.2 9.6 49.4 11.4 L50.5 26" fill="#FFF4D2" stroke="${P}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M17.2 15 L18 21 M46.8 15 L46 21" stroke="#CDBFF4" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M32 17.5 C44 17.5 53 25 53 36.5 C53 48 43.5 55 32 55 C20.5 55 11 48 11 36.5 C11 25 20 17.5 32 17.5Z" fill="#FFF4D2" stroke="${P}" stroke-width="2.1"/>
      <path d="M9.6 35.4 l-2.4 -1.2 M9.4 38.6 l-2.6 .2 M54.4 35.4 l2.4 -1.2" stroke="${P}" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>
      <path d="M20.5 28.2 q3.2 -1.4 6.4 0" stroke="${P}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <path d="M37.2 27 q3.2 -2.2 6.6 -.4" stroke="${P}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      ${bigEyes(mood, 24, 40, 34.5, P, 3.3)}
      ${blush(19, 45, 41.5)}
      <path d="M30.4 39.6 h3.2 l-1.6 2.2z" fill="#C590E0" stroke="#C590E0" stroke-width=".8" stroke-linejoin="round"/>
      ${mood === "focus" ? `<path d="M30.4 44.6 h3.2" stroke="${P}" stroke-width="1.5" stroke-linecap="round"/>` : `<path d="M29 43.6 q1.5 1.9 3 0 q1.5 1.9 3 0" stroke="${P}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`}
      <path d="M6.6 42 C10 41.2 13.6 41.4 17 42.2 M7.2 45.6 C10.4 44.6 13.8 44.4 17.2 44.8 M47 42.2 C50.4 41.4 54 41.2 57.4 42 M46.8 44.8 C50.2 44.4 53.6 44.6 56.8 45.6" stroke="#9A8BE0" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
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
