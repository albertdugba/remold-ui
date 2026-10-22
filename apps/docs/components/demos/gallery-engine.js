/**
 * "Not just diagrams": live canvas illustrations sharing one set of springs. A globe whose dots
 * unroll into a map, voxels that rebuild into the next shape, and an app screen pulled apart into
 * its layers. (The prototype's canvas wallet is kept below but not shown: the Wallet app example
 * replaces it with real HTML.)
 *
 * This is plain JavaScript on purpose: dense canvas drawing that typing line by line wouldn't
 * make clearer. The springs are
 * core's (`springCoefficients` and `stepSpring`), and frames come from `@remold-ui/dom`.
 *
 * createGallery(canvas, { onCaption }) → { kinds, setKind(key), setState(key), destroy() }
 */
import { springCoefficients, stepSpring } from "@remold-ui/core";
import { frames, prefersReducedMotion } from "@remold-ui/dom";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

/** One animated number with its own velocity, an optional start delay, and a "held" state for drags. */
class Ch {
  constructor(v, spring, eps, delay = 0) {
    this.v = v;
    this.target = v;
    this.vel = 0;
    this.coefficients = springCoefficients(spring);
    this.eps = eps;
    this.delay = delay;
    this.done = true;
    this.held = false;
  }
  step(dt) {
    if (this.held || this.done) return;
    if (this.delay > 0) {
      this.delay -= dt;
      return;
    }
    const state = { value: this.v, velocity: this.vel };
    stepSpring(state, this.target, this.coefficients, dt);
    this.v = state.value;
    this.vel = state.velocity;
    if (Math.abs(this.v - this.target) < this.eps && Math.abs(this.vel) < this.eps * 12) {
      this.v = this.target;
      this.vel = 0;
      this.done = true;
    }
  }
  get settled() {
    return this.done && !this.held;
  }
}

const P = { duration: 0.8, bounce: 0.18 };
const PQ = { duration: 0.35, bounce: 0.05 };
const C = (v, p = P, eps = 0.001, delay = 0) => new Ch(v, p, eps, delay);
const go = (ch, v) => {
  ch.target = v;
  ch.done = false;
};
/** Speed of the last ~100 ms of samples, in units per second. */
const velocity = (s) => {
  if (s.length < 2) return 0;
  const a = s[0];
  const b = s[s.length - 1];
  const dt = (b.t - a.t) / 1000;
  return dt > 0 ? (b.y - a.y) / dt : 0;
};
/** Where a flick would coast to. */
const project = (v, d = 0.99) => ((v / 1000) * d) / (1 - d);

