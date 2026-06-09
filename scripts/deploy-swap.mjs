/**
 * Deploy NFTSwapEscrow to Ethereum mainnet.
 *
 * Prerequisites:
 *   npm install --save-dev solc
 *   Set DEPLOYER_PRIVATE_KEY and ETH_RPC_URL in .env
 *
 * Usage:
 *   node scripts/deploy-swap.mjs
 *
 * After deploy, whitelist Nobody and set NEXT_PUBLIC_SWAP_CONTRACT in Cloudflare.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import solc from "solc";
import {
  createWalletClient,
  createPublicClient,
  http,
  encodeDeployData,
  getContractAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

const __dirname = dirname(fileURLToPath(import.meta.url));
const NOBODY = "0xa28d6a8eb65a41f3958f1de62cbfca20b817e66a";

const pk = process.env.DEPLOYER_PRIVATE_KEY;
const rpc = process.env.ETH_RPC_URL ?? "https://eth.llamarpc.com";

if (!pk) {
  console.error("Set DEPLOYER_PRIVATE_KEY");
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
const contract = output.contracts["NFTSwapEscrow.sol"].NFTSwapEscrow;
const abi = contract.abi;
const bytecode = contract.evm.bytecode.object;

const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
const wallet = createWalletClient({ account, chain: mainnet, transport: http(rpc) });
const publicClient = createPublicClient({ chain: mainnet, transport: http(rpc) });

const hash = await wallet.deployContract({
  abi,
  bytecode: `0x${bytecode}`,
  args: [],
});

console.log("Deploy tx:", hash);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
const address = receipt.contractAddress;
console.log("NFTSwapEscrow deployed at:", address);

// whitelist Nobody
const whitelistHash = await wallet.writeContract({
  address,
  abi,
  functionName: "setCollectionWhitelist",
  args: [NOBODY, true],
});
await publicClient.waitForTransactionReceipt({ hash: whitelistHash });
console.log("Whitelisted Nobody:", NOBODY);
console.log("\nSet in Cloudflare Pages env:");
console.log(`NEXT_PUBLIC_SWAP_CONTRACT=${address}`);
