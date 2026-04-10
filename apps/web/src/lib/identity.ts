const palette = [
  { base: "#5b8cff", accent: "#9ec5ff", glow: "#7ee7ff", shadow: "#101828" },
  { base: "#7c3aed", accent: "#c4b5fd", glow: "#f0abfc", shadow: "#1f133f" },
  { base: "#0f766e", accent: "#5eead4", glow: "#99f6e4", shadow: "#0b2421" },
  { base: "#ea580c", accent: "#fdba74", glow: "#fde68a", shadow: "#34140a" },
  { base: "#db2777", accent: "#f9a8d4", glow: "#fecdd3", shadow: "#351122" },
  { base: "#16a34a", accent: "#86efac", glow: "#bbf7d0", shadow: "#0d2113" }
] as const;

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

function escapeSvgText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
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
  const normalizedSeed = seed.trim().toLowerCase() || label.trim().toLowerCase() || "reef";
  const search = new URLSearchParams({
    seed: normalizedSeed,
    size: "128",
    scale: "90",
    radius: "14",
    backgroundType: "solid",
    backgroundColor: "0f1318,12171d,151a21,171d25",
    rowColor: "60a5fa,38bdf8,818cf8,34d399,a78bfa,f59e0b,fb7185"
  });
  return `https://api.dicebear.com/9.x/identicon/svg?${search.toString()}`;
}

export function buildBannerArt(seed: string, label: string) {
  const theme = paletteFor(seed);
  const safeLabel = escapeSvgText(label);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="360" viewBox="0 0 1200 360" fill="none">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="360" gradientUnits="userSpaceOnUse">
          <stop stop-color="${theme.shadow}"/>
          <stop offset="0.52" stop-color="${theme.base}"/>
          <stop offset="1" stop-color="#1b1f2a"/>
        </linearGradient>
        <radialGradient id="orbA" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(220 140) rotate(24) scale(280 200)">
          <stop stop-color="${theme.accent}" stop-opacity="0.55"/>
          <stop offset="1" stop-color="${theme.accent}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="orbB" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(960 120) rotate(160) scale(320 220)">
          <stop stop-color="${theme.base}" stop-opacity="0.42"/>
          <stop offset="1" stop-color="${theme.base}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="360" fill="url(#bg)"/>
      <ellipse cx="220" cy="138" rx="280" ry="200" fill="url(#orbA)"/>
      <ellipse cx="960" cy="120" rx="320" ry="220" fill="url(#orbB)"/>
      <circle cx="118" cy="280" r="92" fill="white" fill-opacity="0.06"/>
      <circle cx="1054" cy="88" r="84" fill="white" fill-opacity="0.04"/>
      <text x="68" y="104" fill="white" fill-opacity="0.08" font-family="Inter, Arial, sans-serif" font-size="66" font-weight="700">${safeLabel}</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
