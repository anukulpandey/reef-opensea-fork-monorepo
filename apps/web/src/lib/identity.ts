const palette = [
  ["#2081e2", "#6cb5ff", "#0a1f47"],
  ["#7c3aed", "#b794f4", "#21103f"],
  ["#0ea5a4", "#67e8f9", "#0b2233"],
  ["#f97316", "#fdba74", "#3a1406"],
  ["#ef4444", "#fda4af", "#3b0a16"],
  ["#22c55e", "#86efac", "#092516"]
];

function hashSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function paletteFor(seed: string) {
  return palette[hashSeed(seed) % palette.length] ?? palette[0];
}

function createSeededRandom(seed: string) {
  let state = (hashSeed(seed) ^ 0x9e3779b9) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shiftHex(hex: string, amount: number) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return hex;
  }

  const channels = [0, 2, 4].map((offset) => {
    const value = Number.parseInt(normalized.slice(offset, offset + 2), 16);
    const next = Math.max(0, Math.min(255, value + amount));
    return next.toString(16).padStart(2, "0");
  });

  return `#${channels.join("")}`;
}

export function userInitials(value: string) {
  const cleaned = value.trim();
  if (!cleaned) {
    return "?";
  }
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

export function buildAvatarArt(seed: string, label: string) {
  const [primary, secondary, shadow] = paletteFor(seed);
  const rng = createSeededRandom(`${seed}:${label}`);
  const warm = shiftHex(primary, 38);
  const cool = shiftHex(secondary, -12);
  const deep = shiftHex(shadow, -8);
  const shapePalette = [primary, secondary, warm, cool];
  const shellShapes = Array.from({ length: 5 }, (_, index) => {
    const width = 72 + rng() * 72;
    const height = 54 + rng() * 76;
    const x = 96 + (rng() - 0.5) * 58;
    const y = 96 + (rng() - 0.5) * 58;
    const rotation = -42 + rng() * 84;
    const radius = Math.min(width, height) * (0.24 + rng() * 0.16);
    const fill = shapePalette[Math.floor(rng() * shapePalette.length)] ?? primary;
    const opacity = 0.92 - index * 0.1;
    const left = x - width / 2;
    const top = y - height / 2;

    return `<rect x="${left.toFixed(2)}" y="${top.toFixed(2)}" width="${width.toFixed(2)}" height="${height.toFixed(2)}" rx="${radius.toFixed(2)}" fill="${fill}" fill-opacity="${opacity.toFixed(2)}" transform="rotate(${rotation.toFixed(2)} 96 96)" />`;
  }).join("");
  const orbitShapes = Array.from({ length: 3 }, (_, index) => {
    const radius = 14 + rng() * 24;
    const cx = 52 + rng() * 88;
    const cy = 52 + rng() * 88;
    const fills = [warm, "#f8fafc", secondary];
    const fill = fills[index] ?? warm;
    const opacity = index === 1 ? 0.32 : 0.22;
    return `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${radius.toFixed(2)}" fill="${fill}" fill-opacity="${opacity.toFixed(2)}" />`;
  }).join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192" fill="none">
      <defs>
        <linearGradient id="shell" x1="18" y1="12" x2="170" y2="178" gradientUnits="userSpaceOnUse">
          <stop stop-color="${shiftHex(primary, -12)}"/>
          <stop offset="0.55" stop-color="${deep}"/>
          <stop offset="1" stop-color="#0b0f14"/>
        </linearGradient>
        <linearGradient id="field" x1="36" y1="28" x2="156" y2="164" gradientUnits="userSpaceOnUse">
          <stop stop-color="${shiftHex(primary, 18)}"/>
          <stop offset="0.5" stop-color="${secondary}"/>
          <stop offset="1" stop-color="${cool}"/>
        </linearGradient>
        <radialGradient id="highlight" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(66 46) rotate(42) scale(98 88)">
          <stop stop-color="#ffffff" stop-opacity="0.34"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="shadowWash" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(146 150) rotate(145) scale(92 84)">
          <stop stop-color="#020617" stop-opacity="0.34"/>
          <stop offset="1" stop-color="#020617" stop-opacity="0"/>
        </radialGradient>
        <clipPath id="avatarClip">
          <rect x="24" y="24" width="144" height="144" rx="42"/>
        </clipPath>
      </defs>
      <rect width="192" height="192" rx="44" fill="#0d1014"/>
      <rect x="9" y="9" width="174" height="174" rx="38" fill="url(#shell)"/>
      <rect x="9" y="9" width="174" height="174" rx="38" stroke="rgba(255,255,255,0.08)"/>
      <g clip-path="url(#avatarClip)">
        <rect x="24" y="24" width="144" height="144" rx="42" fill="url(#field)"/>
        <rect x="24" y="24" width="144" height="144" rx="42" fill="rgba(7,10,14,0.14)"/>
        ${shellShapes}
        ${orbitShapes}
        <circle cx="96" cy="96" r="26" fill="rgba(255,255,255,0.1)"/>
        <circle cx="96" cy="96" r="14" fill="rgba(255,255,255,0.3)"/>
        <rect x="24" y="24" width="144" height="144" rx="42" fill="url(#highlight)"/>
        <rect x="24" y="24" width="144" height="144" rx="42" fill="url(#shadowWash)"/>
      </g>
      <rect x="24" y="24" width="144" height="144" rx="42" stroke="rgba(255,255,255,0.08)"/>
      <path d="M38 40C54 24 80 18 104 20" stroke="rgba(255,255,255,0.18)" stroke-width="10" stroke-linecap="round"/>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function buildBannerArt(seed: string, label: string) {
  const [primary, secondary, shadow] = paletteFor(seed);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="360" viewBox="0 0 1200 360" fill="none">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="360" gradientUnits="userSpaceOnUse">
          <stop stop-color="${shadow}"/>
          <stop offset="0.52" stop-color="${primary}"/>
          <stop offset="1" stop-color="#1b1f2a"/>
        </linearGradient>
        <radialGradient id="orbA" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(220 140) rotate(24) scale(280 200)">
          <stop stop-color="${secondary}" stop-opacity="0.55"/>
          <stop offset="1" stop-color="${secondary}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="orbB" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(960 120) rotate(160) scale(320 220)">
          <stop stop-color="${primary}" stop-opacity="0.42"/>
          <stop offset="1" stop-color="${primary}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="360" fill="url(#bg)"/>
      <ellipse cx="220" cy="138" rx="280" ry="200" fill="url(#orbA)"/>
      <ellipse cx="960" cy="120" rx="320" ry="220" fill="url(#orbB)"/>
      <circle cx="118" cy="280" r="92" fill="white" fill-opacity="0.06"/>
      <circle cx="1054" cy="88" r="84" fill="white" fill-opacity="0.04"/>
      <text x="68" y="104" fill="white" fill-opacity="0.08" font-family="Inter, Arial, sans-serif" font-size="66" font-weight="700">${label}</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
