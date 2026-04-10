import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
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
import AmbientEmptyState from "./components/AmbientEmptyState";
import ProfileSetupModal from "./components/ProfileSetupModal";
import TransactionProgressModal from "./components/TransactionProgressModal";
import UserAvatar from "./components/UserAvatar";
import {
  DetailTabButton,
  FilterChipButton,
  GhostIconButton,
  HeroBadgePill,
  IconChipButton,
  SurfaceTabLink
} from "./components/ui/ControlPrimitives";
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
import TraitBuilder from "./components/create/TraitBuilder";
import { assetUrl, themeStyle } from "./lib/presentation";
import type {
  ActivityRecord,
  CollectionSummary,
  DropRecord,
  ItemRecord,
  ProfileGalleryRecord,
  ProfilePortfolioSummary,
  ProfileSummary,
  ProfileResponse,
  ProfileTokenHolding,
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

type DropDetailResponse = {
  drop: DropRecord;
  relatedDrops: DropRecord[];
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
  contractReady?: boolean;
  contractReason?: string;
  createdAt: string;
  updatedAt: string;
};

type CreatorCollectionsResponse = {
  owner: string;
  collections: CreatorCollectionDraft[];
};

type SearchCollectionsResponse = {
  collections: CreatorCollectionDraft[];
};

type SearchUsersResponse = {
  users: SessionUser[];
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

type TraitEditorRow = {
  id: string;
  trait_type: string;
  value: string;
};

type TransactionProgressTone = "processing" | "success" | "error";
type ToastTone = "info" | "success" | "error";

type TransactionProgressState = {
  title: string;
  message: string;
  detail?: string;
  steps: string[];
  activeStep: number;
  tone: TransactionProgressTone;
};

type ToastRecord = {
  id: number;
  message: string;
  tone: ToastTone;
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
  actionModal: TransactionProgressState | null;
  connectWallet: () => Promise<void>;
  getWalletSession: () => Promise<WalletSession | null>;
  setStatus: (value: string) => void;
  showActionModal: (value: Omit<TransactionProgressState, "tone"> & { tone?: TransactionProgressTone }) => void;
  updateActionModal: (value: Partial<TransactionProgressState>) => void;
  hideActionModal: () => void;
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
const dropsHeroVideoUrl = "/mecha.mp4";
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
  "function createCollection(string name_, string symbol_, string contractMetadataUri_, uint96 royaltyBps_) returns (address collection)"
];
const editionFactoryAbi = [
  "event CollectionCreated(address indexed creator, address indexed collection, string name, string symbol)",
  "function createCollection(string name_, string symbol_, string contractMetadataUri_, uint96 royaltyBps_) returns (address collection)"
];
const transferEventInterface = new Interface([
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
]);

const DEFAULT_TRAITS_JSON = '[\n  {\n    "trait_type": "Edition",\n    "value": "Creator"\n  }\n]';

function placeholderAsset(label: string, accent = "#2081e2") {
  const safe = label.slice(0, 8).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="${accent}"/><text x="48" y="56" font-family="Arial,Helvetica,sans-serif" font-size="28" font-weight="700" text-anchor="middle" fill="white">${safe}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeSvgText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function dropPosterPalette(stage: string) {
  switch (stage.trim().toLowerCase()) {
    case "live":
      return {
        accent: "#62e5a1",
        accentSoft: "#1f7a55",
        accentWarm: "#9ef0bb",
        label: "LIVE"
      };
    case "ended":
      return {
        accent: "#f28b82",
        accentSoft: "#7f1d1d",
        accentWarm: "#fecaca",
        label: "ENDED"
      };
    case "draft":
      return {
        accent: "#9aa7b8",
        accentSoft: "#334155",
        accentWarm: "#cbd5e1",
        label: "DRAFT"
      };
    case "upcoming":
    default:
      return {
        accent: "#6ea8ff",
        accentSoft: "#25457a",
        accentWarm: "#ffd37a",
        label: "UPCOMING"
      };
  }
}

function buildDropPosterArtwork(
  name: string,
  creatorName: string,
  stage: string,
  options?: { showStageBadge?: boolean; showVisibilityLabel?: boolean; showFooterNote?: boolean }
) {
  const palette = dropPosterPalette(stage);
  const seed = Array.from(`${name}:${creatorName}`).reduce(
    (total, char, index) => total + char.charCodeAt(0) * (index + 1),
    0
  );
  const orbX = 900 + (seed % 180);
  const orbY = 250 + (seed % 130);
  const orbRadius = 210 + (seed % 90);
  const panelShift = 120 + (seed % 80);
  const stageLabel = escapeSvgText(palette.label);
  const showStageBadge = options?.showStageBadge ?? true;
  const showVisibilityLabel = options?.showVisibilityLabel ?? true;
  const showFooterNote = options?.showFooterNote ?? true;
  const topBadgeMarkup = showStageBadge
    ? `<rect x="112" y="112" width="216" height="60" rx="30" fill="rgba(9,12,16,0.42)" stroke="rgba(255,255,255,0.12)" />
  <text x="148" y="150" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="700" letter-spacing="4" fill="${palette.accentWarm}">${stageLabel}</text>`
    : "";
  const visibilityMarkup = showVisibilityLabel
    ? `<text x="1112" y="150" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="700" letter-spacing="4" fill="rgba(255,255,255,0.72)">REEF DROP</text>`
    : "";
  const footerMarkup = showFooterNote
    ? `<text x="136" y="1248" font-family="Arial,Helvetica,sans-serif" font-size="24" fill="rgba(255,255,255,0.56)">Reef Studio launch poster • Add custom artwork to override.</text>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1400" viewBox="0 0 1400 1400" fill="none">
  <defs>
    <linearGradient id="drop-bg" x1="152" y1="88" x2="1220" y2="1312" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#111827" />
      <stop offset="54%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#0b1220" />
    </linearGradient>
    <linearGradient id="drop-ribbon" x1="196" y1="392" x2="1124" y2="1088" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.94" />
      <stop offset="100%" stop-color="${palette.accentSoft}" stop-opacity="0.96" />
    </linearGradient>
    <radialGradient id="drop-orb" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1030 286) rotate(90) scale(270)">
      <stop offset="0%" stop-color="${palette.accentWarm}" stop-opacity="0.86" />
      <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1400" height="1400" fill="#0b0f15" />
  <rect x="56" y="56" width="1288" height="1288" rx="72" fill="url(#drop-bg)" />
  <rect x="86" y="86" width="1228" height="1228" rx="54" stroke="rgba(255,255,255,0.08)" />
  <path d="M0 ${960 - panelShift}C244 ${868 - panelShift} 454 ${744 - panelShift} 688 ${528 - panelShift}C888 ${344 - panelShift} 1060 ${256 - panelShift} 1400 ${218 - panelShift}V1400H0V${960 - panelShift}Z" fill="url(#drop-ribbon)" />
  <circle cx="${orbX}" cy="${orbY}" r="${orbRadius}" fill="url(#drop-orb)" />
  <circle cx="268" cy="1120" r="184" fill="${palette.accentWarm}" fill-opacity="0.12" />
  <circle cx="340" cy="340" r="96" fill="rgba(255,255,255,0.04)" />
  <rect x="136" y="352" width="364" height="220" rx="28" fill="rgba(12,16,22,0.28)" stroke="rgba(255,255,255,0.09)" />
  <rect x="540" y="438" width="220" height="220" rx="28" fill="rgba(255,255,255,0.04)" />
  <path d="M114 236H648" stroke="rgba(255,255,255,0.12)" stroke-width="2" />
  <path d="M138 1148H520" stroke="rgba(255,255,255,0.16)" stroke-width="6" stroke-linecap="round" />
  <path d="M138 1188H428" stroke="rgba(255,255,255,0.12)" stroke-width="6" stroke-linecap="round" />
  <path d="M114 1160H1286" stroke="rgba(255,255,255,0.08)" stroke-width="2" />
  ${topBadgeMarkup}
  ${visibilityMarkup}
  <text x="136" y="1044" font-family="Arial,Helvetica,sans-serif" font-size="164" font-weight="700" letter-spacing="-8" fill="rgba(255,255,255,0.12)">LAUNCH</text>
  ${footerMarkup}
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function creatorCollectionArtworkSource(
  collection?: Pick<CreatorCollectionDraft, "avatarUrl" | "bannerUrl"> | null
) {
  return collection?.avatarUrl?.trim() || collection?.bannerUrl?.trim() || "";
}

function creatorCollectionArtworkPreview(
  collection?: Pick<CreatorCollectionDraft, "avatarUrl" | "bannerUrl" | "symbol" | "name"> | null
) {
  const source = creatorCollectionArtworkSource(collection);
  if (source) {
    return assetUrl(source);
  }
  return placeholderAsset(collection?.symbol || collection?.name || "Reef");
}

function applyImageFallback(target: HTMLImageElement, label: string, accent = "#2081e2") {
  if (target.dataset.fallbackApplied === "1") {
    return;
  }
  target.dataset.fallbackApplied = "1";
  target.src = placeholderAsset(label, accent);
}

function applyDropImageFallback(
  target: HTMLImageElement,
  name: string,
  creatorName = "Reef Team",
  stage = "upcoming",
  options?: { showStageBadge?: boolean; showVisibilityLabel?: boolean; showFooterNote?: boolean }
) {
  if (target.dataset.fallbackApplied === "1") {
    return;
  }
  target.dataset.fallbackApplied = "1";
  target.src = buildDropPosterArtwork(name, creatorName, stage, options);
}

function DropCoverImage({
  drop,
  className
}: {
  drop: Pick<DropRecord, "coverUrl" | "name" | "creatorName" | "stage">;
  className?: string;
}) {
  return (
    <img
      className={className}
      src={assetUrl(drop.coverUrl || buildDropPosterArtwork(drop.name, drop.creatorName, drop.stage))}
      alt={drop.name}
      onError={(event) => applyDropImageFallback(event.currentTarget, drop.name, drop.creatorName, drop.stage)}
    />
  );
}

function DropsLaunchEmptyState({
  title,
  copy,
  primaryLabel,
  primaryAction,
  secondaryLabel,
  secondaryAction,
  className
}: {
  title: string;
  copy: string;
  primaryLabel: string;
  primaryAction: () => void;
  secondaryLabel?: string;
  secondaryAction?: () => void;
  className?: string;
}) {
  const previewPoster = buildDropPosterArtwork("Reef Genesis Mint", "Reef Team", "upcoming", {
    showStageBadge: false,
    showVisibilityLabel: false,
    showFooterNote: false
  });

  return (
    <section className={["dropsLaunchEmpty", className ?? ""].filter(Boolean).join(" ")}>
      <div className="dropsLaunchVisual" aria-hidden="true">
        <img className="dropsLaunchPoster" src={previewPoster} alt="" />
        <div className="dropsLaunchVisualShade" />
        <div className="dropsLaunchBadgeRow">
          <span className="dropsLaunchStage">Upcoming</span>
          <span className="dropsLaunchBadge">Public Drops</span>
        </div>
        <div className="dropsLaunchPosterCopy">
          <span>Launch preview</span>
          <strong>Reef Genesis Mint</strong>
          <small>By Reef Team</small>
        </div>
        <div className="dropsLaunchMetricRow">
          <div className="dropsLaunchMetric">
            <span>Mint price</span>
            <strong>0 REEF</strong>
          </div>
          <div className="dropsLaunchMetric">
            <span>Supply</span>
            <strong>100</strong>
          </div>
          <div className="dropsLaunchMetric">
            <span>Start</span>
            <strong>TBD</strong>
          </div>
        </div>
      </div>

      <div className="dropsLaunchContent">
        <span className="dropsLaunchEyebrow">Drops</span>
        <h3>{title}</h3>
        <p>{copy}</p>

        <div className="dropsLaunchFeatureList">
          <div className="dropsLaunchFeature">
            <span className="dropsLaunchFeatureIcon">
              <Icon icon="calendar" />
            </span>
            <div>
              <strong>Scheduled launch windows</strong>
              <p>Upcoming and live stages stay readable the moment a drop is created.</p>
            </div>
          </div>
          <div className="dropsLaunchFeature">
            <span className="dropsLaunchFeatureIcon">
              <Icon icon="globe" />
            </span>
            <div>
              <strong>Public-ready presentation</strong>
              <p>Artwork, price, supply, and start labels are framed like a real storefront launch.</p>
            </div>
          </div>
          <div className="dropsLaunchFeature">
            <span className="dropsLaunchFeatureIcon">
              <Icon icon="star" />
            </span>
            <div>
              <strong>Creator-led curation</strong>
              <p>Once a mint is scheduled, this space becomes the drop spotlight instead of a placeholder grid.</p>
            </div>
          </div>
        </div>

        <div className="dropsLaunchActions">
          <button className="actionButton primary" type="button" onClick={primaryAction}>
            {primaryLabel}
          </button>
          {secondaryLabel && secondaryAction ? (
            <button className="actionButton secondary" type="button" onClick={secondaryAction}>
              {secondaryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function iconPath(icon: string) {
  switch (icon) {
    case "home":
      return (
        <>
          <path d="M4 11.5 12 5l8 6.5" />
          <path d="M7 10.5V19h10v-8.5" />
        </>
      );
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
    case "bell":
      return (
        <>
          <path d="M9 18h6" />
          <path d="M7 16h10l-1.1-1.7A6.3 6.3 0 0 1 15 10.9V10a3 3 0 1 0-6 0v.9c0 1.2-.3 2.4-.9 3.4L7 16Z" />
        </>
      );
    case "search":
      return (
        <>
          <circle cx="11" cy="11" r="5" />
          <path d="m15.5 15.5 4 4" />
        </>
      );
    case "chevron-down":
      return <path d="m6 9 6 6 6-6" />;
    case "chevron-left":
      return <path d="m15 6-6 6 6 6" />;
    case "chevron-right":
      return <path d="m9 6 6 6-6 6" />;
    case "collapse-left":
      return <path d="m11 6-6 6 6 6M19 6l-6 6 6 6" />;
    case "close":
      return (
        <>
          <path d="M7 7l10 10M17 7 7 17" />
        </>
      );
    case "check":
      return <path d="m6 12.5 4 4 8-9" />;
    case "plus":
      return (
        <>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </>
      );
    case "info":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 10v5" />
          <circle cx="12" cy="7.3" r="1" fill="currentColor" stroke="none" />
        </>
      );
    case "alert-circle":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v5" />
          <circle cx="12" cy="16.6" r="1" fill="currentColor" stroke="none" />
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

function formatTraitCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function parseRankDisplay(value?: string) {
  const match = value?.match(/\d+/);
  if (!match) {
    return null;
  }
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalNumber(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatTraitPercent(value: number) {
  if (value >= 10) {
    return `${Math.round(value)}%`;
  }
  if (value >= 1) {
    return `${value.toFixed(1)}%`;
  }
  return `${value.toFixed(2)}%`;
}

function splitCountdown(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return [
    { label: "Days", value: String(days).padStart(2, "0") },
    { label: "Hours", value: String(hours).padStart(2, "0") },
    { label: "Mins", value: String(minutes).padStart(2, "0") },
    { label: "Secs", value: String(seconds).padStart(2, "0") }
  ];
}

function resolveRewardTier(totalPoints: number) {
  const tiers = [
    { min: 1000, name: "Vanguard", fee: "0%" },
    { min: 600, name: "Creator", fee: "1%" },
    { min: 250, name: "Collector", fee: "2%" },
    { min: 0, name: "Explorer", fee: "3%" }
  ] as const;

  const current = tiers.find((tier) => totalPoints >= tier.min) ?? tiers[tiers.length - 1];
  const next = [...tiers].reverse().find((tier) => tier.min > current.min && totalPoints < tier.min) ?? null;

  return { current, next };
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

function looksLikeShortWalletLabel(value?: string) {
  if (!value) {
    return false;
  }
  return /^0x[a-f0-9]{4,}\.\.\.[a-f0-9]{4}$/i.test(value.trim());
}

function resolveToastTone(message: string): ToastTone {
  if (
    /(failed|error|unavailable|blocked|required|missing|rejected|invalid|cannot|not configured|not actively|not available|copy failed)/i.test(
      message
    )
  ) {
    return "error";
  }

  if (
    /(copied|saved|connected|created|updated|ready|minted|deployed|completed|cancelled|pinned|archived|purchased|loaded|available)/i.test(
      message
    )
  ) {
    return "success";
  }

  return "info";
}

function toastLabelForTone(tone: ToastTone) {
  switch (tone) {
    case "success":
      return "Success";
    case "error":
      return "Action failed";
    default:
      return "Heads up";
  }
}

function isCreatorCollectionMintable(
  collection?: Pick<CreatorCollectionDraft, "status" | "contractAddress" | "contractReady"> | null
) {
  return Boolean(
    collection &&
    collection.status.toLowerCase() === "ready" &&
    collection.contractAddress.trim() &&
    collection.contractReady !== false
  );
}

function creatorCollectionMintBlockerMessage(
  collection?: Pick<
    CreatorCollectionDraft,
    "status" | "contractAddress" | "contractReady" | "contractReason"
  > | null
) {
  if (!collection) {
    return "Choose a creator collection before minting.";
  }
  if (!collection.contractAddress.trim() || collection.status.toLowerCase() !== "ready") {
    return `Selected collection is ${collection.status}. Deploy the collection contract before minting.`;
  }
  if (collection.contractReady === false) {
    return (
      collection.contractReason ||
      "Selected collection contract is unavailable on Reef. Redeploy the collection before minting NFTs."
    );
  }
  return "";
}

function formatFilterLabel(value: string) {
  return value
    .split("-")
    .map((segment) => {
      if (!segment) {
        return segment;
      }
      if (segment.toLowerCase() === "pfps") {
        return "PFPs";
      }
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join(" ");
}

function parseMetricNumber(value: string) {
  if (!value) {
    return null;
  }
  const numeric = Number.parseFloat(value.replace(/,/g, "").replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function compareBigIntStrings(left: string, right: string) {
  try {
    const leftValue = BigInt(left || "0");
    const rightValue = BigInt(right || "0");
    if (leftValue === rightValue) {
      return 0;
    }
    return leftValue > rightValue ? 1 : -1;
  } catch {
    return 0;
  }
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

function withReefGasBuffer(estimate: bigint, kind: "collection" | "marketplace") {
  const buffer = kind === "marketplace" ? estimate / 25n : estimate / 20n;
  return estimate + buffer + 1n;
}

async function getReefTransactionOverrides(
  config: PublicAppConfig,
  session: Pick<WalletSession, "address" | "provider">,
  request?: {
    to?: string | null;
    data?: string | null;
    value?: bigint | number | string | null;
  },
  kind: "collection" | "marketplace" = "collection"
) {
  if (config.network.key !== "reef") {
    return {};
  }

  const overrides: {
    type?: 2;
    gasPrice?: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
    gasLimit?: bigint;
  } = {};
  const feeData = await session.provider.getFeeData().catch(() => null);

  if (feeData?.maxFeePerGas != null) {
    overrides.type = 2;
    overrides.maxFeePerGas = feeData.maxFeePerGas;
    overrides.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? 0n;
  } else if (feeData?.gasPrice != null) {
    overrides.gasPrice = feeData.gasPrice;
  }

  if (request?.to && request.data) {
    const estimatedGas = await session.provider
      .estimateGas({
        from: session.address,
        to: request.to,
        data: request.data,
        value: request.value == null ? undefined : BigInt(request.value)
      })
      .catch(() => null);
    if (estimatedGas != null) {
      overrides.gasLimit = withReefGasBuffer(estimatedGas, kind);
    }
  }

  return overrides;
}

async function buildContractWriteRequest(
  contract: Contract,
  methodName: string,
  args: unknown[],
  session: WalletSession,
  config: PublicAppConfig,
  kind: "collection" | "marketplace" = "collection"
) {
  const contractMethod = contract.getFunction(methodName);
  const txRequest = await contractMethod.populateTransaction(...args);
  const txOverrides = await getReefTransactionOverrides(config, session, txRequest, kind);
  return {
    ...txRequest,
    ...txOverrides
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

async function fetchJson<T>(path: string, init?: RequestInit, timeoutMs?: number): Promise<T> {
  const controller = timeoutMs ? new AbortController() : null;
  const timer = controller
    ? globalThis.setTimeout(() => controller.abort(), timeoutMs)
    : null;

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      signal: controller?.signal ?? init?.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${Math.round((timeoutMs ?? 0) / 1000)}s for ${path}`);
    }
    throw error;
  } finally {
    if (timer) {
      globalThis.clearTimeout(timer);
    }
  }

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

const uploadRequestTimeoutMs = 15_000;
const mutationRequestTimeoutMs = 12_000;
const deployRequestTimeoutMs = 50_000;

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

function sleepMs(ms: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

function normalizeReefRelayErrorMessage(message: string) {
  const detail = message.trim();
  if (!detail) {
    return "Failed to create collection.";
  }

  if (detail.includes("Reef rejected the fallback collection factory call")) {
    return detail;
  }

  if (/temporarily banned/i.test(detail)) {
    return (
      "Reef is throttling repeated relayed collection deploy attempts right now. " +
      "Your draft is safe, but publishing is still blocked on the live node. Wait a moment and retry once."
    );
  }

  if (/failed to estimate gas/i.test(detail) || /execution reverted/i.test(detail)) {
    return (
      "Reef rejected the fallback collection factory call. " +
      "The live Reef runtime is currently reverting collection creation, so this environment cannot publish a new collection right now."
    );
  }

  if (/invalid transaction/i.test(detail)) {
    return "Reef rejected the relayed collection deployment as an invalid transaction.";
  }

  if (/revive-deployer/i.test(detail) || /eth_sendRawTransaction/i.test(detail)) {
    return (
      "Reef rejected the relayed collection deployment. " +
      "Refresh the page and try again, or wait a moment if the node is throttling repeated deploy attempts."
    );
  }

  return detail;
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
  const [status, setStatusMessage] = useState("Loading marketplace...");
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [actionModal, setActionModal] = useState<TransactionProgressState | null>(null);
  const toastTimersRef = useRef(new Map<number, ReturnType<typeof globalThis.setTimeout>>());
  const lastToastRef = useRef<{ message: string; at: number } | null>(null);
  const toastIdRef = useRef(1);

  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach((timer) => {
        globalThis.clearTimeout(timer);
      });
      toastTimersRef.current.clear();
    };
  }, []);

  function dismissToast(id: number) {
    const timer = toastTimersRef.current.get(id);
    if (timer != null) {
      globalThis.clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  function showToast(message: string, tone = resolveToastTone(message)) {
    const now = Date.now();
    if (lastToastRef.current && lastToastRef.current.message === message && now - lastToastRef.current.at < 900) {
      return;
    }
    lastToastRef.current = { message, at: now };

    const id = toastIdRef.current;
    toastIdRef.current += 1;

    setToasts((current) => [...current.slice(-2), { id, message, tone }]);

    const timeoutMs = tone === "error" ? 4600 : tone === "success" ? 3200 : 2600;
    const timer = globalThis.setTimeout(() => {
      dismissToast(id);
    }, timeoutMs);
    toastTimersRef.current.set(id, timer);
  }

  function setStatus(value: string) {
    setStatusMessage(value);
    showToast(value);
  }

  useEffect(() => {
    let cancelled = false;
    fetchJson<BootstrapResponse>("/bootstrap")
      .then((data) => {
        if (!cancelled) {
          setBootstrapState({ loading: false, data });
          setStatusMessage("Marketplace loaded.");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setBootstrapState({
            loading: false,
            error: error instanceof Error ? error.message : "Failed to load bootstrap data"
          });
          setStatusMessage("Failed to load bootstrap.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshNonce]);

  function refreshMarket() {
    setRefreshNonce((value) => value + 1);
  }

  function showActionModal(
    value: Omit<TransactionProgressState, "tone"> & { tone?: TransactionProgressTone }
  ) {
    setActionModal({
      title: value.title,
      message: value.message,
      detail: value.detail,
      steps: value.steps,
      activeStep: value.activeStep,
      tone: value.tone ?? "processing"
    });
  }

  function updateActionModal(value: Partial<TransactionProgressState>) {
    setActionModal((current) => {
      if (!current) {
        return null;
      }
      return {
        ...current,
        ...value
      };
    });
  }

  function hideActionModal() {
    setActionModal(null);
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
        actionModal,
        connectWallet,
        getWalletSession,
        setStatus,
        showActionModal,
        updateActionModal,
        hideActionModal,
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
            <Route path="swap" element={<Navigate to="/support" replace />} />
            <Route path="drops" element={<DropsPage />} />
            <Route path="drops/:slug" element={<DropPage />} />
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
        <TransactionProgressModal state={actionModal} />
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
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

function ToastViewport({
  toasts,
  onDismiss
}: {
  toasts: ToastRecord[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toastViewport" role="status" aria-live="polite" aria-relevant="additions text">
      {toasts.map((toast) => (
        <article className={`toastCard tone-${toast.tone}`} key={toast.id}>
          <span className="toastGlyph" aria-hidden="true">
            <Icon icon={toast.tone === "error" ? "alert-circle" : toast.tone === "success" ? "check" : "info"} />
          </span>
          <div className="toastCopy">
            <strong>{toastLabelForTone(toast.tone)}</strong>
            <p>{toast.message}</p>
          </div>
          <button
            className="toastDismiss"
            type="button"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(toast.id)}
          >
            <Icon icon="close" />
          </button>
        </article>
      ))}
    </div>
  );
}

function CopyFeedbackButton({
  value,
  label,
  className,
  ariaLabel,
  children,
  copiedChildren,
  successMessage
}: {
  value: string;
  label: string;
  className: string;
  ariaLabel?: string;
  children?: ReactNode;
  copiedChildren?: ReactNode;
  successMessage?: string;
}) {
  const { setStatus } = useMarketplace();
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current != null) {
        globalThis.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  async function handleClick() {
    try {
      await copyText(value);
      setCopied(true);
      if (resetTimerRef.current != null) {
        globalThis.clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = globalThis.setTimeout(() => {
        setCopied(false);
        resetTimerRef.current = null;
      }, 1800);
      setStatus(successMessage ?? `${label} copied.`);
    } catch (error) {
      setCopied(false);
      setStatus(error instanceof Error ? error.message : `Failed to copy ${label.toLowerCase()}.`);
    }
  }

  return (
    <button
      className={[className, "copyFeedbackButton", copied ? "isCopied" : ""].filter(Boolean).join(" ")}
      type="button"
      aria-label={copied ? `${label} copied` : ariaLabel ?? `Copy ${label.toLowerCase()}`}
      onClick={() => {
        void handleClick();
      }}
    >
      {children ? (copied ? copiedChildren ?? children : children) : <Icon icon={copied ? "check" : "copy"} />}
    </button>
  );
}

function AppShell() {
  const { bootstrap, account, currentUser, isAdmin, connectWallet } = useMarketplace();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    loading: boolean;
    collections: CreatorCollectionDraft[];
    users: SessionUser[];
  }>({
    loading: false,
    collections: [],
    users: []
  });
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 900px)").matches : false
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const searchFieldRef = useRef<HTMLFormElement | null>(null);
  const shellReady = bootstrap.runtime.services.database && bootstrap.runtime.services.storage;
  const profileHref = account ? `/profile/${account}` : "/profile";
  const accountLabel = account ? shortenAddress(account) : "Connect Wallet";
  const sidebarItems = isAdmin
    ? [...bootstrap.config.site.sidebarNav, { label: "Admin", href: "/admin", icon: "settings" }]
    : bootstrap.config.site.sidebarNav;
  const [brandItem, ...navItems] = sidebarItems;
  const primaryNavItems = navItems.filter((item) => !["/profile", "/support", "/admin"].includes(item.href));
  const profileNavItem = navItems.find((item) => item.href === "/profile") ?? null;
  const secondaryNavItems = navItems.filter((item) => item.href === "/support" || item.href === "/admin");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearch(params.get("search") ?? "");
  }, [location.search]);

  useEffect(() => {
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(max-width: 900px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
    };

    setIsMobileViewport(media.matches);
    media.addEventListener("change", handleChange);
    return () => {
      media.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      setMobileSidebarOpen(false);
    }
  }, [isMobileViewport]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isMobileViewport || !mobileSidebarOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileViewport, mobileSidebarOpen]);

  useEffect(() => {
    if (!searchOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (!searchFieldRef.current?.contains(target)) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [searchOpen]);

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      setSearchResults({
        loading: false,
        collections: [],
        users: []
      });
      return;
    }

    let cancelled = false;
    const timer = globalThis.setTimeout(() => {
      setSearchResults((current) => ({
        loading: true,
        collections: current.collections,
        users: current.users
      }));

      Promise.all([
        fetchJson<SearchCollectionsResponse>(`/search/collections/${encodeURIComponent(query)}`),
        fetchJson<SearchUsersResponse>(`/search/users/${encodeURIComponent(query)}`)
      ])
        .then(([collectionResults, userResults]) => {
          if (!cancelled) {
            setSearchResults({
              loading: false,
              collections: collectionResults.collections ?? [],
              users: userResults.users ?? []
            });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSearchResults({
              loading: false,
              collections: [],
              users: []
            });
          }
        });
    }, 180);

    return () => {
      cancelled = true;
      globalThis.clearTimeout(timer);
    };
  }, [search]);

  const trimmedSearch = search.trim();
  const normalizedSearch = trimmedSearch.toLowerCase();
  const showSearchResults = searchOpen && trimmedSearch.length >= 2;
  const shellClassName = [
    "appShell",
    sidebarExpanded ? "sidebarExpanded" : "",
    mobileSidebarOpen ? "mobileSidebarOpen" : ""
  ]
    .filter(Boolean)
    .join(" ");

  function handleSidebarHoverChange(nextExpanded: boolean) {
    if (!isMobileViewport) {
      setSidebarExpanded(nextExpanded);
    }
  }

  function handleSidebarNavigate() {
    if (isMobileViewport) {
      setMobileSidebarOpen(false);
    }
  }

  function openSearchTarget(target: string) {
    navigate(target);
    setSearchOpen(false);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedSearch) {
      openSearchTarget("/collections");
      return;
    }

    const exactCollection = searchResults.collections.find((collection) =>
      [collection.name, collection.slug, collection.symbol].some(
        (value) => value.trim().toLowerCase() === normalizedSearch
      )
    );
    if (exactCollection) {
      openSearchTarget(`/collection/${exactCollection.slug}`);
      return;
    }

    const exactUser = searchResults.users.find((user) =>
      [user.displayName ?? "", user.address].some((value) => value.trim().toLowerCase() === normalizedSearch)
    );
    if (exactUser) {
      openSearchTarget(`/profile/${exactUser.address}`);
      return;
    }

    openSearchTarget(`/collections${buildQuery({ search: trimmedSearch })}`);
  }

  return (
    <div className={shellClassName}>
      <aside
        id="app-sidebar"
        className="sidebarRail"
        aria-expanded={isMobileViewport ? mobileSidebarOpen : sidebarExpanded}
        onMouseEnter={() => handleSidebarHoverChange(true)}
        onMouseLeave={(event) => {
          const activeElement = document.activeElement;
          if (!(activeElement instanceof Node) || !event.currentTarget.contains(activeElement)) {
            handleSidebarHoverChange(false);
          }
        }}
        onFocus={() => handleSidebarHoverChange(true)}
        onBlur={(event) => {
          const nextFocused = event.relatedTarget;
          if (!(nextFocused instanceof Node) || !event.currentTarget.contains(nextFocused)) {
            handleSidebarHoverChange(false);
          }
        }}
      >
        {brandItem ? (
          <NavLink
            to={brandItem.href === "/profile" ? profileHref : brandItem.href}
            end={brandItem.href === "/"}
            className="sidebarButton brand"
            aria-label={brandItem.label}
            onClick={handleSidebarNavigate}
          >
            <span className="sidebarButtonInner">
              <span className="sidebarGlyph brand">
                <OpenSeaBadge className="logoBadge" />
              </span>
              <span className="sidebarBrandCopy">
                <strong className="sidebarBrandName">{bootstrap.config.site.name}</strong>
                <small className="sidebarBrandTagline">{bootstrap.config.site.tagline}</small>
              </span>
            </span>
          </NavLink>
        ) : null}

        <div className="sidebarNavGroup">
          {primaryNavItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href === "/profile" ? profileHref : item.href}
              end={item.href === "/"}
              className={({ isActive }) => (isActive ? "sidebarButton active" : "sidebarButton")}
              aria-label={item.label}
              onClick={handleSidebarNavigate}
            >
              <span className="sidebarButtonInner">
                <span className="sidebarGlyph">
                  <Icon icon={item.icon} className="sidebarIcon" />
                </span>
                <span className="sidebarLabel">{item.label}</span>
              </span>
            </NavLink>
          ))}
        </div>

        {profileNavItem ? (
          <div className="sidebarNavGroup sidebarNavGroupSeparated">
            <NavLink
              to={profileHref}
              className={({ isActive }) => (isActive ? "sidebarButton active sidebarButtonProfile" : "sidebarButton sidebarButtonProfile")}
              aria-label={profileNavItem.label}
              onClick={handleSidebarNavigate}
            >
              <span className="sidebarButtonInner">
                <span className="sidebarGlyph sidebarGlyphProfile">
                  <UserAvatar
                    address={account || profileHref}
                    displayName={currentUser?.displayName}
                    src={currentUser?.avatarUri}
                    className="userAvatar sidebarProfileAvatar"
                    alt={currentUser?.displayName || "Profile"}
                  />
                </span>
                <span className="sidebarLabel">{profileNavItem.label}</span>
                <span className="sidebarRowChevron" aria-hidden="true">
                  <Icon icon="chevron-right" className="sidebarIcon" />
                </span>
              </span>
            </NavLink>
          </div>
        ) : null}

        {secondaryNavItems.length ? (
          <div className="sidebarNavGroup sidebarNavGroupSeparated">
            {secondaryNavItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href === "/profile" ? profileHref : item.href}
                end={item.href === "/"}
                className={({ isActive }) => (isActive ? "sidebarButton active" : "sidebarButton")}
                aria-label={item.label}
                onClick={handleSidebarNavigate}
              >
                <span className="sidebarButtonInner">
                  <span className="sidebarGlyph">
                    <Icon icon={item.icon} className="sidebarIcon" />
                  </span>
                  <span className="sidebarLabel">{item.label}</span>
                </span>
              </NavLink>
            ))}
          </div>
        ) : null}
      </aside>

      <button
        className="mobileSidebarBackdrop"
        type="button"
        aria-label="Close navigation"
        onClick={() => setMobileSidebarOpen(false)}
      />

      <div className="workspace">
        <header className="topHeader">
          <form
            ref={searchFieldRef}
            className="searchField"
            onSubmit={handleSearchSubmit}
          >
            <Icon icon="search" className="searchIcon" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search OpenSea"
            />
            <span className="shortcutHint">/</span>

            {showSearchResults ? (
              <div className="searchResultsPanel">
                <div className="searchResultsHeader">
                  <strong>Search results</strong>
                  <button
                    className="searchResultsAction"
                    type="button"
                    onClick={() => openSearchTarget(`/collections${buildQuery({ search: trimmedSearch })}`)}
                  >
                    View all
                  </button>
                </div>

                {searchResults.loading ? (
                  <div className="searchResultsEmpty">Searching Reef marketplace...</div>
                ) : null}

                {!searchResults.loading && searchResults.collections.length === 0 && searchResults.users.length === 0 ? (
                  <div className="searchResultsEmpty">No collections or profiles match “{trimmedSearch}”.</div>
                ) : null}

                {!searchResults.loading && searchResults.collections.length > 0 ? (
                  <div className="searchResultsGroup">
                    <span className="searchResultsLabel">Collections</span>
                    {searchResults.collections.slice(0, 4).map((collection) => (
                      <button
                        key={collection.slug}
                        className="searchResultItem"
                        type="button"
                        onClick={() => openSearchTarget(`/collection/${collection.slug}`)}
                      >
                        <img
                          src={assetUrl(collection.avatarUrl || placeholderAsset(collection.symbol || collection.name, "#2081e2"))}
                          alt={collection.name}
                          onError={(event) => applyImageFallback(event.currentTarget, collection.name, "#2081e2")}
                        />
                        <span className="searchResultCopy">
                          <strong>{collection.name}</strong>
                          <small>
                            {collection.symbol ? collection.symbol.toUpperCase() : "Collection"}
                            {collection.contractAddress ? ` • ${shortenAddress(collection.contractAddress)}` : ""}
                          </small>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {!searchResults.loading && searchResults.users.length > 0 ? (
                  <div className="searchResultsGroup">
                    <span className="searchResultsLabel">Profiles</span>
                    {searchResults.users.slice(0, 4).map((user) => (
                      <button
                        key={user.address}
                        className="searchResultItem"
                        type="button"
                        onClick={() => openSearchTarget(`/profile/${user.address}`)}
                      >
                        <UserAvatar
                          address={user.address}
                          displayName={user.displayName}
                          src={user.avatarUri}
                          className="userAvatar searchResultAvatar"
                          alt={user.displayName || user.address}
                        />
                        <span className="searchResultCopy">
                          <strong>{user.displayName?.trim() || shortenAddress(user.address)}</strong>
                          <small>{shortenAddress(user.address)}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </form>

          <div className="headerActions">
            <button
              className="headerIconButton mobileSidebarToggle"
              type="button"
              aria-label={mobileSidebarOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileSidebarOpen}
              aria-controls="app-sidebar"
              onClick={() => setMobileSidebarOpen((open) => !open)}
            >
              <Icon icon={mobileSidebarOpen ? "x" : "menu"} />
            </button>
            {account ? (
              <div className="headerActionRail" aria-label="Account actions">
                <button className="headerChestButton" type="button" onClick={() => navigate("/rewards")}>
                  <span className="headerChestGlyph" aria-hidden="true">🎁</span>
                  <span>Open Chest</span>
                </button>
                <span className="headerDivider" aria-hidden="true" />
                <button className="headerIconButton" type="button" aria-label="Notifications" onClick={() => navigate("/activity")}>
                  <Icon icon="bell" />
                </button>
                <span className="headerDivider" aria-hidden="true" />
                <button className="headerIconButton" type="button" aria-label="Marketplace activity" onClick={() => navigate("/activity")}>
                  <Icon icon="activity" />
                </button>
                <span className="headerDivider" aria-hidden="true" />
                <button
                  className="headerBalanceButton"
                  type="button"
                  aria-label="Wallet balance"
                  onClick={() => navigate(account ? `/profile/${account}?tab=portfolio` : "/profile")}
                >
                  <Icon icon="wallet" className="headerBalanceIcon" />
                  <span>$0.00</span>
                </button>
                <button
                  className="headerProfileTrigger"
                  type="button"
                  aria-label="Open profile"
                  onClick={() => navigate(profileHref)}
                >
                  <UserAvatar
                    address={account}
                    displayName={currentUser?.displayName}
                    src={currentUser?.avatarUri}
                    className="userAvatar headerUserAvatar"
                  />
                  <Icon icon="chevron-down" className="headerProfileChevron" />
                </button>
              </div>
            ) : (
              <>
                <button
                  className="walletLink"
                  onClick={() => {
                    void connectWallet();
                  }}
                >
                  {accountLabel}
                </button>
                <button
                  className="iconCircle"
                  type="button"
                  aria-label="Profile"
                  onClick={() => {
                    navigate("/profile");
                  }}
                >
                  <Icon icon="profile" />
                </button>
              </>
            )}
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
  const [collectionsCollapsed, setCollectionsCollapsed] = useState(false);
  const state = useRemoteData<DiscoverResponse>("/dataset/discover", refreshNonce);
  const selectedCategory = params.get("category") ?? "all";
  const selectedNetwork = params.get("network") ?? normalizeFilterValue(bootstrap.config.network.key);
  const selectedAsset = params.get("asset") ?? "nfts";
  const selectedTimeframe = params.get("timeframe") ?? "1d";
  const marketView = params.get("marketView") ?? "table";
  const marketPageRaw = Number.parseInt(params.get("marketPage") ?? "0", 10);

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
        const timeframeCollections =
          selectedTimeframe === "1m" || selectedTimeframe === "5m" || selectedTimeframe === "15m" || selectedTimeframe === "1h"
            ? (topMovers.length > 0 ? topMovers : trendingCollections)
            : selectedTimeframe === "1d"
              ? (topMovers.length > 0 ? topMovers : leaderboardCollections)
              : (leaderboardCollections.length > 0 ? leaderboardCollections : trendingCollections);
        const heroCollection =
          data.heroCollection &&
          matchesNetwork(data.heroCollection.chain) &&
          matchesCategory(data.heroCollection.category)
            ? data.heroCollection
            : leaderboardCollections[0] ?? trendingCollections[0] ?? topMovers[0] ?? null;
        const featuredCollections =
          trendingCollections.length > 0 ? trendingCollections : leaderboardCollections;
        const collectionShelf = timeframeCollections.length > 0 ? timeframeCollections : featuredCollections;
        const heroCollections = [heroCollection, ...featuredCollections, ...topMovers]
          .filter((collection): collection is CollectionSummary => Boolean(collection))
          .filter(
            (collection, index, collections) =>
              collections.findIndex((candidate) => candidate.slug === collection.slug) === index
          )
          .slice(0, 5);
        const showPrimaryShelf = selectedAsset === "tokens" || featuredCollections.length > 0;
        const rowsPerPage = marketView === "cards" ? 4 : 5;
        const marketItemsCount = selectedAsset === "tokens" ? tokenLeaders.length : collectionShelf.length;
        const marketPageCount = Math.max(1, Math.ceil(marketItemsCount / rowsPerPage));
        const marketPage =
          Number.isFinite(marketPageRaw) && marketPageRaw >= 0 ? Math.min(marketPageRaw, marketPageCount - 1) : 0;
        const pageStart = marketPage * rowsPerPage;
        const visibleCollections = collectionShelf.slice(pageStart, pageStart + rowsPerPage);
        const visibleTokens = tokenLeaders.slice(pageStart, pageStart + rowsPerPage);
        const canAdvanceMarketPage = marketPageCount > 1;

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
                      onClick={() => updateParams(params, setParams, { category: value, marketPage: "0" })}
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
                      onClick={() => updateParams(params, setParams, { network: value, marketPage: "0" })}
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
                  onClick={() => updateParams(params, setParams, { asset: "nfts", marketPage: "0" })}
                >
                  NFTs
                </button>
                <button
                  className={selectedAsset === "tokens" ? "segment active" : "segment"}
                  type="button"
                  onClick={() => updateParams(params, setParams, { asset: "tokens", marketPage: "0" })}
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
                  updateParams(params, setParams, { timeframe: nextValue, marketPage: "0" });
                }}
              >
                {selectedTimeframe}
                <Icon icon="chevron-right" className="microIcon" />
              </button>
              <button
                className={marketView === "table" ? "iconChip active" : "iconChip"}
                type="button"
                aria-label={marketView === "table" ? "Switch market board to compact rows" : "Switch market board to table view"}
                onClick={() => updateParams(params, setParams, { marketView: marketView === "table" ? "cards" : "table", marketPage: "0" })}
              >
                <Icon icon={marketView === "table" ? "view-grid" : "table"} />
              </button>
              <button
                className="iconChip"
                type="button"
                aria-label="Show next market page"
                disabled={!canAdvanceMarketPage}
                onClick={() => {
                  if (!canAdvanceMarketPage) {
                    return;
                  }
                  updateParams(params, setParams, { marketPage: String((marketPage + 1) % marketPageCount) });
                }}
              >
                <Icon icon="chevron-right" />
              </button>
            </div>

            <div className="discoverLayout">
              <DiscoverHeroPanel
                heroCollections={heroCollections}
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
                    <AmbientEmptyState
                      compact
                      className="emptySection"
                      variant="rows"
                      eyebrow="Tokens"
                      title="No tokens to display"
                      copy="Tracked Reef-native token movers will appear here once live token data is available."
                    />
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
                  <FeaturedCollectionShelf collections={featuredCollections.slice(0, 4)} />
                )}
              </section>
            ) : null}

            <section className="sectionGrid discoverSecondaryGrid">
              <div className="tableSurface discoverCollectionsSurface">
                <div className="discoverCollectionsHeader">
                  <SectionHeader
                    title={selectedAsset === "tokens" ? "Tokens" : "Collections"}
                    subtitle={
                      selectedAsset === "tokens"
                        ? "Track Reef-native market assets from the same discover controls."
                        : "Explore live creator collections across Reef"
                    }
                  />
                  <button
                    className="discoverSectionCollapseButton"
                    type="button"
                    aria-expanded={!collectionsCollapsed}
                    aria-controls="discover-collections-content"
                    aria-label={collectionsCollapsed ? "Expand collections section" : "Collapse collections section"}
                    onClick={() => setCollectionsCollapsed((current) => !current)}
                  >
                    <Icon
                      icon="chevron-right"
                      className={collectionsCollapsed ? "discoverSectionCollapseIcon collapsed" : "discoverSectionCollapseIcon"}
                    />
                  </button>
                </div>
                <div
                  id="discover-collections-content"
                  className={collectionsCollapsed ? "discoverCollectionsContent collapsed" : "discoverCollectionsContent"}
                >
                  {selectedAsset === "tokens" && tokenLeaders.length === 0 ? (
                    <AmbientEmptyState
                      className="discoverCollectionsEmpty"
                      variant="table"
                      artwork={buildProfileEmptyArtwork("items")}
                      eyebrow="Tokens"
                      title="No tokens found"
                      copy="Tracked Reef assets will appear here once token market data is available."
                    />
                  ) : null}
                  {selectedAsset === "nfts" && collectionShelf.length === 0 ? (
                    <AmbientEmptyState
                      className="discoverCollectionsEmpty"
                      variant="table"
                      artwork={buildProfileEmptyArtwork("created")}
                      eyebrow="Collections"
                      title="No live collections yet"
                      copy="Publish a collection on Reef and it will start populating discover automatically."
                      actions={
                        <div className="panelActionRow">
                          <button className="actionButton secondary" type="button" onClick={() => navigate("/create/collection")}>
                            Create collection
                          </button>
                          <button className="actionButton muted" type="button" onClick={() => navigate("/studio")}>
                            Open Studio
                          </button>
                        </div>
                      }
                    />
                  ) : null}
                  {selectedAsset === "nfts" && collectionShelf.length > 0 ? (
                    marketView === "cards" ? (
                      <div className="compactStack discoverCompactCollectionStack">
                        {visibleCollections.map((collection) => (
                          <DiscoverCollectionCompactRow key={collection.slug} collection={collection} />
                        ))}
                      </div>
                    ) : (
                    <div className="discoverCollectionsTable">
                      <div className="collectionTableHeader discoverCollectionsTableHeader">
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
                        <DiscoverCollectionTableRow key={collection.slug} collection={collection} />
                      ))}
                    </div>
                    )
                  ) : null}
                  {selectedAsset === "tokens" && tokenLeaders.length > 0 ? (
                    marketView === "cards" ? (
                      <div className="compactStack discoverCompactCollectionStack">
                        {visibleTokens.map((token) => (
                          <CompactTokenRow key={token.slug} token={token} />
                        ))}
                      </div>
                    ) : (
                      <div className="discoverTokenBoard">
                        <div className="collectionTableHeader tokenHeader discoverTokenBoardHeader">
                          <span>Token</span>
                          <span>Price</span>
                          <span>Market Vol</span>
                          <span>Status</span>
                          <span>NFT Mints</span>
                          <span>Mode</span>
                        </div>
                        {visibleTokens.map((token) => (
                          <div className="tokenTableRow discoverTokenBoardRow" key={token.slug}>
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
                            <span className={token.change === "Read-only" ? "" : token.change.startsWith("-") ? "negative" : "positive"}>
                              {token.change}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  ) : null}
                </div>
              </div>

              <div className="panelSurface discoverActivitySurface">
                <SectionHeader title="Recent Activity" subtitle="Sales, listings, offers, and transfers" />
                {data.activityFeed.length === 0 ? (
                  <AmbientEmptyState
                    compact
                    variant="rows"
                    eyebrow="Activity"
                    title="No activity yet"
                    copy="Sales, listings, offers, and transfers will appear here once the marketplace gets moving."
                  />
                ) : (
                  <div className="activityStack">
                    {data.activityFeed.slice(0, 6).map((entry) => (
                      <ActivityMiniRow key={entry.id} entry={entry} />
                    ))}
                  </div>
                )}
              </div>

              <div className="panelSurface discoverDropsSurface">
                <SectionHeader title="Drops" subtitle="Explore upcoming and live mints" />
                {data.liveDrops.length === 0 ? (
                  <DropsLaunchEmptyState
                    title="No drops to display"
                    copy="Curated live and upcoming mints will show up here once a drop is scheduled."
                    primaryLabel="Create drop"
                    primaryAction={() => navigate("/create/drop")}
                    secondaryLabel="Open Drops"
                    secondaryAction={() => navigate("/drops")}
                  />
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
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const view = params.get("view") ?? "top";
  const timeframe = params.get("timeframe") ?? "1d";
  const sort = params.get("sort") ?? (view === "trending" ? "change" : view === "watchlist" ? "owners" : "volume");
  const category = params.get("category") ?? "all";
  const status = params.get("status") ?? "all";
  const chain = params.get("chain") ?? "all";
  const collectionSearch = params.get("collectionSearch") ?? "";
  const chainSearch = params.get("chainSearch") ?? "";
  const selectedCollection = params.get("collection") ?? "";
  const density = params.get("density") ?? "dense";
  const railCollapsed = params.get("rail") === "collapsed";
  const state = useRemoteData<CollectionsResponse>(
    `/dataset/collections${buildQuery({ search, view, timeframe })}`,
    refreshNonce
  );
  const { bootstrap } = useMarketplace();

  return (
    <DataState state={state}>
      {(data) => {
        const categoryOptions = Array.from(
          new Set(
            [
              ...bootstrap.config.site.discoverFilters.categories.map((filter) => normalizeFilterValue(filter.label)),
              "memberships",
              "music",
              "photography",
              "domain-names",
              "sports-collectibles",
              "virtual-worlds",
              ...data.collections.map((collection) => normalizeFilterValue(collection.category))
            ].filter(Boolean)
          )
        );
        const chainOptions = Array.from(
          new Set(
            data.collections
              .map((collection) => collection.chain)
              .filter(Boolean)
              .concat(bootstrap.config.network.chainName)
          )
        );
        const visibleChainOptions = chainOptions.filter((option) =>
          option.toLowerCase().includes(chainSearch.trim().toLowerCase())
        );
        const visibleCollections = data.collections.filter((collection) =>
          collection.name.toLowerCase().includes(collectionSearch.trim().toLowerCase())
        );
        const filteredCollections = data.collections
          .filter((collection) => {
            if (category !== "all" && normalizeFilterValue(collection.category) !== category) {
              return false;
            }
            if (
              chain !== "all" &&
              normalizeFilterValue(collection.chain) !== chain &&
              normalizeFilterValue(bootstrap.config.network.chainName) !== chain
            ) {
              return false;
            }
            if (selectedCollection && collection.slug !== selectedCollection) {
              return false;
            }
            if (collectionSearch.trim()) {
              const query = collectionSearch.trim().toLowerCase();
              if (
                !collection.name.toLowerCase().includes(query) &&
                !collection.creatorName.toLowerCase().includes(query)
              ) {
                return false;
              }
            }
            if (status === "verified" && !collection.verified) {
              return false;
            }
            if (status === "listed" && collection.floorPriceRaw === "0") {
              return false;
            }
            if (status === "no-listings" && collection.floorPriceRaw !== "0") {
              return false;
            }
            return true;
          })
          .sort((left, right) => {
            switch (sort) {
              case "floor":
                return compareBigIntStrings(right.floorPriceRaw, left.floorPriceRaw);
              case "change": {
                const leftValue = parseMetricNumber(left.tableMetrics.change) ?? Number.NEGATIVE_INFINITY;
                const rightValue = parseMetricNumber(right.tableMetrics.change) ?? Number.NEGATIVE_INFINITY;
                return rightValue - leftValue;
              }
              case "offer": {
                const leftValue = parseMetricNumber(left.tableMetrics.topOffer) ?? 0;
                const rightValue = parseMetricNumber(right.tableMetrics.topOffer) ?? 0;
                return rightValue - leftValue;
              }
              case "sales": {
                const leftValue = parseMetricNumber(left.tableMetrics.sales) ?? 0;
                const rightValue = parseMetricNumber(right.tableMetrics.sales) ?? 0;
                return rightValue - leftValue;
              }
              case "owners":
                return right.owners - left.owners;
              case "listed":
                return right.listedPercent - left.listedPercent;
              case "volume":
              default: {
                const volumeSort = compareBigIntStrings(right.totalVolumeRaw, left.totalVolumeRaw);
                if (volumeSort !== 0) {
                  return volumeSort;
                }
                return right.owners - left.owners;
              }
            }
          });

        return (
          <div className={`darkPage collectionsMarketplacePage ${railCollapsed ? "collectionsMarketplacePageRailCollapsed" : ""}`}>
            <div className="collectionsMarketplaceLayout">
              {!railCollapsed ? (
                <aside className="pagePanel collectionsFilterRail">
                  <div className="collectionsRailHeader">
                    <strong>Filter By</strong>
                    <div className="segmentedSwitch collectionsRailSegment">
                      <button className="segment active" type="button">Collections</button>
                      <button className="segment" type="button" onClick={() => navigate("/tokens")}>Tokens</button>
                    </div>
                  </div>

                  <div className="collectionsFilterSection">
                    <div className="profileFilterHeadingRow">
                      <strong>Category</strong>
                      <Icon icon="chevron-down" className="profileFilterChevron" />
                    </div>
                    <div className="collectionsFilterChipGrid">
                      <FilterChipButton
                        active={category === "all"}
                        onClick={() => updateParams(params, setParams, { category: "all" })}
                      >
                        All
                      </FilterChipButton>
                      {categoryOptions.map((option) => (
                        <FilterChipButton
                          key={option}
                          active={category === option}
                          onClick={() => updateParams(params, setParams, { category: option })}
                        >
                          {formatFilterLabel(option)}
                        </FilterChipButton>
                      ))}
                    </div>
                  </div>

                  <div className="collectionsFilterSection">
                    <div className="profileFilterHeadingRow">
                      <strong>Status</strong>
                      <Icon icon="chevron-down" className="profileFilterChevron" />
                    </div>
                    <div className="collectionsFilterChipGrid">
                      {[
                        ["all", "All"],
                        ["verified", "Verified"],
                        ["listed", "Listed"],
                        ["no-listings", "No listings"]
                      ].map(([value, label]) => (
                        <FilterChipButton
                          key={value}
                          active={status === value}
                          onClick={() => updateParams(params, setParams, { status: value })}
                        >
                          {label}
                        </FilterChipButton>
                      ))}
                    </div>
                  </div>

                  <div className="collectionsFilterSection">
                    <div className="profileFilterHeadingRow">
                      <strong>Chains</strong>
                      <Icon icon="chevron-down" className="profileFilterChevron" />
                    </div>
                    <label className="profileFilterSearch">
                      <Icon icon="search" />
                      <input
                        type="search"
                        value={chainSearch}
                        placeholder="Search for chains"
                        onChange={(event) => updateParams(params, setParams, { chainSearch: event.target.value })}
                      />
                    </label>
                    <div className="collectionsFilterChipGrid">
                      <FilterChipButton
                        active={chain === "all"}
                        onClick={() => updateParams(params, setParams, { chain: "all" })}
                      >
                        All
                      </FilterChipButton>
                      {visibleChainOptions.map((option) => {
                        const value = normalizeFilterValue(option);
                        return (
                          <FilterChipButton
                            key={option}
                            active={chain === value}
                            onClick={() => updateParams(params, setParams, { chain: value })}
                          >
                            {option}
                          </FilterChipButton>
                        );
                      })}
                    </div>
                  </div>

                  <div className="collectionsFilterSection">
                    <div className="profileFilterHeadingRow">
                      <strong>Collections</strong>
                      <Icon icon="chevron-down" className="profileFilterChevron" />
                    </div>
                    <label className="profileFilterSearch">
                      <Icon icon="search" />
                      <input
                        type="search"
                        value={collectionSearch}
                        placeholder="Search for collections"
                        onChange={(event) => updateParams(params, setParams, { collectionSearch: event.target.value })}
                      />
                    </label>
                    <div className="collectionsSelectionList">
                      {visibleCollections.slice(0, 8).map((collection) => (
                        <button
                          key={collection.slug}
                          className={selectedCollection === collection.slug ? "collectionsSelectionItem active" : "collectionsSelectionItem"}
                          type="button"
                          onClick={() =>
                            updateParams(params, setParams, {
                              collection: selectedCollection === collection.slug ? "all" : collection.slug
                            })
                          }
                        >
                          <img src={assetUrl(collection.avatarUrl)} alt={collection.name} />
                          <span>{collection.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </aside>
              ) : null}

              <section className="pagePanel collectionsMarketSurface">
                <div className="collectionsMarketTopbar">
                    <div className="chipRow">
                      <IconChipButton
                        type="button"
                        aria-label={railCollapsed ? "Open filters" : "Collapse filters"}
                        onClick={() => updateParams(params, setParams, { rail: railCollapsed ? "open" : "collapsed" })}
                      >
                        <Icon icon={railCollapsed ? "chevron-right" : "collapse-left"} />
                      </IconChipButton>
                    {["top", "trending", "watchlist"].map((item) => (
                      <button
                        key={item}
                        className={view === item ? "chip active" : "chip"}
                        type="button"
                        onClick={() => updateParams(params, setParams, { view: item })}
                      >
                        <Icon
                          icon={
                            item === "top" ? "globe" : item === "trending" ? "chart" : "star"
                          }
                          className="microIcon"
                        />
                        {item.charAt(0).toUpperCase() + item.slice(1)}
                      </button>
                    ))}
                  </div>

                  <div className="collectionsMarketActions">
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
                    </div>
                    <div className="chipRow">
                      <IconChipButton
                        active={density === "dense"}
                        type="button"
                        aria-label="Dense table"
                        onClick={() => updateParams(params, setParams, { density: "dense" })}
                      >
                        <Icon icon="table" />
                      </IconChipButton>
                      <IconChipButton
                        active={density === "comfortable"}
                        type="button"
                        aria-label="Comfortable table"
                        onClick={() => updateParams(params, setParams, { density: "comfortable" })}
                      >
                        <Icon icon="list" />
                      </IconChipButton>
                    </div>
                  </div>
                </div>

                <div className={`collectionsMarketTable ${density === "comfortable" ? "comfortable" : "dense"}`}>
                  <div className="collectionsMarketHeader">
                    <span />
                    <span>Collection</span>
                    <button type="button" className={sort === "floor" ? "collectionsHeaderButton active" : "collectionsHeaderButton"} onClick={() => updateParams(params, setParams, { sort: "floor" })}>Floor Price</button>
                    <button type="button" className={sort === "change" ? "collectionsHeaderButton active" : "collectionsHeaderButton"} onClick={() => updateParams(params, setParams, { sort: "change" })}>1D Change</button>
                    <button type="button" className={sort === "offer" ? "collectionsHeaderButton active" : "collectionsHeaderButton"} onClick={() => updateParams(params, setParams, { sort: "offer" })}>Top Offer</button>
                    <button type="button" className={sort === "volume" ? "collectionsHeaderButton active" : "collectionsHeaderButton"} onClick={() => updateParams(params, setParams, { sort: "volume" })}>1D Vol</button>
                    <button type="button" className={sort === "sales" ? "collectionsHeaderButton active" : "collectionsHeaderButton"} onClick={() => updateParams(params, setParams, { sort: "sales" })}>1D Sales</button>
                    <button type="button" className={sort === "owners" ? "collectionsHeaderButton active" : "collectionsHeaderButton"} onClick={() => updateParams(params, setParams, { sort: "owners" })}>Owners</button>
                  </div>

                  {filteredCollections.length === 0 ? (
                    <AmbientEmptyState
                      className="collectionsMarketEmptyState"
                      compact
                      variant="table"
                      eyebrow="Collections"
                      title="No collections found"
                      copy="Try a different mix of categories, chain filters, or search terms."
                    />
                  ) : null}

                  {filteredCollections.map((collection) => {
                    const changeValue = parseMetricNumber(collection.tableMetrics.change);
                    const changeClass =
                      changeValue == null ? "" : changeValue > 0 ? "positive" : changeValue < 0 ? "negative" : "";

                    return (
                      <NavLink
                        to={`/collection/${collection.slug}`}
                        className="collectionsMarketRow"
                        key={collection.slug}
                      >
                        <span className="collectionsStarSlot"><Icon icon="star" /></span>
                        <div className="collectionsMarketIdentity">
                          <img src={assetUrl(collection.avatarUrl)} alt={collection.name} />
                          <div className="collectionsMarketIdentityText">
                            <div className="collectionsMarketTitleRow">
                              <strong>{collection.name}</strong>
                              {collection.verified ? <OpenSeaBadge className="verifiedBadge small" /> : null}
                            </div>
                            <p>
                              {collection.creatorName || shortenAddress(collection.creatorSlug || collection.contractAddress)}
                              <span>
                                {" "}
                                • {collection.chain} • {compact(collection.owners)} owners
                              </span>
                            </p>
                          </div>
                        </div>
                        <span className="collectionsMetricValue">{collection.tableMetrics.floor}</span>
                        <span className={`collectionsMetricValue ${changeClass}`}>{collection.tableMetrics.change}</span>
                        <span className="collectionsMetricValue">{collection.tableMetrics.topOffer}</span>
                        <span className="collectionsMetricValue">{collection.tableMetrics.volume}</span>
                        <span className="collectionsMetricValue">{collection.tableMetrics.sales}</span>
                        <span className="collectionsMetricValue">{collection.tableMetrics.owners}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        );
      }}
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
          <AmbientEmptyState
            compact
            variant="rows"
            eyebrow="Tokens"
            title="No tokens match this search"
            copy="Try a different query or clear the filter to see tracked Reef assets."
          />
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
            <CopyFeedbackButton
              className="chip"
              value={bootstrap.config.network.rpcUrl}
              label="RPC URL"
              copiedChildren="RPC Copied"
            >
              Copy RPC
            </CopyFeedbackButton>
            <CopyFeedbackButton
              className="chip"
              value={String(bootstrap.config.network.chainId)}
              label="Chain ID"
              copiedChildren="Chain ID Copied"
            >
              Copy Chain ID
            </CopyFeedbackButton>
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
            {data.drops.length > 0 ? <DropsHeroCarousel drops={data.drops} /> : null}
            <div className="dropGrid">
              {data.drops.length === 0 ? (
                <DropsLaunchEmptyState
                  className="dropsLaunchEmpty-full"
                  title="No drops to display"
                  copy="Live and upcoming Reef drops will appear here once creators or admins schedule them."
                  primaryLabel={isAdmin ? "Manage drops" : "Open Studio"}
                  primaryAction={() => navigate(isAdmin ? "/admin" : "/studio")}
                  secondaryLabel={isAdmin ? "Create drop" : undefined}
                  secondaryAction={isAdmin ? () => navigate("/create/drop") : undefined}
                />
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

function DropPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { refreshNonce, isAdmin } = useMarketplace();
  const state = useRemoteData<DropDetailResponse>(slug ? `/dataset/drop/${slug}` : null, refreshNonce);

  if (!slug) {
    return <PageState message="Missing drop slug." />;
  }

  return (
    <DataState state={state}>
      {(data) => (
        <div className="darkPage">
          <section className="dropDetailHero">
            <DropCoverImage className="dropDetailBackdrop" drop={data.drop} />
            <div className="dropDetailShade" />
            <div className="dropDetailContent">
              <div className="dropDetailTopline">
                <button className="chip" type="button" onClick={() => navigate("/drops")}>
                  <Icon className="chipIcon" icon="chevron-left" />
                  All drops
                </button>
                <div className="dropDetailBadgeRow">
                  <span className={`dropsHeroStage stage-${normalizeFilterValue(data.drop.stage)}`}>
                    {data.drop.stage}
                  </span>
                  <span className="dropsHeroBadge">{data.drop.startLabel || "Reef drop"}</span>
                </div>
              </div>

              <div className="dropDetailCopy">
                <span className="dropsHeroEyebrow">Drop page</span>
                <h1>{data.drop.name}</h1>
                <p>
                  By {data.drop.creatorName}
                  {data.drop.startLabel ? ` • ${data.drop.startLabel}` : ""}
                </p>
                <small>{data.drop.description || "This drop is live on Reef."}</small>
              </div>

              <div className="dropDetailFooter">
                <div className="dropDetailMetricGrid">
                  <div className="dropDetailMetric">
                    <span>Mint Price</span>
                    <strong>{data.drop.mintPrice}</strong>
                  </div>
                  <div className="dropDetailMetric">
                    <span>Total Items</span>
                    <strong>{compact(data.drop.supply)}</strong>
                  </div>
                  <div className="dropDetailMetric">
                    <span>Status</span>
                    <strong>{data.drop.stage}</strong>
                  </div>
                </div>

                <div className="panelActionRow">
                  <button className="actionButton secondary" type="button" onClick={() => navigate("/drops")}>
                    Back to drops
                  </button>
                  {isAdmin ? (
                    <button className="actionButton muted" type="button" onClick={() => navigate("/admin")}>
                      Manage drops
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {data.relatedDrops.length ? (
            <section className="pagePanel">
              <SectionHeader title="More Drops" subtitle="Keep exploring live and upcoming Reef releases." />
              <div className="dropGrid">
                {data.relatedDrops.map((drop) => (
                  <DropCard key={drop.slug} drop={drop} />
                ))}
              </div>
            </section>
          ) : null}
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
          <AmbientEmptyState
            compact
            variant="rows"
            eyebrow="Admin"
            title="No drops created yet"
            copy="Add the first curated drop and it will appear on the public Drops route automatically."
          />
        ) : null}
        <div className="adminDropList">
          {dropsState.drops.map((drop) => (
            <article className="adminDropRow" key={drop.slug}>
              <DropCoverImage drop={drop} />
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
            <div className="activityFeedList">
              {data.activities.length === 0 ? (
                <AmbientEmptyState
                  variant="rows"
                  eyebrow="Activity"
                  title="No activity yet"
                  copy="Once mints, listings, transfers, and sales happen on Reef, they will stream into this feed."
                />
              ) : null}
              {data.activities.map((entry) => <ActivityFeedRow entry={entry} key={entry.id} />)}
            </div>
          </section>
        </div>
      )}
    </DataState>
  );
}

function RewardsPage() {
  const { account, connectWallet, currentUser, isAdmin, bootstrap, refreshNonce } = useMarketplace();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"home" | "pool" | "activity">("home");
  const [rewardWindowEndsAt] = useState(() => {
    const anchor = bootstrap.recentActivity[0]?.createdAt
      ? new Date(bootstrap.recentActivity[0].createdAt).getTime()
      : Date.now();
    return anchor + 52 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000 + 5 * 60 * 1000 + 3 * 1000;
  });
  const [now, setNow] = useState(() => Date.now());
  const state = useRemoteData<ProfileResponse>(account ? `/dataset/profile/${account}` : null, refreshNonce);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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
        const accountSuffix = account.slice(-4).toLowerCase();
        const relatedActivity = (profile.activity.length ? profile.activity : bootstrap.recentActivity.filter((entry) =>
          sameAddress(entry.fromAddress, account) ||
          sameAddress(entry.toAddress, account) ||
          entry.from.toLowerCase().includes(accountSuffix) ||
          entry.to.toLowerCase().includes(accountSuffix)
        )).slice(0, 5);
        const totalPoints =
          profile.createdItems.length * 50 +
          profile.createdCollections.length * 200 +
          bootstrap.recentActivity.filter((entry) => entry.to.toLowerCase().includes(account.slice(-4).toLowerCase())).length * 25 +
          (isAdmin ? 500 : 0);
        const { current: currentTier, next: nextTier } = resolveRewardTier(totalPoints);
        const countdown = splitCountdown(rewardWindowEndsAt - now);
        const rewardRank = isAdmin ? "Reef Team" : totalPoints >= 1000 ? "Vanguard" : totalPoints >= 600 ? "Creator" : totalPoints >= 250 ? "Collector" : "Explorer";
        const streakDays = Math.max(1, profile.createdItems.length + profile.createdCollections.length + relatedActivity.length);
        const nextTierTarget = nextTier?.min ?? currentTier.min;
        const currentTierFloor = currentTier.min;
        const progressToNextTier = nextTierTarget > currentTierFloor
          ? Math.max(0, Math.min(100, ((totalPoints - currentTierFloor) / (nextTierTarget - currentTierFloor)) * 100))
          : 100;
        const walletLabel = currentUser?.displayName?.trim() || profile.profile.name || shortenAddress(account);
        const walletSubline = account.slice(2, 8).toUpperCase();
        const heroTitle =
          activeTab === "pool"
            ? "Reward Pool Status"
            : activeTab === "activity"
              ? "Reward Activity Window"
              : `${currentTier.fee} Token Trading Fees`;
        const heroCopy =
          activeTab === "pool"
            ? "Every mint, listing, and collection creation upgrades your wallet tier and pushes the next fee unlock closer."
            : activeTab === "activity"
              ? "Recent wallet actions feed your rewards window. Keep creating and trading on Reef to hold the best fee tier."
              : "Trade across the marketplace with your current reward tier. The fee window refreshes as your wallet keeps creating, listing, and collecting on Reef.";
        const treasures = [
          {
            title: "Wallet linked",
            icon: "profile",
            unlocked: true,
            detail: "Connected"
          },
          {
            title: "Collector",
            icon: "spark",
            unlocked: profile.items.length + profile.createdItems.length > 0,
            detail: `${profile.items.length + profile.createdItems.length} NFTs`
          },
          {
            title: "Creator",
            icon: "grid",
            unlocked: profile.createdCollections.length > 0,
            detail: `${profile.createdCollections.length} collections`
          },
          {
            title: "Market maker",
            icon: "list",
            unlocked: profile.listings.length > 0,
            detail: `${profile.listings.length} listings`
          },
          {
            title: "Active trader",
            icon: "activity",
            unlocked: relatedActivity.length >= 2,
            detail: `${relatedActivity.length} actions`
          },
          {
            title: "Team vault",
            icon: "wallet",
            unlocked: isAdmin,
            detail: isAdmin ? "Enabled" : "Locked"
          }
        ];
        const milestones = [
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
            state: profile.items.length + profile.createdItems.length > 0 ? "Complete" : "Pending"
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
        const snapshotCards = [
          {
            label: "Points",
            value: compact(totalPoints),
            note: currentTier.name
          },
          {
            label: "Treasures",
            value: `${treasures.filter((treasure) => treasure.unlocked).length}/6`,
            note: "Unlocked"
          },
          {
            label: "Streak",
            value: `${streakDays}d`,
            note: "Active"
          }
        ];
        const heroPrimaryAction =
          activeTab === "activity"
            ? { label: "Open profile", onClick: () => navigate(`/profile/${account}?tab=activity`) }
            : { label: "Explore tokens", onClick: () => navigate("/tokens") };
        const heroSecondaryAction =
          activeTab === "pool"
            ? { label: "How it works", onClick: () => navigate("/support") }
            : { label: "My activity", onClick: () => setActiveTab("activity") };
        const rewardTabs = [
          { id: "home" as const, label: "Home", icon: "home" },
          { id: "pool" as const, label: "Reward Pool", icon: "spark" },
          { id: "activity" as const, label: "My Activity", icon: "activity" }
        ];

        return (
          <div className="darkPage rewardsPage">
            <section className="rewardsShell">
              <div className="rewardsTopTabs">
                {rewardTabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={activeTab === tab.id ? "rewardsNavTab active" : "rewardsNavTab"}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon icon={tab.icon} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="rewardsLayout">
                <div className="rewardsMainColumn">
                  <article className="rewardsCampaignPanel">
                    <div className="rewardsCampaignCopy">
                      <span className="metaLabel">Rewards season</span>
                      <h1>{heroTitle}</h1>
                      <p>{heroCopy}</p>
                      <div className="rewardsCampaignActions">
                        <button className="primaryCta" type="button" onClick={heroPrimaryAction.onClick}>
                          {heroPrimaryAction.label}
                        </button>
                        <button className="chip" type="button" onClick={heroSecondaryAction.onClick}>
                          {heroSecondaryAction.label}
                        </button>
                      </div>
                    </div>

                    <div className="rewardsCountdownCard">
                      <p>Trade with {currentTier.fee} fees for</p>
                      <div className="rewardsCountdownGrid">
                        {countdown.map((segment) => (
                          <article className="rewardsCountdownUnit" key={segment.label}>
                            <strong>{segment.value}</strong>
                            <span>{segment.label}</span>
                          </article>
                        ))}
                      </div>
                    </div>
                  </article>

                  <div className="rewardsBoardGrid">
                    <article className="rewardsBoardPanel">
                      <div className="rewardsBoardHeader">
                        <div>
                          <span className="metaLabel">Reward pool</span>
                          <h3>Tier progression</h3>
                        </div>
                        <span className="rewardsStatusPill">{currentTier.name}</span>
                      </div>

                      <div className="rewardsScoreRow">
                        {snapshotCards.map((card) => (
                          <article className="rewardsScoreCard" key={card.label}>
                            <span>{card.label}</span>
                            <strong>{card.value}</strong>
                            <small>{card.note}</small>
                          </article>
                        ))}
                      </div>

                      <div className="rewardsProgressPanel">
                        <div className="rewardsProgressMeta">
                          <strong>{nextTier ? `${nextTier.min - totalPoints} pts to ${nextTier.name}` : "Top tier active"}</strong>
                          <span>{nextTier ? `${compact(totalPoints)} / ${compact(nextTier.min)} pts` : `${currentTier.fee} fees unlocked`}</span>
                        </div>
                        <div className="rewardsProgressTrack" aria-hidden="true">
                          <span className="rewardsProgressFill" style={{ width: `${progressToNextTier}%` }} />
                        </div>
                      </div>

                      <div className="rewardsMilestoneList">
                        {milestones.map((task) => (
                          <article className="rewardsMilestoneRow" key={task.title}>
                            <div>
                              <strong>{task.title}</strong>
                              <p>{task.description}</p>
                            </div>
                            <div className="rewardsMilestoneMeta">
                              <span>{task.points}</span>
                              <small>{task.state}</small>
                            </div>
                          </article>
                        ))}
                      </div>
                    </article>

                    <article className="rewardsBoardPanel">
                      <div className="rewardsBoardHeader">
                        <div>
                          <span className="metaLabel">My activity</span>
                          <h3>Recent reward actions</h3>
                        </div>
                        <button className="chip" type="button" onClick={() => navigate(`/profile/${account}?tab=activity`)}>
                          Open feed
                        </button>
                      </div>

                      {relatedActivity.length ? (
                        <div className="rewardsActivityList">
                          {relatedActivity.map((entry) => (
                            <article className="rewardsActivityRow" key={entry.id}>
                              <span className={`rewardsActivityIcon activityType-${entry.type}`}>
                                <Icon icon={activityIcon(entry.type)} />
                              </span>
                              <div className="rewardsActivityBody">
                                <strong>{formatActivityHeadline(entry)}</strong>
                                <p>{entry.itemName}</p>
                              </div>
                              <div className="rewardsActivityMeta">
                                <span>{entry.priceDisplay}</span>
                                <small>{entry.ageLabel}</small>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="rewardsActivityEmpty">
                          <span className="profileActivityEmptyBadge">No reward activity yet</span>
                          <p>Mint, list, or create a collection to start filling your reward history.</p>
                        </div>
                      )}

                      <div className="rewardsSnapshotGrid">
                        {profile.portfolio.summaryCards.slice(0, 3).map((card) => (
                          <article className="rewardsSnapshotCard" key={card.label}>
                            <span>{card.label}</span>
                            <strong>{card.value}</strong>
                            <small>{card.note}</small>
                          </article>
                        ))}
                      </div>
                    </article>
                  </div>
                </div>

                <aside className="rewardsSidebar">
                  <article className="rewardsSidebarCard">
                    <div className="rewardsSidebarHeader">
                      <UserAvatar
                        address={account}
                        className="userAvatar rewardsSidebarAvatar"
                        displayName={currentUser?.displayName ?? profile.profile.name}
                        src={currentUser?.avatarUri || profile.profile.avatarUrl}
                      />
                      <div className="rewardsSidebarIdentity">
                        <strong>{walletLabel}</strong>
                        <small>{walletSubline}</small>
                      </div>
                    </div>

                    <div className="rewardsSidebarStats">
                      <article>
                        <span>Rank</span>
                        <strong>{rewardRank}</strong>
                      </article>
                      <article>
                        <span>Points</span>
                        <strong>{compact(totalPoints)}</strong>
                      </article>
                      <article>
                        <span>Window</span>
                        <strong>{currentTier.fee}</strong>
                      </article>
                    </div>

                    <div className="rewardsTreasures">
                      <div className="rewardsBoardHeader compact">
                        <div>
                          <h3>Treasures</h3>
                          <p>Milestones tied to this wallet and its creator activity on Reef.</p>
                        </div>
                      </div>

                      <div className="rewardsTreasureGrid">
                        {treasures.map((treasure) => (
                          <article
                            className={treasure.unlocked ? "rewardsTreasure unlocked" : "rewardsTreasure"}
                            key={treasure.title}
                            title={`${treasure.title} · ${treasure.detail}`}
                          >
                            <span className="rewardsTreasureGlyph">
                              <Icon icon={treasure.icon} />
                            </span>
                            <strong>{treasure.title}</strong>
                            <small>{treasure.detail}</small>
                          </article>
                        ))}
                      </div>
                    </div>

                    <div className="rewardsSidebarActions">
                      <button className="chip rewardsSidebarButton" type="button" onClick={() => navigate("/support")}>
                        How It Works
                      </button>
                      <button className="primaryCta rewardsSidebarButton" type="button" onClick={() => navigate(`/profile/${account}`)}>
                        Open Profile
                      </button>
                    </div>
                  </article>
                </aside>
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
        <rect x="82" y="86" width="128" height="164" rx="18" fill="rgba(33,33,35,0.96)" stroke="rgba(255,255,255,0.08)" />
        <rect x="214" y="56" width="152" height="194" rx="18" fill="rgba(20,20,21,0.98)" stroke="rgba(255,255,255,0.08)" />
        <rect x="250" y="88" width="80" height="96" rx="12" fill="rgba(255,255,255,0.08)" />
        <path d="M276 136h28" stroke="#f3f4f6" stroke-width="8" stroke-linecap="round" />
        <path d="M290 122v28" stroke="#f3f4f6" stroke-width="8" stroke-linecap="round" />
        <rect x="108" y="292" width="236" height="12" rx="4" fill="rgba(255,255,255,0.08)" />
        <rect x="154" y="318" width="144" height="10" rx="4" fill="rgba(255,255,255,0.05)" />
      `
      : `
        <rect x="82" y="76" width="128" height="172" rx="18" fill="rgba(26,26,28,0.96)" stroke="rgba(255,255,255,0.08)" />
        <rect x="226" y="54" width="126" height="176" rx="14" fill="#2b211f" />
        <rect x="246" y="74" width="86" height="118" rx="12" fill="#996960" />
        <rect x="258" y="88" width="62" height="74" rx="8" fill="#7a544d" />
        <circle cx="292" cy="116" r="8" fill="#1f130f" />
        <path d="M286 118h12M292 112v12" stroke="#1f130f" stroke-width="3" stroke-linecap="round" />
        <rect x="252" y="202" width="74" height="8" rx="4" fill="rgba(255,255,255,0.22)" />
        <path d="M106 292h236" stroke="rgba(255,255,255,0.08)" stroke-width="12" stroke-linecap="round" />
      `;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="448" height="360" viewBox="0 0 448 360" fill="none">
    <rect width="448" height="360" fill="#141415" />
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
    hideActionModal,
    setStatus,
    showActionModal,
    updateActionModal,
    refreshMarket,
    refreshNonce
  } = useMarketplace();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queueInputRef = useRef<HTMLInputElement | null>(null);
  const nftImageInputRef = useRef<HTMLInputElement | null>(null);
  const collectionPickerRef = useRef<HTMLDivElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [nftDragActive, setNftDragActive] = useState(false);
  const [previewImageFailed, setPreviewImageFailed] = useState(false);
  const [showRawTraitsEditor, setShowRawTraitsEditor] = useState(false);
  const [traitsJsonError, setTraitsJsonError] = useState("");
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
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    subtitle: "",
    description: "",
    accent: "#2081e2",
    editionQuantity: "1",
    recipient: "",
    imageUrl: "",
    traitsJson: DEFAULT_TRAITS_JSON
  });
  const [traitRows, setTraitRows] = useState<TraitEditorRow[]>(() => {
    const parsed = parseTraitRowsInput(DEFAULT_TRAITS_JSON);
    return parsed.length ? parsed : [createTraitEditorRow()];
  });
  const requestedCollectionSlug = params.get("collection")?.trim().toLowerCase() ?? "";
  const batchMode = params.get("batch") === "1";
  const freshCollection = params.get("fresh") === "1";

  function createDraftId() {
    return globalThis.crypto?.randomUUID?.() ?? randomSaltHex();
  }

  function createTraitEditorRow(overrides?: Partial<Omit<TraitEditorRow, "id">>) {
    return {
      id: createDraftId(),
      trait_type: "",
      value: "",
      ...overrides
    };
  }

  function markCollectionContractUnavailable(slug: string, reason: string) {
    setCreatorCollectionsState((current) => ({
      ...current,
      collections: current.collections.map((collection) =>
        collection.slug === slug
          ? {
              ...collection,
              contractReady: false,
              contractReason: reason
            }
        : collection
      )
    }));
  }

  function syncCreatorCollection(collection: CreatorCollectionDraft) {
    setCreatorCollectionsState((current) => {
      const existing = current.collections.some((entry) => entry.slug === collection.slug);
      return {
        ...current,
        collections: existing
          ? current.collections.map((entry) =>
              entry.slug === collection.slug ? collection : entry
            )
          : [...current.collections, collection]
      };
    });
  }

  function removeCreatorCollection(slug: string) {
    setCreatorCollectionsState((current) => ({
      ...current,
      collections: current.collections.filter((collection) => collection.slug !== slug)
    }));
    setSelectedCollectionSlug((current) => (current === slug ? "" : current));
  }

  async function resolveLiveCollectionForMint(collection: CreatorCollectionDraft) {
    try {
      const liveCollection = await fetchJson<CreatorCollectionDraft>(
        `/creator/collections/${encodeURIComponent(collection.slug)}`,
        undefined,
        mutationRequestTimeoutMs
      );
      syncCreatorCollection(liveCollection);
      return liveCollection;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("/creator/collections/") && message.includes("(404)")) {
        removeCreatorCollection(collection.slug);
        throw new Error(
          "Selected collection is no longer available in this fresh Reef workspace. Refresh the page and create or redeploy a live collection before minting."
        );
      }
      throw error;
    }
  }

  async function readLiveCollectionCode(session: WalletSession, contractAddress: string) {
    const normalizedAddress = contractAddress.trim();
    if (!normalizedAddress) {
      return "0x";
    }

    const walletCode = await session.provider.getCode(normalizedAddress).catch(() => "");
    if (walletCode && walletCode !== "0x") {
      return walletCode;
    }

    if (!bootstrap.config.network.rpcUrl) {
      return walletCode || "0x";
    }

    const rpcProvider = new JsonRpcProvider(
      bootstrap.config.network.rpcUrl,
      Number(bootstrap.config.network.chainId)
    );
    return (await rpcProvider.getCode(normalizedAddress).catch(() => walletCode || "0x")) || "0x";
  }

  function parseTraitRowsInput(traitsJson: string) {
    const trimmed = traitsJson.trim();
    if (!trimmed) {
      return [];
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.map((entry) =>
        createTraitEditorRow({
          trait_type: String((entry as { trait_type?: unknown }).trait_type ?? ""),
          value: String((entry as { value?: unknown }).value ?? "")
        })
      );
    } catch {
      return [];
    }
  }

  function formatTraitRowsJson(rows: TraitEditorRow[]) {
    return JSON.stringify(
      rows
        .map((row) => ({
          trait_type: row.trait_type.trim(),
          value: row.value.trim()
        }))
        .filter((row) => row.trait_type || row.value),
      null,
      2
    );
  }

  function sameTraitRowsContent(a: TraitEditorRow[], b: Array<Pick<TraitEditorRow, "trait_type" | "value">>) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every(
      (row, index) =>
        row.trait_type === b[index]?.trait_type &&
        row.value === b[index]?.value
    );
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
      traitsJson: DEFAULT_TRAITS_JSON,
      ...overrides
    };
  }

  useEffect(() => {
    refreshMarket();
  }, []);

  useEffect(() => {
    if (!collectionPickerOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (!collectionPickerRef.current?.contains(target)) {
        setCollectionPickerOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCollectionPickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [collectionPickerOpen]);

  useEffect(() => {
    if (account && !form.recipient) {
      setForm((current) => ({
        ...current,
        recipient: account
      }));
    }
  }, [account, form.recipient]);

  useEffect(() => {
    const trimmed = form.traitsJson.trim();
    if (!trimmed) {
      if (!sameTraitRowsContent(traitRows, [{ trait_type: "", value: "" }])) {
        setTraitRows([createTraitEditorRow()]);
      }
      setTraitsJsonError("");
      return;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        setTraitsJsonError("Traits JSON must be an array of trait objects.");
        return;
      }
      const nextRows = parsed.map((entry) => ({
          trait_type: String((entry as { trait_type?: unknown }).trait_type ?? ""),
          value: String((entry as { value?: unknown }).value ?? "")
        }));
      const normalizedRows = nextRows.length ? nextRows : [{ trait_type: "", value: "" }];
      if (!sameTraitRowsContent(traitRows, normalizedRows)) {
        setTraitRows(normalizedRows.map((row) => createTraitEditorRow(row)));
      }
      setTraitsJsonError("");
    } catch {
      setTraitsJsonError("Traits JSON is invalid. Fix the JSON or switch back to the visual builder.");
    }
  }, [form.traitsJson, traitRows, traitsJsonError]);

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
        (collection) => isCreatorCollectionMintable(collection)
      ) ??
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
  const selectedCollectionStatus = selectedCollection
    ? `${formatCollectionStatus(selectedCollection.status)} • ${selectedCollection.standard}`
    : "Choose a collection to mint into";
  const starterArtworks = buildStarterArtworkSet(
    form.name || "Reef NFT",
    form.subtitle || "Collector Edition"
  );
  const selectedCollectionArtwork = creatorCollectionArtworkSource(selectedCollection);
  const previewImage =
    form.imageUrl.trim() ||
    selectedCollectionArtwork ||
    starterArtworks[0].imageUrl;
  const previewTraitChips = traitRows
    .map((row) => ({
      trait_type: row.trait_type.trim(),
      value: row.value.trim()
    }))
    .filter((row) => row.trait_type || row.value)
    .slice(0, 4);
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
    selectedCollection && isCreatorCollectionMintable(selectedCollection)
  );

  useEffect(() => {
    if (!freshCollection || !selectedCollection) {
      return;
    }
    setStatus(`Collection ${selectedCollection.name} is ready. Add multiple NFTs below and mint them into this collection.`);
  }, [freshCollection, selectedCollection, setStatus]);

  useEffect(() => {
    setPreviewImageFailed(false);
  }, [previewImage]);

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
    const selectedCollectionIssue = creatorCollectionMintBlockerMessage(selectedCollection);
    if (selectedCollectionIssue) {
      return selectedCollectionIssue;
    }
    return "";
  })();

  function previewForDraft(draft: Pick<MintQueueDraft, "name" | "subtitle" | "imageUrl">) {
    const source = draft.imageUrl.trim();
    if (source) {
      return source;
    }
    if (selectedCollectionArtwork) {
      return selectedCollectionArtwork;
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
    if (selectedCollectionArtwork) {
      return selectedCollectionArtwork;
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

  function applyTraitRows(nextRows: TraitEditorRow[]) {
    const normalizedRows = nextRows.length ? nextRows : [createTraitEditorRow()];
    setTraitRows(normalizedRows);
    setTraitsJsonError("");
    setForm((current) => ({
      ...current,
      traitsJson: formatTraitRowsJson(normalizedRows)
    }));
  }

  function addTraitRow() {
    applyTraitRows([...traitRows, createTraitEditorRow()]);
  }

  function updateTraitRow(id: string, patch: Partial<Omit<TraitEditorRow, "id">>) {
    applyTraitRows(
      traitRows.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  function removeTraitRow(id: string) {
    applyTraitRows(traitRows.filter((row) => row.id !== id));
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
    const selectedCollectionIssue = creatorCollectionMintBlockerMessage(selectedCollection);
    if (selectedCollectionIssue) {
      throw new Error(selectedCollectionIssue);
    }

    const liveCollection = await resolveLiveCollectionForMint(selectedCollection);
    const liveCollectionIssue = creatorCollectionMintBlockerMessage(liveCollection);
    if (liveCollectionIssue) {
      throw new Error(liveCollectionIssue);
    }

    const deployedCode = await readLiveCollectionCode(session, liveCollection.contractAddress);
    if (!deployedCode || deployedCode === "0x") {
      const reason =
        liveCollection.contractReason ||
        "Selected collection contract is unavailable on Reef. Redeploy the collection before minting NFTs.";
      markCollectionContractUnavailable(liveCollection.slug, reason);
      throw new Error(reason);
    }

    const resolvedMetadata = pinnedUri ?? (await pinMetadataForDraft(draft)).uri;
    const parsedTraits = parseTraitsJson(draft.traitsJson);
    const isEditionCollection = liveCollection.standard.toUpperCase() === "ERC1155";
    const usesOfficialCreatorMint =
      !isEditionCollection && liveCollection.deploymentMode.toLowerCase() === "official";
    const contract = new Contract(
      liveCollection.contractAddress,
      isEditionCollection
        ? editionCollectionAbi
        : usesOfficialCreatorMint
          ? creatorCollectionAbi
          : fallbackCreatorCollectionAbi,
      session.signer
    );
    let contractOwner = "";
    try {
      contractOwner = String(await contract.owner());
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("could not decode result data") || message.includes("BAD_DATA")) {
        const reason =
          liveCollection.contractReason ||
          "Selected collection did not respond like a Reef creator contract. Redeploy the collection before minting NFTs.";
        markCollectionContractUnavailable(liveCollection.slug, reason);
        throw new Error(reason);
      }
      throw error;
    }
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
    const txRequest = isEditionCollection
      ? await buildContractWriteRequest(
          contract,
          "mintCreator",
          [recipient, BigInt(Math.max(1, Number(draft.editionQuantity || "1"))), resolvedMetadata],
          session,
          bootstrap.config,
          "collection"
        )
      : usesOfficialCreatorMint
        ? await buildContractWriteRequest(
            contract,
            "mintCreator",
            [recipient, resolvedMetadata],
            session,
            bootstrap.config,
            "collection"
          )
        : await buildContractWriteRequest(
            contract,
            "mintTo",
            [recipient, resolvedMetadata],
            session,
            bootstrap.config,
            "collection"
          );
    const tx = await session.signer.sendTransaction(txRequest);
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
        collectionSlug: liveCollection.slug,
        collectionAddress: liveCollection.contractAddress,
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
      contractAddress: liveCollection.contractAddress
    };
  }

  async function mintNft() {
    setSubmitting(true);
    try {
      showActionModal({
        title: "Minting NFT",
        message: "Preparing metadata and waiting for your wallet confirmation.",
        detail: selectedCollection?.name ? `Collection: ${selectedCollection.name}` : undefined,
        steps: ["Prepare metadata", "Confirm mint", "Index NFT"],
        activeStep: 0
      });
      const session = await getWalletSession();
      if (!session) {
        hideActionModal();
        return;
      }

      const draft = createQueuedDraft({ id: createDraftId() });
      const metadata = metadataUri
        ? { uri: metadataUri, gatewayUrl: metadataGatewayUrl }
        : await pinMetadataForDraft(draft);
      updateActionModal({
        message: "Metadata is ready. Confirm the mint transaction in your wallet.",
        activeStep: 1
      });
      setMetadataUri(metadata.uri);
      setMetadataGatewayUrl(metadata.gatewayUrl);

      const result = await mintDraft(draft, session, metadata.uri);
      updateActionModal({
        message: "Mint confirmed on Reef. Finalizing the item in your collection.",
        activeStep: 2
      });
      setStatus("NFT minted successfully.");
      refreshMarket();
      updateActionModal({
        tone: "success",
        message: `${draft.name || "NFT"} is now live in ${selectedCollection?.name ?? "your collection"}.`,
        activeStep: 2
      });
      await sleepMs(700);
      hideActionModal();
      navigate(`/item/reef/${result.contractAddress}/${result.tokenId}`);
    } catch (error) {
      updateActionModal({
        tone: "error",
        message: error instanceof Error ? error.message : "Mint failed.",
        detail: "Your NFT was not minted. You can adjust the form and try again.",
        activeStep: 1
      });
      await sleepMs(1100);
      hideActionModal();
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
      showActionModal({
        title: "Minting queue",
        message: `Preparing ${mintQueue.length} NFT${mintQueue.length === 1 ? "" : "s"} for ${selectedCollection?.name ?? "your collection"}.`,
        detail: "You may see one or more wallet confirmations depending on the collection standard.",
        steps: ["Prepare queue", "Mint on Reef", "Refresh collection"],
        activeStep: 0
      });
      const session = await getWalletSession();
      if (!session) {
        hideActionModal();
        return;
      }

      let mintedCount = 0;
      updateActionModal({
        activeStep: 1,
        message: `Minting ${mintQueue.length} NFT${mintQueue.length === 1 ? "" : "s"} on Reef...`
      });
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
      updateActionModal({
        tone: "success",
        activeStep: 2,
        message: `Minted ${mintedCount} NFT${mintedCount === 1 ? "" : "s"} into ${selectedCollection?.name ?? "your collection"}.`
      });
      await sleepMs(800);
      hideActionModal();
      setStatus(`Minted ${mintedCount} NFT${mintedCount === 1 ? "" : "s"} into ${selectedCollection?.name ?? "your collection"}.`);
    } catch (error) {
      updateActionModal({
        tone: "error",
        activeStep: 1,
        message: error instanceof Error ? error.message : "Batch mint failed.",
        detail: "Some queue items may still be pending or failed. Review the queue and try again."
      });
      await sleepMs(1200);
      hideActionModal();
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
                        <div className="creatorCollectionPickerSurface" ref={collectionPickerRef}>
                          <span className="creatorCollectionPickerLabel">Select collection</span>
                          <button
                            className={collectionPickerOpen ? "creatorCollectionTrigger open" : "creatorCollectionTrigger"}
                            type="button"
                            onClick={() => setCollectionPickerOpen((current) => !current)}
                            aria-haspopup="listbox"
                            aria-expanded={collectionPickerOpen}
                          >
                            {selectedCollection ? (
                              <>
                                <img
                                  className="creatorCollectionTriggerAvatar"
                                  src={creatorCollectionArtworkPreview(selectedCollection)}
                                  alt={selectedCollection.name}
                                  onError={(event) =>
                                    applyImageFallback(
                                      event.currentTarget,
                                      selectedCollection.symbol || selectedCollection.name
                                    )
                                  }
                                />
                                <span className="creatorCollectionTriggerBody">
                                  <strong>{selectedCollection.name}</strong>
                                  <small>
                                    {selectedCollectionStatus}
                                    {selectedCollection.contractReady === false ? " • Redeploy required" : ""}
                                  </small>
                                </span>
                              </>
                            ) : (
                              <span className="creatorCollectionTriggerPlaceholder">
                                Choose a collection to mint into
                              </span>
                            )}
                            <Icon
                              icon="chevron-down"
                              className={collectionPickerOpen ? "microIcon creatorCollectionTriggerChevron open" : "microIcon creatorCollectionTriggerChevron"}
                            />
                          </button>
                          {collectionPickerOpen ? (
                            <div className="creatorCollectionMenu" role="listbox" aria-label="Creator collections">
                              {creatorCollectionsState.collections.map((collection) => {
                                const active = collection.slug === selectedCollectionSlug;
                                return (
                                  <button
                                    key={collection.slug}
                                    className={active ? "creatorCollectionMenuOption active" : "creatorCollectionMenuOption"}
                                    type="button"
                                    role="option"
                                    aria-selected={active}
                                    onClick={() => {
                                      setSelectedCollectionSlug(collection.slug);
                                      setCollectionPickerOpen(false);
                                    }}
                                  >
                                    <img
                                      className="creatorCollectionMenuAvatar"
                                      src={creatorCollectionArtworkPreview(collection)}
                                      alt={collection.name}
                                      onError={(event) =>
                                        applyImageFallback(
                                          event.currentTarget,
                                          collection.symbol || collection.name
                                        )
                                      }
                                    />
                                    <span className="creatorCollectionMenuBody">
                                      <strong>{collection.name}</strong>
                                      <small>
                                        {formatCollectionStatus(collection.status)} • {collection.standard} • {collection.chainName}
                                      </small>
                                    </span>
                                    <span className={collection.contractReady === false ? "creatorCollectionMenuState warning" : "creatorCollectionMenuState"}>
                                      {collection.contractReady === false ? "Redeploy" : "Live"}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
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
                            className="creatorCollectionOption active selected"
                            type="button"
                            onClick={() => setSelectedCollectionSlug(collection.slug)}
                          >
                            <img
                              className="creatorCollectionOptionAvatar"
                              src={creatorCollectionArtworkPreview(collection)}
                              alt={collection.name}
                              onError={(event) =>
                                applyImageFallback(
                                  event.currentTarget,
                                  collection.symbol || collection.name
                                )
                              }
                            />
                            <span className="creatorCollectionOptionBody">
                              <strong>{collection.name}</strong>
                              <span>
                                {formatCollectionStatus(collection.status)}
                                {collection.contractAddress ? ` • ${shortenAddress(collection.contractAddress)}` : " • No contract"}
                                {collection.contractReady === false ? " • Unavailable on Reef" : ""}
                              </span>
                              <span className="creatorCollectionOptionMeta">
                                <span>{collection.standard}</span>
                                <span>{collection.chainName}</span>
                              </span>
                              {collection.contractReady === false && collection.contractReason ? (
                                <span>{collection.contractReason}</span>
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                    </>
                  ) : (
                    <AmbientEmptyState
                      compact
                      className="creatorCollectionEmpty"
                      variant="rows"
                      eyebrow="Collections"
                      title="You do not have a creator collection yet"
                      copy="Create a Reef collection first, then mint multiple NFTs into it from this queue."
                      actions={
                        <button className="actionButton secondary" type="button" onClick={() => navigate("/create/collection")}>
                          Create collection
                        </button>
                      }
                    />
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
                  <div className="batchQueueEmpty" role="status" aria-live="polite">
                    <span className="batchQueueEmptyIcon">
                      <Icon icon="view-grid" />
                    </span>
                    <strong>No queued NFTs yet</strong>
                    <p>Upload files or add the current draft to mint several NFTs into this collection in one pass.</p>
                  </div>
                ) : (
                  <div className="batchQueueList">
                    {mintQueue.map((draft, index) => (
                      <article
                        key={draft.id}
                        className={`batchQueueItem batchQueueItem--${draft.status}`}
                      >
                        <img
                          src={assetUrl(previewForDraft(draft))}
                          alt={draft.name}
                          className="batchQueueThumb"
                          onError={(event) => applyImageFallback(event.currentTarget, draft.name || "Reef")}
                        />
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
                <label
                  className={`nftUploadFrame${nftDragActive ? " dragging" : ""}`}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setNftDragActive(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setNftDragActive(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setNftDragActive(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setNftDragActive(false);
                    const file = event.dataTransfer.files?.[0];
                    if (file) {
                      void readNftImageFile(file).catch((error) => {
                        setStatus(error instanceof Error ? error.message : "Failed to load NFT image.");
                      });
                    }
                  }}
                >
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
                  {form.imageUrl.trim() ? (
                    <img
                      className="nftUploadPreview"
                      src={assetUrl(form.imageUrl.trim())}
                      alt={form.name || "NFT upload preview"}
                      onError={(event) => applyImageFallback(event.currentTarget, form.name || "Reef")}
                    />
                  ) : (
                    <div className="nftUploadEmpty">
                      <div className="nftUploadGlyph">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 16V6" />
                          <path d="m8.5 9.5 3.5-3.5 3.5 3.5" />
                          <path d="M6 18h12" />
                        </svg>
                      </div>
                      <strong>Upload NFT image</strong>
                      <span>Click to upload or drag and drop. Leave it blank if you want to inherit the collection artwork.</span>
                    </div>
                  )}
                </label>
                <input
                  className="textInput"
                  value={form.imageUrl}
                  onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
                  placeholder="Leave blank to inherit the collection artwork automatically"
                />
                <div className="adminToolbar">
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

            <div className="fieldGroup">
              <TraitBuilder
                rows={traitRows}
                rawJson={form.traitsJson}
                rawError={traitsJsonError}
                showRawEditor={showRawTraitsEditor}
                onToggleRawEditor={() => setShowRawTraitsEditor((current) => !current)}
                onAddTrait={addTraitRow}
                onUpdateTrait={updateTraitRow}
                onRemoveTrait={removeTraitRow}
                onRawJsonChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    traitsJson: value
                  }))
                }
              />
            </div>

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
            <div className="createPreviewStage">
              <div className="createPreviewBackdrop" />
              {!previewImageFailed ? (
                <img
                  className="createPreviewImage"
                  src={assetUrl(previewImage)}
                  alt={form.name || "NFT preview"}
                  onError={(event) => {
                    applyImageFallback(event.currentTarget, form.name || selectedCollection?.name || "Reef");
                    setPreviewImageFailed(true);
                  }}
                />
              ) : (
                <div className="createPreviewFallback">
                  <img
                    className="createPreviewFallbackImage"
                    src={creatorCollectionArtworkPreview(selectedCollection)}
                    alt={selectedCollection?.name || "Collection artwork"}
                    onError={(event) =>
                      applyImageFallback(event.currentTarget, selectedCollection?.name || "Reef")
                    }
                  />
                  <div className="createPreviewFallbackCopy">
                    <span className="createPreviewEyebrow">Preview ready</span>
                    <strong>{form.name || "Untitled NFT"}</strong>
                    <p>{form.imageUrl.trim() ? "Showing a safe fallback while your upload refreshes." : "Using the selected collection artwork for this NFT."}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="createPreviewBody">
              <span className="createPreviewEyebrow">
                {form.imageUrl.trim() ? "Custom artwork" : "Collection artwork fallback"}
              </span>
              <strong>{form.name || "Untitled NFT"}</strong>
              <p>{form.description || "Add a description to preview your metadata."}</p>
              {previewTraitChips.length ? (
                <div className="createPreviewTraits">
                  {previewTraitChips.map((trait) => (
                    <span
                      key={`${trait.trait_type}:${trait.value}`}
                      className="createPreviewTraitChip"
                    >
                      <strong>{trait.trait_type || "Trait"}</strong>
                      <span>{trait.value || "Value"}</span>
                    </span>
                  ))}
                </div>
              ) : null}
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
  const {
    account,
    authToken,
    bootstrap,
    connectWallet,
    getWalletSession,
    hideActionModal,
    setStatus,
    showActionModal,
    updateActionModal,
    refreshMarket
  } = useMarketplace();
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
  const deploymentEngineLabel =
    creatorCapability.mode === "fallback" ? "Deployment Engine" : "Active Factory";
  const deploymentEngineValue =
    creatorCapability.mode === "fallback"
      ? "Relayed direct deploy"
      : creatorCapability.factoryAddress
        ? shortenAddress(creatorCapability.factoryAddress)
        : "Not deployed";
  const deploymentPathValue =
    creatorCapability.mode === "official"
      ? "Official OpenSea"
      : creatorCapability.mode === "fallback"
        ? "Reef Fallback"
        : "Blocked";
  const marketplacePathValue = marketplaceCapability.enabled
    ? marketplaceCapability.address
      ? shortenAddress(marketplaceCapability.address)
      : "Enabled"
    : "Blocked";
  const seaportStatusValue = seaportReady
    ? shortenAddress(bootstrap.config.contracts.official.seaport.address)
    : "Unavailable";
  const marketplaceModeTone = marketplaceCapability.enabled ? marketplaceCapability.mode : "blocked";
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
    }, uploadRequestTimeoutMs);

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
    }, uploadRequestTimeoutMs);

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
    }, mutationRequestTimeoutMs);
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
      showActionModal({
        title: "Creating collection",
        message: "Preparing collection artwork and contract metadata.",
        detail: form.name.trim() ? `Collection: ${form.name.trim()}` : undefined,
        steps: ["Prepare collection", "Deploy contract", "Confirm on Reef", "Open mint workspace"],
        activeStep: 0
      });
      const session = await getWalletSession();
      if (!session) {
        hideActionModal();
        return;
      }

      ownerAddress = session.address;
      collectionImage = await ensureCollectionImageReference();
      contractUri = await ensureContractMetadataUri(session.address, collectionImage);
      updateActionModal({
        activeStep: 1,
        message: "Collection metadata is ready. Deploying the contract now."
      });

      if (!creatorPublishReady) {
        const result = await persistCollectionRecord({
          ownerAddress: session.address,
          contractUri,
          avatarUrl: collectionImage.displayImage,
          status: "gated",
          deploymentMode: "blocked",
          marketplaceMode: marketplaceCapability.mode
        });
        updateActionModal({
          tone: "error",
          activeStep: 1,
          message: `Collection saved, but publishing is unavailable: ${publishBlocker}`,
          detail: "You can revisit this draft from your created collections once the Reef deployment path is ready."
        });
        await sleepMs(1100);
        hideActionModal();
        setStatus(`Collection saved, but contract publish is blocked: ${publishBlocker}`);
        refreshMarket();
        navigate(`/profile/${session.address}?tab=created&collection=${result.slug}`);
        return;
      }

      let deployedAddress = "";
      let tx;
      const normalizedSymbol = form.symbol.trim().toUpperCase();
      const royaltyBps = Number(form.royaltyBps || "0");
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
        const txRequest = await buildContractWriteRequest(
          creatorFactory,
          "createCollection",
          [
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
            salt
          ],
          session,
          bootstrap.config,
          "collection"
        );
        tx = await session.signer.sendTransaction(txRequest);
      } else {
        if (!resolvedAuthToken) {
          throw new Error("Wallet session is not authenticated.");
        }
        setStatus(
          form.standard === "ERC1155"
            ? "Publishing ERC1155 collection through the Reef relayer..."
            : "Publishing ERC721 collection through the Reef relayer..."
        );
        updateActionModal({
          activeStep: 1,
          message:
            form.standard === "ERC1155"
              ? "Publishing your ERC1155 collection through the Reef relay."
              : "Publishing your ERC721 collection through the Reef relay."
        });

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
        }, deployRequestTimeoutMs);

        updateActionModal({
          tone: "success",
          activeStep: 3,
          message: `${form.name.trim()} is deployed and ready for minting.`,
          detail: `Contract: ${shortenAddress(deployed.contractAddress)}`
        });
        await sleepMs(750);
        hideActionModal();
        setStatus(`Collection contract deployed on Reef via ${deployed.deploymentMode}. Add NFTs to the mint queue next.`);
        refreshMarket();
        navigate(`/create${buildQuery({ collection: deployed.slug, batch: "1", fresh: "1" })}`);
        return;
      }

      setStatus("Waiting for Reef to confirm the collection transaction...");
      updateActionModal({
        activeStep: 2,
        message: "Transaction submitted. Waiting for Reef to confirm the deployed contract."
      });
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
      updateActionModal({
        tone: "success",
        activeStep: 3,
        message: `${form.name.trim()} is deployed and ready for minting.`,
        detail: `Contract: ${shortenAddress(deployedAddress)}`
      });
      await sleepMs(750);
      hideActionModal();
      setStatus(`Collection contract deployed on Reef via ${creatorCapability.mode}. Add NFTs to the mint queue next.`);
      refreshMarket();
      navigate(`/create${buildQuery({ collection: result.slug, batch: "1", fresh: "1" })}`);
    } catch (error) {
      const normalizedErrorMessage = normalizeReefRelayErrorMessage(
        error instanceof Error ? error.message : "Failed to create collection."
      );
      updateActionModal({
        tone: "error",
        activeStep: 1,
        message: normalizedErrorMessage,
        detail: "Your draft was kept locally so you can try again without losing the collection setup."
      });
      if (ownerAddress && contractUri) {
        void persistCollectionRecord({
          ownerAddress,
          contractUri,
          avatarUrl: collectionImage?.displayImage,
          status: "draft"
        }).catch(() => null);
      }
      await sleepMs(1200);
      hideActionModal();
      setStatus(normalizedErrorMessage);
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
                <div className="contractStackIntro">
                  <span className="contractStackEyebrow">Publishing runtime</span>
                  <strong>Reef Marketplace Stack</strong>
                  <p>
                    Your collection will use the active Reef creator route below, with marketplace support and Seaport availability called out separately.
                  </p>
                </div>
                <span className={`contractStatusPill${creatorPublishReady ? " live" : " blocked"}`}>
                  {deploymentModeLabel}
                </span>
              </div>
              <div className="contractStackGrid">
                <article className="contractStackCard">
                  <span className="contractStackLabel">{deploymentEngineLabel}</span>
                  <strong>{deploymentEngineValue}</strong>
                  <small>
                    {creatorCapability.mode === "fallback"
                      ? "The API relays deployment for this collection path."
                      : "Official factory routing is available for this collection standard."}
                  </small>
                </article>

                <article className="contractStackCard">
                  <span className="contractStackLabel">Deployment Path</span>
                  <strong>{deploymentPathValue}</strong>
                  <small>
                    {creatorCapability.mode === "fallback"
                      ? "Fastest route for creator publishing on the current Reef runtime."
                      : creatorCapability.mode === "official"
                        ? "Wallet-native OpenSea-compatible publishing path."
                        : "Publishing is currently blocked for this setup."}
                  </small>
                </article>

                <article className="contractStackCard">
                  <div className="contractStackCardTopline">
                    <span className="contractStackLabel">Marketplace Path</span>
                    <span className={`contractStackModePill ${marketplaceModeTone}`}>
                      {marketplaceCapability.enabled ? marketplaceCapability.mode : "blocked"}
                    </span>
                  </div>
                  <strong>{marketplacePathValue}</strong>
                  <small>
                    {marketplaceCapability.enabled
                      ? "Listings and sales route through the active marketplace capability."
                      : "Marketplace support is not active for this collection standard."}
                  </small>
                </article>

                <article className="contractStackCard">
                  <div className="contractStackCardTopline">
                    <span className="contractStackLabel">Official Seaport</span>
                    <span className={`contractStackModePill ${seaportReady ? "official" : "blocked"}`}>
                      {seaportReady ? "verified" : "offline"}
                    </span>
                  </div>
                  <strong>{seaportStatusValue}</strong>
                  <small>
                    {seaportReady
                      ? "Canonical Seaport deployment is available for this environment."
                      : "Creator publishing will use the Reef-native path until Seaport is reachable."}
                  </small>
                </article>
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
  const previewTitle = form.name.trim() || "Reef Genesis Mint";
  const previewCreator = form.creatorName.trim() || "Reef Team";
  const previewDescription =
    form.description.trim() || "Set the cover, timing, supply, and price. The public drops card updates live as you shape the launch.";
  const previewStage = form.stage.charAt(0).toUpperCase() + form.stage.slice(1);
  const previewCover = assetUrl(
    form.coverUrl.trim() ||
      buildDropPosterArtwork(previewTitle, previewCreator, form.stage, {
        showStageBadge: false,
        showVisibilityLabel: false,
        showFooterNote: false
      })
  );

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
    <div className="darkPage createDropPage">
      <section className="dropCreateShell">
        <div className="dropCreateHero">
          <div className="dropCreateLead">
            <span className="metaLabel">Reef Studio</span>
            <h1>Create a drop with a real launch presence</h1>
            <p>
              Shape the cover, timing, price, and stage here. The preview updates live and published drops appear on the public Drops page immediately.
            </p>
            <div className="dropCreateMetaGrid">
              <div className="dropCreateMetaCard">
                <span>Admin wallet</span>
                <strong>{shortenAddress(account)}</strong>
              </div>
              <div className="dropCreateMetaCard">
                <span>Visibility</span>
                <strong>Public Drops</strong>
              </div>
              <div className="dropCreateMetaCard">
                <span>Default stage</span>
                <strong>{previewStage}</strong>
              </div>
            </div>
          </div>

          <aside className="dropCreateGuide">
            <span className="metaLabel">After publishing</span>
            <h2>What happens next</h2>
            <div className="dropCreateTimeline">
              <div className="dropCreateTimelineItem">
                <strong>1. Written to admin storage</strong>
                <p>The drop is saved to the same source the public marketplace and studio surfaces read from.</p>
              </div>
              <div className="dropCreateTimelineItem">
                <strong>2. Appears on /drops</strong>
                <p>The selected stage controls whether it shows up as draft, upcoming, live, or ended.</p>
              </div>
              <div className="dropCreateTimelineItem">
                <strong>3. Editable later</strong>
                <p>You can still revisit the full admin panel to adjust or archive the drop after launch.</p>
              </div>
            </div>
          </aside>
        </div>

        <div className="dropCreateWorkspace">
          <div className="dropCreatePreviewColumn">
            <div className="dropPreviewPoster">
              <img
                className="dropPreviewImage"
                src={previewCover}
                alt={previewTitle}
                onError={(event) =>
                  applyDropImageFallback(event.currentTarget, previewTitle, previewCreator, form.stage, {
                    showStageBadge: false,
                    showVisibilityLabel: false,
                    showFooterNote: false
                  })
                }
              />
              <div className="dropPreviewOverlay">
                <div className="dropPreviewTop">
                  <span className={`dropPreviewStage stage-${form.stage}`}>{previewStage}</span>
                  <span className="dropPreviewVisibility">Public Drops</span>
                </div>
                <div className="dropPreviewCopy">
                  <span className="dropPreviewEyebrow">Live launch preview</span>
                  <h2>{previewTitle}</h2>
                  <p>By {previewCreator}</p>
                  <div className="dropPreviewMetricGlass">
                    <div className="dropPreviewMetric">
                      <span>Mint price</span>
                      <strong>{form.mintPrice || "0 REEF"}</strong>
                    </div>
                    <div className="dropPreviewMetric">
                      <span>Supply</span>
                      <strong>{form.supply || "0"}</strong>
                    </div>
                    <div className="dropPreviewMetric">
                      <span>Start</span>
                      <strong>{form.startLabel || "TBD"}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="dropPreviewNotes">
              <span className="metaLabel">Launch card copy</span>
              <p>{previewDescription}</p>
            </div>
          </div>

          <div className="dropCreateFormColumn">
            <form className="adminForm dropCreateForm" onSubmit={submitDrop}>
              <div className="dropFormSection">
                <div className="dropFormSectionHead">
                  <span>Basics</span>
                  <h3>Drop identity</h3>
                  <p>This is the title, creator, and artwork collectors will recognize in the public feed.</p>
                </div>
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
                </div>
              </div>

              <div className="dropFormSection">
                <div className="dropFormSectionHead">
                  <span>Launch settings</span>
                  <h3>Stage, price, and supply</h3>
                  <p>Use these values to control how the drop is framed across Studio and the public Drops route.</p>
                </div>
                <div className="fieldGrid">
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
              </div>

              <div className="dropFormSection">
                <div className="dropFormSectionHead">
                  <span>Story</span>
                  <h3>Description</h3>
                  <p>Give collectors a short, clear reason to care about the launch.</p>
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
              </div>

              <div className="dropCreateActions">
                <button className="actionButton muted" type="button" onClick={() => navigate("/studio")}>
                  Back to Studio
                </button>
                <button className="primaryCta" type="submit" disabled={submitting}>
                  {submitting ? "Creating drop..." : "Publish Drop"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

function SupportPage() {
  const { bootstrap, account } = useMarketplace();
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
        <button className="taskCard dark studioActionCard" type="button" onClick={() => navigate(account ? `/profile/${account}?tab=portfolio` : "/profile")}>
          <span className="metaLabel">Portfolio</span>
          <h3>Open collector profile</h3>
          <p>View wallet holdings, profile tabs, and your live Reef portfolio from one place.</p>
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
  const rarityMinParam = params.get("rarityMin") ?? "";
  const rarityMaxParam = params.get("rarityMax") ?? "";
  const minPriceParam = params.get("minPrice") ?? "";
  const maxPriceParam = params.get("maxPrice") ?? "";
  const marketplaceParam = params.get("marketplace") ?? "";
  const { bootstrap, setStatus, account, connectWallet, refreshNonce } = useMarketplace();
  const state = useRemoteData<CollectionResponse>(slug ? `/dataset/collection/${slug}` : null, refreshNonce);
  const [collectionChromeCompact, setCollectionChromeCompact] = useState(false);
  const [collectionRarityOpen, setCollectionRarityOpen] = useState(true);
  const [collectionPriceOpen, setCollectionPriceOpen] = useState(true);
  const [collectionMarketplacesOpen, setCollectionMarketplacesOpen] = useState(true);
  const [rarityMinDraft, setRarityMinDraft] = useState(rarityMinParam);
  const [rarityMaxDraft, setRarityMaxDraft] = useState(rarityMaxParam);
  const [minPriceDraft, setMinPriceDraft] = useState(minPriceParam);
  const [maxPriceDraft, setMaxPriceDraft] = useState(maxPriceParam);

  useEffect(() => {
    if (!slug) {
      return undefined;
    }

    const syncCollectionChrome = () => {
      setCollectionChromeCompact(window.scrollY > 236);
    };

    syncCollectionChrome();
    window.addEventListener("scroll", syncCollectionChrome, { passive: true });
    return () => window.removeEventListener("scroll", syncCollectionChrome);
  }, [slug]);

  useEffect(() => {
    setRarityMinDraft(rarityMinParam);
  }, [rarityMinParam]);

  useEffect(() => {
    setRarityMaxDraft(rarityMaxParam);
  }, [rarityMaxParam]);

  useEffect(() => {
    setMinPriceDraft(minPriceParam);
  }, [minPriceParam]);

  useEffect(() => {
    setMaxPriceDraft(maxPriceParam);
  }, [maxPriceParam]);

  if (!slug) {
    return <PageState message="Missing collection slug." />;
  }

  return (
    <DataState state={state}>
      {(data) => {
        const collectionRailCollapsed = params.get("collectionRail") === "collapsed";
        const statusFilter = params.get("status") ?? "all";
        const normalizedQuery = query.trim().toLowerCase();
        const accountLower = account.toLowerCase();
        const rarityMin = parseOptionalNumber(rarityMinParam);
        const rarityMax = parseOptionalNumber(rarityMaxParam);
        const minPrice = parseOptionalNumber(minPriceParam);
        const maxPrice = parseOptionalNumber(maxPriceParam);
        const marketplaceEnabled = marketplaceParam === "reef";
        const sortOptions = ["price-low", "price-high", "recent", "token-low"] as const;
        const sortLabelMap: Record<(typeof sortOptions)[number], string> = {
          "price-low": "Price low to high",
          "price-high": "Price high to low",
          recent: "Recently added",
          "token-low": "Token low to high"
        };
        const currentSort =
          sortOptions.find((option) => option === sort) ?? "price-low";
        const cycleCollectionSort = () => {
          const currentIndex = sortOptions.indexOf(currentSort);
          const next = sortOptions[(currentIndex + 1) % sortOptions.length];
          updateParams(params, setParams, { sort: next });
        };
        const traitTypeMap = new Map<string, Set<string>>();

        for (const item of data.items) {
          for (const trait of item.traits) {
            const key = trait.type.trim();
            const values = traitTypeMap.get(key) ?? new Set<string>();
            values.add(trait.value.trim());
            traitTypeMap.set(key, values);
          }
        }

        const traitTypeSummaries = Array.from(traitTypeMap.entries())
          .map(([type, values]) => ({
            type,
            valueCount: values.size
          }))
          .sort((left, right) => right.valueCount - left.valueCount || left.type.localeCompare(right.type));

        const statusOptions = [
          { key: "all", label: "All", count: data.items.length },
          { key: "listed", label: "Listed", count: data.items.filter((item) => item.listed).length },
          { key: "unlisted", label: "Not Listed", count: data.items.filter((item) => !item.listed).length },
          { key: "owned", label: "Owned by you", count: account ? data.items.filter((item) => sameAddress(item.ownerAddress, account)).length : 0 }
        ];
        const applyRarityRange = () => {
          updateParams(params, setParams, {
            rarityMin: rarityMinDraft,
            rarityMax: rarityMaxDraft
          });
        };
        const applyPriceRange = () => {
          updateParams(params, setParams, {
            minPrice: minPriceDraft,
            maxPrice: maxPriceDraft
          });
        };
        const canApplyRarity =
          rarityMinDraft.trim() !== rarityMinParam.trim() ||
          rarityMaxDraft.trim() !== rarityMaxParam.trim();
        const canApplyPrice =
          minPriceDraft.trim() !== minPriceParam.trim() ||
          maxPriceDraft.trim() !== maxPriceParam.trim();
        const matchesQuery = (item: ItemRecord) => {
          if (!normalizedQuery) {
            return true;
          }
          return [
            item.name,
            item.description,
            ...item.traits.flatMap((trait) => [trait.type, trait.value])
          ].some((value) => value.toLowerCase().includes(normalizedQuery));
        };
        const matchesStatus = (item: ItemRecord) => {
          switch (statusFilter) {
            case "listed":
              return item.listed;
            case "unlisted":
              return !item.listed;
            case "owned":
              return Boolean(account) && item.ownerAddress.toLowerCase() === accountLower;
            default:
              return true;
          }
        };
        const matchesRarity = (item: ItemRecord) => {
          if (rarityMin === null && rarityMax === null) {
            return true;
          }
          const rank = parseRankDisplay(item.rankDisplay);
          if (rank === null) {
            return false;
          }
          if (rarityMin !== null && rank < rarityMin) {
            return false;
          }
          if (rarityMax !== null && rank > rarityMax) {
            return false;
          }
          return true;
        };
        const matchesPrice = (item: ItemRecord) => {
          if (minPrice === null && maxPrice === null) {
            return true;
          }
          if (!item.listed || !item.currentPriceRaw) {
            return false;
          }
          const priceValue = Number(formatEther(item.currentPriceRaw));
          if (!Number.isFinite(priceValue)) {
            return false;
          }
          if (minPrice !== null && priceValue < minPrice) {
            return false;
          }
          if (maxPrice !== null && priceValue > maxPrice) {
            return false;
          }
          return true;
        };
        const matchesMarketplace = (item: ItemRecord) => {
          if (!marketplaceEnabled) {
            return true;
          }
          return item.listed;
        };
        const visibleItems = [...data.items.filter((item) =>
          matchesQuery(item) && matchesStatus(item) && matchesRarity(item) && matchesPrice(item) && matchesMarketplace(item)
        )].sort((left, right) => {
          switch (currentSort) {
            case "price-high":
              return compareBigIntStrings(right.currentPriceRaw || "0", left.currentPriceRaw || "0");
            case "recent":
              return Number(right.tokenId) - Number(left.tokenId);
            case "token-low":
              return Number(left.tokenId) - Number(right.tokenId);
            case "price-low":
            default:
              return compareBigIntStrings(left.currentPriceRaw || "0", right.currentPriceRaw || "0");
          }
        });
        const normalizedPrimaryAction = data.collection.actionBar.primary.trim().toLowerCase();
        const normalizedTertiaryAction = data.collection.actionBar.tertiary.trim().toLowerCase();
        const floorItem = visibleItems
          .filter((item) => item.listed)
          .sort((left, right) => BigInt(left.currentPriceRaw) < BigInt(right.currentPriceRaw) ? -1 : 1)[0];
        const ownedUnlistedItem =
          account
            ? visibleItems.find(
                (item) =>
                  item.ownerAddress.toLowerCase() === account.toLowerCase() &&
                  !item.listed
              )
            : null;
        const collectionHeroStyle = {
          "--collection-hero-image": `url("${assetUrl(data.collection.avatarUrl || data.collection.hero.backgroundUrl)}")`
        } as CSSProperties;
        const collectionPageStyle = {
          ...themeStyle(data.collection.theme),
          ...collectionHeroStyle
        } as CSSProperties;
        const openCreateNft = () => {
          navigate(`/create${buildQuery({ collection: data.collection.slug })}`);
        };
        const handleStickyTertiaryAction = () => {
          if (normalizedTertiaryAction === "activity") {
            navigate(`/collection/${slug}/activity`);
            return;
          }
          if (normalizedTertiaryAction === "holders") {
            navigate(`/collection/${slug}/holders`);
            return;
          }
          updateParams(params, setParams, { sort: "price-low" });
        };
        const handleStickyPrimaryAction = () => {
          if (normalizedPrimaryAction === "create nft" || normalizedPrimaryAction === "mint nft") {
            openCreateNft();
            return;
          }
          if (normalizedPrimaryAction === "buy floor") {
            if (floorItem) {
              navigate(`/item/reef/${floorItem.contractAddress}/${floorItem.tokenId}`);
              return;
            }
            setStatus("No floor listing is available in this collection right now.");
            return;
          }
          if (normalizedPrimaryAction === "list item") {
            if (!account) {
              void connectWallet();
              return;
            }
            if (ownedUnlistedItem) {
              navigate(`/item/reef/${ownedUnlistedItem.contractAddress}/${ownedUnlistedItem.tokenId}`);
              return;
            }
            if (floorItem) {
              navigate(`/item/reef/${floorItem.contractAddress}/${floorItem.tokenId}`);
              return;
            }
            setStatus("Open one of your NFTs to create a listing.");
            return;
          }
          if (!account) {
            void connectWallet();
            return;
          }
          setStatus(`${data.collection.actionBar.primary} is not wired for this collection yet.`);
        };
        const collectionTabs = bootstrap.config.site.collectionTabs.map((tab) => {
          const active =
            (mode === "items" && tab.label === "Items") ||
            (mode === "explore" && tab.label === "Explore") ||
            (mode === "offers" && tab.label === "Offers") ||
            (mode === "holders" && tab.label === "Holders") ||
            (mode === "traits" && tab.label === "Traits") ||
            (mode === "activity" && tab.label === "Activity") ||
            (mode === "analytics" && tab.label === "Analytics") ||
            (mode === "about" && tab.label === "About");
          return (
            <SurfaceTabLink
              key={tab.label}
              to={tab.hrefPattern.replace(":slug", slug)}
              active={active}
            >
              {tab.label}
            </SurfaceTabLink>
          );
        });
        const collectionToolbar = (
          <div className={collectionRailCollapsed ? "collectionToolbarShell railCollapsed" : "collectionToolbarShell"}>
            {!collectionRailCollapsed ? <div className="collectionToolbarRailSpacer" aria-hidden="true" /> : null}
            <div className="collectionWorkspaceToolbar">
              <div className="collectionWorkspaceToolbarLead">
                <IconChipButton
                  className="collectionRailToggle"
                  type="button"
                  aria-label={collectionRailCollapsed ? "Open filters" : "Collapse filters"}
                  onClick={() => updateParams(params, setParams, { collectionRail: collectionRailCollapsed ? "open" : "collapsed" })}
                >
                  <Icon icon={collectionRailCollapsed ? "chevron-right" : "collapse-left"} />
                </IconChipButton>
                <label className="inlineSearch collectionInlineSearch">
                  <Icon icon="search" />
                  <input
                    value={query}
                    onChange={(event) => updateParams(params, setParams, { q: event.target.value })}
                    placeholder="Search by item or trait"
                  />
                </label>
                <span className="collectionToolbarCount">{visibleItems.length.toLocaleString()} ITEMS</span>
              </div>

              <div className="collectionWorkspaceTools">
                <IconChipButton onClick={cycleCollectionSort}>
                  {sortLabelMap[currentSort]}
                  <Icon icon="chevron-right" className="microIcon" />
                </IconChipButton>
                <IconChipButton active><Icon icon="view-grid" /></IconChipButton>
                <IconChipButton><Icon icon="view-columns" /></IconChipButton>
                <IconChipButton><Icon icon="list" /></IconChipButton>
                <IconChipButton><Icon icon="settings" /></IconChipButton>
                <IconChipButton><Icon icon="chart" /> Insights</IconChipButton>
              </div>
            </div>
          </div>
        );

        return (
          <div
            className={collectionChromeCompact ? "darkPage collectionPage collectionPageScrolled" : "darkPage collectionPage"}
            style={collectionPageStyle}
          >
            <section className="collectionHeroSurface">
              <div className="collectionHeroBackdrop" aria-hidden="true" />
              <div className="collectionHeroOverlay">
                <div className="collectionIdentityBlock">
                  <img className="collectionAvatarLarge" src={assetUrl(data.collection.avatarUrl)} alt={data.collection.name} />
                  <div>
                    <div className="collectionTitleRow">
                      <h1>{data.collection.name}</h1>
                      {data.collection.verified ? <OpenSeaBadge className="verifiedBadge" /> : null}
                      <GhostIconButton><Icon icon="star" /></GhostIconButton>
                      <GhostIconButton><Icon icon="globe" /></GhostIconButton>
                      <GhostIconButton><Icon icon="x" /></GhostIconButton>
                      <GhostIconButton><Icon icon="share" /></GhostIconButton>
                      <GhostIconButton><Icon icon="more" /></GhostIconButton>
                    </div>
                    <div className="badgeRow">
                      <HeroBadgePill>BY {data.collection.hero.subtitle.replace(/^By\s+/i, "").toUpperCase()}</HeroBadgePill>
                      {data.collection.hero.badges.map((badge) => (
                        <HeroBadgePill key={badge}>{badge}</HeroBadgePill>
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
                  <GhostIconButton className="enlarge"><Icon icon="view-columns" /></GhostIconButton>
                </div>
              </div>
            </section>

            <div className="collectionScrollChrome">
              <div className="collectionScrollHeader">
                <div className="collectionScrollHeaderInner">
                  <div className="collectionStickyIdentity">
                    <img
                      className="collectionStickyAvatar"
                      src={assetUrl(data.collection.avatarUrl || data.collection.hero.backgroundUrl)}
                      alt={data.collection.name}
                    />
                    <div className="collectionStickyIdentityCopy">
                      <div className="collectionStickyTitleRow">
                        <h2>{data.collection.name}</h2>
                        {data.collection.verified ? <OpenSeaBadge className="verifiedBadge small" /> : null}
                        <div className="collectionStickyActions">
                          <GhostIconButton><Icon icon="star" /></GhostIconButton>
                          <GhostIconButton><Icon icon="copy" /></GhostIconButton>
                          <GhostIconButton><Icon icon="globe" /></GhostIconButton>
                          <GhostIconButton><Icon icon="x" /></GhostIconButton>
                          <GhostIconButton><Icon icon="share" /></GhostIconButton>
                          <GhostIconButton><Icon icon="more" /></GhostIconButton>
                        </div>
                      </div>
                      <div className="badgeRow collectionStickyBadgeRow">
                        <HeroBadgePill>BY {data.collection.hero.subtitle.replace(/^By\s+/i, "").toUpperCase()}</HeroBadgePill>
                        {data.collection.hero.badges.map((badge) => (
                          <HeroBadgePill key={badge}>{badge}</HeroBadgePill>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="heroMetricRail collectionStickyMetrics">
                    {data.collection.hero.metrics.map((metric) => (
                      <article key={metric.label}>
                        <span>{metric.label}</span>
                        <strong>{metric.value}</strong>
                      </article>
                    ))}
                    <GhostIconButton className="enlarge"><Icon icon="view-columns" /></GhostIconButton>
                  </div>
                </div>
              </div>

              <div className="tabBar collectionTabBar">
                {collectionTabs}
              </div>

              {collectionToolbar}
            </div>

            <div className={collectionRailCollapsed ? "collectionWorkspaceLayout railCollapsed" : "collectionWorkspaceLayout"}>
              {!collectionRailCollapsed ? (
                <aside className="collectionFilterRail">
                  <section className="profileFilterSection collectionFilterStatusSection">
                    <div className="profileFilterHeadingRow">
                      <strong>Status</strong>
                      <Icon icon="chevron-down" className="profileFilterChevron open" />
                    </div>
                    <div className="profileFilterChipGrid">
                      {statusOptions.map((option) => (
                        <FilterChipButton
                          key={option.key}
                          active={statusFilter === option.key}
                          onClick={() => updateParams(params, setParams, { status: option.key })}
                        >
                          {option.label}
                        </FilterChipButton>
                      ))}
                    </div>
                  </section>

                  <section className="profileFilterSection collectionFilterCompactSection">
                    <button
                      className="profileFilterHeadingButton collectionFilterHeadingButton"
                      type="button"
                      onClick={() => setCollectionRarityOpen((current) => !current)}
                    >
                      <strong>Rarity</strong>
                      <Icon
                        icon="chevron-down"
                        className={collectionRarityOpen ? "microIcon profileFilterChevron open" : "microIcon profileFilterChevron"}
                      />
                    </button>
                    {collectionRarityOpen ? (
                      <div className="profileFilterSectionBody collectionFilterSectionBody">
                        <div className="collectionFilterRangeInputs">
                          <input
                            className="collectionFilterInput"
                            value={rarityMinDraft}
                            onChange={(event) => setRarityMinDraft(event.target.value)}
                            inputMode="numeric"
                            placeholder="Min"
                          />
                          <span className="collectionFilterRangeDivider">to</span>
                          <input
                            className="collectionFilterInput"
                            value={rarityMaxDraft}
                            onChange={(event) => setRarityMaxDraft(event.target.value)}
                            inputMode="numeric"
                            placeholder="Max"
                          />
                        </div>
                        <button
                          className="collectionFilterApplyButton"
                          type="button"
                          onClick={applyRarityRange}
                          disabled={!canApplyRarity}
                        >
                          Apply
                        </button>
                      </div>
                    ) : null}
                  </section>

                  <section className="profileFilterSection collectionFilterCompactSection">
                    <button
                      className="profileFilterHeadingButton collectionFilterHeadingButton"
                      type="button"
                      onClick={() => setCollectionPriceOpen((current) => !current)}
                    >
                      <strong>Price</strong>
                      <Icon
                        icon="chevron-down"
                        className={collectionPriceOpen ? "microIcon profileFilterChevron open" : "microIcon profileFilterChevron"}
                      />
                    </button>
                    {collectionPriceOpen ? (
                      <div className="profileFilterSectionBody collectionFilterSectionBody">
                        <label className="collectionFilterSelectWrap">
                          <select
                            className="collectionFilterSelectButton"
                            value={bootstrap.config.network.nativeCurrency.symbol}
                            onChange={() => undefined}
                            aria-label="Price currency"
                          >
                            <option value={bootstrap.config.network.nativeCurrency.symbol}>
                              {bootstrap.config.network.nativeCurrency.symbol}
                            </option>
                          </select>
                          <Icon icon="chevron-down" className="microIcon collectionFilterSelectIcon" />
                        </label>
                        <div className="collectionFilterRangeInputs">
                          <input
                            className="collectionFilterInput"
                            value={minPriceDraft}
                            onChange={(event) => setMinPriceDraft(event.target.value)}
                            inputMode="decimal"
                            placeholder="Min"
                          />
                          <span className="collectionFilterRangeDivider">to</span>
                          <input
                            className="collectionFilterInput"
                            value={maxPriceDraft}
                            onChange={(event) => setMaxPriceDraft(event.target.value)}
                            inputMode="decimal"
                            placeholder="Max"
                          />
                        </div>
                        <button
                          className="collectionFilterApplyButton"
                          type="button"
                          onClick={applyPriceRange}
                          disabled={!canApplyPrice}
                        >
                          Apply
                        </button>
                      </div>
                    ) : null}
                  </section>

                  <section className="profileFilterSection collectionFilterCompactSection">
                    <button
                      className="profileFilterHeadingButton collectionFilterHeadingButton"
                      type="button"
                      onClick={() => setCollectionMarketplacesOpen((current) => !current)}
                    >
                      <strong>Marketplaces</strong>
                      <Icon
                        icon="chevron-down"
                        className={collectionMarketplacesOpen ? "microIcon profileFilterChevron open" : "microIcon profileFilterChevron"}
                      />
                    </button>
                    {collectionMarketplacesOpen ? (
                      <div className="profileFilterSectionBody collectionFilterSectionBody">
                        <label className="collectionMarketplaceOption">
                          <input
                            type="checkbox"
                            checked={marketplaceEnabled}
                            onChange={(event) =>
                              updateParams(params, setParams, {
                                marketplace: event.target.checked ? "reef" : ""
                              })
                            }
                          />
                          <span className="collectionMarketplaceOptionBar" />
                        </label>
                        <div className="collectionMarketplaceHint">Active Reef marketplace listings</div>
                      </div>
                    ) : null}
                  </section>

                  <section className="profileFilterSection collectionTraitsSection">
                    <div className="profileFilterHeadingRow collectionTraitsHeading">
                      <strong>Traits</strong>
                    </div>
                    <div className="collectionTraitTypeList">
                      {traitTypeSummaries.slice(0, 10).map((trait) => {
                        const active = normalizedQuery === trait.type.toLowerCase();
                        return (
                          <button
                            key={trait.type}
                            className={active ? "collectionTraitTypeButton active" : "collectionTraitTypeButton"}
                            type="button"
                            onClick={() =>
                              updateParams(params, setParams, {
                                q: active ? "" : trait.type
                              })
                            }
                          >
                            <span>{trait.type}</span>
                            <small>{trait.valueCount}</small>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </aside>
              ) : null}

              <div className="collectionWorkspaceMain">
                {(mode === "items" || mode === "explore") ? (
                  visibleItems.length === 0 ? (
                    <section className="pagePanel">
                      <AmbientEmptyState
                        variant="cards"
                        eyebrow="Items"
                        title="No items to display"
                        copy="Mint into this collection and the NFTs will start appearing here."
                      />
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
                      {data.offers.length === 0 ? (
                        <AmbientEmptyState
                          compact
                          variant="rows"
                          eyebrow="Offers"
                          title="No offers to display"
                          copy="Collection offers will appear here once buyers start bidding."
                        />
                      ) : null}
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
                      {data.holders.length === 0 ? (
                        <AmbientEmptyState
                          compact
                          variant="rows"
                          eyebrow="Holders"
                          title="No holders to display"
                          copy="Holder addresses appear here once NFTs from this collection are minted or transferred."
                        />
                      ) : null}
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
                      {data.traitHighlights.length === 0 ? (
                        <AmbientEmptyState
                          compact
                          variant="rows"
                          eyebrow="Traits"
                          title="No traits to display"
                          copy="Trait highlights will appear here once NFTs in this collection include metadata attributes."
                        />
                      ) : null}
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
                      {data.activities.length === 0 ? (
                        <AmbientEmptyState
                          compact
                          variant="rows"
                          eyebrow="Activity"
                          title="No activity yet"
                          copy="Mint, list, sale, and transfer events for this collection will show up here."
                        />
                      ) : null}
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
                      <AmbientEmptyState
                        compact
                        variant="rows"
                        eyebrow="Analytics"
                        title="No analytics to display"
                        copy="As trading and ownership data builds up, this collection will unlock analytics here."
                      />
                    </section>
                  ) : (
                    <div className="analyticsGrid">
                      {data.analytics.map((metric) => (
                        <AnalyticsSparklineCard key={metric.label} metric={metric} />
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
              </div>
            </div>

            {bootstrap.runtime.liveTrading && data.collection.showStickyActionBar ? (
              <div className="stickyActionBar">
                <button className="actionButton secondary" type="button" onClick={() => void connectWallet()}>
                  {account ? "Wallet connected" : "Connect wallet"}
                </button>
                <button className="actionButton secondary" type="button" onClick={handleStickyTertiaryAction}>
                  {data.collection.actionBar.tertiary}
                </button>
                {data.collection.actionBar.quaternary ? (
                  <button className="actionButton muted" type="button">{data.collection.actionBar.quaternary}</button>
                ) : null}
                <button
                  className="actionButton primary"
                  type="button"
                  onClick={handleStickyPrimaryAction}
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
    hideActionModal,
    setStatus,
    showActionModal,
    updateActionModal,
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
  const [traitView, setTraitView] = useState<"grid" | "list">("grid");
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
      showActionModal({
        title: "Creating listing",
        message: "Checking approvals and preparing your listing on Reef.",
        detail: data.item.name,
        steps: ["Check approvals", "Create listing", "Refresh marketplace"],
        activeStep: 0
      });
      const normalizedPrice = priceInput.trim();
      if (!normalizedPrice) {
        throw new Error(`Enter a ${bootstrap.config.network.nativeCurrency.symbol} price to create the listing.`);
      }
      const session = await getWalletSession();
      if (!session) {
        hideActionModal();
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
        updateActionModal({
          activeStep: 0,
          message: "Approve this NFT in your wallet so the marketplace can transfer it when sold."
        });
        const approveRequest = await buildContractWriteRequest(
          collectionContract,
          "approve",
          [marketplaceAddress, BigInt(data.item.tokenId)],
          session,
          bootstrap.config,
          "marketplace"
        );
        const approveTx = await session.signer.sendTransaction(approveRequest);
        await approveTx.wait();
      }

      setStatus("Creating listing on Reef...");
      updateActionModal({
        activeStep: 1,
        message: `Submitting a ${normalizedPrice} ${bootstrap.config.network.nativeCurrency.symbol} listing on Reef.`
      });
      const createRequest = await buildContractWriteRequest(
        marketplaceContract,
        "createListing",
        [data.item.contractAddress, BigInt(data.item.tokenId), parseEther(normalizedPrice)],
        session,
        bootstrap.config,
        "marketplace"
      );
      const createTx = await session.signer.sendTransaction(createRequest);
      await createTx.wait();
      updateActionModal({
        tone: "success",
        activeStep: 2,
        message: `${data.item.name} is now listed for ${normalizedPrice} ${bootstrap.config.network.nativeCurrency.symbol}.`
      });
      await sleepMs(700);
      hideActionModal();
      setStatus("Listing created.");
      setListingComposerOpen(false);
      setListingPriceInput("1");
      refreshMarket();
    } catch (error) {
      updateActionModal({
        tone: "error",
        activeStep: 1,
        message: error instanceof Error ? error.message : "Listing failed",
        detail: "Your NFT is still safe in your wallet. Adjust the price or retry the listing."
      });
      await sleepMs(1100);
      hideActionModal();
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
      showActionModal({
        title: "Cancelling listing",
        message: "Preparing to remove this item from the Reef marketplace.",
        detail: data.item.name,
        steps: ["Confirm cancel", "Cancel listing", "Refresh marketplace"],
        activeStep: 0
      });
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
      updateActionModal({
        activeStep: 1,
        message: "Transaction submitted. Waiting for Reef to remove the listing."
      });
      const cancelRequest = await buildContractWriteRequest(
        marketplaceContract,
        "cancelListing",
        [BigInt(data.item.listingId)],
        session,
        bootstrap.config,
        "marketplace"
      );
      const tx = await session.signer.sendTransaction(cancelRequest);
      await tx.wait();
      updateActionModal({
        tone: "success",
        activeStep: 2,
        message: `${data.item.name} is no longer listed.`
      });
      await sleepMs(700);
      hideActionModal();
      setStatus("Listing cancelled.");
      refreshMarket();
    } catch (error) {
      updateActionModal({
        tone: "error",
        activeStep: 1,
        message: error instanceof Error ? error.message : "Cancellation failed",
        detail: "The listing may still be active. Refresh the item page after retrying."
      });
      await sleepMs(1100);
      hideActionModal();
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
      showActionModal({
        title: "Buying NFT",
        message: "Confirm the purchase in your wallet to settle this listing on Reef.",
        detail: `${data.item.name} • ${data.item.currentPriceDisplay}`,
        steps: ["Confirm purchase", "Settle listing", "Refresh ownership"],
        activeStep: 0
      });
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
      updateActionModal({
        activeStep: 1,
        message: "Purchase submitted. Waiting for Reef to settle the listing."
      });
      const buyRequest = await buildContractWriteRequest(
        marketplaceContract,
        "buyListing",
        [BigInt(data.item.listingId), { value: BigInt(data.item.currentPriceRaw) }],
        session,
        bootstrap.config,
        "marketplace"
      );
      const tx = await session.signer.sendTransaction(buyRequest);
      await tx.wait();
      updateActionModal({
        tone: "success",
        activeStep: 2,
        message: `${data.item.name} is now in your wallet.`
      });
      await sleepMs(700);
      hideActionModal();
      setStatus("Purchase completed.");
      refreshMarket();
    } catch (error) {
      updateActionModal({
        tone: "error",
        activeStep: 1,
        message: error instanceof Error ? error.message : "Purchase failed",
        detail: "The listing was not purchased. You can review the item state and try again."
      });
      await sleepMs(1100);
      hideActionModal();
      setStatus(error instanceof Error ? error.message : "Purchase failed");
    } finally {
      setListingSubmitting(false);
      listingActionLockRef.current = false;
    }
  }

  return (
    <DataState state={state}>
      {(data) => {
        const itemTokenLabel = data.item.tokenId ? `#${data.item.tokenId}` : "";
        const displayTitle =
          itemTokenLabel && !data.item.name.includes(itemTokenLabel)
            ? `${data.item.name} ${itemTokenLabel}`
            : data.item.name;
        const railItems = [
          {
            key: `${data.item.contractAddress}-${data.item.tokenId}`,
            href: `/item/reef/${data.item.contractAddress}/${data.item.tokenId}`,
            imageUrl: data.item.imageUrl,
            label: displayTitle,
            active: true
          },
          ...data.relatedItems
            .filter((entry) => entry.imageUrl)
            .slice(0, 7)
            .map((entry) => ({
              key: `${entry.contractAddress}-${entry.tokenId}`,
              href: `/item/reef/${entry.contractAddress}/${entry.tokenId}`,
              imageUrl: entry.imageUrl,
              label:
                entry.tokenId && !entry.name.includes(`#${entry.tokenId}`)
                  ? `${entry.name} #${entry.tokenId}`
                  : entry.name,
              active: false
            }))
        ];

        return (
          <div className="modalRouteFrame">
            <div className="itemModal">
              <div className="itemModalTopBar">
                <div className="thumbRail">
                  <button className="thumbNav" type="button" onClick={() => navigate(data.backHref)} aria-label="Back to collection">
                    <Icon icon="chevron-left" />
                  </button>
                  {railItems.map((thumb) => (
                    <button
                      key={thumb.key}
                      className={thumb.active ? "thumbButton active" : "thumbButton"}
                      type="button"
                      onClick={() => {
                        if (!thumb.active) {
                          navigate(thumb.href);
                        }
                      }}
                      aria-current={thumb.active ? "page" : undefined}
                      aria-label={thumb.label}
                    >
                      <img src={assetUrl(thumb.imageUrl)} alt={thumb.label} />
                    </button>
                  ))}
                </div>
                <div className="itemModalTopActions">
                  <button className="closeButton" type="button" onClick={() => navigate(data.closeHref)} aria-label="Close item view">
                    <Icon icon="close" />
                  </button>
                </div>
              </div>

              <div className="itemModalBody">
                <div className="mediaColumn">
                  <div className="modalArtworkStage">
                    <img className="modalArtwork" src={assetUrl(data.item.imageUrl)} alt={displayTitle} />
                  </div>
                </div>

                <div className="detailsColumn">
                  <div className="titleCluster">
                    <h1>{displayTitle}</h1>
                      <div className="identityBar">
                        <div className="identityRow itemIdentityMeta">
                          <div className="identityWithAvatar">
                            <img src={assetUrl(data.collection.avatarUrl)} alt={data.collection.name} />
                          <strong>{data.collection.name}</strong>
                          {data.collection.verified ? <OpenSeaBadge className="verifiedBadge small" /> : null}
                        </div>
                        <span className="itemOwnerLabel">{data.ownerLabel}</span>
                        </div>
                        <div className="iconRow compact">
                          <GhostIconButton><Icon icon="globe" /></GhostIconButton>
                          <GhostIconButton><Icon icon="discord" /></GhostIconButton>
                          <GhostIconButton><Icon icon="x" /></GhostIconButton>
                          <CopyFeedbackButton
                            className="ghostIcon"
                            value={`${bootstrap.config.services.webBaseUrl}/item/reef/${contract}/${tokenId}`}
                            label="Item link"
                            ariaLabel="Copy item link"
                            successMessage="Item link copied."
                          />
                          <GhostIconButton><Icon icon="heart" /></GhostIconButton>
                          <GhostIconButton><Icon icon="more" /></GhostIconButton>
                        </div>
                      </div>
                      <div className="badgeRow">
                        {data.metaBadges.map((badge) => (
                          <HeroBadgePill key={badge}>{badge}</HeroBadgePill>
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
                    <DetailTabButton
                      key={tab}
                      active={activeTab === tab}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </DetailTabButton>
                  ))}
                </div>

                {activeTab === "Details" ? (
                  <section className="detailsAccordion detailsAccordionTraits">
                    <div className="accordionHeader">
                      <div className="collectionIdentity">
                        <div className="diamondMarker" />
                        <strong>Traits</strong>
                      </div>
                      <button className="traitCollapseButton" type="button" aria-label="Traits expanded">
                        <Icon icon="chevron-down" className="accordionChevron expanded" />
                      </button>
                    </div>
                    <div className="traitsSectionMeta">
                      <span className="traitsSectionCount">Traits {data.item.traits.length}</span>
                      <div className="traitsViewToggle" aria-label="Trait layout">
                        <button
                          className={traitView === "grid" ? "traitsViewButton active" : "traitsViewButton"}
                          type="button"
                          onClick={() => setTraitView("grid")}
                          aria-pressed={traitView === "grid"}
                          aria-label="Grid view"
                        >
                          <Icon icon="view-grid" />
                        </button>
                        <button
                          className={traitView === "list" ? "traitsViewButton active" : "traitsViewButton"}
                          type="button"
                          onClick={() => setTraitView("list")}
                          aria-pressed={traitView === "list"}
                          aria-label="List view"
                        >
                          <Icon icon="list" />
                        </button>
                      </div>
                    </div>
                    <div className={traitView === "list" ? "traitList list" : "traitList"}>
                      {data.item.traits.length === 0 ? (
                        <AmbientEmptyState
                          compact
                          variant="rows"
                          eyebrow="Traits"
                          title="No traits to display"
                          copy="Add metadata attributes during mint and they will appear here."
                        />
                      ) : null}
                      {data.item.traits.map((trait) => (
                        <article className="traitPill" key={`${trait.type}-${trait.value}`}>
                          <span>{trait.type}</span>
                          <strong>{trait.value}</strong>
                          <div className="traitPillFooter">
                            <span className={`traitStatChip ${trait.tone ?? "neutral"}`}>
                              {formatTraitCount(trait.count ?? 1)} {formatTraitPercent(trait.percent ?? 100)}
                            </span>
                            <small>{trait.floorDisplay ?? data.buyPanel.collectionFloor}</small>
                          </div>
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
                    {data.activity.length === 0 ? (
                      <AmbientEmptyState
                        compact
                        variant="rows"
                        eyebrow="Activity"
                        title="No activity yet"
                        copy="This item’s mint, listing, sale, and transfer history will appear here."
                      />
                    ) : null}
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
        );
      }}
    </DataState>
  );
}

function CreatorPage() {
  const { creator } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { refreshNonce, account, bootstrap, setStatus, currentUser } = useMarketplace();
  const state = useRemoteData<ProfileResponse>(creator ? `/dataset/profile/${creator}` : null, refreshNonce);
  const activeTab = params.get("tab") ?? "items";
  const query = params.get("q") ?? "";
  const view = params.get("view") ?? "grid";
  const statusFilter = params.get("status") ?? "all";
  const collectionFilter = params.get("collection") ?? "all";
  const collectionQuery = params.get("collectionQ") ?? "";
  const profileRailCollapsed = params.get("profileRail") === "collapsed";
  const statusSectionOpen = params.get("statusOpen") !== "closed";
  const chainsSectionOpen = params.get("chainsOpen") !== "closed";
  const collectionsSectionOpen = params.get("collectionsOpen") !== "closed";

  if (!creator) {
    return <PageState message="Missing creator slug." />;
  }

  return (
    <DataState state={state}>
      {(data) => {
        const profileData = normalizeProfileResponse(
          data,
          bootstrap.config.network.nativeCurrency.symbol
        );
        const slugAddressCandidate = profileData.profile.slug.replace(/^wallet-/, "");
        const derivedProfileAddress = [
          creator,
          slugAddressCandidate,
          profileData.items[0]?.ownerAddress,
          profileData.items[0]?.creatorAddress,
          profileData.listings[0]?.ownerAddress,
          profileData.createdCollections[0]?.creatorSlug
        ].find((value): value is string => Boolean(value && value.startsWith("0x")));
        const isOwnProfile = Boolean(derivedProfileAddress && account && sameAddress(account, derivedProfileAddress));
        const addressLabel = derivedProfileAddress
          ? shortenAddress(derivedProfileAddress)
          : profileData.profile.slug.replace(/^wallet-/, "").slice(0, 6).toUpperCase();
        const fetchedProfileName = profileData.profile.name?.trim() || "";
        const ownProfileName = isOwnProfile ? currentUser?.displayName?.trim() || "" : "";
        const preferredProfileName = [fetchedProfileName, ownProfileName].find(
          (value) => Boolean(value && !looksLikeShortWalletLabel(value))
        );
        const profileLabel = preferredProfileName || addressLabel;
        const profileTag = addressLabel;
        const normalizedQuery = query.trim().toLowerCase();
        const normalizedCollectionQuery = collectionQuery.trim().toLowerCase();
        const matchesQuery = (...values: Array<string | undefined>) =>
          !normalizedQuery
            ? true
            : values.some((value) => value?.toLowerCase().includes(normalizedQuery));
        const matchesCollectionQuery = (...values: Array<string | undefined>) =>
          !normalizedCollectionQuery
            ? true
            : values.some((value) => value?.toLowerCase().includes(normalizedCollectionQuery));
        const matchesStatus = (item: ItemRecord) =>
          statusFilter === "all"
            ? true
            : statusFilter === "listed"
              ? item.listed
              : statusFilter === "hidden"
                ? false
                : !item.listed;
        const matchesCollection = (slug: string) => collectionFilter === "all" || collectionFilter === slug;
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
        const visibleGalleries = profileData.galleries.filter((gallery) =>
          matchesQuery(gallery.collectionName, gallery.collectionDescription, gallery.creatorName)
        );
        const visibleItems = profileData.items.filter((item) =>
          matchesQuery(item.name, item.description, item.collectionName) &&
          matchesStatus(item) &&
          matchesCollection(item.collectionSlug)
        );
        const visibleCollections = profileData.createdCollections.filter((collection) =>
          matchesQuery(collection.name, collection.description, collection.creatorName)
        );
        const visibleTokens = profileData.tokens.filter((token) =>
          matchesQuery(token.name, token.symbol, token.chain)
        );
        const visibleListings = profileData.listings.filter((item) =>
          matchesQuery(item.name, item.description, item.collectionName) && matchesCollection(item.collectionSlug)
        );
        const visibleOffers = profileData.offers.filter((offer) =>
          matchesQuery(offer.itemName, offer.collectionName, offer.from, offer.to)
        );
        const visibleActivity = profileData.activity.filter((entry) =>
          matchesQuery(entry.itemName, entry.collectionName, entry.collectionSlug, entry.from, entry.to)
        );
        const sortedGalleries =
          sort === "name"
            ? [...visibleGalleries].sort((left, right) => left.collectionName.localeCompare(right.collectionName))
            : sort === "floor-high"
              ? [...visibleGalleries].sort((left, right) => {
                  const leftCollection = profileData.createdCollections.find((collection) => collection.slug === left.collectionSlug);
                  const rightCollection = profileData.createdCollections.find((collection) => collection.slug === right.collectionSlug);
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
        const usdValue = profileData.portfolio.totalValueDisplay;
        const nftPercent = String(profileData.items.length);
        const tokenPercent = String(profileData.tokens.length);
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
                  ? `${profileData.portfolio.itemCount} ITEMS`
                  : activeTab === "listings"
                    ? `${sortedListings.length} LISTINGS`
                    : activeTab === "offers"
                      ? `${sortedOffers.length} OFFERS`
                      : activeTab === "activity"
                        ? `${sortedActivity.length} EVENTS`
                        : `${sortedItems.length} ITEMS`;
        const showToolbar = activeTab !== "portfolio";
        const showViewControls = ["galleries", "items", "listings"].includes(activeTab);
        const showProfileSidebar = activeTab === "items";
        const filterCollections = profileData.galleries
          .filter((gallery) => matchesCollectionQuery(gallery.collectionName, gallery.creatorName))
          .sort((left, right) => left.collectionName.localeCompare(right.collectionName));
        const itemStatusOptions = [
          { key: "all", label: "All" },
          { key: "listed", label: "Listed" },
          { key: "not-listed", label: "Not Listed" },
          { key: "hidden", label: "Hidden" }
        ];
        const showDefaultToolbar = showToolbar && !showProfileSidebar;

        return (
          <div className="darkPage profilePage">
            <ProfileHero
              profile={profileData.profile}
              profileAddress={derivedProfileAddress ?? profileData.profile.slug}
              profileLabel={profileLabel}
              profileTag={profileTag}
              usdValue={usdValue}
              nftPercent={nftPercent}
              tokenPercent={tokenPercent}
              avatarSrc={isOwnProfile ? currentUser?.avatarUri || profileData.profile.avatarUrl : profileData.profile.avatarUrl}
              titleActions={
                <>
                  <CopyFeedbackButton
                    className="ghostIcon"
                    value={derivedProfileAddress ?? profileData.profile.slug}
                    label="Profile ID"
                    ariaLabel="Copy profile address"
                    successMessage="Profile id copied."
                  />
                  <GhostIconButton aria-label="More actions">
                    <Icon icon="more" />
                  </GhostIconButton>
                </>
              }
              statAction={
                <GhostIconButton className="enlarge" aria-label="Profile actions">
                  <Icon icon="view-columns" />
                </GhostIconButton>
              }
            />

            <ProfileTabBar
              tabs={profileTabs}
              activeTab={activeTab}
              onSelect={(tab) => updateParams(params, setParams, { tab })}
            />

            {showDefaultToolbar ? (
              <div className="collectionToolbar">
                <div className="chipRow">
                  <IconChipButton aria-label="Filters">
                    <Icon icon="filter" />
                  </IconChipButton>
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
                  <IconChipButton onClick={cycleSort}>
                    {sortLabel}
                    <Icon icon="chevron-right" className="microIcon" />
                  </IconChipButton>
                  {showViewControls ? (
                    <>
                      <IconChipButton active={view === "grid"} onClick={() => updateParams(params, setParams, { view: "grid" })}>
                        <Icon icon="view-grid" />
                      </IconChipButton>
                      <IconChipButton active={view === "columns"} onClick={() => updateParams(params, setParams, { view: "columns" })}>
                        <Icon icon="view-columns" />
                      </IconChipButton>
                      <IconChipButton active={view === "grid-alt"} onClick={() => updateParams(params, setParams, { view: "grid-alt" })}>
                        <Icon icon="grid" />
                      </IconChipButton>
                      <IconChipButton active={view === "list"} onClick={() => updateParams(params, setParams, { view: "list" })}>
                        <Icon icon="list" />
                      </IconChipButton>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}

            {showProfileSidebar ? (
              <div className={profileRailCollapsed ? "profileWorkspaceLayout railCollapsed" : "profileWorkspaceLayout"}>
                {!profileRailCollapsed ? (
                  <aside className="profileFilterRail">
                    <section className="profileFilterSection">
                      <button
                        className="profileFilterHeadingButton"
                        type="button"
                        onClick={() => updateParams(params, setParams, { statusOpen: statusSectionOpen ? "closed" : "open" })}
                      >
                        <strong>Status</strong>
                        <Icon
                          icon="chevron-right"
                          className={statusSectionOpen ? "microIcon profileFilterChevron open" : "microIcon profileFilterChevron"}
                        />
                      </button>
                      {statusSectionOpen ? (
                        <div className="profileFilterSectionBody">
                          <div className="profileFilterChipGrid">
                            {itemStatusOptions.map((option) => (
                              <FilterChipButton
                                key={option.key}
                                active={statusFilter === option.key}
                                onClick={() => updateParams(params, setParams, { status: option.key })}
                              >
                                {option.label}
                              </FilterChipButton>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </section>

                    <section className="profileFilterSection">
                      <button
                        className="profileFilterHeadingButton"
                        type="button"
                        onClick={() => updateParams(params, setParams, { chainsOpen: chainsSectionOpen ? "closed" : "open" })}
                      >
                        <strong>Chains</strong>
                        <Icon
                          icon="chevron-right"
                          className={chainsSectionOpen ? "microIcon profileFilterChevron open" : "microIcon profileFilterChevron"}
                        />
                      </button>
                      {chainsSectionOpen ? (
                        <div className="profileFilterSectionBody">
                          <div className="profileFilterChipGrid">
                            <FilterChipButton active>
                              Reef
                            </FilterChipButton>
                          </div>
                        </div>
                      ) : null}
                    </section>

                    <section className="profileFilterSection">
                      <button
                        className="profileFilterHeadingButton"
                        type="button"
                        onClick={() => updateParams(params, setParams, { collectionsOpen: collectionsSectionOpen ? "closed" : "open" })}
                      >
                        <strong>Collections</strong>
                        <Icon
                          icon="chevron-right"
                          className={collectionsSectionOpen ? "microIcon profileFilterChevron open" : "microIcon profileFilterChevron"}
                        />
                      </button>
                      {collectionsSectionOpen ? (
                        <div className="profileFilterSectionBody">
                          <label className="profileFilterSearch">
                            <Icon icon="search" />
                            <input
                              value={collectionQuery}
                              onChange={(event) => updateParams(params, setParams, { collectionQ: event.target.value })}
                              placeholder="Search for collections"
                            />
                          </label>
                          <div className="profileCollectionFilterList">
                            <button
                              className={collectionFilter === "all" ? "profileCollectionFilterOption active" : "profileCollectionFilterOption"}
                              type="button"
                              onClick={() => updateParams(params, setParams, { collection: "all" })}
                            >
                              <div className="profileCollectionFilterMeta">
                                <strong>All collections</strong>
                                <span>{profileData.galleries.length} available</span>
                              </div>
                            </button>
                            {filterCollections.map((gallery) => (
                              <button
                                key={gallery.id}
                                className={collectionFilter === gallery.collectionSlug ? "profileCollectionFilterOption active" : "profileCollectionFilterOption"}
                                type="button"
                                onClick={() => updateParams(params, setParams, { collection: gallery.collectionSlug })}
                              >
                                <img src={assetUrl(gallery.avatarUrl)} alt={gallery.collectionName} />
                                <div className="profileCollectionFilterMeta">
                                  <strong>{gallery.collectionName}</strong>
                                  <span>{gallery.itemCount} items</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </section>
                  </aside>
                ) : null}

                <div className="profileWorkspaceMain">
                  <div className="profileWorkspaceToolbar">
                    <div className="profileWorkspaceToolbarLead">
                      <IconChipButton
                        className="profileRailToggle"
                        type="button"
                        aria-label={profileRailCollapsed ? "Open filters" : "Collapse filters"}
                        onClick={() => updateParams(params, setParams, { profileRail: profileRailCollapsed ? "open" : "collapsed" })}
                      >
                        <Icon icon={profileRailCollapsed ? "chevron-right" : "collapse-left"} />
                      </IconChipButton>
                      <label className="inlineSearch profileInlineSearch">
                        <Icon icon="search" />
                        <input
                          value={query}
                          onChange={(event) => updateParams(params, setParams, { q: event.target.value })}
                          placeholder={searchPlaceholder}
                        />
                      </label>
                    </div>

                    <div className="profileWorkspaceTools">
                      <IconChipButton onClick={cycleSort}>
                        {sortLabel}
                        <Icon icon="chevron-right" className="microIcon" />
                      </IconChipButton>
                      <IconChipButton aria-label="Settings">
                        <Icon icon="settings" />
                      </IconChipButton>
                      <IconChipButton active={view === "grid"} onClick={() => updateParams(params, setParams, { view: "grid" })}>
                        <Icon icon="view-grid" />
                      </IconChipButton>
                      <IconChipButton active={view === "columns"} onClick={() => updateParams(params, setParams, { view: "columns" })}>
                        <Icon icon="view-columns" />
                      </IconChipButton>
                      <IconChipButton active={view === "grid-alt"} onClick={() => updateParams(params, setParams, { view: "grid-alt" })}>
                        <Icon icon="grid" />
                      </IconChipButton>
                      <IconChipButton active={view === "list"} onClick={() => updateParams(params, setParams, { view: "list" })}>
                        <Icon icon="list" />
                      </IconChipButton>
                    </div>
                  </div>

                  <div className="profileWorkspaceMetaRow">
                    <span className="profileWorkspaceInventory">
                      <span className="profileWorkspaceCheckbox" aria-hidden="true" />
                      <strong>{countLabel}</strong>
                    </span>
                  </div>

                  <ProfileItemsTab
                    items={sortedItems}
                    view={view}
                    emptyArtwork={buildProfileEmptyArtwork("items")}
                    emptyTitle="No items found"
                    emptyCopy="Discover new collections on OpenSea"
                    renderGridCard={(item) => <ItemGridCard key={item.id} item={item} />}
                  />
                </div>
              </div>
            ) : null}

            {!showProfileSidebar ? <p className="itemCountLabel">{countLabel}</p> : null}

            {activeTab === "galleries" ? (
              <ProfileGalleriesTab
                galleries={sortedGalleries}
                emptyArtwork={buildProfileEmptyArtwork("items")}
                isOwnProfile={isOwnProfile}
                onCreateCollection={() => navigate("/create/collection")}
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
                portfolio={profileData.portfolio}
                tokens={profileData.tokens}
                galleries={profileData.galleries}
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
    <NavLink className="compactRow compactRowLink" to={`/drops/${drop.slug}`}>
      <DropCoverImage drop={drop} />
      <div>
        <strong>{drop.name}</strong>
        <p>{drop.startLabel}</p>
      </div>
      <span>{drop.mintPrice}</span>
    </NavLink>
  );
}

function DiscoverCollectionTableRow({
  collection
}: {
  collection: CollectionSummary;
}) {
  return (
    <NavLink to={`/collection/${collection.slug}`} className="collectionTableRow discoverCollectionsTableRow">
      <span className="starSlot"><Icon icon="star" /></span>
      <div className="collectionIdentity discoverCollectionIdentity">
        <img src={assetUrl(collection.avatarUrl)} alt={collection.name} />
        <div className="discoverCollectionNameCell">
          <strong>{collection.name}</strong>
          {collection.verified ? <OpenSeaBadge className="verifiedBadge small" /> : null}
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
  );
}

function DiscoverCollectionCompactRow({
  collection
}: {
  collection: CollectionSummary;
}) {
  return (
    <NavLink to={`/collection/${collection.slug}`} className="compactRow discoverCollectionCompactRow">
      <img src={assetUrl(collection.avatarUrl)} alt={collection.name} />
      <div className="discoverCollectionCompactBody">
        <div className="discoverCollectionCompactTitle">
          <strong>{collection.name}</strong>
          {collection.verified ? <OpenSeaBadge className="verifiedBadge small" /> : null}
        </div>
        <p>By {collection.creatorName}</p>
      </div>
      <div className="discoverCollectionCompactMeta">
        <span>{collection.tableMetrics.floor}</span>
        <small>{collection.tableMetrics.owners} owners</small>
      </div>
    </NavLink>
  );
}

function FeaturedCollectionShelf({
  collections
}: {
  collections: CollectionSummary[];
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    const updateControls = () => {
      const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
      setCanScrollPrev(rail.scrollLeft > 8);
      setCanScrollNext(maxScrollLeft - rail.scrollLeft > 8);
    };

    updateControls();
    const onScroll = () => updateControls();
    rail.addEventListener("scroll", onScroll, { passive: true });
    const resizeObserver = new ResizeObserver(() => updateControls());
    resizeObserver.observe(rail);
    window.addEventListener("resize", updateControls);

    return () => {
      rail.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateControls);
    };
  }, [collections.length]);

  const scrollRail = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }
    const firstCard = rail.querySelector<HTMLElement>(".featuredCollectionCard");
    const amount = firstCard ? firstCard.offsetWidth + 22 : rail.clientWidth * 0.78;
    rail.scrollBy({
      left: amount * direction,
      behavior: "smooth"
    });
  };

  return (
    <div className="featuredCollectionRailShell">
      <button
        className="railEdgeButton left"
        type="button"
        aria-label="Previous featured collections"
        onClick={() => scrollRail(-1)}
        disabled={!canScrollPrev}
      >
        <Icon icon="chevron-left" />
      </button>
      <div className="featuredCollectionRail" ref={railRef}>
        {collections.map((collection) => (
          <FeaturedCollectionCard key={collection.slug} collection={collection} />
        ))}
      </div>
      <button
        className="railEdgeButton right"
        type="button"
        aria-label="Next featured collections"
        onClick={() => scrollRail(1)}
        disabled={!canScrollNext}
      >
        <Icon icon="chevron-right" />
      </button>
    </div>
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

function activityEntryHref(entry: ActivityRecord) {
  return entry.collectionAddress && entry.itemId
    ? `/item/reef/${entry.collectionAddress}/${entry.itemId}`
    : entry.collectionSlug
      ? `/collection/${entry.collectionSlug}`
      : null;
}

function ActivityFeedRow({ entry }: { entry: ActivityRecord }) {
  const href = activityEntryHref(entry);
  const valueLabel = entry.priceDisplay === "-" ? formatActivityTypeLabel(entry.type) : entry.priceDisplay;
  const showValue = entry.priceDisplay !== "-";
  const collectionLabel = entry.collectionName ?? entry.collectionSlug ?? "Reef Collection";
  const tokenLabel = entry.itemId ? `Token #${entry.itemId}` : "NFT";
  const content = (
    <>
      <div className="activityFeedMediaWrap">
        <div className="activityMiniMedia activityFeedMedia">
          <img
            src={assetUrl(entry.imageUrl || placeholderAsset(entry.itemName, "#2081e2"))}
            alt={entry.itemName}
            onError={(event) => applyImageFallback(event.currentTarget, entry.itemName, "#2081e2")}
          />
        </div>
        <span className={`activityFeedEventIcon activityType-${entry.type}`} aria-hidden="true">
          <Icon icon={activityIcon(entry.type)} />
        </span>
      </div>

      <div className="activityFeedBody">
        <div className="activityFeedTopline">
          <div className="activityMiniEyebrow activityFeedEyebrow">
            <span className={`activityMiniTypePill activityType-${entry.type}`}>
              {formatActivityTypeLabel(entry.type)}
            </span>
            <span className="activityMiniCollectionName">{collectionLabel}</span>
            <span className="activityFeedTokenTag">{tokenLabel}</span>
          </div>
          <small className="activityFeedTime">{entry.ageLabel}</small>
        </div>
        <div className="activityFeedHeadlineRow">
          <strong>{entry.itemName}</strong>
          <span className="activityFeedHeadline">{formatActivityHeadline(entry)}</span>
        </div>
        <div className="activityMiniRoute activityFeedRoute">
          <span>{entry.from}</span>
          <span className="activityMiniArrow">→</span>
          <span>{entry.to}</span>
        </div>
      </div>

      <div className="activityFeedMeta">
        <span className={`activityFeedValue ${showValue ? "" : "isEvent"}`}>{valueLabel}</span>
        <small>{showValue ? formatActivityTypeLabel(entry.type) : "On Reef"}</small>
      </div>
    </>
  );

  if (href) {
    return (
      <NavLink to={href} className="activityFeedRow">
        {content}
      </NavLink>
    );
  }

  return (
    <article className="activityFeedRow">
      {content}
    </article>
  );
}

function ActivityMiniRow({ entry }: { entry: ActivityRecord }) {
  const href = activityEntryHref(entry);
  const valueLabel = entry.priceDisplay === "-" ? formatActivityTypeLabel(entry.type) : entry.priceDisplay;
  const content = (
    <>
      <div className="activityMiniMedia">
        <img
          src={assetUrl(entry.imageUrl || placeholderAsset(entry.itemName, "#2081e2"))}
          alt={entry.itemName}
          onError={(event) => applyImageFallback(event.currentTarget, entry.itemName, "#2081e2")}
        />
      </div>

      <div className="activityMiniBody">
        <div className="activityMiniEyebrow">
          <span className={`activityMiniTypePill activityType-${entry.type}`}>
            {formatActivityTypeLabel(entry.type)}
          </span>
          <span className="activityMiniCollectionName">
            {entry.collectionName ?? entry.collectionSlug}
          </span>
        </div>
        <strong>{entry.itemName}</strong>
        <div className="activityMiniRoute">
          <span>{entry.from}</span>
          <span className="activityMiniArrow">→</span>
          <span>{entry.to}</span>
        </div>
      </div>

      <div className="activityMiniMeta">
        <span className={`activityMiniValue ${valueLabel === "Mint" ? "isEvent" : ""}`}>
          {valueLabel}
        </span>
        <small>{entry.ageLabel}</small>
      </div>
    </>
  );

  if (href) {
    return (
      <NavLink to={href} className={`activityMiniRow activityMiniCard activityMiniTone-${entry.type}`}>
        {content}
      </NavLink>
    );
  }

  return (
    <article className={`activityMiniRow activityMiniCard activityMiniTone-${entry.type}`}>
      {content}
    </article>
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
  const isListed = item.listed && item.currentPriceRaw !== "0";
  const hoverActionLabel = isListed ? "Buy now" : "View item";
  const hoverActionValue = isListed ? item.currentPriceDisplay : item.rankDisplay ?? `#${item.tokenId}`;
  return (
    <NavLink to={`/item/reef/${item.contractAddress}/${item.tokenId}`} className="itemCard">
      <div className="itemCardMedia">
        <img src={assetUrl(item.imageUrl)} alt={item.name} />
        <span className="itemCardQuickAction" aria-hidden="true">
          <Icon icon="plus" />
        </span>
      </div>
      <div className="itemCardBody">
        <strong>{item.name}</strong>
        <p>{item.collectionName}</p>
        <div className="itemCardMeta">
          <span>{isListed ? item.currentPriceDisplay : "Not listed"}</span>
          <small>{item.rankDisplay ?? item.highestOfferDisplay}</small>
        </div>
      </div>
      <div className={isListed ? "itemCardHoverBar listed" : "itemCardHoverBar"}>
        <strong>{hoverActionLabel}</strong>
        <span>{hoverActionValue}</span>
      </div>
    </NavLink>
  );
}

function DropCard({ drop }: { drop: DropRecord }) {
  return (
    <NavLink className="dropCard dropCardLink" to={`/drops/${drop.slug}`}>
      <DropCoverImage drop={drop} />
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
    </NavLink>
  );
}

function DropsHeroCarousel({ drops }: { drops: DropRecord[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slides = drops.slice(0, 4).map((drop, index) => ({
    ...drop,
    mediaKind: index === 0 ? "video" : "image"
  }));
  const activeSlide = slides[activeIndex] ?? null;
  const carouselStyle = {
    "--drops-carousel-duration": "3800ms"
  } as CSSProperties;

  useEffect(() => {
    if (slides.length <= 1 || paused) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 3800);

    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  useEffect(() => {
    if (activeIndex < slides.length) {
      return;
    }
    setActiveIndex(0);
  }, [activeIndex, slides.length]);

  if (!activeSlide) {
    return null;
  }

  return (
    <section
      className="dropsHeroCarousel"
      style={carouselStyle}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {activeSlide.mediaKind === "video" ? (
        <video
          key={`${activeSlide.slug}-video`}
          className="dropsHeroAsset"
          src={dropsHeroVideoUrl}
          poster={assetUrl(activeSlide.coverUrl)}
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        <DropCoverImage
          key={`${activeSlide.slug}-image`}
          className="dropsHeroAsset"
          drop={activeSlide}
        />
      )}
      <div className="dropsHeroShade" />
      <div className="dropsHeroAmbient" />

      <div className="dropsHeroContent">
        <div className="dropsHeroBadgeRow">
          <span className={`dropsHeroStage stage-${normalizeFilterValue(activeSlide.stage)}`}>
            {activeSlide.stage}
          </span>
          <span className="dropsHeroBadge">
            {activeSlide.mediaKind === "video" ? "Featured video drop" : "Featured drop"}
          </span>
        </div>

        <div className="dropsHeroFooter">
          <div className="dropsHeroCopy">
            <span className="dropsHeroEyebrow">Drop spotlight</span>
            <NavLink className="dropsHeroTitleLink" to={`/drops/${activeSlide.slug}`}>
              <h2>{activeSlide.name}</h2>
            </NavLink>
            <p>
              By {activeSlide.creatorName}
              {activeSlide.startLabel ? ` • ${activeSlide.startLabel}` : ""}
            </p>
            <small>{activeSlide.description || "Live and upcoming drops from Reef creators."}</small>
            <div className="dropsHeroActions">
              <NavLink className="actionButton secondary" to={`/drops/${activeSlide.slug}`}>
                Open drop
              </NavLink>
            </div>
          </div>

          <div className="dropsHeroMetricGlass">
            <div className="dropsHeroMetric">
              <span>Mint Price</span>
              <strong>{activeSlide.mintPrice}</strong>
            </div>
            <div className="dropsHeroMetric">
              <span>Total Items</span>
              <strong>{compact(activeSlide.supply)}</strong>
            </div>
            <div className="dropsHeroMetric">
              <span>Status</span>
              <strong>{activeSlide.stage}</strong>
            </div>
          </div>
        </div>
      </div>

      {slides.length > 1 ? (
        <div className={paused ? "dropsHeroDots paused" : "dropsHeroDots"}>
          {slides.map((slide, index) => (
            <button
              key={slide.slug}
              className={index === activeIndex ? "dropsHeroDot active" : "dropsHeroDot"}
              type="button"
              aria-label={`Show drop ${slide.name}`}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      ) : null}
    </section>
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

function AnalyticsSparklineCard({
  metric
}: {
  metric: { label: string; value: string; points: number[] };
}) {
  const numericPoints = (metric.points.length ? metric.points : [0, 0, 0, 0]).map((point) =>
    Number.isFinite(point) ? point : 0
  );
  const width = 100;
  const height = 64;
  const topPadding = 6;
  const bottomPadding = 10;
  const max = Math.max(...numericPoints, 1);
  const min = Math.min(...numericPoints, 0);
  const range = Math.max(max - min, 1);
  const usableHeight = height - topPadding - bottomPadding;
  const coordinates = numericPoints.map((point, index) => {
    const x = numericPoints.length === 1 ? width / 2 : (index / (numericPoints.length - 1)) * width;
    const y = topPadding + ((max - point) / range) * usableHeight;
    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2))
    };
  });
  const polylinePoints = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = `M ${coordinates[0]?.x ?? 0} ${height - bottomPadding} ${coordinates
    .map((point) => `L ${point.x} ${point.y}`)
    .join(" ")} L ${coordinates[coordinates.length - 1]?.x ?? width} ${height - bottomPadding} Z`;
  const first = numericPoints[0] ?? 0;
  const last = numericPoints[numericPoints.length - 1] ?? 0;
  const delta = last - first;
  const trendTone = delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";
  const trendLabel = delta > 0 ? "Uptrend" : delta < 0 ? "Cooling" : "Stable";
  const trendValue = delta === 0 ? "Flat" : `${delta > 0 ? "+" : ""}${Math.round(delta)}`;
  const lastPoint = coordinates[coordinates.length - 1] ?? { x: width, y: height / 2 };

  return (
    <article className="pagePanel analyticsCard dark">
      <div className="analyticsCardHeader">
        <span className="metaLabel">{metric.label}</span>
        <div className={`analyticsTrend ${trendTone}`}>
          <span>{trendLabel}</span>
          <strong>{trendValue}</strong>
        </div>
      </div>

      <div className="analyticsCardBody">
        <strong className="analyticsValue">{metric.value}</strong>
        <span className="analyticsFootnote">Live collection momentum on Reef</span>
      </div>

      <div className="analyticsSparkline">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <line className="analyticsSparklineGrid" x1="0" y1="12" x2={width} y2="12" />
          <line className="analyticsSparklineGrid" x1="0" y1="32" x2={width} y2="32" />
          <line className="analyticsSparklineGrid" x1="0" y1="52" x2={width} y2="52" />
          <path className="analyticsSparklineArea" d={areaPath} />
          <polyline className="analyticsSparklineLine" points={polylinePoints} />
          <circle className="analyticsSparklineDot" cx={lastPoint.x} cy={lastPoint.y} r="2.6" />
        </svg>
      </div>
    </article>
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

function buildProfileGalleriesFallback(
  items: ItemRecord[],
  createdCollections: CollectionSummary[]
): ProfileGalleryRecord[] {
  const collectionByContract = new Map(
    createdCollections.map((collection) => [collection.contractAddress.toLowerCase(), collection] as const)
  );
  const grouped = new Map<string, ItemRecord[]>();

  for (const item of items) {
    const key = item.contractAddress.toLowerCase();
    const entries = grouped.get(key) ?? [];
    entries.push(item);
    grouped.set(key, entries);
  }

  return Array.from(grouped.entries()).map(([contractAddress, entries]) => {
    const collection = collectionByContract.get(contractAddress);
    const lead = entries[0];
    return {
      id: collection?.slug ?? contractAddress,
      collectionSlug: collection?.slug ?? lead.collectionSlug,
      collectionName: collection?.name ?? lead.collectionName,
      collectionDescription: collection?.description ?? `${entries.length} items`,
      contractAddress: collection?.contractAddress ?? lead.contractAddress,
      creatorName: collection?.creatorName ?? lead.creatorName,
      avatarUrl: collection?.avatarUrl ?? lead.imageUrl,
      bannerUrl: collection?.bannerUrl ?? collection?.avatarUrl ?? lead.imageUrl,
      floorDisplay: collection?.floorDisplay ?? "No listings",
      listedCount: entries.filter((item) => item.listed).length,
      itemCount: entries.length,
      itemsPreview: entries.slice(0, 3)
    };
  });
}

function buildProfilePortfolioFallback(
  items: ItemRecord[],
  listings: ItemRecord[],
  tokens: ProfileTokenHolding[],
  galleries: ProfileGalleryRecord[],
  nativeSymbol: string
): ProfilePortfolioSummary {
  const listedValueRaw = listings.reduce((sum, item) => sum + BigInt(item.currentPriceRaw || "0"), 0n);
  const topToken = tokens[0];
  return {
    totalValueDisplay: topToken?.valueDisplay ?? formatNativeDisplay(listedValueRaw.toString(), nativeSymbol),
    tokenValueDisplay: topToken?.valueDisplay ?? `0 ${nativeSymbol}`,
    nftValueDisplay: formatNativeDisplay(listedValueRaw.toString(), nativeSymbol),
    listedValueDisplay: formatNativeDisplay(listedValueRaw.toString(), nativeSymbol),
    collectionCount: galleries.length,
    itemCount: items.length,
    listingCount: listings.length,
    tokenCount: tokens.length,
    summaryCards: [
      {
        label: "Total value",
        value: topToken?.valueDisplay ?? `0 ${nativeSymbol}`,
        note: "Live wallet and listing value on Reef."
      },
      {
        label: "Token balance",
        value: topToken?.balanceDisplay ?? `0 ${nativeSymbol}`,
        note: `${tokens.length} tracked token holdings on Reef.`
      },
      {
        label: "NFT holdings",
        value: `${items.length}`,
        note: `${items.length} items across ${galleries.length} collections.`
      },
      {
        label: "Active listings",
        value: formatNativeDisplay(listedValueRaw.toString(), nativeSymbol),
        note: `${listings.length} items currently listed by this wallet.`
      }
    ]
  };
}

function normalizeProfileResponse(data: ProfileResponse, nativeSymbol: string): ProfileResponse {
  const createdCollections = Array.isArray(data.createdCollections) ? data.createdCollections : [];
  const createdItems = Array.isArray(data.createdItems) ? data.createdItems : [];
  const items = Array.isArray(data.items) ? data.items : createdItems;
  const tokens = Array.isArray(data.tokens) ? data.tokens : [];
  const listings = Array.isArray(data.listings) ? data.listings : items.filter((item) => item.listed);
  const galleries = Array.isArray(data.galleries)
    ? data.galleries
    : buildProfileGalleriesFallback(items, createdCollections);
  const portfolio = data.portfolio ?? buildProfilePortfolioFallback(items, listings, tokens, galleries, nativeSymbol);

  return {
    ...data,
    createdCollections,
    createdItems,
    items,
    tokens,
    listings,
    galleries,
    offers: Array.isArray(data.offers) ? data.offers : [],
    activity: Array.isArray(data.activity) ? data.activity : [],
    portfolio
  };
}
