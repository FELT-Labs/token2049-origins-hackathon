import {
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  inkMainnet,
  inkSepolia,
  mainnet,
  monadTestnet,
  opbnbMainnet,
  opbnbTestnet,
  optimism,
  optimismSepolia,
  polygon,
  polygonMumbai,
  sepolia,
  shape,
  shapeSepolia,
  soneiumMainnet,
  soneiumMinato,
  unichainMainnet,
  unichainSepolia,
  worldChain,
  worldChainSepolia,
} from "@account-kit/infra";
import { Chain } from "viem";

export const celoSepolia: Chain = {
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Celo",
    symbol: "CELO",
  },
  rpcUrls: {
    default: {
      http: ["https://celo-sepolia.g.alchemy.com/v2/" + process.env.ALCHEMY_API_KEY],
    },
  },
  blockExplorers: {
    default: {
      name: "Celoscan",
      url: "https://sepolia.celoscan.io",
    },
  },
  testnet: true,
};

export interface ChainInfo {
  chain: Chain;
  name: string;
}

export const allChains: ChainInfo[] = [
  // Mainnet chains
  { chain: mainnet, name: "eth-mainnet" },
  { chain: arbitrum, name: "arb-mainnet" },
  { chain: optimism, name: "opt-mainnet" },
  { chain: base, name: "base-mainnet" },
  { chain: polygon, name: "polygon-mainnet" },
  { chain: worldChain, name: "worldchain-mainnet" },
  { chain: shape, name: "shape-mainnet" },
  { chain: unichainMainnet, name: "unichain-mainnet" },
  { chain: soneiumMainnet, name: "soneium-mainnet" },
  { chain: opbnbMainnet, name: "opbnb-mainnet" },
  { chain: inkMainnet, name: "ink-mainnet" },

  // Testnet chains
  { chain: sepolia, name: "eth-sepolia" },
  { chain: arbitrumSepolia, name: "arb-sepolia" },
  { chain: optimismSepolia, name: "opt-sepolia" },
  { chain: baseSepolia, name: "base-sepolia" },
  { chain: polygonMumbai, name: "polygon-mumbai" },
  { chain: worldChainSepolia, name: "worldchain-sepolia" },
  { chain: shapeSepolia, name: "shape-sepolia" },
  { chain: unichainSepolia, name: "unichain-sepolia" },
  { chain: soneiumMinato, name: "soneium-minato" },
  { chain: opbnbTestnet, name: "opbnb-testnet" },
  { chain: inkSepolia, name: "ink-sepolia" },
  { chain: monadTestnet, name: "monad-testnet" },
  { chain: celoSepolia, name: "celo-sepolia" },
];

const chains = Object.fromEntries(allChains.map(({ chain }) => [chain.id, chain]));

export function getChainById(chainId: number | string): Chain | undefined {
  const id = chainId.toString();
  return chains[id];
}
