import fs from "node:fs";
import path from "node:path";

import { config, nodeConfig, publicConfig } from "./config.js";

type MarketplaceStat = {
  label: string;
  value: string;
  change: string;
};

type ThemePalette = {
  accent: string;
  accentSoft: string;
  heroBackground: string;
  panelSurface: string;
  textOnHero: string;
};

type HeroMetric = {
  label: string;
  value: string;
  change?: string;
};

type TableMetrics = {
  floor: string;
  change: string;
  topOffer: string;
  volume: string;
  sales: string;
  owners: string;
  listed?: string;
};

type ProfileSummary = {
  slug: string;
  name: string;
  verified: boolean;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  followers: number;
  following: number;
  items: number;
  volume: string;
};

type CollectionSummary = {
  slug: string;
  name: string;
  creatorSlug: string;
  creatorName: string;
  verified: boolean;
  chain: string;
  category: string;
  description: string;
  avatarUrl: string;
  bannerUrl: string;
  contractAddress: string;
  items: number;
  owners: number;
  floorPriceRaw: string;
  totalVolumeRaw: string;
  listedPercent: number;
  floorDisplay: string;
  volumeDisplay: string;
  stats: MarketplaceStat[];
  featuredImageUrls: string[];
  visualVariant: "punks" | "courtyard" | "ducks" | "generic";
  theme: ThemePalette;
  heroLayout: "carousel" | "collection";
  statsLayout: "overlay" | "right";
  showStickyActionBar: boolean;
  hero: {
    title: string;
    subtitle: string;
    badges: string[];
    metrics: HeroMetric[];
    backgroundUrl: string;
  };
  tableMetrics: TableMetrics;
  actionBar: {
    primary: string;
    secondary: string;
    tertiary: string;
    quaternary?: string;
  };
  badgeText?: string;
};

type ItemTrait = {
  type: string;
  value: string;
  rarity: string;
};

type ItemRecord = {
  id: string;
  contractAddress: string;
  tokenId: string;
  collectionSlug: string;
  collectionName: string;
  name: string;
  description: string;
  imageUrl: string;
  ownerName: string;
  ownerAddress: string;
  creatorName: string;
  creatorAddress: string;
  listed: boolean;
  currentPriceRaw: string;
  lastSaleRaw: string;
  highestOfferRaw: string;
  currentPriceDisplay: string;
  lastSaleDisplay: string;
  highestOfferDisplay: string;
  thumbnailUrls: string[];
  rankDisplay?: string;
  traits: ItemTrait[];
};

type ActivityRecord = {
  id: string;
  type: string;
  collectionSlug: string;
  itemId: string;
  itemName: string;
  from: string;
  to: string;
  priceRaw: string;
  priceDisplay: string;
  ageLabel: string;
};

type TokenRecord = {
  slug: string;
  name: string;
  symbol: string;
  chain: string;
  price: string;
  volume24h: string;
  marketCap: string;
  holders: string;
  change: string;
  iconUrl: string;
};

type DropRecord = {
  slug: string;
  name: string;
  creatorName: string;
  creatorSlug: string;
  coverUrl: string;
  stage: string;
  mintPrice: string;
  supply: number;
  startLabel: string;
  description: string;
};

type RewardsRecord = {
  totalPoints: string;
  rank: string;
  streak: string;
  tasks: Array<{ title: string; description: string; points: string; state: string }>;
};

type StudioRecord = {
  headline: string;
  subtitle: string;
  quickActions: Array<{ title: string; description: string; state: string }>;
};

type CollectionDetail = {
  collection: CollectionSummary;
  items: ItemRecord[];
  activities: ActivityRecord[];
  holders: Array<ProfileSummary & { quantity: number; share: string }>;
  offers: Array<{ itemId: string; itemName: string; priceDisplay: string; from: string; expiresIn: string }>;
  analytics: Array<{ label: string; value: string; points: number[] }>;
  relatedCollections: CollectionSummary[];
  about: string[];
  traitHighlights: Array<{ type: string; topValues: string[] }>;
};

type MarketplaceDataset = {
  routeMap: Array<{ label: string; href: string; scope: string }>;
  references: Array<{ name: string; path: string; description: string }>;
  profiles: ProfileSummary[];
  collections: CollectionSummary[];
  collectionDetails: Record<string, CollectionDetail>;
  items: ItemRecord[];
  activities: ActivityRecord[];
  tokens: TokenRecord[];
  drops: DropRecord[];
  rewards: RewardsRecord;
  studio: StudioRecord;
};

const flagshipContracts = {
  cryptopunks: "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB",
  "courtyard-io": "0xc0FfEE000000000000000000000000000000C0de",
  "yucky-ducks": nodeConfig.contracts.collection.address || "0x0dD5D0000000000000000000000000000000D15"
};

const genericThemes: ThemePalette[] = [
  {
    accent: "#2081e2",
    accentSoft: "rgba(32,129,226,0.15)",
    heroBackground: "#0f1826",
    panelSurface: "#16181b",
    textOnHero: "#f8fafc"
  },
  {
    accent: "#8b5cf6",
    accentSoft: "rgba(139,92,246,0.15)",
    heroBackground: "#1c1330",
    panelSurface: "#16181b",
    textOnHero: "#f8fafc"
  },
  {
    accent: "#22c55e",
    accentSoft: "rgba(34,197,94,0.15)",
    heroBackground: "#102318",
    panelSurface: "#16181b",
    textOnHero: "#f8fafc"
  }
];

