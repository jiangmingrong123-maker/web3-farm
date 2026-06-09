/**
 * Deploy NFTSwapEscrow (deposit model) to Ethereum mainnet.
 *
 * Usage (PowerShell):
 *   $env:DEPLOYER_PRIVATE_KEY="0x..."
 *   npm run deploy:swap
 *
 * Or create .env with DEPLOYER_PRIVATE_KEY and ETH_RPC_URL, then npm run deploy:swap
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import solc from "solc";
import { createWalletClient, createPublicClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

const __dirname = dirname(fileURLToPath(import.meta.url));
const NOBODY = "0xa28d6a8eb65a41f3958f1de62cbfca20b817e66a";

const DEFAULT_RPCS = [
  "https://ethereum.publicnode.com",
  "https://1rpc.io/eth",
  "https://eth.drpc.org",
  "https://rpc.ankr.com/eth",
  "https://eth.llamarpc.com",
];

function loadDotEnv() {
  const envPath = resolve(__dirname, "../.env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadDotEnv();

const pk = process.env.DEPLOYER_PRIVATE_KEY;
const customRpc = process.env.ETH_RPC_URL?.trim();
const rpcCandidates = customRpc ? [customRpc, ...DEFAULT_RPCS] : DEFAULT_RPCS;

if (!pk) {
  console.error("Missing DEPLOYER_PRIVATE_KEY");
  console.error("PowerShell: $env:DEPLOYER_PRIVATE_KEY=\"0x...\"");
  console.error("Or put it in .env next to package.json");
  process.exit(1);
}

function makeTransport(url) {
  return http(url, { timeout: 60_000, retryCount: 2, retryDelay: 1500 });
}

async function connectRpc() {
  const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
  let lastError;

  for (const url of rpcCandidates) {
    try {
      console.log(`Trying RPC: ${url}`);
      const publicClient = createPublicClient({
        chain: mainnet,
        transport: makeTransport(url),
      });
      const balance = await publicClient.getBalance({ address: account.address });
      const wallet = createWalletClient({
        account,
        chain: mainnet,
        transport: makeTransport(url),
      });
      console.log("RPC OK\n");
      return { publicClient, wallet, account, balance, rpcUrl: url };
    } catch (err) {
      lastError = err;
      console.warn(`  failed: ${err.shortMessage ?? err.message}\n`);
    }
  }

  console.error("All RPC endpoints failed. Try:");
  console.error("  1. Check VPN / network (China may block some RPCs)");
  console.error("  2. Set ETH_RPC_URL to Alchemy/Infura URL in .env");
  throw lastError;
}

const source = readFileSync(
  resolve(__dirname, "../contracts/NFTSwapEscrow.sol"),
  "utf8",
);

const input = {
  language: "Solidity",
  sources: { "NFTSwapEscrow.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } },
  },
};

console.log("Compiling NFTSwapEscrow...");
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (output.errors ?? []).filter((e) => e.severity === "error");
if (errors.length) {
  console.error(errors);
  process.exit(1);
}

const contract = output.contracts["NFTSwapEscrow.sol"].NFTSwapEscrow;
const abi = contract.abi;
const bytecode = contract.evm.bytecode.object;

const { publicClient, wallet, account, balance, rpcUrl } = await connectRpc();

console.log("Deployer (wallet):", account.address);
console.log("Balance:", formatEther(balance), "ETH");
console.log("Using RPC:", rpcUrl);
console.log("");
console.log("NOTE: Deployer address is your WALLET, not the contract.");
console.log("Contract address appears after deployment succeeds.\n");

if (balance < BigInt(1e16)) {
  console.warn("Warning: balance may be too low for deployment");
}

console.log("Deploying NFTSwapEscrow...");
const hash = await wallet.deployContract({
  abi,
  bytecode: `0x${bytecode}`,
  args: [],
});

console.log("Tx:", hash);
console.log(`Track: https://etherscan.io/tx/${hash}`);

const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 300_000 });
const address = receipt.contractAddress;
if (!address) {
  console.error("Deploy failed — no contract address in receipt");
  process.exit(1);
}

console.log("\n✅ NFTSwapEscrow deployed at:", address);
console.log(`   https://etherscan.io/address/${address}`);

console.log("\nWhitelisting Nobody collection...");
const whitelistHash = await wallet.writeContract({
  address,
  abi,
  functionName: "setCollectionWhitelist",
  args: [NOBODY, true],
});
await publicClient.waitForTransactionReceipt({ hash: whitelistHash, timeout: 300_000 });
console.log("✅ Whitelisted Nobody:", NOBODY);

const deployDir = resolve(__dirname, "../deployments");
mkdirSync(deployDir, { recursive: true });
const record = {
  network: "mainnet",
  address,
  deployer: account.address,
  txHash: hash,
  whitelisted: [NOBODY],
  deployedAt: new Date().toISOString(),
  rpcUrl,
};
writeFileSync(resolve(deployDir, "mainnet.json"), JSON.stringify(record, null, 2));

console.log("\n--- Cloudflare: paste THIS address (not your wallet) ---");
console.log(`NEXT_PUBLIC_SWAP_CONTRACT=${address}`);
console.log("\nThen: Deployments → Retry deployment");
