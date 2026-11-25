// Draws the sign-in picture (public/photos/signin-network.svg): a network globe with data links over a perspective
// floor. Original artwork made by this script, so there is no photo to license. Run: node scripts/make-signin-art.mjs
import { writeFileSync } from "node:fs";

const W = 1200, H = 1500;
let seed = 11;
const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const f = (n) => n.toFixed(1);
let s = "";

// Globe: a sphere of points; the ones facing us are brighter, and near neighbours are linked.
const CX = 770, CY = 480, R = 360, TILT = -0.38;
const points = [];
const N = 520, golden = Math.PI * (3 - Math.sqrt(5));
for (let i = 0; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), a = golden * i;
  const x = Math.cos(a) * r, z = Math.sin(a) * r;
  const y2 = y * Math.cos(TILT) - z * Math.sin(TILT), z2 = y * Math.sin(TILT) + z * Math.cos(TILT);
  points.push({ x: CX + x * R, y: CY + y2 * R, z: z2 });
}
for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
  const a = points[i], b = points[j];
  const d = Math.hypot(a.x - b.x, a.y - b.y);
  if (d < 52 && Math.abs(a.z - b.z) < 0.25) s += `<path d="M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}" stroke="#4aa8ff" stroke-opacity="${f(0.1 + 0.32 * Math.max(0, (a.z + 1) / 2))}"/>`;
}
for (const p of points) s += `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(1.2 + 2 * Math.max(0, p.z))}" fill="#9fdcff" opacity="${f(0.25 + 0.65 * Math.max(0, (p.z + 1) / 2))}"/>`;
// Latitude rings and two orbits.
for (const k of [-0.66, -0.33, 0, 0.33, 0.66]) {
  const rr = R * Math.sqrt(1 - k * k);
  s += `<ellipse cx="${CX}" cy="${f(CY + k * R * 0.92)}" rx="${f(rr)}" ry="${f(rr * 0.34)}" fill="none" stroke="#3d8bff" stroke-opacity="0.22"/>`;
}
for (const [rx, ry, rot] of [[470, 150, -18], [520, 118, 24]]) s += `<ellipse cx="${CX}" cy="${CY}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${CX} ${CY})" fill="none" stroke="#7fd4ff" stroke-opacity="0.35" stroke-width="1.4" stroke-dasharray="2 9" stroke-linecap="round"/>`;

// Links: bright arcs between points on the globe's face, each ending in a node.
const front = points.filter((p) => p.z > 0.35);
for (let i = 0; i < 16; i++) {
  const a = front[Math.floor(rand() * front.length)], b = front[Math.floor(rand() * front.length)];
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 60 - rand() * 90;
  const color = i % 5 === 0 ? "#ffb35c" : "#62e3ff";
  s += `<path d="M${f(a.x)} ${f(a.y)}Q${f(mx)} ${f(my)} ${f(b.x)} ${f(b.y)}" fill="none" stroke="${color}" stroke-width="1.8" stroke-opacity="0.75"/>`;
  for (const p of [a, b]) s += `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="11" fill="${color}" opacity="0.18"/><circle cx="${f(p.x)}" cy="${f(p.y)}" r="3.6" fill="${color}"/>`;
}

// Data streams flowing from the lower left up into the globe.
for (let i = 0; i < 34; i++) {
  const y0 = 860 + rand() * 520, end = front[Math.floor(rand() * front.length)];
  const color = i % 7 === 0 ? "#ffb35c" : i % 3 === 0 ? "#62e3ff" : "#3d8bff";
  s += `<path d="M-20 ${f(y0)}C${f(220 + rand() * 120)} ${f(y0 - 30)} ${f(330 + rand() * 160)} ${f(end.y + 220)} ${f(end.x)} ${f(end.y)}" fill="none" stroke="${color}" stroke-width="${f(0.7 + rand())}" stroke-opacity="${f(0.16 + rand() * 0.34)}"/>`;
  rand(); rand(); // keeps the rest of the drawing the same
}

// Perspective floor.
const HZ = 1180;
for (let i = -14; i <= 14; i++) s += `<path d="M${f(600 + i * 26)} ${HZ}L${f(600 + i * 190)} ${H}" stroke="#3d8bff" stroke-opacity="0.24"/>`;
for (let k = 1, y = HZ; y < H; k++) { y = HZ + k * k * 6; s += `<path d="M0 ${f(y)}H${W}" stroke="#3d8bff" stroke-opacity="0.2"/>`; }
// Small circuit nodes scattered in the dark.
for (let i = 0; i < 90; i++) {
  const x = rand() * W, y = rand() * HZ, len = 14 + rand() * 60;
  s += `<path d="M${f(x)} ${f(y)}h${f(len)}" stroke="#4aa8ff" stroke-opacity="0.22"/><rect x="${f(x + len)}" y="${f(y - 2.5)}" width="5" height="5" fill="#7fd4ff" opacity="${f(0.2 + rand() * 0.5)}"/>`;
}

writeFileSync(new URL("../public/photos/signin-network.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><rect width="${W}" height="${H}" fill="#06112a"/><circle cx="${CX}" cy="${CY}" r="${R + 90}" fill="#1c5fd1" opacity="0.1"/><circle cx="${CX}" cy="${CY}" r="${R}" fill="#0d2a66" opacity="0.55"/>${s}</svg>`);
console.log("written public/photos/signin-network.svg");
