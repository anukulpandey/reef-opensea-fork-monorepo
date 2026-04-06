import { createContext, useContext, useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { BrowserProvider, Contract, formatEther, parseEther } from "ethers";
import type { JsonRpcSigner } from "ethers";
import type { PublicAppConfig } from "@reef/config";
import {
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams
} from "react-router-dom";

type RuntimeInfo = {
  services: {
    database: boolean;
    ipfs: boolean;
    storage: boolean;
  };
  contracts: {
    collection: boolean;
    marketplace: boolean;
  };
  liveTrading: boolean;
  reasons: {
    database?: string;
    ipfs?: string;
    storage?: string;
    contracts?: {
      collection?: string;
      marketplace?: string;
    };
  };
};

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

type BootstrapResponse = {
  config: PublicAppConfig;
  routeMap: Array<{ label: string; href: string; scope: string }>;
  featuredCollections: CollectionSummary[];
  trendingCollections: CollectionSummary[];
  topTokens: TokenRecord[];
  liveDrops: DropRecord[];
  recentActivity: ActivityRecord[];
  runtime: RuntimeInfo;
};

type DiscoverResponse = {
  heroCollection: CollectionSummary | null;
  leaderboardCollections: CollectionSummary[];
  trendingCollections: CollectionSummary[];
  topMovers: CollectionSummary[];
  liveDrops: DropRecord[];
  tokenLeaders: TokenRecord[];
  activityFeed: ActivityRecord[];
};

type CollectionsResponse = {
  filters: {
    search: string;
    sort: string;
    category: string;
    view: string;
    timeframe: string;
  };
  collections: CollectionSummary[];
};

type CollectionResponse = {
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

type ItemResponse = {
  presentation: "modal";
  item: ItemRecord;
  collection: CollectionSummary;
  activity: ActivityRecord[];
  relatedItems: ItemRecord[];
  mediaStrip: string[];
  detailTabs: string[];
  defaultTab: string;
  metaBadges: string[];
  ownerLabel: string;
  backHref: string;
  closeHref: string;
  buyPanel: {
    topOffer: string;
    collectionFloor: string;
    rarity: string;
    lastSale: string;
    price: string;
    usd: string;
    buttonLabel: string;
  };
  liveTradingAvailable: boolean;
};

type TokensResponse = {
  filters: { search: string; sort: string };
  tokens: TokenRecord[];
};

type ActivityResponse = {
  filters: { type: string; search: string };
  activities: ActivityRecord[];
};

type DropsResponse = {
  filters: { stage: string };
  drops: DropRecord[];
};

type AdminSessionResponse = {
  wallet: string;
  isAdmin: boolean;
};

type AdminDropRecord = DropRecord & {
  createdBy: string;
  updatedBy: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

type AdminDropsResponse = {
  wallet: string;
  drops: AdminDropRecord[];
};

type ProfileResponse = {
  profile: ProfileSummary;
  createdCollections: CollectionSummary[];
  createdItems: ItemRecord[];
};

type WalletSession = {
  provider: BrowserProvider;
  signer: JsonRpcSigner;
  address: string;
};

type MarketplaceContextValue = {
  bootstrap: BootstrapResponse;
  account: string;
  isAdmin: boolean;
  status: string;
  connectWallet: () => Promise<void>;
  getWalletSession: () => Promise<WalletSession | null>;
  setStatus: (value: string) => void;
  refreshMarket: () => void;
  refreshNonce: number;
};

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);
const collectionAbi = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function approve(address to, uint256 tokenId) external",
  "function owner() view returns (address)",
  "function mintTo(address to, string tokenUri) external returns (uint256)"
];
const marketplaceAbi = [
  "function createListing(uint256 tokenId, uint256 price) external returns (uint256)",
  "function cancelListing(uint256 listingId) external",
  "function buyListing(uint256 listingId) external payable"
];

function assetUrl(url: string) {
  if (!url.startsWith("/")) {
    return url;
  }
  if (url.startsWith("/storage/")) {
    return `${apiBaseUrl}${url}`;
  }
  return url;
}

function placeholderAsset(label: string, accent = "#2081e2") {
  const safe = label.slice(0, 8).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="${accent}"/><text x="48" y="56" font-family="Arial,Helvetica,sans-serif" font-size="28" font-weight="700" text-anchor="middle" fill="white">${safe}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function iconPath(icon: string) {
  switch (icon) {
    case "compass":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="m9 15 3-8 3 3-6 5Z" />
        </>
      );
    case "grid":
      return (
        <>
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <rect x="14" y="14" width="6" height="6" rx="1" />
        </>
      );
    case "rings":
      return (
        <>
          <circle cx="9" cy="12" r="5" />
          <circle cx="15" cy="12" r="5" />
        </>
      );
    case "activity":
      return (
        <>
          <path d="M7 6v12" />
          <path d="M17 6v12" />
          <path d="m7 9 4 3-4 3" />
          <path d="m17 9-4 3 4 3" />
        </>
      );
    case "calendar":
      return (
        <>
          <rect x="5" y="6" width="14" height="13" rx="2" />
          <path d="M8 4v4M16 4v4M5 10h14" />
        </>
      );
    case "menu":
      return (
        <>
          <path d="M6 7h12M6 12h12M6 17h12" />
        </>
      );
    case "anchor":
      return (
        <>
          <circle cx="12" cy="6.5" r="1.5" />
          <path d="M12 8v10" />
          <path d="M8 12H5a7 7 0 0 0 14 0h-3" />
          <path d="M9 18h6" />
        </>
      );
    case "spark":
      return (
        <>
          <path d="m12 4 1.8 5.2L19 11l-5.2 1.8L12 18l-1.8-5.2L5 11l5.2-1.8L12 4Z" />
        </>
      );
    case "gamepad":
      return (
        <>
          <rect x="5" y="9" width="14" height="8" rx="4" />
          <path d="M9 13H7m1-1v2m6-1h3m-1.5-1.5v3" />
        </>
      );
    case "brush":
      return (
        <>
          <path d="m15 6 3 3" />
          <path d="m7 17 8-8 3 3-8 8H7v-3Z" />
          <path d="M6 20h5" />
        </>
      );
    case "profile":
      return (
        <>
          <circle cx="12" cy="9" r="3" />
          <path d="M6 19c1.7-2.4 4-3.6 6-3.6s4.3 1.2 6 3.6" />
        </>
      );
    case "help":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.7 9.2A2.8 2.8 0 0 1 12 8a2.5 2.5 0 0 1 2.7 2.4c0 1.8-2.1 2.1-2.7 3.6" />
          <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
        </>
      );
    case "wallet":
      return (
        <>
          <rect x="4" y="7" width="16" height="10" rx="2" />
          <path d="M14 11h6v4h-6a2 2 0 1 1 0-4Z" />
        </>
      );
    case "search":
      return (
        <>
          <circle cx="11" cy="11" r="5" />
          <path d="m15.5 15.5 4 4" />
        </>
      );
    case "chevron-left":
      return <path d="m15 6-6 6 6 6" />;
    case "chevron-right":
      return <path d="m9 6 6 6-6 6" />;
    case "close":
      return (
        <>
          <path d="M7 7l10 10M17 7 7 17" />
        </>
      );
    case "star":
      return <path d="m12 4 2.2 4.8 5.3.7-3.8 3.8.9 5.3L12 16.4 7.4 18.6l1-5.3L4.6 9.5l5.2-.7L12 4Z" />;
    case "globe":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M4 12h16M12 4c2.7 2.3 4 4.9 4 8s-1.3 5.7-4 8c-2.7-2.3-4-4.9-4-8s1.3-5.7 4-8Z" />
        </>
      );
    case "discord":
      return (
        <>
          <path d="M7 8c2-1 4-1.2 5-1.2S15 7 17 8c1 2 1.6 4 1.8 6-1.7 1.2-3.3 1.9-4.8 2.2l-.7-1.4c.8-.2 1.6-.6 2.2-1-2.1 1-4 1.2-5.5 1.2S8 14.8 5.5 13.8c.6.4 1.4.8 2.2 1L7 16.2C5.5 15.9 3.9 15.2 2.2 14 2.4 12 3 10 4 8" />
          <circle cx="9.4" cy="11.7" r="1" fill="currentColor" stroke="none" />
          <circle cx="14.6" cy="11.7" r="1" fill="currentColor" stroke="none" />
        </>
      );
    case "x":
      return <path d="M7 5 17 19M17 5 7 19" />;
    case "copy":
      return (
        <>
          <rect x="9" y="7" width="9" height="11" rx="2" />
          <rect x="6" y="4" width="9" height="11" rx="2" />
        </>
      );
    case "heart":
      return <path d="M12 19s-6.5-4.4-6.5-9A3.7 3.7 0 0 1 9.2 6c1.1 0 2.1.5 2.8 1.4A3.5 3.5 0 0 1 14.8 6 3.7 3.7 0 0 1 18.5 10c0 4.6-6.5 9-6.5 9Z" />;
    case "more":
      return (
        <>
          <circle cx="7" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="17" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </>
      );
    case "share":
      return (
        <>
          <circle cx="6" cy="12" r="2" />
          <circle cx="18" cy="7" r="2" />
          <circle cx="18" cy="17" r="2" />
          <path d="M8 11 16 8M8 13l8 3" />
        </>
      );
    case "filter":
      return <path d="M5 7h14M8 12h8M10 17h4" />;
    case "chart":
      return <path d="M5 16l4-5 3 2 6-7" />;
    case "list":
      return (
        <>
          <path d="M9 7h10M9 12h10M9 17h10" />
          <circle cx="6" cy="7" r="1" fill="currentColor" stroke="none" />
          <circle cx="6" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="6" cy="17" r="1" fill="currentColor" stroke="none" />
        </>
      );
    case "settings":
      return (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.2 6.2l1.4 1.4M16.4 16.4l1.4 1.4M17.8 6.2l-1.4 1.4M7.6 16.4l-1.4 1.4" />
        </>
      );
    case "table":
      return (
        <>
          <rect x="5" y="5" width="14" height="14" rx="2" />
          <path d="M5 10h14M5 14h14M10 5v14M14 5v14" />
        </>
      );
    case "view-grid":
      return (
        <>
          <rect x="5" y="5" width="5" height="5" rx="1" />
          <rect x="14" y="5" width="5" height="5" rx="1" />
          <rect x="5" y="14" width="5" height="5" rx="1" />
          <rect x="14" y="14" width="5" height="5" rx="1" />
        </>
      );
    case "view-columns":
      return (
        <>
          <rect x="5" y="5" width="4" height="14" rx="1" />
          <rect x="10" y="5" width="4" height="14" rx="1" />
          <rect x="15" y="5" width="4" height="14" rx="1" />
        </>
      );
    case "opensea":
      return (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14c0-4 2.4-7 4-8 1.8 1.2 3.5 3.7 3.5 6.7 0 2.8-1.8 4.6-4.5 4.6-1.6 0-3-.7-3-3.3Z" fill="currentColor" stroke="none" />
          <path d="M9.5 13.5 12 11l2.3 2.4" />
        </>
      );
    default:
      return <circle cx="12" cy="12" r="8" />;
  }
}

function Icon({ icon, className }: { icon: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPath(icon)}
    </svg>
  );
}

function OpenSeaBadge({ className }: { className?: string }) {
  return (
    <span className={className}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="12" fill="#2081e2" />
        <path d="M8 13.9c0-4.3 2.5-6.9 4-7.9 2 1.3 3.8 4 3.8 7 0 2.9-2 4.9-4.9 4.9-1.7 0-2.9-1.2-2.9-4Z" fill="#fff" />
        <path d="m9.3 13.5 2.8-2.7 2.6 2.7" fill="none" stroke="#2081e2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function shortenAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function compact(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatNativeDisplay(raw: string, symbol: string) {
  if (!raw || raw === "0") {
    return `0 ${symbol}`;
  }
  try {
    const numeric = Number(formatEther(raw));
    if (!Number.isFinite(numeric)) {
      return `0 ${symbol}`;
    }
    const digits = numeric >= 100 ? 1 : numeric >= 1 ? 2 : 4;
    return `${numeric.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits
    })} ${symbol}`;
  } catch {
    return `0 ${symbol}`;
  }
}

function sumActivityVolume(entries: ActivityRecord[], type = "sale") {
  return entries.reduce((total, entry) => {
    if (entry.type !== type || !entry.priceRaw) {
      return total;
    }
    try {
      return total + BigInt(entry.priceRaw);
    } catch {
      return total;
    }
  }, 0n);
}

async function copyText(value: string) {
  if (!navigator.clipboard) {
    throw new Error("Clipboard is unavailable in this browser.");
  }
  await navigator.clipboard.writeText(value);
}

function sameAddress(left?: string, right?: string) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, init);
  if (!response.ok) {
    let detail = "";
    try {
      const payload = await response.json() as { error?: string };
      detail = payload.error ? `: ${payload.error}` : "";
    } catch {}
    throw new Error(`Failed to load ${path} (${response.status})${detail}`);
  }
  return (await response.json()) as T;
}

