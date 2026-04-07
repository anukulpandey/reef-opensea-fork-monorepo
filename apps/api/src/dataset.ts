import fs from "node:fs";
import path from "node:path";

import { Contract, JsonRpcProvider, formatEther, formatUnits } from "ethers";

import { config, nodeConfig, publicConfig } from "./config.js";
import {
  getCreatorCollectionByAddress,
  getListingByToken,
  getCreatorCollectionBySlug,
  getNft,
  getUserByAddress,
  listAdminDrops,
  listCreatorCollections,
  listHolders,
  listListings,
  listCreatedNftsForAddress,
  listOwnedNftsForAddress,
  listNfts,
  listSales,
  listTransfers,
  type AdminDropRecord,
  type CreatorCollectionRecord,
  type ListingRecord,
  type NftRecord,
  type SaleRecord,
  type TransferRecord
} from "./db.js";
import { readJsonFromIpfs, toGatewayUrl } from "./ipfs.js";
import { runtimeState } from "./runtime.js";
import { writeDataUrlAsset, writeGeneratedSvg } from "./storage.js";

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
  listingId?: string;
  seller?: string;
  currencySymbol: string;
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
  collectionAddress?: string;
  collectionName?: string;
  itemId: string;
  itemName: string;
  from: string;
  to: string;
  fromAddress?: string;
  toAddress?: string;
  priceRaw: string;
  priceDisplay: string;
  ageLabel: string;
  createdAt?: string;
  statusLabel?: string;
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

type ProfileGalleryRecord = {
  id: string;
  collectionSlug: string;
  collectionName: string;
  collectionDescription: string;
  contractAddress: string;
  creatorName: string;
  avatarUrl: string;
  bannerUrl: string;
  floorDisplay: string;
  listedCount: number;
  itemCount: number;
  itemsPreview: ItemRecord[];
};

type ProfileTokenHolding = {
  id: string;
  name: string;
  symbol: string;
  contractAddress: string;
  chain: string;
  iconUrl: string;
  balanceRaw: string;
  balanceDisplay: string;
  valueDisplay: string;
  includedInPortfolio: boolean;
  isNative: boolean;
};

type ProfileOfferRecord = {
  id: string;
  direction: "incoming" | "outgoing";
  status: "active" | "accepted" | "cancelled" | "expired";
  itemId: string;
  itemName: string;
  collectionSlug: string;
  collectionName: string;
  priceRaw: string;
  priceDisplay: string;
  from: string;
  to: string;
  expiresIn: string;
  createdAt?: string;
};

type ProfilePortfolioSummary = {
  totalValueDisplay: string;
  tokenValueDisplay: string;
  nftValueDisplay: string;
  listedValueDisplay: string;
  collectionCount: number;
  itemCount: number;
  listingCount: number;
  tokenCount: number;
  summaryCards: Array<{
    label: string;
    value: string;
    note: string;
  }>;
};

