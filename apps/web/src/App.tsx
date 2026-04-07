import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { BrowserProvider, Contract, Interface, JsonRpcProvider, formatEther, parseEther } from "ethers";
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
import MetricPanel from "./components/MetricPanel";
import SectionHeader from "./components/SectionHeader";
import DiscoverHeroPanel from "./components/discover/DiscoverHeroPanel";
import DiscoverLeaderboardPanel from "./components/discover/DiscoverLeaderboardPanel";
import FeaturedCollectionCard from "./components/discover/FeaturedCollectionCard";
import ProfileSetupModal from "./components/ProfileSetupModal";
import UserAvatar from "./components/UserAvatar";
import ProfileHero from "./components/profile/ProfileHero";
import ProfileTabBar from "./components/profile/ProfileTabBar";
import ProfileGalleriesTab from "./components/profile/ProfileGalleriesTab";
import ProfileItemsTab from "./components/profile/ProfileItemsTab";
import ProfileTokensTab from "./components/profile/ProfileTokensTab";
import ProfilePortfolioTab from "./components/profile/ProfilePortfolioTab";
import ProfileListingsTab from "./components/profile/ProfileListingsTab";
import ProfileOffersTab from "./components/profile/ProfileOffersTab";
import ProfileCreatedTab from "./components/profile/ProfileCreatedTab";
import ProfileActivityTab from "./components/profile/ProfileActivityTab";
import { assetUrl, themeStyle } from "./lib/presentation";
import type {
  ActivityRecord,
  CollectionSummary,
  DropRecord,
  ItemRecord,
  ProfileSummary,
  ProfileResponse,
  SessionUser,
  StudioRecord,
  TokenRecord,
  RewardsRecord
} from "./types";

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
  deploymentMode: PublicAppConfig["deployment"]["mode"];
  capabilities: PublicAppConfig["deployment"];
  liveTrading: boolean;
  indexer: {
    enabled: boolean;
    lastIndexedBlock: number;
    reason?: string;
  };
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

type AuthNonceResponse = {
  address: string;
  nonce: string;
  message: string;
  expiresAt: string;
};

type AuthVerifyResponse = {
  token: string;
  user?: SessionUser;
};

type AuthSessionResponse = {
  user?: SessionUser;
};

type UserProfileUpdateResponse = {
  ok: boolean;
  user?: SessionUser;
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

type CreatorCollectionDraft = {
  slug: string;
  ownerAddress: string;
  name: string;
  symbol: string;
  description: string;
  avatarUrl: string;
  bannerUrl: string;
  chainKey: string;
  chainName: string;
  standard: string;
  deploymentMode: string;
  factoryAddress: string;
  marketplaceMode: string;
  contractUri: string;
  contractAddress: string;
  deploymentTxHash: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type CreatorCollectionsResponse = {
  owner: string;
  collections: CreatorCollectionDraft[];
};

type MintQueueDraft = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  accent: string;
  editionQuantity: string;
  recipient: string;
  imageUrl: string;
  traitsJson: string;
  sourceLabel?: string;
  status: "queued" | "minting" | "minted" | "failed";
  tokenId?: string;
  error?: string;
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
  authToken: string;
  userRole: string;
  currentUser: SessionUser | null;
  status: string;
  connectWallet: () => Promise<void>;
  getWalletSession: () => Promise<WalletSession | null>;
  setStatus: (value: string) => void;
  saveCurrentUserProfile: (input: { displayName: string; bio?: string; avatarUri?: string; bannerUri?: string }) => Promise<SessionUser | null>;
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

function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    const mappedPort =
      port === "3002" ? "4010" : port === "3001" ? "4002" : "4000";
    return `${protocol}//${hostname}:${mappedPort}`;
  }

  return "http://localhost:4000";
}

const apiBaseUrl = resolveApiBaseUrl();
const authTokenStorageKey = "reef-opensea.auth.token";
const authAddressStorageKey = "reef-opensea.auth.address";
const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);
const collectionAbi = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function approve(address to, uint256 tokenId) external",
  "function owner() view returns (address)",
  "function mintTo(address to, string tokenUri) external returns (uint256)"
];
const creatorCollectionAbi = [
  "function owner() view returns (address)",
  "function mintCreator(address to, string tokenUri) external returns (uint256)"
];
const fallbackCreatorCollectionAbi = [
  "function owner() view returns (address)",
  "function mintTo(address to, string tokenUri) external returns (uint256)"
];
const editionCollectionAbi = [
  "function owner() view returns (address)",
  "function mintCreator(address to, uint256 quantity, string tokenUri) external returns (uint256)",
  "event CreatorMint(address indexed to, uint256 indexed tokenId, uint256 quantity, string tokenURI)"
];
const marketplaceAbi = [
  "function createListing(address collection, uint256 tokenId, uint256 price) external returns (uint256)",
  "function cancelListing(uint256 listingId) external",
  "function buyListing(uint256 listingId) external payable"
];
const marketplace1155Abi = [
  "function createListing(address collection, uint256 tokenId, uint256 quantity, uint256 unitPrice) external returns (uint256)",
  "function cancelListing(uint256 listingId) external",
  "function buyListing(uint256 listingId, uint256 quantity) external payable"
];
const creatorFactoryAbi = [
  "function predictCollectionAddress(address creator, bytes32 salt) view returns (address)",
  "function createCollection(string name_, string symbol_, tuple(string baseURI,string contractURI,string dropURI,uint256 maxSupply,address creatorPayoutAddress,uint96 royaltyBps,uint80 mintPrice,uint48 startTime,uint48 endTime,uint16 maxTotalMintableByWallet,uint16 feeBps,bool restrictFeeRecipients) config, bytes32 salt_) returns (address collection)"
];
const fallbackCreatorFactory721Abi = [
  "event CollectionCreated(address indexed creator, address indexed collection, string name, string symbol)",
  "function createCollection(string name_, string symbol_, string contractMetadataUri_) returns (address collection)"
];
const editionFactoryAbi = [
  "event CollectionCreated(address indexed creator, address indexed collection, string name, string symbol)",
  "function createCollection(string name_, string symbol_, string contractMetadataUri_, uint96 royaltyBps_) returns (address collection)"
];
const transferEventInterface = new Interface([
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
]);

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

