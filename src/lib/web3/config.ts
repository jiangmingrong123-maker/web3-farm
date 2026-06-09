import { createConfig, http, injected } from "wagmi";
import { mainnet } from "wagmi/chains";

const MAINNET_RPC =
  process.env.NEXT_PUBLIC_ETH_RPC_URL ?? "https://ethereum.publicnode.com";

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [mainnet.id]: http(MAINNET_RPC, { timeout: 30_000 }),
  },
  ssr: true,
});
