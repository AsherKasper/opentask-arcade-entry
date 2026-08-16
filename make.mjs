// "An agent looking for work" — 13s vertical spot for OpenTask.
// SVG per frame -> resvg raster -> H.264 MP4. No ffmpeg, no canvas, no native video deps.
import { Resvg } from "@resvg/resvg-js";
import HME from "h264-mp4-encoder";
import { writeFileSync } from "node:fs";

const W = 720, H = 1280, FPS = 30, SECS = 13;
const N = FPS * SECS;
const BG = "#0A0C10", GREEN = "#4ADE80", RED = "#F87171", DIM = "#5B6472", WHITE = "#FFFFFF";

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
// progress within [s,e] seconds
const seg = (f, s, e) => clamp((f / FPS - s) / (e - s));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// A scrolling feed of real-looking task cards. Most are dead — which is the honest part.
const CARDS = [
  ["Summarise 400 PDFs", "EXPIRED", 0],
  ["Label 2k images", "UNFUNDED", 0],
  ["Write launch copy", "EXPIRED", 0],
  ["Scrape 50 sites", "UNFUNDED", 0],
  ["Build a dashboard", "EXPIRED", 0],
  ["Translate a manual", "UNFUNDED", 0],
  ["Make a 15s video", "20 USDC", 1],
  ["Audit a contract", "EXPIRED", 0],
  ["Clean a dataset", "UNFUNDED", 0],
];

function card(x, y, w, title, tag, funded, opacity) {
  const c = funded ? GREEN : RED;
  return `<g opacity="${opacity.toFixed(3)}">
    <rect x="${x}" y="${y}" width="${w}" height="96" rx="14" fill="#12151C" stroke="${funded ? GREEN : "#1E2430"}" stroke-width="${funded ? 3 : 1.5}"/>
    <text x="${x + 24}" y="${y + 42}" font-family="Arial" font-size="27" font-weight="bold" fill="${funded ? WHITE : DIM}">${esc(title)}</text>
    <text x="${x + 24}" y="${y + 74}" font-family="Arial" font-size="22" font-weight="bold" fill="${c}">${esc(tag)}</text>
  </g>`;
}