function randomSaltHex() {
  const bytes = new Uint8Array(32);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return `0x${Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function getReefTransactionOverrides(
  config: PublicAppConfig,
  kind: "collection" | "marketplace" = "collection"
) {
  if (config.network.key !== "reef") {
    return {};
  }

  return {
    type: 0 as const,
    gasPrice: 1_000_000_000n,
    gasLimit: kind === "marketplace" ? 8_000_000_000n : 8_000_000_000n
  };
}

function parseCollectionCreatedFromReceipt(
  logs: readonly { topics: readonly string[]; data: string }[],
  contractInterface: Interface
) {
  for (const log of logs) {
    try {
      const parsed = contractInterface.parseLog(log);
      if (parsed?.name === "CollectionCreated") {
        return String(parsed.args.collection);
      }
    } catch {}
  }
  return "";
}

async function waitForTransactionReceiptWithFallback(
  txHash: string,
  provider: BrowserProvider,
  config: PublicAppConfig,
  timeoutMs = 45_000
) {
  const startedAt = Date.now();
  const rpcProvider =
    config.network.rpcUrl
      ? new JsonRpcProvider(config.network.rpcUrl, Number(config.network.chainId))
      : null;

  while (Date.now() - startedAt < timeoutMs) {
    const walletReceipt = await provider.send("eth_getTransactionReceipt", [txHash]).catch(() => null) as
      | { status?: string; blockNumber?: string; logs?: Array<{ topics: string[]; data: string }> }
      | null;
    if (walletReceipt?.blockNumber) {
      return provider.getTransactionReceipt(txHash);
    }

    if (rpcProvider) {
      const rpcReceipt = await rpcProvider.getTransactionReceipt(txHash).catch(() => null);
      if (rpcReceipt) {
        return rpcReceipt;
      }
    }

    await new Promise((resolve) => globalThis.setTimeout(resolve, 1500));
  }

  throw new Error("Transaction was submitted but Reef did not return a receipt in time. Check your wallet activity, then refresh the page.");
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

function withAuthorization(headers: HeadersInit | undefined, token: string) {
  return {
    ...(headers && !Array.isArray(headers) ? headers : {}),
    Authorization: `Bearer ${token}`
  };
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

export default function App() {
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [bootstrapState, setBootstrapState] = useState<{
    loading: boolean;
    data?: BootstrapResponse;
    error?: string;
  }>({ loading: true });
  const [account, setAccount] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [userRole, setUserRole] = useState("user");
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [profileSetupOpen, setProfileSetupOpen] = useState(false);
  const [profileSetupSaving, setProfileSetupSaving] = useState(false);
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

  function normalizeSessionUser(user: SessionUser | undefined, fallbackAddress: string): SessionUser {
    return {
      address: user?.address?.toLowerCase() || fallbackAddress.toLowerCase(),
      role: user?.role ?? (fallbackAddress ? "creator" : "user"),
      displayName: user?.displayName ?? "",
      bio: user?.bio ?? "",
      avatarUri: user?.avatarUri ?? "",
      bannerUri: user?.bannerUri ?? ""
    };
  }

  function maybeOpenProfileSetup(user: SessionUser | null) {
    if (!user?.address) {
      return;
    }
    setProfileSetupOpen(!Boolean(user.displayName?.trim()));
  }

  useEffect(() => {
    const storedToken = localStorage.getItem(authTokenStorageKey) ?? "";
    const storedAddress = localStorage.getItem(authAddressStorageKey) ?? "";

    if (!storedToken || !storedAddress) {
      return;
    }

    fetchJson<AuthSessionResponse>("/auth/session", {
      headers: {
        Authorization: `Bearer ${storedToken}`
      }
    })
      .then((data) => {
        const address = data.user?.address?.toLowerCase() ?? storedAddress.toLowerCase();
        const normalizedUser = normalizeSessionUser(data.user, address);
        setAccount(address);
        setAuthToken(storedToken);
        setUserRole(normalizedUser.role);
        setCurrentUser(normalizedUser);
        maybeOpenProfileSetup(normalizedUser);
      })
      .catch(() => {
        localStorage.removeItem(authTokenStorageKey);
        localStorage.removeItem(authAddressStorageKey);
        setAuthToken("");
        setUserRole("user");
        setCurrentUser(null);
      });
  }, []);

  const isAdmin = userRole === "admin";

  async function authenticateWalletSession(session: WalletSession) {
    const normalizedAddress = session.address.toLowerCase();
    if (authToken && account && sameAddress(account, normalizedAddress)) {
      return authToken;
    }

    const nonce = await fetchJson<AuthNonceResponse>(`/auth/nonce${buildQuery({ address: normalizedAddress })}`);
    const signature = await session.signer.signMessage(nonce.message);
    const verified = await fetchJson<AuthVerifyResponse>("/auth/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        address: normalizedAddress,
        nonce: nonce.nonce,
        message: nonce.message,
        signature
      })
    });

    localStorage.setItem(authTokenStorageKey, verified.token);
    localStorage.setItem(authAddressStorageKey, normalizedAddress);
    const normalizedUser = normalizeSessionUser(verified.user, normalizedAddress);
    setAuthToken(verified.token);
    setUserRole(normalizedUser.role);
    setCurrentUser(normalizedUser);
    maybeOpenProfileSetup(normalizedUser);
    return verified.token;
  }

  async function saveCurrentUserProfile(input: {
    displayName: string;
    bio?: string;
    avatarUri?: string;
    bannerUri?: string;
  }) {
    if (!authToken || !account) {
      setStatus("Connect a wallet before saving your profile.");
      return null;
    }

    const displayName = input.displayName.trim();
    if (!displayName) {
      setStatus("Display name is required.");
      return null;
    }

    setProfileSetupSaving(true);
    try {
      const response = await fetchJson<UserProfileUpdateResponse>("/users/me", {
        method: "PATCH",
        headers: withAuthorization(
          {
            "Content-Type": "application/json"
          },
          authToken
        ),
        body: JSON.stringify({
          displayName,
          bio: input.bio?.trim() ?? "",
          avatarUri: input.avatarUri?.trim() ?? "",
          bannerUri: input.bannerUri?.trim() ?? ""
        })
      });
      const normalizedUser = normalizeSessionUser(response.user, account);
      setCurrentUser(normalizedUser);
      setUserRole(normalizedUser.role);
      setProfileSetupOpen(false);
      setStatus(`Profile saved for ${normalizedUser.displayName || shortenAddress(account)}.`);
      refreshMarket();
      return normalizedUser;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save profile.");
      return null;
    } finally {
      setProfileSetupSaving(false);
    }
  }

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
      const session = { provider, signer, address };
      setAccount(address.toLowerCase());
      await authenticateWalletSession(session);
      return session;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Wallet connection failed");
      return null;
    }
  }

  async function connectWallet() {
    const session = await getWalletSession();
    if (session) {
      const { address } = session;
      const label = currentUser?.displayName?.trim() || shortenAddress(address);
      setStatus(`Connected ${label}`);
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
        authToken,
        userRole,
        currentUser,
        status,
        connectWallet,
        getWalletSession,
        setStatus,
        saveCurrentUserProfile,
        refreshMarket,
        refreshNonce
      }}
    >
      <>
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
            <Route path="create/drop" element={<CreateDropPage />} />
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
        <ProfileSetupModal
          open={profileSetupOpen}
          address={account}
          initialDisplayName={currentUser?.displayName ?? ""}
          initialBio={currentUser?.bio ?? ""}
          saving={profileSetupSaving}
          onClose={() => setProfileSetupOpen(false)}
          onSubmit={saveCurrentUserProfile}
        />
      </>
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
  const { bootstrap, account, currentUser, isAdmin, connectWallet } = useMarketplace();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const shellReady = bootstrap.runtime.services.database && bootstrap.runtime.services.storage;
  const profileHref = account ? `/profile/${account}` : "/profile";
  const accountLabel = currentUser?.displayName?.trim() || (account ? shortenAddress(account) : "Connect Wallet");
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
              {accountLabel}
            </button>
            <button
              className={account ? "iconCircle accountAvatarButton" : "iconCircle"}
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
              {account ? (
                <UserAvatar
                  address={account}
                  displayName={currentUser?.displayName}
                  src={currentUser?.avatarUri}
                  className="userAvatar headerUserAvatar"
                />
              ) : (
                <Icon icon="profile" />
              )}
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
  const navigate = useNavigate();
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
        const featuredCollections =
          trendingCollections.length > 0 ? trendingCollections : leaderboardCollections;
        const collectionShelf = topMovers.length > 0 ? topMovers : featuredCollections;
        const showPrimaryShelf = selectedAsset === "tokens" || featuredCollections.length > 0;

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
                onClick={() =>
                  updateParams(params, setParams, {
                    category: "all",
                    asset: "nfts",
                    timeframe: "1d"
                  })
                }
              >
                <Icon icon="chevron-right" />
              </button>
            </div>

            <div className="discoverLayout">
              <DiscoverHeroPanel
                heroCollection={heroCollection}
                onCreateCollection={() => navigate("/create/collection")}
                onLaunchNft={() => navigate("/create")}
                onOpenStudio={() => navigate("/studio")}
              />
              <DiscoverLeaderboardPanel
                selectedAsset={selectedAsset as "nfts" | "tokens"}
                tokenLeaders={tokenLeaders}
                leaderboardCollections={leaderboardCollections}
              />
            </div>

            {showPrimaryShelf ? (
              <section className="sectionBlock">
                <SectionHeader
                  title={selectedAsset === "tokens" ? "Trending Tokens" : "Featured Collections"}
                  subtitle={selectedAsset === "tokens" ? "Tokens with momentum today" : "Live collections on Reef"}
                />
                {selectedAsset === "tokens" ? (
                  tokenLeaders.length === 0 ? (
                    <div className="panelSurface emptySection">
                      <p className="panelBody">No tokens to display.</p>
                    </div>
                  ) : (
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
                  )
                ) : (
                  <div className="cardStack">
                    {featuredCollections.slice(0, 4).map((collection) => (
                      <FeaturedCollectionCard key={collection.slug} collection={collection} />
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            <section className="sectionGrid discoverSecondaryGrid">
              <div className="panelSurface">
                <SectionHeader title="Collections" subtitle="Explore live creator collections across Reef" />
                {collectionShelf.length === 0 ? (
                  <div className="discoverPanelEmpty">
                    <p className="panelBody">No live collections yet. Publish a collection to populate discover.</p>
                    <div className="panelActionRow">
                      <button className="actionButton secondary" type="button" onClick={() => navigate("/create/collection")}>
                        Create collection
                      </button>
                      <button className="actionButton muted" type="button" onClick={() => navigate("/studio")}>
                        Open Studio
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="compactStack">
                    {collectionShelf.map((collection) => (
                      <CompactCollectionRow key={collection.slug} collection={collection} highlightChange />
                    ))}
                  </div>
                )}
              </div>

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
                  <div className="discoverPanelEmpty">
                    <p className="panelBody">No drops to display.</p>
                    <div className="panelActionRow">
                      <button className="actionButton secondary" type="button" onClick={() => navigate("/create/drop")}>
                        Create drop
                      </button>
                      <button className="actionButton muted" type="button" onClick={() => navigate("/drops")}>
                        Open Drops
                      </button>
                    </div>
                  </div>
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
    <div className="darkPage createMintPage">
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
  const { account, authToken, isAdmin, connectWallet, refreshMarket, refreshNonce, setStatus } = useMarketplace();
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
      headers: withAuthorization(undefined, authToken)
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
  }, [account, authToken, isAdmin, refreshNonce]);

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
          headers: withAuthorization(
            {
              "Content-Type": "application/json"
            },
            authToken
          ),
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
        headers: withAuthorization(undefined, authToken)
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
  const { account, isAdmin, getWalletSession, setStatus } = useMarketplace();
  const navigate = useNavigate();
  const closeHref = account ? `/profile/${account}?tab=created` : "/";

  async function ensureWallet() {
    if (account) {
      return account;
    }
    const session = await getWalletSession();
    return session?.address ?? "";
  }

  async function openCollectionFlow() {
    const connected = await ensureWallet();
    if (!connected) {
      return;
    }
    navigate("/create/collection");
  }

  async function openDropFlow() {
    const connected = await ensureWallet();
    if (!connected) {
      return;
    }
    if (!isAdmin) {
      setStatus("Scheduled drops are managed from the Reef admin panel in this environment.");
      navigate("/drops");
      return;
    }
    navigate("/create/drop");
  }

  return (
    <div className="darkPage studioChooserPage">
      <section className="studioChooserShell">
        <button className="ghostIcon studioCloseButton" type="button" aria-label="Close studio" onClick={() => navigate(closeHref)}>
          <Icon icon="close" />
        </button>

        <div className="studioChooserGrid">
          <div className="studioChooserLead">
            <h1>What do you want to create?</h1>
            <div className="studioGuideCard">
              <p>View our guide to help decide between a Scheduled Drop and an Open Collection.</p>
              <button className="studioGuideButton" type="button" onClick={() => navigate("/support")}>
                View Guide
              </button>
            </div>
          </div>

          <div className="studioChooserOptions">
            <article className="studioCreateCard">
              <div className="studioCreateArt studioCreateArtDrop">
                <div className="studioGradientTile">
                  <span className="studioTileOrb" />
                  <span className="studioTileBadge">
                    <Icon icon="calendar" />
                  </span>
                </div>
              </div>
              <h2>Scheduled Drop</h2>
              <button className="studioCreateButton" type="button" onClick={() => void openDropFlow()}>
                Create Drop
              </button>
              <p className="studioCreateDescription">
                Build anticipation with timed launches, gated access, and reveal after mint. Great for 1/1s or curated editions.
              </p>
              <ul className="studioFeatureList">
                <li><span>&lt;/&gt;</span><strong>ERC-721 contract</strong></li>
                <li><span><Icon icon="calendar" /></span><strong>Scheduled launch</strong></li>
                <li><span><Icon icon="share" /></span><strong>Fixed number of items</strong></li>
                <li><span><Icon icon="copy" /></span><strong>Post-mint reveal</strong></li>
                <li><span><Icon icon="profile" /></span><strong>Gated access</strong></li>
              </ul>
            </article>

            <article className="studioCreateCard">
              <div className="studioCreateArt studioCreateArtCollection">
                <div className="studioGradientMini a" />
                <div className="studioGradientMini b" />
                <div className="studioGradientMini c" />
                <div className="studioGradientMini add">
                  <span className="studioAddGlyph">+</span>
                </div>
              </div>
              <h2>Open Collection</h2>
              <button className="studioCreateButton" type="button" onClick={() => void openCollectionFlow()}>
                Create Collection
              </button>
              <p className="studioCreateDescription">
                Publish immediately, ideal for ongoing series or iterative works. Best for Editions or mixed-format collections.
              </p>
              <ul className="studioFeatureList">
                <li><span>&lt;/&gt;</span><strong>Creator collection</strong></li>
                <li><span><Icon icon="spark" /></span><strong>Launch instantly</strong></li>
                <li><span><Icon icon="share" /></span><strong>Add new items anytime</strong></li>
                <li><span><Icon icon="grid" /></span><strong>Items show right away</strong></li>
                <li><span><Icon icon="activity" /></span><strong>Great for evolving collections</strong></li>
              </ul>
            </article>
          </div>
        </div>
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

function buildStarterNftArtwork(
  title: string,
  subtitle: string,
  variant: "orb" | "mask" | "monolith" | "glyph"
) {
  const safeTitle = title.trim() || "Reef";
  const safeSubtitle = subtitle.trim() || "NFT";

  const variantMarkup = (() => {
    switch (variant) {
      case "mask":
        return `
          <rect x="250" y="182" width="700" height="836" rx="180" fill="url(#maskFill)" />
          <rect x="312" y="264" width="576" height="516" rx="148" fill="#121417" />
          <circle cx="470" cy="516" r="56" fill="#79d5ff" />
          <circle cx="730" cy="516" r="56" fill="#ffb86c" />
          <path d="M430 690c54 62 286 62 340 0" stroke="#f2f5f8" stroke-width="30" stroke-linecap="round" fill="none" />
          <rect x="466" y="784" width="268" height="90" rx="38" fill="rgba(255,255,255,0.12)" />
          <defs>
            <linearGradient id="maskFill" x1="250" y1="182" x2="950" y2="1018">
              <stop offset="0%" stop-color="#1f7ae0" />
              <stop offset="54%" stop-color="#6e5cff" />
              <stop offset="100%" stop-color="#6ff3b1" />
            </linearGradient>
          </defs>
        `;
      case "monolith":
        return `
          <rect x="278" y="126" width="644" height="948" rx="44" fill="#0f1320" />
          <rect x="320" y="168" width="560" height="864" rx="28" fill="url(#monolithFill)" />
          <rect x="402" y="250" width="396" height="560" rx="24" fill="rgba(14,17,24,0.72)" />
          <circle cx="600" cy="418" r="136" fill="rgba(108,181,255,0.22)" />
          <path d="M446 760 600 398l154 362" stroke="#edf1ff" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          <defs>
            <linearGradient id="monolithFill" x1="320" y1="168" x2="880" y2="1032">
              <stop offset="0%" stop-color="#111827" />
              <stop offset="45%" stop-color="#1d4ed8" />
              <stop offset="100%" stop-color="#7c3aed" />
            </linearGradient>
          </defs>
        `;
      case "glyph":
        return `
          <rect x="180" y="180" width="840" height="840" rx="120" fill="url(#glyphFill)" />
          <circle cx="600" cy="600" r="250" fill="rgba(17,19,21,0.76)" />
          <path d="M468 380h264v86H554v82h146v84H554v98h188v86H468z" fill="#f7f8fb" />
          <circle cx="780" cy="420" r="42" fill="#8af0cf" />
          <circle cx="410" cy="770" r="32" fill="#ff9f6b" />
          <defs>
            <radialGradient id="glyphFill" cx="50%" cy="38%" r="80%">
              <stop offset="0%" stop-color="#75e0ff" />
              <stop offset="38%" stop-color="#4f7cff" />
              <stop offset="72%" stop-color="#7c3aed" />
              <stop offset="100%" stop-color="#0f172a" />
            </radialGradient>
          </defs>
        `;
      default:
        return `
          <rect x="160" y="160" width="880" height="880" rx="160" fill="url(#orbFill)" />
          <circle cx="600" cy="600" r="270" fill="rgba(255,255,255,0.08)" />
          <circle cx="600" cy="600" r="208" fill="url(#coreFill)" />
          <ellipse cx="600" cy="598" rx="312" ry="112" fill="none" stroke="rgba(255,255,255,0.44)" stroke-width="24" />
          <circle cx="760" cy="430" r="54" fill="rgba(255,255,255,0.14)" />
          <defs>
            <linearGradient id="orbFill" x1="160" y1="160" x2="1040" y2="1040">
              <stop offset="0%" stop-color="#07162a" />
              <stop offset="50%" stop-color="#0f2657" />
              <stop offset="100%" stop-color="#0a0f1a" />
            </linearGradient>
            <radialGradient id="coreFill" cx="42%" cy="32%" r="80%">
              <stop offset="0%" stop-color="#d7f8ff" />
              <stop offset="26%" stop-color="#80dfff" />
              <stop offset="62%" stop-color="#7f65ff" />
              <stop offset="100%" stop-color="#0f172a" />
            </radialGradient>
          </defs>
        `;
    }
  })();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200"><rect width="1200" height="1200" fill="#0d1014" />${variantMarkup}<text x="96" y="1020" font-family="Arial,Helvetica,sans-serif" font-size="42" font-weight="700" fill="#f8fafc">${safeTitle}</text><text x="96" y="1076" font-family="Arial,Helvetica,sans-serif" font-size="28" fill="rgba(248,250,252,0.72)">${safeSubtitle}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildStarterArtworkSet(title: string, subtitle: string) {
  return [
    { id: "orb", label: "Nebula Orb", imageUrl: buildStarterNftArtwork(title, subtitle, "orb") },
    { id: "mask", label: "Signal Mask", imageUrl: buildStarterNftArtwork(title, subtitle, "mask") },
    { id: "monolith", label: "Reef Monolith", imageUrl: buildStarterNftArtwork(title, subtitle, "monolith") },
    { id: "glyph", label: "Core Glyph", imageUrl: buildStarterNftArtwork(title, subtitle, "glyph") }
  ] as const;
}

function buildProfileEmptyArtwork(variant: "items" | "created") {
  const art =
    variant === "created"
      ? `
        <rect x="56" y="82" width="148" height="180" rx="24" fill="rgba(39,46,56,0.9)" stroke="rgba(255,255,255,0.06)" />
        <rect x="216" y="52" width="176" height="210" rx="28" fill="rgba(23,27,33,0.98)" stroke="rgba(255,255,255,0.08)" />
        <rect x="252" y="88" width="104" height="104" rx="24" fill="url(#cardGlow)" />
        <path d="M286 142h36" stroke="#f8fafc" stroke-width="10" stroke-linecap="round" />
        <path d="M304 124v36" stroke="#f8fafc" stroke-width="10" stroke-linecap="round" />
        <rect x="100" y="110" width="62" height="62" rx="16" fill="rgba(74,133,255,0.2)" />
        <rect x="92" y="294" width="268" height="16" rx="8" fill="rgba(255,255,255,0.08)" />
        <rect x="148" y="322" width="156" height="12" rx="6" fill="rgba(255,255,255,0.05)" />
      `
      : `
        <rect x="74" y="86" width="136" height="170" rx="24" fill="rgba(39,46,56,0.82)" stroke="rgba(255,255,255,0.06)" />
        <rect x="210" y="62" width="172" height="206" rx="30" fill="rgba(22,26,32,0.98)" stroke="rgba(255,255,255,0.08)" />
        <rect x="260" y="108" width="72" height="72" rx="20" fill="rgba(73,149,255,0.18)" />
        <circle cx="352" cy="102" r="14" fill="#86aefc" />
        <circle cx="330" cy="126" r="58" fill="url(#orbGlow)" />
        <rect x="238" y="208" width="116" height="14" rx="7" fill="rgba(255,255,255,0.1)" />
        <rect x="258" y="234" width="76" height="10" rx="5" fill="rgba(255,255,255,0.06)" />
        <rect x="104" y="116" width="78" height="78" rx="22" fill="rgba(71,178,255,0.14)" />
        <path d="M86 302h284" stroke="rgba(255,255,255,0.08)" stroke-width="14" stroke-linecap="round" />
      `;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="448" height="360" viewBox="0 0 448 360" fill="none">
    <defs>
      <radialGradient id="orbGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(330 126) rotate(90) scale(72)">
        <stop offset="0" stop-color="#9CD8FF"/>
        <stop offset="0.42" stop-color="#67A6FF"/>
        <stop offset="1" stop-color="#2A3857" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="cardGlow" x1="252" y1="88" x2="356" y2="192" gradientUnits="userSpaceOnUse">
        <stop stop-color="#6D5EF6"/>
        <stop offset="1" stop-color="#6DD1FF"/>
      </linearGradient>
    </defs>
    <circle cx="90" cy="78" r="38" fill="rgba(52,124,255,0.08)" />
    <circle cx="364" cy="274" r="52" fill="rgba(102,91,255,0.08)" />
    ${art}
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function CreatePage() {
  const {
    account,
    authToken,
    bootstrap,
    connectWallet,
    getWalletSession,
    setStatus,
    refreshMarket,
    refreshNonce
  } = useMarketplace();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queueInputRef = useRef<HTMLInputElement | null>(null);
  const nftImageInputRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [metadataUri, setMetadataUri] = useState("");
  const [metadataGatewayUrl, setMetadataGatewayUrl] = useState("");
  const [mintQueue, setMintQueue] = useState<MintQueueDraft[]>([]);
  const [creatorCollectionsState, setCreatorCollectionsState] = useState<{
    loading: boolean;
    collections: CreatorCollectionDraft[];
    error?: string;
  }>({
    loading: false,
    collections: []
  });
  const [selectedCollectionSlug, setSelectedCollectionSlug] = useState("");
  const [form, setForm] = useState({
    name: "",
    subtitle: "",
    description: "",
    accent: "#2081e2",
    editionQuantity: "1",
    recipient: "",
    imageUrl: "",
    traitsJson: '[\n  {\n    "trait_type": "Edition",\n    "value": "Creator"\n  }\n]'
  });
  const requestedCollectionSlug = params.get("collection")?.trim().toLowerCase() ?? "";
  const batchMode = params.get("batch") === "1";
  const freshCollection = params.get("fresh") === "1";

  function createDraftId() {
    return globalThis.crypto?.randomUUID?.() ?? randomSaltHex();
  }

  function createEmptyDraftState(overrides?: Partial<typeof form>) {
    return {
      name: "",
      subtitle: "",
      description: "",
      accent: "#2081e2",
      editionQuantity: "1",
      recipient: account || "",
      imageUrl: "",
      traitsJson: '[\n  {\n    "trait_type": "Edition",\n    "value": "Creator"\n  }\n]',
      ...overrides
    };
  }

  useEffect(() => {
    refreshMarket();
  }, []);

  useEffect(() => {
    if (account && !form.recipient) {
      setForm((current) => ({
        ...current,
        recipient: account
      }));
    }
  }, [account, form.recipient]);

  useEffect(() => {
    if (!account) {
      setCreatorCollectionsState({
        loading: false,
        collections: []
      });
      setSelectedCollectionSlug("");
      return;
    }

    let cancelled = false;
    setCreatorCollectionsState((current) => ({
      ...current,
      loading: true,
      error: undefined
    }));

    fetchJson<CreatorCollectionsResponse>(
      `/creator/collections${buildQuery({ owner: account })}`
    )
      .then((response) => {
        if (cancelled) {
          return;
        }
        setCreatorCollectionsState({
          loading: false,
          collections: response.collections
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setCreatorCollectionsState({
          loading: false,
          collections: [],
          error: error instanceof Error ? error.message : "Failed to load creator collections."
        });
      });

    return () => {
      cancelled = true;
    };
  }, [account, refreshNonce]);

  useEffect(() => {
    if (!creatorCollectionsState.collections.length) {
      setSelectedCollectionSlug("");
      return;
    }

    if (requestedCollectionSlug) {
      const requestedCollection = creatorCollectionsState.collections.find(
        (collection) => collection.slug.toLowerCase() === requestedCollectionSlug
      );
      if (requestedCollection) {
        setSelectedCollectionSlug(requestedCollection.slug);
        return;
      }
    }

    if (
      selectedCollectionSlug &&
      creatorCollectionsState.collections.some((collection) => collection.slug === selectedCollectionSlug)
    ) {
      return;
    }

    const firstReadyCollection =
      creatorCollectionsState.collections.find(
        (collection) =>
          collection.status.toLowerCase() === "ready" && Boolean(collection.contractAddress)
      ) ?? creatorCollectionsState.collections[0];
    setSelectedCollectionSlug(firstReadyCollection.slug);
  }, [creatorCollectionsState.collections, requestedCollectionSlug, selectedCollectionSlug]);

  async function readNftImageFile(file: File) {
    const result = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}.`));
      reader.readAsDataURL(file);
    });
    setForm((current) => ({
      ...current,
      imageUrl: result
    }));
    setStatus(`${file.name} is ready to mint.`);
  }

  const selectedCollection =
    creatorCollectionsState.collections.find((collection) => collection.slug === selectedCollectionSlug) ?? null;
  const starterArtworks = buildStarterArtworkSet(
    form.name || "Reef NFT",
    form.subtitle || "Collector Edition"
  );
  const previewImage =
    form.imageUrl.trim() ||
    selectedCollection?.avatarUrl?.trim() ||
    selectedCollection?.bannerUrl?.trim() ||
    starterArtworks[0].imageUrl;
  const creatorCapabilities = [
    bootstrap.config.deployment.creator.erc721,
    bootstrap.config.deployment.creator.erc1155
  ];
  const creatorFactoryReady = creatorCapabilities.some(
    (capability) => capability.enabled && Boolean(capability.factoryAddress)
  );
  const creatorPathLabel = creatorCapabilities.some((capability) => capability.mode === "official")
    ? "Official OpenSea creator path active"
    : creatorCapabilities.some((capability) => capability.mode === "fallback")
      ? "Reef fallback creator path active"
      : "Waiting on Reef deploy";
  const creatorCollectionReady = Boolean(
    selectedCollection &&
    selectedCollection.status.toLowerCase() === "ready" &&
    selectedCollection.contractAddress
  );

  useEffect(() => {
    if (!freshCollection || !selectedCollection) {
      return;
    }
    setStatus(`Collection ${selectedCollection.name} is ready. Add multiple NFTs below and mint them into this collection.`);
  }, [freshCollection, selectedCollection, setStatus]);

  const mintBlocker = (() => {
    if (!account) {
      return "Connect the creator wallet to mint on Reef.";
    }
    if (creatorCollectionsState.loading) {
      return "Loading your Reef creator collections...";
    }
    if (creatorCollectionsState.error) {
      return creatorCollectionsState.error;
    }
    if (!creatorCollectionsState.collections.length) {
      if (!creatorFactoryReady) {
        return "No creator deployment path is active on Reef yet.";
      }
      return "Create a collection first, then mint into that collection.";
    }
    if (!selectedCollection) {
      return "Choose a creator collection before minting.";
    }
    if (!selectedCollection.contractAddress || selectedCollection.status.toLowerCase() !== "ready") {
      return `Selected collection is ${selectedCollection.status}. Deploy the collection contract before minting.`;
    }
    return "";
  })();

  function previewForDraft(draft: Pick<MintQueueDraft, "name" | "subtitle" | "imageUrl">) {
    const source = draft.imageUrl.trim();
    if (source) {
      return source;
    }
    const inheritedCollectionArtwork =
      selectedCollection?.avatarUrl?.trim() || selectedCollection?.bannerUrl?.trim();
    if (inheritedCollectionArtwork) {
      return inheritedCollectionArtwork;
    }
    return buildStarterArtworkSet(
      draft.name || "Reef NFT",
      draft.subtitle || "Collector Edition"
    )[0].imageUrl;
  }

  function persistedImageForDraft(draft: Pick<MintQueueDraft, "name" | "subtitle" | "imageUrl">) {
    const explicitSource = draft.imageUrl.trim();
    if (explicitSource) {
      return explicitSource;
    }
    const inheritedCollectionArtwork =
      selectedCollection?.avatarUrl?.trim() || selectedCollection?.bannerUrl?.trim();
    if (inheritedCollectionArtwork) {
      return inheritedCollectionArtwork;
    }
    return previewForDraft(draft);
  }

  function formatCollectionStatus(status: string) {
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

  function parseTraits() {
    return parseTraitsJson(form.traitsJson);
  }

  function parseTraitsJson(traitsJson: string) {
    const trimmed = traitsJson.trim();
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

  function createQueuedDraft(overrides?: Partial<MintQueueDraft>) {
    return {
      id: createDraftId(),
      name: form.name.trim(),
      subtitle: form.subtitle.trim() || "Collector Edition",
      description: form.description.trim(),
      accent: form.accent.trim() || "#2081e2",
      editionQuantity: form.editionQuantity,
      recipient: (form.recipient.trim() || account || ""),
      imageUrl: form.imageUrl.trim(),
      traitsJson: form.traitsJson,
      status: "queued" as const,
      ...overrides
    } satisfies MintQueueDraft;
  }

  function updateQueueDraft(id: string, patch: Partial<MintQueueDraft>) {
    setMintQueue((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft))
    );
  }

  function removeQueueDraft(id: string) {
    setMintQueue((current) => current.filter((draft) => draft.id !== id));
  }

  function loadDraftIntoEditor(draft: MintQueueDraft) {
    setForm({
      name: draft.name,
      subtitle: draft.subtitle,
      description: draft.description,
      accent: draft.accent,
      editionQuantity: draft.editionQuantity,
      recipient: draft.recipient,
      imageUrl: draft.imageUrl,
      traitsJson: draft.traitsJson
    });
  }

  function addCurrentDraftToQueue() {
    const draft = createQueuedDraft();
    if (!draft.name.trim()) {
      setStatus("Name the NFT before adding it to the queue.");
      return;
    }
    setMintQueue((current) => [...current, draft]);
    setStatus(`${draft.name} added to the mint queue.`);
    setForm((current) =>
      createEmptyDraftState({
        recipient: current.recipient.trim() || account || "",
        accent: current.accent
      })
    );
    setMetadataUri("");
    setMetadataGatewayUrl("");
  }

  async function importQueueFiles(files: FileList | File[]) {
    const nextFiles = Array.from(files);
    if (!nextFiles.length) {
      return;
    }

    const drafts = await Promise.all(
      nextFiles.map(async (file) => {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result ?? ""));
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}.`));
          reader.readAsDataURL(file);
        });

        return createQueuedDraft({
          id: createDraftId(),
          name: "",
          subtitle: "",
          description: "",
          imageUrl: dataUrl,
          sourceLabel: file.name
        });
      })
    );

    setMintQueue((current) => [...current, ...drafts]);
    setStatus(
      `${drafts.length} NFT${drafts.length === 1 ? "" : "s"} added to the mint queue. Name each one before minting.`
    );
  }

  async function pinMetadata() {
    const result = await pinMetadataForDraft(createQueuedDraft({ id: createDraftId() }));
    setMetadataUri(result.uri);
    setMetadataGatewayUrl(result.gatewayUrl);
    setStatus("Metadata pinned to local IPFS.");
    return result.uri;
  }

  async function pinMetadataForDraft(draft: MintQueueDraft) {
    if (!draft.name.trim()) {
      throw new Error("NFT name is required.");
    }
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      image: persistedImageForDraft(draft),
      attributes: parseTraitsJson(draft.traitsJson)
    };
    return fetchJson<{
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
        filename: `${normalizeFilterValue(draft.name || "reef-nft") || "reef-nft"}.json`,
        payload
      })
    });
  }

  async function mintDraft(
    draft: MintQueueDraft,
    session: WalletSession,
    pinnedUri?: string
  ) {
    if (!selectedCollection) {
      throw new Error("Create a creator collection before minting.");
    }
    if (!selectedCollection.contractAddress || selectedCollection.status.toLowerCase() !== "ready") {
      throw new Error(mintBlocker || "Selected creator collection is not deployed on Reef yet.");
    }

    const resolvedMetadata = pinnedUri ?? (await pinMetadataForDraft(draft)).uri;
    const parsedTraits = parseTraitsJson(draft.traitsJson);
    const isEditionCollection = selectedCollection.standard.toUpperCase() === "ERC1155";
    const usesOfficialCreatorMint =
      !isEditionCollection && selectedCollection.deploymentMode.toLowerCase() === "official";
    const txOverrides = getReefTransactionOverrides(bootstrap.config, "collection");
    const contract = new Contract(
      selectedCollection.contractAddress,
      isEditionCollection
        ? editionCollectionAbi
        : usesOfficialCreatorMint
          ? creatorCollectionAbi
          : fallbackCreatorCollectionAbi,
      session.signer
    );
    const contractOwner = String(await contract.owner());
    if (!sameAddress(contractOwner, session.address)) {
      throw new Error("Connect the collection owner wallet to mint on this contract.");
    }

    const recipient = draft.recipient.trim() || session.address;
    setStatus(
      isEditionCollection
        ? `Submitting ${draft.name} as an ERC1155 creator mint on Reef...`
        : usesOfficialCreatorMint
          ? `Submitting ${draft.name} through the OpenSea SeaDrop collection on Reef...`
          : `Submitting ${draft.name} through the fallback ERC721 creator path on Reef...`
    );
    const tx = isEditionCollection
      ? await contract.mintCreator(
          recipient,
          BigInt(Math.max(1, Number(draft.editionQuantity || "1"))),
          resolvedMetadata,
          txOverrides
        )
      : usesOfficialCreatorMint
        ? await contract.mintCreator(recipient, resolvedMetadata, txOverrides)
        : await contract.mintTo(recipient, resolvedMetadata, txOverrides);
    const receipt = await tx.wait();
    if (receipt?.status === 0) {
      throw new Error("Mint transaction reverted on Reef.");
    }

    let mintedTokenId = "";
    for (const log of receipt?.logs ?? []) {
      try {
        if (isEditionCollection) {
          const parsedEdition = new Interface(editionCollectionAbi).parseLog(log);
          if (parsedEdition?.name === "CreatorMint") {
            mintedTokenId = String(parsedEdition.args.tokenId);
            break;
          }
        } else {
          const parsed = transferEventInterface.parseLog(log);
          if (
            parsed?.name === "Transfer" &&
            sameAddress(String(parsed.args.from), "0x0000000000000000000000000000000000000000")
          ) {
            mintedTokenId = String(parsed.args.tokenId);
            break;
          }
        }
      } catch {}
    }

    if (!mintedTokenId) {
      throw new Error("Mint completed but token id could not be determined from the transaction receipt.");
    }

    await fetchJson<{ ok: boolean; collectionSlug: string; tokenId: string }>("/creator/mints", {
      method: "POST",
      headers: withAuthorization(
        {
          "Content-Type": "application/json"
        },
        authToken
      ),
      body: JSON.stringify({
        collectionSlug: selectedCollection.slug,
        collectionAddress: selectedCollection.contractAddress,
        tokenId: mintedTokenId,
        metadataUri: resolvedMetadata,
        imageUrl: persistedImageForDraft(draft),
        name: draft.name.trim(),
        description: draft.description.trim(),
        ownerAddress: recipient,
        creatorAddress: session.address,
        txHash: tx.hash,
        blockNumber: Number(receipt?.blockNumber ?? 0),
        attributes: parsedTraits
      })
    });

    return {
      tokenId: mintedTokenId,
      contractAddress: selectedCollection.contractAddress
    };
  }

  async function mintNft() {
    setSubmitting(true);
    try {
      const session = await getWalletSession();
      if (!session) {
        return;
      }

      const draft = createQueuedDraft({ id: createDraftId() });
      const metadata = metadataUri
        ? { uri: metadataUri, gatewayUrl: metadataGatewayUrl }
        : await pinMetadataForDraft(draft);
      setMetadataUri(metadata.uri);
      setMetadataGatewayUrl(metadata.gatewayUrl);

      const result = await mintDraft(draft, session, metadata.uri);
      setStatus("NFT minted successfully.");
      refreshMarket();
      navigate(`/item/reef/${result.contractAddress}/${result.tokenId}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Mint failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function mintQueuedNfts() {
    if (!mintQueue.length) {
      setStatus("Add NFTs to the queue first.");
      return;
    }

    setSubmitting(true);
    try {
      const session = await getWalletSession();
      if (!session) {
        return;
      }

      let mintedCount = 0;
      for (const draft of mintQueue) {
        if (draft.status === "minted") {
          continue;
        }

        updateQueueDraft(draft.id, {
          status: "minting",
          error: undefined
        });

        try {
          const result = await mintDraft(draft, session);
          mintedCount += 1;
          updateQueueDraft(draft.id, {
            status: "minted",
            tokenId: result.tokenId,
            error: undefined
          });
        } catch (error) {
          updateQueueDraft(draft.id, {
            status: "failed",
            error: error instanceof Error ? error.message : "Mint failed."
          });
          throw error;
        }
      }

      refreshMarket();
      setStatus(`Minted ${mintedCount} NFT${mintedCount === 1 ? "" : "s"} into ${selectedCollection?.name ?? "your collection"}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Batch mint failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="darkPage">
      <section className="pagePanel">
        <SectionHeader
          title="Create"
          subtitle="Compose metadata, pin it to local IPFS, and mint into a SeaDrop-compatible creator collection on Reef."
        />
        <div className="metricsRow compact">
          <MetricPanel label="Wallet" value={account ? shortenAddress(account) : "Not connected"} />
          <MetricPanel
            label="Collection"
            value={selectedCollection ? selectedCollection.name : "Create one first"}
          />
          <MetricPanel label="Minting" value={mintBlocker ? "Blocked" : "Ready"} />
        </div>
      </section>

      <section className="sectionGrid adminGrid">
        <div className="panelSurface">
          <SectionHeader
            title="NFT details"
            subtitle="Create a single NFT metadata object and mint it into your Reef creator collection."
          />
          <form
            className="adminForm"
            onSubmit={(event) => {
              event.preventDefault();
              void mintNft();
            }}
          >
            <div className="fieldGrid">
              <label className="fieldGroup">
                <span>Collection</span>
                <div className="creatorCollectionPicker">
                  {creatorCollectionsState.loading ? (
                    <div className="creatorCollectionEmpty">Loading your creator collections...</div>
                  ) : creatorCollectionsState.collections.length > 0 ? (
                    <>
                      <div className="creatorCollectionToolbar">
                        <label className="creatorCollectionSelectWrap">
                          <span>Select collection</span>
                          <select
                            className="textInput creatorCollectionSelect"
                            value={selectedCollectionSlug}
                            onChange={(event) => setSelectedCollectionSlug(event.target.value)}
                          >
                            {creatorCollectionsState.collections.map((collection) => (
                              <option key={collection.slug} value={collection.slug}>
                                {collection.name} · {formatCollectionStatus(collection.status)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button className="chip" type="button" onClick={() => navigate("/create/collection")}>
                          Create new collection
                        </button>
                      </div>
                      {creatorCollectionsState.collections.map((collection) => {
                        const active = collection.slug === selectedCollectionSlug;
                        if (!active) {
                          return null;
                        }
                        return (
                          <button
                            key={collection.slug}
                            className="creatorCollectionOption active"
                            type="button"
                            onClick={() => setSelectedCollectionSlug(collection.slug)}
                          >
                            <img
                              className="creatorCollectionOptionAvatar"
                              src={collection.avatarUrl || placeholderAsset(collection.symbol || collection.name)}
                              alt={collection.name}
                            />
                            <span className="creatorCollectionOptionBody">
                              <strong>{collection.name}</strong>
                              <span>
                                {formatCollectionStatus(collection.status)}
                                {collection.contractAddress ? ` • ${shortenAddress(collection.contractAddress)}` : " • No contract"}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </>
                  ) : (
                    <div className="creatorCollectionEmpty">
                      <span>You do not have a creator collection yet.</span>
                      <button className="chip" type="button" onClick={() => navigate("/create/collection")}>
                        Create collection
                      </button>
                    </div>
                  )}
                </div>
              </label>
              <div className="fieldGroup fullSpan batchQueueSection">
                <div className="batchQueueHeader">
                  <div>
                    <span>Mint queue</span>
                    <small>
                      {batchMode
                        ? "Upload multiple NFTs and mint them into the selected collection."
                        : "Add multiple NFTs here if you want to batch mint into the same collection."}
                    </small>
                  </div>
                  <div className="adminToolbar">
                    <input
                      ref={queueInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={(event) => {
                        const files = event.target.files;
                        if (!files?.length) {
                          return;
                        }
                        void importQueueFiles(files).catch((error) => {
                          setStatus(error instanceof Error ? error.message : "Failed to queue NFT files.");
                        });
                        event.currentTarget.value = "";
                      }}
                    />
                    <button className="chip" type="button" onClick={() => queueInputRef.current?.click()}>
                      Upload multiple NFTs
                    </button>
                    <button className="chip" type="button" onClick={addCurrentDraftToQueue}>
                      Add current draft
                    </button>
                    <button
                      className="primaryCta"
                      type="button"
                      disabled={submitting || Boolean(mintBlocker) || mintQueue.length === 0}
                      onClick={() => {
                        void mintQueuedNfts();
                      }}
                    >
                      {submitting ? "Minting..." : `Mint queue${mintQueue.length ? ` (${mintQueue.length})` : ""}`}
                    </button>
                  </div>
                </div>
                {mintQueue.length === 0 ? (
                  <div className="batchQueueEmpty">
                    <strong>No queued NFTs yet.</strong>
                    <p>Upload multiple files or add the current draft to mint several NFTs into this collection in one pass.</p>
                  </div>
                ) : (
                  <div className="batchQueueList">
                    {mintQueue.map((draft, index) => (
                      <article
                        key={draft.id}
                        className={`batchQueueItem batchQueueItem--${draft.status}`}
                      >
                        <img src={previewForDraft(draft)} alt={draft.name} className="batchQueueThumb" />
                        <div className="batchQueueBody">
                          <input
                            className="textInput batchQueueNameInput"
                            value={draft.name}
                            onChange={(event) =>
                              updateQueueDraft(draft.id, {
                                name: event.target.value
                              })
                            }
                            placeholder="Name this NFT"
                          />
                          <p>{draft.sourceLabel || draft.subtitle || "Creator NFT"}</p>
                          <div className="badgeRow">
                            <span className="heroBadge">#{index + 1}</span>
                            <span className="heroBadge">{draft.status}</span>
                            {draft.tokenId ? <span className="heroBadge">TOKEN #{draft.tokenId}</span> : null}
                          </div>
                          {draft.error ? <p className="batchQueueError">{draft.error}</p> : null}
                        </div>
                        <div className="batchQueueActions">
                          <button className="chip" type="button" onClick={() => loadDraftIntoEditor(draft)}>
                            Load
                          </button>
                          <button className="chip" type="button" onClick={() => removeQueueDraft(draft.id)}>
                            Remove
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
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
              {selectedCollection?.standard?.toUpperCase() === "ERC1155" ? (
                <label className="fieldGroup">
                  <span>Edition quantity</span>
                  <input
                    className="textInput"
                    value={form.editionQuantity}
                    onChange={(event) => setForm((current) => ({ ...current, editionQuantity: event.target.value }))}
                    placeholder="10"
                  />
                </label>
              ) : null}
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
                  ref={nftImageInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void readNftImageFile(file).catch((error) => {
                        setStatus(error instanceof Error ? error.message : "Failed to load NFT image.");
                      });
                    }
                    event.currentTarget.value = "";
                  }}
                />
                <input
                  className="textInput"
                  value={form.imageUrl}
                  onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
                  placeholder="Leave blank to inherit the collection artwork automatically"
                />
                <div className="adminToolbar">
                  <button className="chip" type="button" onClick={() => nftImageInputRef.current?.click()}>
                    Upload NFT image
                  </button>
                  {form.imageUrl.trim() ? (
                    <button
                      className="chip"
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, imageUrl: "" }))}
                    >
                      Use collection artwork
                    </button>
                  ) : null}
                </div>
              </label>
              <div className="starterArtworkSection fullSpan">
                <span className="metaLabel">Starter artwork</span>
                <div className="starterArtworkRow">
                  {starterArtworks.map((artwork) => {
                    const active = (form.imageUrl.trim() || previewImage) === artwork.imageUrl;
                    return (
                      <button
                        key={artwork.id}
                        className={`starterArtworkButton${active ? " active" : ""}`}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, imageUrl: artwork.imageUrl }))}
                      >
                        <img className="starterArtworkThumb" src={artwork.imageUrl} alt={artwork.label} />
                        <span>{artwork.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
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
              <button className="primaryCta" type="submit" disabled={submitting || Boolean(mintBlocker)}>
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
          <SectionHeader
            title="Preview"
            subtitle="This metadata is pinned to local IPFS and then minted through your OpenSea-compatible Reef collection."
          />
          <div className="createPreviewCard">
            <img className="createPreviewImage" src={previewImage} alt={form.name || "NFT preview"} />
            <div className="createPreviewBody">
              <strong>{form.name || "Untitled NFT"}</strong>
              <p>{form.description || "Add a description to preview your metadata."}</p>
              <div className="badgeRow">
                <span className="heroBadge">{selectedCollection?.chainName || bootstrap.config.network.chainName}</span>
                <span className="heroBadge">{selectedCollection?.standard || "ERC721"}</span>
                <span className="heroBadge">{account ? "Connected" : "Wallet required"}</span>
              </div>
              <div className="supportGrid">
                <article className="supportCard">
                  <span className="metaLabel">Creator collection</span>
                  <strong>{selectedCollection?.name || "Not selected"}</strong>
                </article>
                <article className="supportCard">
                  <span className="metaLabel">Contract</span>
                  <strong>{selectedCollection?.contractAddress ? shortenAddress(selectedCollection.contractAddress) : "Not deployed"}</strong>
                </article>
                <article className="supportCard">
                  <span className="metaLabel">OpenSea stack</span>
                  <strong>{creatorPathLabel}</strong>
                </article>
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
              {mintBlocker ? (
                <p className="panelBody">
                  Minting is currently blocked: {mintBlocker}
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
  const { account, authToken, bootstrap, connectWallet, getWalletSession, setStatus, refreshMarket } = useMarketplace();
  const navigate = useNavigate();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const publishLockRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [contractMetadataUri, setContractMetadataUri] = useState("");
  const [contractMetadataGatewayUrl, setContractMetadataGatewayUrl] = useState("");
  const [collectionImageGatewayUrl, setCollectionImageGatewayUrl] = useState("");
  const [form, setForm] = useState({
    name: "",
    symbol: "",
    description: "",
    imageUrl: "",
    contractUri: "",
    standard: "ERC721" as "ERC721" | "ERC1155",
    maxSupply: "1000",
    royaltyBps: "500"
  });

  useEffect(() => {
    refreshMarket();
  }, []);

  const starterArtworks = buildStarterArtworkSet(
    form.name || "Reef Collection",
    form.symbol || "Creator Contract"
  );
  const previewAvatar =
    form.imageUrl.trim() ||
    starterArtworks[0].imageUrl;
  const previewBanner =
    buildCreatorArtwork(form.name || "Creator Collection", "#2081e2", form.symbol || "Reef");
  const slugPreview = normalizeFilterValue(form.name || "reef-collection") || "reef-collection";
  const chainLabel = bootstrap.config.network.key === "reef" ? "Reef" : bootstrap.config.network.chainName;
  const creatorCapability =
    form.standard === "ERC1155"
      ? bootstrap.config.deployment.creator.erc1155
      : bootstrap.config.deployment.creator.erc721;
  const marketplaceCapability =
    form.standard === "ERC1155"
      ? bootstrap.config.deployment.marketplace.erc1155
      : bootstrap.config.deployment.marketplace.erc721;
  const creatorPublishReady = Boolean(creatorCapability.enabled);
  const seaportReady = Boolean(bootstrap.config.contracts.official.seaport.address && bootstrap.config.contracts.official.seaport.verified);
  const deploymentModeLabel =
    creatorCapability.mode === "official"
      ? "Official OpenSea contracts active"
      : creatorCapability.mode === "fallback"
        ? "Reef fallback contracts active"
        : creatorCapability.mode === "mixed"
          ? "Mixed deployment mode"
          : "Publishing unavailable";
  const publishBlocker = (() => {
    if (!account) {
      return "Connect your Reef wallet to publish a collection.";
    }
    if (!creatorCapability.enabled) {
      return creatorCapability.reason || "This collection standard is not available on the current Reef deployment path.";
    }
    return "";
  })();
  const canPublish = Boolean(form.name.trim() && form.symbol.trim() && !submitting);

  async function readImageFile(file: File) {
    if (file.size > 50 * 1024 * 1024) {
      setStatus("Collection image must be 50 MB or smaller.");
      return;
    }

    const result = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read collection image."));
      reader.readAsDataURL(file);
    });

    setForm((current) => ({ ...current, imageUrl: result }));
    setStatus("Collection image loaded.");
  }

  async function ensureContractMetadataUri(
    ownerAddress: string,
    collectionImage?: {
      metadataImage: string;
      displayImage: string;
    }
  ) {
    const resolvedCollectionImage = collectionImage ?? (await ensureCollectionImageReference());
    const manualUri = form.contractUri.trim();
    if (manualUri) {
      setContractMetadataUri(manualUri);
      setContractMetadataGatewayUrl(
        manualUri.startsWith("ipfs://")
          ? `${bootstrap.config.services.ipfsGatewayUrl}/${manualUri.slice("ipfs://".length)}`
          : manualUri
      );
      return manualUri;
    }

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
        filename: `${slugPreview}-contract.json`,
        payload: {
          name: form.name.trim(),
          description: form.description.trim() || `${form.name.trim()} on ${bootstrap.config.network.chainName}.`,
          image: resolvedCollectionImage.metadataImage,
          banner_image: resolvedCollectionImage.metadataImage,
          external_link: `${bootstrap.config.services.webBaseUrl}/profile/${ownerAddress}`,
          seller_fee_basis_points: Number(form.royaltyBps || "0"),
          fee_recipient: ownerAddress
        }
      })
    });

    setContractMetadataUri(result.uri);
    setContractMetadataGatewayUrl(result.gatewayUrl);
    return result.uri;
  }

  function guessExtensionFromDataUrl(dataUrl: string) {
    const match = dataUrl.match(/^data:([^;,]+)[;,]/);
    const mimeType = match?.[1] ?? "";
    if (mimeType === "image/jpeg") return { mimeType, extension: "jpg" };
    if (mimeType === "image/png") return { mimeType, extension: "png" };
    if (mimeType === "image/gif") return { mimeType, extension: "gif" };
    if (mimeType === "image/svg+xml") return { mimeType, extension: "svg" };
    if (mimeType === "image/webp") return { mimeType, extension: "webp" };
    return { mimeType: mimeType || "application/octet-stream", extension: "bin" };
  }

  async function ensureCollectionImageReference() {
    const source = previewAvatar;
    if (!source.startsWith("data:")) {
      setCollectionImageGatewayUrl(source);
      return {
        metadataImage: source,
        displayImage: source
      };
    }

    const { mimeType, extension } = guessExtensionFromDataUrl(source);
    const result = await fetchJson<{
      cid: string;
      uri: string;
      gatewayUrl: string;
      filename: string;
    }>("/ipfs/file", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        filename: `${slugPreview}-avatar.${extension}`,
        dataUrl: source,
        contentType: mimeType
      })
    });

    setCollectionImageGatewayUrl(result.gatewayUrl);
    return {
      metadataImage: result.uri,
      displayImage: result.gatewayUrl
    };
  }

  async function persistCollectionRecord(input: {
    ownerAddress: string;
    contractUri: string;
    status: "draft" | "gated" | "deploying" | "ready";
    avatarUrl?: string;
    contractAddress?: string;
    deploymentTxHash?: string;
    deploymentMode?: string;
    factoryAddress?: string;
    marketplaceMode?: string;
  }) {
    const resolvedAuthToken =
      authToken ||
      (typeof window !== "undefined"
        ? globalThis.localStorage.getItem(authTokenStorageKey) ?? ""
        : "");
    if (!resolvedAuthToken) {
      throw new Error("Wallet session is not authenticated.");
    }

    return fetchJson<{ ok: boolean; slug: string }>("/creator/collections", {
      method: "POST",
      headers: withAuthorization(
        {
          "Content-Type": "application/json"
        },
        resolvedAuthToken
      ),
      body: JSON.stringify({
        name: form.name.trim(),
        symbol: form.symbol.trim().toUpperCase(),
        description: form.description.trim(),
        avatarUrl: (input.avatarUrl ?? collectionImageGatewayUrl) || previewAvatar,
        bannerUrl:
          (input.avatarUrl ?? collectionImageGatewayUrl) ||
          previewAvatar ||
          previewBanner,
        chainKey: bootstrap.config.network.key,
        chainName: bootstrap.config.network.chainName,
        standard: form.standard,
        deploymentMode: input.deploymentMode ?? creatorCapability.mode,
        factoryAddress: input.factoryAddress ?? creatorCapability.factoryAddress ?? "",
        marketplaceMode: input.marketplaceMode ?? marketplaceCapability.mode,
        contractUri: input.contractUri,
        contractAddress: input.contractAddress ?? "",
        deploymentTxHash: input.deploymentTxHash ?? "",
        status: input.status
      })
    });
  }

  async function submitCollection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (publishLockRef.current) {
      return;
    }
    publishLockRef.current = true;

    setSubmitting(true);
    let ownerAddress = account;
    let contractUri = form.contractUri.trim();
    let collectionImage: { metadataImage: string; displayImage: string } | null = null;

    try {
      const session = await getWalletSession();
      if (!session) {
        return;
      }

      ownerAddress = session.address;
      collectionImage = await ensureCollectionImageReference();
      contractUri = await ensureContractMetadataUri(session.address, collectionImage);

      if (!creatorPublishReady) {
        const result = await persistCollectionRecord({
          ownerAddress: session.address,
          contractUri,
          avatarUrl: collectionImage.displayImage,
          status: "gated",
          deploymentMode: "blocked",
          marketplaceMode: marketplaceCapability.mode
        });
        setStatus(`Collection saved, but contract publish is blocked: ${publishBlocker}`);
        refreshMarket();
        navigate(`/profile/${session.address}?tab=created&collection=${result.slug}`);
        return;
      }

      let deployedAddress = "";
      let tx;
      const normalizedSymbol = form.symbol.trim().toUpperCase();
      const royaltyBps = Number(form.royaltyBps || "0");
      const txOverrides = getReefTransactionOverrides(bootstrap.config, "collection");
      const resolvedAuthToken =
        authToken ||
        (typeof window !== "undefined"
          ? globalThis.localStorage.getItem(authTokenStorageKey) ?? ""
          : "");

      if (form.standard === "ERC721" && creatorCapability.mode === "official") {
        const officialFactoryAddress = bootstrap.config.contracts.creatorFactory.address;
        if (!officialFactoryAddress) {
          throw new Error("OpenSea creator factory is not configured for Reef.");
        }
        const creatorFactory = new Contract(
          officialFactoryAddress,
          creatorFactoryAbi,
          session.signer
        );
        const salt = randomSaltHex();
        deployedAddress = String(
          await creatorFactory.predictCollectionAddress(session.address, salt)
        );
        setStatus("Publishing SeaDrop-compatible ERC721 collection contract on Reef...");
        tx = await creatorFactory.createCollection(
          form.name.trim(),
          normalizedSymbol,
          {
            baseURI: "",
            contractURI: contractUri,
            dropURI: contractUri,
            maxSupply: BigInt(Math.max(1, Number(form.maxSupply || "1000"))),
            creatorPayoutAddress: session.address,
            royaltyBps,
            mintPrice: 0,
            startTime: 0,
            endTime: 0,
            maxTotalMintableByWallet: 0,
            feeBps: 0,
            restrictFeeRecipients: false
          },
          salt,
          txOverrides
        );
      } else {
        if (!resolvedAuthToken) {
          throw new Error("Wallet session is not authenticated.");
        }
        setStatus(
          form.standard === "ERC1155"
            ? "Publishing ERC1155 collection through the Reef relayer..."
            : "Publishing ERC721 collection through the Reef relayer..."
        );

        const deployed = await fetchJson<{
          ok: boolean;
          slug: string;
          contractAddress: string;
          deploymentTxHash: string;
          blockNumber: number;
          deploymentMode: string;
          factoryAddress: string;
          marketplaceMode: string;
        }>("/creator/collections/deploy", {
          method: "POST",
          headers: withAuthorization(
            {
              "Content-Type": "application/json"
            },
            resolvedAuthToken
          ),
          body: JSON.stringify({
            name: form.name.trim(),
            symbol: normalizedSymbol,
            description: form.description.trim(),
            avatarUrl: collectionImage.displayImage,
            bannerUrl: collectionImage.displayImage || previewBanner,
            chainKey: bootstrap.config.network.key,
            chainName: bootstrap.config.network.chainName,
            standard: form.standard,
            deploymentMode: creatorCapability.mode,
            factoryAddress: creatorCapability.factoryAddress ?? "",
            marketplaceMode: marketplaceCapability.mode,
            contractUri,
            royaltyBps
          })
        });

        setStatus(`Collection contract deployed on Reef via ${deployed.deploymentMode}. Add NFTs to the mint queue next.`);
        refreshMarket();
        navigate(`/create${buildQuery({ collection: deployed.slug, batch: "1", fresh: "1" })}`);
        return;
      }

      setStatus("Waiting for Reef to confirm the collection transaction...");
      const receipt =
        (await Promise.race([
          tx.wait(),
          waitForTransactionReceiptWithFallback(tx.hash, session.provider, bootstrap.config)
        ])) ?? null;
      if (receipt?.status === 0) {
        throw new Error("Collection deployment reverted on Reef.");
      }

      const deployedCode = await session.provider.getCode(deployedAddress);
      if (deployedCode === "0x") {
        throw new Error(
          "Collection transaction landed, but Reef returned no bytecode at the deployed creator collection address."
        );
      }

      const result = await persistCollectionRecord({
        ownerAddress: session.address,
        contractUri,
        avatarUrl: collectionImage.displayImage,
        status: "ready",
        contractAddress: deployedAddress,
        deploymentTxHash: tx.hash,
        deploymentMode: creatorCapability.mode,
        factoryAddress: creatorCapability.factoryAddress,
        marketplaceMode: marketplaceCapability.mode
      });
      setStatus(`Collection contract deployed on Reef via ${creatorCapability.mode}. Add NFTs to the mint queue next.`);
      refreshMarket();
      navigate(`/create${buildQuery({ collection: result.slug, batch: "1", fresh: "1" })}`);
    } catch (error) {
      if (ownerAddress && contractUri) {
        await persistCollectionRecord({
          ownerAddress,
          contractUri,
          avatarUrl: collectionImage?.displayImage,
          status: "draft"
        }).catch(() => null);
      }
      setStatus(error instanceof Error ? error.message : "Failed to create collection.");
    } finally {
      setSubmitting(false);
      publishLockRef.current = false;
    }
  }

  return (
    <div className="darkPage contractDeployPage">
      <form className="contractDeployShell" onSubmit={submitCollection}>
        <header className="contractDeployHeader">
          <button
            className="contractBackButton"
            type="button"
            onClick={() => navigate(account ? `/profile/${account}?tab=created` : "/studio")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 6 8 12l6 6" />
            </svg>
          </button>
          <div className="contractBreadcrumb">
            <span>Create Collection</span>
            <strong>Deploy Smart Contract</strong>
          </div>
        </header>

        <div className="contractDeployGrid">
          <section className="contractMediaColumn">
            <div className="contractFieldLabel">
              Collection Image
              <span className="contractInfoDot">i</span>
            </div>
            <label
              className={`contractUploadFrame${dragActive ? " dragging" : ""}`}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                const file = event.dataTransfer.files?.[0];
                if (file) {
                  void readImageFile(file);
                }
              }}
            >
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void readImageFile(file);
                  }
                }}
              />
              {form.imageUrl ? (
                <img className="contractUploadPreview" src={previewAvatar} alt={form.name || "Collection preview"} />
              ) : (
                <div className="contractUploadEmpty">
                  <div className="contractUploadGlyph">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 16V6" />
                      <path d="m8.5 9.5 3.5-3.5 3.5 3.5" />
                      <path d="M6 18h12" />
                    </svg>
                  </div>
                  <strong>Click to upload or drag and drop</strong>
                  <span>1000 x 1000 · GIF, JPG, PNG, SVG, max 50 MB</span>
                </div>
              )}
            </label>

            <div className="contractBadgeStrip">
              <span className="contractTypeChip">{chainLabel.toUpperCase()}</span>
              <span className="contractTypeChip">{form.standard}</span>
              <span className="contractTypeChip">
                {creatorCapability.mode === "official" ? "OpenSea" : creatorCapability.mode === "fallback" ? "Fallback" : "Blocked"}
              </span>
            </div>
            <div className="starterArtworkSection contractStarterArtworkSection">
              <span className="metaLabel">Starter artwork</span>
              <div className="starterArtworkRow">
                {starterArtworks.map((artwork) => {
                  const active = (form.imageUrl.trim() || previewAvatar) === artwork.imageUrl;
                  return (
                    <button
                      key={artwork.id}
                      className={`starterArtworkButton${active ? " active" : ""}`}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, imageUrl: artwork.imageUrl }))}
                    >
                      <img className="starterArtworkThumb" src={artwork.imageUrl} alt={artwork.label} />
                      <span>{artwork.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="contractFormColumn">
            <div className="contractIntroIcon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m5 19 14-14" />
                <path d="m13 5 6 6" />
                <path d="M7.5 7.5 5 5" />
                <path d="M6 14.5 3.5 12" />
              </svg>
            </div>
            <h1 className="contractDeployTitle">Start with your Collection Contract</h1>
            <p className="contractDeployCopy">
              Every NFT collection lives on its own smart contract. We&apos;ll deploy the active Reef collection path for this standard now so you can mint NFTs and route marketplace activity through the best available stack.
            </p>

            <div className="contractDeployForm">
              <label className="contractDeployField">
                <span>Name</span>
                <input
                  className="textInput"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Add Contract Name"
                />
                <small>Your contract name is the same as your collection name. You won&apos;t be able to update it later.</small>
              </label>

              <label className="contractDeployField contractDeployFieldNarrow">
                <span>Token Symbol</span>
                <input
                  className="textInput"
                  value={form.symbol}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, symbol: event.target.value.toUpperCase() }))
                  }
                  placeholder="Add Collection Symbol"
                />
                <small>Can&apos;t be changed after your contract is deployed.</small>
              </label>

              <label className="contractDeployField contractDeployFieldNarrow">
                <span>Chain</span>
                <button className="contractSelectButton" type="button" disabled>
                  <span className="contractSelectNetworkDot" />
                  {chainLabel}
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m8 10 4 4 4-4" />
                  </svg>
                </button>
                <small>This is the blockchain your collection will live on. You won&apos;t be able to switch it later.</small>
              </label>

              <label className="contractDeployField contractDeployFieldNarrow">
                <span>Contract Type</span>
                <div className="segmentedSwitch">
                  <button
                    className={form.standard === "ERC721" ? "segment active" : "segment"}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, standard: "ERC721" }))}
                  >
                    ERC721
                  </button>
                  <button
                    className={form.standard === "ERC1155" ? "segment active" : "segment"}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, standard: "ERC1155" }))}
                  >
                    ERC1155
                  </button>
                </div>
                <small>Choose the collection standard you want to deploy on Reef.</small>
              </label>

              <label className="contractDeployField fullSpan">
                <span>Description</span>
                <textarea
                  className="textArea"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Tell collectors what this collection is about."
                />
              </label>

              <div className="fieldGrid">
                <label className="fieldGroup">
                  <span>Max Supply</span>
                  <input
                    className="textInput"
                    value={form.maxSupply}
                    onChange={(event) => setForm((current) => ({ ...current, maxSupply: event.target.value }))}
                    placeholder="1000"
                  />
                </label>
                <label className="fieldGroup">
                  <span>Royalty (bps)</span>
                  <input
                    className="textInput"
                    value={form.royaltyBps}
                    onChange={(event) => setForm((current) => ({ ...current, royaltyBps: event.target.value }))}
                    placeholder="500"
                  />
                </label>
              </div>

              <label className="contractDeployField fullSpan">
                <span>Contract Metadata URI</span>
                <input
                  className="textInput"
                  value={form.contractUri}
                  onChange={(event) => setForm((current) => ({ ...current, contractUri: event.target.value }))}
                  placeholder="Leave blank to pin metadata to local IPFS automatically"
                />
                <small>We&apos;ll pin a contract metadata JSON to local IPFS if you leave this empty.</small>
              </label>
            </div>

            <div className="contractStackPanel">
              <div className="contractStackHeader">
                <strong>Reef Marketplace Stack</strong>
                <span className={`contractStatusPill${creatorPublishReady ? " live" : " blocked"}`}>
                  {deploymentModeLabel}
                </span>
              </div>
              <div className="contractStackRow">
                <span>{creatorCapability.mode === "fallback" ? "Deployment Engine" : "Active Factory"}</span>
                <strong>
                  {creatorCapability.mode === "fallback"
                    ? "Relayed direct deploy"
                    : creatorCapability.factoryAddress
                      ? shortenAddress(creatorCapability.factoryAddress)
                      : "Not deployed"}
                </strong>
              </div>
              <div className="contractStackRow">
                <span>Deployment Path</span>
                <strong>
                  {creatorCapability.mode === "official"
                    ? "Official OpenSea"
                    : creatorCapability.mode === "fallback"
                      ? "Reef Fallback"
                      : "Blocked"}
                </strong>
              </div>
              <div className="contractStackRow">
                <span>Marketplace Path</span>
                <strong>
                  {marketplaceCapability.enabled
                    ? `${marketplaceCapability.mode} • ${marketplaceCapability.address ? shortenAddress(marketplaceCapability.address) : "enabled"}`
                    : "Blocked"}
                </strong>
              </div>
              <div className="contractStackRow">
                <span>Official Seaport</span>
                <strong>{seaportReady ? shortenAddress(bootstrap.config.contracts.official.seaport.address) : "Unavailable"}</strong>
              </div>
              {!creatorPublishReady ? (
                <p className="contractStackWarning">{publishBlocker}</p>
              ) : null}
              {contractMetadataUri ? (
                <div className="contractMetadataPanel">
                  <span className="metaLabel">Pinned contract metadata</span>
                  <strong>{contractMetadataUri}</strong>
                  {contractMetadataGatewayUrl ? <span>{contractMetadataGatewayUrl}</span> : null}
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <footer className="contractDeployFooter">
          <div className="contractDeployMeta">
            <span>Owner</span>
            <strong>{account ? shortenAddress(account) : "Connect wallet"}</strong>
            <span>Slug</span>
            <strong>{slugPreview}</strong>
          </div>
          <div className="contractDeployActions">
            {!account ? (
              <button className="chip" type="button" onClick={() => void connectWallet()}>
                Connect wallet
              </button>
            ) : null}
            <button
              className="chip"
              type="button"
              onClick={() => navigate(account ? `/profile/${account}?tab=created` : "/studio")}
            >
              Cancel
            </button>
            <button className="primaryCta contractPublishButton" type="submit" disabled={!canPublish}>
              {submitting
                ? creatorPublishReady
                  ? creatorCapability.mode === "official"
                    ? "Publishing via OpenSea..."
                    : "Publishing via Reef relay..."
                  : "Saving draft..."
                : creatorPublishReady
                  ? "Publish Contract"
                  : "Save draft"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function CreateDropPage() {
  const { account, authToken, isAdmin, connectWallet, setStatus, refreshMarket } = useMarketplace();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    creatorName: "Reef Team",
    coverUrl: "",
    stage: "upcoming",
    mintPrice: "0 REEF",
    supply: "100",
    startLabel: "TBD",
    description: ""
  });

  if (!account) {
    return (
      <div className="darkPage">
        <section className="pagePanel">
          <SectionHeader title="Create Drop" subtitle="Connect your Reef team wallet to create a scheduled drop." />
          <div className="profileShell">
            <div>
              <h3 className="panelTitle">Connect an admin wallet</h3>
              <p className="panelBody">Drops are managed by the Reef team. Connect the wallet you use for Studio and admin.</p>
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
          <SectionHeader title="Create Drop" subtitle="Scheduled drops are restricted to Reef team wallets in this environment." />
          <div className="profileShell">
            <div>
              <h3 className="panelTitle">Admin access is required</h3>
              <p className="panelBody">Switch to a Reef team wallet to create a drop, or browse the public drops page instead.</p>
            </div>
            <div className="profileActionGroup">
              <button className="chip" type="button" onClick={() => void connectWallet()}>Switch Wallet</button>
              <button className="chip" type="button" onClick={() => navigate("/drops")}>Open Drops</button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  async function submitDrop(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await fetchJson<{ ok: boolean; slug: string }>("/admin/drops", {
        method: "POST",
        headers: withAuthorization(
          {
            "Content-Type": "application/json"
          },
          authToken
        ),
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
      });
      setStatus(`Drop created. It is now available on the public Drops page.`);
      refreshMarket();
      navigate(`/drops?stage=${form.stage === "draft" ? "all" : form.stage}&created=${result.slug}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to create drop.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="darkPage">
      <section className="pagePanel">
        <SectionHeader title="Create Drop" subtitle="Create a scheduled or live drop for Reef. Saved drops automatically appear on the public Drops page." />
        <div className="metricsRow compact">
          <MetricPanel label="Admin wallet" value={shortenAddress(account)} />
          <MetricPanel label="Visibility" value="Public Drops" />
          <MetricPanel label="Default stage" value={form.stage} />
        </div>
      </section>

      <section className="sectionGrid adminGrid">
        <div className="panelSurface">
          <SectionHeader title="Drop details" subtitle="This is the launch card the public marketplace will show in /drops." />
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
              <label className="fieldGroup fullSpan">
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
                  placeholder="0 REEF"
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
                placeholder="Describe the drop, its format, and why collectors should care."
              />
            </label>

            <div className="adminToolbar">
              <button className="chip" type="button" onClick={() => navigate("/studio")}>
                Back to Studio
              </button>
              <button className="primaryCta" type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Drop"}
              </button>
            </div>
          </form>
        </div>

        <div className="panelSurface">
          <SectionHeader title="After publishing" subtitle="What happens once you save this drop." />
          <div className="adminNotes">
            <p className="panelBody">The drop is written to the same admin drop store used by the public marketplace.</p>
            <p className="panelBody">It will appear on the public Drops page immediately, filtered by the stage you choose.</p>
            <p className="panelBody">You can still edit or archive it later from the full Reef admin panel.</p>
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
        const collectionHeroStyle = {
          "--collection-hero-image": `url("${assetUrl(data.collection.avatarUrl || data.collection.hero.backgroundUrl)}")`
        } as CSSProperties;

        return (
          <div className="darkPage collectionPage" style={themeStyle(data.collection.theme)}>
            <section className="collectionHeroSurface" style={collectionHeroStyle}>
              <div className="collectionHeroBackdrop" aria-hidden="true" />
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
  const [listingComposerOpen, setListingComposerOpen] = useState(false);
  const [listingPriceInput, setListingPriceInput] = useState("1");
  const [listingSubmitting, setListingSubmitting] = useState(false);
  const listingActionLockRef = useRef(false);

  useEffect(() => {
    if (state.data) {
      setActiveTab(state.data.defaultTab);
    }
  }, [state.data]);

  if (!contract || !tokenId) {
    return <PageState message="Missing item identifier." />;
  }

  async function handleListItem(data: ItemResponse, priceInput: string) {
    if (listingActionLockRef.current) {
      return;
    }
    listingActionLockRef.current = true;
    setListingSubmitting(true);
    try {
      const normalizedPrice = priceInput.trim();
      if (!normalizedPrice) {
        throw new Error(`Enter a ${bootstrap.config.network.nativeCurrency.symbol} price to create the listing.`);
      }
      const session = await getWalletSession();
      if (!session) {
        return;
      }
      if (!sameAddress(session.address, data.item.ownerAddress)) {
        setStatus("Connect the wallet that currently owns this NFT to list it.");
        return;
      }
      const marketplaceAddress =
        bootstrap.config.deployment.marketplace.erc721.address ||
        bootstrap.config.contracts.marketplace.address;
      if (!marketplaceAddress) {
        setStatus("Marketplace contract address is not configured.");
        return;
      }

      const txOverrides = getReefTransactionOverrides(bootstrap.config, "marketplace");
      const collectionContract = new Contract(
        data.item.contractAddress,
        collectionAbi,
        session.signer
      );
      const marketplaceContract = new Contract(
        marketplaceAddress,
        marketplaceAbi,
        session.signer
      );
      const approvedAddress = String(
        await collectionContract.getApproved(BigInt(data.item.tokenId))
      );
      const approvedForAll = Boolean(
        await collectionContract.isApprovedForAll(
          session.address,
          marketplaceAddress
        )
      );

      if (!sameAddress(approvedAddress, marketplaceAddress) && !approvedForAll) {
        setStatus("Approving NFT for the Reef marketplace...");
        const approveTx = await collectionContract.approve(
          marketplaceAddress,
          BigInt(data.item.tokenId),
          txOverrides
        );
        await approveTx.wait();
      }

      setStatus("Creating listing on Reef...");
      const createTx = await marketplaceContract.createListing(
        data.item.contractAddress,
        BigInt(data.item.tokenId),
        parseEther(normalizedPrice),
        txOverrides
      );
      await createTx.wait();
      setStatus("Listing created.");
      setListingComposerOpen(false);
      setListingPriceInput("1");
      refreshMarket();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Listing failed");
    } finally {
      setListingSubmitting(false);
      listingActionLockRef.current = false;
    }
  }

  async function handleCancelListing(data: ItemResponse) {
    if (listingActionLockRef.current) {
      return;
    }
    listingActionLockRef.current = true;
    setListingSubmitting(true);
    const session = await getWalletSession();
    if (!session) {
      listingActionLockRef.current = false;
      setListingSubmitting(false);
      return;
    }
    if (!data.item.listingId) {
      setStatus("This item does not have an active listing.");
      listingActionLockRef.current = false;
      setListingSubmitting(false);
      return;
    }
    if (!sameAddress(session.address, data.item.seller)) {
      setStatus("Connect the wallet that created the listing to cancel it.");
      listingActionLockRef.current = false;
      setListingSubmitting(false);
      return;
    }
    try {
      const txOverrides = getReefTransactionOverrides(bootstrap.config, "marketplace");
      const marketplaceAddress =
        bootstrap.config.deployment.marketplace.erc721.address ||
        bootstrap.config.contracts.marketplace.address;
      if (!marketplaceAddress) {
        setStatus("Marketplace contract address is not configured.");
        return;
      }
      const marketplaceContract = new Contract(
        marketplaceAddress,
        marketplaceAbi,
        session.signer
      );
      setStatus("Cancelling listing...");
      const tx = await marketplaceContract.cancelListing(BigInt(data.item.listingId), txOverrides);
      await tx.wait();
      setStatus("Listing cancelled.");
      refreshMarket();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Cancellation failed");
    } finally {
      setListingSubmitting(false);
      listingActionLockRef.current = false;
    }
  }

  async function handleBuyItem(data: ItemResponse) {
    if (listingActionLockRef.current) {
      return;
    }
    listingActionLockRef.current = true;
    setListingSubmitting(true);
    const session = await getWalletSession();
    if (!session) {
      listingActionLockRef.current = false;
      setListingSubmitting(false);
      return;
    }
    if (!data.item.listingId || !data.item.listed) {
      setStatus("This NFT is not actively listed.");
      listingActionLockRef.current = false;
      setListingSubmitting(false);
      return;
    }
    try {
      const txOverrides = getReefTransactionOverrides(bootstrap.config, "marketplace");
      const marketplaceAddress =
        bootstrap.config.deployment.marketplace.erc721.address ||
        bootstrap.config.contracts.marketplace.address;
      if (!marketplaceAddress) {
        setStatus("Marketplace contract address is not configured.");
        return;
      }
      const marketplaceContract = new Contract(
        marketplaceAddress,
        marketplaceAbi,
        session.signer
      );
      setStatus("Submitting purchase on Reef...");
      const tx = await marketplaceContract.buyListing(BigInt(data.item.listingId), {
        value: BigInt(data.item.currentPriceRaw),
        ...txOverrides
      });
      await tx.wait();
      setStatus("Purchase completed.");
      refreshMarket();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Purchase failed");
    } finally {
      setListingSubmitting(false);
      listingActionLockRef.current = false;
    }
  }

  return (
    <DataState state={state}>
      {(data) => (
        <div className="modalRouteFrame">
          <div className="itemModal">
            <div className="itemModalTopBar">
              <div className="thumbRail">
                {data.mediaStrip.length > 1 ? (
                  <button className="thumbNav" type="button" onClick={() => navigate(data.backHref)}><Icon icon="chevron-left" /></button>
                ) : null}
                {data.mediaStrip.map((thumb, index) => (
                  <button key={`${thumb}-${index}`} className={index === 0 ? "thumbButton active" : "thumbButton"} type="button">
                    <img src={assetUrl(thumb)} alt="" />
                  </button>
                ))}
                {data.mediaStrip.length > 1 ? (
                  <button className="thumbNav" type="button"><Icon icon="chevron-right" /></button>
                ) : null}
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
                      type="button"
                      disabled={
                        listingSubmitting ||
                        (!!account &&
                          !data.item.listed &&
                          !sameAddress(account, data.item.ownerAddress))
                      }
                      onClick={() => {
                        if (listingSubmitting) {
                          return;
                        }
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
                        setListingPriceInput("1");
                        setListingComposerOpen(true);
                      }}
                    >
                      {listingSubmitting
                        ? "Waiting for wallet..."
                        : !account
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
                      <Icon icon="chevron-right" className="accordionChevron" />
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
                  <section className="detailsAccordion itemActivityFeed">
                    {data.activity.length === 0 ? <p className="panelBody">No activity yet.</p> : null}
                    {data.activity.map((entry) => (
                      <ItemActivityCard key={entry.id} entry={entry} />
                    ))}
                  </section>
                ) : null}
              </div>
            </div>

            {listingComposerOpen ? (
              <div className="listingComposerOverlay" role="presentation" onClick={() => !listingSubmitting && setListingComposerOpen(false)}>
                <form
                  className="listingComposerModal"
                  onClick={(event) => event.stopPropagation()}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleListItem(data, listingPriceInput);
                  }}
                >
                  <div className="listingComposerHeader">
                    <div>
                      <p className="eyebrow">Create listing</p>
                      <h2>List {data.item.name}</h2>
                    </div>
                    <button
                      className="closeButton"
                      type="button"
                      aria-label="Close listing modal"
                      onClick={() => setListingComposerOpen(false)}
                      disabled={listingSubmitting}
                    >
                      <Icon icon="close" />
                    </button>
                  </div>
                  <p className="panelBody">
                    Set the price in {bootstrap.config.network.nativeCurrency.symbol}. Your NFT will be approved for the Reef marketplace if needed before the listing is created.
                  </p>
                  <label className="fieldStack">
                    <span>Listing price</span>
                    <div className="priceInputRow">
                      <input
                        className="listingPriceInput"
                        value={listingPriceInput}
                        onChange={(event) => setListingPriceInput(event.target.value)}
                        inputMode="decimal"
                        placeholder="1"
                        autoFocus
                        disabled={listingSubmitting}
                      />
                      <span className="priceInputSuffix">{bootstrap.config.network.nativeCurrency.symbol}</span>
                    </div>
                  </label>
                  <div className="listingComposerActions">
                    <button
                      className="actionButton secondary"
                      type="button"
                      onClick={() => setListingComposerOpen(false)}
                      disabled={listingSubmitting}
                    >
                      Cancel
                    </button>
                    <button className="actionButton primary" type="submit" disabled={listingSubmitting}>
                      {listingSubmitting ? "Submitting..." : "Create listing"}
                    </button>
                  </div>
                </form>
              </div>
            ) : null}
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
  const view = params.get("view") ?? "grid";

  if (!creator) {
    return <PageState message="Missing creator slug." />;
  }

  return (
    <DataState state={state}>
      {(data) => {
        const isAddressProfile = creator.startsWith("0x");
        const isOwnProfile = Boolean(isAddressProfile && account && sameAddress(account, creator));
        const profileLabel = data.profile.name;
        const profileTag = isAddressProfile
          ? creator.slice(2, 8).toUpperCase()
          : data.profile.slug.replace(/^wallet-/, "").slice(0, 6).toUpperCase();
        const normalizedQuery = query.trim().toLowerCase();
        const matchesQuery = (...values: Array<string | undefined>) =>
          !normalizedQuery
            ? true
            : values.some((value) => value?.toLowerCase().includes(normalizedQuery));
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
        const sortOptionsByTab: Record<string, Array<{ key: string; label: string }>> = {
          galleries: [
            { key: "largest", label: "Largest galleries" },
            { key: "floor-high", label: "Highest floor" },
            { key: "name", label: "Name" }
          ],
          items: [
            { key: "recently-received", label: "Recently received" },
            { key: "price-high", label: "Price high" },
            { key: "price-low", label: "Price low" },
            { key: "name", label: "Name" }
          ],
          tokens: [
            { key: "balance-high", label: "Highest balance" },
            { key: "balance-low", label: "Lowest balance" },
            { key: "symbol", label: "Symbol" }
          ],
          listings: [
            { key: "price-high", label: "Price high" },
            { key: "price-low", label: "Price low" },
            { key: "name", label: "Name" }
          ],
          offers: [
            { key: "newest", label: "Newest offers" },
            { key: "price-high", label: "Price high" },
            { key: "price-low", label: "Price low" }
          ],
          created: [
            { key: "name", label: "Collection name" },
            { key: "floor-high", label: "Highest floor" },
            { key: "volume-high", label: "Highest volume" }
          ],
          activity: [
            { key: "newest", label: "Newest first" },
            { key: "oldest", label: "Oldest first" },
            { key: "type", label: "Event type" }
          ]
        };
        const availableSorts = sortOptionsByTab[activeTab] ?? [];
        const sort = params.get("sort") ?? availableSorts[0]?.key ?? "recently-received";
        const currentSortIndex = Math.max(
          0,
          availableSorts.findIndex((option) => option.key === sort)
        );
        const sortLabel = availableSorts[currentSortIndex]?.label ?? "Sort";
        const cycleSort = () => {
          if (availableSorts.length === 0) {
            return;
          }
          const nextOption = availableSorts[(currentSortIndex + 1) % availableSorts.length] ?? availableSorts[0];
          if (nextOption) {
            updateParams(params, setParams, { sort: nextOption.key });
          }
        };
        function sortByName<T extends { name?: string }>(entries: T[]) {
          return [...entries].sort((left, right) => (left.name ?? "").localeCompare(right.name ?? ""));
        }
        function sortByBigInt<T>(entries: T[], value: (entry: T) => string, descending = true) {
          return [...entries].sort((left, right) => {
            const leftValue = BigInt(value(left) || "0");
            const rightValue = BigInt(value(right) || "0");
            if (leftValue === rightValue) {
              return 0;
            }
            return descending ? (leftValue > rightValue ? -1 : 1) : leftValue < rightValue ? -1 : 1;
          });
        }
        const sortByTokenIdDesc = (entries: ItemRecord[]) =>
          [...entries].sort((left, right) => Number(right.tokenId) - Number(left.tokenId));
        const visibleGalleries = data.galleries.filter((gallery) =>
          matchesQuery(gallery.collectionName, gallery.collectionDescription, gallery.creatorName)
        );
        const visibleItems = data.items.filter((item) =>
          matchesQuery(item.name, item.description, item.collectionName)
        );
        const visibleCollections = data.createdCollections.filter((collection) =>
          matchesQuery(collection.name, collection.description, collection.creatorName)
        );
        const visibleTokens = data.tokens.filter((token) =>
          matchesQuery(token.name, token.symbol, token.chain)
        );
        const visibleListings = data.listings.filter((item) =>
          matchesQuery(item.name, item.description, item.collectionName)
        );
        const visibleOffers = data.offers.filter((offer) =>
          matchesQuery(offer.itemName, offer.collectionName, offer.from, offer.to)
        );
        const visibleActivity = data.activity.filter((entry) =>
          matchesQuery(entry.itemName, entry.collectionName, entry.collectionSlug, entry.from, entry.to)
        );
        const sortedGalleries =
          sort === "name"
            ? [...visibleGalleries].sort((left, right) => left.collectionName.localeCompare(right.collectionName))
            : sort === "floor-high"
              ? [...visibleGalleries].sort((left, right) => {
                  const leftCollection = data.createdCollections.find((collection) => collection.slug === left.collectionSlug);
                  const rightCollection = data.createdCollections.find((collection) => collection.slug === right.collectionSlug);
                  return BigInt(rightCollection?.floorPriceRaw ?? "0") > BigInt(leftCollection?.floorPriceRaw ?? "0") ? 1 : -1;
                })
              : [...visibleGalleries].sort(
                  (left, right) => right.itemCount - left.itemCount || left.collectionName.localeCompare(right.collectionName)
                );
        const sortedItems =
          sort === "price-high"
            ? sortByBigInt(visibleItems, (item) => item.currentPriceRaw || "0", true)
            : sort === "price-low"
              ? sortByBigInt(visibleItems, (item) => item.currentPriceRaw || "0", false)
              : sort === "name"
                ? sortByName(visibleItems)
                : sortByTokenIdDesc(visibleItems);
        const sortedCollections =
          sort === "floor-high"
            ? sortByBigInt(visibleCollections, (collection) => collection.floorPriceRaw || "0", true)
            : sort === "volume-high"
              ? sortByBigInt(visibleCollections, (collection) => collection.totalVolumeRaw || "0", true)
              : sortByName(visibleCollections);
        const sortedTokens =
          sort === "balance-low"
            ? sortByBigInt(visibleTokens, (token) => token.balanceRaw || "0", false)
            : sort === "symbol"
              ? [...visibleTokens].sort((left, right) => left.symbol.localeCompare(right.symbol))
              : sortByBigInt(visibleTokens, (token) => token.balanceRaw || "0", true);
        const sortedListings =
          sort === "price-low"
            ? sortByBigInt(visibleListings, (item) => item.currentPriceRaw || "0", false)
            : sort === "name"
              ? sortByName(visibleListings)
              : sortByBigInt(visibleListings, (item) => item.currentPriceRaw || "0", true);
        const sortedOffers =
          sort === "price-high"
            ? sortByBigInt(visibleOffers, (offer) => offer.priceRaw || "0", true)
            : sort === "price-low"
              ? sortByBigInt(visibleOffers, (offer) => offer.priceRaw || "0", false)
              : [...visibleOffers].sort(
                  (left, right) =>
                    new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime()
                );
        const sortedActivity =
          sort === "oldest"
            ? [...visibleActivity].sort(
                (left, right) => new Date(left.createdAt ?? 0).getTime() - new Date(right.createdAt ?? 0).getTime()
              )
            : sort === "type"
              ? [...visibleActivity].sort((left, right) => left.type.localeCompare(right.type))
              : [...visibleActivity].sort(
                  (left, right) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime()
                );
        const usdValue = data.portfolio.totalValueDisplay;
        const nftPercent = String(data.items.length);
        const tokenPercent = String(data.tokens.length);
        const searchPlaceholder =
          activeTab === "created"
            ? "Search collections"
            : activeTab === "galleries"
              ? "Search galleries"
              : activeTab === "tokens"
                ? "Search tokens"
                : activeTab === "offers"
                  ? "Search offers"
                  : activeTab === "activity"
                    ? "Search activity"
                    : "Search for items";
        const countLabel =
          activeTab === "created"
            ? `${sortedCollections.length} COLLECTIONS`
            : activeTab === "galleries"
              ? `${sortedGalleries.length} GALLERIES`
              : activeTab === "tokens"
                ? `${sortedTokens.length} TOKENS`
                : activeTab === "portfolio"
                  ? `${data.portfolio.itemCount} ITEMS`
                  : activeTab === "listings"
                    ? `${sortedListings.length} LISTINGS`
                    : activeTab === "offers"
                      ? `${sortedOffers.length} OFFERS`
                      : activeTab === "activity"
                        ? `${sortedActivity.length} EVENTS`
                        : `${sortedItems.length} ITEMS`;
        const showToolbar = activeTab !== "portfolio";
        const showViewControls = ["galleries", "items", "listings"].includes(activeTab);

        return (
          <div className="darkPage profilePage">
            <ProfileHero
              profile={data.profile}
              profileLabel={profileLabel}
              profileTag={profileTag}
              usdValue={usdValue}
              nftPercent={nftPercent}
              tokenPercent={tokenPercent}
              titleActions={
                <>
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
                </>
              }
              statAction={
                <button className="ghostIcon enlarge" type="button" aria-label="Profile actions">
                  <Icon icon="view-columns" />
                </button>
              }
            />

            <ProfileTabBar
              tabs={profileTabs}
              activeTab={activeTab}
              onSelect={(tab) => updateParams(params, setParams, { tab })}
            />

            {showToolbar ? (
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
                  {(activeTab === "created" || activeTab === "galleries") && isOwnProfile ? (
                    <button className="chip active" type="button" onClick={() => navigate("/create/collection")}>
                      Create collection
                    </button>
                  ) : null}
                  <button className="iconChip" type="button" onClick={cycleSort}>
                    {sortLabel}
                    <Icon icon="chevron-right" className="microIcon" />
                  </button>
                  {showViewControls ? (
                    <>
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
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}

            <p className="itemCountLabel">{countLabel}</p>

            {activeTab === "galleries" ? (
              <ProfileGalleriesTab
                galleries={sortedGalleries}
                emptyArtwork={buildProfileEmptyArtwork("items")}
                isOwnProfile={isOwnProfile}
                onCreateCollection={() => navigate("/create/collection")}
              />
            ) : null}

            {activeTab === "items" ? (
              <ProfileItemsTab
                items={sortedItems}
                view={view}
                emptyArtwork={buildProfileEmptyArtwork("items")}
                emptyTitle="No items found"
                emptyCopy="Discover new collections on OpenSea"
                renderGridCard={(item) => <ItemGridCard key={item.id} item={item} />}
              />
            ) : null}

            {activeTab === "created" ? (
              <ProfileCreatedTab
                collections={sortedCollections}
                isOwnProfile={isOwnProfile}
                emptyArtwork={buildProfileEmptyArtwork("created")}
                onCreateCollection={() => navigate("/create/collection")}
              />
            ) : null}

            {activeTab === "listings" ? (
              <ProfileListingsTab
                items={sortedListings}
                renderGridCard={(item) => <ItemGridCard key={item.id} item={item} />}
              />
            ) : null}

            {activeTab === "activity" ? <ProfileActivityTab activity={sortedActivity} /> : null}

            {activeTab === "offers" ? <ProfileOffersTab offers={sortedOffers} /> : null}

            {activeTab === "tokens" ? <ProfileTokensTab tokens={sortedTokens} /> : null}

            {activeTab === "portfolio" ? (
              <ProfilePortfolioTab
                portfolio={data.portfolio}
                tokens={data.tokens}
                galleries={data.galleries}
              />
            ) : null}

            <div className="profileActionDock">
              <div className="profileActionGroup">
                <button className="actionButton secondary" type="button" onClick={() => navigate("/create")}>
                  List items
                </button>
                <button
                  className="actionButton muted"
                  type="button"
                  onClick={() => updateParams(params, setParams, { tab: "listings" })}
                >
                  Cancel listings
                </button>
                <button
                  className="actionButton muted"
                  type="button"
                  onClick={() => updateParams(params, setParams, { tab: "offers" })}
                >
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

function formatActivityTypeLabel(type: string) {
  switch (type) {
    case "mint":
      return "Mint";
    case "listing":
      return "Listing";
    case "sale":
      return "Sale";
    case "offer":
      return "Offer";
    case "transfer":
      return "Transfer";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

function formatActivityHeadline(entry: ActivityRecord) {
  switch (entry.type) {
    case "mint":
      return "Minted on Reef";
    case "listing":
      return "Listed for sale";
    case "sale":
      return "Sale completed";
    case "offer":
      return "Offer received";
    case "transfer":
      return "Transferred";
    default:
      return entry.itemName;
  }
}

function activityIcon(type: string) {
  switch (type) {
    case "mint":
      return "spark";
    case "listing":
      return "list";
    case "sale":
      return "wallet";
    case "offer":
      return "heart";
    case "transfer":
      return "activity";
    default:
      return "activity";
  }
}

function ItemActivityCard({ entry }: { entry: ActivityRecord }) {
  const tone = entry.type.toLowerCase();
  const showValue = entry.priceDisplay && entry.priceDisplay !== "-";

  return (
    <article className={`itemActivityCard tone-${tone}`}>
      <div className="itemActivityCardTop">
        <div className="itemActivityPrimary">
          <span className={`itemActivityIcon tone-${tone}`}>
            <Icon icon={activityIcon(entry.type)} />
          </span>
          <div className="itemActivityTitleGroup">
            <span className={`itemActivityType tone-${tone}`}>{formatActivityTypeLabel(entry.type)}</span>
            <strong>{formatActivityHeadline(entry)}</strong>
            <p>{entry.itemName}</p>
          </div>
        </div>
        <div className="itemActivityMetaGroup">
          {showValue ? <span className="itemActivityValue">{entry.priceDisplay}</span> : null}
          <small>{entry.ageLabel}</small>
        </div>
      </div>
      <div className="itemActivityRoute">
        <span>
          <small>From</small>
          <strong>{entry.from}</strong>
        </span>
        <div className="itemActivityRouteLine" />
        <span>
          <small>To</small>
          <strong>{entry.to}</strong>
        </span>
      </div>
    </article>
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