function createSeededRandom(seed: string) {
  let state = 0;
  for (const character of seed) {
    state = (state * 31 + character.charCodeAt(0)) >>> 0;
  }
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pick<T>(random: () => number, values: T[]) {
  return values[Math.floor(random() * values.length)]!;
}

function makeHexAddress(seed: string) {
  let hash = 0n;
  for (const character of seed) {
    hash = (hash * 131n + BigInt(character.charCodeAt(0))) % (1n << 160n);
  }
  return `0x${hash.toString(16).padStart(40, "0")}`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function ethRaw(amount: number) {
  return BigInt(Math.round(amount * 1_000_000)) * 1_000_000_000_000n;
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function percentLabel(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function writeCustomSvg(relativePath: string, svg: string) {
  const absolutePath = path.join(config.storageGeneratedRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, svg, "utf8");
  return `${config.publicStorageBasePath}/generated/${relativePath}`;
}

function buildDarkCardSvg(title: string, subtitle: string, accent: string, wide = false) {
  const width = wide ? 1600 : 900;
  const height = wide ? 520 : 900;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" rx="32" fill="#111315"/>
  <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="28" fill="#16181b" stroke="#2a2f35"/>
  <circle cx="${Math.round(width * 0.82)}" cy="${Math.round(height * 0.2)}" r="${Math.round(height * 0.18)}" fill="${accent}" fill-opacity="0.18"/>
  <circle cx="${Math.round(width * 0.18)}" cy="${Math.round(height * 0.78)}" r="${Math.round(height * 0.16)}" fill="${accent}" fill-opacity="0.14"/>
  <text x="72" y="${wide ? 130 : 170}" fill="#8a939b" font-size="${wide ? 42 : 56}" font-family="Arial, Helvetica, sans-serif">${escapeXml(subtitle)}</text>
  <text x="72" y="${wide ? 240 : 320}" fill="#ffffff" font-size="${wide ? 86 : 118}" font-weight="700" font-family="Arial, Helvetica, sans-serif">${escapeXml(title)}</text>
  <text x="72" y="${wide ? 300 : 392}" fill="#8a939b" font-size="${wide ? 26 : 36}" font-family="Arial, Helvetica, sans-serif">OpenSea dark demo asset</text>
</svg>`;
}

function buildCircleAvatarSvg(label: string, accent: string, ring = "#ffffff") {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
  <rect width="320" height="320" rx="72" fill="#111315"/>
  <circle cx="160" cy="160" r="102" fill="none" stroke="${ring}" stroke-width="24"/>
  <circle cx="160" cy="160" r="78" fill="${accent}"/>
  <text x="160" y="182" text-anchor="middle" fill="#ffffff" font-size="104" font-weight="700" font-family="Arial, Helvetica, sans-serif">${escapeXml(label)}</text>
</svg>`;
}

function rect(x: number, y: number, width: number, height: number, fill: string) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`;
}

function buildPunkSvg({
  background,
  skin,
  hair,
  shirt,
  eye,
  accent
}: {
  background: string;
  skin: string;
  hair: string;
  shirt: string;
  eye: string;
  accent?: string;
}) {
  const px = 18;
  const parts = [
    `<rect width="432" height="432" fill="${background}"/>`,
    rect(px * 6, px * 5, px * 6, px * 1, hair),
    rect(px * 5, px * 6, px * 8, px * 1, hair),
    rect(px * 4, px * 7, px * 9, px * 1, hair),
    rect(px * 4, px * 8, px * 2, px * 5, hair),
    rect(px * 11, px * 8, px * 2, px * 5, hair),
    rect(px * 5, px * 8, px * 6, px * 8, skin),
    rect(px * 4, px * 13, px * 1, px * 3, skin),
    rect(px * 11, px * 13, px * 1, px * 3, skin),
    rect(px * 6, px * 16, px * 1, px * 2, skin),
    rect(px * 9, px * 16, px * 1, px * 2, skin),
    rect(px * 6, px * 18, px * 4, px * 1, shirt),
    rect(px * 7, px * 19, px * 3, px * 1, shirt),
    rect(px * 6, px * 10, px * 1, px * 1, eye),
    rect(px * 9, px * 10, px * 1, px * 1, eye),
    rect(px * 8, px * 13, px * 1, px * 1, eye),
    rect(px * 7, px * 15, px * 3, px * 1, hair)
  ];

  if (accent) {
    parts.push(rect(px * 5, px * 9, px * 1, px * 2, accent));
    parts.push(rect(px * 10, px * 9, px * 1, px * 2, accent));
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432" viewBox="0 0 432 432">
  ${parts.join("\n  ")}
</svg>`;
}

function buildPunksBannerSvg() {
  const columns = Array.from({ length: 42 }, (_, index) => {
    const x = index * 38;
    const height = index % 7 === 0 ? 64 : index % 4 === 0 ? 42 : index % 3 === 0 ? 26 : 18;
    return `<rect x="${x}" y="0" width="32" height="${height}" fill="#9b334f"/>`;
  }).join("\n  ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="520" viewBox="0 0 1600 520">
  <rect width="1600" height="520" fill="#0e1a2c"/>
  ${columns}
</svg>`;
}

function buildYuckyBannerSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="860" viewBox="0 0 1600 860">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5c7069"/>
      <stop offset="100%" stop-color="#2c342f"/>
    </linearGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4a3827"/>
      <stop offset="100%" stop-color="#241a14"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="860" rx="28" fill="url(#sky)"/>
  <ellipse cx="760" cy="750" rx="940" ry="190" fill="url(#ground)"/>
  <rect x="78" y="70" width="120" height="520" rx="50" fill="#3b3222"/>
  <ellipse cx="150" cy="70" rx="150" ry="90" fill="#5f6c47"/>
  <ellipse cx="270" cy="80" rx="120" ry="70" fill="#5b6541"/>
  <text x="708" y="240" text-anchor="middle" fill="rgba(255,255,255,0.55)" font-size="112" font-weight="700" font-family="Arial, Helvetica, sans-serif">THE HANDLE</text>
  <circle cx="470" cy="600" r="82" fill="#8c5b2c"/>
  <circle cx="450" cy="575" r="42" fill="#6f4325"/>
  <circle cx="770" cy="520" r="64" fill="#4f7181"/>
  <circle cx="1260" cy="540" r="74" fill="#a6b2b4"/>
  <circle cx="1342" cy="586" r="56" fill="#93662f"/>
  <circle cx="370" cy="650" r="38" fill="#3f9134"/>
  <circle cx="960" cy="670" r="26" fill="#1f1f1f"/>
  <rect x="0" y="690" width="1600" height="170" fill="rgba(0,0,0,0.25)"/>
</svg>`;
}

function buildCourtyardBannerSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="520" viewBox="0 0 1600 520">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#17304f"/>
      <stop offset="50%" stop-color="#24549a"/>
      <stop offset="100%" stop-color="#1b2f56"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="520" rx="28" fill="url(#g)"/>
  <circle cx="250" cy="265" r="140" fill="none" stroke="#ffffff" stroke-width="34"/>
  <circle cx="250" cy="265" r="102" fill="#2e77df"/>
  <text x="250" y="296" text-anchor="middle" fill="#ffffff" font-size="132" font-weight="700" font-family="Arial, Helvetica, sans-serif">C</text>
  <rect x="700" y="110" width="210" height="300" rx="20" fill="#faf7f2"/>
  <rect x="728" y="140" width="154" height="36" rx="12" fill="#17304f"/>
  <rect x="732" y="200" width="146" height="190" rx="14" fill="#f0dfbb"/>
  <rect x="945" y="150" width="220" height="280" rx="24" fill="#d5dee9" transform="rotate(-6 945 150)"/>
  <rect x="1160" y="170" width="220" height="280" rx="24" fill="#e6eef8" transform="rotate(8 1160 170)"/>
  <text x="700" y="82" fill="#ffffff" font-size="42" font-family="Arial, Helvetica, sans-serif">Courtyard.io</text>
</svg>`;
}

function buildTokenIconSvg(label: string, accent: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <circle cx="80" cy="80" r="74" fill="#16181b" stroke="#2a2f35" stroke-width="8"/>
  <circle cx="80" cy="80" r="56" fill="${accent}"/>
  <text x="80" y="94" text-anchor="middle" fill="#ffffff" font-size="38" font-weight="700" font-family="Arial, Helvetica, sans-serif">${escapeXml(label)}</text>
</svg>`;
}

function makeProfile(
  slug: string,
  name: string,
  accent: string,
  bio: string,
  followers: number,
  volume: string
): ProfileSummary {
  const avatarUrl = writeCustomSvg(`profiles/${slug}.svg`, buildCircleAvatarSvg(name.charAt(0), accent));
  const bannerUrl = writeCustomSvg(
    `profiles/${slug}-banner.svg`,
    buildDarkCardSvg(name, "Profile", accent, true)
  );

  return {
    slug,
    name,
    verified: true,
    bio,
    avatarUrl,
    bannerUrl,
    followers,
    following: Math.round(followers / 9),
    items: Math.round(followers / 3),
    volume
  };
}

function createFlagshipCollections(profiles: ProfileSummary[]) {
  const findProfile = (slug: string) => profiles.find((profile) => profile.slug === slug)!;

  const cryptopunksBanner = writeCustomSvg("collections/cryptopunks-banner.svg", buildPunksBannerSvg());
  const cryptopunksAvatar = writeCustomSvg(
    "collections/cryptopunks-avatar.svg",
    buildPunkSvg({
      background: "#83a0b5",
      skin: "#936037",
      hair: "#0b0c10",
      shirt: "#83a0b5",
      eye: "#1b120d",
      accent: "#d2a66b"
    })
  );
  const courtyardBanner = writeCustomSvg("collections/courtyard-banner.svg", buildCourtyardBannerSvg());
  const courtyardAvatar = writeCustomSvg("collections/courtyard-avatar.svg", buildCircleAvatarSvg("C", "#2e77df"));
  const yuckyBanner = writeCustomSvg("collections/yucky-ducks-banner.svg", buildYuckyBannerSvg());
  const yuckyAvatar = writeCustomSvg("collections/yucky-ducks-avatar.svg", buildCircleAvatarSvg("Y", "#5fbf4a"));

  const collections: CollectionSummary[] = [
    {
      slug: "cryptopunks",
      name: "CryptoPunks",
      creatorSlug: "larva-labs",
      creatorName: findProfile("larva-labs").name,
      verified: true,
      chain: "Ethereum",
      category: "PFPs",
      description: "CryptoPunks launched as one of the earliest collectible pixel-art projects and still anchors the top end of the PFP market.",
      avatarUrl: cryptopunksAvatar,
      bannerUrl: cryptopunksBanner,
      contractAddress: flagshipContracts.cryptopunks,
      items: 9994,
      owners: 3818,
      floorPriceRaw: ethRaw(27.49).toString(),
      totalVolumeRaw: ethRaw(1400000).toString(),
      listedPercent: 1.6,
      floorDisplay: "27.49 ETH",
      volumeDisplay: "1.4M ETH",
      stats: [
        { label: "Floor Price", value: "27.49 ETH", change: "-1.8%" },
        { label: "Top Offer", value: "—", change: "" },
        { label: "Total Volume", value: "1.4M ETH", change: "" }
      ],
      featuredImageUrls: [],
      visualVariant: "punks",
      theme: {
        accent: "#2081e2",
        accentSoft: "rgba(32,129,226,0.12)",
        heroBackground: "#0e1a2c",
        panelSurface: "#16181b",
        textOnHero: "#ffffff"
      },
      heroLayout: "collection",
      statsLayout: "right",
      showStickyActionBar: true,
      hero: {
        title: "CryptoPunks",
        subtitle: "By C352B5",
        badges: ["ETHEREUM", "9,994", "JUN 2017", "PFPs"],
        metrics: [
          { label: "Floor Price", value: "27.49 ETH" },
          { label: "Top Offer", value: "—" },
          { label: "Total Volume", value: "1.4M ETH" }
        ],
        backgroundUrl: cryptopunksBanner
      },
      tableMetrics: {
        floor: "27.49 ETH",
        change: "-1.8%",
        topOffer: "—",
        volume: "120.60 ETH",
        sales: "4",
        owners: "3,818"
      },
      actionBar: {
        primary: "Buy floor",
        secondary: "Buy",
        tertiary: "Sell",
        quaternary: "Make collection offer"
      }
    },
    {
      slug: "courtyard-io",
      name: "Courtyard.io",
      creatorSlug: "courtyard",
      creatorName: findProfile("courtyard").name,
      verified: true,
      chain: "Ethereum",
      category: "Collectibles",
      description: "Courtyard.io bridges collectible cards and on-chain ownership with vaulted physical inventory and liquid secondary trading.",
      avatarUrl: courtyardAvatar,
      bannerUrl: courtyardBanner,
      contractAddress: flagshipContracts["courtyard-io"],
      items: 72368,
      owners: 72368,
      floorPriceRaw: ethRaw(4).toString(),
      totalVolumeRaw: ethRaw(1700000).toString(),
      listedPercent: 37.2,
      floorDisplay: "4.00 USDC",
      volumeDisplay: "1.7M USDC",
      stats: [
        { label: "Floor Price", value: "4.00 USDC", change: "+33.7%" },
        { label: "Items", value: "72,368", change: "" },
        { label: "1D Vol", value: "1.7M USDC", change: "" }
      ],
      featuredImageUrls: [],
      visualVariant: "courtyard",
      theme: {
        accent: "#3b82f6",
        accentSoft: "rgba(59,130,246,0.16)",
        heroBackground: "#153056",
        panelSurface: "#16181b",
        textOnHero: "#ffffff"
      },
      heroLayout: "carousel",
      statsLayout: "overlay",
      showStickyActionBar: false,
      hero: {
        title: "Courtyard.io",
        subtitle: "Tokenize your cards for free on Courtyard.io",
        badges: ["ETHEREUM", "COLLECTIBLES"],
        metrics: [
          { label: "Floor Price", value: "4.00 USDC", change: "+33.7%" },
          { label: "Items", value: "72,368" },
          { label: "Listed", value: "37.2%" }
        ],
        backgroundUrl: courtyardBanner
      },
      tableMetrics: {
        floor: "4.00 USDC",
        change: "+33.7%",
        topOffer: "—",
        volume: "1.7M USDC",
        sales: "30,009",
        owners: "72,368"
      },
      actionBar: {
        primary: "View items",
        secondary: "Buy",
        tertiary: "Sell"
      }
    },
    {
      slug: "yucky-ducks",
      name: "Yucky Ducks",
      creatorSlug: "officialyuckyducks",
      creatorName: findProfile("officialyuckyducks").name,
      verified: true,
      chain: "Ethereum",
      category: "PFPs",
      description: "Yucky Ducks is a character-driven PFP collection with muddy humor, hand-drawn swamp scenes, and a highly recognizable hero image.",
      avatarUrl: yuckyAvatar,
      bannerUrl: yuckyBanner,
      contractAddress: flagshipContracts["yucky-ducks"],
      items: 7777,
      owners: 1231,
      floorPriceRaw: ethRaw(0.0082).toString(),
      totalVolumeRaw: ethRaw(70.2).toString(),
      listedPercent: 4.9,
      floorDisplay: "0.0082 ETH",
      volumeDisplay: "70.20 ETH",
      stats: [
        { label: "Floor Price", value: "0.0082 ETH", change: "0%" },
        { label: "Items", value: "7,777", change: "" },
        { label: "Total Volume", value: "70.20 ETH", change: "" }
      ],
      featuredImageUrls: [],
      visualVariant: "ducks",
      theme: {
        accent: "#3b82f6",
        accentSoft: "rgba(59,130,246,0.16)",
        heroBackground: "#394840",
        panelSurface: "#16181b",
        textOnHero: "#ffffff"
      },
      heroLayout: "carousel",
      statsLayout: "overlay",
      showStickyActionBar: false,
      hero: {
        title: "Yucky Ducks",
        subtitle: "By OfficialYuckyDucks",
        badges: ["PFPs", "ETHEREUM"],
        metrics: [
          { label: "Floor Price", value: "0.0082 ETH" },
          { label: "Items", value: "7,777" },
          { label: "Total Volume", value: "70.20 ETH" },
          { label: "Listed", value: "4.9%" }
        ],
        backgroundUrl: yuckyBanner
      },
      tableMetrics: {
        floor: "0.0082 ETH",
        change: "0%",
        topOffer: "0.007 WETH",
        volume: "70.21 ETH",
        sales: "9,056",
        owners: "1,231",
        listed: "4.9%"
      },
      actionBar: {
        primary: "View items",
        secondary: "Buy",
        tertiary: "Make offer"
      }
    }
  ];

  collections[0].featuredImageUrls = [cryptopunksAvatar];
  collections[1].featuredImageUrls = [courtyardAvatar];
  collections[2].featuredImageUrls = [yuckyAvatar];

  return collections;
}

function makeGenericProfile(random: () => number, index: number): ProfileSummary {
  const firstNames = ["Asha", "Niko", "Marin", "Ila", "Kai", "Sora", "Tala", "Rin"];
  const lastNames = ["Wave", "Current", "Anchor", "Shell", "Coral", "Drift"];
  const name = `${pick(random, firstNames)} ${pick(random, lastNames)}`;
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  const accent = pick(random, ["#2081e2", "#14b8a6", "#f97316", "#8b5cf6"]);
  return makeProfile(
    slug,
    name,
    accent,
    `${name} collects dark-mode drops, rare communities, and culture-heavy PFPs.`,
    1200 + index * 450,
    `${(3.2 + index * 0.9).toFixed(1)}K ETH`
  );
}

function makeGenericCollection(
  random: () => number,
  index: number,
  creator: ProfileSummary
): CollectionSummary {
  const names = ["Pudgy Penguins", "Hypurr", "Bored Ape Yacht Club", "INX", "Lil Pudgys", "Gimboz", "Plumpy Chums", "CATZO"];
  const name = names[index] ?? `Collection ${index + 1}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const theme = genericThemes[index % genericThemes.length]!;
  const bannerUrl = writeCustomSvg(
    `collections/${slug}-banner.svg`,
    buildDarkCardSvg(name, "Collection", theme.accent, true)
  );
  const avatarUrl = writeCustomSvg(
    `collections/${slug}-avatar.svg`,
    buildCircleAvatarSvg(name.charAt(0), theme.accent)
  );
  const floor = 0.1 + index * 0.34;
  const volume = 26 + index * 34;
  const items = 1400 + index * 860;
  const owners = 430 + index * 520;
  const change = percentLabel(index % 2 === 0 ? 1.7 + index * 0.3 : -1.8 + index * 0.2);
  const contractAddress = makeHexAddress(slug);

  return {
    slug,
    name,
    creatorSlug: creator.slug,
    creatorName: creator.name,
    verified: true,
    chain: "Ethereum",
    category: index % 3 === 0 ? "PFPs" : index % 3 === 1 ? "Gaming" : "Art",
    description: `${name} is a dark-theme demo collection rendered to match the OpenSea market layout used throughout this clone.`,
    avatarUrl,
    bannerUrl,
    contractAddress,
    items,
    owners,
    floorPriceRaw: ethRaw(floor).toString(),
    totalVolumeRaw: ethRaw(volume).toString(),
    listedPercent: 2.6 + index,
    floorDisplay: `${floor < 1 ? floor.toFixed(4) : floor.toFixed(2)} ${index === 1 ? "HYPE" : index === 5 ? "APE" : "ETH"}`,
    volumeDisplay: `${volume.toFixed(2)} ${index === 1 ? "HYPE" : index === 5 ? "APE" : "ETH"}`,
    stats: [
      { label: "Floor Price", value: `${floor < 1 ? floor.toFixed(4) : floor.toFixed(2)} ETH`, change },
      { label: "Items", value: compactNumber(items), change: "" },
      { label: "Owners", value: compactNumber(owners), change: "" }
    ],
    featuredImageUrls: [avatarUrl],
    visualVariant: "generic",
    theme,
    heroLayout: "collection",
    statsLayout: "right",
    showStickyActionBar: false,
    hero: {
      title: name,
      subtitle: `By ${creator.name}`,
      badges: ["ETHEREUM", compactNumber(items), "COLLECTION"],
      metrics: [
        { label: "Floor Price", value: `${floor.toFixed(2)} ETH`, change },
        { label: "Owners", value: compactNumber(owners) },
        { label: "Items", value: compactNumber(items) }
      ],
      backgroundUrl: bannerUrl
    },
    tableMetrics: {
      floor: `${floor < 1 ? floor.toFixed(4) : floor.toFixed(2)} ${index === 1 ? "HYPE" : index === 5 ? "APE" : "ETH"}`,
      change,
      topOffer: index % 3 === 0 ? "—" : `${(floor * 0.91).toFixed(2)} ${index === 1 ? "WHYPE" : "WETH"}`,
      volume: `${volume.toFixed(2)} ${index === 1 ? "HYPE" : index === 5 ? "APE" : "ETH"}`,
      sales: `${4 + index * 3}`,
      owners: compactNumber(owners)
    },
    actionBar: {
      primary: "View items",
      secondary: "Buy",
      tertiary: "Sell"
    },
    badgeText: name === "Gimboz" ? "NEW" : undefined
  };
}

function buildCollectionItems(collection: CollectionSummary, count: number) {
  const punks = [
    { tokenId: "242", bg: "#97adbc", skin: "#8a5a33", hair: "#090909", shirt: "#97adbc", eye: "#171717", accent: "#d8aa70" },
    { tokenId: "3100", bg: "#9cb5c6", skin: "#81512a", hair: "#151515", shirt: "#9cb5c6", eye: "#171717", accent: "#d8aa70" },
    { tokenId: "5822", bg: "#c58d84", skin: "#56331a", hair: "#0c0c0c", shirt: "#c58d84", eye: "#171717", accent: "#d8aa70" },
    { tokenId: "7804", bg: "#9aa3b6", skin: "#8c5d38", hair: "#111111", shirt: "#9aa3b6", eye: "#171717", accent: "#d8aa70" },
    { tokenId: "5577", bg: "#9ba8b7", skin: "#85572e", hair: "#111111", shirt: "#9ba8b7", eye: "#171717", accent: "#d8aa70" },
    { tokenId: "4156", bg: "#97adbc", skin: "#8a5a33", hair: "#111111", shirt: "#97adbc", eye: "#171717", accent: "#d8aa70" }
  ];

  const items: ItemRecord[] = [];
  const thumbnails: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const tokenId = collection.visualVariant === "punks"
      ? punks[index % punks.length]!.tokenId
      : String(index + 1);
    const itemId = `${collection.contractAddress.toLowerCase()}-${tokenId}`;
    let imageUrl = "";

    if (collection.visualVariant === "punks") {
      const art = punks[index % punks.length]!;
      imageUrl = writeCustomSvg(
        `items/${collection.slug}-${tokenId}.svg`,
        buildPunkSvg({
          background: art.bg,
          skin: art.skin,
          hair: art.hair,
          shirt: art.shirt,
          eye: art.eye,
          accent: art.accent
        })
      );
    } else {
      imageUrl = writeCustomSvg(
        `items/${collection.slug}-${tokenId}.svg`,
        buildDarkCardSvg(
          `${collection.name} #${tokenId}`,
          collection.visualVariant === "ducks" ? "Swamp scene" : collection.name,
          collection.theme.accent
        )
      );
    }

    thumbnails.push(imageUrl);

    items.push({
      id: itemId,
      contractAddress: collection.contractAddress,
      tokenId,
      collectionSlug: collection.slug,
      collectionName: collection.name,
      name: collection.visualVariant === "punks" ? `CryptoPunk #${tokenId}` : `${collection.name} #${tokenId}`,
      description:
        collection.visualVariant === "punks"
          ? `CryptoPunk #${tokenId} is a pixel portrait from the original 10K CryptoPunks collection.`
          : `${collection.name} #${tokenId} is part of a handcrafted OpenSea-style demo collection used in this dark-fidelity build.`,
      imageUrl,
      ownerName: collection.visualVariant === "punks" && tokenId === "242" ? "punksOTC1" : `${collection.creatorName} Holder ${index + 1}`,
      ownerAddress: makeHexAddress(`${itemId}-owner`),
      creatorName: collection.creatorName,
      creatorAddress: makeHexAddress(`${collection.creatorSlug}-creator`),
      listed: true,
      currentPriceRaw: collection.floorPriceRaw,
      lastSaleRaw: ethRaw(collection.visualVariant === "punks" ? 29 : 0.02 + index * 0.01).toString(),
      highestOfferRaw: collection.visualVariant === "punks" ? "0" : ethRaw(0.01 + index * 0.003).toString(),
      currentPriceDisplay: collection.floorDisplay,
      lastSaleDisplay: collection.visualVariant === "punks" ? "29.00 ETH" : `${(0.03 + index * 0.01).toFixed(2)} ETH`,
      highestOfferDisplay: collection.visualVariant === "punks" ? "—" : `${(0.01 + index * 0.003).toFixed(3)} WETH`,
      thumbnailUrls: [],
      rankDisplay: collection.visualVariant === "punks" && tokenId === "242" ? "#2,028" : collection.visualVariant === "punks" ? `#${1200 + index * 190}` : undefined,
      traits:
        collection.visualVariant === "punks"
          ? [
              { type: "Type", value: "Male", rarity: "60.39%" },
              { type: "Hair", value: "Clown Hair", rarity: "3.84%" },
              { type: "Eyes", value: "Regular Shades", rarity: "6.47%" },
              { type: "Mouth", value: "Small Smile", rarity: "14.10%" }
            ]
          : [
              { type: "Background", value: collection.visualVariant === "ducks" ? "Swamp" : "Midnight", rarity: "21.7%" },
              { type: "Accessory", value: collection.visualVariant === "courtyard" ? "Vaulted Card" : "Collector Badge", rarity: "12.3%" },
              { type: "Mood", value: "Focused", rarity: "8.4%" },
              { type: "Rarity", value: "Curated", rarity: "4.1%" }
            ]
    });
  }

  for (const item of items) {
    item.thumbnailUrls = thumbnails.slice(0, 7);
  }

  return items;
}

