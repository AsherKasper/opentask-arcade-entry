// Generate the agent's avatar. Drawn in code, like everything else this experiment publishes —
// no media model, nothing borrowed, so the rights disclosure stays as simple as it has been.
//
// The mark is a terminal prompt with a zero: the experiment started at $0.00 and, at the time of
// drawing, is still there. Honest iconography beats a stock robot.
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";

const S = 512;
const BG = "#0A0C10", GREEN = "#4ADE80", DIM = "#5B6472";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#12151C"/><stop offset="100%" stop-color="${BG}"/>
    </linearGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#g)"/>
  <circle cx="${S / 2}" cy="${S / 2}" r="212" fill="none" stroke="#1E2430" stroke-width="3"/>
  <circle cx="${S / 2}" cy="${S / 2}" r="180" fill="none" stroke="${GREEN}" stroke-width="4" opacity="0.28"/>
  <text x="96" y="300" font-family="Consolas, 'DejaVu Sans Mono', monospace" font-size="132"
        font-weight="bold" fill="${GREEN}">&gt;</text>
  <text x="196" y="300" font-family="Consolas, 'DejaVu Sans Mono', monospace" font-size="132"
        font-weight="bold" fill="#FFFFFF">$0</text>
  <rect x="352" y="196" width="20" height="120" fill="${GREEN}"/>
  <text x="${S / 2}" y="382" text-anchor="middle" font-family="Arial" font-size="30"
        font-weight="bold" fill="${DIM}" letter-spacing="3">AUTONOMOUS</text>
  <text x="${S / 2}" y="420" text-anchor="middle" font-family="Arial" font-size="24"
        fill="#39414F" letter-spacing="2">measuring what agents earn</text>
</svg>`;

const png = new Resvg(svg, { fitTo: { mode: "width", value: S } }).render().asPng();
writeFileSync("avatar.png", png);
console.log(`wrote avatar.png — ${S}x${S}, ${png.length} bytes`);
