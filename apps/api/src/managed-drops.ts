import { Contract, JsonRpcProvider, Wallet } from "ethers";

import { config, nodeConfig } from "./config.js";
import {
    archiveAdminDrop as archiveAdminDropRecord,
    listAdminDrops as listAdminDropsFromDb,
    upsertAdminDrop as upsertAdminDropRecord,
    type AdminDropRecord
} from "./db.js";

const dropManagerAbi = [
    "function upsertDrop((string slug, string name, string creatorName, string creatorSlug, string coverUrl, uint8 stage, string mintPrice, uint256 supply, string startLabel, string description) drop) returns (bool created)",
    "function archiveDrop(string slug) external",
    "function dropCount() view returns (uint256)",
    "function getDropAt(uint256 index) view returns (bool exists, bool archived, uint8 stage, uint256 supply, uint64 updatedAt, string slug, string name, string creatorName, string creatorSlug, string coverUrl, string mintPrice, string startLabel, string description)"
] as const;

const stageByName: Record<string, number> = {
    draft: 0,
    live: 1,
    upcoming: 2,
    ended: 3
};

const stageLabels = ["draft", "live", "upcoming", "ended"] as const;
const minimumReefGasPriceWei = BigInt(
    process.env.REEF_GAS_PRICE_WEI?.trim() || "1000000000"
);

function maxBigInt(left: bigint, right: bigint) {
    return left > right ? left : right;
}

function normalizeRpcUrl(rpcUrl: string) {
    return rpcUrl.includes("host.docker.internal") && !process.env.RUNNING_IN_DOCKER
        ? rpcUrl.replace("host.docker.internal", "127.0.0.1")
        : rpcUrl;
}

function dropManagerAddress() {
    return (
        nodeConfig.contracts.dropManager.address ||
        nodeConfig.contracts.fallback.dropManager.address ||
        ""
    ).trim();
}

function normalizeStageValue(stage: number) {
    return stageLabels[stage] ?? "draft";
}

function isInternalVerificationDrop(
    drop: Pick<AdminDropRecord, "slug" | "name" | "creatorSlug" | "description">
) {
    const slug = drop.slug.trim().toLowerCase();
    const name = drop.name.trim().toLowerCase();
    const creatorSlug = drop.creatorSlug.trim().toLowerCase();
    const description = drop.description.trim().toLowerCase();

    return (
        creatorSlug === "reef-team" &&
        slug.startsWith("launch-") &&
        name.startsWith("launch ") &&
        description.includes("drop record written through the on-chain drop manager")
    );
}

function provider() {
    return new JsonRpcProvider(normalizeRpcUrl(config.rpcUrl));
}

function contractWithProvider() {
    const address = dropManagerAddress();
    if (!address) {
        return null;
    }
    return new Contract(address, dropManagerAbi, provider());
}

async function signerContract() {
    const address = dropManagerAddress();
    if (!address) {
        throw new Error("Drop manager contract is not configured for this Reef environment.");
    }

    const privateKey = process.env.PRIVATE_KEY?.trim();
    if (!privateKey) {
        throw new Error("PRIVATE_KEY is required to relay drop management transactions.");
    }

    const rpcProvider = provider();
    const signer = new Wallet(privateKey, rpcProvider);
    return {
        signer,
        contract: new Contract(address, dropManagerAbi, signer),
        provider: rpcProvider
    };
}

async function sendDropManagerTransaction(
    methodName: "upsertDrop" | "archiveDrop",
    args: unknown[]
) {
    const { signer, contract, provider: rpcProvider } = await signerContract();
    const contractMethod = contract.getFunction(methodName);
    const txRequest = await contractMethod.populateTransaction(...args);
    const estimatedGas = await rpcProvider.estimateGas({
        from: signer.address,
        to: txRequest.to ?? undefined,
        data: txRequest.data ?? undefined,
        value: txRequest.value ?? undefined
    });
    const feeData = await rpcProvider.getFeeData().catch(() => null);
    const gasPrice = maxBigInt(
        feeData?.gasPrice ?? feeData?.maxFeePerGas ?? minimumReefGasPriceWei,
        minimumReefGasPriceWei
    );
    const nonce = await rpcProvider.getTransactionCount(signer.address, "pending");

    const tx = await signer.sendTransaction({
        ...txRequest,
        type: 0,
        nonce,
        gasLimit: estimatedGas + estimatedGas / 20n + 1n,
        gasPrice
    });
    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
        throw new Error(`Drop manager transaction reverted on Reef: ${tx.hash}`);
    }

    return receipt;
}