function createDataset(): MarketplaceDataset {
  const random = createSeededRandom(nodeConfig.dummyData.seed);
  const baseProfiles = [
    makeProfile(
      "larva-labs",
      "Larva Labs",
      "#2081e2",
      "Larva Labs introduced CryptoPunks and continues to define the visual benchmark for legacy NFT collections.",
      184000,
      "1.4M ETH"
    ),
    makeProfile(
      "courtyard",
      "Courtyard",
      "#2e77df",
      "Courtyard blends physical card ownership with on-chain liquidity and custody-aware market design.",
      48200,
      "1.7M USDC"
    ),
    makeProfile(
      "officialyuckyducks",
      "OfficialYuckyDucks",
      "#5fbf4a",
      "OfficialYuckyDucks creates muddy, expressive characters and scenes that feel instantly recognizable in marketplace carousels.",
      12900,
      "70.20 ETH"
    )
  ];

  const extraProfiles = Array.from({ length: 8 }, (_, index) => makeGenericProfile(random, index));
  const profiles = [...baseProfiles, ...extraProfiles];
  const collections = [
    ...createFlagshipCollections(profiles),
    ...Array.from({ length: 8 }, (_, index) => makeGenericCollection(random, index, profiles[index + 3]!))
  ];

  const collectionItems = new Map<string, ItemRecord[]>();
  for (const collection of collections) {
    const count = collection.visualVariant === "punks" ? 8 : collection.visualVariant === "ducks" ? 8 : collection.visualVariant === "courtyard" ? 8 : 4;
    collectionItems.set(collection.slug, buildCollectionItems(collection, count));
  }

  const items = Array.from(collectionItems.values()).flat();

  const activities: ActivityRecord[] = [];
  const activityTypes = ["sale", "listing", "offer", "transfer", "mint"] as const;
  for (let index = 0; index < 40; index += 1) {
    const item = items[index % items.length]!;
    const type = activityTypes[index % activityTypes.length]!;
    const display = item.collectionSlug === "cryptopunks"
      ? index % 3 === 0 ? "27.49 ETH" : "29.00 ETH"
      : item.currentPriceDisplay;
    activities.push({
      id: `activity-${index}`,
      type,
      collectionSlug: item.collectionSlug,
      itemId: item.id,
      itemName: item.name,
      from: index % 2 === 0 ? item.creatorName : item.ownerName,
      to: index % 2 === 0 ? item.ownerName : "Collector Pro",
      priceRaw: item.currentPriceRaw,
      priceDisplay: display,
      ageLabel: `${1 + (index % 12)}h ago`
    });
  }

  const tokens: TokenRecord[] = [
    ["Wrapped Ether", "WETH", "$56.7B", "+0.4%", "#6d74ff"],
    ["USD Coin", "USDC", "$33.1B", "0%", "#2775ca"],
    ["ApeCoin", "APE", "$740.2M", "+2.6%", "#115e59"],
    ["Hypurr", "HYPE", "$101.3M", "0%", "#4b5563"],
    ["Pudgy Points", "PENGU", "$892.2M", "+4.1%", "#38bdf8"],
    ["Solana", "SOL", "$64.8B", "+1.2%", "#7c3aed"]
  ].map(([name, symbol, marketCap, change, accent], index) => ({
    slug: `${symbol.toLowerCase()}-${index}`,
    name,
    symbol,
    chain: index === 5 ? "Solana" : "Ethereum",
    price: index === 1 ? "1.00 USD" : index === 5 ? "138.40 USD" : `${(0.82 + index * 6.5).toFixed(2)} USD`,
    volume24h: `${(18.2 + index * 9.4).toFixed(1)}M`,
    marketCap,
    holders: compactNumber(9400 + index * 3200),
    change,
    iconUrl: writeCustomSvg(`tokens/${symbol.toLowerCase()}-${index}.svg`, buildTokenIconSvg(symbol, accent))
  }));

  const drops: DropRecord[] = [
    {
      slug: "arbitrumdao-celebrating-the-third-anniversary",
      name: "ArbitrumDAO: Celebrating The Third Anniversary",
      creatorName: "OpenSea Drops",
      creatorSlug: "larva-labs",
      coverUrl: writeCustomSvg("drops/arbitrumdao.svg", buildDarkCardSvg("ArbitrumDAO", "Minting now", "#2d8cff", true)),
      stage: "Live",
      mintPrice: "0.00 ETH",
      supply: 3333,
      startLabel: "Minting now",
      description: "A screenshot-style featured drop card for the dark OpenSea landing page."
    },
    {
      slug: "the-soft-conspiracy",
      name: "THE SOFT CONSPIRACY",
      creatorName: "OpenSea Drops",
      creatorSlug: "officialyuckyducks",
      coverUrl: writeCustomSvg("drops/soft-conspiracy.svg", buildDarkCardSvg("THE SOFT CONSPIRACY", "Minting now", "#ef4444", true)),
      stage: "Live",
      mintPrice: "0.0169 ETH",
      supply: 888,
      startLabel: "Minting now",
      description: "Another curated hero drop surface."
    },
    {
      slug: "shapemoji",
      name: "Shapemoji",
      creatorName: "OpenSea Drops",
      creatorSlug: "courtyard",
      coverUrl: writeCustomSvg("drops/shapemoji.svg", buildDarkCardSvg("Shapemoji", "Minting now", "#22c55e", true)),
      stage: "Upcoming",
      mintPrice: "0.0008 ETH",
      supply: 5000,
      startLabel: "Tomorrow 12:00 UTC",
      description: "Curated launch card in the same layout system."
    }
  ];

  const rewards: RewardsRecord = {
    totalPoints: "12,480",
    rank: "Top 4%",
    streak: "9-day streak",
    tasks: [
      {
        title: "List a collection floor item",
        description: "Mirror the collector mission cards from the logged-out rewards shell.",
        points: "+150",
        state: nodeConfig.features.enableLiveTrading ? "available" : "demo"
      },
      {
        title: "Watch a featured drop",
        description: "Save a launch from the drops page and track it from your wallet.",
        points: "+40",
        state: "shell"
      },
      {
        title: "Complete your profile",
        description: "Add social handles, a bio, and a banner image for collectors to discover.",
        points: "+75",
        state: "shell"
      }
    ]
  };

  const studio: StudioRecord = {
    headline: "Launch, curate, and monitor drops in OpenSea-style creator tools",
    subtitle: "Studio remains a logged-out shell, but the layout now follows the same dark chrome and dense panel system as the flagship pages.",
    quickActions: [
      {
        title: "Create a collection",
        description: "Set royalty splits, contract settings, and curated hero visuals.",
        state: "shell"
      },
      {
        title: "Configure SeaDrop",
        description: "Reference the public SeaDrop repo for primary-sale contract behavior.",
        state: nodeConfig.contracts.seaDrop.address ? "configured" : "reference"
      },
      {
        title: "Review campaign analytics",
        description: "Track mint velocity, conversion, and creator revenue.",
        state: "shell"
      }
    ]
  };

  const collectionDetails: Record<string, CollectionDetail> = {};

  for (const collection of collections) {
    const itemsForCollection = collectionItems.get(collection.slug) ?? [];
    const holders = profiles.slice(0, 8).map((profile, index) => ({
      ...profile,
      quantity: collection.slug === "cryptopunks" ? 1 : 2 + (index % 4),
      share: `${(1.6 + index * 0.9).toFixed(1)}%`
    }));
    const offers = itemsForCollection.slice(0, 6).map((item, index) => ({
      itemId: item.id,
      itemName: item.name,
      priceDisplay: collection.slug === "cryptopunks" ? "—" : `${(0.009 + index * 0.002).toFixed(3)} WETH`,
      from: `Collector ${index + 1}`,
      expiresIn: `${2 + index}d`
    }));
    const analytics = [
      { label: "Floor price", value: collection.floorDisplay, points: [30, 42, 58, 44, 66, 62, 70] },
      { label: "Volume", value: collection.volumeDisplay, points: [18, 36, 24, 52, 48, 61, 68] },
      { label: "Owners", value: collection.tableMetrics.owners, points: [22, 27, 33, 38, 41, 48, 55] }
    ];
    const about = collection.slug === "cryptopunks"
      ? [
          "CryptoPunks consists of 9,994 unique collectible characters generated from a tightly constrained pixel-art palette.",
          "This page intentionally mirrors the OpenSea collection layout shown in the screenshots, including the hero badges, right-aligned metrics, tab row, and sticky action bar."
        ]
      : [
          `${collection.name} is part of the handcrafted screenshot-style demo content used in this build.`,
          "The page layout follows the same dark OpenSea collection chrome, including tabs, toolbar, dense grids, and stat treatment."
        ];
    const traitHighlights = itemsForCollection[0]?.traits.map((trait) => ({
      type: trait.type,
      topValues: itemsForCollection.slice(0, 3).map((item) => item.traits.find((entry) => entry.type === trait.type)?.value ?? "")
    })) ?? [];

    collectionDetails[collection.slug] = {
      collection,
      items: itemsForCollection,
      activities: activities.filter((activity) => activity.collectionSlug === collection.slug).slice(0, 10),
      holders,
      offers,
      analytics,
      relatedCollections: collections.filter((entry) => entry.slug !== collection.slug).slice(0, 4),
      about,
      traitHighlights
    };
  }

  const projectOpenSeaRoot = nodeConfig.references.projectOpenSeaRoot;
  const references = fs.existsSync(projectOpenSeaRoot)
    ? fs.readdirSync(projectOpenSeaRoot).sort().map((name) => ({
        name,
        path: path.join("external/projectopensea", name),
        description: `Vendored public ProjectOpenSea repository: ${name}`
      }))
    : [];

  return {
    routeMap: [
      { label: "Discover", href: "/", scope: "public" },
      { label: "Collections", href: "/collections", scope: "public" },
      { label: "Tokens", href: "/tokens", scope: "public" },
      { label: "Swap", href: "/swap", scope: "public" },
      { label: "Drops", href: "/drops", scope: "public" },
      { label: "Activity", href: "/activity", scope: "public" },
      { label: "Rewards", href: "/rewards", scope: "gated-shell" },
      { label: "Studio", href: "/studio", scope: "gated-shell" },
      { label: "Profile", href: "/profile", scope: "gated-shell" }
    ],
    references,
    profiles,
    collections,
    collectionDetails,
    items,
    activities,
    tokens,
    drops,
    rewards,
    studio
  };
}

