use anyhow::{bail, Context, Result};
use jsonrpsee::{
    core::client::ClientT,
    http_client::{HttpClient, HttpClientBuilder},
    rpc_params,
};
use pallet_revive::{create1, keccak_256};
use pallet_revive::evm::{
    Account, BlockTag, Bytes, GenericTransaction, H160, H256, ReceiptInfo,
    TransactionLegacyUnsigned, TransactionUnsigned, U256,
};
use serde::{de::DeserializeOwned, Serialize};
use std::{env, fs, time::Duration};

#[derive(Serialize)]
struct DeployOutput {
    ok: bool,
    rpc_url: String,
    deployer: String,
    substrate_account: String,
    nonce: String,
    balance: String,
    tx_hash: String,
    block_number: String,
    gas_estimated: String,
    gas_used: String,
    contract_address: String,
    code_len: usize,
    receipt_found: bool,
}

struct ReefRpcClient {
    inner: HttpClient,
}

impl ReefRpcClient {
    fn new(rpc_url: &str) -> Result<Self> {
        Ok(Self { inner: HttpClientBuilder::default().build(rpc_url)? })
    }

    async fn request<T: DeserializeOwned>(
        &self,
        method: &'static str,
        params: jsonrpsee::core::params::ArrayParams,
    ) -> Result<T> {
        self.inner
            .request(method, params)
            .await
            .with_context(|| format!("{method} failed"))
    }

    async fn chain_id(&self) -> Result<U256> {
        self.request("eth_chainId", rpc_params![]).await
    }

    async fn gas_price(&self) -> Result<U256> {
        self.request("eth_gasPrice", rpc_params![]).await
    }

    async fn get_transaction_count(&self, address: H160, block: BlockTag) -> Result<U256> {
        self.request("eth_getTransactionCount", rpc_params![address, block]).await
    }

    async fn get_balance(&self, address: H160, block: BlockTag) -> Result<U256> {
        self.request("eth_getBalance", rpc_params![address, block]).await
    }

    async fn estimate_gas(&self, transaction: GenericTransaction) -> Result<U256> {
        self.request("eth_estimateGas", rpc_params![transaction, Option::<BlockTag>::None]).await
    }

    async fn send_raw_transaction(&self, payload: Vec<u8>) -> Result<H256> {
        self.request("eth_sendRawTransaction", rpc_params![Bytes(payload)]).await
    }

    async fn get_transaction_receipt(&self, hash: H256) -> Result<Option<ReceiptInfo>> {
        self.request("eth_getTransactionReceipt", rpc_params![hash]).await
    }

    async fn get_code(&self, address: H160, block: BlockTag) -> Result<Bytes> {
        self.request("eth_getCode", rpc_params![address, block]).await
    }
}

fn read_env(name: &str) -> Result<String> {
    env::var(name).with_context(|| format!("{name} is required"))
}

fn parse_secret_key(secret: &str) -> Result<[u8; 32]> {
    let trimmed = secret.trim().trim_start_matches("0x");
    let bytes = hex::decode(trimmed).with_context(|| "PRIVATE_KEY must be hex")?;
    if bytes.len() != 32 {
        bail!("PRIVATE_KEY must decode to 32 bytes, got {}", bytes.len());
    }
    let mut array = [0u8; 32];
    array.copy_from_slice(&bytes);
    Ok(array)
}

fn parse_hex_bytes(name: &str, value: &str) -> Result<Vec<u8>> {
    let trimmed = value.trim().trim_start_matches("0x");
    hex::decode(trimmed).with_context(|| format!("{name} must be hex"))
}

fn parse_h160_env(name: &str) -> Result<Option<H160>> {
    let Some(value) = env::var(name).ok() else {
        return Ok(None);
    };
    let trimmed = value.trim().trim_start_matches("0x");
    let bytes = hex::decode(trimmed).with_context(|| format!("{name} must be hex"))?;
    if bytes.len() != 20 {
        bail!("{name} must decode to 20 bytes, got {}", bytes.len());
    }
    Ok(Some(H160::from_slice(&bytes)))
}

fn load_transaction_input() -> Result<Vec<u8>> {
    if let Ok(call_data_hex) = env::var("CALL_DATA_HEX") {
        return parse_hex_bytes("CALL_DATA_HEX", &call_data_hex);
    }

    if let Ok(init_code_hex) = env::var("INIT_CODE_HEX") {
        return parse_hex_bytes("INIT_CODE_HEX", &init_code_hex);
    }

    let artifact_path = env::var("ARTIFACT_JSON_PATH").unwrap_or_else(|_| {
        "/Users/anukul/Desktop/reef-opensea-fork-monorepo/packages/contracts/out/ReefDeploymentProbe.sol/ReefDeploymentProbe.json"
            .to_string()
    });
    let artifact = fs::read_to_string(&artifact_path)
        .with_context(|| format!("failed to read artifact at {artifact_path}"))?;
    let value: serde_json::Value =
        serde_json::from_str(&artifact).with_context(|| "artifact is not valid JSON")?;
    let bytecode = value
        .get("bytecode")
        .and_then(|v| v.get("object"))
        .and_then(|v| v.as_str())
        .filter(|v| !v.is_empty() && *v != "0x")
        .with_context(|| format!("artifact at {artifact_path} does not contain bytecode.object"))?;
    parse_hex_bytes("ARTIFACT_JSON_PATH bytecode.object", bytecode)
}

fn read_u64_env(name: &str, default: u64) -> u64 {
    env::var(name)
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(default)
}

