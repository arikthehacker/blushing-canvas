// Mounts the twinkly sky from sky.js on the banner and the calm screen.
"use strict";

const skies = [];
function mountSky(el, tone)
{
  if (!self.BlushSky) return null;
  const sky = self.BlushSky.mount(el, { tone, density: tone === "night" ? 2200 : 6500 });
  skies.push(sky);
  return sky;
}
let heroSky = null;