const dataset = createDataset();

function parseSort<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T) {
  if (!value) {
    return fallback;
  }
  return (allowed.find((candidate) => candidate === value) ?? fallback) as T;
}

function parseDisplayNumber(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return 0;
  }

  const base = Number(match[0]);
  if (Number.isNaN(base)) {
    return 0;
  }

  const suffix = normalized.slice(match.index! + match[0].length).trim().charAt(0).toUpperCase();
  if (suffix === "B") {
    return base * 1_000_000_000;
  }
  if (suffix === "M") {
    return base * 1_000_000;
  }
  if (suffix === "K") {
    return base * 1_000;
  }
  return base;
}

export function getBootstrapData() {
  return {
    config: publicConfig,
    routeMap: dataset.routeMap,
    references: dataset.references,
    featuredCollections: dataset.collections.slice(0, 4),
    trendingCollections: dataset.collections.slice(0, 8),
    topTokens: dataset.tokens.slice(0, 6),
    liveDrops: dataset.drops.slice(0, 3),
    recentActivity: dataset.activities.slice(0, 8)
  };
}

export function getDiscoverData() {
  return {
    heroCollection: dataset.collections.find((collection) => collection.slug === "yucky-ducks"),
    leaderboardCollections: dataset.collections.slice(1, 9),
    trendingCollections: dataset.collections.slice(0, 6),
    topMovers: dataset.collections.slice(5, 11),
    liveDrops: dataset.drops,
    tokenLeaders: dataset.tokens,
    activityFeed: dataset.activities.slice(0, 10)
  };
}

