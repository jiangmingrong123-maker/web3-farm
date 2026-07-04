import { createConfig, http } from "wagmi";
import { walletConnect } from "@/lib/web3/wagmi-connectors-shim";
import { mainnet } from "wagmi/chains";
import {
  NAMED_WALLET_CONNECTORS,
  genericInjectedConnector,
} from "@/lib/web3/connectors-list";

const MAINNET_RPC =
  process.env.NEXT_PUBLIC_ETH_RPC_URL ?? "https://ethereum.publicnode.com";

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "https://web3-farm.pages.dev";

const connectors = [
  ...NAMED_WALLET_CONNECTORS,
  genericInjectedConnector,
  ...(WC_PROJECT_ID ?
    [
      walletConnect({
        projectId: WC_PROJECT_ID,
        metadata: {
          name: "Web3 Farm",
          description: "NFT exhibition hall & swap",
          url: SITE_URL,
          icons: [`${SITE_URL}/favicon.ico`],
        },
        showQrModal: true,
      }),
    ]
  : []),
];

export const hasWalletConnect = Boolean(WC_PROJECT_ID);

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors,
  transports: {
    [mainnet.id]: http(MAINNET_RPC, { timeout: 30_000 }),
  },
  ssr: false,
});