type ProfileResponse = {
  profile: ProfileSummary;
  galleries: ProfileGalleryRecord[];
  items: ItemRecord[];
  tokens: ProfileTokenHolding[];
  portfolio: ProfilePortfolioSummary;
  listings: ItemRecord[];
  offers: ProfileOfferRecord[];
  createdCollections: CollectionSummary[];
  createdItems: ItemRecord[];
  activity: ActivityRecord[];
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

type BootstrapResponse = {
  config: typeof publicConfig;
  routeMap: Array<{ label: string; href: string; scope: string }>;
  featuredCollections: CollectionSummary[];
  trendingCollections: CollectionSummary[];
  topTokens: TokenRecord[];
  liveDrops: DropRecord[];
  recentActivity: ActivityRecord[];
};

const liveTheme: ThemePalette = {
  accent: "#2081e2",
  accentSoft: "rgba(32,129,226,0.16)",
  heroBackground: "#10161f",
  panelSurface: "#16181b",
  textOnHero: "#f8fafc"
};

const creatorSlug = "reef-admin";
const creatorName = "Reef Admin";
const collectionSlug = nodeConfig.contracts.collection.slug;
const collectionAddress = nodeConfig.contracts.collection.address.toLowerCase();
const emptyCollectionMedia = {
  avatarUrl: "",
  bannerUrl: ""
};
const profileProvider = new JsonRpcProvider(config.rpcUrl, Number(nodeConfig.network.chainId));
const erc20BalanceAbi = [
  "function balanceOf(address account) view returns (uint256)"
] as const;
const managedProfileTokens = Array.isArray(nodeConfig.network.profileTokens)
  ? nodeConfig.network.profileTokens
  : [];

const nftMediaCache = new Map<string, Promise<string>>();
const collectionMediaCache = new Map<string, Promise<typeof emptyCollectionMedia>>();

function placeholderSvg(title: string, subtitle: string, accent = "#2081e2", wide = false) {
  const width = 1200;
  const height = wide ? 600 : 1200;
  const cardX = 36;
  const cardY = 36;
  const cardWidth = width - 72;
  const cardHeight = height - 72;
  const titleY = wide ? 290 : 462;
  const subtitleY = wide ? 190 : 330;
  const footerY = wide ? 358 : 530;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  <rect width="${width}" height="${height}" fill="#111315"/>
  <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="32" fill="#171a1f"/>
  <circle cx="${wide ? 980 : 940}" cy="${wide ? 180 : 286}" r="${wide ? 150 : 220}" fill="${accent}" fill-opacity="0.22"/>
  <circle cx="${wide ? 220 : 260}" cy="${wide ? 470 : 930}" r="${wide ? 180 : 240}" fill="${accent}" fill-opacity="0.18"/>
  <text x="96" y="${subtitleY}" font-family="Arial, Helvetica, sans-serif" font-size="${wide ? 32 : 36}" fill="rgba(255,255,255,0.70)">${escapeXml(subtitle)}</text>
  <text x="96" y="${titleY}" font-family="Arial, Helvetica, sans-serif" font-size="${wide ? 78 : 96}" font-weight="700" fill="#fff">${escapeXml(title)}</text>
  <text x="96" y="${footerY}" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="rgba(255,255,255,0.58)">OpenSea</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function colorSetForSeed(seed: string) {
  const palettes = [
    ["#2081e2", "#67b3ff", "#0d2048"],
    ["#7c3aed", "#b794f4", "#241144"],
    ["#0ea5a4", "#67e8f9", "#082731"],
    ["#f97316", "#fdba74", "#3c1608"],
    ["#ef4444", "#fda4af", "#390f15"],
    ["#22c55e", "#86efac", "#0a2413"]
  ];
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return palettes[hash % palettes.length] ?? palettes[0];
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return value.trim().slice(0, 2).toUpperCase() || "?";
}

function profileAvatarSvg(seed: string, label: string) {
  const [primary, secondary, shadow] = colorSetForSeed(seed);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="bg" x1="60" y1="42" x2="448" y2="470" gradientUnits="userSpaceOnUse">
      <stop stop-color="${primary}"/>
      <stop offset="1" stop-color="${shadow}"/>
    </linearGradient>
    <radialGradient id="orb" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(152 116) rotate(46) scale(280 220)">
      <stop stop-color="${secondary}" stop-opacity="0.94"/>
      <stop offset="1" stop-color="${secondary}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="136" fill="url(#bg)"/>
  <circle cx="156" cy="116" r="108" fill="url(#orb)"/>
  <circle cx="404" cy="386" r="92" fill="${secondary}" fill-opacity="0.18"/>
  <circle cx="118" cy="380" r="54" fill="#ffffff" fill-opacity="0.08"/>
  <path d="M364 84c34 26 56 66 56 111 0 80-61 141-146 141-57 0-103-22-134-58 22 63 81 110 156 110 98 0 168-68 168-165 0-50-19-92-52-122h-48Z" fill="#ffffff" fill-opacity="0.08"/>
  <text x="256" y="294" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="148" font-weight="700" fill="#fff">${escapeXml(initials(label))}</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function profileBannerSvg(seed: string, label: string) {
  const [primary, secondary, shadow] = colorSetForSeed(seed);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="360" viewBox="0 0 1200 360" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="360" gradientUnits="userSpaceOnUse">
      <stop stop-color="${shadow}"/>
      <stop offset="0.52" stop-color="${primary}"/>
      <stop offset="1" stop-color="#191a29"/>
    </linearGradient>
    <radialGradient id="orbA" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(260 120) rotate(28) scale(300 210)">
      <stop stop-color="${secondary}" stop-opacity="0.56"/>
      <stop offset="1" stop-color="${secondary}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="360" fill="url(#bg)"/>
  <ellipse cx="260" cy="122" rx="300" ry="210" fill="url(#orbA)"/>
  <ellipse cx="986" cy="108" rx="288" ry="184" fill="${primary}" fill-opacity="0.20"/>
  <circle cx="122" cy="294" r="96" fill="#ffffff" fill-opacity="0.06"/>
  <circle cx="1040" cy="90" r="88" fill="#ffffff" fill-opacity="0.05"/>
  <text x="74" y="108" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="700" fill="#ffffff" fill-opacity="0.08">${escapeXml(label)}</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function shortenAddress(value: string) {
  if (!value || value.length < 10) {
    return value || "Unknown";
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function sameAddress(left: string | null | undefined, right: string | null | undefined) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function uniqueMediaStrip(urls: string[]) {
  const seen = new Set<string>();
  return urls.filter((url) => {
    const normalized = url.trim();
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

function formatNative(raw: string) {
  if (!raw || raw === "0") {
    return `-`;
  }
  const numeric = Number(formatEther(raw));
  if (!Number.isFinite(numeric)) {
    return `-`;
  }
  const digits = numeric >= 100 ? 2 : numeric >= 1 ? 3 : 4;
  return `${numeric.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  })} ${nodeConfig.network.nativeCurrency.symbol}`;
}

function formatCompactNative(raw: string) {
  if (!raw || raw === "0") {
    return `0 ${nodeConfig.network.nativeCurrency.symbol}`;
  }
  const numeric = Number(formatEther(raw));
  if (!Number.isFinite(numeric)) {
    return `0 ${nodeConfig.network.nativeCurrency.symbol}`;
  }
  return `${new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2
  }).format(numeric)} ${nodeConfig.network.nativeCurrency.symbol}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

function ageLabel(input: string) {
  const diffMs = Math.max(Date.now() - new Date(input).getTime(), 0);
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function timestampValue(input: string | Date | null | undefined) {
  if (!input) {
    return 0;
  }
  const value = input instanceof Date ? input.getTime() : new Date(input).getTime();
  return Number.isFinite(value) ? value : 0;
}

function resolveImageUrl(nft: NftRecord | null) {
  return (
    nft?.imageUrl ||
    placeholderSvg(nodeConfig.contracts.collection.name, nodeConfig.network.chainName)
  );
}

function tokenIcon(seed: string, label: string, accent = "#2081e2") {
  return placeholderSvg(label, seed, accent);
}

function formatTokenBalance(raw: string, decimals: number) {
  if (!raw || raw === "0") {
    return "0";
  }
  const numeric = Number(formatUnits(raw, decimals));
  if (!Number.isFinite(numeric)) {
    return "0";
  }
  return numeric.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: numeric >= 100 ? 2 : numeric >= 1 ? 4 : 6
  });
}

function toDropRecord(record: AdminDropRecord): DropRecord {
  return {
    slug: record.slug,
    name: record.name,
    creatorName: record.creatorName,
    creatorSlug: record.creatorSlug,
    coverUrl: record.coverUrl || placeholderSvg(record.name, "Reef Drop", "#2081e2"),
    stage: record.stage,
    mintPrice: record.mintPrice,
    supply: record.supply,
    startLabel: record.startLabel,
    description: record.description
  };
}

function isSafeInlineSvg(url: string) {
  return url.startsWith("data:image/svg+xml") && url.length <= 12_000;
}

function normalizePublicMediaUrl(url: string) {
  if (!url) {
    return "";
  }
  if (!url.startsWith("data:")) {
    return url;
  }
  return isSafeInlineSvg(url) ? url : "";
}

function normalizeMetadataMediaUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }
  if (value.startsWith("ipfs://")) {
    return toGatewayUrl(value);
  }
  return normalizePublicMediaUrl(value) || value;
}

function decodeInlineSvg(url: string) {
  if (!url.startsWith("data:image/svg+xml")) {
    return "";
  }
  const separatorIndex = url.indexOf(",");
  if (separatorIndex === -1) {
    return "";
  }
  try {
    return decodeURIComponent(url.slice(separatorIndex + 1));
  } catch {
    return "";
  }
}

function storageAbsolutePathFromPublicUrl(url: string) {
  const prefix = `${config.publicStorageBasePath}/`;
  if (!url.startsWith(prefix)) {
    return "";
  }
  const relativePath = url.slice(prefix.length);
  return path.join(config.storagePublicRoot, relativePath);
}

function readSvgForInspection(url: string) {
  if (url.startsWith("data:image/svg+xml")) {
    return decodeInlineSvg(url);
  }
  if (!url.endsWith(".svg")) {
    return "";
  }
  const absolutePath = storageAbsolutePathFromPublicUrl(url);
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    return "";
  }
  try {
    return fs.readFileSync(absolutePath, "utf8");
  } catch {
    return "";
  }
}

function isImplicitDefaultStarterArtwork(url: string) {
  const svg = readSvgForInspection(url);
  if (!svg) {
    return false;
  }
  return svg.includes("Reef NFT") && svg.includes("Collector Edition") && svg.includes("orbFill");
}

function materializeCollectionMediaUrl(url: string, slug: string, kind: "avatar" | "banner") {
  if (!url || !url.startsWith("data:image/") || isSafeInlineSvg(url)) {
    return "";
  }
  return writeDataUrlAsset("collections", `${slug}-${kind}`, url);
}

function resolveCollectionMediaUrl(url: string, slug: string, kind: "avatar" | "banner") {
  return normalizePublicMediaUrl(url) || materializeCollectionMediaUrl(url, slug, kind);
}

function materializeNftMediaUrl(url: string, slug: string, tokenId: string) {
  if (!url || !url.startsWith("data:image/")) {
    return "";
  }
  return writeDataUrlAsset("nfts", `${slug}-${tokenId}`, url);
}

function resolveNftMediaUrl(url: string, slug: string, tokenId: string) {
  return normalizePublicMediaUrl(url) || materializeNftMediaUrl(url, slug, tokenId);
}

async function getNftMetadataImage(metadataUri: string, slug: string, tokenId: string) {
  if (!metadataUri || !metadataUri.startsWith("ipfs://")) {
    return "";
  }

  const cacheKey = `${metadataUri}:${slug}:${tokenId}`;
  const cached = nftMediaCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const pending = (async () => {
    try {
      const metadata = await readJsonFromIpfs(metadataUri);
      return resolveNftMediaUrl(
        normalizeMetadataMediaUrl(metadata.image ?? metadata.image_url ?? metadata.imageUrl),
        `${slug}-metadata`,
        tokenId
      );
    } catch {
      return "";
    }
  })();

  nftMediaCache.set(cacheKey, pending);
  return pending;
}

async function resolvePublicNftImage(
  nft: Pick<NftRecord, "imageUrl" | "metadataUri" | "tokenId" | "name">,
  options: {
    collectionSlug: string;
    collectionName: string;
    collectionAvatarUrl?: string;
  }
) {
  const inheritedCollectionImage =
    normalizePublicMediaUrl(options.collectionAvatarUrl ?? "") ||
    options.collectionAvatarUrl?.trim() ||
    "";
  const stored = resolveNftMediaUrl(nft.imageUrl, options.collectionSlug, nft.tokenId);
  if (stored && !isImplicitDefaultStarterArtwork(stored)) {
    return stored;
  }

  const metadataImage = await getNftMetadataImage(
    nft.metadataUri,
    options.collectionSlug,
    nft.tokenId
  );
  if (metadataImage && !isImplicitDefaultStarterArtwork(metadataImage)) {
    return metadataImage;
  }

  if (inheritedCollectionImage) {
    return inheritedCollectionImage;
  }

  return writeGeneratedSvg(
    `nfts/${options.collectionSlug}-${nft.tokenId}.svg`,
    nft.name || `${options.collectionName} #${nft.tokenId}`,
    options.collectionName,
    `${options.collectionSlug}:${nft.tokenId}`
  );
}

function shouldPreferAvatarForBanner(input: { bannerUrl: string; avatarUrl: string }) {
  if (!input.bannerUrl || !input.avatarUrl || input.bannerUrl === input.avatarUrl) {
    return false;
  }
  return (
    input.bannerUrl.startsWith("data:image/svg+xml") ||
    input.bannerUrl.includes("/storage/generated/")
  );
}

async function getCollectionMetadataMedia(contractUri: string) {
  if (!contractUri || !contractUri.startsWith("ipfs://")) {
    return emptyCollectionMedia;
  }
  const cached = collectionMediaCache.get(contractUri);
  if (cached) {
    return cached;
  }

  const pending = (async () => {
    try {
      const metadata = await readJsonFromIpfs(contractUri);
      const avatarUrl = normalizeMetadataMediaUrl(
        metadata.image ?? metadata.image_url ?? metadata.imageUrl
      );
      const bannerUrl = normalizeMetadataMediaUrl(
        metadata.banner_image ?? metadata.banner ?? metadata.bannerUrl
      );
      return {
        avatarUrl,
        bannerUrl
      };
    } catch {
      return emptyCollectionMedia;
    }
  })();

  collectionMediaCache.set(contractUri, pending);
  return pending;
}

async function resolvePublicCollectionMedia(record: CreatorCollectionRecord, accent = "#2081e2") {
  const fallbackAvatar = placeholderSvg(record.name, record.symbol || "Collection", accent);
  const fallbackBanner = placeholderSvg(record.name, "Creator collection", accent, true);
  const storedAvatar = resolveCollectionMediaUrl(record.avatarUrl, record.slug, "avatar");
  const storedBanner = resolveCollectionMediaUrl(record.bannerUrl, record.slug, "banner");
  const metadataMedia =
    storedAvatar && storedBanner ? emptyCollectionMedia : await getCollectionMetadataMedia(record.contractUri);
  const metadataAvatar = resolveCollectionMediaUrl(
    metadataMedia.avatarUrl,
    `${record.slug}-metadata`,
    "avatar"
  );
  const metadataBanner = resolveCollectionMediaUrl(
    metadataMedia.bannerUrl,
    `${record.slug}-metadata`,
    "banner"
  );
  const avatarUrl = storedAvatar || metadataAvatar || fallbackAvatar;
  const candidateBannerUrl = storedBanner || metadataBanner || metadataAvatar;
  const bannerUrl = shouldPreferAvatarForBanner({
    bannerUrl: candidateBannerUrl,
    avatarUrl
  })
    ? avatarUrl
    : candidateBannerUrl || avatarUrl || fallbackBanner;

  return {
    avatarUrl,
    bannerUrl
  };
}

function formatCreatorCollectionStatus(status: string) {
  switch (status.toLowerCase()) {
    case "ready":
      return "Live";
    case "deploying":
      return "Deploying";
    case "gated":
      return "Blocked";
    default:
      return "Draft";
  }
}

function buildCreatorCollectionSummary(
  record: CreatorCollectionRecord,
  media: { avatarUrl: string; bannerUrl: string }
): CollectionSummary {
  const statusLabel = formatCreatorCollectionStatus(record.status);
  return {
    slug: record.slug,
    name: record.name,
    creatorSlug: addressToSlug(record.ownerAddress),
    creatorName: shortenAddress(record.ownerAddress),
    verified: record.status.toLowerCase() === "ready" && Boolean(record.contractAddress),
    chain: record.chainName || nodeConfig.network.chainName,
    category: "NFTs",
    description: record.description || `${record.name} creator collection on ${record.chainName || nodeConfig.network.chainName}.`,
    avatarUrl: media.avatarUrl,
    bannerUrl: media.bannerUrl,
    contractAddress: record.contractAddress || "",
    items: 0,
    owners: 0,
    floorPriceRaw: "0",
    totalVolumeRaw: "0",
    listedPercent: 0,
    floorDisplay: "No listings",
    volumeDisplay: `0 ${nodeConfig.network.nativeCurrency.symbol}`,
    stats: [
      { label: "Status", value: statusLabel, change: record.contractAddress ? "Contract" : "Pending" },
      { label: "Items", value: "0", change: "Pending" },
      { label: "Owners", value: "0", change: "Pending" }
    ],
    featuredImageUrls: [media.avatarUrl],
    visualVariant: "generic",
    theme: liveTheme,
    heroLayout: "collection",
    statsLayout: "right",
    showStickyActionBar: false,
    hero: {
      title: record.name,
      subtitle: `By ${shortenAddress(record.ownerAddress)}`,
      badges: [
        (record.chainKey || nodeConfig.network.key).toUpperCase(),
        (record.standard || "ERC721").toUpperCase(),
        statusLabel.toUpperCase()
      ],
      metrics: [
        { label: "Floor Price", value: "No listings" },
        { label: "Top Offer", value: "No offers" },
        { label: "Total Volume", value: `0 ${nodeConfig.network.nativeCurrency.symbol}` }
      ],
      backgroundUrl: media.bannerUrl
    },
    tableMetrics: {
      floor: "No listings",
      change: statusLabel,
      topOffer: "-",
      volume: `0 ${nodeConfig.network.nativeCurrency.symbol}`,
      sales: "0",
      owners: "0",
      listed: "0%"
    },
    actionBar: {
      primary: "Create NFT",
      secondary: "Edit",
      tertiary: "Activity"
    },
    badgeText: statusLabel.toUpperCase()
  };
}

function toDraftCollectionSummary(record: CreatorCollectionRecord): CollectionSummary {
  const accent = "#2081e2";
  const avatarUrl =
    resolveCollectionMediaUrl(record.avatarUrl, record.slug, "avatar") ||
    placeholderSvg(record.name, record.symbol || "Collection", accent);
  const bannerCandidate =
    resolveCollectionMediaUrl(record.bannerUrl, record.slug, "banner") || avatarUrl;
  return buildCreatorCollectionSummary(record, {
    avatarUrl,
    bannerUrl: shouldPreferAvatarForBanner({
      bannerUrl: bannerCandidate,
      avatarUrl
    })
      ? avatarUrl
      : bannerCandidate || placeholderSvg(record.name, "Creator collection", accent, true)
  });
}

async function toPublicCreatorCollectionSummary(record: CreatorCollectionRecord): Promise<CollectionSummary> {
  return buildCreatorCollectionSummary(
    record,
    await resolvePublicCollectionMedia(record)
  );
}

async function buildProfile(address: string, itemCount = 0, volume = "0") {
  const safeAddress = address || ZeroAddressLike;
  const user = safeAddress === ZeroAddressLike ? null : await getUserByAddress(safeAddress);
  const displayName = user?.displayName?.trim() || shortenAddress(safeAddress);
  const avatarUrl = normalizePublicMediaUrl(user?.avatarUri ?? "") || profileAvatarSvg(safeAddress, displayName);
  const bannerUrl = normalizePublicMediaUrl(user?.bannerUri ?? "") || profileBannerSvg(safeAddress, displayName);
  return {
    slug: addressToSlug(safeAddress),
    name: displayName,
    verified: false,
    bio: user?.bio?.trim() || `Collector on ${nodeConfig.network.chainName}.`,
    avatarUrl,
    bannerUrl,
    followers: 0,
    following: 0,
    items: itemCount,
    volume: formatCompactNative(volume)
  };
}

function addressToSlug(address: string) {
  const normalized = address.toLowerCase();
  return normalized === ZeroAddressLike ? creatorSlug : `wallet-${normalized.slice(2, 10)}`;
}

function rarityLabel(index: number, total: number) {
  if (total <= 1) {
    return "Unique";
  }
  return `${((1 / total) * 100).toFixed(1)}% have this trait`;
}

const ZeroAddressLike = "0x0000000000000000000000000000000000000000";

type MarketState = {
  collection: CollectionSummary | null;
  items: ItemRecord[];
  activities: ActivityRecord[];
  holders: Array<ProfileSummary & { ownerAddress: string; quantity: number; share: string }>;
  activeListings: ListingRecord[];
  creatorProfile: ProfileSummary | null;
};

async function buildMarketState(): Promise<MarketState> {
  if (!collectionAddress || !runtimeState.contracts.collection) {
    return {
      collection: null,
      items: [] as ItemRecord[],
      activities: [] as ActivityRecord[],
      holders: [] as Array<ProfileSummary & { ownerAddress: string; quantity: number; share: string }>,
      activeListings: [] as ListingRecord[],
      creatorProfile: null
    };
  }

  const [nfts, activeListings, sales, transfers, holderRows] = await Promise.all([
    listNfts(collectionAddress),
    listListings({ collectionAddress, status: "active" }),
    listSales(200, collectionAddress),
    listTransfers(200, { collectionAddress }),
    listHolders(collectionAddress)
  ]);

  const listingsByToken = new Map(activeListings.map((listing) => [listing.tokenId, listing]));
  const latestSaleByToken = new Map<string, SaleRecord>();
  for (const sale of sales) {
    if (!latestSaleByToken.has(sale.tokenId)) {
      latestSaleByToken.set(sale.tokenId, sale);
    }
  }

  const items = await Promise.all(nfts.map(async (nft, index) => {
    const listing = listingsByToken.get(nft.tokenId) ?? null;
    const latestSale = latestSaleByToken.get(nft.tokenId) ?? null;
    const attributes = Array.isArray(nft.attributes) ? nft.attributes : [];
    const ownerAddress = listing?.seller ?? nft.ownerAddress;
    const creatorAddress = nft.creatorAddress || latestSale?.seller || ownerAddress;
    const imageUrl = await resolvePublicNftImage(nft, {
      collectionSlug,
      collectionName: nodeConfig.contracts.collection.name
    });

    return {
      id: `${nft.collectionAddress}:${nft.tokenId}`,
      contractAddress: nft.collectionAddress,
      tokenId: nft.tokenId,
      collectionSlug,
      collectionName: nodeConfig.contracts.collection.name,
      name: nft.name || `${nodeConfig.contracts.collection.name} #${nft.tokenId}`,
      description: nft.description,
      imageUrl,
      ownerName: shortenAddress(ownerAddress),
      ownerAddress,
      creatorName: shortenAddress(creatorAddress),
      creatorAddress,
      listed: Boolean(listing),
      listingId: listing?.listingId,
      seller: listing?.seller,
      currencySymbol: nodeConfig.network.nativeCurrency.symbol,
      currentPriceRaw: listing?.priceRaw ?? "0",
      lastSaleRaw: latestSale?.priceRaw ?? "0",
      highestOfferRaw: "0",
      currentPriceDisplay: listing ? formatNative(listing.priceRaw) : "Not listed",
      lastSaleDisplay: latestSale ? formatNative(latestSale.priceRaw) : "No sales yet",
      highestOfferDisplay: "No offers",
      thumbnailUrls: [imageUrl],
      rankDisplay: `#${index + 1}`,
      traits: attributes.map((attribute, attributeIndex) => ({
        type: String(attribute.trait_type ?? `Trait ${attributeIndex + 1}`),
        value: String(attribute.value ?? "Unknown"),
        rarity: rarityLabel(attributeIndex + 1, Math.max(attributes.length, 1))
      }))
    } satisfies ItemRecord;
  }));

  const itemMap = new Map(items.map((item) => [item.tokenId, item]));
  const listingActivities = activeListings.map((listing) => {
    const item = itemMap.get(listing.tokenId);
    return {
      id: `listing-${listing.listingId}`,
      type: "listing",
      collectionSlug,
      collectionAddress,
      collectionName: nodeConfig.contracts.collection.name,
      itemId: listing.tokenId,
      itemName: item?.name ?? `${nodeConfig.contracts.collection.name} #${listing.tokenId}`,
      from: shortenAddress(listing.seller),
      to: "marketplace",
      fromAddress: listing.seller,
      toAddress: nodeConfig.contracts.marketplace.address || "",
      priceRaw: listing.priceRaw,
      priceDisplay: formatNative(listing.priceRaw),
      ageLabel: ageLabel(listing.createdAt),
      createdAt: listing.createdAt
    };
  });

  const saleActivities = sales.map((sale) => {
    const item = itemMap.get(sale.tokenId);
    return {
      id: `sale-${sale.txHash}`,
      type: "sale",
      collectionSlug,
      collectionAddress,
      collectionName: nodeConfig.contracts.collection.name,
      itemId: sale.tokenId,
      itemName: item?.name ?? `${nodeConfig.contracts.collection.name} #${sale.tokenId}`,
      from: shortenAddress(sale.seller),
      to: shortenAddress(sale.buyer),
      fromAddress: sale.seller,
      toAddress: sale.buyer,
      priceRaw: sale.priceRaw,
      priceDisplay: formatNative(sale.priceRaw),
      ageLabel: ageLabel(sale.createdAt),
      createdAt: sale.createdAt
    };
  });

  const transferActivities = transfers.map((transfer) => {
    const item = itemMap.get(transfer.tokenId);
    return {
      id: `transfer-${transfer.txHash}-${transfer.logIndex}`,
      type: transfer.eventType,
      collectionSlug,
      collectionAddress,
      collectionName: nodeConfig.contracts.collection.name,
      itemId: transfer.tokenId,
      itemName: item?.name ?? `${nodeConfig.contracts.collection.name} #${transfer.tokenId}`,
      from: shortenAddress(transfer.fromAddress),
      to: shortenAddress(transfer.toAddress),
      fromAddress: transfer.fromAddress,
      toAddress: transfer.toAddress,
      priceRaw: "0",
      priceDisplay: transfer.eventType === "mint" ? "Mint" : "-",
      ageLabel: ageLabel(transfer.createdAt),
      createdAt: transfer.createdAt
    };
  });

  const activities = [...saleActivities, ...listingActivities, ...transferActivities].sort(
    (left, right) => timestampValue(right.createdAt) - timestampValue(left.createdAt)
  );

  const totalVolumeRaw = sales.reduce(
    (sum, sale) => sum + BigInt(sale.priceRaw),
    0n
  );
  const floorListing = activeListings
    .slice()
    .sort((left, right) => BigInt(left.priceRaw) < BigInt(right.priceRaw) ? -1 : 1)[0] ?? null;
  const listedPercent = items.length
    ? (activeListings.length / items.length) * 100
    : 0;

  const holderCount = holderRows.length;
  const firstItem = items[0] ?? null;
  const creatorProfile = {
    slug: creatorSlug,
    name: creatorName,
    verified: true,
    bio: `${nodeConfig.contracts.collection.name} on ${nodeConfig.network.chainName}.`,
    avatarUrl: firstItem?.imageUrl ?? placeholderSvg(creatorName, "Creator"),
    bannerUrl: firstItem?.imageUrl ?? placeholderSvg(nodeConfig.contracts.collection.name, "Collection"),
    followers: 0,
    following: 0,
    items: items.length,
    volume: formatCompactNative(totalVolumeRaw.toString())
  } satisfies ProfileSummary;

  const holders = await Promise.all(
    holderRows.map(async (holder) => ({
      ...(await buildProfile(holder.ownerAddress, holder.quantity, totalVolumeRaw.toString())),
      ownerAddress: holder.ownerAddress,
      quantity: Number(holder.quantity),
      share: items.length ? formatPercent((Number(holder.quantity) / items.length) * 100) : "0%"
    }))
  );

  const collection: CollectionSummary = {
    slug: collectionSlug,
    name: nodeConfig.contracts.collection.name,
    creatorSlug,
    creatorName,
    verified: runtimeState.contracts.collection,
    chain: nodeConfig.network.chainName,
    category: "NFTs",
    description: `${nodeConfig.contracts.collection.name} on ${nodeConfig.network.chainName}.`,
    avatarUrl: firstItem?.imageUrl ?? placeholderSvg(nodeConfig.contracts.collection.symbol, "Collection"),
    bannerUrl: firstItem?.imageUrl ?? placeholderSvg(nodeConfig.contracts.collection.name, "Collection"),
    contractAddress: collectionAddress,
    items: items.length,
    owners: holderCount,
    floorPriceRaw: floorListing?.priceRaw ?? "0",
    totalVolumeRaw: totalVolumeRaw.toString(),
    listedPercent,
    floorDisplay: floorListing ? formatNative(floorListing.priceRaw) : "No listings",
    volumeDisplay: formatCompactNative(totalVolumeRaw.toString()),
    stats: [
      { label: "Items", value: String(items.length), change: "Live" },
      { label: "Owners", value: String(holderCount), change: "Indexed" },
      { label: "Listed", value: formatPercent(listedPercent), change: "Active" }
    ],
    featuredImageUrls: items.slice(0, 5).map((item) => item.imageUrl),
    visualVariant: "generic",
    theme: liveTheme,
    heroLayout: "collection",
    statsLayout: "right",
    showStickyActionBar: runtimeState.contracts.marketplace,
    hero: {
      title: nodeConfig.contracts.collection.name,
      subtitle: `By ${creatorName}`,
      badges: [
        nodeConfig.network.key.toUpperCase(),
        nodeConfig.network.nativeCurrency.symbol,
        `${items.length} items`
      ],
      metrics: [
        { label: "Floor Price", value: floorListing ? formatNative(floorListing.priceRaw) : "No listings" },
        { label: "Top Offer", value: "Not supported" },
        { label: "Total Volume", value: formatCompactNative(totalVolumeRaw.toString()) }
      ],
      backgroundUrl: firstItem?.imageUrl ?? placeholderSvg(nodeConfig.contracts.collection.name, "Collection")
    },
    tableMetrics: {
      floor: floorListing ? formatNative(floorListing.priceRaw) : "No listings",
      change: "Live",
      topOffer: "Not supported",
      volume: formatCompactNative(totalVolumeRaw.toString()),
      sales: String(sales.length),
      owners: String(holderCount),
      listed: formatPercent(listedPercent)
    },
    actionBar: {
      primary: floorListing ? "Buy floor" : "List item",
      secondary: "Sell",
      tertiary: "Activity"
    },
    badgeText: nodeConfig.network.nativeCurrency.symbol
  };

  return {
    collection,
    items,
    activities,
    holders,
    activeListings,
    creatorProfile
  };
}

function isLiveReadyCollection(record: CreatorCollectionRecord) {
  return record.status.toLowerCase() === "ready" && Boolean(record.contractAddress.trim());
}

function dedupeCollections<T extends { slug: string; contractAddress: string }>(
  collections: T[]
) {
  const seen = new Set<string>();
  return collections.filter((collection) => {
    const key = (collection.contractAddress || collection.slug).toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function dedupeActivities(entries: ActivityRecord[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.id)) {
      return false;
    }
    seen.add(entry.id);
    return true;
  });
}

async function buildDiscoverCollections() {
  const statePromise = buildMarketState();
  const creatorCollectionsPromise = listCreatorCollections();
  const [state, creatorCollections] = await Promise.all([
    statePromise,
    creatorCollectionsPromise
  ]);
  const readyCollections = creatorCollections.filter(isLiveReadyCollection);
  const creatorDetails = await Promise.all(
    readyCollections.map((record) => buildCreatorCollectionDetail(record, []))
  );

  const creatorEntries = creatorDetails.map((detail, index) => ({
    collection: detail.collection,
    activities: detail.activities,
    updatedAt: readyCollections[index]?.updatedAt ?? readyCollections[index]?.createdAt ?? ""
  }));
  const legacyEntries = state.collection
    ? [
        {
          collection: state.collection,
          activities: state.activities,
          updatedAt: ""
        }
      ]
    : [];
  const liveCollections = dedupeCollections(
    [...creatorEntries, ...legacyEntries]
      .sort((left, right) => timestampValue(right.updatedAt) - timestampValue(left.updatedAt))
      .map((entry) => entry.collection)
  );
  const activityFeed = dedupeActivities([
    ...creatorEntries.flatMap((entry) => entry.activities),
    ...state.activities
  ]).sort((left, right) => timestampValue(right.createdAt) - timestampValue(left.createdAt));

  return {
    liveCollections,
    activityFeed,
    state
  };
}

async function buildCreatorCollectionDetail(
  draft: CreatorCollectionRecord,
  relatedCollections: CollectionSummary[]
): Promise<CollectionDetail> {
  const baseCollection = await toPublicCreatorCollectionSummary(draft);

  if (!draft.contractAddress) {
    return {
      collection: baseCollection,
      items: [],
      activities: [],
      holders: [],
      offers: [],
      analytics: [
        {
          label: "Collection status",
          value: draft.status,
          points: [20, 30, 40, 55, 65]
        }
      ],
      relatedCollections,
      about: [
        baseCollection.description,
        "This is a saved creator collection draft.",
        `Owner: ${draft.ownerAddress}`
      ],
      traitHighlights: []
    };
  }

  const creatorCollectionAddress = draft.contractAddress.toLowerCase();
  const [nfts, activeListings, sales, transfers, holderRows] = await Promise.all([
    listNfts(creatorCollectionAddress),
    listListings({ collectionAddress: creatorCollectionAddress, status: "active" }),
    listSales(200, creatorCollectionAddress),
    listTransfers(200, { collectionAddress: creatorCollectionAddress }),
    listHolders(creatorCollectionAddress)
  ]);

  const listingsByToken = new Map(activeListings.map((listing) => [listing.tokenId, listing]));
  const latestSaleByToken = new Map<string, SaleRecord>();
  for (const sale of sales) {
    if (!latestSaleByToken.has(sale.tokenId)) {
      latestSaleByToken.set(sale.tokenId, sale);
    }
  }

  const defaultItemImage =
    baseCollection.avatarUrl ||
    placeholderSvg(draft.name, draft.symbol || "Collection", "#2081e2");

  const items = await Promise.all(nfts.map(async (nft, index) => {
    const listing = listingsByToken.get(nft.tokenId) ?? null;
    const latestSale = latestSaleByToken.get(nft.tokenId) ?? null;
    const attributes = Array.isArray(nft.attributes) ? nft.attributes : [];
    const ownerAddress = listing?.seller ?? nft.ownerAddress;
    const creatorAddress = nft.creatorAddress || draft.ownerAddress;
    const imageUrl = await resolvePublicNftImage(nft, {
      collectionSlug: draft.slug,
      collectionName: draft.name,
      collectionAvatarUrl: baseCollection.avatarUrl
    });

    return {
      id: `${nft.collectionAddress}:${nft.tokenId}`,
      contractAddress: nft.collectionAddress,
      tokenId: nft.tokenId,
      collectionSlug: draft.slug,
      collectionName: draft.name,
      name: nft.name || `${draft.name} #${nft.tokenId}`,
      description: nft.description,
      imageUrl,
      ownerName: shortenAddress(ownerAddress),
      ownerAddress,
      creatorName: shortenAddress(creatorAddress),
      creatorAddress,
      listed: Boolean(listing),
      listingId: listing?.listingId,
      seller: listing?.seller,
      currencySymbol: nodeConfig.network.nativeCurrency.symbol,
      currentPriceRaw: listing?.priceRaw ?? "0",
      lastSaleRaw: latestSale?.priceRaw ?? "0",
      highestOfferRaw: "0",
      currentPriceDisplay: listing ? formatNative(listing.priceRaw) : "Not listed",
      lastSaleDisplay: latestSale ? formatNative(latestSale.priceRaw) : "No sales yet",
      highestOfferDisplay: "No offers",
      thumbnailUrls: [imageUrl],
      rankDisplay: `#${index + 1}`,
      traits: attributes.map((attribute, attributeIndex) => ({
        type: String(attribute.trait_type ?? `Trait ${attributeIndex + 1}`),
        value: String(attribute.value ?? "Unknown"),
        rarity: rarityLabel(attributeIndex + 1, Math.max(attributes.length, 1))
      }))
    } satisfies ItemRecord;
  }));

  const itemMap = new Map(items.map((item) => [item.tokenId, item]));
  const listingActivities = activeListings.map((listing) => {
    const item = itemMap.get(listing.tokenId);
    return {
      id: `listing-${listing.listingId}`,
      type: "listing",
      collectionSlug: draft.slug,
      collectionAddress: creatorCollectionAddress,
      collectionName: draft.name,
      itemId: listing.tokenId,
      itemName: item?.name ?? `${draft.name} #${listing.tokenId}`,
      from: shortenAddress(listing.seller),
      to: "marketplace",
      fromAddress: listing.seller,
      toAddress: nodeConfig.contracts.marketplace.address || "",
      priceRaw: listing.priceRaw,
      priceDisplay: formatNative(listing.priceRaw),
      ageLabel: ageLabel(listing.createdAt),
      createdAt: listing.createdAt
    };
  });

  const saleActivities = sales.map((sale) => {
    const item = itemMap.get(sale.tokenId);
    return {
      id: `sale-${sale.txHash}`,
      type: "sale",
      collectionSlug: draft.slug,
      collectionAddress: creatorCollectionAddress,
      collectionName: draft.name,
      itemId: sale.tokenId,
      itemName: item?.name ?? `${draft.name} #${sale.tokenId}`,
      from: shortenAddress(sale.seller),
      to: shortenAddress(sale.buyer),
      fromAddress: sale.seller,
      toAddress: sale.buyer,
      priceRaw: sale.priceRaw,
      priceDisplay: formatNative(sale.priceRaw),
      ageLabel: ageLabel(sale.createdAt),
      createdAt: sale.createdAt
    };
  });

  const transferActivities = transfers.map((transfer) => {
    const item = itemMap.get(transfer.tokenId);
    return {
      id: `transfer-${transfer.txHash}-${transfer.logIndex}`,
      type: transfer.eventType,
      collectionSlug: draft.slug,
      collectionAddress: creatorCollectionAddress,
      collectionName: draft.name,
      itemId: transfer.tokenId,
      itemName: item?.name ?? `${draft.name} #${transfer.tokenId}`,
      from: shortenAddress(transfer.fromAddress),
      to: shortenAddress(transfer.toAddress),
      fromAddress: transfer.fromAddress,
      toAddress: transfer.toAddress,
      priceRaw: "0",
      priceDisplay: transfer.eventType === "mint" ? "Mint" : "-",
      ageLabel: ageLabel(transfer.createdAt),
      createdAt: transfer.createdAt
    };
  });

  const activities = [...saleActivities, ...listingActivities, ...transferActivities].sort(
    (left, right) => timestampValue(right.createdAt) - timestampValue(left.createdAt)
  );

  const totalVolumeRaw = sales.reduce((sum, sale) => sum + BigInt(sale.priceRaw), 0n);
  const floorListing =
    activeListings
      .slice()
      .sort((left, right) => (BigInt(left.priceRaw) < BigInt(right.priceRaw) ? -1 : 1))[0] ?? null;
  const listedPercent = items.length ? (activeListings.length / items.length) * 100 : 0;
  const holderCount = holderRows.length;
  const firstItem = items[0] ?? null;
  const featuredPreviewImages = items
    .slice(0, 5)
    .map((item) => normalizePublicMediaUrl(item.imageUrl) || baseCollection.avatarUrl);
  const heroBackgroundImage =
    (firstItem ? normalizePublicMediaUrl(firstItem.imageUrl) : "") ||
    baseCollection.bannerUrl;
  const holders = await Promise.all(
    holderRows.map(async (holder) => ({
      ...(await buildProfile(holder.ownerAddress, holder.quantity, totalVolumeRaw.toString())),
      ownerAddress: holder.ownerAddress,
      quantity: Number(holder.quantity),
      share: items.length ? formatPercent((Number(holder.quantity) / items.length) * 100) : "0%"
    }))
  );

  const collection: CollectionSummary = {
    ...baseCollection,
    items: items.length,
    owners: holderCount,
    floorPriceRaw: floorListing?.priceRaw ?? "0",
    totalVolumeRaw: totalVolumeRaw.toString(),
    listedPercent,
    floorDisplay: floorListing ? formatNative(floorListing.priceRaw) : "No listings",
    volumeDisplay: formatCompactNative(totalVolumeRaw.toString()),
    stats: [
      { label: "Items", value: String(items.length), change: "Indexed" },
      { label: "Owners", value: String(holderCount), change: "Indexed" },
      { label: "Listed", value: formatPercent(listedPercent), change: activeListings.length ? "Active" : "Idle" }
    ],
    featuredImageUrls: featuredPreviewImages.length > 0 ? featuredPreviewImages : [baseCollection.avatarUrl],
    showStickyActionBar: runtimeState.contracts.marketplace && baseCollection.verified,
    hero: {
      title: draft.name,
      subtitle: `By ${shortenAddress(draft.ownerAddress)}`,
      badges: [
        (draft.chainKey || nodeConfig.network.key).toUpperCase(),
        (draft.standard || "ERC721").toUpperCase(),
        formatCreatorCollectionStatus(draft.status).toUpperCase()
      ],
      metrics: [
        { label: "Floor Price", value: floorListing ? formatNative(floorListing.priceRaw) : "No listings" },
        { label: "Top Offer", value: "No offers" },
        { label: "Total Volume", value: formatCompactNative(totalVolumeRaw.toString()) }
      ],
      backgroundUrl: heroBackgroundImage
    },
    tableMetrics: {
      floor: floorListing ? formatNative(floorListing.priceRaw) : "No listings",
      change: formatCreatorCollectionStatus(draft.status),
      topOffer: "No offers",
      volume: formatCompactNative(totalVolumeRaw.toString()),
      sales: String(sales.length),
      owners: String(holderCount),
      listed: formatPercent(listedPercent)
    }
  };

  return {
    collection,
    items,
    activities,
    holders,
    offers: [],
    analytics: analyticsFromActivity(activities, items.length),
    relatedCollections,
    about: [
      collection.description,
      `Contract: ${draft.contractAddress}`,
      `Owner: ${draft.ownerAddress}`
    ],
    traitHighlights: buildTraitHighlights(items)
  };
}

function buildTraitHighlights(items: ItemRecord[]) {
  const traitMap = new Map<string, Map<string, number>>();
  for (const item of items) {
    for (const trait of item.traits) {
      if (!traitMap.has(trait.type)) {
        traitMap.set(trait.type, new Map());
      }
      const valueMap = traitMap.get(trait.type)!;
      valueMap.set(trait.value, (valueMap.get(trait.value) ?? 0) + 1);
    }
  }

  return Array.from(traitMap.entries()).map(([type, values]) => ({
    type,
    topValues: Array.from(values.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([value]) => value)
  }));
}

function analyticsFromActivity(activities: ActivityRecord[], itemCount: number) {
  const sales = activities.filter((entry) => entry.type === "sale").length;
  const listings = activities.filter((entry) => entry.type === "listing").length;
  const transfers = activities.filter((entry) => entry.type === "transfer" || entry.type === "mint").length;
  return [
    {
      label: "Live inventory",
      value: `${itemCount} NFTs`,
      points: [25, 45, 60, 80, 100]
    },
    {
      label: "Listings",
      value: `${listings}`,
      points: [10, 30, 45, 55, 65]
    },
    {
      label: "Sales",
      value: `${sales}`,
      points: [5, 15, 25, 35, 50]
    },
    {
      label: "Transfers",
      value: `${transfers}`,
      points: [15, 20, 40, 48, 55]
    }
  ];
}

export async function getBootstrapData(): Promise<BootstrapResponse> {
  const [{ liveCollections, activityFeed, state }, drops] = await Promise.all([
    buildDiscoverCollections(),
    listAdminDrops({ stage: "live" })
  ]);
  const featuredCollections = liveCollections;
  const routeMap = [
    { label: "Discover", href: "/", scope: "public" },
    { label: "Collections", href: "/collections", scope: "public" },
    { label: "Activity", href: "/activity", scope: "public" }
  ];
  const primaryCollection = liveCollections[0] ?? state.collection;
  if (primaryCollection) {
    routeMap.push({
      label: "Collection",
      href: `/collection/${primaryCollection.slug}`,
      scope: "collection"
    });
  }
  return {
    config: publicConfig,
    routeMap,
    featuredCollections,
    trendingCollections: featuredCollections,
    topTokens: [],
    liveDrops: drops.map(toDropRecord),
    recentActivity: activityFeed.slice(0, 10)
  };
}

export async function getDiscoverData() {
  const [{ liveCollections, activityFeed }, drops] = await Promise.all([
    buildDiscoverCollections(),
    listAdminDrops({ stage: "live" })
  ]);
  return {
    heroCollection: liveCollections[0] ?? null,
    leaderboardCollections: liveCollections.slice(0, 8),
    trendingCollections: liveCollections.slice(0, 4),
    topMovers: liveCollections.slice(0, 6),
    liveDrops: drops.map(toDropRecord),
    tokenLeaders: [] as TokenRecord[],
    activityFeed: activityFeed.slice(0, 8)
  };
}

export async function getCollectionsData(filters: {
  search: string;
  sort: string;
  category: string;
  view?: string;
  timeframe?: string;
}) {
  const [state, draftCollections] = await Promise.all([
    buildMarketState(),
    listCreatorCollections()
  ]);
  const collections = [
    ...(state.collection ? [state.collection] : []),
    ...(await Promise.all(draftCollections.map((record) => toPublicCreatorCollectionSummary(record))))
  ];
  const normalizedSearch = filters.search.trim().toLowerCase();
  return {
    filters: {
      search: filters.search,
      sort: filters.sort || "volume",
      category: filters.category || "all",
      view: filters.view || "top",
      timeframe: filters.timeframe || "1d"
    },
    collections: normalizedSearch
      ? dedupeCollections(collections).filter((collection) =>
          collection.name.toLowerCase().includes(normalizedSearch) ||
          collection.description.toLowerCase().includes(normalizedSearch)
        )
      : dedupeCollections(collections)
  };
}

export async function getCollectionData(slug: string): Promise<CollectionDetail | null> {
  const normalizedSlug = slug.toLowerCase();
  const state = await buildMarketState();

  if (normalizedSlug !== collectionSlug) {
    const draft = await getCreatorCollectionBySlug(normalizedSlug);
    if (!draft) {
      return null;
    }
    return buildCreatorCollectionDetail(draft, state.collection ? [state.collection] : []);
  }

  if (!state.collection) {
    return null;
  }

  return {
    collection: state.collection,
    items: state.items,
    activities: state.activities,
    holders: state.holders,
    offers: [],
    analytics: analyticsFromActivity(state.activities, state.items.length),
    relatedCollections: [],
    about: [
      state.collection.description,
      `Contract: ${nodeConfig.contracts.collection.address}`,
      `Chain: ${nodeConfig.network.chainName}`
    ],
    traitHighlights: buildTraitHighlights(state.items)
  };
}

export async function getItemData(contract: string, tokenId: string) {
  if (contract.toLowerCase() !== collectionAddress) {
    const creatorCollection = await getCreatorCollectionByAddress(contract);
    if (!creatorCollection) {
      return null;
    }

    const detail = await getCollectionData(creatorCollection.slug);
    if (!detail) {
      return null;
    }

    const item = detail.items.find((entry) => entry.tokenId === tokenId);
    if (!item) {
      return null;
    }

    const itemActivity = detail.activities.filter((entry) => entry.itemId === tokenId).slice(0, 20);
    const ownerLabel = item.listed
      ? `Listed by ${shortenAddress(item.seller ?? item.ownerAddress)}`
      : `Owned by ${shortenAddress(item.ownerAddress)}`;

    return {
      presentation: "modal" as const,
      item,
      collection: detail.collection,
      activity: itemActivity,
      relatedItems: detail.items.filter((entry) => entry.tokenId !== tokenId).slice(0, 6),
      mediaStrip: uniqueMediaStrip([item.imageUrl, ...item.thumbnailUrls]).slice(0, 8),
      detailTabs: ["Details", "Orders", "Activity"],
      defaultTab: "Details",
      metaBadges: [
        creatorCollection.symbol.toUpperCase(),
        creatorCollection.chainName.toUpperCase(),
        `TOKEN #${tokenId}`
      ],
      ownerLabel,
      backHref: `/collection/${creatorCollection.slug}`,
      closeHref: `/collection/${creatorCollection.slug}`,
      buyPanel: {
        topOffer: "No offers",
        collectionFloor: detail.collection.floorDisplay,
        rarity: item.rankDisplay ?? `#${tokenId}`,
        lastSale: item.lastSaleDisplay,
        price: item.currentPriceDisplay,
        usd: `Settles in ${nodeConfig.network.nativeCurrency.symbol}`,
        buttonLabel: item.listed ? "Buy now" : "List item"
      },
      liveTradingAvailable: runtimeState.contracts.marketplace
    };
  }

  const [state, listing, nft] = await Promise.all([
    buildMarketState(),
    getListingByToken(collectionAddress, tokenId),
    getNft(collectionAddress, tokenId)
  ]);

  const item = state.items.find((entry) => entry.tokenId === tokenId);
  if (!item || !state.collection) {
    return null;
  }

  const itemActivity = state.activities.filter((entry) => entry.itemId === tokenId).slice(0, 20);
  const ownerLabel = item.listed
    ? `Listed by ${shortenAddress(listing?.seller ?? nft?.ownerAddress ?? item.ownerAddress)}`
    : `Owned by ${shortenAddress(item.ownerAddress)}`;

  return {
    presentation: "modal" as const,
    item,
    collection: state.collection,
    activity: itemActivity,
    relatedItems: state.items.filter((entry) => entry.tokenId !== tokenId).slice(0, 6),
    mediaStrip: uniqueMediaStrip([item.imageUrl, ...item.thumbnailUrls]).slice(0, 8),
    detailTabs: ["Details", "Orders", "Activity"],
    defaultTab: "Details",
    metaBadges: [
      nodeConfig.contracts.collection.symbol.toUpperCase(),
      nodeConfig.network.chainName.toUpperCase(),
      `TOKEN #${tokenId}`
    ],
    ownerLabel,
    backHref: `/collection/${collectionSlug}`,
    closeHref: `/collection/${collectionSlug}`,
    buyPanel: {
      topOffer: "Not supported",
      collectionFloor: state.collection.floorDisplay,
      rarity: item.rankDisplay ?? `#${tokenId}`,
      lastSale: item.lastSaleDisplay,
      price: item.currentPriceDisplay,
      usd: `Settles in ${nodeConfig.network.nativeCurrency.symbol}`,
      buttonLabel: item.listed ? "Buy now" : "List item"
    },
    liveTradingAvailable: runtimeState.contracts.collection && runtimeState.contracts.marketplace
  };
}

export async function getTokensData(filters: { search: string; sort: string }) {
  return {
    filters,
    tokens: [] as TokenRecord[]
  };
}

export async function getActivityData(filters: { type: string; search: string }) {
  const { activityFeed } = await buildDiscoverCollections();
  const normalizedSearch = filters.search.trim().toLowerCase();
  const activities = activityFeed.filter((entry) => {
    const matchesType = !filters.type || filters.type === "all" ? true : entry.type === filters.type;
    const matchesSearch = !normalizedSearch
      ? true
      : [
          entry.itemName,
          entry.collectionSlug,
          entry.from,
          entry.to
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
    return matchesType && matchesSearch;
  });
  return {
    filters,
    activities
  };
}

export async function getDropsData(filters: { stage: string }) {
  const drops = await listAdminDrops({ stage: filters.stage || "all" });
  return {
    filters,
    drops: drops.map(toDropRecord)
  };
}

export async function getRewardsData(): Promise<RewardsRecord> {
  return {
    totalPoints: "-",
    rank: "-",
    streak: "-",
    tasks: []
  };
}

export async function getStudioData(): Promise<StudioRecord> {
  return {
    headline: "Studio is unavailable in this environment",
    subtitle: "This environment does not have Studio features enabled.",
    quickActions: []
  };
}

function toLegacyCollectionDetail(state: MarketState): CollectionDetail | null {
  if (!state.collection) {
    return null;
  }

  return {
    collection: state.collection,
    items: state.items,
    activities: state.activities,
    holders: state.holders,
    offers: [],
    analytics: analyticsFromActivity(state.activities, state.items.length),
    relatedCollections: [],
    about: [
      state.collection.description,
      `Contract: ${nodeConfig.contracts.collection.address}`,
      `Chain: ${nodeConfig.network.chainName}`
    ],
    traitHighlights: buildTraitHighlights(state.items)
  };
}

function dedupeItems(items: ItemRecord[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function dedupeNftRecords(records: NftRecord[]) {
  const seen = new Set<string>();
  return records.filter((record) => {
    const key = `${record.collectionAddress.toLowerCase()}:${record.tokenId}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function buildProfileTokenHoldings(address: string) {
  const holdings: ProfileTokenHolding[] = [];

  let nativeBalanceRaw = "0";
  try {
    nativeBalanceRaw = (await profileProvider.getBalance(address)).toString();
  } catch {
    nativeBalanceRaw = "0";
  }

  holdings.push({
    id: `${nodeConfig.network.key}-native`,
    name: nodeConfig.network.nativeCurrency.name,
    symbol: nodeConfig.network.nativeCurrency.symbol,
    contractAddress: "",
    chain: nodeConfig.network.chainName,
    iconUrl: tokenIcon(nodeConfig.network.nativeCurrency.symbol, nodeConfig.network.nativeCurrency.name),
    balanceRaw: nativeBalanceRaw,
    balanceDisplay: `${formatTokenBalance(nativeBalanceRaw, nodeConfig.network.nativeCurrency.decimals)} ${nodeConfig.network.nativeCurrency.symbol}`,
    valueDisplay: formatCompactNative(nativeBalanceRaw),
    includedInPortfolio: true,
    isNative: true
  });

  const managedHoldings: Array<ProfileTokenHolding | null> = await Promise.all(
    managedProfileTokens
      .filter((token) => token.type === "erc20" && token.address)
      .map(async (token) => {
        try {
          const contract = new Contract(token.address ?? "", erc20BalanceAbi, profileProvider);
          const balance = await contract.balanceOf(address);
          const balanceRaw = balance.toString();
          if (balanceRaw === "0") {
            return null;
          }
          return {
            id: token.key,
            name: token.displayName,
            symbol: token.symbol,
            contractAddress: token.address ?? "",
            chain: nodeConfig.network.chainName,
            iconUrl: token.iconUrl || tokenIcon(token.symbol, token.displayName),
            balanceRaw,
            balanceDisplay: `${formatTokenBalance(balanceRaw, token.decimals)} ${token.symbol}`,
            valueDisplay: `${formatTokenBalance(balanceRaw, token.decimals)} ${token.symbol}`,
            includedInPortfolio: Boolean(token.includeInPortfolio),
            isNative: false
          } satisfies ProfileTokenHolding;
        } catch {
          return null;
        }
      })
  );

  return [...holdings, ...managedHoldings.filter((token): token is ProfileTokenHolding => token !== null)];
}

function buildProfileGalleries(
  items: ItemRecord[],
  collectionsByAddress: Map<string, CollectionSummary>
) {
  const groups = new Map<string, ItemRecord[]>();
  for (const item of items) {
    const key = item.contractAddress.toLowerCase();
    const entries = groups.get(key) ?? [];
    entries.push(item);
    groups.set(key, entries);
  }

  return Array.from(groups.entries())
    .map(([collectionAddressKey, galleryItems]) => {
      const lead = galleryItems[0];
      const collection = collectionsByAddress.get(collectionAddressKey);
      return {
        id: collection?.slug ?? collectionAddressKey,
        collectionSlug: collection?.slug ?? lead.collectionSlug,
        collectionName: collection?.name ?? lead.collectionName,
        collectionDescription: collection?.description ?? `${galleryItems.length} items`,
        contractAddress: collection?.contractAddress ?? lead.contractAddress,
        creatorName: collection?.creatorName ?? lead.creatorName,
        avatarUrl: collection?.avatarUrl ?? lead.imageUrl,
        bannerUrl: collection?.bannerUrl ?? collection?.avatarUrl ?? lead.imageUrl,
        floorDisplay: collection?.floorDisplay ?? "No listings",
        listedCount: galleryItems.filter((item) => item.listed).length,
        itemCount: galleryItems.length,
        itemsPreview: galleryItems.slice(0, 4)
      } satisfies ProfileGalleryRecord;
    })
    .sort((left, right) => right.itemCount - left.itemCount || left.collectionName.localeCompare(right.collectionName));
}

function buildProfilePortfolioSummary(input: {
  items: ItemRecord[];
  listings: ItemRecord[];
  tokens: ProfileTokenHolding[];
  galleries: ProfileGalleryRecord[];
  collectionsByAddress: Map<string, CollectionSummary>;
}) {
  const nativeToken = input.tokens.find((token) => token.isNative);
  const tokenValueRaw = BigInt(nativeToken?.balanceRaw ?? "0");
  let nftValueRaw = 0n;
  let listedValueRaw = 0n;

  for (const item of input.items) {
    if (item.listed) {
      listedValueRaw += BigInt(item.currentPriceRaw || "0");
      continue;
    }

    const collection = input.collectionsByAddress.get(item.contractAddress.toLowerCase());
    nftValueRaw += BigInt(collection?.floorPriceRaw || "0");
  }

  const totalValueRaw = tokenValueRaw + nftValueRaw + listedValueRaw;

  return {
    totalValueDisplay: formatCompactNative(totalValueRaw.toString()),
    tokenValueDisplay: nativeToken?.valueDisplay ?? `0 ${nodeConfig.network.nativeCurrency.symbol}`,
    nftValueDisplay: formatCompactNative(nftValueRaw.toString()),
    listedValueDisplay: formatCompactNative(listedValueRaw.toString()),
    collectionCount: input.galleries.length,
    itemCount: input.items.length,
    listingCount: input.listings.length,
    tokenCount: input.tokens.length,
    summaryCards: [
      {
        label: "Total value",
        value: formatCompactNative(totalValueRaw.toString()),
        note: "Live REEF-marked value across wallet, NFTs, and listings."
      },
      {
        label: "Token balance",
        value: nativeToken?.balanceDisplay ?? `0 ${nodeConfig.network.nativeCurrency.symbol}`,
        note: `${input.tokens.length} tracked token holdings on Reef.`
      },
      {
        label: "NFT holdings",
        value: formatCompactNative(nftValueRaw.toString()),
        note: `${input.items.length} items across ${input.galleries.length} collections.`
      },
      {
        label: "Active listings",
        value: formatCompactNative(listedValueRaw.toString()),
        note: `${input.listings.length} items currently listed by this wallet.`
      }
    ]
  } satisfies ProfilePortfolioSummary;
}

function buildCollectionCreateActivities(records: CreatorCollectionRecord[]) {
  return records.map((record) => ({
    id: `create-collection-${record.slug}`,
    type: "create-collection",
    collectionSlug: record.slug,
    collectionAddress: record.contractAddress || "",
    collectionName: record.name,
    itemId: record.slug,
    itemName: record.name,
    from: shortenAddress(record.ownerAddress),
    to: record.contractAddress ? "contract deployed" : "draft saved",
    fromAddress: record.ownerAddress,
    toAddress: record.contractAddress || record.factoryAddress,
    priceRaw: "0",
    priceDisplay: "-",
    ageLabel: ageLabel(record.createdAt),
    createdAt: record.createdAt,
    statusLabel: formatCreatorCollectionStatus(record.status)
  } satisfies ActivityRecord));
}

async function resolveProfileAddress(slug: string, state: MarketState) {
  const normalizedSlug = slug.toLowerCase();
  if (normalizedSlug.startsWith("0x")) {
    return normalizedSlug;
  }
  if (normalizedSlug === creatorSlug) {
    return ZeroAddressLike;
  }
  const holder = state.holders.find((entry) => entry.slug === normalizedSlug);
  return holder?.ownerAddress ?? null;
}

async function buildProfileCollectionContext(input: {
  address: string;
  state: MarketState;
  creatorCollections: CreatorCollectionRecord[];
  referencedNfts: NftRecord[];
}) {
  const collectionsByAddress = new Map<string, CollectionSummary>();
  const detailsByAddress = new Map<string, CollectionDetail>();
  const legacyDetail = toLegacyCollectionDetail(input.state);
  const needsLegacy =
    Boolean(legacyDetail) &&
    (sameAddress(input.address, ZeroAddressLike) ||
      input.creatorCollections.some((record) => sameAddress(record.contractAddress, collectionAddress)) ||
      input.referencedNfts.some((nft) => sameAddress(nft.collectionAddress, collectionAddress)));

  if (legacyDetail && needsLegacy) {
    detailsByAddress.set(collectionAddress, legacyDetail);
    collectionsByAddress.set(collectionAddress, legacyDetail.collection);
  }

  const creatorRecordMap = new Map<string, CreatorCollectionRecord>();
  for (const record of input.creatorCollections) {
    if (record.contractAddress) {
      creatorRecordMap.set(record.contractAddress.toLowerCase(), record);
    }
  }

  const referencedAddresses = Array.from(
    new Set(
      [
        ...input.creatorCollections.map((record) => record.contractAddress.toLowerCase()).filter(Boolean),
        ...input.referencedNfts.map((nft) => nft.collectionAddress.toLowerCase())
      ].filter(Boolean)
    )
  );

  for (const address of referencedAddresses) {
    if (sameAddress(address, collectionAddress) || detailsByAddress.has(address)) {
      continue;
    }
    if (!creatorRecordMap.has(address)) {
      const record = await getCreatorCollectionByAddress(address);
      if (record) {
        creatorRecordMap.set(address, record);
      }
    }
  }

  for (const [address, record] of creatorRecordMap.entries()) {
    if (detailsByAddress.has(address)) {
      continue;
    }
    const detail = await buildCreatorCollectionDetail(record, []);
    detailsByAddress.set(address, detail);
    collectionsByAddress.set(address, detail.collection);
  }

  return {
    detailsByAddress,
    collectionsByAddress
  };
}

export async function getProfileData(slug: string): Promise<ProfileResponse | null> {
  const state = await buildMarketState();
  const address = await resolveProfileAddress(slug, state);

  if (!address) {
    return null;
  }

  const normalizedAddress = address.toLowerCase();
  const [creatorCollectionRecords, ownedNfts, createdNfts, walletSales, walletTransfers, tokens] = await Promise.all([
    normalizedAddress === ZeroAddressLike ? listCreatorCollections(ZeroAddressLike) : listCreatorCollections(normalizedAddress),
    normalizedAddress === ZeroAddressLike ? [] : listOwnedNftsForAddress(normalizedAddress),
    normalizedAddress === ZeroAddressLike ? state.items.map((item) => ({
      collectionSlug: item.collectionSlug,
      collectionAddress: item.contractAddress,
      tokenId: item.tokenId,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      metadataUri: "",
      ownerAddress: item.ownerAddress,
      creatorAddress: item.creatorAddress,
      attributes: item.traits.map((trait) => ({ trait_type: trait.type, value: trait.value })),
      mintedAt: "",
      updatedAt: ""
    } satisfies NftRecord)) : listCreatedNftsForAddress(normalizedAddress),
    listSales(250, undefined, normalizedAddress),
    listTransfers(250, { address: normalizedAddress }),
    buildProfileTokenHoldings(normalizedAddress)
  ]);

  const referencedNfts = dedupeNftRecords([...ownedNfts, ...createdNfts]);

  const { detailsByAddress, collectionsByAddress } = await buildProfileCollectionContext({
    address: normalizedAddress,
    state,
    creatorCollections: creatorCollectionRecords,
    referencedNfts
  });

  const allItems = dedupeItems(Array.from(detailsByAddress.values()).flatMap((detail) => detail.items));
  const ownedItems = allItems
    .filter((item) => sameAddress(item.ownerAddress, normalizedAddress))
    .sort((left, right) => Number(right.tokenId) - Number(left.tokenId));
  const createdItems = allItems
    .filter((item) => sameAddress(item.creatorAddress, normalizedAddress))
    .sort((left, right) => Number(right.tokenId) - Number(left.tokenId));
  const listings = allItems
    .filter(
      (item) => item.listed && sameAddress(item.seller ?? item.ownerAddress, normalizedAddress)
    )
    .sort((left, right) => BigInt(right.currentPriceRaw || "0") > BigInt(left.currentPriceRaw || "0") ? 1 : -1);
  const galleries = buildProfileGalleries(ownedItems, collectionsByAddress);
  const createdCollections = [
    ...(normalizedAddress === ZeroAddressLike && state.collection ? [state.collection] : []),
    ...(await Promise.all(creatorCollectionRecords.map((record) => toPublicCreatorCollectionSummary(record))))
  ].sort((left, right) => left.name.localeCompare(right.name));

  const collectionCreateActivities = buildCollectionCreateActivities(
    creatorCollectionRecords.filter((record) => sameAddress(record.ownerAddress, normalizedAddress))
  );
  const itemActivities = dedupeActivities(
    Array.from(detailsByAddress.values())
      .flatMap((detail) => detail.activities)
      .filter(
        (entry) =>
          sameAddress(entry.fromAddress, normalizedAddress) ||
          sameAddress(entry.toAddress, normalizedAddress)
      )
  );
  const saleActivities = walletSales.map((sale) => ({
    id: `wallet-sale-${sale.txHash}`,
    type: "sale",
    collectionSlug:
      collectionsByAddress.get(sale.collectionAddress.toLowerCase())?.slug ??
      sale.collectionAddress.toLowerCase(),
    collectionAddress: sale.collectionAddress,
    collectionName:
      collectionsByAddress.get(sale.collectionAddress.toLowerCase())?.name ??
      sale.collectionAddress,
    itemId: sale.tokenId,
    itemName:
      allItems.find((item) => sameAddress(item.contractAddress, sale.collectionAddress) && item.tokenId === sale.tokenId)?.name ??
      `Token #${sale.tokenId}`,
    from: shortenAddress(sale.seller),
    to: shortenAddress(sale.buyer),
    fromAddress: sale.seller,
    toAddress: sale.buyer,
    priceRaw: sale.priceRaw,
    priceDisplay: formatNative(sale.priceRaw),
    ageLabel: ageLabel(sale.createdAt),
    createdAt: sale.createdAt
  } satisfies ActivityRecord));
  const transferActivities = walletTransfers.map((transfer) => ({
    id: `wallet-transfer-${transfer.txHash}-${transfer.logIndex}`,
    type: transfer.eventType,
    collectionSlug:
      collectionsByAddress.get(transfer.collectionAddress.toLowerCase())?.slug ??
      transfer.collectionAddress.toLowerCase(),
    collectionAddress: transfer.collectionAddress,
    collectionName:
      collectionsByAddress.get(transfer.collectionAddress.toLowerCase())?.name ??
      transfer.collectionAddress,
    itemId: transfer.tokenId,
    itemName:
      allItems.find((item) => sameAddress(item.contractAddress, transfer.collectionAddress) && item.tokenId === transfer.tokenId)?.name ??
      `Token #${transfer.tokenId}`,
    from: shortenAddress(transfer.fromAddress),
    to: shortenAddress(transfer.toAddress),
    fromAddress: transfer.fromAddress,
    toAddress: transfer.toAddress,
    priceRaw: "0",
    priceDisplay: transfer.eventType === "mint" ? "Mint" : "-",
    ageLabel: ageLabel(transfer.createdAt),
    createdAt: transfer.createdAt
  } satisfies ActivityRecord));

  const activity = dedupeActivities([
    ...collectionCreateActivities,
    ...itemActivities,
    ...saleActivities,
    ...transferActivities
  ]).sort((left, right) => timestampValue(right.createdAt) - timestampValue(left.createdAt));

  const portfolio = buildProfilePortfolioSummary({
    items: ownedItems,
    listings,
    tokens,
    galleries,
    collectionsByAddress
  });
  const profileVolumeRaw = walletSales.reduce((sum, sale) => sum + BigInt(sale.priceRaw), 0n);

  return {
    profile: await buildProfile(normalizedAddress, ownedItems.length, profileVolumeRaw.toString()),
    galleries,
    items: ownedItems,
    tokens,
    portfolio,
    listings,
    offers: [],
    createdCollections,
    createdItems,
    activity
  };
}
