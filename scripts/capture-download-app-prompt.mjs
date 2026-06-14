import { mkdir } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const outputPath = process.argv[2] ?? "artifacts/download-app-prompt.png";
const width = 390;
const height = 844;

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const notificationTitle = "Download the AquaSmart mobile app";

const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="390" y2="844" gradientUnits="userSpaceOnUse">
      <stop stop-color="#ECFDF5"/>
      <stop offset="0.58" stop-color="#F8FAFC"/>
      <stop offset="1" stop-color="#E0F2FE"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#0F172A" flood-opacity="0.20"/>
    </filter>
  </defs>

  <rect width="390" height="844" fill="url(#bg)"/>
  <rect x="18" y="44" width="354" height="52" rx="18" fill="#FFFFFF" opacity="0.88"/>
  <circle cx="47" cy="70" r="16" fill="#0EA5A4"/>
  <path d="M40 70c7-8 15-8 23 0-8 8-16 8-23 0Z" fill="#FFFFFF"/>
  <text x="75" y="68" fill="#0F172A" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="700">AquaSmart</text>
  <text x="75" y="85" fill="#64748B" font-family="Inter, Arial, sans-serif" font-size="11">Smart Fish Farm</text>

  <rect x="18" y="128" width="354" height="114" rx="24" fill="#FFFFFF" opacity="0.78"/>
  <text x="38" y="164" fill="#0F172A" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="800">Farm dashboard</text>
  <text x="38" y="191" fill="#64748B" font-family="Inter, Arial, sans-serif" font-size="13">Live water, feeding, and farm alerts.</text>
  <rect x="38" y="208" width="82" height="12" rx="6" fill="#14B8A6" opacity="0.75"/>
  <rect x="132" y="208" width="58" height="12" rx="6" fill="#38BDF8" opacity="0.65"/>
  <rect x="202" y="208" width="118" height="12" rx="6" fill="#CBD5E1" opacity="0.80"/>

  <rect x="18" y="272" width="164" height="120" rx="22" fill="#FFFFFF" opacity="0.68"/>
  <rect x="208" y="272" width="164" height="120" rx="22" fill="#FFFFFF" opacity="0.68"/>
  <rect x="18" y="416" width="354" height="150" rx="24" fill="#FFFFFF" opacity="0.62"/>

  <g filter="url(#shadow)">
    <rect x="12" y="631" width="366" height="192" rx="22" fill="#FFFFFF" stroke="#E2E8F0"/>
  </g>
  <rect x="28" y="650" width="44" height="44" rx="16" fill="#E0F2FE"/>
  <rect x="42" y="658" width="16" height="27" rx="4" stroke="#0284C7" stroke-width="2"/>
  <circle cx="50" cy="680" r="1.7" fill="#0284C7"/>

  <text x="84" y="668" fill="#0F172A" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="800">${escapeHtml(
    notificationTitle,
  )}</text>
  <text x="84" y="693" fill="#64748B" font-family="Inter, Arial, sans-serif" font-size="13">Get faster access to farm alerts, water</text>
  <text x="84" y="712" fill="#64748B" font-family="Inter, Arial, sans-serif" font-size="13">quality updates, and feeding tools from your</text>
  <text x="84" y="731" fill="#64748B" font-family="Inter, Arial, sans-serif" font-size="13">phone.</text>

  <circle cx="350" cy="658" r="13" fill="#F1F5F9"/>
  <path d="M345.5 653.5l9 9m0-9l-9 9" stroke="#64748B" stroke-width="1.8" stroke-linecap="round"/>

  <rect x="84" y="754" width="116" height="38" rx="10" fill="#0F766E"/>
  <path d="M106 767v11m0 0l-5-5m5 5l5-5M98 782h16" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="123" y="777" fill="#FFFFFF" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="700">Download</text>

  <rect x="210" y="754" width="118" height="38" rx="10" fill="#F8FAFC"/>
  <text x="229" y="777" fill="#334155" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="700">Remind later</text>
</svg>`;

await mkdir(path.dirname(outputPath), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(outputPath);
console.log(`Saved mobile app prompt screenshot to ${outputPath}`);