export function createGallery(canvas, { onCaption } = {}) {
  const main = canvas.getContext("2d");
  let ctx = main;
  const off = document.createElement("canvas");
  const offCtx = off.getContext("2d");
  const reduced = prefersReducedMotion();
  const D = Math.PI / 180;
  let W = 0;
  let H = 0;
  let dpr = 1;
  let t = 0;
  let visible = true;
  let stop = null;
  let destroyed = false;

  const resetT = () => ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const noise = document.createElement("canvas");
  noise.width = noise.height = 96;
  {
    const n = noise.getContext("2d");
    const img = n.createImageData(96, 96);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 120 + Math.random() * 135;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = Math.random() * 22;
    }
    n.putImageData(img, 0, 0);
  }
  const grain = main.createPattern(noise, "repeat");
  const glow = (x, y, r, rgb, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };

  /* ---------- 1. Globe: dots that unroll into a map ---------- */
  const Globe = (() => {
    const LAND = [
      [
        [-168, 65],
        [-140, 70],
        [-95, 72],
        [-80, 62],
        [-60, 55],
        [-55, 48],
        [-70, 43],
        [-76, 35],
        [-81, 25],
        [-97, 26],
        [-105, 20],
        [-95, 16],
        [-83, 9],
        [-80, 8],
        [-90, 14],
        [-105, 22],
        [-112, 30],
        [-118, 33],
        [-124, 40],
        [-125, 48],
        [-135, 57],
        [-150, 60],
        [-165, 60],
      ],
      [
        [-55, 60],
        [-45, 60],
        [-20, 70],
        [-20, 80],
        [-60, 82],
        [-70, 76],
      ],
      [
        [-80, 8],
        [-60, 10],
        [-50, 0],
        [-35, -5],
        [-38, -15],
        [-48, -25],
        [-58, -35],
        [-65, -45],
        [-70, -55],
        [-75, -50],
        [-72, -35],
        [-70, -18],
        [-80, -5],
      ],
      [
        [-10, 36],
        [-9, 43],
        [-2, 44],
        [-5, 48],
        [0, 50],
        [5, 53],
        [8, 57],
        [5, 61],
        [12, 66],
        [20, 70],
        [30, 70],
        [40, 67],
        [45, 55],
        [40, 45],
        [28, 41],
        [22, 36],
        [12, 38],
        [8, 44],
        [0, 40],
      ],
      [
        [-6, 50],
        [2, 51],
        [0, 54],
        [-3, 58],
        [-6, 57],
        [-5, 54],
      ],
      [
        [-17, 15],
        [-16, 22],
        [-10, 30],
        [-5, 35],
        [10, 37],
        [20, 32],
        [32, 31],
        [35, 25],
        [43, 12],
        [51, 11],
        [42, -2],
        [40, -15],
        [35, -25],
        [28, -33],
        [18, -35],
        [12, -18],
        [13, -5],
        [9, 4],
        [-5, 5],
        [-12, 8],
      ],
      [
        [28, 41],
        [40, 45],
        [45, 55],
        [40, 67],
        [60, 70],
        [80, 73],
        [100, 77],
        [130, 72],
        [160, 70],
        [178, 66],
        [160, 60],
        [142, 52],
        [135, 43],
        [127, 35],
        [122, 30],
        [118, 22],
        [108, 18],
        [105, 10],
        [100, 13],
        [98, 8],
        [92, 22],
        [80, 15],
        [77, 8],
        [72, 20],
        [66, 25],
        [57, 25],
        [50, 30],
        [48, 28],
        [55, 22],
        [52, 15],
        [44, 13],
        [38, 22],
        [35, 32],
        [30, 36],
      ],
      [
        [130, 31],
        [135, 34],
        [140, 36],
        [142, 40],
        [141, 45],
        [139, 40],
        [133, 33],
      ],
      [
        [95, 5],
        [105, -6],
        [115, -8],
        [125, -8],
        [130, -2],
        [118, 2],
        [108, 2],
        [100, 2],
      ],
      [
        [114, -22],
        [122, -18],
        [130, -12],
        [137, -12],
        [142, -11],
        [146, -19],
        [153, -28],
        [150, -37],
        [140, -38],
        [132, -32],
        [115, -34],
      ],
    ];
    const inPoly = (x, y, poly) => {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    const pts = [];
    for (let lat = -56; lat <= 80; lat += 2.3) {
      const step = 2.3 / Math.max(0.25, Math.cos(lat * D));
      for (let lon = -180; lon < 180; lon += step) if (LAND.some((p) => inPoly(lon, lat, p))) pts.push([lat, lon]);
    }
    const CITY = {
      ldn: [51.5, -0.1],
      nyc: [40.7, -74],
      sf: [37.8, -122.4],
      sao: [-23.5, -46.6],
      lag: [6.5, 3.4],
      mum: [19, 72.8],
      sin: [1.3, 103.8],
      tyo: [35.7, 139.7],
      syd: [-33.9, 151.2],
    };
    const ARCS = [
      ["ldn", "nyc"],
      ["nyc", "sf"],
      ["ldn", "lag"],
      ["ldn", "mum"],
      ["mum", "sin"],
      ["sin", "tyo"],
      ["sin", "syd"],
      ["nyc", "sao"],
    ];
    const s = { m: C(0), zoom: C(1), tilt: C(18 * D, P, 0.0005), lon: C(-30 * D, P, 0.0002), fo: C(0) };
    let state = "globe";
    let drag = null;
    const geo = (lat, lon) => {
      const φ = lat * D;
      const λ = lon * D + s.lon.v;
      const x = Math.cos(φ) * Math.sin(λ);
      const y = Math.sin(φ);
      const z = Math.cos(φ) * Math.cos(λ);
      const c = Math.cos(s.tilt.v);
      const sn = Math.sin(s.tilt.v);
      return [x, y * c - z * sn, y * sn + z * c];
    };
    const frame = () => {
      const Rg = Math.min(W, H) * 0.36 * s.zoom.v;
      const cy = H * 0.5 + Rg * Math.sin(50 * D - s.tilt.v) * s.fo.v;
      const k = Math.min((W * 0.92) / 360, (H * 0.72) / 140);
      return { Rg, cx: W / 2, cy, k };
    };
    const flat = (lat, lon, F) => [F.cx + (((lon - 10 + 540) % 360) - 180) * F.k, H * 0.52 - (lat - 12) * F.k];
    const lerp = (a, b, m) => a + (b - a) * m;
    return {
      key: "globe",
      name: "Globe",
      states: [
        ["globe", "Globe", "Every dot is a piece of land. Drag to spin it, and fling it to let it coast."],
        ["map", "Flat map", "The same dots unroll into a flat map, each one travelling to its own place."],
        ["focus", "Focus", "The camera turns to London and leans in. Routes keep flowing."],
      ],
      set(k) {
        state = k;
        go(s.m, k === "map" ? 1 : 0);
        go(s.zoom, k === "focus" ? 1.75 : 1);
        go(s.tilt, (k === "focus" ? 38 : 18) * D);
        go(s.fo, k === "focus" ? 1 : 0);
        if (k === "focus") {
          const base = 0.1 * D;
          const n = Math.round((s.lon.v - base) / (2 * Math.PI));
          go(s.lon, base + n * 2 * Math.PI);
        }
      },
      step(dt) {
        if (state === "globe" && !drag) {
          s.lon.target += 7 * D * dt;
          s.lon.done = false;
        }
        for (const c of Object.values(s)) c.step(dt);
      },
      draw() {
        const F = frame();
        const m = clamp(s.m.v, 0, 1);
        glow(F.cx, F.cy, F.Rg * 1.6, "60,120,255", 0.18 * (1 - m) + 0.06);
        resetT();
        if (m < 0.98) {
          ctx.globalAlpha = 1 - m;
          ctx.beginPath();
          ctx.arc(F.cx, F.cy, F.Rg, 0, Math.PI * 2);
          const g = ctx.createRadialGradient(F.cx - F.Rg * 0.3, F.cy - F.Rg * 0.4, F.Rg * 0.1, F.cx, F.cy, F.Rg);
          g.addColorStop(0, "rgba(40,70,160,.35)");
          g.addColorStop(1, "rgba(10,14,40,.2)");
          ctx.fillStyle = g;
          ctx.fill();
          ctx.strokeStyle = "rgba(140,170,255,.25)";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        for (const [lat, lon] of pts) {
          const [x, y, z] = geo(lat, lon);
          const [fx, fy] = flat(lat, lon, F);
          const a = lerp(z > 0 ? 0.45 + 0.55 * z : 0, 0.8, m);
          if (a < 0.02) continue;
          ctx.globalAlpha = a;
          ctx.fillStyle = z > 0.6 && m < 0.5 ? "#B9C8FF" : "#7E95F5";
          ctx.fillRect(lerp(F.cx + F.Rg * x, fx, m) - 1, lerp(F.cy - F.Rg * y, fy, m) - 1, 2, 2);
        }
        ctx.globalAlpha = 1;
        const pos = (lat, lon, lift) => {
          const [x, y, z] = geo(lat, lon);
          return [F.cx + F.Rg * x * lift, F.cy - F.Rg * y * lift, z];
        };
        ARCS.forEach(([a, b], i) => {
          const A = CITY[a];
          const B = CITY[b];
          const ga = geo(...A);
          const gb = geo(...B);
          const dot = clamp(ga[0] * gb[0] + ga[1] * gb[1] + ga[2] * gb[2], -1, 1);
          const ang = Math.acos(dot);
          const fa = flat(...A, F);
          const fb = flat(...B, F);
          const fd = Math.hypot(fb[0] - fa[0], fb[1] - fa[1]);
          const N = 40;
          const path = [];
          for (let j = 0; j <= N; j++) {
            const u = j / N;
            const sA = Math.sin((1 - u) * ang) / Math.sin(ang || 1e-6);
            const sB = Math.sin(u * ang) / Math.sin(ang || 1e-6);
            const lift = 1 + 0.22 * Math.sin(Math.PI * u) * ang;
            const v = [ga[0] * sA + gb[0] * sB, ga[1] * sA + gb[1] * sB, ga[2] * sA + gb[2] * sB];
            const gx = F.cx + F.Rg * v[0] * lift;
            const gy = F.cy - F.Rg * v[1] * lift;
            const vis = v[2] > -0.05 ? 1 : 0;
            const px = fa[0] + (fb[0] - fa[0]) * u;
            const py = fa[1] + (fb[1] - fa[1]) * u - Math.sin(Math.PI * u) * fd * 0.22;
            path.push([lerp(gx, px, m), lerp(gy, py, m), lerp(vis, 1, m)]);
          }
          ctx.lineWidth = 1.2;
          ctx.lineCap = "round";
          for (let j = 1; j <= N; j++) {
            const p0 = path[j - 1];
            const p1 = path[j];
            const a2 = Math.min(p0[2], p1[2]);
            if (a2 < 0.05) continue;
            ctx.strokeStyle = `rgba(90,220,200,${0.28 * a2})`;
            ctx.beginPath();
            ctx.moveTo(p0[0], p0[1]);
            ctx.lineTo(p1[0], p1[1]);
            ctx.stroke();
          }
          if (!reduced) {
            // A bright pulse travelling along each route.
            const head = ((t * 0.28 + i * 0.137) % 1) * N;
            const tail = Math.max(0, head - 9);
            ctx.lineWidth = 2.2;
            ctx.shadowColor = "rgba(90,240,215,.9)";
            ctx.shadowBlur = 10 * dpr;
            for (let j = Math.ceil(tail) + 1; j <= Math.min(N, head); j++) {
              const p0 = path[j - 1];
              const p1 = path[j];
              const a2 = Math.min(p0[2], p1[2]) * ((j - tail) / 9);
              if (a2 < 0.05) continue;
              ctx.strokeStyle = `rgba(170,255,240,${a2})`;
              ctx.beginPath();
              ctx.moveTo(p0[0], p0[1]);
              ctx.lineTo(p1[0], p1[1]);
              ctx.stroke();
            }
            ctx.shadowBlur = 0;
          }
        });
        for (const [k, [lat, lon]] of Object.entries(CITY)) {
          const g = pos(lat, lon, 1);
          const f = flat(lat, lon, F);
          const a = lerp(g[2] > 0 ? 1 : 0, 1, m);
          if (a < 0.05) continue;
          const x = lerp(g[0], f[0], m);
          const y = lerp(g[1], f[1], m);
          const pr = (((t * 0.8 + lat / 7) % 1) + 1) % 1;
          ctx.globalAlpha = a;
          ctx.fillStyle = "#E9FFFA";
          ctx.beginPath();
          ctx.arc(x, y, 2.6, 0, Math.PI * 2);
          ctx.fill();
          if (!reduced) {
            ctx.strokeStyle = `rgba(120,255,230,${0.6 * (1 - pr)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, 3 + pr * 10, 0, Math.PI * 2);
            ctx.stroke();
          }
          if (k === "ldn" && s.fo.v > 0.05) {
            ctx.globalAlpha = a * s.fo.v;
            ctx.font = `600 13px ${SANS}`;
            ctx.fillStyle = "#E9FFFA";
            ctx.fillText("London", x + 9, y - 8);
          }
          ctx.globalAlpha = 1;
        }
      },
      down(x) {
        if (state === "map") return;
        drag = { x0: x, lon0: s.lon.v, s: [{ t: performance.now(), y: x }] };
        s.lon.held = true;
      },
      move(x) {
        if (!drag) return;
        const k = 0.008 / s.zoom.v;
        s.lon.v = drag.lon0 + (x - drag.x0) * k;
        drag.s.push({ t: performance.now(), y: x });
        while (drag.s.length > 2 && drag.s[drag.s.length - 1].t - drag.s[0].t > 100) drag.s.shift();
      },
      up() {
        if (!drag) return;
        const k = 0.008 / s.zoom.v;
        const v = velocity(drag.s) * k;
        s.lon.held = false;
        s.lon.vel = v;
        go(s.lon, s.lon.v + v * 0.45);
        drag = null;
      },
      leave() {},
      cursor: () => (state === "map" ? "default" : drag ? "grabbing" : "grab"),
      hint: () => null,
    };
  })();

  /* ---------- 2. Wallet: cards in perspective ---------- */
  const Wallet = (() => {
    const CARDS = [
      { kind: "Everyday", g: ["#8B6DFF", "#4A2CD0", "#1C1060"], num: "4821", holder: "J. SANTOS" },
      { kind: "Travel", g: ["#38D3BE", "#11766C", "#073A35"], num: "0937", holder: "J. SANTOS" },
      { kind: "Business", g: ["#4A4F5E", "#20232C", "#0D0F14"], num: "7714", holder: "SANTOS STUDIO", gold: true },
    ];
    const cs = CARDS.map(() => ({
      x: C(0, P, 0.2),
      y: C(0, P, 0.2),
      z: C(0, P, 0.2),
      rx: C(0, P, 0.0005),
      ry: C(0, P, 0.0005),
      rz: C(0, P, 0.0005),
      tx: C(0, PQ, 0.0005),
      ty: C(0, PQ, 0.0005),
      lift: C(0, PQ, 0.2),
    }));
    const car = C(1, P, 0.001);
    let state = "stack";
    const flipped = new Set();
    let hover = -1;
    let drag = null;
    let quads = [];
    const size = () => {
      const cw = Math.min(330, W * 0.42);
      return { cw, ch: cw / 1.586 };
    };
    function targets() {
      const { cw, ch } = size();
      cs.forEach((c, i) => {
        let T;
        if (state === "stack") T = { x: 0, y: -ch * 0.5 + i * ch * 0.36, z: -i * 14, rx: 0.32, ry: 0, rz: 0 };
        else if (state === "fan")
          T = { x: (i - 1) * cw * 0.34, y: ch * 0.12 + Math.abs(i - 1) * ch * 0.1, z: -i * 10, rx: 0.12, ry: 0, rz: (i - 1) * 0.3 };
        else {
          const o = i - car.v;
          const a = clamp(o, -1, 1);
          T = {
            x: a * cw * 0.66 + (o - a) * cw * 0.3,
            y: 0,
            z: Math.abs(a) * 170 + Math.abs(o - a) * 40 - 40,
            rx: 0,
            ry: -a * 0.95,
            rz: 0,
          };
        }
        if (flipped.has(i)) T.ry += Math.PI;
        for (const k in T) go(c[k], T[k]);
        go(c.lift, hover === i ? 24 : 0);
      });
    }
    const rot = (p, c) => {
      let [x, y, z] = p;
      const rz = c.rz.v;
      const rx = c.rx.v + c.ty.v;
      const ry = c.ry.v + c.tx.v;
      [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
      [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
      [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
      return [x + c.x.v, y + c.y.v, z + c.z.v - c.lift.v];
    };
    const pr = ([x, y, z]) => {
      const f = 1100 / (1100 + z);
      return [W / 2 + x * f, H * 0.5 + y * f];
    };
    function face(card, w, h, front, c) {
      const r = w * 0.055;
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, r);
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, card.g[0]);
      g.addColorStop(0.55, card.g[1]);
      g.addColorStop(1, card.g[2]);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.fillStyle = grain;
      ctx.fill();
      ctx.save();
      ctx.clip();
      if (front) {
        ctx.fillStyle = "rgba(255,255,255,.07)";
        ctx.beginPath();
        ctx.ellipse(w * 0.85, h * 0.05, w * 0.55, h * 0.75, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.92)";
        ctx.font = `700 ${w * 0.058}px ${SANS}`;
        ctx.textBaseline = "alphabetic";
        ctx.textAlign = "left";
        ctx.fillText("Ledger Lane", w * 0.075, h * 0.17);
        ctx.font = `500 ${w * 0.04}px ${SANS}`;
        ctx.textAlign = "right";
        ctx.fillStyle = "rgba(255,255,255,.7)";
        ctx.fillText(card.kind, w * 0.925, h * 0.17);
        const chip = ctx.createLinearGradient(w * 0.08, h * 0.36, w * 0.21, h * 0.53);
        chip.addColorStop(0, "#F6DFA0");
        chip.addColorStop(0.5, "#C9A04E");
        chip.addColorStop(1, "#F1D58A");
        ctx.fillStyle = chip;
        ctx.beginPath();
        ctx.roundRect(w * 0.08, h * 0.36, w * 0.13, h * 0.17, w * 0.018);
        ctx.fill();
        ctx.strokeStyle = "rgba(90,60,10,.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w * 0.08, h * 0.445);
        ctx.lineTo(w * 0.21, h * 0.445);
        ctx.moveTo(w * 0.145, h * 0.36);
        ctx.lineTo(w * 0.145, h * 0.53);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,.65)";
        ctx.lineWidth = w * 0.007;
        ctx.lineCap = "round";
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(w * 0.25, h * 0.445, w * (0.022 + k * 0.017), -0.7, 0.7);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(255,255,255,.92)";
        ctx.textAlign = "left";
        ctx.font = `500 ${w * 0.056}px ${MONO}`;
        ctx.fillText(`••••  ••••  ••••  ${card.num}`, w * 0.075, h * 0.72);
        ctx.font = `500 ${w * 0.036}px ${SANS}`;
        ctx.fillStyle = "rgba(255,255,255,.75)";
        ctx.fillText(card.holder, w * 0.075, h * 0.88);
        ctx.textAlign = "right";
        ctx.fillStyle = card.gold ? "#F2C27A" : "rgba(255,255,255,.75)";
        ctx.fillText("debit", w * 0.925, h * 0.88);
        // A glare that moves as the card tilts.
        const gx = w * (0.5 + Math.sin(c.ry.v + c.tx.v) * 0.9);
        const gy = h * (0.5 - Math.sin(c.rx.v + c.ty.v) * 1.4);
        const gl = ctx.createRadialGradient(gx, gy, 0, gx, gy, w * 0.75);
        gl.addColorStop(0, "rgba(255,255,255,.22)");
        gl.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gl;
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.fillStyle = "rgba(0,0,0,.75)";
        ctx.fillRect(0, h * 0.12, w, h * 0.19);
        ctx.fillStyle = "rgba(255,255,255,.88)";
        ctx.fillRect(w * 0.075, h * 0.42, w * 0.62, h * 0.13);
        ctx.fillStyle = "#1A1A1A";
        ctx.font = `600 ${w * 0.045}px ${MONO}`;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText("382", w * 0.67, h * 0.485);
        ctx.fillStyle = "rgba(255,255,255,.6)";
        ctx.font = `500 ${w * 0.034}px ${SANS}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText("A sample card for this demo. It is not a real card.", w * 0.075, h * 0.78);
      }
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,.14)";
      ctx.lineWidth = 1 / Math.max(0.3, Math.abs(ctx.getTransform().a / dpr));
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, r);
      ctx.stroke();
    }
    return {
      key: "wallet",
      name: "Wallet",
      states: [
        ["stack", "Wallet", "Cards stacked like a wallet. Point at one and it tilts toward you; click to flip it over."],
        ["fan", "Fan", "The same cards fan out, each on its own spring. Click any card to flip it."],
        ["flow", "Cover flow", "Swipe or flick sideways. How fast you flick decides which card lands in the middle."],
      ],
      set(k) {
        state = k;
        flipped.clear();
        targets();
      },
      step(dt) {
        car.step(dt);
        if (state === "flow") targets();
        for (const c of cs) for (const ch of Object.values(c)) ch.step(dt);
      },
      draw() {
        glow(W / 2, H * 0.55, Math.min(W, H) * 0.7, "124,92,255", 0.14);
        const { cw, ch } = size();
        const order = cs.map((c, i) => i).sort((a, b) => cs[b].z.v - cs[b].lift.v - (cs[a].z.v - cs[a].lift.v));
        quads = [];
        for (const i of order) {
          const c = cs[i];
          const L = [
            [-cw / 2, -ch / 2, 0],
            [cw / 2, -ch / 2, 0],
            [-cw / 2, ch / 2, 0],
            [cw / 2, ch / 2, 0],
          ].map((p) => pr(rot(p, c)));
          const [TL, TR, BL, BR] = L;
          quads.push([i, [TL, TR, BR, BL]]);
          let a = [(TR[0] - TL[0]) / cw, (TR[1] - TL[1]) / cw];
          let b = [(BL[0] - TL[0]) / ch, (BL[1] - TL[1]) / ch];
          let o = TL;
          let front = true;
          if (a[0] * b[1] - a[1] * b[0] < 0) {
            a = [(TL[0] - TR[0]) / cw, (TL[1] - TR[1]) / cw];
            b = [(BR[0] - TR[0]) / ch, (BR[1] - TR[1]) / ch];
            o = TR;
            front = false;
          }
          ctx.setTransform(dpr * a[0], dpr * a[1], dpr * b[0], dpr * b[1], dpr * o[0], dpr * o[1]);
          ctx.shadowColor = "rgba(0,0,0,.5)";
          ctx.shadowBlur = (24 + c.lift.v) * dpr;
          ctx.shadowOffsetY = (14 + c.lift.v * 0.6) * dpr;
          ctx.beginPath();
          ctx.roundRect(0, 0, cw, ch, cw * 0.055);
          ctx.fillStyle = "#000";
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;
          face(CARDS[i], cw, ch, front, c);
          resetT();
        }
      },
      hitTest(x, y) {
        for (let k = quads.length - 1; k >= 0; k--) {
          const [i, q] = quads[k];
          let inside = false;
          for (let a = 0, b = 3; a < 4; b = a++) {
            const [xi, yi] = q[a];
            const [xj, yj] = q[b];
            if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
          }
          if (inside) return i;
        }
        return -1;
      },
      down(x, y) {
        drag = { x0: x, y0: y, car0: car.v, s: [{ t: performance.now(), y: x }], moved: false };
      },
      move(x, y) {
        if (drag) {
          if (Math.abs(x - drag.x0) > 10) drag.moved = true;
          if (drag.moved && state === "flow") {
            car.held = true;
            car.v = drag.car0 - (x - drag.x0) / (size().cw * 0.66);
            drag.s.push({ t: performance.now(), y: x });
            while (drag.s.length > 2 && drag.s[drag.s.length - 1].t - drag.s[0].t > 100) drag.s.shift();
          }
          return;
        }
        const h = this.hitTest(x, y);
        if (h !== hover) {
          hover = h;
          targets();
        }
        cs.forEach((c, i) => {
          if (i === hover) {
            const [cx, cy] = pr([c.x.v, c.y.v, c.z.v]);
            const { cw, ch } = size();
            go(c.tx, clamp((x - cx) / cw, -0.6, 0.6) * 0.35);
            go(c.ty, clamp((y - cy) / ch, -0.6, 0.6) * -0.35);
          } else {
            go(c.tx, 0);
            go(c.ty, 0);
          }
        });
      },
      up(x, y) {
        if (!drag) return;
        if (drag.moved && state === "flow") {
          const unit = size().cw * 0.66;
          const v = -velocity(drag.s) / unit;
          car.held = false;
          car.vel = v;
          go(car, clamp(Math.round(car.v + project(v * 1000) / 1000), 0, 2));
        } else if (!drag.moved) {
          const h = this.hitTest(x, y);
          if (h >= 0) {
            if (state === "flow" && Math.round(car.v) !== h) go(car, h);
            else if (flipped.has(h)) flipped.delete(h);
            else flipped.add(h);
            targets();
          }
        }
        drag = null;
      },
      leave() {
        hover = -1;
        cs.forEach((c) => {
          go(c.tx, 0);
          go(c.ty, 0);
        });
        targets();
      },
      cursor: () => (drag && state === "flow" ? "grabbing" : hover >= 0 ? "pointer" : state === "flow" ? "grab" : "default"),
      hint: () => null,
    };
  })();

  /* ---------- 3. Voxels: cubes that rebuild into the next shape ---------- */
  const Voxels = (() => {
    const BM = {
      heart: [".XX...XX.", "XXXX.XXXX", "XXXXXXXXX", "XXXXXXXXX", ".XXXXXXX.", "..XXXXX..", "...XXX...", "....X...."],
      star: ["....X....", "....X....", "...XXX...", "XXXXXXXXX", ".XXXXXXX.", "..XXXXX..", "..XX.XX..", ".XX...XX."],
      check: ["........X", ".......XX", "......XX.", "X....XX..", "XX..XX...", ".XXXX....", "..XX....."],
      cloud: ["...XXX...", "..XXXXX..", ".XXXXXXXX", "XXXXXXXXX", "XXXXXXXXX", ".XXXXXXX."],
    };
    const COL = { heart: [255, 92, 128], star: [255, 196, 72], check: [62, 220, 150], cloud: [130, 185, 255], bars: [140, 120, 255] };
    const fromBM = (rows) => {
      const out = [];
      const n = rows.length;
      rows.forEach((row, r) =>
        [...row].forEach((ch, c) => {
          if (ch === "X") for (let d = 0; d < 2; d++) out.push([c - 4, d - 0.5, n - 1 - r]);
        }),
      );
      return out;
    };
    const SHAPES = {
      heart: fromBM(BM.heart),
      star: fromBM(BM.star),
      check: fromBM(BM.check),
      cloud: fromBM(BM.cloud),
      bars: (() => {
        const hs = [3, 5, 4, 7, 6, 8];
        const out = [];
        hs.forEach((h, i) => {
          for (let z = 0; z < h; z++) for (let d = 0; d < 2; d++) out.push([i * 1.5 - 3.75, d - 0.5, z]);
        });
        return out;
      })(),
    };
    const N = Math.max(...Object.values(SHAPES).map((s) => s.length));
    const PV = { duration: 0.75, bounce: 0.28 };
    const cubes = Array.from({ length: N }, (_, i) => {
      const [x, y, z] = SHAPES.heart[i] || [0, 0, 0];
      return {
        x: C(x, PV, 0.01),
        y: C(y, PV, 0.01),
        z: C(z, PV, 0.01),
        s: C(SHAPES.heart[i] ? 1 : 0, PV, 0.005),
        lift: C(0, PQ, 0.01),
        r: C(255, P, 0.5),
        g: C(92, P, 0.5),
        b: C(128, P, 0.5),
      };
    });
    let state = "heart";
    let centers = [];
    const unit = () => Math.min(W, H) / 22;
    const proj = (x, y, z) => {
      const u = unit();
      return [W / 2 + (x - y) * u * 0.866, H * 0.58 + (x + y) * u * 0.5 - (z - 3.5) * u];
    };
    return {
      key: "voxels",
      name: "Voxels",
      states: [
        ["heart", "Heart", "Each cube finds the nearest spot in the next shape, so nothing travels further than it has to."],
        ["star", "Star", "Spare cubes shrink away; missing ones grow in where they are needed."],
        ["check", "Check", "Cubes settle from the bottom up, each on its own spring."],
        ["cloud", "Cloud", "Move your pointer over the cubes to push them up."],
        ["bars", "Bar chart", "The same cubes can be data: six bars, built from the shape before."],
      ],
      set(k) {
        state = k;
        const slots = SHAPES[k];
        const col = COL[k];
        // Closest pairs first: each cube takes the nearest free spot in the new shape.
        const pairs = [];
        cubes.forEach((c, i) =>
          slots.forEach((sl, j) => {
            const dx = c.x.v - sl[0];
            const dy = c.y.v - sl[1];
            const dz = c.z.v - sl[2];
            pairs.push([dx * dx + dy * dy + dz * dz + (c.s.v < 0.5 ? 6 : 0), i, j]);
          }),
        );
        pairs.sort((a, b) => a[0] - b[0]);
        const ui = new Set();
        const uj = new Set();
        for (const [, i, j] of pairs) {
          if (ui.has(i) || uj.has(j)) continue;
          ui.add(i);
          uj.add(j);
          const c = cubes[i];
          const sl = slots[j];
          const delay = reduced ? 0 : sl[2] * 0.035 + Math.random() * 0.05;
          for (const [k2, v] of [
            ["x", sl[0]],
            ["y", sl[1]],
            ["z", sl[2]],
            ["s", 1],
          ]) {
            c[k2].delay = delay;
            go(c[k2], v);
          }
          const shade = 0.9 + 0.1 * (sl[2] / 8);
          go(c.r, col[0] * shade);
          go(c.g, col[1] * shade);
          go(c.b, col[2] * shade);
        }
        cubes.forEach((c, i) => {
          if (!ui.has(i)) {
            c.s.delay = 0;
            go(c.s, 0);
          }
        });
      },
      step(dt) {
        for (const c of cubes) for (const ch of Object.values(c)) ch.step(dt);
      },
      draw() {
        const col = COL[state];
        glow(W / 2, H * 0.5, Math.min(W, H) * 0.6, col.join(","), 0.12);
        const u = unit();
        const [sx, sy] = proj(0, 0, -0.5);
        resetT();
        ctx.fillStyle = "rgba(0,0,0,.35)";
        ctx.beginPath();
        ctx.ellipse(sx, sy + u * 0.4, u * 5.5, u * 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        const order = cubes
          .filter((c) => c.s.v > 0.02)
          .sort((a, b) => a.x.v + a.y.v + a.z.v + a.lift.v - (b.x.v + b.y.v + b.z.v + b.lift.v));
        centers = [];
        for (const c of order) {
          const h = 0.5 * c.s.v * 0.96;
          const x = c.x.v;
          const y = c.y.v;
          const z = c.z.v + c.lift.v;
          const P3 = (dx, dy, dz) => proj(x + dx, y + dy, z + dz);
          const poly = (points, fill) => {
            ctx.beginPath();
            points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
            ctx.closePath();
            ctx.fillStyle = fill;
            ctx.fill();
          };
          const rgb = (k) => `rgb(${clamp(c.r.v * k, 0, 255) | 0},${clamp(c.g.v * k, 0, 255) | 0},${clamp(c.b.v * k, 0, 255) | 0})`;
          poly([P3(h, -h, -h), P3(h, h, -h), P3(h, h, h), P3(h, -h, h)], rgb(0.72));
          poly([P3(-h, h, -h), P3(h, h, -h), P3(h, h, h), P3(-h, h, h)], rgb(0.55));
          poly([P3(-h, -h, h), P3(h, -h, h), P3(h, h, h), P3(-h, h, h)], rgb(1.12));
          ctx.strokeStyle = "rgba(255,255,255,.12)";
          ctx.lineWidth = 0.6;
          ctx.stroke();
          centers.push([c, ...P3(0, 0, h)]);
        }
      },
      move(x, y) {
        const u = unit();
        for (const [c, cx, cy] of centers) {
          const d = Math.hypot(cx - x, cy - y);
          go(c.lift, Math.max(0, 1 - d / (u * 2.6)) * 0.9);
        }
      },
      leave() {
        for (const c of cubes) go(c.lift, 0);
      },
      down() {},
      up() {},
      cursor: () => "default",
      hint: () => null,
    };
  })();

  /* ---------- 4. Layers: an app screen pulled apart ---------- */
  const Layers = (() => {
    const L = [
      { name: "Background", desc: "The canvas every screen sits on, with the rounded corners of the device.", box: [-160, -320, 320, 640] },
      { name: "Header", desc: "Greeting, date and avatar. Text that updates every morning.", box: [-140, -292, 280, 64] },
      { name: "Summary card", desc: "Activity rings and today's numbers, drawn from live data.", box: [-140, -214, 280, 190] },
      { name: "List", desc: "Three rows from the design system, reused on every screen.", box: [-140, -8, 280, 220] },
      { name: "Floating chrome", desc: "The tab bar and a toast. They sit on top of everything else.", box: [-140, 226, 280, 86] },
    ];
    const s = { yaw: C(0, P, 0.0005), pitch: C(0, P, 0.0005), zoom: C(1, P, 0.001), ex: C(0, P, 0.002), peel: C(0, P, 0.002) };
    const lc = L.map(() => ({ lift: C(0, PQ, 0.2), glow: C(0, PQ, 0.005) }));
    let hover = -1;
    let M = null;
    const camera = () => {
      const yaw = s.yaw.v;
      const pitch = s.pitch.v;
      const sc = (Math.min(W, H) / 800) * s.zoom.v;
      M = {
        cs: Math.cos(yaw),
        sn: Math.sin(yaw),
        cp: Math.cos(pitch),
        sp: Math.sin(pitch),
        s: sc,
        ox: W / 2,
        oy: H * (0.5 + 0.17 * s.ex.v + 0.1 * s.peel.v),
      };
    };
    const zOf = (i) => i * 115 * s.ex.v + i * 22 * s.peel.v + lc[i].lift.v;
    const xOf = (i) => (i - 2) * 95 * s.peel.v;
    const setPlane = (z, dx) => {
      const m = M;
      ctx.setTransform(
        dpr * m.s * m.cs,
        dpr * m.s * m.sn * m.cp,
        -dpr * m.s * m.sn,
        dpr * m.s * m.cs * m.cp,
        dpr * (m.ox + m.s * m.cs * dx),
        dpr * (m.oy + m.s * (m.cp * m.sn * dx - z * m.sp)),
      );
    };
    const proj = (x, y, z) => [M.ox + M.s * (M.cs * x - M.sn * y), M.oy + M.s * (M.cp * (M.sn * x + M.cs * y) - M.sp * z)];
    const rr = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    };
    const text = (str, x, y, font, col, align = "left") => {
      ctx.font = font;
      ctx.fillStyle = col;
      ctx.textAlign = align;
      ctx.textBaseline = "middle";
      ctx.fillText(str, x, y);
    };
    const DRAW = [
      () => {
        rr(-160, -320, 320, 640, 44);
        const g = ctx.createLinearGradient(0, -320, 0, 320);
        g.addColorStop(0, "#F5F6FB");
        g.addColorStop(1, "#E7EAF3");
        ctx.fillStyle = g;
        ctx.fill();
      },
      () => {
        text("Thursday 8 October", -140, -278, `500 13px ${SANS}`, "#6B7183");
        text("Good morning", -140, -250, `700 26px ${SANS}`, "#12162A");
        ctx.beginPath();
        ctx.arc(120, -262, 18, 0, Math.PI * 2);
        const g = ctx.createLinearGradient(100, -280, 140, -244);
        g.addColorStop(0, "#FFB36B");
        g.addColorStop(1, "#FF5E7E");
        ctx.fillStyle = g;
        ctx.fill();
      },
      () => {
        rr(-140, -214, 280, 190, 26);
        ctx.fillStyle = "#151A2E";
        ctx.fill();
        [
          ["#FF5E7E", 54, 0.82],
          ["#3EDC96", 41, 0.64],
          ["#5AB8FF", 28, 0.9],
        ].forEach(([c, r, p]) => {
          ctx.lineWidth = 10;
          ctx.lineCap = "round";
          ctx.strokeStyle = "rgba(255,255,255,.08)";
          ctx.beginPath();
          ctx.arc(-62, -119, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = c;
          ctx.beginPath();
          ctx.arc(-62, -119, r, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
          ctx.stroke();
        });
        [
          ["Move", "410 / 500", "#FF5E7E"],
          ["Exercise", "19 / 30 min", "#3EDC96"],
          ["Stand", "9 / 10 hr", "#5AB8FF"],
        ].forEach(([a, b, c], i) => {
          text(a, 12, -168 + i * 46, `600 12px ${SANS}`, c);
          text(b, 12, -150 + i * 46, `700 16px ${SANS}`, "#FFFFFF");
        });
      },
      () => {
        [
          ["Morning run", "5.2 km, 28 min", "#FF5E7E"],
          ["Lunch walk", "2,140 steps", "#3EDC96"],
          ["Yoga", "Booked for 6 pm", "#5AB8FF"],
        ].forEach(([a, b, c], i) => {
          const y = -8 + i * 76;
          rr(-140, y, 280, 64, 18);
          ctx.shadowColor = "rgba(20,30,60,.12)";
          ctx.shadowBlur = 12 * dpr * M.s;
          ctx.shadowOffsetY = 4 * dpr * M.s;
          ctx.fillStyle = "#FFFFFF";
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;
          rr(-126, y + 14, 36, 36, 11);
          ctx.fillStyle = c;
          ctx.fill();
          text(a, -78, y + 24, `600 15px ${SANS}`, "#12162A");
          text(b, -78, y + 43, `400 13px ${SANS}`, "#6B7183");
        });
      },
      () => {
        rr(-140, 226, 280, 36, 18);
        ctx.fillStyle = "#12162A";
        ctx.fill();
        text("✓  Workout saved", 0, 244, `600 13px ${SANS}`, "#FFFFFF", "center");
        rr(-140, 272, 280, 40, 20);
        ctx.fillStyle = "rgba(255,255,255,.92)";
        ctx.fill();
        ctx.strokeStyle = "rgba(18,22,42,.08)";
        ctx.lineWidth = 1;
        ctx.stroke();
        [-90, -30, 30, 90].forEach((x, i) => {
          ctx.beginPath();
          ctx.arc(x, 292, 6, 0, Math.PI * 2);
          ctx.fillStyle = i === 0 ? "#3050F0" : "#B4B9C8";
          ctx.fill();
        });
      },
    ];
    const layers = {
      key: "layers",
      name: "Layers",
      states: [
        ["screen", "Screen", "A finished app screen, drawn on canvas. Press Exploded to see how it is built."],
        ["explode", "Exploded", "Five layers pulled apart. Point at one to lift it and read what it is."],
        ["peel", "Peeled", "The layers slide out like a deck of cards, still in order."],
      ],
      set(k) {
        const T = {
          screen: { yaw: 0, pitch: 0, zoom: 1.05, ex: 0, peel: 0 },
          explode: { yaw: 40 * D, pitch: 60 * D, zoom: 0.66, ex: 1, peel: 0 },
          peel: { yaw: 28 * D, pitch: 60 * D, zoom: 0.85, ex: 0, peel: 1 },
        }[k];
        for (const key in T) go(s[key], T[key]);
      },
      step(dt) {
        for (const c of Object.values(s)) c.step(dt);
        for (const c of lc) {
          c.lift.step(dt);
          c.glow.step(dt);
        }
      },
      draw() {
        glow(W / 2, H * 0.5, Math.min(W, H) * 0.7, "90,140,255", 0.12);
        camera();
        const sep = Math.max(s.ex.v, s.peel.v);
        L.forEach((l, i) => {
          const z = zOf(i);
          const dx = xOf(i);
          ctx.globalAlpha = 1;
          if (i > 0 && sep > 0.02) {
            setPlane(z, dx);
            rr(-160, -320, 320, 640, 44);
            ctx.fillStyle = `rgba(150,170,255,${(0.05 + 0.07 * lc[i].glow.v) * sep})`;
            ctx.fill();
            resetT();
            ctx.strokeStyle = `rgba(160,180,255,${(0.28 + 0.6 * lc[i].glow.v) * sep})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          setPlane(z, dx);
          DRAW[i]();
          if (sep > 0.05) {
            resetT();
            const [tx, ty] = proj(160 + dx, 0, z);
            ctx.globalAlpha = sep;
            text(l.name, tx + 14, ty, `600 12.5px ${SANS}`, lc[i].glow.v > 0.5 ? "#FFFFFF" : "rgba(200,210,255,.75)");
            ctx.fillStyle = "rgba(200,210,255,.6)";
            ctx.fillRect(tx + 2, ty - 0.5, 8, 1);
            ctx.globalAlpha = 1;
          }
          resetT();
        });
      },
      move(x, y) {
        if (Math.max(s.ex.target, s.peel.target) < 0.5) {
          if (hover !== -1) {
            hover = -1;
            layers.emph();
          }
          return;
        }
        camera();
        let h = -1;
        for (let i = L.length - 1; i >= 0; i--) {
          const [bx, by, bw, bh] = L[i].box;
          setPlane(zOf(i), xOf(i));
          rr(bx, by, bw, bh, 20);
          if (ctx.isPointInPath(x * dpr, y * dpr)) {
            h = i;
            break;
          }
        }
        resetT();
        if (h !== hover) {
          hover = h;
          layers.emph();
        }
      },
      emph() {
        lc.forEach((c, i) => {
          go(c.lift, i === hover ? 30 : 0);
          go(c.glow, i === hover ? 1 : 0);
        });
      },
      leave() {
        hover = -1;
        layers.emph();
      },
      down() {},
      up() {},
      cursor: () => (hover >= 0 ? "pointer" : "default"),
      hint: () => (hover >= 0 ? { title: `Layer ${hover + 1} of 5: ${L[hover].name}.`, body: L[hover].desc } : null),
    };
    return layers;
  })();

  /* ---------- Switching between them, with a crossfade ---------- */
  // The wallet now lives in the Wallet app example, built from HTML with Root, Text and Icon.
  const KINDS = [Globe, Voxels, Layers];
  let cur = null;
  let prev = null;
  let curState = "";
  const fade = C(1, { duration: 0.45, bounce: 0 }, 0.003);

  function caption() {
    const hint = cur.hint();
    const st = cur.states.find((q) => q[0] === curState);
    onCaption?.(hint ?? { title: `${st[1]}.`, body: st[2] });
  }
  function settle() {
    for (let i = 0; i < 240; i++) cur.step(1 / 60);
  }
  function setKind(k) {
    const next = KINDS.find((q) => q.key === k);
    if (!next || next === cur) return;
    prev = cur;
    cur = next;
    fade.v = prev ? 0 : 1;
    go(fade, 1);
    setState(cur.states[0][0], !prev);
  }
  function setState(k, instant) {
    curState = k;
    cur.set(k);
    caption();
    if (instant || reduced) settle();
    start();
  }
  function renderTo(r) {
    ctx = offCtx;
    resetT();
    ctx.clearRect(0, 0, W, H);
    r.draw();
    resetT();
    ctx = main;
  }
  function draw() {
    if (!W || !cur) return;
    const f = clamp(fade.v, 0, 1);
    if (prev && f < 1) {
      main.setTransform(1, 0, 0, 1, 0, 0);
      main.clearRect(0, 0, canvas.width, canvas.height);
      renderTo(prev);
      main.globalAlpha = 1 - f;
      main.drawImage(off, 0, 0);
      renderTo(cur);
      main.globalAlpha = f;
      main.drawImage(off, 0, 0);
      main.globalAlpha = 1;
    } else {
      ctx = main;
      resetT();
      ctx.clearRect(0, 0, W, H);
      cur.draw();
      ctx.globalAlpha = 1;
      resetT();
    }
  }
  function tick(dt) {
    if (destroyed) return false;
    t += dt;
    fade.step(dt);
    cur.step(dt);
    if (prev) {
      prev.step(dt);
      if (fade.settled) prev = null;
    }
    draw();
    if (!visible) {
      stop = null;
      return false;
    }
    return true;
  }
  function start() {
    if (stop || destroyed) return;
    if (reduced) {
      draw();
      return;
    }
    stop = frames(tick);
  }

  // Pointer positions in the canvas's own pixels, even when a parent scales it with CSS.
  const local = (e) => {
    const r = canvas.getBoundingClientRect();
    const sx = r.width ? canvas.clientWidth / r.width : 1;
    const sy = r.height ? canvas.clientHeight / r.height : 1;
    return [(e.clientX - r.left) * sx, (e.clientY - r.top) * sy];
  };
  const onDown = (e) => {
    canvas.setPointerCapture?.(e.pointerId);
    const [x, y] = local(e);
    cur.down(x, y);
    canvas.style.cursor = cur.cursor();
    start();
  };
  const onMove = (e) => {
    const [x, y] = local(e);
    cur.move(x, y);
    canvas.style.cursor = cur.cursor();
    caption();
    start();
  };
  const onUp = (e) => {
    const [x, y] = local(e);
    cur.up(x, y);
    canvas.style.cursor = cur.cursor();
    start();
  };
  const onLeave = () => {
    cur.leave();
    caption();
    start();
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);

  const resizer = new ResizeObserver(() => {
    // The layout size, not the on-screen one, so a CSS-scaled parent doesn't shrink the drawing.
    dpr = Math.min(2, devicePixelRatio || 1);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = off.width = Math.round(W * dpr);
    canvas.height = off.height = Math.round(H * dpr);
    if (!cur) setKind("globe");
    else cur.set(curState);
    draw();
    start();
  });
  resizer.observe(canvas);
  const watcher = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) start();
  });
  watcher.observe(canvas);

  return {
    kinds: KINDS.map((k) => ({ key: k.key, name: k.name, states: k.states.map(([key, label]) => ({ key, label })) })),
    setKind,
    setState,
    destroy() {
      destroyed = true;
      stop?.();
      resizer.disconnect();
      watcher.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
    },
  };
}
