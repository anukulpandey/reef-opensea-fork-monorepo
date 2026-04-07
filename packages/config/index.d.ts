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

export type ManagedProfileToken = {
  key: string;
  type: "native" | "erc20";
  address?: string;
  symbol: string;
  displayName: string;
  decimals: number;
  iconUrl: string;
  includeInPortfolio: boolean;
};

export type ContractRef = {
  address: string;
  verified: boolean;
  sourceRepo?: string;
  source?: string;
};

export type CapabilityRef = {
  enabled: boolean;
  mode: "official" | "fallback" | "mixed" | "blocked";
  address?: string;
  factoryAddress?: string;
  implementationAddress?: string;
  marketplaceMode?: "official" | "fallback" | "mixed" | "blocked";
  reason?: string;
};

export type PublicContracts = {
  official: {
    seaport: ContractRef;
    conduitController: ContractRef;
    seaDrop: ContractRef;
    creatorFactory: ContractRef;
    collectionImplementation: ContractRef;
  };
  fallback: {
    creatorFactory721: ContractRef;
    editionFactory1155: ContractRef;
    marketplace721: ContractRef;
    marketplace1155: ContractRef;
  };
  seaport: ContractRef;
  conduitController: ContractRef;
  seaDrop: ContractRef;
  creatorFactory: ContractRef;
  collectionImplementation: ContractRef;
  marketplace: ContractRef;
  collection: {
    address: string;
    slug: string;
    name: string;
    symbol: string;
    verified: boolean;
  };
  artifactPaths: {
    deployment: string;
    bootstrap: string;
    probe: string;
    runtime: string;
  };
};

export type PublicDeployment = {
  mode: "official" | "fallback" | "mixed" | "blocked";
  creator: {
    erc721: CapabilityRef;
    erc1155: CapabilityRef;
  };
  marketplace: {
    erc721: CapabilityRef;
    erc1155: CapabilityRef;
  };
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
    profileTokens: ManagedProfileToken[];
  };
  contracts: PublicContracts;
  deployment: PublicDeployment;
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
    runtime?: Record<string, unknown>;
  };
};

export function loadBaseConfig(): PublicAppConfig;
export function resolveNodeAppConfig(options?: {
  cwd?: string;
  env?: Record<string, string | undefined>;
}): NodeAppConfig;
export function buildPublicConfig(nodeConfig: NodeAppConfig): PublicAppConfig;
