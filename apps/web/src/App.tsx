import { createContext, useContext, useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { BrowserProvider } from "ethers";
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
  mode: "full" | "demo";
  database: boolean;
  ipfs: boolean;
  storage: boolean;
  liveTrading: boolean;
  databaseReason?: string;
  ipfsReason?: string;
  storageReason?: string;
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
  references: Array<{ name: string; path: string; description: string }>;
  featuredCollections: CollectionSummary[];
  trendingCollections: CollectionSummary[];
  topTokens: TokenRecord[];
  liveDrops: DropRecord[];
  recentActivity: ActivityRecord[];
  runtime: RuntimeInfo;
};

type DiscoverResponse = {
  heroCollection: CollectionSummary;
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

type ProfileResponse = {
  profile: ProfileSummary;
  createdCollections: CollectionSummary[];
  createdItems: ItemRecord[];
};

type MarketplaceContextValue = {
  bootstrap: BootstrapResponse;
  account: string;
  status: string;
  connectWallet: () => Promise<void>;
  setStatus: (value: string) => void;
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

function assetUrl(url: string) {
  if (!url.startsWith("/")) {
    return url;
  }
  if (url.startsWith("/storage/")) {
    return `${apiBaseUrl}${url}`;
  }
  return url;
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

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${path} (${response.status})`);
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

function useRemoteData<T>(path: string | null) {
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
  }, [path]);

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
  const [bootstrapState, setBootstrapState] = useState<{
    loading: boolean;
    data?: BootstrapResponse;
    error?: string;
  }>({ loading: true });
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("Loading OpenSea clone...");

  useEffect(() => {
    let cancelled = false;
    fetchJson<BootstrapResponse>("/bootstrap")
      .then((data) => {
        if (!cancelled) {
          setBootstrapState({ loading: false, data });
          setStatus("Marketplace route data loaded.");
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
  }, []);

  async function connectWallet() {
    try {
      const bootstrap = bootstrapState.data;
      if (!window.ethereum || !bootstrap) {
        setStatus("Install MetaMask or another EIP-1193 wallet.");
        return;
      }

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
      setStatus(`Connected ${address}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Wallet connection failed");
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
        status,
        connectWallet,
        setStatus
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
          <Route path="profile" element={<ProfilePage />} />
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
  const { bootstrap, account, connectWallet, status } = useMarketplace();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearch(params.get("search") ?? "");
  }, [location.search]);

  return (
    <div className="appShell">
      <aside className="sidebarRail">
        {bootstrap.config.site.sidebarNav.map((item, index) => (
          <NavLink
            key={`${item.href}-${index}`}
            to={item.href}
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
            {index === 0 ? <OpenSeaBadge className="logoBadge" /> : <Icon icon={item.icon} className="sidebarIcon" />}
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
            <button className="walletLink" onClick={() => void connectWallet()}>
              {account ? shortenAddress(account) : "Connect Wallet"}
            </button>
            <button className="iconCircle" type="button" aria-label="Profile">
              <Icon icon="profile" />
            </button>
          </div>
        </header>

        <main className="pageViewport">
          <Outlet />
        </main>

        <footer className="footerBar">
          <div className="footerLeft">
            <span className={bootstrap.runtime.mode === "demo" ? "statusDot demo" : "statusDot"} />
            <span>{bootstrap.runtime.mode === "demo" ? "Demo" : "Live"}</span>
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
            <span className="footerStatus">{status}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function DiscoverPage() {
  const state = useRemoteData<DiscoverResponse>("/dataset/discover");
  const { bootstrap } = useMarketplace();

  return (
    <DataState state={state}>
      {(data) => (
        <div className="darkPage">
          <div className="discoverControls">
            <div className="chipRow">
              {bootstrap.config.site.discoverFilters.categories.map((filter, index) => (
                <button key={filter.label} className={index === 0 ? "chip active" : "chip"} type="button">
                  {filter.icon ? <Icon icon={filter.icon} className="chipIcon" /> : null}
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="chipRow network">
              {bootstrap.config.site.discoverFilters.networks.map((filter, index) => (
                <button
                  key={filter.label}
                  className={
                    index === 0
                      ? "chip active networkChip"
                      : filter.label === "More"
                        ? "chip networkChip"
                        : "chip networkChip iconOnly"
                  }
                  type="button"
                  aria-label={filter.label}
                  title={filter.label}
                >
                  <NetworkDot label={filter.label} />
                  {index === 0 || filter.label === "More" ? filter.label : null}
                </button>
              ))}
            </div>

            <div className="controlSpacer" />

            <div className="segmentedSwitch">
              <button className="segment active" type="button">NFTs</button>
              <button className="segment" type="button">Tokens</button>
            </div>
            <button className="iconChip" type="button">1d <Icon icon="chevron-right" className="microIcon" /></button>
            <button className="iconChip" type="button" aria-label="Table view"><Icon icon="table" /></button>
            <button className="iconChip" type="button" aria-label="Next"><Icon icon="chevron-right" /></button>
          </div>

          <div className="discoverLayout">
            <section className="heroSurface" style={themeStyle(data.heroCollection.theme)}>
              <img className="heroImage" src={assetUrl(data.heroCollection.hero.backgroundUrl)} alt={data.heroCollection.name} />
              <div className="heroOverlay">
                <div>
                  <h1>{data.heroCollection.name}</h1>
                  <p>{data.heroCollection.hero.subtitle}</p>
                </div>
                <div className="heroMetrics overlay">
                  {data.heroCollection.hero.metrics.map((metric) => (
                    <article key={metric.label}>
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                    </article>
                  ))}
                </div>
              </div>
              <div className="carouselDots">
                {Array.from({ length: 5 }, (_, index) => (
                  <span key={index} className={index === 0 ? "dot active" : "dot"} />
                ))}
              </div>
            </section>

            <aside className="leaderSurface">
              <div className="leaderHeader">
                <span>Collection</span>
                <span>Floor</span>
              </div>
              {data.leaderboardCollections.map((collection) => (
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
              ))}
            </aside>
          </div>

          <section className="sectionBlock">
            <SectionHeader title="Trending Tokens" subtitle="Tokens with momentum today" />
            <div className="tokenStrip">
              {data.tokenLeaders.map((token) => (
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
          </section>

          <section className="sectionGrid">
            <div className="panelSurface">
              <SectionHeader title="Featured Collections" subtitle="This week's curated collections" />
              <div className="cardStack">
                {data.trendingCollections.slice(0, 4).map((collection) => (
                  <HeroCollectionCard key={collection.slug} collection={collection} />
                ))}
              </div>
            </div>

            <div className="panelSurface">
              <SectionHeader title="Featured Drops" subtitle="This week's curated live and upcoming drops" />
              <div className="compactStack">
                {data.liveDrops.map((drop) => (
                  <CompactDropRow key={drop.slug} drop={drop} />
                ))}
              </div>
            </div>
          </section>

          <section className="sectionGrid">
            <div className="panelSurface">
              <SectionHeader title="Top Movers Today" subtitle="Largest floor price change in the past day" />
              <div className="compactStack">
                {data.topMovers.map((collection) => (
                  <CompactCollectionRow key={collection.slug} collection={collection} highlightChange />
                ))}
              </div>
            </div>

            <div className="panelSurface">
              <SectionHeader title="Recent Activity" subtitle="Sales, listings, offers, and transfers" />
              <div className="activityStack">
                {data.activityFeed.slice(0, 6).map((entry) => (
                  <ActivityMiniRow key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </DataState>
  );
}

function CollectionsPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const view = params.get("view") ?? "top";
  const timeframe = params.get("timeframe") ?? "1d";
  const state = useRemoteData<CollectionsResponse>(
    `/dataset/collections${buildQuery({ search, view, timeframe })}`
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
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const sort = params.get("sort") ?? "volume";
  const state = useRemoteData<TokensResponse>(`/dataset/tokens${buildQuery({ search, sort })}`);

  return (
    <DataState state={state}>
      {(data) => (
        <div className="darkPage">
          <section className="pagePanel">
            <SectionHeader title="Tokens" subtitle="A compact dark market table for token discovery." />
            <div className="chipRow end">
              <button className={sort === "volume" ? "chip active" : "chip"} type="button" onClick={() => updateParams(params, setParams, { sort: "volume" })}>Volume</button>
              <button className={sort === "price" ? "chip active" : "chip"} type="button" onClick={() => updateParams(params, setParams, { sort: "price" })}>Price</button>
              <button className={sort === "marketCap" ? "chip active" : "chip"} type="button" onClick={() => updateParams(params, setParams, { sort: "marketCap" })}>Market Cap</button>
            </div>
            <div className="collectionTableHeader tokenHeader">
              <span>Token</span>
              <span>Price</span>
              <span>24H Vol</span>
              <span>FDV</span>
              <span>Holders</span>
              <span>Change</span>
            </div>
            {data.tokens.map((token) => (
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
                <span className={token.change.startsWith("-") ? "negative" : "positive"}>{token.change}</span>
              </div>
            ))}
          </section>
        </div>
      )}
    </DataState>
  );
}

function SwapPage() {
  const { bootstrap, setStatus } = useMarketplace();
  return (
    <div className="darkPage">
      <div className="sectionGrid">
        <section className="pagePanel">
          <SectionHeader title="Swap" subtitle="A logged-out swap shell rendered in the same dark chrome." />
          <div className="swapPanel">
            <label>
              <span>You pay</span>
              <strong>12.40 REEF</strong>
            </label>
            <label>
              <span>You receive</span>
              <strong>4.90 WETH</strong>
            </label>
            <button className="primaryCta" onClick={() => setStatus("Swap is a visual shell only in demo mode.")}>
              Preview swap
            </button>
          </div>
        </section>

        <section className="pagePanel">
          <SectionHeader title="Popular tokens" subtitle="Quick picks from the token market." />
          <div className="compactStack">
            {bootstrap.topTokens.map((token) => (
              <CompactTokenRow key={token.slug} token={token} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function DropsPage() {
  const [params, setParams] = useSearchParams();
  const stage = params.get("stage") ?? "all";
  const state = useRemoteData<DropsResponse>(`/dataset/drops${buildQuery({ stage })}`);

  return (
    <DataState state={state}>
      {(data) => (
        <div className="darkPage">
          <section className="pagePanel">
            <SectionHeader title="Drops" subtitle="Curated live and upcoming launches in the dark OpenSea layout." />
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
            </div>
            <div className="dropGrid">
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

function ActivityPage() {
  const [params, setParams] = useSearchParams();
  const type = params.get("type") ?? "all";
  const search = params.get("search") ?? "";
  const state = useRemoteData<ActivityResponse>(`/dataset/activity${buildQuery({ type, search })}`);

  return (
    <DataState state={state}>
      {(data) => (
        <div className="darkPage">
          <section className="pagePanel">
            <SectionHeader title="Activity" subtitle="Listings, sales, offers, and transfers across the demo market." />
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
  const state = useRemoteData<RewardsRecord>("/dataset/rewards");
  return (
    <DataState state={state}>
      {(data) => (
        <div className="darkPage">
          <section className="pagePanel">
            <SectionHeader title="Rewards" subtitle="Logged-out shell, rethemed into the same dark collector chrome." />
            <div className="metricsRow">
              <MetricPanel label="Total points" value={data.totalPoints} />
              <MetricPanel label="Rank" value={data.rank} />
              <MetricPanel label="Streak" value={data.streak} />
            </div>
            <div className="taskGrid">
              {data.tasks.map((task) => (
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
      )}
    </DataState>
  );
}

function StudioPage() {
  const state = useRemoteData<StudioRecord>("/dataset/studio");
  const { bootstrap } = useMarketplace();
  return (
    <DataState state={state}>
      {(data) => (
        <div className="darkPage">
          <div className="sectionGrid">
            <section className="pagePanel">
              <SectionHeader title="Studio" subtitle="Creator tooling shell with public Seaport and SeaDrop references." />
              <h3 className="panelTitle">{data.headline}</h3>
              <p className="panelBody">{data.subtitle}</p>
              <div className="referenceList">
                {bootstrap.references.slice(0, 6).map((reference) => (
                  <div className="referenceRow" key={reference.name}>
                    <strong>{reference.name}</strong>
                    <span>{reference.path}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="pagePanel">
              <SectionHeader title="Quick actions" subtitle="The same dark panel language applied to logged-out tools." />
              <div className="taskGrid single">
                {data.quickActions.map((action) => (
                  <article className="taskCard dark" key={action.title}>
                    <span className="metaLabel">{action.state}</span>
                    <h3>{action.title}</h3>
                    <p>{action.description}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </DataState>
  );
}

function ProfilePage() {
  const { connectWallet } = useMarketplace();
  return (
    <div className="darkPage">
      <section className="pagePanel">
        <SectionHeader title="Profile" subtitle="Logged-out shell styled to match the same OpenSea dark environment." />
        <div className="profileShell">
          <div>
            <h3 className="panelTitle">Connect a wallet to personalize your account</h3>
            <p className="panelBody">
              This route intentionally stays a logged-out shell, but its layout, density, and chrome now match the rest of the cloned public marketplace.
            </p>
          </div>
          <button className="primaryCta" onClick={() => void connectWallet()}>Connect Wallet</button>
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
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const sort = params.get("sort") ?? "price-low";
  const state = useRemoteData<CollectionResponse>(slug ? `/dataset/collection/${slug}` : null);
  const { bootstrap, setStatus } = useMarketplace();

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
              <div className="itemGrid">
                {visibleItems.map((item) => (
                  <ItemGridCard key={item.id} item={item} />
                ))}
              </div>
            ) : null}

            {mode === "offers" ? (
              <section className="pagePanel">
                <SectionHeader title="Collection offers" subtitle="Dark table shell for collection-wide offers." />
                <div className="offerTable">
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
                <SectionHeader title="Holders" subtitle="Dense leaderboard view for wallet holders." />
                <div className="offerTable">
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
                <SectionHeader title="Traits" subtitle="A trait explorer styled like the screenshot’s dark collection view." />
                <div className="traitSummaryGrid">
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
                <SectionHeader title="Activity" subtitle="Collection-scoped event feed." />
                <div className="activityTable">
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
            ) : null}

            {mode === "about" ? (
              <section className="pagePanel">
                <SectionHeader title="About" subtitle="Collection context and visual-parity notes." />
                <div className="aboutStack">
                  {data.about.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ) : null}

            {data.collection.showStickyActionBar ? (
              <div className="stickyActionBar">
                <button className="actionButton secondary" type="button">{data.collection.actionBar.secondary}</button>
                <button className="actionButton secondary" type="button">{data.collection.actionBar.tertiary}</button>
                {data.collection.actionBar.quaternary ? (
                  <button className="actionButton muted" type="button">{data.collection.actionBar.quaternary}</button>
                ) : null}
                <button className="actionButton primary" type="button" onClick={() => setStatus("Collection floor buying is in demo mode until Reef contract verification is live.")}>
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
  const { setStatus } = useMarketplace();
  const navigate = useNavigate();
  const state = useRemoteData<ItemResponse>(
    contract && tokenId ? `/dataset/item/${contract}/${tokenId}` : null
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
                  <button
                    className="primaryCta fullWidth"
                    onClick={() => {
                      if (!data.liveTradingAvailable) {
                        setStatus("Buying is demo-only until Reef marketplace contracts are verifiable.");
                        return;
                      }
                      setStatus("Live buying would start here.");
                    }}
                  >
                    {data.buyPanel.buttonLabel}
                  </button>
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
  const state = useRemoteData<ProfileResponse>(creator ? `/dataset/profile/${creator}` : null);

  if (!creator) {
    return <PageState message="Missing creator slug." />;
  }

  return (
    <DataState state={state}>
      {(data) => (
        <div className="darkPage">
          <section className="creatorHero">
            <img className="creatorBanner" src={assetUrl(data.profile.bannerUrl)} alt={data.profile.name} />
            <div className="creatorOverlay">
              <img className="creatorAvatar" src={assetUrl(data.profile.avatarUrl)} alt={data.profile.name} />
              <div>
                <h1>{data.profile.name}</h1>
                <p>{data.profile.bio}</p>
                <div className="metricsRow compact">
                  <MetricPanel label="Followers" value={compact(data.profile.followers)} />
                  <MetricPanel label="Following" value={compact(data.profile.following)} />
                  <MetricPanel label="Volume" value={data.profile.volume} />
                </div>
              </div>
            </div>
          </section>

          <section className="pagePanel">
            <SectionHeader title="Created collections" subtitle="Flagship and supporting collections by this creator." />
            <div className="cardStack">
              {data.createdCollections.map((collection) => (
                <HeroCollectionCard key={collection.slug} collection={collection} />
              ))}
            </div>
          </section>

          <section className="pagePanel">
            <SectionHeader title="Created items" subtitle="Selected inventory authored by this profile." />
            <div className="itemGrid">
              {data.createdItems.map((item) => (
                <ItemGridCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        </div>
      )}
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
    return <PageState message={state.error ?? "Route data failed to load"} />;
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