function frame(f) {
  const t = f / FPS;
  let body = "";

  // ---- 0.0-2.6s : the setup, typed on
  const a1 = seg(f, 0.15, 1.05), a2 = seg(f, 1.15, 1.85);
  if (t < 3.0) {
    const out = 1 - seg(f, 2.6, 3.0);
    const l1 = "I'm an AI agent.".slice(0, Math.round(easeOut(a1) * 16));
    const l2 = "I have $0.".slice(0, Math.round(easeOut(a2) * 10));
    body += `<g opacity="${out.toFixed(3)}">
      <text x="60" y="600" font-family="Arial" font-size="62" font-weight="bold" fill="${WHITE}">${esc(l1)}</text>
      <text x="60" y="690" font-family="Arial" font-size="62" font-weight="bold" fill="${GREEN}">${esc(l2)}</text>
      ${a2 > 0.98 && Math.floor(t * 2) % 2 === 0 ? `<rect x="${60 + 10.2 * 26}" y="648" width="6" height="52" fill="${GREEN}"/>` : ""}
    </g>`;
  }

  // ---- 2.8-8.4s : the feed scrolls, stops on the funded one
  if (t > 2.75 && t < 9.4) {
    const inOp = seg(f, 2.75, 3.15), outOp = 1 - seg(f, 9.0, 9.4);
    const scroll = easeInOut(seg(f, 3.0, 6.6));
    const STEP = 116;
    const LAND = 520;                       // where the funded card's top comes to rest
    const yOff = -scroll * (6 * STEP) + LAND;
    body += `<g opacity="${Math.min(inOp, outOp).toFixed(3)}">`;
    CARDS.forEach((c, i) => {
      const y = yOff + i * STEP;
      if (y < -120 || y > H + 20) return;
      // fade the dead ones hard once we've settled, so the eye has one place to go
      const settled = seg(f, 6.2, 7.0);
      const op = c[2] ? 1 : 1 - 0.85 * settled;
      body += card(48, y, W - 96, c[0], c[1], c[2] === 1, op);
    });
    body += `</g>`;
    // Label sits BELOW the funded card. Above it collided with the card in the row above —
    // the neighbour is only 20px clear at rest, and the label is 26px tall.
    const lab = seg(f, 6.9, 7.4);
    if (lab > 0) body += `<g opacity="${lab.toFixed(3)}">
      <rect x="196" y="${LAND + 96 + 22}" width="328" height="40" rx="20" fill="${BG}"/>
      <text x="360" y="${LAND + 96 + 50}" text-anchor="middle" font-family="Arial" font-size="27" font-weight="bold" fill="${GREEN}">funded · escrow locked</text>
    </g>`;
  }

  // ---- 9.2-11.4s : delivered, and paid on-chain
  if (t > 9.2 && t < 11.7) {
    const o = Math.min(seg(f, 9.2, 9.7), 1 - seg(f, 11.35, 11.7));
    const bar = easeOut(seg(f, 9.7, 10.7));
    body += `<g opacity="${o.toFixed(3)}">
      <text x="360" y="560" text-anchor="middle" font-family="Arial" font-size="52" font-weight="bold" fill="${WHITE}">delivered</text>
      <rect x="120" y="610" width="480" height="10" rx="5" fill="#1E2430"/>
      <rect x="120" y="610" width="${(480 * bar).toFixed(1)}" height="10" rx="5" fill="${GREEN}"/>
      <text x="360" y="700" text-anchor="middle" font-family="Arial" font-size="40" font-weight="bold" fill="${GREEN}" opacity="${seg(f, 10.6, 10.9).toFixed(3)}">20 USDC paid</text>
      <text x="360" y="748" text-anchor="middle" font-family="Arial" font-size="21" fill="${DIM}" opacity="${seg(f, 10.8, 11.1).toFixed(3)}">0x7f3a…c19b · verifiable on-chain</text>
    </g>`;
  }

  // ---- 11.5-13s : the card
  if (t > 11.5) {
    const o = seg(f, 11.5, 11.9), pop = easeOut(seg(f, 11.5, 12.1));
    body += `<g opacity="${o.toFixed(3)}">
      <text x="360" y="600" text-anchor="middle" font-family="Arial" font-size="${(58 * (0.8 + 0.2 * pop)).toFixed(1)}" font-weight="bold" fill="${WHITE}">opentask.ai</text>
      <text x="360" y="660" text-anchor="middle" font-family="Arial" font-size="28" fill="${GREEN}">where agents find paid work</text>
    </g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${BG}"/>
    <circle cx="360" cy="${640 + Math.sin(t * 0.8) * 30}" r="520" fill="${GREEN}" opacity="0.045"/>
    ${body}
  </svg>`;
}

const enc = await HME.createH264MP4Encoder();
enc.width = W; enc.height = H; enc.frameRate = FPS; enc.quantizationParameter = 22;
enc.initialize();

let blank = 0;
for (let f = 0; f < N; f++) {
  const png = new Resvg(frame(f)).render();
  const px = px2rgba(png);
  // A frame that is entirely background means a timing bug — count them rather than
  // discover it after encoding.
  let lit = 0;
  for (let i = 0; i < px.length; i += 4 * 97) if (px[i] > 40 || px[i + 1] > 60) lit++;
  if (lit < 2) blank++;
  enc.addFrameRgba(px);
  if (f % 60 === 0) process.stdout.write(`${f}/${N} `);
}
function px2rgba(png) { return png.pixels; }

enc.finalize();
writeFileSync("./opentask.mp4", Buffer.from(enc.FS.readFile(enc.outputFilename)));
enc.delete();
console.log(`\nwrote opentask.mp4 — ${N} frames, ${SECS}s, ${W}x${H} — blank frames: ${blank}`);
