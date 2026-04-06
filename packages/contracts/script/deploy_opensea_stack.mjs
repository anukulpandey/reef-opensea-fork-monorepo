import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { resolveNodeAppConfig } from "@reef/config";
import dotenv from "dotenv";
import {
  Contract,
  ContractFactory,
  Interface,
  JsonRpcProvider,
  Wallet,
  ZeroAddress,
  formatEther,
  parseEther
} from "ethers";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
dotenv.config({ path: path.join(rootDir, ".env") });
const appConfig = resolveNodeAppConfig({ cwd: rootDir });

const rpcUrl = process.env.REEF_RPC_URL ?? appConfig.network.rpcUrl;
const chainId = Number(process.env.REEF_CHAIN_ID ?? String(appConfig.network.chainId));
const chainName = process.env.REEF_CHAIN_NAME ?? appConfig.network.chainName;
const privateKey = process.env.PRIVATE_KEY;
const collectionSlug = process.env.COLLECTION_SLUG ?? appConfig.contracts.collection.slug;
const collectionName = process.env.COLLECTION_NAME ?? appConfig.contracts.collection.name;
const collectionSymbol = process.env.COLLECTION_SYMBOL ?? appConfig.contracts.collection.symbol;
const collectionContractUri = process.env.COLLECTION_CONTRACT_URI ?? "";
const collectionBaseUri = process.env.COLLECTION_BASE_URI ?? process.env.COLLECTION_CONTRACT_URI ?? "";
const collectionDropUri = process.env.COLLECTION_DROP_URI ?? collectionContractUri;
const collectionMaxSupply = BigInt(process.env.COLLECTION_MAX_SUPPLY ?? "1000");
const collectionRoyaltyBps = Number(process.env.COLLECTION_ROYALTY_BPS ?? "500");
const publicMintPrice = BigInt(process.env.PUBLIC_MINT_PRICE_WEI ?? "0");
const gasPrice = BigInt(process.env.REEF_GAS_PRICE_WEI ?? "100000000");
const fundBuyerValue = BigInt(process.env.GATE_BUYER_FUND_WEI ?? parseEther("3").toString());
const listingPrice = BigInt(process.env.GATE_LISTING_PRICE_WEI ?? parseEther("1").toString());

if (!privateKey) {
  throw new Error("PRIVATE_KEY is required");
}

const provider = new JsonRpcProvider(rpcUrl, chainId);
const seller = new Wallet(privateKey, provider);
const deploymentsDir = path.join(rootDir, "packages/contracts/deployments");
const outDir = path.join(rootDir, "packages/contracts/out");
const bootstrapPath = path.resolve(
  rootDir,
  process.env.REEF_BOOTSTRAP_FILE ?? appConfig.contracts.artifactPaths.bootstrap
);
const outputPath = path.resolve(
  rootDir,
  process.env.REEF_DEPLOYMENT_FILE ?? appConfig.contracts.artifactPaths.deployment
);

const seaportModule = await import("@opensea/seaport-js");
const Seaport = seaportModule.Seaport ?? seaportModule.default?.Seaport;

if (!Seaport) {
  throw new Error("Unable to load @opensea/seaport-js");
}

const factoryEventInterface = new Interface([
  "event CollectionCreated(address indexed creator, address indexed collection, string name, string symbol, bytes32 salt)"
]);
const transferEventInterface = new Interface([
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function findArtifact(contractName) {
  const stack = [outDir];
  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir || !fs.existsSync(currentDir)) {
      continue;
    }

    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name === `${contractName}.json`) {
        return readJson(fullPath);
      }
    }
  }

  throw new Error(`Unable to find artifact for ${contractName} under ${outDir}`);
}

const seaDropArtifact = findArtifact("SeaDrop");
const creatorFactoryArtifact = findArtifact("ReefCreatorFactory");
const collectionArtifact = findArtifact("ReefSeaDropCollection");

async function ensureCode(address, label) {
  if (!address || address === ZeroAddress) {
    throw new Error(`${label} address is missing.`);
  }

  const code = await provider.getCode(address);
  if (code === "0x") {
    throw new Error(`${label} has no code at ${address}.`);
  }
}

async function deployFromArtifact(contractName, args = [], gasLimit) {
  const artifact = findArtifact(contractName);
  const factory = new ContractFactory(artifact.abi, artifact.bytecode.object, seller);
  const contract = await factory.deploy(...args, {
    gasPrice,
    gasLimit
  });
  const receipt = await contract.deploymentTransaction()?.wait();
  const address = await contract.getAddress();
  await ensureCode(address, contractName);
  return {
    contract,
    address,
    txHash: contract.deploymentTransaction()?.hash ?? null,
    blockNumber: receipt?.blockNumber ?? null
  };
}

