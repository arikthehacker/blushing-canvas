/* Blush for Canvas: twinkly sky
   A canvas of stars that fade in and out at their own pace (a few flare into little crosses),
   over soft drifting color blobs made from your current palette. Used by the Stars banner and the calm screen. */
(() =>
{
  "use strict";

  const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");

  function hexOrRgb(str)
  {
    const s = String(str || "").trim();
    let m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m)
    {
      let h = m[1];
      if (h.length === 3)
        h = h
          .split("")
          .map(c => c + c)
          .join("");
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    m = s.match(/rgba?\(([^)]+)\)/);
    if (m)
      return m[1]
        .split(/[\s,/]+/)
        .slice(0, 3)
        .map(Number);
    return null;
  }

  // mount(el, { tone: 'night' | 'day', density })
  function mount(el, opts = {})
  {
    const tone = opts.tone || "night";
    el.classList.add("bl-sky", `is-${tone}`);
    el.innerHTML =
      '<span class="bl-blob is-a"></span><span class="bl-blob is-b"></span><span class="bl-blob is-c"></span><canvas class="bl-sky-canvas"></canvas>';
    const cv = el.querySelector("canvas");
    const ctx = cv.getContext("2d");
    let stars = [],
      w = 0,
      h = 0,
      dpr = 1,
      raf = 0,
      visible = true,
      seed = Math.random() * 1e6;
    let palette = { star: [255, 246, 227], tint: [255, 200, 214], gold: [255, 226, 160] };

    const rand = () =>
    {
      let s = (Math.floor(seed) % 2147483646) + 1;
      return () =>
      {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
      };
    };
    function readPalette()
    {
      const cs = getComputedStyle(el);
      const accent = hexOrRgb(cs.getPropertyValue("--bl-accent")) || [227, 165, 180];
      if (tone === "night")
      {
        palette = {
          star: [255, 246, 227],
          tint: accent.map(v => Math.round(v + (255 - v) * 0.55)),
          gold: [255, 226, 160],
        };
      }
      else
      {
        palette = {
          star: accent.map(v => Math.round(v + (255 - v) * 0.25)),
          tint: [236, 150, 178],
          gold: [232, 180, 80],
        };
      }
    }
    function build()
    {
      const r = rand();
      const area = w * h;
      const n = Math.round(Math.min(260, Math.max(40, area / (opts.density || 2600))));
      stars = [];
      for (let i = 0; i < n; i++)
      {
        const big = r() > 0.93;
        stars.push({
          x: r() * w,
          y: r() * h,
          size: big ? 1.4 + r() * 1.4 : 0.4 + r() * 0.9,
          speed: 0.35 + r() * 1.3, // twinkles per ~6 seconds
          phase: r() * Math.PI * 2,
          base: big ? 0.25 : 0.12 + r() * 0.3,
          flare: big,
          hue: r() < 0.18 ? "tint" : r() < 0.3 ? "gold" : "star",
          drift: (r() - 0.5) * 0.004,
        });
      }
    }
    function resize()
    {
      const rect = el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      readPalette();
      build();
      draw(performance.now());
    }
    function draw(t)
    {
      ctx.clearRect(0, 0, w, h);
      const still = reduceMQ.matches;
      for (const s of stars)
      {
        // smooth, uneven twinkle: two sine waves at different speeds
        const k = still
          ? 0.6
          : 0.5 +
            0.5 *
              Math.sin((t / 1000) * s.speed + s.phase) *
              Math.sin((t / 1000) * s.speed * 0.37 + s.phase * 1.7);
        const a = Math.max(0, Math.min(1, s.base + k * (1 - s.base)));
        if (!still) s.x = (s.x + s.drift * w * 0.001 + w) % w;
        const c = palette[s.hue];
        const rad = s.size * (0.75 + k * 0.5);
        // soft glow
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rad * 4);
        g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${(a * 0.55).toFixed(3)})`);
        g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, rad * 4, 0, Math.PI * 2);
        ctx.fill();
        // core
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, rad, 0, Math.PI * 2);
        ctx.fill();
        // the bright ones flare into a little cross at their peak
        if (s.flare && k > 0.55)
        {
          const f = (k - 0.55) / 0.45,
            len = rad * (4 + f * 7);
          ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(a * f * 0.8).toFixed(3)})`;
          ctx.lineWidth = Math.max(0.6, rad * 0.45);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(s.x - len, s.y);
          ctx.lineTo(s.x + len, s.y);
          ctx.moveTo(s.x, s.y - len);
          ctx.lineTo(s.x, s.y + len);
          ctx.stroke();
        }
      }
    }
    function loop(t)
    {
      raf = 0;
      if (!visible || document.hidden || !el.isConnected) return;
      draw(t);
      if (!reduceMQ.matches) raf = requestAnimationFrame(loop);
    }
    const start = () =>
    {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(() => resize());
    ro.observe(el);
    const io = new IntersectionObserver(entries =>
    {
      visible = entries.some(e => e.isIntersecting);
      if (visible) start();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", start);
    resize();
    start();

    return {
      reseed()
      {
        seed = Math.random() * 1e6;
        build();
        start();
      },
      refresh()
      {
        readPalette();
        start();
      },
    };
  }

  self.BlushSky = { mount };
})();