fn read_u256_env(name: &str) -> Result<Option<U256>> {
    let Some(value) = env::var(name).ok() else {
        return Ok(None);
    };
    let parsed = value
        .parse::<u128>()
        .with_context(|| format!("{name} must be a base-10 integer"))?;
    Ok(Some(U256::from(parsed)))
}

#[tokio::main]
async fn main() -> Result<()> {
    let rpc_url = env::var("REEF_RPC_URL").unwrap_or_else(|_| "http://127.0.0.1:8545".to_string());
    let rpc_url = rpc_url.replace("host.docker.internal", "127.0.0.1");
    let private_key = read_env("PRIVATE_KEY")?;

    let secret_key = parse_secret_key(&private_key)?;
    let input = load_transaction_input()?;
    let account = Account::from_secret_key(secret_key);
    let client = ReefRpcClient::new(&rpc_url)?;
    let tx_to = parse_h160_env("TX_TO_ADDRESS")?;
    let expected_code_address = parse_h160_env("EXPECT_CODE_ADDRESS")?;

    let nonce = client
        .get_transaction_count(account.address(), BlockTag::Latest.into())
        .await
        .context("failed to fetch nonce")?;
    let balance = client
        .get_balance(account.address(), BlockTag::Latest.into())
        .await
        .context("failed to fetch balance")?;

    let chain_id = client.chain_id().await.context("failed to fetch chain id")?;
    let gas_price = read_u256_env("REEF_GAS_PRICE_WEI")?
        .unwrap_or(client.gas_price().await.context("failed to fetch gas price")?);
    let gas_estimated = client
        .estimate_gas(GenericTransaction {
            from: Some(account.address()),
            input: input.clone().into(),
            value: Some(U256::zero()),
            gas_price: Some(gas_price),
            to: tx_to,
            ..Default::default()
        })
        .await
        .context("failed to estimate gas")?;
    let gas_limit = read_u256_env("REEF_GAS_LIMIT")?.unwrap_or(gas_estimated);

    let unsigned_tx: TransactionUnsigned = TransactionLegacyUnsigned {
        gas: gas_limit,
        nonce,
        to: tx_to,
        value: U256::zero(),
        input: Bytes(input),
        gas_price,
        chain_id: Some(chain_id),
        ..Default::default()
    }
    .into();

    let signed_tx = account.sign_transaction(unsigned_tx);
    let signed_payload = signed_tx.signed_payload();
    let expected_tx_hash = H256::from_slice(&keccak_256(&signed_payload));

    let tx_hash = match client.send_raw_transaction(signed_payload).await {
        Ok(submitted_hash) => submitted_hash,
        Err(error) => {
            let message = format!("{error:#}");
            if message.contains("Transaction Already Imported") {
                expected_tx_hash
            } else {
                return Err(error).context("failed to submit deployment transaction");
            }
        }
    };

    let predicted_contract_address = expected_code_address
        .or_else(|| {
            if tx_to.is_none() {
                Some(create1(&account.address(), nonce.as_u64()))
            } else {
                None
            }
        })
        .or(tx_to)
        .context("failed to resolve transaction target address")?;
    let poll_interval_secs = read_u64_env("REEF_DEPLOY_POLL_INTERVAL_SECS", 2);
    let max_wait_secs = read_u64_env("REEF_DEPLOY_MAX_WAIT_SECS", 180);
    let attempts = std::cmp::max(1, max_wait_secs / std::cmp::max(1, poll_interval_secs));

    let mut receipt: Option<ReceiptInfo> = None;
    let mut code: Option<Bytes> = None;

    for _ in 0..attempts {
        tokio::time::sleep(Duration::from_secs(poll_interval_secs)).await;

        if receipt.is_none() {
            if let Some(found_receipt) = client
                .get_transaction_receipt(tx_hash)
                .await
                .context("failed while polling transaction receipt")?
            {
                if !found_receipt.is_success() {
                    bail!("transaction failed receipt: {found_receipt:?}");
                }
                receipt = Some(found_receipt);
            }
        }

        if receipt.is_some() {
            let found_code = client
                .get_code(predicted_contract_address, BlockTag::Latest.into())
                .await
                .context("failed to fetch deployed code")?;

            if !found_code.0.is_empty() {
                code = Some(found_code);
                break;
            }

            if tx_to.is_some() && expected_code_address.is_none() {
                break;
            }
        }
    }

    let receipt = receipt.context("failed to observe a successful transaction receipt")?;
    let code_required = tx_to.is_none() || expected_code_address.is_some() || receipt.contract_address.is_some();
    let code = if code_required {
        Some(code.context(format!(
            "failed to observe bytecode at contract address {:?}",
            predicted_contract_address
        ))?)
    } else {
        None
    };
    let contract_address = receipt
        .contract_address
        .or(expected_code_address)
        .or(tx_to)
        .unwrap_or(predicted_contract_address);

    let output = DeployOutput {
        ok: code
            .as_ref()
            .map(|found_code| !found_code.0.is_empty())
            .unwrap_or(true),
        rpc_url,
        deployer: format!("{:?}", account.address()),
        substrate_account: account.substrate_account().to_string(),
        nonce: nonce.to_string(),
        balance: balance.to_string(),
        tx_hash: format!("{:?}", tx_hash),
        block_number: receipt.block_number.to_string(),
        gas_estimated: gas_estimated.to_string(),
        gas_used: receipt.gas_used.to_string(),
        contract_address: format!("{:?}", contract_address),
        code_len: code.as_ref().map(|found_code| found_code.0.len()).unwrap_or(0),
        receipt_found: true,
    };

    println!("{}", serde_json::to_string_pretty(&output)?);

    if code_required && !output.ok {
        bail!("deployed contract returned empty bytecode");
    }

    Ok(())
}