export function getCollectionsData(query: {
  search?: string;
  sort?: string;
  category?: string;
  view?: string;
  timeframe?: string;
}) {
  const sort = parseSort(query.sort, ["volume", "floor", "owners"] as const, "volume");
  const normalizedSearch = (query.search ?? "").trim().toLowerCase();
  const view = parseSort(query.view, ["top", "trending", "watchlist"] as const, "top");
  const timeframe = parseSort(query.timeframe, ["All", "30d", "7d", "1d", "1h", "15m", "5m", "1m"] as const, "1d");
  const category = (query.category ?? "").trim().toLowerCase() || "all";

  let collections = dataset.collections.filter((collection) => {
    if (!normalizedSearch) {
      return true;
    }
    return [collection.name, collection.creatorName, collection.slug].some((value) =>
      value.toLowerCase().includes(normalizedSearch)
    );
  });

  const defaultTopOrder = [
    "cryptopunks",
    "courtyard-io",
    "yucky-ducks",
    "pudgy-penguins",
    "hypurr",
    "bored-ape-yacht-club",
    "plumpy-chums",
    "catzo",
    "inx",
    "gimboz",
    "lil-pudgys"
  ];

  if (!normalizedSearch && category === "all" && sort === "volume" && view === "top" && timeframe === "1d") {
    const order = new Map(defaultTopOrder.map((slug, index) => [slug, index]));
    collections = collections.slice().sort((left, right) => {
      return (order.get(left.slug) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.slug) ?? Number.MAX_SAFE_INTEGER);
    });
  } else {
    collections = collections.slice().sort((left, right) => {
      if (sort === "floor") {
        return parseDisplayNumber(right.floorDisplay) - parseDisplayNumber(left.floorDisplay);
      }
      if (sort === "owners") {
        return right.owners - left.owners;
      }
      return parseDisplayNumber(right.tableMetrics.volume) - parseDisplayNumber(left.tableMetrics.volume);
    });
  }

  return {
    filters: {
      search: query.search ?? "",
      sort,
      category,
      view,
      timeframe
    },
    collections
  };
}

