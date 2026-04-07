use anyhow::{bail, Context, Result};
use jsonrpsee::{
    core::client::ClientT,
    http_client::{HttpClient, HttpClientBuilder},
    rpc_params,
};
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

fn parse_hex_bytes(value: &str) -> Result<Vec<u8>> {
    let trimmed = value.trim().trim_start_matches("0x");
    hex::decode(trimmed).with_context(|| "INIT_CODE_HEX must be hex")
}

fn load_init_code() -> Result<Vec<u8>> {
    if let Ok(init_code_hex) = env::var("INIT_CODE_HEX") {
        return parse_hex_bytes(&init_code_hex);
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
    parse_hex_bytes(bytecode)
}

#[tokio::main]
async fn main() -> Result<()> {
    let rpc_url = env::var("REEF_RPC_URL").unwrap_or_else(|_| "http://127.0.0.1:8545".to_string());
    let rpc_url = rpc_url.replace("host.docker.internal", "127.0.0.1");
    let private_key = read_env("PRIVATE_KEY")?;

    let secret_key = parse_secret_key(&private_key)?;
    let input = load_init_code()?;
    let account = Account::from_secret_key(secret_key);
    let client = ReefRpcClient::new(&rpc_url)?;

    let nonce = client
        .get_transaction_count(account.address(), BlockTag::Latest.into())
        .await
        .context("failed to fetch nonce")?;
    let balance = client
        .get_balance(account.address(), BlockTag::Latest.into())
        .await
        .context("failed to fetch balance")?;

    let chain_id = client.chain_id().await.context("failed to fetch chain id")?;
    let gas_price = client.gas_price().await.context("failed to fetch gas price")?;
    let gas_estimated = client
        .estimate_gas(GenericTransaction {
            from: Some(account.address()),
            input: input.clone().into(),
            value: Some(U256::zero()),
            gas_price: Some(gas_price),
            to: None,
            ..Default::default()
        })
        .await
        .context("failed to estimate gas")?;

    let unsigned_tx: TransactionUnsigned = TransactionLegacyUnsigned {
        gas: gas_estimated,
        nonce,
        to: None,
        value: U256::zero(),
        input: Bytes(input),
        gas_price,
        chain_id: Some(chain_id),
        ..Default::default()
    }
    .into();

    let signed_tx = account.sign_transaction(unsigned_tx);
    let tx_hash = client
        .send_raw_transaction(signed_tx.signed_payload())
        .await
        .context("failed to submit deployment transaction")?;

    let mut receipt = None;
    for _ in 0..30 {
        tokio::time::sleep(Duration::from_secs(2)).await;
        if let Some(found_receipt) = client
            .get_transaction_receipt(tx_hash)
            .await
            .context("failed while polling transaction receipt")?
        {
            if !found_receipt.is_success() {
                bail!("transaction failed receipt: {found_receipt:?}");
            }
            receipt = Some(found_receipt);
            break;
        }
    }
    let receipt = receipt.context("failed to wait for receipt")?;
    let contract_address = receipt
        .contract_address
        .context("receipt did not include contract address")?;
    let code = client
        .get_code(contract_address, BlockTag::Latest.into())
        .await
        .context("failed to fetch deployed code")?;

    let output = DeployOutput {
        ok: !code.0.is_empty(),
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
        code_len: code.0.len(),
    };

    println!("{}", serde_json::to_string_pretty(&output)?);

    if !output.ok {
        bail!("deployed contract returned empty bytecode");
    }

    Ok(())
}