function buildQuery(params: Record<string, string>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

function normalizeFilterValue(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function useRemoteData<T>(path: string | null, refreshKey?: number) {
  const [state, setState] = useState<{
    loading: boolean;
    data?: T;
    error?: string;
  }>({ loading: true });

  useEffect(() => {
    if (!path) {
      setState({ loading: false, error: "Missing route data path" });
      return;
    }

    let cancelled = false;
    setState({ loading: true });
    fetchJson<T>(path)
      .then((data) => {
        if (!cancelled) {
          setState({ loading: false, data });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            loading: false,
            error: error instanceof Error ? error.message : "Unknown request failure"
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [path, refreshKey]);

  return state;
}

function useMarketplace() {
  const context = useContext(MarketplaceContext);
  if (!context) {
    throw new Error("Marketplace context is unavailable");
  }
  return context;
}

function themeStyle(theme: ThemePalette): CSSProperties {
  return {
    "--accent": theme.accent,
    "--accent-soft": theme.accentSoft,
    "--hero-background": theme.heroBackground,
    "--panel-surface": theme.panelSurface,
    "--hero-text": theme.textOnHero
  } as CSSProperties;
}

export default function App() {
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [bootstrapState, setBootstrapState] = useState<{
    loading: boolean;
    data?: BootstrapResponse;
    error?: string;
  }>({ loading: true });
  const [account, setAccount] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState("Loading marketplace...");

  useEffect(() => {
    let cancelled = false;
    fetchJson<BootstrapResponse>("/bootstrap")
      .then((data) => {
        if (!cancelled) {
          setBootstrapState({ loading: false, data });
          setStatus("Marketplace loaded.");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setBootstrapState({
            loading: false,
            error: error instanceof Error ? error.message : "Failed to load bootstrap data"
          });
          setStatus("Failed to load bootstrap.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshNonce]);

  function refreshMarket() {
    setRefreshNonce((value) => value + 1);
  }

  useEffect(() => {
    let cancelled = false;

    if (!account) {
      setIsAdmin(false);
      return;
    }

    fetchJson<AdminSessionResponse>("/admin/session", {
      headers: {
        "x-admin-wallet": account
      }
    })
      .then((data) => {
        if (!cancelled) {
          setIsAdmin(Boolean(data.isAdmin));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsAdmin(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [account]);

  async function getWalletSession(): Promise<WalletSession | null> {
    try {
      const bootstrap = bootstrapState.data;
      if (!window.ethereum || !bootstrap) {
        setStatus("Install MetaMask or another EIP-1193 wallet.");
        return null;
      }

      await window.ethereum.request({
        method: "eth_requestAccounts"
      });

      const provider = new BrowserProvider(window.ethereum as never);
      const hexChainId = `0x${bootstrap.config.network.chainId.toString(16)}`;
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: hexChainId }]
        });
      } catch {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: hexChainId,
              chainName: bootstrap.config.network.chainName,
              rpcUrls: [bootstrap.config.network.rpcUrl],
              nativeCurrency: bootstrap.config.network.nativeCurrency
            }
          ]
        });
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      return { provider, signer, address };
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Wallet connection failed");
      return null;
    }
  }

  async function connectWallet() {
    const session = await getWalletSession();
    if (session) {
      const { address } = session;
      setStatus(`Connected ${address}`);
    }
  }

  if (bootstrapState.loading) {
    return <SplashScreen message="Booting dark marketplace shell..." />;
  }

  if (!bootstrapState.data) {
    return <SplashScreen message={bootstrapState.error ?? "Bootstrap failed"} />;
  }

  return (
    <MarketplaceContext.Provider
      value={{
        bootstrap: bootstrapState.data,
        account,
        isAdmin,
        status,
        connectWallet,
        getWalletSession,
        setStatus,
        refreshMarket,
        refreshNonce
      }}
    >
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DiscoverPage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="tokens" element={<TokensPage />} />
          <Route path="swap" element={<SwapPage />} />
          <Route path="drops" element={<DropsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="rewards" element={<RewardsPage />} />
          <Route path="studio" element={<StudioPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="create" element={<CreatePage />} />
          <Route path="create/collection" element={<CreateCollectionPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/created" element={<ProfileCreatedAliasPage />} />
          <Route path="profile/:creator" element={<CreatorPage />} />
          <Route path="collection/:slug" element={<CollectionPage mode="items" />} />
          <Route path="collection/:slug/explore" element={<CollectionPage mode="explore" />} />
          <Route path="collection/:slug/items" element={<CollectionPage mode="items" />} />
          <Route path="collection/:slug/offers" element={<CollectionPage mode="offers" />} />
          <Route path="collection/:slug/holders" element={<CollectionPage mode="holders" />} />
          <Route path="collection/:slug/activity" element={<CollectionPage mode="activity" />} />
          <Route path="collection/:slug/analytics" element={<CollectionPage mode="analytics" />} />
          <Route path="collection/:slug/traits" element={<CollectionPage mode="traits" />} />
          <Route path="collection/:slug/about" element={<CollectionPage mode="about" />} />
          <Route path="item/reef/:contract/:tokenId" element={<ItemModalPage />} />
          <Route path=":creator/created" element={<CreatorPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </MarketplaceContext.Provider>
  );
}

function SplashScreen({ message }: { message: string }) {
  return (
    <div className="splashScreen">
      <div className="splashCard dark">
        <OpenSeaBadge className="logoBadge large" />
        <h1>OpenSea</h1>
        <p>{message}</p>
      </div>
    </div>
  );
}

function AppShell() {
  const { bootstrap, account, isAdmin, connectWallet } = useMarketplace();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const shellReady = bootstrap.runtime.services.database && bootstrap.runtime.services.storage;
  const profileHref = account ? `/profile/${account}` : "/profile";
  const sidebarItems = isAdmin
    ? [...bootstrap.config.site.sidebarNav, { label: "Admin", href: "/admin", icon: "settings" }]
    : bootstrap.config.site.sidebarNav;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearch(params.get("search") ?? "");
  }, [location.search]);

  return (
    <div className={sidebarExpanded ? "appShell sidebarExpanded" : "appShell"}>
      <aside
        className="sidebarRail"
        aria-expanded={sidebarExpanded}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={(event) => {
          const activeElement = document.activeElement;
          if (!(activeElement instanceof Node) || !event.currentTarget.contains(activeElement)) {
            setSidebarExpanded(false);
          }
        }}
        onFocus={() => setSidebarExpanded(true)}
        onBlur={(event) => {
          const nextFocused = event.relatedTarget;
          if (!(nextFocused instanceof Node) || !event.currentTarget.contains(nextFocused)) {
            setSidebarExpanded(false);
          }
        }}
      >
        {sidebarItems.map((item, index) => (
          <NavLink
            key={`${item.href}-${index}`}
            to={item.href === "/profile" ? profileHref : item.href}
            end={item.href === "/"}
            className={({ isActive }) =>
              index === 0
                ? "sidebarButton brand"
                : isActive
                  ? "sidebarButton active"
                  : "sidebarButton"
            }
            aria-label={item.label}
          >
            <span className="sidebarButtonInner">
              {index === 0 ? <OpenSeaBadge className="logoBadge" /> : <Icon icon={item.icon} className="sidebarIcon" />}
              {index === 0 ? null : <span className="sidebarLabel">{item.label}</span>}
            </span>
          </NavLink>
        ))}
      </aside>

      <div className="workspace">
        <header className="topHeader">
          <form
            className="searchField"
            onSubmit={(event) => {
              event.preventDefault();
              navigate(`/collections${buildQuery({ search })}`);
            }}
          >
            <Icon icon="search" className="searchIcon" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search OpenSea"
            />
            <span className="shortcutHint">/</span>
          </form>

          <div className="headerActions">
            <button
              className="walletLink"
              onClick={() => {
                if (account) {
                  navigate(profileHref);
                  return;
                }
                void connectWallet();
              }}
            >
              {account ? shortenAddress(account) : "Connect Wallet"}
            </button>
            <button
              className="iconCircle"
              type="button"
              aria-label="Profile"
              onClick={() => {
                if (account) {
                  navigate(profileHref);
                  return;
                }
                navigate("/profile");
              }}
            >
              <Icon icon="profile" />
            </button>
          </div>
        </header>

        <main className="pageViewport">
          <Outlet />
        </main>

        <footer className="footerBar">
          <div className="footerLeft">
            <span className={shellReady ? "statusDot" : "statusDot warning"} />
            <span>{shellReady ? "Live" : "Status"}</span>
            {bootstrap.config.site.footerBar.legal.map((item) => (
              <span className="footerLink" key={item}>{item}</span>
            ))}
          </div>

          <div className="footerCenter">
            {bootstrap.config.site.footerBar.market.map((metric) => (
              <span className="footerMetric" key={metric.label}>
                {metric.label} {metric.value}
              </span>
            ))}
            <span className="footerLink">{bootstrap.config.site.footerBar.support}</span>
          </div>

          <div className="footerRight">
            {bootstrap.config.site.footerBar.modePills.map((item, index) => (
              <span key={item} className={index === 0 || index === 2 ? "footerPill active" : "footerPill"}>
                {item}
              </span>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}

function DiscoverPage() {
  const { bootstrap, refreshNonce } = useMarketplace();
  const [params, setParams] = useSearchParams();
  const state = useRemoteData<DiscoverResponse>("/dataset/discover", refreshNonce);
  const selectedCategory = params.get("category") ?? "all";
  const selectedNetwork = params.get("network") ?? normalizeFilterValue(bootstrap.config.network.key);
  const selectedAsset = params.get("asset") ?? "nfts";
  const selectedTimeframe = params.get("timeframe") ?? "1d";

  return (
    <DataState state={state}>
      {(data) => {
        const matchesNetwork = (chain: string) =>
          selectedNetwork === "all" ||
          normalizeFilterValue(chain) === selectedNetwork ||
          normalizeFilterValue(chain).includes(selectedNetwork);
        const matchesCategory = (category: string) =>
          selectedCategory === "all" || normalizeFilterValue(category) === selectedCategory;

        const leaderboardCollections = data.leaderboardCollections.filter(
          (collection) => matchesNetwork(collection.chain) && matchesCategory(collection.category)
        );
        const trendingCollections = data.trendingCollections.filter(
          (collection) => matchesNetwork(collection.chain) && matchesCategory(collection.category)
        );
        const topMovers = data.topMovers.filter(
          (collection) => matchesNetwork(collection.chain) && matchesCategory(collection.category)
        );
        const tokenLeaders = data.tokenLeaders.filter((token) => matchesNetwork(token.chain));
        const heroCollection =
          data.heroCollection &&
          matchesNetwork(data.heroCollection.chain) &&
          matchesCategory(data.heroCollection.category)
            ? data.heroCollection
            : leaderboardCollections[0] ?? trendingCollections[0] ?? topMovers[0] ?? null;
        const hasHero = Boolean(heroCollection);
        return (
        <div className="darkPage">
          <div className="discoverControls">
            <div className="chipRow">
              {bootstrap.config.site.discoverFilters.categories.map((filter) => {
                const value = normalizeFilterValue(filter.label);
                return (
                <button
                  key={filter.label}
                  className={selectedCategory === value ? "chip active" : "chip"}
                  type="button"
                  onClick={() => updateParams(params, setParams, { category: value })}
                >
                  {filter.icon ? <Icon icon={filter.icon} className="chipIcon" /> : null}
                  {filter.label}
                </button>
                );
              })}
            </div>

            <div className="chipRow network">
              {bootstrap.config.site.discoverFilters.networks.map((filter) => {
                const value = normalizeFilterValue(filter.label);
                return (
                <button
                  key={filter.label}
                  className={selectedNetwork === value ? "chip active networkChip" : "chip networkChip"}
                  type="button"
                  aria-label={filter.label}
                  title={filter.label}
                  onClick={() => updateParams(params, setParams, { network: value })}
                >
                  <NetworkDot label={filter.label} />
                  {filter.label}
                </button>
                );
              })}
            </div>

            <div className="controlSpacer" />

            <div className="segmentedSwitch">
              <button
                className={selectedAsset === "nfts" ? "segment active" : "segment"}
                type="button"
                onClick={() => updateParams(params, setParams, { asset: "nfts" })}
              >
                NFTs
              </button>
              <button
                className={selectedAsset === "tokens" ? "segment active" : "segment"}
                type="button"
                onClick={() => updateParams(params, setParams, { asset: "tokens" })}
              >
                Tokens
              </button>
            </div>
            <button
              className="iconChip"
              type="button"
              onClick={() => {
                const values = bootstrap.config.site.timeframes.map((value) => normalizeFilterValue(value));
                const currentIndex = Math.max(values.indexOf(selectedTimeframe), 0);
                const nextValue = values[(currentIndex + 1) % values.length] ?? "1d";
                updateParams(params, setParams, { timeframe: nextValue });
              }}
            >
              {selectedTimeframe}
              <Icon icon="chevron-right" className="microIcon" />
            </button>
            <button
              className="iconChip"
              type="button"
              aria-label="Table view"
              onClick={() => updateParams(params, setParams, { asset: "nfts" })}
            >
              <Icon icon="table" />
            </button>
            <button
              className="iconChip"
              type="button"
              aria-label="Reset discover filters"
              onClick={() => updateParams(params, setParams, { category: "all", asset: "nfts", timeframe: "1d" })}
            >
              <Icon icon="chevron-right" />
            </button>
          </div>

          <div className="discoverLayout">
            <section
              className="heroSurface"
              style={themeStyle(
                heroCollection?.theme ?? {
                  accent: "#2081e2",
                  accentSoft: "rgba(32,129,226,0.16)",
                  heroBackground: "#10161f",
                  panelSurface: "#16181b",
                  textOnHero: "#f8fafc"
                }
              )}
            >
              {hasHero && heroCollection ? (
                <>
                  <img className="heroImage" src={assetUrl(heroCollection.hero.backgroundUrl)} alt={heroCollection.name} />
                  <div className="heroOverlay">
                    <div>
                      <h1>{heroCollection.name}</h1>
                      <p>{heroCollection.hero.subtitle}</p>
                    </div>
                    <div className="heroMetrics overlay">
                      {heroCollection.hero.metrics.map((metric) => (
                        <article key={metric.label}>
                          <span>{metric.label}</span>
                          <strong>{metric.value}</strong>
                        </article>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="emptyShellState heroEmptyState">
                  <h2>Discover digital items</h2>
                  <p>No items to display.</p>
                </div>
              )}
              <div className="carouselDots">
                {Array.from({ length: 5 }, (_, index) => (
                  <span key={index} className={index === 0 ? "dot active" : "dot"} />
                ))}
              </div>
            </section>

            <aside className="leaderSurface">
              <div className="leaderHeader">
                <span>{selectedAsset === "tokens" ? "Token" : "Collection"}</span>
                <span>{selectedAsset === "tokens" ? "Price" : "Floor"}</span>
              </div>
              {selectedAsset === "tokens" ? (
                tokenLeaders.length === 0 ? (
                  <div className="emptyShellState compact">
                    <p>No tokens to display.</p>
                  </div>
                ) : (
                  tokenLeaders.map((token) => (
                    <article className="leaderRow" key={token.slug}>
                      <div className="leaderIdentity">
                        <img src={assetUrl(token.iconUrl)} alt={token.name} />
                        <div>
                          <strong>{token.name}</strong>
                        </div>
                      </div>
                      <div className="leaderMetrics">
                        <strong>{token.price}</strong>
                        <span className={token.change.startsWith("-") ? "negative" : "positive"}>
                          {token.change}
                        </span>
                      </div>
                    </article>
                  ))
                )
              ) : leaderboardCollections.length === 0 ? (
                <div className="emptyShellState compact">
                  <p>No collections to display.</p>
                </div>
              ) : (
                leaderboardCollections.map((collection) => (
                  <NavLink to={`/collection/${collection.slug}`} className="leaderRow" key={collection.slug}>
                    <div className="leaderIdentity">
                      <img src={assetUrl(collection.avatarUrl)} alt={collection.name} />
                      <div>
                        <strong>{collection.name}</strong>
                      </div>
                    </div>
                    <div className="leaderMetrics">
                      <strong>{collection.tableMetrics.floor}</strong>
                      <span className={collection.tableMetrics.change.startsWith("-") ? "negative" : "positive"}>
                        {collection.tableMetrics.change}
                      </span>
                    </div>
                  </NavLink>
                ))
              )}
            </aside>
          </div>

          <section className="sectionBlock">
            <SectionHeader
              title={selectedAsset === "tokens" ? "Trending Tokens" : "Featured Collections"}
              subtitle={selectedAsset === "tokens" ? "Tokens with momentum today" : "This week's curated collections"}
            />
            {(selectedAsset === "tokens" ? tokenLeaders.length === 0 : trendingCollections.length === 0) ? (
              <div className="panelSurface emptySection">
                <p className="panelBody">
                  {selectedAsset === "tokens" ? "No tokens to display." : "No collections to display."}
                </p>
              </div>
            ) : (
              selectedAsset === "tokens" ? (
                <div className="tokenStrip">
                  {tokenLeaders.map((token) => (
                    <article className="tokenCard" key={token.slug}>
                      <img src={assetUrl(token.iconUrl)} alt={token.symbol} />
                      <div>
                        <strong>{token.name}</strong>
                        <p>{token.marketCap}</p>
                      </div>
                      <span className={token.change.startsWith("-") ? "negative" : "positive"}>{token.change}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="cardStack">
                  {trendingCollections.slice(0, 4).map((collection) => (
                    <HeroCollectionCard key={collection.slug} collection={collection} />
                  ))}
                </div>
              )
            )}
          </section>

          <section className="sectionGrid">
            <div className="panelSurface">
              <SectionHeader title="Featured Collections" subtitle="This week's curated collections" />
              {trendingCollections.length === 0 ? (
                <p className="panelBody">No collections to display.</p>
              ) : (
                <div className="cardStack">
                  {trendingCollections.slice(0, 4).map((collection) => (
                    <HeroCollectionCard key={collection.slug} collection={collection} />
                  ))}
                </div>
              )}
            </div>

            <div className="panelSurface">
              <SectionHeader title="Collections" subtitle="Explore top collections across the marketplace" />
              {topMovers.length === 0 ? (
                <p className="panelBody">No collections to display.</p>
              ) : (
                <div className="compactStack">
                  {topMovers.map((collection) => (
                    <CompactCollectionRow key={collection.slug} collection={collection} highlightChange />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="sectionGrid">
            <div className="panelSurface">
              <SectionHeader title="Recent Activity" subtitle="Sales, listings, offers, and transfers" />
              {data.activityFeed.length === 0 ? (
                <p className="panelBody">No activity yet.</p>
              ) : (
                <div className="activityStack">
                  {data.activityFeed.slice(0, 6).map((entry) => (
                    <ActivityMiniRow key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>

            <div className="panelSurface">
              <SectionHeader title="Drops" subtitle="Explore upcoming and live mints" />
              {data.liveDrops.length === 0 ? (
                <p className="panelBody">No drops to display.</p>
              ) : (
                <div className="compactStack">
                  {data.liveDrops.map((drop) => (
                    <CompactDropRow key={drop.slug} drop={drop} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
        );
      }}
    </DataState>
  );
}

function CollectionsPage() {
  const { refreshNonce } = useMarketplace();
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const view = params.get("view") ?? "top";
  const timeframe = params.get("timeframe") ?? "1d";
  const state = useRemoteData<CollectionsResponse>(
    `/dataset/collections${buildQuery({ search, view, timeframe })}`,
    refreshNonce
  );
  const { bootstrap } = useMarketplace();

  return (
    <DataState state={state}>
      {(data) => (
        <div className="darkPage">
          <div className="collectionsToolbar">
            <div className="chipRow">
              <button className="iconChip" type="button" aria-label="Filters"><Icon icon="filter" /></button>
              {["top", "trending", "watchlist"].map((item) => (
                <button
                  key={item}
                  className={view === item ? "chip active" : "chip"}
                  type="button"
                  onClick={() => updateParams(params, setParams, { view: item })}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>

            <div className="chipRow">
              {bootstrap.config.site.timeframes.map((item) => (
                <button
                  key={item}
                  className={timeframe === item ? "chip active" : "chip ghost"}
                  type="button"
                  onClick={() => updateParams(params, setParams, { timeframe: item })}
                >
                  {item}
                </button>
              ))}
              <button className="iconChip" type="button" aria-label="Table view"><Icon icon="table" /></button>
            </div>
          </div>

          <section className="tableSurface">
            <div className="collectionTableHeader">
              <span />
              <span>Collection</span>
              <span>Floor Price</span>
              <span>1D Change</span>
              <span>Top Offer</span>
              <span>1D Vol</span>
              <span>1D Sales</span>
              <span>Owners</span>
            </div>
            {data.collections.length === 0 ? (
              <div className="tableEmptyState">
                <p>No collections found.</p>
              </div>
            ) : null}
            {data.collections.map((collection) => (
              <NavLink to={`/collection/${collection.slug}`} className="collectionTableRow" key={collection.slug}>
                <span className="starSlot"><Icon icon="star" /></span>
                <div className="collectionIdentity">
                  <img src={assetUrl(collection.avatarUrl)} alt={collection.name} />
                  <div>
                    <strong>{collection.name}</strong>
                    {collection.badgeText ? <span className="miniBadge">{collection.badgeText}</span> : null}
                  </div>
                </div>
                <span>{collection.tableMetrics.floor}</span>
                <span className={collection.tableMetrics.change.startsWith("-") ? "negative" : "positive"}>
                  {collection.tableMetrics.change}
                </span>
                <span>{collection.tableMetrics.topOffer}</span>
                <span>{collection.tableMetrics.volume}</span>
                <span>{collection.tableMetrics.sales}</span>
                <span>{collection.tableMetrics.owners}</span>
              </NavLink>
            ))}
          </section>
        </div>
      )}
    </DataState>
  );
}

function TokensPage() {
  const { bootstrap } = useMarketplace();
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const sort = params.get("sort") ?? "volume";
  const volumeRaw = sumActivityVolume(bootstrap.recentActivity);
  const mintedCount = bootstrap.recentActivity.filter((entry) => entry.type === "mint").length;
  const tokens = [
    {
      slug: bootstrap.config.network.key,
      name: bootstrap.config.network.nativeCurrency.name,
      symbol: bootstrap.config.network.nativeCurrency.symbol,
      chain: bootstrap.config.network.chainName,
      price: "Native asset",
      volume24h: formatNativeDisplay(volumeRaw.toString(), bootstrap.config.network.nativeCurrency.symbol),
      marketCap: "Live on Reef",
      holders: mintedCount ? compact(mintedCount) : "-",
      change: bootstrap.runtime.liveTrading ? "Live" : "Read-only",
      iconUrl: placeholderAsset("REEF", "#2081e2")
    }
  ].filter((token) => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return true;
    }
    return [token.name, token.symbol, token.chain].some((value) =>
      value.toLowerCase().includes(normalized)
    );
  });

  return (
    <div className="darkPage">
      <section className="pagePanel">
        <SectionHeader title="Tokens" subtitle="Track the Reef-native asset used across this marketplace." />
        <div className="metricsRow compact">
          <MetricPanel label="Network" value={bootstrap.config.network.chainName} />
          <MetricPanel label="Currency" value={bootstrap.config.network.nativeCurrency.symbol} />
          <MetricPanel label="Marketplace volume" value={formatNativeDisplay(volumeRaw.toString(), bootstrap.config.network.nativeCurrency.symbol)} />
        </div>
      </section>

      <section className="pagePanel">
        <div className="chipRow end">
          {["volume", "price", "marketCap"].map((value) => (
            <button
              key={value}
              className={sort === value ? "chip active" : "chip"}
              type="button"
              onClick={() => updateParams(params, setParams, { sort: value })}
            >
              {value === "marketCap" ? "Market Cap" : value.charAt(0).toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
        <div className="collectionTableHeader tokenHeader">
          <span>Token</span>
          <span>Price</span>
          <span>Market Vol</span>
          <span>Status</span>
          <span>NFT Mints</span>
          <span>Mode</span>
        </div>
        {tokens.length === 0 ? (
          <p className="panelBody">No tokens match this search.</p>
        ) : null}
        {tokens.map((token) => (
          <div className="tokenTableRow" key={token.slug}>
            <div className="collectionIdentity">
              <img src={assetUrl(token.iconUrl)} alt={token.symbol} />
              <div>
                <strong>{token.name}</strong>
                <p>{token.symbol}</p>
              </div>
            </div>
            <span>{token.price}</span>
            <span>{token.volume24h}</span>
            <span>{token.marketCap}</span>
            <span>{token.holders}</span>
            <span className={token.change === "Read-only" ? "" : token.change.startsWith("-") ? "negative" : "positive"}>{token.change}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

function SwapPage() {
  const { bootstrap, account, connectWallet, getWalletSession, setStatus } = useMarketplace();
  const navigate = useNavigate();
  const [balance, setBalance] = useState("0");
  const [walletChain, setWalletChain] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadWalletState() {
      if (!account || !window.ethereum) {
        setBalance("0");
        setWalletChain("");
        return;
      }

      try {
        const provider = new BrowserProvider(window.ethereum as never);
        const [balanceRaw, network] = await Promise.all([
          provider.getBalance(account),
          provider.getNetwork()
        ]);

        if (!cancelled) {
          setBalance(formatNativeDisplay(balanceRaw.toString(), bootstrap.config.network.nativeCurrency.symbol));
          setWalletChain(`${network.name || "Chain"} (${network.chainId.toString()})`);
        }
      } catch {
        if (!cancelled) {
          setBalance("Unavailable");
          setWalletChain("Unavailable");
        }
      }
    }

    void loadWalletState();

    return () => {
      cancelled = true;
    };
  }, [account, bootstrap.config.network.nativeCurrency.symbol]);

  async function handleCopy(value: string, label: string) {
    try {
      await copyText(value);
      setStatus(`${label} copied.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `Failed to copy ${label.toLowerCase()}.`);
    }
  }

  return (
    <div className="darkPage">
      <div className="sectionGrid">
        <section className="swapPanel">
          <SectionHeader title="Swap" subtitle="Use this route as your Reef wallet and network control center." />
          <label>
            <span>Wallet</span>
            <strong>{account ? shortenAddress(account) : "Not connected"}</strong>
          </label>
          <label>
            <span>Balance</span>
            <strong>{account ? balance : `0 ${bootstrap.config.network.nativeCurrency.symbol}`}</strong>
          </label>
          <label>
            <span>Wallet chain</span>
            <strong>{walletChain || "Connect to inspect"}</strong>
          </label>
          <div className="chipRow">
            <button className="primaryCta" type="button" onClick={() => void connectWallet()}>
              {account ? "Refresh wallet" : "Connect wallet"}
            </button>
            <button
              className="chip"
              type="button"
              onClick={() => {
                void getWalletSession();
              }}
            >
              Add or switch Reef
            </button>
          </div>
        </section>

        <section className="swapPanel">
          <SectionHeader title="Network" subtitle="Everything the wallet needs to talk to Reef locally." />
          <label>
            <span>RPC URL</span>
            <strong>{bootstrap.config.network.rpcUrl}</strong>
          </label>
          <label>
            <span>Chain ID</span>
            <strong>{bootstrap.config.network.chainId}</strong>
          </label>
          <label>
            <span>Currency</span>
            <strong>{bootstrap.config.network.nativeCurrency.symbol}</strong>
          </label>
          <div className="chipRow">
            <button className="chip" type="button" onClick={() => void handleCopy(bootstrap.config.network.rpcUrl, "RPC URL")}>
              Copy RPC
            </button>
            <button className="chip" type="button" onClick={() => void handleCopy(String(bootstrap.config.network.chainId), "Chain ID")}>
              Copy Chain ID
            </button>
            <button className="chip" type="button" onClick={() => navigate("/tokens")}>
              View tokens
            </button>
            <button className="chip" type="button" onClick={() => navigate("/activity")}>
              View activity
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function DropsPage() {
  const { refreshNonce, isAdmin } = useMarketplace();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const stage = params.get("stage") ?? "all";
  const state = useRemoteData<DropsResponse>(`/dataset/drops${buildQuery({ stage })}`, refreshNonce);

  return (
    <DataState state={state}>
      {(data) => (
        <div className="darkPage">
          <section className="pagePanel">
            <SectionHeader title="Drops" subtitle="Explore upcoming and live mints" />
            <div className="chipRow">
              {["all", "Live", "Upcoming"].map((value) => (
                <button
                  key={value}
                  className={stage === value ? "chip active" : "chip"}
                  type="button"
                  onClick={() => updateParams(params, setParams, { stage: value })}
                >
                  {value}
                </button>
              ))}
              {isAdmin ? (
                <button className="chip" type="button" onClick={() => navigate("/admin")}>
                  <Icon icon="settings" className="chipIcon" />
                  Manage drops
                </button>
              ) : null}
            </div>
            <div className="dropGrid">
              {data.drops.length === 0 ? (
                <p className="panelBody">No drops to display.</p>
              ) : null}
              {data.drops.map((drop) => (
                <DropCard key={drop.slug} drop={drop} />
              ))}
            </div>
          </section>
        </div>
      )}
    </DataState>
  );
}

function AdminPage() {
  const { account, isAdmin, connectWallet, refreshMarket, refreshNonce, setStatus } = useMarketplace();
  const [dropsState, setDropsState] = useState<{
    loading: boolean;
    drops: AdminDropRecord[];
    error?: string;
  }>({ loading: true, drops: [] });
  const [editingSlug, setEditingSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    creatorName: "Reef Team",
    coverUrl: "",
    stage: "upcoming",
    mintPrice: `0 ${"REEF"}`,
    supply: "100",
    startLabel: "TBD",
    description: ""
  });

  useEffect(() => {
    let cancelled = false;

    if (!account || !isAdmin) {
      setDropsState({ loading: false, drops: [] });
      return;
    }

    setDropsState({ loading: true, drops: [] });
    fetchJson<AdminDropsResponse>("/admin/drops", {
      headers: {
        "x-admin-wallet": account
      }
    })
      .then((data) => {
        if (!cancelled) {
          setDropsState({ loading: false, drops: data.drops });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setDropsState({
            loading: false,
            drops: [],
            error: error instanceof Error ? error.message : "Failed to load admin drops"
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [account, isAdmin, refreshNonce]);

  function resetForm() {
    setEditingSlug("");
    setForm({
      name: "",
      creatorName: "Reef Team",
      coverUrl: "",
      stage: "upcoming",
      mintPrice: `0 ${"REEF"}`,
      supply: "100",
      startLabel: "TBD",
      description: ""
    });
  }

  async function submitDrop(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account) {
      setStatus("Connect an admin wallet first.");
      return;
    }

    setSubmitting(true);
    try {
      await fetchJson<{ ok: boolean; slug: string }>(
        editingSlug ? `/admin/drops/${editingSlug}` : "/admin/drops",
        {
          method: editingSlug ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-wallet": account
          },
          body: JSON.stringify({
            name: form.name,
            creatorName: form.creatorName,
            coverUrl: form.coverUrl,
            stage: form.stage,
            mintPrice: form.mintPrice,
            supply: Number(form.supply),
            startLabel: form.startLabel,
            description: form.description
          })
        }
      );
      setStatus(editingSlug ? "Drop updated." : "Drop created.");
      resetForm();
      refreshMarket();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save drop.");
    } finally {
      setSubmitting(false);
    }
  }

  async function archiveDrop(slug: string) {
    if (!account || !window.confirm("Archive this drop?")) {
      return;
    }

    try {
      await fetchJson<{ ok: boolean }>(`/admin/drops/${slug}`, {
        method: "DELETE",
        headers: {
          "x-admin-wallet": account
        }
      });
      setStatus("Drop archived.");
      refreshMarket();
      if (editingSlug === slug) {
        resetForm();
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to archive drop.");
    }
  }

  if (!account) {
    return (
      <div className="darkPage">
        <section className="pagePanel">
          <SectionHeader title="Reef Admin" subtitle="The Reef team manages curated drops from here." />
          <div className="profileShell">
            <div>
              <h3 className="panelTitle">Connect your Reef team wallet</h3>
              <p className="panelBody">Drops are added by the Reef team. Connect an admin wallet to open the curator dashboard.</p>
            </div>
            <button className="primaryCta" onClick={() => void connectWallet()}>Connect Wallet</button>
          </div>
        </section>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="darkPage">
        <section className="pagePanel">
          <SectionHeader title="Reef Admin" subtitle="The Reef team manages curated drops from here." />
          <div className="profileShell">
            <div>
              <h3 className="panelTitle">Admin access is restricted</h3>
              <p className="panelBody">This wallet is not in the Reef team admin allowlist for this environment.</p>
            </div>
            <button className="chip" type="button" onClick={() => void connectWallet()}>Switch Wallet</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="darkPage">
      <section className="pagePanel">
        <SectionHeader title="Reef Admin" subtitle="Create, stage, and publish the drops your team wants to promote." />
        <div className="metricsRow compact">
          <MetricPanel label="Admin wallet" value={shortenAddress(account)} />
          <MetricPanel label="Managed drops" value={String(dropsState.drops.filter((drop) => !drop.archived).length)} />
          <MetricPanel label="Live now" value={String(dropsState.drops.filter((drop) => drop.stage === "live" && !drop.archived).length)} />
        </div>
      </section>

      <section className="sectionGrid adminGrid">
        <div className="panelSurface">
          <SectionHeader
            title={editingSlug ? "Edit drop" : "Create drop"}
            subtitle="This controls what appears on the public Drops page and homepage."
          />
          <form className="adminForm" onSubmit={submitDrop}>
            <div className="fieldGrid">
              <label className="fieldGroup">
                <span>Drop name</span>
                <input
                  className="textInput"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Reef Genesis Mint"
                />
              </label>
              <label className="fieldGroup">
                <span>Creator name</span>
                <input
                  className="textInput"
                  value={form.creatorName}
                  onChange={(event) => setForm((current) => ({ ...current, creatorName: event.target.value }))}
                  placeholder="Reef Team"
                />
              </label>
              <label className="fieldGroup">
                <span>Cover image URL</span>
                <input
                  className="textInput"
                  value={form.coverUrl}
                  onChange={(event) => setForm((current) => ({ ...current, coverUrl: event.target.value }))}
                  placeholder="https://... or /storage/..."
                />
              </label>
              <label className="fieldGroup">
                <span>Stage</span>
                <select
                  className="textInput"
                  value={form.stage}
                  onChange={(event) => setForm((current) => ({ ...current, stage: event.target.value }))}
                >
                  <option value="draft">Draft</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="live">Live</option>
                  <option value="ended">Ended</option>
                </select>
              </label>
              <label className="fieldGroup">
                <span>Mint price</span>
                <input
                  className="textInput"
                  value={form.mintPrice}
                  onChange={(event) => setForm((current) => ({ ...current, mintPrice: event.target.value }))}
                  placeholder={`0 ${"REEF"}`}
                />
              </label>
              <label className="fieldGroup">
                <span>Supply</span>
                <input
                  className="textInput"
                  value={form.supply}
                  onChange={(event) => setForm((current) => ({ ...current, supply: event.target.value }))}
                  placeholder="100"
                />
              </label>
              <label className="fieldGroup">
                <span>Start label</span>
                <input
                  className="textInput"
                  value={form.startLabel}
                  onChange={(event) => setForm((current) => ({ ...current, startLabel: event.target.value }))}
                  placeholder="Apr 15, 7:00 PM IST"
                />
              </label>
            </div>

            <label className="fieldGroup">
              <span>Description</span>
              <textarea
                className="textArea"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="What is this drop and why should the community care?"
              />
            </label>

            <div className="adminToolbar">
              <button className="primaryCta" type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingSlug ? "Update drop" : "Create drop"}
              </button>
              <button className="chip" type="button" onClick={resetForm}>Clear</button>
            </div>
          </form>
        </div>

        <div className="panelSurface">
          <SectionHeader title="How drops work" subtitle="Your Reef team decides what gets promoted here." />
          <div className="adminNotes">
            <p className="panelBody">Drops are curated launch cards. The Reef team adds them from this admin panel, chooses whether they are draft, upcoming, live, or ended, and the public Drops page updates automatically.</p>
            <p className="panelBody">For now this panel controls editorial launch content. When the live contract stack is ready, these entries can also be linked to real mint contracts and creator collections.</p>
          </div>
        </div>
      </section>

      <section className="panelSurface">
        <SectionHeader title="Managed drops" subtitle="Edit or archive the drops currently saved for this environment." />
        {dropsState.loading ? <p className="panelBody">Loading drops...</p> : null}
        {dropsState.error ? <p className="panelBody">{dropsState.error}</p> : null}
        {!dropsState.loading && !dropsState.error && dropsState.drops.length === 0 ? (
          <p className="panelBody">No drops created yet.</p>
        ) : null}
        <div className="adminDropList">
          {dropsState.drops.map((drop) => (
            <article className="adminDropRow" key={drop.slug}>
              <img src={assetUrl(drop.coverUrl)} alt={drop.name} />
              <div className="adminDropBody">
                <div className="adminDropHeader">
                  <strong>{drop.name}</strong>
                  <span className="miniBadge">{drop.stage}</span>
                </div>
                <p>{drop.description}</p>
                <div className="adminDropMeta">
                  <span>{drop.mintPrice}</span>
                  <span>{drop.supply.toLocaleString()} supply</span>
                  <span>{drop.startLabel}</span>
                </div>
              </div>
              <div className="adminDropActions">
                <button
                  className="chip"
                  type="button"
                  onClick={() => {
                    setEditingSlug(drop.slug);
                    setForm({
                      name: drop.name,
                      creatorName: drop.creatorName,
                      coverUrl: drop.coverUrl,
                      stage: drop.stage,
                      mintPrice: drop.mintPrice,
                      supply: String(drop.supply),
                      startLabel: drop.startLabel,
                      description: drop.description
                    });
                  }}
                >
                  Edit
                </button>
                <button className="chip" type="button" onClick={() => archiveDrop(drop.slug)}>
                  Archive
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ActivityPage() {
  const { refreshNonce } = useMarketplace();
  const [params, setParams] = useSearchParams();
  const type = params.get("type") ?? "all";
  const search = params.get("search") ?? "";
  const state = useRemoteData<ActivityResponse>(`/dataset/activity${buildQuery({ type, search })}`, refreshNonce);

  return (
    <DataState state={state}>
      {(data) => (
        <div className="darkPage">
          <section className="pagePanel">
            <SectionHeader title="Activity" subtitle="Track listings, sales, and transfers" />
            <div className="collectionsToolbar">
              <div className="chipRow">
                {["all", "sale", "listing", "offer", "transfer", "mint"].map((value) => (
                  <button
                    key={value}
                    className={type === value ? "chip active" : "chip"}
                    type="button"
                    onClick={() => updateParams(params, setParams, { type: value })}
                  >
                    {value === "all" ? "All" : value.charAt(0).toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="activityTable">
              {data.activities.length === 0 ? (
                <p className="panelBody">No activity yet.</p>
              ) : null}
              {data.activities.map((entry) => (
                <div className="activityTableRow" key={entry.id}>
                  <div>
                    <strong>{entry.itemName}</strong>
                    <p>{entry.collectionSlug}</p>
                  </div>
                  <span>{entry.type}</span>
                  <span>{entry.from}</span>
                  <span>{entry.to}</span>
                  <span>{entry.priceDisplay}</span>
                  <span>{entry.ageLabel}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </DataState>
  );
}

function RewardsPage() {
  const { account, connectWallet, isAdmin, bootstrap, refreshNonce } = useMarketplace();
  const state = useRemoteData<ProfileResponse>(account ? `/dataset/profile/${account}` : null, refreshNonce);

  if (!account) {
    return (
      <div className="darkPage">
        <section className="pagePanel">
          <SectionHeader title="Rewards" subtitle="Connect your wallet to unlock activity-based progress on Reef." />
          <div className="profileShell">
            <div>
              <h3 className="panelTitle">Track your collector progress</h3>
              <p className="panelBody">Rewards in this environment are tied to what your connected wallet has created, collected, and managed.</p>
            </div>
            <button className="primaryCta" onClick={() => void connectWallet()}>Connect Wallet</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <DataState state={state}>
      {(profile) => {
        const totalPoints =
          profile.createdItems.length * 50 +
          profile.createdCollections.length * 200 +
          bootstrap.recentActivity.filter((entry) => entry.to.toLowerCase().includes(account.slice(-4).toLowerCase())).length * 25 +
          (isAdmin ? 500 : 0);
        const tasks = [
          {
            title: "Profile connected",
            description: "Your Reef wallet is connected to the marketplace.",
            points: "50 pts",
            state: "Complete"
          },
          {
            title: "Own an NFT",
            description: "Hold at least one NFT indexed on Reef.",
            points: "100 pts",
            state: profile.createdItems.length > 0 ? "Complete" : "Pending"
          },
          {
            title: "Create a collection",
            description: "Deploy or register a creator collection once the contract stack is live.",
            points: "250 pts",
            state: profile.createdCollections.length > 0 ? "Complete" : "Queued"
          },
          {
            title: "Curate drops",
            description: "Admins can publish featured drops from the Reef control panel.",
            points: "500 pts",
            state: isAdmin ? "Available" : "Team only"
          }
        ];

        return (
        <div className="darkPage">
          <section className="pagePanel">
            <SectionHeader title="Rewards" subtitle="Track wallet progress, creator milestones, and Reef team actions." />
            <div className="metricsRow">
              <MetricPanel label="Total points" value={compact(totalPoints)} />
              <MetricPanel label="Rank" value={isAdmin ? "Reef Team" : profile.createdItems.length > 0 ? "Collector" : "Explorer"} />
              <MetricPanel label="Streak" value={`${Math.max(1, profile.createdItems.length + profile.createdCollections.length)}d`} />
            </div>
            <div className="taskGrid">
              {tasks.map((task) => (
                <article className="taskCard dark" key={task.title}>
                  <span className="metaLabel">{task.state}</span>
                  <h3>{task.title}</h3>
                  <p>{task.description}</p>
                  <strong>{task.points}</strong>
                </article>
              ))}
            </div>
          </section>
        </div>
        );
      }}
    </DataState>
  );
}

function StudioPage() {
  const { bootstrap, account, isAdmin, connectWallet } = useMarketplace();
  const navigate = useNavigate();
  const primaryCollection = bootstrap.featuredCollections[0] ?? null;
  const actions = [
    {
      title: "Create NFT",
      description: "Open the creator flow to prepare metadata and mint into Reef.",
      state: bootstrap.runtime.contracts.collection ? "Mint ready" : "Prepare only",
      onClick: () => navigate("/create")
    },
    {
      title: "Open profile",
      description: "View the public page for the connected wallet.",
      state: account ? "Ready" : "Connect wallet",
      onClick: () => {
        if (!account) {
          void connectWallet();
          return;
        }
        navigate(`/profile/${account}`);
      }
    },
    {
      title: "Manage drops",
      description: "Curate live and upcoming drops for the Reef marketplace.",
      state: isAdmin ? "Admin" : "Restricted",
      onClick: () => navigate(isAdmin ? "/admin" : "/drops")
    },
    {
      title: "View collection",
      description: "Jump into the live indexed Reef collection.",
      state: primaryCollection ? "Indexed" : "Waiting",
      onClick: () => navigate(primaryCollection ? `/collection/${primaryCollection.slug}` : "/collections")
    },
    {
      title: "Support tools",
      description: "Open support, health, and environment resources.",
      state: "Ready",
      onClick: () => navigate("/support")
    }
  ];

  return (
    <div className="darkPage">
      <section className="pagePanel">
        <SectionHeader title="Studio" subtitle="Run the creator and operations side of the Reef marketplace from one place." />
        <div className="metricsRow compact">
          <MetricPanel label="Database" value={bootstrap.runtime.services.database ? "Online" : "Offline"} />
          <MetricPanel label="IPFS" value={bootstrap.runtime.services.ipfs ? "Online" : "Offline"} />
          <MetricPanel label="Trading" value={bootstrap.runtime.liveTrading ? "Enabled" : "Gated"} />
        </div>
      </section>

      <section className="taskGrid studioActionGrid">
        {actions.map((action) => (
          <button className="taskCard dark studioActionCard" type="button" key={action.title} onClick={action.onClick}>
            <span className="metaLabel">{action.state}</span>
            <h3>{action.title}</h3>
            <p>{action.description}</p>
          </button>
        ))}
      </section>
    </div>
  );
}

function ProfilePage() {
  const { account, connectWallet } = useMarketplace();
  const navigate = useNavigate();

  if (account) {
    return <Navigate to={`/profile/${account}`} replace />;
  }

  return (
    <div className="darkPage">
      <section className="pagePanel">
        <SectionHeader title="Profile" subtitle="Connect a wallet to view your profile." />
        <div className="profileShell">
          <div>
            <h3 className="panelTitle">Connect a wallet to personalize your account</h3>
            <p className="panelBody">Connect a wallet to view your profile and saved activity.</p>
          </div>
          <button className="primaryCta" onClick={() => void connectWallet()}>Connect Wallet</button>
        </div>
      </section>

      <section className="taskGrid studioActionGrid">
        <button className="taskCard dark studioActionCard" type="button" onClick={() => navigate("/collections")}>
          <span className="metaLabel">Browse</span>
          <h3>Explore collections</h3>
          <p>See every collection currently indexed on Reef.</p>
        </button>
        <button className="taskCard dark studioActionCard" type="button" onClick={() => navigate("/activity")}>
          <span className="metaLabel">Track</span>
          <h3>Open activity</h3>
          <p>Follow listings, sales, transfers, and mints as they happen.</p>
        </button>
        <button className="taskCard dark studioActionCard" type="button" onClick={() => navigate("/studio")}>
          <span className="metaLabel">Create</span>
          <h3>Open Studio</h3>
          <p>Jump into the creator and operations workspace.</p>
        </button>
      </section>
    </div>
  );
}

function ProfileCreatedAliasPage() {
  const { account } = useMarketplace();

  if (!account) {
    return <Navigate to="/profile" replace />;
  }

  return <Navigate to={`/profile/${account}?tab=created`} replace />;
}

function buildCreatorArtwork(name: string, accent: string, subtitle: string) {
  const safeName = name.trim() || "Reef NFT";
  const safeSubtitle = subtitle.trim() || "Created on Reef";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200"><rect width="1200" height="1200" fill="#101315"/><rect x="72" y="72" width="1056" height="1056" rx="52" fill="${accent}"/><circle cx="920" cy="250" r="170" fill="rgba(255,255,255,0.18)"/><circle cx="220" cy="930" r="210" fill="rgba(8,15,28,0.18)"/><text x="128" y="270" font-family="Arial,Helvetica,sans-serif" font-size="52" fill="rgba(255,255,255,0.82)">${safeSubtitle}</text><text x="128" y="420" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="96" fill="white">${safeName}</text><text x="128" y="1020" font-family="Arial,Helvetica,sans-serif" font-size="34" fill="rgba(255,255,255,0.72)">OpenSea x Reef creator mint</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function CreatePage() {
  const { account, bootstrap, connectWallet, getWalletSession, setStatus, refreshMarket } = useMarketplace();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [metadataUri, setMetadataUri] = useState("");
  const [metadataGatewayUrl, setMetadataGatewayUrl] = useState("");
  const [form, setForm] = useState({
    name: "",
    subtitle: "",
    description: "",
    accent: "#2081e2",
    recipient: "",
    imageUrl: "",
    traitsJson: '[\n  {\n    "trait_type": "Edition",\n    "value": "Creator"\n  }\n]'
  });

  useEffect(() => {
    if (account && !form.recipient) {
      setForm((current) => ({
        ...current,
        recipient: account
      }));
    }
  }, [account, form.recipient]);

  const previewImage =
    form.imageUrl.trim() ||
    buildCreatorArtwork(form.name || "Reef NFT", form.accent || "#2081e2", form.subtitle || "Created on Reef");

  function parseTraits() {
    const trimmed = form.traitsJson.trim();
    if (!trimmed) {
      return [];
    }
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      throw new Error("Traits must be a JSON array.");
    }
    return parsed.map((entry) => ({
      trait_type: String((entry as { trait_type?: unknown }).trait_type ?? ""),
      value: String((entry as { value?: unknown }).value ?? "")
    }));
  }

  async function pinMetadata() {
    if (!form.name.trim()) {
      throw new Error("NFT name is required.");
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      image: previewImage,
      attributes: parseTraits()
    };
    const result = await fetchJson<{
      cid: string;
      uri: string;
      gatewayUrl: string;
      filename: string;
    }>("/ipfs/json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        filename: `${normalizeFilterValue(form.name || "reef-nft") || "reef-nft"}.json`,
        payload
      })
    });
    setMetadataUri(result.uri);
    setMetadataGatewayUrl(result.gatewayUrl);
    setStatus("Metadata pinned to local IPFS.");
    return result.uri;
  }

  async function mintNft() {
    setSubmitting(true);
    try {
      const pinnedUri = metadataUri || await pinMetadata();

      if (!bootstrap.runtime.contracts.collection || !bootstrap.config.contracts.collection.address) {
        throw new Error(
          bootstrap.runtime.reasons.contracts?.collection ||
            "Collection contract is not live on Reef yet."
        );
      }

      const session = await getWalletSession();
      if (!session) {
        return;
      }

      const contract = new Contract(
        bootstrap.config.contracts.collection.address,
        collectionAbi,
        session.signer
      );
      const contractOwner = String(await contract.owner());
      if (!sameAddress(contractOwner, session.address)) {
        throw new Error("Connect the collection owner wallet to mint on this contract.");
      }

      const recipient = form.recipient.trim() || session.address;
      setStatus("Submitting mint transaction on Reef...");
      const tx = await contract.mintTo(recipient, pinnedUri);
      await tx.wait();
      setStatus("NFT minted successfully.");
      setMetadataUri("");
      setMetadataGatewayUrl("");
      refreshMarket();
      navigate(`/collection/${bootstrap.config.contracts.collection.slug}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Mint failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="darkPage">
      <section className="pagePanel">
        <SectionHeader title="Create" subtitle="Compose metadata, pin it to local IPFS, and mint to the Reef collection when contracts are live." />
        <div className="metricsRow compact">
          <MetricPanel label="Wallet" value={account ? shortenAddress(account) : "Not connected"} />
          <MetricPanel label="Collection" value={bootstrap.config.contracts.collection.address ? shortenAddress(bootstrap.config.contracts.collection.address) : "Not deployed"} />
          <MetricPanel label="Minting" value={bootstrap.runtime.contracts.collection ? "Ready" : "Blocked"} />
        </div>
      </section>

      <section className="sectionGrid adminGrid">
        <div className="panelSurface">
          <SectionHeader title="NFT details" subtitle="Create a single NFT metadata object for the live Reef collection." />
          <form
            className="adminForm"
            onSubmit={(event) => {
              event.preventDefault();
              void mintNft();
            }}
          >
            <div className="fieldGrid">
              <label className="fieldGroup">
                <span>Name</span>
                <input
                  className="textInput"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Reef Creator Pass"
                />
              </label>
              <label className="fieldGroup">
                <span>Subtitle</span>
                <input
                  className="textInput"
                  value={form.subtitle}
                  onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))}
                  placeholder="Genesis creator edition"
                />
              </label>
              <label className="fieldGroup">
                <span>Accent color</span>
                <input
                  className="textInput"
                  value={form.accent}
                  onChange={(event) => setForm((current) => ({ ...current, accent: event.target.value }))}
                  placeholder="#2081e2"
                />
              </label>
              <label className="fieldGroup">
                <span>Recipient wallet</span>
                <input
                  className="textInput"
                  value={form.recipient}
                  onChange={(event) => setForm((current) => ({ ...current, recipient: event.target.value }))}
                  placeholder={account || "0x..."}
                />
              </label>
              <label className="fieldGroup fullSpan">
                <span>Image URL or data URI</span>
                <input
                  className="textInput"
                  value={form.imageUrl}
                  onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
                  placeholder="Leave blank to generate an on-brand SVG artwork automatically"
                />
              </label>
            </div>

            <label className="fieldGroup">
              <span>Description</span>
              <textarea
                className="textArea"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Describe this NFT..."
              />
            </label>

            <label className="fieldGroup">
              <span>Traits JSON</span>
              <textarea
                className="textArea codeArea"
                value={form.traitsJson}
                onChange={(event) => setForm((current) => ({ ...current, traitsJson: event.target.value }))}
              />
            </label>

            <div className="adminToolbar">
              <button className="chip" type="button" onClick={() => navigate("/create/collection")}>
                Create collection
              </button>
              <button
                className="chip"
                type="button"
                onClick={() => {
                  void pinMetadata().catch((error) => {
                    setStatus(error instanceof Error ? error.message : "Failed to pin metadata.");
                  });
                }}
              >
                Pin metadata
              </button>
              <button className="primaryCta" type="submit" disabled={submitting}>
                {submitting ? "Minting..." : "Mint NFT"}
              </button>
              {!account ? (
                <button className="chip" type="button" onClick={() => void connectWallet()}>
                  Connect wallet
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="panelSurface">
          <SectionHeader title="Preview" subtitle="This is what will be pinned as metadata and minted when Reef accepts the contract." />
          <div className="createPreviewCard">
            <img className="createPreviewImage" src={previewImage} alt={form.name || "NFT preview"} />
            <div className="createPreviewBody">
              <strong>{form.name || "Untitled NFT"}</strong>
              <p>{form.description || "Add a description to preview your metadata."}</p>
              <div className="badgeRow">
                <span className="heroBadge">{bootstrap.config.network.chainName}</span>
                <span className="heroBadge">{bootstrap.config.network.nativeCurrency.symbol}</span>
                <span className="heroBadge">{account ? "Connected" : "Wallet required"}</span>
              </div>
              {metadataUri ? (
                <div className="supportGrid">
                  <article className="supportCard">
                    <span className="metaLabel">Metadata URI</span>
                    <strong>{metadataUri}</strong>
                  </article>
                  <article className="supportCard">
                    <span className="metaLabel">Gateway URL</span>
                    <strong>{metadataGatewayUrl}</strong>
                  </article>
                </div>
              ) : null}
              {!bootstrap.runtime.contracts.collection ? (
                <p className="panelBody">
                  Minting is currently blocked: {bootstrap.runtime.reasons.contracts?.collection || "collection contract is not live yet"}.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CreateCollectionPage() {
  const { account, bootstrap, connectWallet, setStatus, refreshMarket } = useMarketplace();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    symbol: "",
    description: "",
    accent: "#2081e2",
    avatarUrl: "",
    bannerUrl: "",
    contractUri: ""
  });

  const previewAvatar =
    form.avatarUrl.trim() ||
    placeholderAsset(form.symbol.trim() || form.name.trim() || "COLL", form.accent.trim() || "#2081e2");
  const previewBanner =
    form.bannerUrl.trim() ||
    buildCreatorArtwork(form.name || "Creator Collection", form.accent || "#2081e2", form.symbol || "OpenSea");
  const slugPreview = normalizeFilterValue(form.name || "creator-collection") || "creator-collection";

  async function submitCollection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!account) {
      setStatus("Connect a wallet before creating a collection.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await fetchJson<{ ok: boolean; slug: string }>("/creator/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-creator-wallet": account
        },
        body: JSON.stringify({
          name: form.name.trim(),
          symbol: form.symbol.trim(),
          description: form.description.trim(),
          avatarUrl: previewAvatar,
          bannerUrl: previewBanner,
          contractUri: form.contractUri.trim(),
          status: bootstrap.runtime.contracts.collection ? "ready" : "draft"
        })
      });
      setStatus("Collection saved to your creator profile.");
      refreshMarket();
      navigate(`/profile/${account}?tab=created&collection=${result.slug}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to create collection.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="darkPage">
      <section className="pagePanel">
        <SectionHeader title="Create collection" subtitle="Set up the collection shell that your NFTs will live inside. This saves to your creator profile immediately." />
        <div className="metricsRow compact">
          <MetricPanel label="Wallet" value={account ? shortenAddress(account) : "Not connected"} />
          <MetricPanel label="Network" value={bootstrap.config.network.chainName} />
          <MetricPanel label="Collection mode" value={bootstrap.runtime.contracts.collection ? "Ready" : "Draft"} />
        </div>
      </section>

      <section className="sectionGrid adminGrid">
        <div className="panelSurface">
          <SectionHeader title="Collection details" subtitle="This matches the collection-first flow on the OpenSea profile created tab." />
          <form className="adminForm" onSubmit={submitCollection}>
            <div className="fieldGrid">
              <label className="fieldGroup">
                <span>Name</span>
                <input
                  className="textInput"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Reef Originals"
                />
              </label>
              <label className="fieldGroup">
                <span>Symbol</span>
                <input
                  className="textInput"
                  value={form.symbol}
                  onChange={(event) => setForm((current) => ({ ...current, symbol: event.target.value.toUpperCase() }))}
                  placeholder="REEF"
                />
              </label>
              <label className="fieldGroup">
                <span>Accent color</span>
                <input
                  className="textInput"
                  value={form.accent}
                  onChange={(event) => setForm((current) => ({ ...current, accent: event.target.value }))}
                  placeholder="#2081e2"
                />
              </label>
              <label className="fieldGroup">
                <span>Slug preview</span>
                <input className="textInput" value={slugPreview} readOnly />
              </label>
              <label className="fieldGroup fullSpan">
                <span>Description</span>
                <textarea
                  className="textArea"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Tell collectors what this collection is about."
                />
              </label>
              <label className="fieldGroup fullSpan">
                <span>Avatar URL</span>
                <input
                  className="textInput"
                  value={form.avatarUrl}
                  onChange={(event) => setForm((current) => ({ ...current, avatarUrl: event.target.value }))}
                  placeholder="Leave blank to generate an avatar automatically"
                />
              </label>
              <label className="fieldGroup fullSpan">
                <span>Banner URL</span>
                <input
                  className="textInput"
                  value={form.bannerUrl}
                  onChange={(event) => setForm((current) => ({ ...current, bannerUrl: event.target.value }))}
                  placeholder="Leave blank to generate a banner automatically"
                />
              </label>
              <label className="fieldGroup fullSpan">
                <span>Contract URI</span>
                <input
                  className="textInput"
                  value={form.contractUri}
                  onChange={(event) => setForm((current) => ({ ...current, contractUri: event.target.value }))}
                  placeholder="ipfs://... or https://... (optional)"
                />
              </label>
            </div>

            <div className="adminToolbar">
              {!account ? (
                <button className="chip" type="button" onClick={() => void connectWallet()}>
                  Connect wallet
                </button>
              ) : null}
              <button className="chip" type="button" onClick={() => navigate(account ? `/profile/${account}?tab=created` : "/profile")}>
                Back to profile
              </button>
              <button className="primaryCta" type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Create collection"}
              </button>
            </div>
          </form>
        </div>

        <div className="panelSurface">
          <SectionHeader title="Preview" subtitle="This is how the collection will appear on your created tab before live contracts are fully enabled." />
          <div className="createPreviewCard">
            <div className="collectionPreviewHero">
              <img className="collectionPreviewBanner" src={previewBanner} alt={form.name || "Collection banner"} />
              <img className="collectionPreviewAvatar" src={previewAvatar} alt={form.name || "Collection avatar"} />
            </div>
            <div className="createPreviewBody">
              <strong>{form.name || "Untitled collection"}</strong>
              <p>{form.description || "Add a description to preview how the collection will appear on your profile."}</p>
              <div className="badgeRow">
                <span className="heroBadge">{bootstrap.config.network.chainName}</span>
                <span className="heroBadge">{form.symbol || "SYMBOL"}</span>
                <span className="heroBadge">{bootstrap.runtime.contracts.collection ? "Ready" : "Draft"}</span>
              </div>
              <div className="supportGrid">
                <article className="supportCard">
                  <span className="metaLabel">Owner</span>
                  <strong>{account ? shortenAddress(account) : "Connect wallet"}</strong>
                </article>
                <article className="supportCard">
                  <span className="metaLabel">Slug</span>
                  <strong>{slugPreview}</strong>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SupportPage() {
  const { bootstrap } = useMarketplace();
  const navigate = useNavigate();

  return (
    <div className="darkPage">
      <section className="pagePanel">
        <SectionHeader title="Support" subtitle="Environment details, operator tools, and the fastest paths through the Reef marketplace." />
        <div className="metricsRow compact">
          <MetricPanel label="API" value={bootstrap.runtime.services.database ? "Healthy" : "Check stack"} />
          <MetricPanel label="Storage" value={bootstrap.runtime.services.storage ? "Ready" : "Check storage"} />
          <MetricPanel label="Contracts" value={bootstrap.runtime.liveTrading ? "Live" : "Pending"} />
        </div>
      </section>

      <section className="taskGrid studioActionGrid">
        <button className="taskCard dark studioActionCard" type="button" onClick={() => navigate("/swap")}>
          <span className="metaLabel">Wallet</span>
          <h3>Open network tools</h3>
          <p>Copy the Reef RPC, switch the wallet network, and verify balance.</p>
        </button>
        <button className="taskCard dark studioActionCard" type="button" onClick={() => navigate("/admin")}>
          <span className="metaLabel">Operations</span>
          <h3>Go to admin</h3>
          <p>Manage live and upcoming drops from the Reef control panel.</p>
        </button>
        <button className="taskCard dark studioActionCard" type="button" onClick={() => navigate("/studio")}>
          <span className="metaLabel">Workspace</span>
          <h3>Open Studio</h3>
          <p>Jump into creator tools, system status, and collection shortcuts.</p>
        </button>
      </section>

      <section className="pagePanel">
        <SectionHeader title="Environment" subtitle="Useful values for debugging or sharing with the Reef team." />
        <div className="supportGrid">
          <article className="supportCard">
            <span className="metaLabel">RPC URL</span>
            <strong>{bootstrap.config.network.rpcUrl}</strong>
          </article>
          <article className="supportCard">
            <span className="metaLabel">Chain ID</span>
            <strong>{bootstrap.config.network.chainId}</strong>
          </article>
          <article className="supportCard">
            <span className="metaLabel">Currency</span>
            <strong>{bootstrap.config.network.nativeCurrency.symbol}</strong>
          </article>
          <article className="supportCard">
            <span className="metaLabel">API</span>
            <strong>{apiBaseUrl}</strong>
          </article>
        </div>
      </section>
    </div>
  );
}

function CollectionPage({
  mode
}: {
  mode: "items" | "explore" | "offers" | "holders" | "activity" | "analytics" | "traits" | "about";
}) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const sort = params.get("sort") ?? "price-low";
  const { bootstrap, setStatus, account, connectWallet, refreshNonce } = useMarketplace();
  const state = useRemoteData<CollectionResponse>(slug ? `/dataset/collection/${slug}` : null, refreshNonce);

  if (!slug) {
    return <PageState message="Missing collection slug." />;
  }

  return (
    <DataState state={state}>
      {(data) => {
        const visibleItems = data.items.filter((item) => {
          if (!query) {
            return true;
          }
          return [item.name, item.description].some((value) => value.toLowerCase().includes(query.toLowerCase()));
        });
        const floorItem = visibleItems
          .filter((item) => item.listed)
          .sort((left, right) => BigInt(left.currentPriceRaw) < BigInt(right.currentPriceRaw) ? -1 : 1)[0];

        return (
          <div className="darkPage collectionPage" style={themeStyle(data.collection.theme)}>
            <section className="collectionHeroSurface">
              <img className="collectionHeroImage" src={assetUrl(data.collection.hero.backgroundUrl)} alt={data.collection.name} />
              <div className="collectionHeroOverlay">
                <div className="collectionIdentityBlock">
                  <img className="collectionAvatarLarge" src={assetUrl(data.collection.avatarUrl)} alt={data.collection.name} />
                  <div>
                    <div className="collectionTitleRow">
                      <h1>{data.collection.name}</h1>
                      {data.collection.verified ? <OpenSeaBadge className="verifiedBadge" /> : null}
                      <button className="ghostIcon" type="button"><Icon icon="star" /></button>
                      <button className="ghostIcon" type="button"><Icon icon="globe" /></button>
                      <button className="ghostIcon" type="button"><Icon icon="x" /></button>
                      <button className="ghostIcon" type="button"><Icon icon="share" /></button>
                      <button className="ghostIcon" type="button"><Icon icon="more" /></button>
                    </div>
                    <div className="badgeRow">
                      <span className="heroBadge">BY {data.collection.hero.subtitle.replace(/^By\s+/i, "").toUpperCase()}</span>
                      {data.collection.hero.badges.map((badge) => (
                        <span className="heroBadge" key={badge}>{badge}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="heroMetricRail">
                  {data.collection.hero.metrics.map((metric) => (
                    <article key={metric.label}>
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                    </article>
                  ))}
                  <button className="ghostIcon enlarge" type="button"><Icon icon="view-columns" /></button>
                </div>
              </div>
            </section>

            <div className="tabBar">
              {bootstrap.config.site.collectionTabs.map((tab) => {
                const active =
                  (mode === "items" && tab.label === "Items") ||
                  (mode === "explore" && tab.label === "Explore") ||
                  (mode === "holders" && tab.label === "Holders") ||
                  (mode === "traits" && tab.label === "Traits") ||
                  (mode === "activity" && tab.label === "Activity") ||
                  (mode === "analytics" && tab.label === "Analytics") ||
                  (mode === "about" && tab.label === "About");
                return (
                  <NavLink
                    key={tab.label}
                    to={tab.hrefPattern.replace(":slug", slug)}
                    className={active ? "tabLink active" : "tabLink"}
                  >
                    {tab.label}
                  </NavLink>
                );
              })}
            </div>

            <div className="collectionToolbar">
              <div className="chipRow">
                <button className="iconChip" type="button"><Icon icon="filter" /></button>
                <label className="inlineSearch">
                  <Icon icon="search" />
                  <input
                    value={query}
                    onChange={(event) => updateParams(params, setParams, { q: event.target.value })}
                    placeholder="Search by item or trait"
                  />
                </label>
              </div>

              <div className="chipRow">
                <button className="iconChip" type="button">{sort.replace("-", " ")} <Icon icon="chevron-right" className="microIcon" /></button>
                <button className="iconChip" type="button"><Icon icon="view-grid" /></button>
                <button className="iconChip" type="button"><Icon icon="view-columns" /></button>
                <button className="iconChip" type="button"><Icon icon="grid" /></button>
                <button className="iconChip" type="button"><Icon icon="list" /></button>
                <button className="iconChip" type="button"><Icon icon="settings" /></button>
                <button className="iconChip" type="button"><Icon icon="chart" /></button>
              </div>
            </div>

            <p className="itemCountLabel">{data.collection.items.toLocaleString()} ITEMS</p>

            {(mode === "items" || mode === "explore") ? (
              visibleItems.length === 0 ? (
                <section className="pagePanel">
                  <p className="panelBody">No items to display.</p>
                </section>
              ) : (
                <div className="itemGrid">
                  {visibleItems.map((item) => (
                    <ItemGridCard key={item.id} item={item} />
                  ))}
                </div>
              )
            ) : null}

            {mode === "offers" ? (
              <section className="pagePanel">
                <SectionHeader title="Collection offers" subtitle="Offers across the collection" />
                <div className="offerTable">
                  {data.offers.length === 0 ? <p className="panelBody">No offers to display.</p> : null}
                  {data.offers.map((offer) => (
                    <div className="offerRow" key={offer.itemId}>
                      <strong>{offer.itemName}</strong>
                      <span>{offer.priceDisplay}</span>
                      <span>{offer.from}</span>
                      <span>{offer.expiresIn}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {mode === "holders" ? (
              <section className="pagePanel">
                <SectionHeader title="Holders" subtitle="Wallets that currently hold items from this collection" />
                <div className="offerTable">
                  {data.holders.length === 0 ? <p className="panelBody">No holders to display.</p> : null}
                  {data.holders.map((holder) => (
                    <div className="offerRow" key={holder.slug}>
                      <div className="collectionIdentity">
                        <img src={assetUrl(holder.avatarUrl)} alt={holder.name} />
                        <strong>{holder.name}</strong>
                      </div>
                      <span>{holder.quantity} items</span>
                      <span>{holder.share}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {mode === "traits" ? (
              <section className="pagePanel">
                <SectionHeader title="Traits" subtitle="Browse traits across the collection" />
                <div className="traitSummaryGrid">
                  {data.traitHighlights.length === 0 ? <p className="panelBody">No traits to display.</p> : null}
                  {data.traitHighlights.map((trait) => (
                    <article className="traitSummaryCard" key={trait.type}>
                      <span className="metaLabel">{trait.type}</span>
                      {trait.topValues.map((value) => (
                        <strong key={value}>{value}</strong>
                      ))}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {mode === "activity" ? (
              <section className="pagePanel">
                <SectionHeader title="Activity" subtitle="Collection activity" />
                <div className="activityTable">
                  {data.activities.length === 0 ? <p className="panelBody">No activity yet.</p> : null}
                  {data.activities.map((entry) => (
                    <div className="activityTableRow" key={entry.id}>
                      <div>
                        <strong>{entry.itemName}</strong>
                        <p>{entry.type}</p>
                      </div>
                      <span>{entry.from}</span>
                      <span>{entry.to}</span>
                      <span>{entry.priceDisplay}</span>
                      <span>{entry.ageLabel}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {mode === "analytics" ? (
              data.analytics.length === 0 ? (
                <section className="pagePanel">
                  <p className="panelBody">No analytics to display.</p>
                </section>
              ) : (
                <div className="analyticsGrid">
                  {data.analytics.map((metric) => (
                    <article className="pagePanel analyticsCard dark" key={metric.label}>
                      <span className="metaLabel">{metric.label}</span>
                      <strong>{metric.value}</strong>
                      <div className="miniBars">
                        {metric.points.map((point, index) => (
                          <div key={`${metric.label}-${index}`} style={{ height: `${point}%` }} />
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )
            ) : null}

            {mode === "about" ? (
              <section className="pagePanel">
                <SectionHeader title="About" subtitle="Collection details" />
                <div className="aboutStack">
                  {data.about.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ) : null}

            {bootstrap.runtime.liveTrading && data.collection.showStickyActionBar ? (
              <div className="stickyActionBar">
                <button className="actionButton secondary" type="button" onClick={() => void connectWallet()}>
                  {account ? "Wallet connected" : "Connect wallet"}
                </button>
                <button className="actionButton secondary" type="button" onClick={() => updateParams(params, setParams, { sort: "price-low" })}>
                  {data.collection.actionBar.tertiary}
                </button>
                {data.collection.actionBar.quaternary ? (
                  <button className="actionButton muted" type="button">{data.collection.actionBar.quaternary}</button>
                ) : null}
                <button
                  className="actionButton primary"
                  type="button"
                  onClick={() => {
                    if (floorItem) {
                      navigate(`/item/reef/${floorItem.contractAddress}/${floorItem.tokenId}`);
                      return;
                    }
                    if (!account) {
                      void connectWallet();
                      return;
                    }
                    setStatus("Open one of your NFTs to create a listing.");
                  }}
                >
                  {data.collection.actionBar.primary}
                </button>
              </div>
            ) : null}
          </div>
        );
      }}
    </DataState>
  );
}

function ItemModalPage() {
  const { contract, tokenId } = useParams();
  const {
    bootstrap,
    setStatus,
    account,
    connectWallet,
    getWalletSession,
    refreshMarket,
    refreshNonce
  } = useMarketplace();
  const navigate = useNavigate();
  const state = useRemoteData<ItemResponse>(
    contract && tokenId ? `/dataset/item/${contract}/${tokenId}` : null,
    refreshNonce
  );
  const [activeTab, setActiveTab] = useState("Details");

  useEffect(() => {
    if (state.data) {
      setActiveTab(state.data.defaultTab);
    }
  }, [state.data]);

  if (!contract || !tokenId) {
    return <PageState message="Missing item identifier." />;
  }

  async function handleListItem(data: ItemResponse) {
    const session = await getWalletSession();
    if (!session) {
      return;
    }
    if (!sameAddress(session.address, data.item.ownerAddress)) {
      setStatus("Connect the wallet that currently owns this NFT to list it.");
      return;
    }
    if (!bootstrap.config.contracts.marketplace.address) {
      setStatus("Marketplace contract address is not configured.");
      return;
    }

    const priceInput = window.prompt(
      `List ${data.item.name} for how many ${bootstrap.config.network.nativeCurrency.symbol}?`,
      "1"
    );

    if (!priceInput) {
      setStatus("Listing cancelled.");
      return;
    }

    try {
      const collectionContract = new Contract(
        bootstrap.config.contracts.collection.address,
        collectionAbi,
        session.signer
      );
      const marketplaceContract = new Contract(
        bootstrap.config.contracts.marketplace.address,
        marketplaceAbi,
        session.signer
      );
      const approvedAddress = String(
        await collectionContract.getApproved(BigInt(data.item.tokenId))
      );
      const approvedForAll = Boolean(
        await collectionContract.isApprovedForAll(
          session.address,
          bootstrap.config.contracts.marketplace.address
        )
      );

      if (!sameAddress(approvedAddress, bootstrap.config.contracts.marketplace.address) && !approvedForAll) {
        setStatus("Approving NFT for the Reef marketplace...");
        const approveTx = await collectionContract.approve(
          bootstrap.config.contracts.marketplace.address,
          BigInt(data.item.tokenId)
        );
        await approveTx.wait();
      }

      setStatus("Creating listing on Reef...");
      const createTx = await marketplaceContract.createListing(
        BigInt(data.item.tokenId),
        parseEther(priceInput)
      );
      await createTx.wait();
      setStatus("Listing created.");
      refreshMarket();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Listing failed");
    }
  }

  async function handleCancelListing(data: ItemResponse) {
    const session = await getWalletSession();
    if (!session) {
      return;
    }
    if (!data.item.listingId) {
      setStatus("This item does not have an active listing.");
      return;
    }
    if (!sameAddress(session.address, data.item.seller)) {
      setStatus("Connect the wallet that created the listing to cancel it.");
      return;
    }
    try {
      const marketplaceContract = new Contract(
        bootstrap.config.contracts.marketplace.address,
        marketplaceAbi,
        session.signer
      );
      setStatus("Cancelling listing...");
      const tx = await marketplaceContract.cancelListing(BigInt(data.item.listingId));
      await tx.wait();
      setStatus("Listing cancelled.");
      refreshMarket();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Cancellation failed");
    }
  }

  async function handleBuyItem(data: ItemResponse) {
    const session = await getWalletSession();
    if (!session) {
      return;
    }
    if (!data.item.listingId || !data.item.listed) {
      setStatus("This NFT is not actively listed.");
      return;
    }
    try {
      const marketplaceContract = new Contract(
        bootstrap.config.contracts.marketplace.address,
        marketplaceAbi,
        session.signer
      );
      setStatus("Submitting purchase on Reef...");
      const tx = await marketplaceContract.buyListing(BigInt(data.item.listingId), {
        value: BigInt(data.item.currentPriceRaw)
      });
      await tx.wait();
      setStatus("Purchase completed.");
      refreshMarket();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Purchase failed");
    }
  }

  return (
    <DataState state={state}>
      {(data) => (
        <div className="modalRouteFrame">
          <div className="itemModal">
            <div className="itemModalTopBar">
              <div className="thumbRail">
                <button className="thumbNav" type="button" onClick={() => navigate(data.backHref)}><Icon icon="chevron-left" /></button>
                {data.mediaStrip.map((thumb, index) => (
                  <button key={`${thumb}-${index}`} className={index === 0 ? "thumbButton active" : "thumbButton"} type="button">
                    <img src={assetUrl(thumb)} alt="" />
                  </button>
                ))}
                <button className="thumbNav" type="button"><Icon icon="chevron-right" /></button>
              </div>
              <button className="closeButton" type="button" onClick={() => navigate(data.closeHref)}><Icon icon="close" /></button>
            </div>

            <div className="itemModalBody">
              <div className="mediaColumn">
                <img className="modalArtwork" src={assetUrl(data.item.imageUrl)} alt={data.item.name} />
              </div>

              <div className="detailsColumn">
                <div className="titleCluster">
                  <h1>{data.item.name}</h1>
                  <div className="identityBar">
                    <div className="identityRow">
                      <div className="identityWithAvatar">
                        <img src={assetUrl(data.collection.avatarUrl)} alt={data.collection.name} />
                        <strong>{data.collection.name}</strong>
                        {data.collection.verified ? <OpenSeaBadge className="verifiedBadge small" /> : null}
                      </div>
                      <span>{data.ownerLabel}</span>
                    </div>
                    <div className="iconRow compact">
                      <button className="ghostIcon" type="button"><Icon icon="globe" /></button>
                      <button className="ghostIcon" type="button"><Icon icon="discord" /></button>
                      <button className="ghostIcon" type="button"><Icon icon="x" /></button>
                      <button className="ghostIcon" type="button"><Icon icon="copy" /></button>
                      <button className="ghostIcon" type="button"><Icon icon="heart" /></button>
                      <button className="ghostIcon" type="button"><Icon icon="more" /></button>
                    </div>
                  </div>
                  <div className="badgeRow">
                    {data.metaBadges.map((badge) => (
                      <span className="heroBadge" key={badge}>{badge}</span>
                    ))}
                  </div>
                </div>

                <div className="buyPanel">
                  <div className="buyMetrics">
                    <div>
                      <span>Top Offer</span>
                      <strong>{data.buyPanel.topOffer}</strong>
                    </div>
                    <div>
                      <span>Collection Floor</span>
                      <strong>{data.buyPanel.collectionFloor}</strong>
                    </div>
                    <div>
                      <span>Rarity</span>
                      <strong>{data.buyPanel.rarity}</strong>
                    </div>
                    <div>
                      <span>Last Sale</span>
                      <strong>{data.buyPanel.lastSale}</strong>
                    </div>
                  </div>
                  <div className="priceCluster">
                    <span>Buy For</span>
                    <strong>{data.buyPanel.price}</strong>
                    <small>{data.buyPanel.usd}</small>
                  </div>
                  {data.liveTradingAvailable ? (
                    <button
                      className="primaryCta fullWidth"
                      onClick={() => {
                        if (!account) {
                          void connectWallet();
                          return;
                        }
                        if (data.item.listed && sameAddress(account, data.item.seller)) {
                          void handleCancelListing(data);
                          return;
                        }
                        if (data.item.listed) {
                          void handleBuyItem(data);
                          return;
                        }
                        if (!sameAddress(account, data.item.ownerAddress)) {
                          setStatus("Only the current owner can create a listing for this NFT.");
                          return;
                        }
                        void handleListItem(data);
                      }}
                    >
                      {!account
                        ? "Connect wallet"
                        : data.item.listed && sameAddress(account, data.item.seller)
                          ? "Cancel listing"
                          : data.item.listed
                            ? "Buy now"
                            : sameAddress(account, data.item.ownerAddress)
                              ? "List item"
                              : "Not for sale"}
                    </button>
                  ) : null}
                </div>

                <div className="detailTabs">
                  {data.detailTabs.map((tab) => (
                    <button
                      key={tab}
                      className={activeTab === tab ? "detailTab active" : "detailTab"}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeTab === "Details" ? (
                  <section className="detailsAccordion">
                    <div className="accordionHeader">
                      <div className="collectionIdentity">
                        <div className="diamondMarker" />
                        <strong>Traits</strong>
                      </div>
                      <Icon icon="chevron-right" />
                    </div>
                    <div className="traitList">
                      {data.item.traits.length === 0 ? <p className="panelBody">No traits to display.</p> : null}
                      {data.item.traits.map((trait) => (
                        <article className="traitPill" key={`${trait.type}-${trait.value}`}>
                          <span>{trait.type}</span>
                          <strong>{trait.value}</strong>
                          <small>{trait.rarity}</small>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}

                {activeTab === "Orders" ? (
                  <section className="detailsAccordion">
                    <div className="offerRow">
                      <strong>Current ask</strong>
                      <span>{data.item.currentPriceDisplay}</span>
                    </div>
                    <div className="offerRow">
                      <strong>Highest offer</strong>
                      <span>{data.item.highestOfferDisplay}</span>
                    </div>
                  </section>
                ) : null}

                {activeTab === "Activity" ? (
                  <section className="detailsAccordion">
                    {data.activity.length === 0 ? <p className="panelBody">No activity yet.</p> : null}
                    {data.activity.map((entry) => (
                      <div className="activityMiniRow" key={entry.id}>
                        <strong>{entry.type}</strong>
                        <span>{entry.priceDisplay}</span>
                        <small>{entry.ageLabel}</small>
                      </div>
                    ))}
                  </section>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </DataState>
  );
}

function CreatorPage() {
  const { creator } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { refreshNonce, account, bootstrap, setStatus } = useMarketplace();
  const state = useRemoteData<ProfileResponse>(creator ? `/dataset/profile/${creator}` : null, refreshNonce);
  const activeTab = params.get("tab") ?? "items";
  const query = params.get("q") ?? "";
  const sort = params.get("sort") ?? "recently-received";
  const view = params.get("view") ?? "grid";

  if (!creator) {
    return <PageState message="Missing creator slug." />;
  }

  return (
    <DataState state={state}>
      {(data) => {
        const isAddressProfile = creator.startsWith("0x");
        const isOwnProfile = isAddressProfile && account && sameAddress(account, creator);
        const profileLabel = data.profile.name;
        const profileTag = isAddressProfile
          ? creator.slice(2, 8).toUpperCase()
          : data.profile.slug.replace(/^wallet-/, "").slice(0, 6).toUpperCase();
        const visibleItems = data.createdItems.filter((item) =>
          !query
            ? true
            : [item.name, item.description, item.collectionName].some((value) =>
                value.toLowerCase().includes(query.toLowerCase())
              )
        );
        const visibleCollections = data.createdCollections.filter((collection) =>
          !query
            ? true
            : [collection.name, collection.description, collection.creatorName].some((value) =>
                value.toLowerCase().includes(query.toLowerCase())
              )
        );
        const listedItems = visibleItems.filter((item) => item.listed);
        const itemIds = new Set(data.createdItems.map((item) => item.tokenId));
        const relatedActivity = bootstrap.recentActivity.filter((entry) => itemIds.has(entry.itemId));
        const usdValue = "$0.00";
        const nftPercent = data.createdItems.length > 0 ? "100%" : "0%";
        const tokenPercent = "0%";
        const searchPlaceholder = activeTab === "created" ? "Search for collections" : "Search for items";
        const countLabel = activeTab === "created" ? `${visibleCollections.length} COLLECTIONS` : `${visibleItems.length} ITEMS`;
        const profileTabs = [
          { key: "galleries", label: "Galleries" },
          { key: "items", label: "Items" },
          { key: "tokens", label: "Tokens" },
          { key: "portfolio", label: "Portfolio" },
          { key: "listings", label: "Listings" },
          { key: "offers", label: "Offers" },
          { key: "created", label: "Created" },
          { key: "activity", label: "Activity" }
        ];

        return (
          <div className="darkPage profilePage">
            <section className="profileHeroSurface">
              <img className="profileHeroBanner" src={assetUrl(data.profile.bannerUrl)} alt={data.profile.name} />
              <div className="profileHeroShade" />
              <div className="profileHeroInner">
                <div className="profileHeroIdentity">
                  <img className="profileHeroAvatar" src={assetUrl(data.profile.avatarUrl)} alt={data.profile.name} />
                  <div className="profileTitleBlock">
                    <div className="profileTitleRow">
                      <h1>{profileLabel}</h1>
                      <button
                        className="ghostIcon"
                        type="button"
                        aria-label="Copy address"
                        onClick={() => {
                          const value = isAddressProfile ? creator : data.profile.slug;
                          void copyText(value)
                            .then(() => setStatus("Profile id copied."))
                            .catch((error) => {
                              setStatus(error instanceof Error ? error.message : "Copy failed.");
                            });
                        }}
                      >
                        <Icon icon="copy" />
                      </button>
                      <button className="ghostIcon" type="button" aria-label="More actions">
                        <Icon icon="more" />
                      </button>
                    </div>
                    <span className="profileTag">{profileTag}</span>
                    <p>{data.profile.bio}</p>
                  </div>
                </div>

                <div className="profileHeroStats">
                  <article>
                    <span>USD Value</span>
                    <strong>{usdValue}</strong>
                  </article>
                  <article>
                    <span>NFTs</span>
                    <strong>{nftPercent}</strong>
                  </article>
                  <article>
                    <span>Tokens</span>
                    <strong>{tokenPercent}</strong>
                  </article>
                  <button className="ghostIcon enlarge" type="button" aria-label="Profile actions">
                    <Icon icon="view-columns" />
                  </button>
                </div>
              </div>
            </section>

            <div className="profileTabBar">
              {profileTabs.map((tab) => (
                <button
                  key={tab.key}
                  className={activeTab === tab.key ? "tabLink active" : "tabLink"}
                  type="button"
                  onClick={() => updateParams(params, setParams, { tab: tab.key })}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="collectionToolbar">
              <div className="chipRow">
                <button className="iconChip" type="button" aria-label="Filters">
                  <Icon icon="filter" />
                </button>
                <label className="inlineSearch">
                  <Icon icon="search" />
                  <input
                    value={query}
                    onChange={(event) => updateParams(params, setParams, { q: event.target.value })}
                    placeholder={searchPlaceholder}
                  />
                </label>
              </div>

              <div className="chipRow">
                {activeTab === "created" && isOwnProfile ? (
                  <button className="chip active" type="button" onClick={() => navigate("/create/collection")}>
                    Create collection
                  </button>
                ) : null}
                <button className="iconChip" type="button" onClick={() => updateParams(params, setParams, { sort: "recently-received" })}>
                  {sort === "recently-received" ? "Recently received" : "Recently received"}
                  <Icon icon="chevron-right" className="microIcon" />
                </button>
                <button className={view === "grid" ? "iconChip active" : "iconChip"} type="button" onClick={() => updateParams(params, setParams, { view: "grid" })}>
                  <Icon icon="view-grid" />
                </button>
                <button className={view === "columns" ? "iconChip active" : "iconChip"} type="button" onClick={() => updateParams(params, setParams, { view: "columns" })}>
                  <Icon icon="view-columns" />
                </button>
                <button className={view === "grid-alt" ? "iconChip active" : "iconChip"} type="button" onClick={() => updateParams(params, setParams, { view: "grid-alt" })}>
                  <Icon icon="grid" />
                </button>
                <button className={view === "list" ? "iconChip active" : "iconChip"} type="button" onClick={() => updateParams(params, setParams, { view: "list" })}>
                  <Icon icon="list" />
                </button>
              </div>
            </div>

            <p className="itemCountLabel">{countLabel}</p>

            {(activeTab === "items" || activeTab === "galleries") ? (
              visibleItems.length === 0 ? (
                <section className="profileEmptyBoard">
                  <div className="profileEmptyRow">
                    <div className="profileEmptySlot" />
                    <div className="profileEmptySlot" />
                    <div className="profileEmptySlot" />
                    <div className="profileEmptySlot" />
                  </div>
                  <div className="profileEmptyMessage">
                    <img src={assetUrl(data.profile.avatarUrl)} alt="" />
                    <h2>No items found</h2>
                    <p>Discover new collections on OpenSea</p>
                  </div>
                </section>
              ) : (
                <div className={view === "list" ? "referenceList" : "itemGrid"}>
                  {visibleItems.map((item) =>
                    view === "list" ? (
                      <NavLink key={item.id} to={`/item/reef/${item.contractAddress}/${item.tokenId}`} className="referenceRow">
                        <div className="collectionIdentity">
                          <img src={assetUrl(item.imageUrl)} alt={item.name} />
                          <div>
                            <strong>{item.name}</strong>
                            <p>{item.collectionName}</p>
                          </div>
                        </div>
                        <span>{item.currentPriceDisplay}</span>
                      </NavLink>
                    ) : (
                      <ItemGridCard key={item.id} item={item} />
                    )
                  )}
                </div>
              )
            ) : null}

            {activeTab === "created" ? (
              visibleCollections.length === 0 ? (
                <section className="profileCreatedBoard">
                  <div className="collectionTableHeader collectionTableGhost">
                    <span />
                    <span>Collection</span>
                    <span>Floor Price</span>
                    <span>Vol</span>
                    <span>Sales</span>
                    <span>Owners</span>
                    <span>Supply</span>
                    <span>Last</span>
                  </div>
                  {[0, 1, 2, 3].map((index) => (
                    <div className="collectionTableRow collectionTableGhost" key={`ghost-${index}`}>
                      <span className="starSlot"><Icon icon="star" /></span>
                      <div className="collectionIdentity">
                        <span className="ghostAvatar" />
                        <div className="ghostStack">
                          <span className="ghostBar medium" />
                          <span className="ghostBar short" />
                        </div>
                      </div>
                      <span className="ghostBar short" />
                      <span className="ghostBar short" />
                      <span className="ghostBar short" />
                      <span className="ghostBar short" />
                      <span className="ghostBar short" />
                      <span className="ghostBar short" />
                    </div>
                  ))}
                  <div className={isOwnProfile ? "profileEmptyMessage hasAction" : "profileEmptyMessage"}>
                    <img src={assetUrl(data.profile.avatarUrl)} alt="" />
                    <h2>{isOwnProfile ? "Start creating" : "No collections found"}</h2>
                    <p>
                      {isOwnProfile
                        ? "Create an NFT collection on OpenSea."
                        : "This profile has not created any collections yet."}
                    </p>
                    {isOwnProfile ? (
                      <button className="actionButton secondary profileEmptyAction" type="button" onClick={() => navigate("/create/collection")}>
                        Create a collection
                      </button>
                    ) : null}
                  </div>
                </section>
              ) : (
                <section className="tableSurface">
                  <div className="collectionTableHeader">
                    <span />
                    <span>Collection</span>
                    <span>Floor Price</span>
                    <span>1D Change</span>
                    <span>Top Offer</span>
                    <span>1D Vol</span>
                    <span>1D Sales</span>
                    <span>Owners</span>
                  </div>
                  {visibleCollections.map((collection) => (
                    <NavLink to={`/collection/${collection.slug}`} className="collectionTableRow" key={collection.slug}>
                      <span className="starSlot"><Icon icon="star" /></span>
                      <div className="collectionIdentity">
                        <img src={assetUrl(collection.avatarUrl)} alt={collection.name} />
                        <div>
                          <strong>{collection.name}</strong>
                          {collection.badgeText ? <span className="miniBadge">{collection.badgeText}</span> : null}
                        </div>
                      </div>
                      <span>{collection.tableMetrics.floor}</span>
                      <span className={collection.tableMetrics.change.startsWith("-") ? "negative" : "positive"}>
                        {collection.tableMetrics.change}
                      </span>
                      <span>{collection.tableMetrics.topOffer}</span>
                      <span>{collection.tableMetrics.volume}</span>
                      <span>{collection.tableMetrics.sales}</span>
                      <span>{collection.tableMetrics.owners}</span>
                    </NavLink>
                  ))}
                </section>
              )
            ) : null}

            {activeTab === "listings" ? (
              <section className="pagePanel">
                <SectionHeader title="Listings" subtitle="Items currently listed by this profile." />
                {listedItems.length === 0 ? (
                  <p className="panelBody">No listings found.</p>
                ) : (
                  <div className="itemGrid">
                    {listedItems.map((item) => (
                      <ItemGridCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {activeTab === "activity" ? (
              <section className="pagePanel">
                <SectionHeader title="Activity" subtitle="Recent marketplace events related to this profile." />
                <div className="activityTable">
                  {relatedActivity.length === 0 ? <p className="panelBody">No activity found.</p> : null}
                  {relatedActivity.map((entry) => (
                    <div className="activityTableRow" key={entry.id}>
                      <div>
                        <strong>{entry.itemName}</strong>
                        <p>{entry.collectionSlug}</p>
                      </div>
                      <span>{entry.type}</span>
                      <span>{entry.from}</span>
                      <span>{entry.to}</span>
                      <span>{entry.priceDisplay}</span>
                      <span>{entry.ageLabel}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {activeTab === "offers" ? (
              <section className="pagePanel">
                <SectionHeader title="Offers" subtitle="Incoming and outgoing offers for this profile." />
                <p className="panelBody">No offers found.</p>
              </section>
            ) : null}

            {activeTab === "tokens" ? (
              <section className="pagePanel">
                <SectionHeader title="Tokens" subtitle="Token balances currently supported in this environment." />
                <div className="tokenStrip">
                  <article className="tokenCard">
                    <img src={placeholderAsset("REEF", "#2081e2")} alt="REEF" />
                    <div>
                      <strong>{bootstrap.config.network.nativeCurrency.name}</strong>
                      <p>{bootstrap.config.network.nativeCurrency.symbol}</p>
                    </div>
                    <span>{bootstrap.runtime.liveTrading ? "Live" : "Read-only"}</span>
                  </article>
                </div>
              </section>
            ) : null}

            {activeTab === "portfolio" ? (
              <section className="pagePanel">
                <SectionHeader title="Portfolio" subtitle="Snapshot of the current wallet and collection footprint." />
                <div className="metricsRow">
                  <MetricPanel label="Followers" value={compact(data.profile.followers)} />
                  <MetricPanel label="Following" value={compact(data.profile.following)} />
                  <MetricPanel label="Volume" value={data.profile.volume} />
                </div>
              </section>
            ) : null}

            <div className="profileActionDock">
              <div className="profileActionGroup">
              <button className="actionButton secondary" type="button" onClick={() => navigate("/create")}>
                List items
              </button>
                <button className="actionButton muted" type="button" onClick={() => setStatus("Use an item page to cancel a live listing.")}>
                  Cancel listings
                </button>
                <button className="actionButton muted" type="button" onClick={() => setStatus("Offers are not live in this environment yet.")}>
                  Accept offers
                </button>
              </div>
              <button
                className="actionButton secondary"
                type="button"
                onClick={() => navigate(isOwnProfile ? (activeTab === "created" ? "/create/collection" : "/create") : "/collections")}
              >
                {isOwnProfile ? (activeTab === "created" ? "Create collection" : "Create NFT") : "Create gallery"}
              </button>
            </div>
          </div>
        );
      }}
    </DataState>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="sectionHeader">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function MetricPanel({ label, value }: { label: string; value: string }) {
  return (
    <article className="metricPanel">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function HeroCollectionCard({ collection }: { collection: CollectionSummary }) {
  return (
    <NavLink to={`/collection/${collection.slug}`} className="heroCollectionCard" style={themeStyle(collection.theme)}>
      <img src={assetUrl(collection.bannerUrl)} alt={collection.name} />
      <div className="heroCollectionBody">
        <div className="collectionIdentity">
          <img src={assetUrl(collection.avatarUrl)} alt={collection.name} />
          <div>
            <strong>{collection.name}</strong>
            <p>{collection.creatorName}</p>
          </div>
        </div>
        <div className="collectionMetricGrid">
          <div>
            <span>Floor</span>
            <strong>{collection.floorDisplay}</strong>
          </div>
          <div>
            <span>1D</span>
            <strong className={collection.tableMetrics.change.startsWith("-") ? "negative" : "positive"}>
              {collection.tableMetrics.change}
            </strong>
          </div>
        </div>
      </div>
    </NavLink>
  );
}

function CompactDropRow({ drop }: { drop: DropRecord }) {
  return (
    <article className="compactRow">
      <img src={assetUrl(drop.coverUrl)} alt={drop.name} />
      <div>
        <strong>{drop.name}</strong>
        <p>{drop.startLabel}</p>
      </div>
      <span>{drop.mintPrice}</span>
    </article>
  );
}

function CompactCollectionRow({
  collection,
  highlightChange
}: {
  collection: CollectionSummary;
  highlightChange?: boolean;
}) {
  return (
    <NavLink to={`/collection/${collection.slug}`} className="compactRow">
      <img src={assetUrl(collection.avatarUrl)} alt={collection.name} />
      <div>
        <strong>{collection.name}</strong>
        <p>{collection.creatorName}</p>
      </div>
      <span className={highlightChange && collection.tableMetrics.change.startsWith("-") ? "negative" : highlightChange ? "positive" : ""}>
        {highlightChange ? collection.tableMetrics.change : collection.tableMetrics.floor}
      </span>
    </NavLink>
  );
}

function CompactTokenRow({ token }: { token: TokenRecord }) {
  return (
    <div className="compactRow">
      <img src={assetUrl(token.iconUrl)} alt={token.symbol} />
      <div>
        <strong>{token.name}</strong>
        <p>{token.symbol}</p>
      </div>
      <span className={token.change.startsWith("-") ? "negative" : "positive"}>{token.change}</span>
    </div>
  );
}

function ActivityMiniRow({ entry }: { entry: ActivityRecord }) {
  return (
    <div className="activityMiniRow">
      <div>
        <strong>{entry.itemName}</strong>
        <p>{entry.from} → {entry.to}</p>
      </div>
      <div className="activityMiniMeta">
        <span>{entry.priceDisplay}</span>
        <small>{entry.ageLabel}</small>
      </div>
    </div>
  );
}

function ItemGridCard({ item }: { item: ItemRecord }) {
  return (
    <NavLink to={`/item/reef/${item.contractAddress}/${item.tokenId}`} className="itemCard">
      <img src={assetUrl(item.imageUrl)} alt={item.name} />
      <div className="itemCardBody">
        <strong>{item.name}</strong>
        <p>{item.collectionName}</p>
        <div className="itemCardMeta">
          <span>{item.currentPriceDisplay}</span>
          <small>{item.highestOfferDisplay}</small>
        </div>
      </div>
    </NavLink>
  );
}

function DropCard({ drop }: { drop: DropRecord }) {
  return (
    <article className="dropCard">
      <img src={assetUrl(drop.coverUrl)} alt={drop.name} />
      <div className="dropCardBody">
        <span className="metaLabel">{drop.stage}</span>
        <h3>{drop.name}</h3>
        <p>{drop.description}</p>
        <div className="collectionMetricGrid">
          <div>
            <span>Mint</span>
            <strong>{drop.mintPrice}</strong>
          </div>
          <div>
            <span>Supply</span>
            <strong>{compact(drop.supply)}</strong>
          </div>
        </div>
      </div>
    </article>
  );
}

function NetworkDot({ label }: { label: string }) {
  const styles: Record<string, string> = {
    Reef: "#2081e2",
    All: "#34383d",
    ETH: "#627eea",
    SOL: "#14f195",
    BASE: "#0052ff",
    ARB: "#28a0f0",
    AVAX: "#e84142",
    APE: "#1d4ed8",
    MATIC: "#8247e5",
    More: "#4b5563"
  };
  return <span className="networkDot" style={{ backgroundColor: styles[label] ?? "#4b5563" }} />;
}

function PageState({ message }: { message: string }) {
  return (
    <div className="darkPage">
      <section className="pagePanel">
        <p className="panelBody">{message}</p>
      </section>
    </div>
  );
}

function DataState<T>({
  state,
  children
}: {
  state: { loading: boolean; data?: T; error?: string };
  children: (data: T) => ReactNode;
}) {
  if (state.loading) {
    return <PageState message="Loading route data..." />;
  }
  if (!state.data) {
    return <PageState message={state.error?.includes("(404)") ? "Page not found." : state.error ?? "Route data failed to load"} />;
  }
  return <>{children(state.data)}</>;
}

function updateParams(
  current: URLSearchParams,
  setParams: ReturnType<typeof useSearchParams>[1],
  changes: Record<string, string>
) {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(changes)) {
    if (!value || value === "all") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }
  setParams(next, { replace: true });
}