function parseCollectionCreated(receipt) {
  for (const log of receipt.logs) {
    try {
      const parsed = factoryEventInterface.parseLog(log);
      if (parsed?.name === "CollectionCreated") {
        return String(parsed.args.collection);
      }
    } catch {}
  }
  throw new Error("CollectionCreated event was not found in the factory receipt.");
}

function parseMintedTokenId(receipt) {
  for (const log of receipt.logs) {
    try {
      const parsed = transferEventInterface.parseLog(log);
      if (parsed?.name === "Transfer" && String(parsed.args.from) === ZeroAddress) {
        return BigInt(parsed.args.tokenId);
      }
    } catch {}
  }
  throw new Error("Mint Transfer event was not found.");
}

async function loadBootstrap() {
  if (!fs.existsSync(bootstrapPath)) {
    throw new Error(
      `Bootstrap artifact not found at ${bootstrapPath}. Run deploy_standard_seaport.mjs first.`
    );
  }

  const bootstrap = readJson(bootstrapPath);
  await ensureCode(bootstrap.conduitController, "ConduitController");
  await ensureCode(bootstrap.seaport, "Seaport");
  return bootstrap;
}

async function createBuyerWallet() {
  const buyer = Wallet.createRandom().connect(provider);
  const transaction = await seller.sendTransaction({
    to: buyer.address,
    value: fundBuyerValue,
    gasPrice,
    gasLimit: 21_000n
  });
  await transaction.wait();
  return {
    wallet: buyer,
    fundingTxHash: transaction.hash
  };
}

function nowInSeconds() {
  return Math.floor(Date.now() / 1000);
}

async function createCollection(factoryAddress) {
  const factory = new Contract(factoryAddress, creatorFactoryArtifact.abi, seller);

  const salt = `0x${crypto.randomBytes(32).toString("hex")}`;
  const startTime = BigInt(nowInSeconds() - 60);
  const endTime = BigInt(nowInSeconds() + 86_400);
  const tx = await factory.createCollection(
    collectionName,
    collectionSymbol,
    {
      baseURI: collectionBaseUri,
      contractURI: collectionContractUri,
      dropURI: collectionDropUri,
      maxSupply: collectionMaxSupply,
      creatorPayoutAddress: seller.address,
      royaltyBps: collectionRoyaltyBps,
      mintPrice: publicMintPrice,
      startTime,
      endTime,
      maxTotalMintableByWallet: 10,
      feeBps: 0,
      restrictFeeRecipients: false
    },
    salt,
    {
      gasPrice,
      gasLimit: BigInt(process.env.REEF_FACTORY_CREATE_GAS_LIMIT ?? "6500000")
    }
  );
  const receipt = await tx.wait();
  const collectionAddress = parseCollectionCreated(receipt);
  await ensureCode(collectionAddress, "ReefSeaDropCollection");
  const collectionImplementation = await factory.collectionImplementation();

  return {
    collectionAddress,
    collectionImplementation,
    createCollectionTxHash: tx.hash,
    salt
  };
}

async function mintCollectionItem(seaDropAddress, collectionAddress) {
  const seaDrop = new Contract(seaDropAddress, seaDropArtifact.abi, seller);
  const tx = await seaDrop.mintPublic(
    collectionAddress,
    seller.address,
    ZeroAddress,
    1,
    {
      value: publicMintPrice,
      gasPrice,
      gasLimit: BigInt(process.env.REEF_PUBLIC_MINT_GAS_LIMIT ?? "1500000")
    }
  );
  const receipt = await tx.wait();
  const tokenId = parseMintedTokenId(receipt);
  return {
    tokenId,
    mintTxHash: tx.hash,
    blockNumber: receipt?.blockNumber ?? null
  };
}