export function getCollectionData(slug: string) {
  return dataset.collectionDetails[slug];
}

export function getItemData(contractAddress: string, tokenId: string) {
  const normalizedContract = contractAddress.toLowerCase();
  const item = dataset.items.find((entry) => {
    return entry.contractAddress.toLowerCase() === normalizedContract && entry.tokenId === tokenId;
  });

  if (!item) {
    return undefined;
  }

  const collection = dataset.collections.find((entry) => entry.slug === item.collectionSlug)!;
  const relatedItems = dataset.items
    .filter((entry) => entry.collectionSlug === item.collectionSlug && entry.id !== item.id)
    .slice(0, 6);
  const activity = dataset.activities.filter((entry) => entry.itemId === item.id).slice(0, 8);

  return {
    presentation: "modal",
    item,
    collection,
    activity,
    relatedItems,
    mediaStrip: item.thumbnailUrls,
    detailTabs: ["Details", "Orders", "Activity"],
    defaultTab: "Details",
    metaBadges: [collection.name.toUpperCase(), collection.chain.toUpperCase(), `TOKEN #${item.tokenId}`],
    ownerLabel: `Owned by ${item.ownerName}`,
    backHref: `/collection/${collection.slug}`,
    closeHref: `/collection/${collection.slug}`,
    buyPanel: {
      topOffer: item.highestOfferDisplay,
      collectionFloor: collection.floorDisplay,
      rarity: item.rankDisplay ?? "—",
      lastSale: item.lastSaleDisplay,
      price: item.currentPriceDisplay,
      usd: collection.slug === "cryptopunks" ? "($56.7K)" : "(demo)",
      buttonLabel: "Buy now"
    },
    liveTradingAvailable:
      nodeConfig.features.enableLiveTrading &&
      nodeConfig.contracts.seaport.verified &&
      nodeConfig.contracts.collection.verified
  };
}

