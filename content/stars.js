// Mounts the twinkly sky from sky.js on the banner and the calm screen.
"use strict";

function starsHTML(count, seed = Math.random() * 1e6)
{
  const r = n =>
  {
    const x = Math.sin(seed + n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  let out = "";
  for (let i = 0; i < count; i++)
  {
    const sparkle = r(i * 3) > 0.78;
    const size = sparkle ? 7 + r(i * 5) * 9 : 1.5 + r(i * 7) * 2.5;
    const style = `left:${(r(i * 11) * 100).toFixed(2)}%;top:${(r(i * 13) * 100).toFixed(2)}%;--s:${size.toFixed(1)}px;--d:${(r(i * 17) * 4).toFixed(2)}s;--t:${(2.4 + r(i * 19) * 3).toFixed(2)}s`;
    out += sparkle
      ? `<i class="bl-star is-sparkle" style="${style}"><svg viewBox="0 0 20 20"><path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0Z"/></svg></i>`
      : `<i class="bl-star" style="${style}"></i>`;
  }
  return out;
}