async function createAndFulfillListing({
  seaportAddress,
  collectionAddress,
  tokenId,
  buyerWallet
}) {
  const collection = new Contract(collectionAddress, collectionArtifact.abi, seller);
  const currentOwner = await collection.ownerOf(tokenId);
  if (String(currentOwner).toLowerCase() !== seller.address.toLowerCase()) {
    throw new Error(`Expected seller to own token ${tokenId}, got ${currentOwner}`);
  }

  const sellerSeaport = new Seaport(seller, {
    overrides: {
      contractAddress: seaportAddress
    }
  });
  const buyerSeaport = new Seaport(buyerWallet, {
    overrides: {
      contractAddress: seaportAddress
    }
  });

  const { executeAllActions } = await sellerSeaport.createOrder(
    {
      offer: [
        {
          itemType: 2,
          token: collectionAddress,
          identifier: tokenId.toString()
        }
      ],
      consideration: [
        {
          amount: listingPrice.toString(),
          recipient: seller.address
        }
      ]
    },
    seller.address
  );

  const order = await executeAllActions();
  const { executeAllActions: executeAllFulfillActions } = await buyerSeaport.fulfillOrder({
    order,
    accountAddress: buyerWallet.address
  });

  const purchaseTx = await executeAllFulfillActions();
  const purchaseReceipt = await purchaseTx.wait();
  const finalOwner = await collection.ownerOf(tokenId);
  if (String(finalOwner).toLowerCase() !== buyerWallet.address.toLowerCase()) {
    throw new Error(
      `Seaport fulfillment completed but token ${tokenId} is owned by ${finalOwner}.`
    );
  }

  return {
    orderHash:
      order.orderHash ??
      (typeof order.getOrderHash === "function" ? await order.getOrderHash() : null),
    purchaseTxHash: purchaseTx.hash,
    purchaseBlockNumber: purchaseReceipt?.blockNumber ?? null,
    buyer: buyerWallet.address,
    seller: seller.address
  };
}

async function main() {
  fs.mkdirSync(deploymentsDir, { recursive: true });

  const bootstrap = await loadBootstrap();
  const seaDropDeployment = await deployFromArtifact(
    "SeaDrop",
    [],
    BigInt(process.env.REEF_SEADROP_GAS_LIMIT ?? "5000000")
  );
  const creatorFactoryDeployment = await deployFromArtifact(
    "ReefCreatorFactory",
    [seaDropDeployment.address],
    BigInt(process.env.REEF_CREATOR_FACTORY_GAS_LIMIT ?? "6500000")
  );
  const collectionCreation = await createCollection(creatorFactoryDeployment.address);
  const buyer = await createBuyerWallet();
  const mintResult = await mintCollectionItem(
    seaDropDeployment.address,
    collectionCreation.collectionAddress
  );
  const tradeResult = await createAndFulfillListing({
    seaportAddress: bootstrap.seaport,
    collectionAddress: collectionCreation.collectionAddress,
    tokenId: mintResult.tokenId,
    buyerWallet: buyer.wallet
  });

  const payload = {
    chainId,
    chainName,
    rpcUrl,
    deployer: seller.address,
    verified: true,
    collectionSlug,
    collectionName,
    collectionSymbol,
    collectionContractUri,
    collectionBaseUri,
    conduitController: bootstrap.conduitController,
    conduitControllerVerified: true,
    seaport: bootstrap.seaport,
    seaportVerified: true,
    seaDrop: seaDropDeployment.address,
    seaDropVerified: true,
    seaDropDeploymentTx: seaDropDeployment.txHash,
    creatorFactory: creatorFactoryDeployment.address,
    creatorFactoryVerified: true,
    creatorFactoryDeploymentTx: creatorFactoryDeployment.txHash,
    collectionImplementation: collectionCreation.collectionImplementation,
    collectionImplementationVerified: true,
    collection: collectionCreation.collectionAddress,
    collectionVerified: true,
    collectionCreationTx: collectionCreation.createCollectionTxHash,
    mintTxHash: mintResult.mintTxHash,
    mintTokenId: mintResult.tokenId.toString(),
    listingPriceWei: listingPrice.toString(),
    listingPriceDisplay: `${formatEther(listingPrice)} ${appConfig.network.nativeCurrency.symbol}`,
    orderHash: tradeResult.orderHash,
    purchaseTxHash: tradeResult.purchaseTxHash,
    purchaseBuyer: tradeResult.buyer,
    purchaseSeller: tradeResult.seller,
    buyerFundingTxHash: buyer.fundingTxHash,
    contracts: {
      conduitController: bootstrap.conduitController,
      seaport: bootstrap.seaport,
      seaDrop: seaDropDeployment.address,
      creatorFactory: creatorFactoryDeployment.address,
      collectionImplementation: collectionCreation.collectionImplementation,
      collection: collectionCreation.collectionAddress,
      marketplace: ""
    }
  };

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
}

await main();
