import { formatEther } from "ethers";

import { nodeConfig, publicConfig } from "./config.js";
import {
  getListingByToken,
  getCreatorCollectionBySlug,
  getNft,
  listAdminDrops,
  listCreatorCollections,
  listHolders,
  listListings,
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
import { runtimeState } from "./runtime.js";

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

function resolveImageUrl(nft: NftRecord | null) {
  return (
    nft?.imageUrl ||
    placeholderSvg(nodeConfig.contracts.collection.name, nodeConfig.network.chainName)
  );
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

function toDraftCollectionSummary(record: CreatorCollectionRecord): CollectionSummary {
  const accent = "#2081e2";
  const avatar = record.avatarUrl || placeholderSvg(record.name, record.symbol || "Collection", accent);
  const banner = record.bannerUrl || placeholderSvg(record.name, "Creator collection", accent, true);
  return {
    slug: record.slug,
    name: record.name,
    creatorSlug: addressToSlug(record.ownerAddress),
    creatorName: shortenAddress(record.ownerAddress),
    verified: false,
    chain: nodeConfig.network.chainName,
    category: "NFTs",
    description: record.description || `${record.name} creator collection draft on ${nodeConfig.network.chainName}.`,
    avatarUrl: avatar,
    bannerUrl: banner,
    contractAddress: "",
    items: 0,
    owners: 0,
    floorPriceRaw: "0",
    totalVolumeRaw: "0",
    listedPercent: 0,
    floorDisplay: "No listings",
    volumeDisplay: `0 ${nodeConfig.network.nativeCurrency.symbol}`,
    stats: [
      { label: "Status", value: record.status, change: "Draft" },
      { label: "Items", value: "0", change: "Pending" },
      { label: "Owners", value: "0", change: "Pending" }
    ],
    featuredImageUrls: [avatar],
    visualVariant: "generic",
    theme: liveTheme,
    heroLayout: "collection",
    statsLayout: "right",
    showStickyActionBar: false,
    hero: {
      title: record.name,
      subtitle: `By ${shortenAddress(record.ownerAddress)}`,
      badges: [nodeConfig.network.key.toUpperCase(), record.symbol.toUpperCase(), record.status.toUpperCase()],
      metrics: [
        { label: "Floor Price", value: "No listings" },
        { label: "Top Offer", value: "No offers" },
        { label: "Total Volume", value: `0 ${nodeConfig.network.nativeCurrency.symbol}` }
      ],
      backgroundUrl: banner
    },
    tableMetrics: {
      floor: "No listings",
      change: "Draft",
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
    badgeText: record.status.toUpperCase()
  };
}

function buildProfile(address: string, itemCount = 0, volume = "0") {
  const safeAddress = address || ZeroAddressLike;
  return {
    slug: addressToSlug(safeAddress),
    name: shortenAddress(safeAddress),
    verified: false,
    bio: `Collector on ${nodeConfig.network.chainName}.`,
    avatarUrl: placeholderSvg(shortenAddress(safeAddress), "Collector", "#0ea5e9"),
    bannerUrl: placeholderSvg(shortenAddress(safeAddress), "Profile", "#1d4ed8"),
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

  const items = nfts.map((nft, index) => {
    const listing = listingsByToken.get(nft.tokenId) ?? null;
    const latestSale = latestSaleByToken.get(nft.tokenId) ?? null;
    const attributes = Array.isArray(nft.attributes) ? nft.attributes : [];
    const ownerAddress = listing?.seller ?? nft.ownerAddress;
    const creatorAddress = nft.creatorAddress || latestSale?.seller || ownerAddress;

    return {
      id: `${nft.collectionAddress}:${nft.tokenId}`,
      contractAddress: nft.collectionAddress,
      tokenId: nft.tokenId,
      collectionSlug,
      collectionName: nodeConfig.contracts.collection.name,
      name: nft.name || `${nodeConfig.contracts.collection.name} #${nft.tokenId}`,
      description: nft.description,
      imageUrl: resolveImageUrl(nft),
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
      thumbnailUrls: [resolveImageUrl(nft)],
      rankDisplay: `#${index + 1}`,
      traits: attributes.map((attribute, attributeIndex) => ({
        type: String(attribute.trait_type ?? `Trait ${attributeIndex + 1}`),
        value: String(attribute.value ?? "Unknown"),
        rarity: rarityLabel(attributeIndex + 1, Math.max(attributes.length, 1))
      }))
    } satisfies ItemRecord;
  });

  const itemMap = new Map(items.map((item) => [item.tokenId, item]));
  const listingActivities = activeListings.map((listing) => {
    const item = itemMap.get(listing.tokenId);
    return {
      id: `listing-${listing.listingId}`,
      type: "listing",
      collectionSlug,
      itemId: listing.tokenId,
      itemName: item?.name ?? `${nodeConfig.contracts.collection.name} #${listing.tokenId}`,
      from: shortenAddress(listing.seller),
      to: "marketplace",
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
      itemId: sale.tokenId,
      itemName: item?.name ?? `${nodeConfig.contracts.collection.name} #${sale.tokenId}`,
      from: shortenAddress(sale.seller),
      to: shortenAddress(sale.buyer),
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
      itemId: transfer.tokenId,
      itemName: item?.name ?? `${nodeConfig.contracts.collection.name} #${transfer.tokenId}`,
      from: shortenAddress(transfer.fromAddress),
      to: shortenAddress(transfer.toAddress),
      priceRaw: "0",
      priceDisplay: transfer.eventType === "mint" ? "Mint" : "-",
      ageLabel: ageLabel(transfer.createdAt),
      createdAt: transfer.createdAt
    };
  });

  const activities = [...saleActivities, ...listingActivities, ...transferActivities]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map(({ createdAt: _createdAt, ...activity }) => activity);

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

  const holders = holderRows.map((holder) => ({
    ...buildProfile(holder.ownerAddress, holder.quantity, totalVolumeRaw.toString()),
    ownerAddress: holder.ownerAddress,
    quantity: Number(holder.quantity),
    share: items.length ? formatPercent((Number(holder.quantity) / items.length) * 100) : "0%"
  }));

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
  const [state, drops] = await Promise.all([
    buildMarketState(),
    listAdminDrops({ stage: "live" })
  ]);
  const featuredCollections = state.collection ? [state.collection] : [];
  const routeMap = [
    { label: "Discover", href: "/", scope: "public" },
    { label: "Collections", href: "/collections", scope: "public" },
    { label: "Activity", href: "/activity", scope: "public" }
  ];
  if (state.collection) {
    routeMap.push({
      label: "Collection",
      href: `/collection/${collectionSlug}`,
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
    recentActivity: state.activities.slice(0, 10)
  };
}

export async function getDiscoverData() {
  const [state, drops] = await Promise.all([
    buildMarketState(),
    listAdminDrops({ stage: "live" })
  ]);
  return {
    heroCollection: state.collection,
    leaderboardCollections: state.collection ? [state.collection] : [],
    trendingCollections: state.collection ? [state.collection] : [],
    topMovers: state.collection ? [state.collection] : [],
    liveDrops: drops.map(toDropRecord),
    tokenLeaders: [] as TokenRecord[],
    activityFeed: state.activities.slice(0, 8)
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
    ...draftCollections.map(toDraftCollectionSummary)
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
      ? collections.filter((collection) =>
          collection.name.toLowerCase().includes(normalizedSearch) ||
          collection.description.toLowerCase().includes(normalizedSearch)
        )
      : collections
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

    const collection = toDraftCollectionSummary(draft);
    return {
      collection,
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
      relatedCollections: state.collection ? [state.collection] : [],
      about: [
        collection.description,
        "This is a saved creator collection draft.",
        `Owner: ${draft.ownerAddress}`
      ],
      traitHighlights: []
    };
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
    return null;
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
    mediaStrip: [item.imageUrl, ...item.thumbnailUrls].slice(0, 8),
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
  const state = await buildMarketState();
  const normalizedSearch = filters.search.trim().toLowerCase();
  const activities = state.activities.filter((entry) => {
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

export async function getProfileData(slug: string) {
  const state = await buildMarketState();
  const normalizedSlug = slug.toLowerCase();
  const requestedAddress = normalizedSlug.startsWith("0x") ? normalizedSlug : null;

  if (!state.collection && state.holders.length === 0) {
    if (requestedAddress !== null) {
      const creatorCollections = (await listCreatorCollections(requestedAddress)).map(toDraftCollectionSummary);
      return {
        profile: buildProfile(requestedAddress),
        createdCollections: creatorCollections,
        createdItems: []
      };
    }
    return null;
  }

  if (normalizedSlug !== creatorSlug) {
    const holder = state.holders.find(
      (entry) =>
        entry.slug === normalizedSlug ||
        (requestedAddress !== null && entry.ownerAddress.toLowerCase() === requestedAddress)
      );
    if (!holder) {
      if (requestedAddress !== null) {
        const creatorCollections = (await listCreatorCollections(requestedAddress)).map(toDraftCollectionSummary);
        return {
          profile: buildProfile(requestedAddress),
          createdCollections: creatorCollections,
          createdItems: []
        };
      }
      return null;
    }
    const creatorCollections = (await listCreatorCollections(holder.ownerAddress)).map(toDraftCollectionSummary);
    return {
      profile: holder,
      createdCollections: creatorCollections,
      createdItems: state.items.filter((item) => item.ownerAddress.toLowerCase() === holder.ownerAddress.toLowerCase())
    };
  }

  if (!state.creatorProfile) {
    return null;
  }

  return {
    profile: state.creatorProfile,
    createdCollections: [
      ...(state.collection ? [state.collection] : []),
      ...(await listCreatorCollections(ZeroAddressLike)).map(toDraftCollectionSummary)
    ],
    createdItems: state.items
  };
}
