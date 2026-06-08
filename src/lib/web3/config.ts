import { createConfig, http, injected } from "wagmi";
import { mainnet } from "wagmi/chains";

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [mainnet.id]: http(),
  },
  ssr: true,
});
