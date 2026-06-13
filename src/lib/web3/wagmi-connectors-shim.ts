/** Avoid @wagmi/connectors barrel (pulls optional deps that break Next build). */
// @ts-expect-error deep import — no package export for walletConnect.js
export { walletConnect } from "../../../node_modules/@wagmi/connectors/dist/esm/walletConnect.js";