export function getTokensData(query: { search?: string; sort?: string }) {
  const sort = parseSort(query.sort, ["volume", "price", "marketCap"] as const, "volume");
  const normalizedSearch = (query.search ?? "").trim().toLowerCase();
  let tokens = dataset.tokens.filter((token) => {
    if (!normalizedSearch) {
      return true;
    }
    return [token.name, token.symbol].some((value) => value.toLowerCase().includes(normalizedSearch));
  });

  tokens = tokens.slice().sort((left, right) => {
    if (sort === "price") {
      return parseDisplayNumber(right.price) - parseDisplayNumber(left.price);
    }
    if (sort === "marketCap") {
      return parseDisplayNumber(right.marketCap) - parseDisplayNumber(left.marketCap);
    }
    return parseDisplayNumber(right.volume24h) - parseDisplayNumber(left.volume24h);
  });

  return {
    filters: {
      search: query.search ?? "",
      sort
    },
    tokens
  };
}

export function getActivityData(query: { type?: string; search?: string }) {
  const normalizedSearch = (query.search ?? "").trim().toLowerCase();
  const type = query.type ?? "all";
  const activities = dataset.activities.filter((activity) => {
    if (type !== "all" && activity.type !== type) {
      return false;
    }
    if (!normalizedSearch) {
      return true;
    }
    return [activity.itemName, activity.from, activity.to, activity.collectionSlug].some((value) =>
      value.toLowerCase().includes(normalizedSearch)
    );
  });

  return {
    filters: { type, search: query.search ?? "" },
    activities
  };
}

export function getDropsData(query: { stage?: string }) {
  const stage = query.stage ?? "all";
  return {
    filters: { stage },
    drops: dataset.drops.filter((drop) => {
      return stage === "all" ? true : drop.stage.toLowerCase() === stage.toLowerCase();
    })
  };
}

export function getRewardsData() {
  return dataset.rewards;
}

export function getStudioData() {
  return dataset.studio;
}

export function getProfileData(slug: string) {
  const profile = dataset.profiles.find((entry) => entry.slug === slug);
  if (!profile) {
    return undefined;
  }

  return {
    profile,
    createdCollections: dataset.collections.filter((collection) => collection.creatorSlug === slug),
    createdItems: dataset.items.filter((item) => item.creatorName === profile.name).slice(0, 12)
  };
}
