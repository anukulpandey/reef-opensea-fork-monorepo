export type MarketplaceStat = {
  label: string;
  value: string;
  change: string;
};

export type ThemePalette = {
  accent: string;
  accentSoft: string;
  heroBackground: string;
  panelSurface: string;
  textOnHero: string;
};

export type HeroMetric = {
  label: string;
  value: string;
  change?: string;
};

export type TableMetrics = {
  floor: string;
  change: string;
  topOffer: string;
  volume: string;
  sales: string;
  owners: string;
  listed?: string;
};

export type CollectionSummary = {
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

export type ActivityRecord = {
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

export type TokenRecord = {
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

export type ItemTrait = {
  type: string;
  value: string;
  rarity: string;
};

export type ItemRecord = {
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

export type DropRecord = {
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

export type RewardsRecord = {
  totalPoints: string;
  rank: string;
  streak: string;
  tasks: Array<{ title: string; description: string; points: string; state: string }>;
};

export type StudioRecord = {
  headline: string;
  subtitle: string;
  quickActions: Array<{ title: string; description: string; state: string }>;
};

export type ProfileSummary = {
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

export type ProfileGalleryRecord = {
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

export type ProfileTokenHolding = {
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

export type ProfileOfferRecord = {
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

export type ProfilePortfolioSummary = {
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

export type ProfileResponse = {
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

export type SessionUser = {
  address: string;
  role: string;
  displayName?: string;
  bio?: string;
  avatarUri?: string;
  bannerUri?: string;
};
