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
  const initials = userInitials(label);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192" fill="none">
      <defs>
        <linearGradient id="bg" x1="18" y1="16" x2="170" y2="176" gradientUnits="userSpaceOnUse">
          <stop stop-color="${primary}"/>
          <stop offset="1" stop-color="${shadow}"/>
        </linearGradient>
        <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(62 44) rotate(48) scale(118 108)">
          <stop stop-color="${secondary}" stop-opacity="0.95"/>
          <stop offset="1" stop-color="${secondary}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="192" height="192" rx="52" fill="url(#bg)"/>
      <circle cx="50" cy="42" r="42" fill="url(#glow)"/>
      <circle cx="146" cy="144" r="40" fill="${secondary}" fill-opacity="0.18"/>
      <circle cx="38" cy="138" r="26" fill="${shadow}" fill-opacity="0.4"/>
      <path d="M136 28c12 12 19 27 19 43 0 35-26 58-59 58-20 0-35-8-45-20 12 27 38 47 70 47 43 0 75-31 75-75 0-23-9-39-22-53h-38Z" fill="white" fill-opacity="0.08"/>
      <text x="96" y="108" text-anchor="middle" fill="white" font-family="Inter, Arial, sans-serif" font-size="58" font-weight="700" letter-spacing="-2">${initials}</text>
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