function toDropRecord(
    raw: {
        archived: boolean;
        stage: number;
        supply: bigint;
        updatedAt: bigint;
        slug: string;
        name: string;
        creatorName: string;
        creatorSlug: string;
        coverUrl: string;
        mintPrice: string;
        startLabel: string;
        description: string;
    },
    mirror?: AdminDropRecord
): AdminDropRecord {
    const updatedAtIso = new Date(Number(raw.updatedAt) * 1000).toISOString();
    return {
        slug: raw.slug,
        name: raw.name,
        creatorName: raw.creatorName,
        creatorSlug: raw.creatorSlug,
        coverUrl: raw.coverUrl,
        stage: normalizeStageValue(raw.stage),
        mintPrice: raw.mintPrice,
        supply: Number(raw.supply),
        startLabel: raw.startLabel,
        description: raw.description,
        createdBy: mirror?.createdBy ?? config.adminWallets[0] ?? "",
        updatedBy: mirror?.updatedBy ?? config.adminWallets[0] ?? "",
        archived: raw.archived,
        createdAt: mirror?.createdAt ?? updatedAtIso,
        updatedAt: updatedAtIso
    };
}

export async function listAdminDrops(options?: {
    stage?: string;
    includeArchived?: boolean;
    includeInternal?: boolean;
}) {
    const shouldIncludeInternal = Boolean(options?.includeInternal);
    const applyVisibilityFilter = (drops: AdminDropRecord[]) =>
        shouldIncludeInternal ? drops : drops.filter((drop) => !isInternalVerificationDrop(drop));

    const contract = contractWithProvider();
    if (!contract) {
        return applyVisibilityFilter(await listAdminDropsFromDb(options));
    }

    try {
        const [countValue, mirroredDrops] = await Promise.all([
            contract.dropCount() as Promise<bigint>,
            listAdminDropsFromDb({ includeArchived: true })
        ]);
        const mirroredBySlug = new Map(mirroredDrops.map((drop) => [drop.slug, drop] as const));
        const count = Number(countValue);
        const drops: AdminDropRecord[] = [];

        for (let index = 0; index < count; index += 1) {
            const result = await contract.getDropAt(index);
            const exists = Boolean(result.exists ?? result[0]);
            const archived = Boolean(result.archived ?? result[1]);
            const stage = Number(result.stage ?? result[2]);
            const supply = BigInt(result.supply ?? result[3]);
            const updatedAt = BigInt(result.updatedAt ?? result[4]);
            const slug = String(result.slug ?? result[5]);

            if (!exists) {
                continue;
            }

            const normalized = toDropRecord(
                {
                    archived,
                    stage,
                    supply,
                    updatedAt,
                    slug,
                    name: String(result.name ?? result[6]),
                    creatorName: String(result.creatorName ?? result[7]),
                    creatorSlug: String(result.creatorSlug ?? result[8]),
                    coverUrl: String(result.coverUrl ?? result[9]),
                    mintPrice: String(result.mintPrice ?? result[10]),
                    startLabel: String(result.startLabel ?? result[11]),
                    description: String(result.description ?? result[12])
                },
                mirroredBySlug.get(slug)
            );

            if (!options?.includeArchived && normalized.archived) {
                continue;
            }

            if (options?.stage && options.stage !== "all" && normalized.stage !== options.stage.toLowerCase()) {
                continue;
            }

            drops.push(normalized);
        }

        drops.sort((left, right) => {
            if (left.archived !== right.archived) {
                return left.archived ? 1 : -1;
            }
            return right.updatedAt.localeCompare(left.updatedAt);
        });

        return applyVisibilityFilter(drops);
    } catch {
        return applyVisibilityFilter(await listAdminDropsFromDb(options));
    }
}

export async function upsertAdminDrop(input: {
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
    actorAddress: string;
}) {
    const address = dropManagerAddress();
    if (address) {
        const stage = stageByName[input.stage.toLowerCase()];
        if (stage === undefined) {
            throw new Error(`Unsupported drop stage: ${input.stage}`);
        }

        await sendDropManagerTransaction("upsertDrop", [
            {
                slug: input.slug,
                name: input.name,
                creatorName: input.creatorName,
                creatorSlug: input.creatorSlug,
                coverUrl: input.coverUrl,
                stage,
                mintPrice: input.mintPrice,
                supply: BigInt(input.supply),
                startLabel: input.startLabel,
                description: input.description
            }
        ]);
    }

    await upsertAdminDropRecord(input);
}

export async function archiveAdminDrop(slug: string, actorAddress: string) {
    if (dropManagerAddress()) {
        await sendDropManagerTransaction("archiveDrop", [slug]);
    }

    await archiveAdminDropRecord(slug, actorAddress);
}
