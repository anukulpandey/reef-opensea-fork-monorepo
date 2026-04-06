export type NavItem = {
  label: string;
  href: string;
  gated?: boolean;
};

export type SidebarItem = {
  label: string;
  href: string;
  icon: string;
};

export type HeaderAction = {
  label: string;
  icon: string;
};

export type FooterMetric = {
  label: string;
  value: string;
};

export type FooterBar = {
  legal: string[];
  market: FooterMetric[];
  support: string;
  modePills: string[];
};

export type FilterChip = {
  label: string;
  icon?: string;
};

export type CollectionTab = {
  label: string;
  hrefPattern: string;
};

export type PublicContracts = {
  seaport: { address: string; verified: boolean };
  conduitController: { address: string; verified: boolean };
  seaDrop: { address: string; verified: boolean; sourceRepo?: string };
  creatorFactory: { address: string; verified: boolean };
  collectionImplementation: { address: string; verified: boolean };
  marketplace: { address: string; verified: boolean; source?: string };
  collection: { address: string; slug: string; name: string; symbol: string; verified: boolean };
  artifactPaths: { deployment: string; bootstrap: string; probe: string };
};

export type PublicAppConfig = {
  site: {
    name: string;
    tagline: string;
    description: string;
    supportEmail: string;
    themeMode: string;
    nav: NavItem[];
    sidebarNav: SidebarItem[];
    headerActions: HeaderAction[];
    footerBar: FooterBar;
    discoverFilters: {
      categories: FilterChip[];
      networks: FilterChip[];
    };
    timeframes: string[];
    collectionTabs: CollectionTab[];
  };
  network: {
    key: string;
    chainId: number;
    chainName: string;
    rpcUrl: string;
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
  };
  contracts: PublicContracts;
  services: {
    apiBaseUrl: string;
    webBaseUrl: string;
    ipfsGatewayUrl: string;
  };
  storage: {
    publicBasePath: string;
  };
  features: {
    enableRewardsShell: boolean;
    enableStudioShell: boolean;
    enableProfileShell: boolean;
    enableLiveTrading: boolean;
  };
};

export type NodeAppConfig = PublicAppConfig & {
  services: PublicAppConfig["services"] & {
    ipfsApiUrl: string;
  };
  storage: {
    rootDir: string;
    publicDir: string;
    generatedDir: string;
    ipfsFallbackDir: string;
    publicBasePath: string;
  };
  references: {
    projectOpenSeaRoot: string;
  };
  artifacts: {
    deployment?: Record<string, unknown>;
    bootstrap?: Record<string, unknown>;
    probe?: Record<string, unknown>;
  };
};

export function loadBaseConfig(): PublicAppConfig;
export function resolveNodeAppConfig(options?: {
  cwd?: string;
  env?: Record<string, string | undefined>;
}): NodeAppConfig;
export function buildPublicConfig(nodeConfig: NodeAppConfig): PublicAppConfig;
