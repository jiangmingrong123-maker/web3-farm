/**
 * Deploy NFTSwapEscrow (deposit model) to Ethereum mainnet.
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... npm run deploy:swap
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import solc from "solc";
import { createWalletClient, createPublicClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

const __dirname = dirname(fileURLToPath(import.meta.url));
const NOBODY = "0xa28d6a8eb65a41f3958f1de62cbfca20b817e66a";

const pk = process.env.DEPLOYER_PRIVATE_KEY;
const rpc = process.env.ETH_RPC_URL ?? "https://eth.llamarpc.com";

if (!pk) {
  console.error("Missing DEPLOYER_PRIVATE_KEY in environment");
  console.error("Copy .env.example to .env and set your deployer wallet private key");
  process.exit(1);
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

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (output.errors ?? []).filter((e) => e.severity === "error");
if (errors.length) {
  console.error(errors);
  process.exit(1);
}

const contract = output.contracts["NFTSwapEscrow.sol"].NFTSwapEscrow;
const abi = contract.abi;
const bytecode = contract.evm.bytecode.object;

const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
const wallet = createWalletClient({ account, chain: mainnet, transport: http(rpc) });
const publicClient = createPublicClient({ chain: mainnet, transport: http(rpc) });

const balance = await publicClient.getBalance({ address: account.address });
console.log("Deployer:", account.address);
console.log("Balance:", formatEther(balance), "ETH");

if (balance < BigInt(1e16)) {
  console.warn("Warning: balance may be too low for deployment");
}

console.log("\nDeploying NFTSwapEscrow...");
const hash = await wallet.deployContract({
  abi,
  bytecode: `0x${bytecode}`,
  args: [],
});

console.log("Tx:", hash);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
const address = receipt.contractAddress;
if (!address) {
  console.error("Deploy failed — no contract address");
  process.exit(1);
}

console.log("\n✅ NFTSwapEscrow deployed at:", address);

const whitelistHash = await wallet.writeContract({
  address,
  abi,
  functionName: "setCollectionWhitelist",
  args: [NOBODY, true],
});
await publicClient.waitForTransactionReceipt({ hash: whitelistHash });
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
};
writeFileSync(resolve(deployDir, "mainnet.json"), JSON.stringify(record, null, 2));

console.log("\n--- Next steps ---");
console.log("1. Cloudflare Pages → Environment variables:");
console.log(`   NEXT_PUBLIC_SWAP_CONTRACT=${address}`);
console.log("2. Retry deployment on Cloudflare");
console.log("3. Test swap at https://web3-farm.pages.dev/zh/swap/");
