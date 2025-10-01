"use client";

import { useMemo } from "react";
import { formatUnits, parseAbi } from "viem";
import { useReadContract } from "wagmi";
import { useClient } from "~~/hooks/scaffold-alchemy/useClient";
import { useWatchBalance } from "~~/hooks/scaffold-alchemy/useWatchBalance";

// ERC20 ABI for balanceOf function
const ERC20_ABI = parseAbi(["function balanceOf(address owner) view returns (uint256)"]);

export interface TokenConfig {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
  status: "eligible" | "coming-soon";
  statusText: string;
  vaultId: string;
  emoji: string;
  name: string;
  currentYield: string;
  riskLevel: "low" | "medium" | "high";
  description: string;
  targetYield?: string;
}

// Token configurations with vault information
const TOKEN_CONFIGS: TokenConfig[] = [
  {
    symbol: "USDC",
    address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USDC mainnet
    decimals: 6,
    status: "eligible",
    statusText: "✅ Eligible for investing",
    vaultId: "usdc",
    emoji: "💵",
    name: "USDC Vault",
    currentYield: "8.2%",
    riskLevel: "low",
    description:
      "Your USDC is automatically deployed across the best DeFi lending protocols and yield farming opportunities. We continuously optimize to maximize your returns while maintaining stability.",
  },
  {
    symbol: "ETH",
    address: "0x0000000000000000000000000000000000000000", // Native ETH
    decimals: 18,
    status: "coming-soon",
    statusText: "🔄 Coming Soon",
    vaultId: "eth",
    emoji: "⚡",
    name: "ETH Vault",
    currentYield: "~6%",
    riskLevel: "medium",
    description:
      "Optimize your ETH holdings through staking rewards, DeFi protocols, and yield strategies while maintaining exposure to ETH price appreciation.",
    targetYield: "~6%",
  },
  {
    symbol: "BTC",
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC mainnet
    decimals: 8,
    status: "coming-soon",
    statusText: "🔄 Coming Soon",
    vaultId: "btc",
    emoji: "₿",
    name: "Bitcoin Vault",
    currentYield: "~4%",
    riskLevel: "medium",
    description:
      "Generate yield on your Bitcoin through wrapped BTC lending and institutional-grade yield strategies while maintaining BTC exposure.",
    targetYield: "~4%",
  },
];

// Mock investment positions (in practice, this would come from smart contracts)
const MOCK_POSITIONS = {
  usdc: {
    invested: 750.0,
    earnedYield: 25.5,
    currentValue: 775.5,
  },
  eth: {
    invested: 0,
    earnedYield: 0,
    currentValue: 0,
  },
  btc: {
    invested: 0,
    earnedYield: 0,
    currentValue: 0,
  },
};

export interface TokenBalance {
  symbol: string;
  balance: string;
  balanceFormatted: string;
  balanceUSD: string;
  isLoading: boolean;
  isError: boolean;
}

export interface VaultPosition {
  vaultId: string;
  invested: number;
  earnedYield: number;
  currentValue: number;
  investedFormatted: string;
  earnedYieldFormatted: string;
  currentValueFormatted: string;
}

export interface TokenData extends TokenConfig {
  balance: TokenBalance;
  position: VaultPosition;
  totalDeposits: string;
  vaultStatus: "active" | "coming-soon";
}

const useIndividualTokenBalance = (config: TokenConfig, userAddress: `0x${string}` | undefined) => {
  // Handle ETH balance separately
  const {
    data: ethBalance,
    isLoading: ethLoading,
    isError: ethError,
  } = useWatchBalance({
    address: userAddress,
  });

  // Handle ERC20 token balances
  const {
    data: tokenBalance,
    isLoading: tokenLoading,
    isError: tokenError,
  } = useReadContract({
    address: config.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && config.symbol !== "ETH",
    },
  });

  return useMemo(() => {
    const isLoading = config.symbol === "ETH" ? ethLoading : tokenLoading;
    const isError = config.symbol === "ETH" ? ethError : tokenError;
    const balance = config.symbol === "ETH" ? ethBalance?.value : tokenBalance;

    if (isLoading) {
      return {
        symbol: config.symbol,
        balance: "0",
        balanceFormatted: "Loading...",
        balanceUSD: "Loading...",
        isLoading: true,
        isError: false,
      };
    }

    if (isError || !balance) {
      return {
        symbol: config.symbol,
        balance: "0",
        balanceFormatted: "Error",
        balanceUSD: "Error",
        isLoading: false,
        isError: true,
      };
    }

    const formatted = formatUnits(balance, config.decimals);
    const numBalance = parseFloat(formatted);

    // Mock USD conversion rates for demo
    const usdRates: Record<string, number> = {
      USDC: 1,
      ETH: 2500,
      BTC: 45000,
    };

    const usdValue = numBalance * (usdRates[config.symbol] || 0);

    return {
      symbol: config.symbol,
      balance: formatted,
      balanceFormatted:
        config.symbol === "USDC" ? `$${numBalance.toFixed(2)}` : `${numBalance.toFixed(4)} ${config.symbol}`,
      balanceUSD: `$${usdValue.toFixed(2)}`,
      isLoading: false,
      isError: false,
    };
  }, [config.symbol, config.decimals, ethBalance, ethError, ethLoading, tokenBalance, tokenError, tokenLoading]);
};

export const useTokenData = () => {
  const { address } = useClient();

  // Get all token balances using hooks (must be called at top level)
  const usdcBalance = useIndividualTokenBalance(TOKEN_CONFIGS[0], address as `0x${string}` | undefined);
  const ethBalance = useIndividualTokenBalance(TOKEN_CONFIGS[1], address as `0x${string}` | undefined);
  const btcBalance = useIndividualTokenBalance(TOKEN_CONFIGS[2], address as `0x${string}` | undefined);

  const tokenData = useMemo(() => {
    const balances = [usdcBalance, ethBalance, btcBalance];

    return TOKEN_CONFIGS.map((config, index): TokenData => {
      const position = MOCK_POSITIONS[config.vaultId as keyof typeof MOCK_POSITIONS];
      const balance = balances[index];

      return {
        ...config,
        balance,
        position: {
          vaultId: config.vaultId,
          invested: position.invested,
          earnedYield: position.earnedYield,
          currentValue: position.currentValue,
          investedFormatted: `$${position.invested.toFixed(2)}`,
          earnedYieldFormatted: position.earnedYield > 0 ? `+$${position.earnedYield.toFixed(2)}` : "$0.00",
          currentValueFormatted: `$${position.currentValue.toFixed(2)}`,
        },
        totalDeposits: config.vaultId === "usdc" ? "$4.2M" : "In Development",
        vaultStatus: config.status === "eligible" ? "active" : "coming-soon",
      };
    });
  }, [usdcBalance, ethBalance, btcBalance]);

  // Utility functions
  const getTokenBySymbol = (symbol: string) => {
    return tokenData.find(token => token.symbol === symbol);
  };

  const getVaultById = (vaultId: string) => {
    return tokenData.find(token => token.vaultId === vaultId);
  };

  const getTotalPortfolioValue = () => {
    return tokenData.reduce((total, token) => {
      return total + token.position.currentValue;
    }, 0);
  };

  const getTotalInvested = () => {
    return tokenData.reduce((total, token) => {
      return total + token.position.invested;
    }, 0);
  };

  const getTotalYield = () => {
    return tokenData.reduce((total, token) => {
      return total + token.position.earnedYield;
    }, 0);
  };

  // Mock function to simulate investment (in practice, this would interact with smart contracts)
  const simulateInvestment = (vaultId: string, amount: number) => {
    console.log(`Simulating investment of $${amount} in ${vaultId} vault`);
    // In a real app, this would:
    // 1. Call smart contract to deposit tokens
    // 2. Update user's position
    // 3. Refresh balances
    return Promise.resolve({
      success: true,
      transactionHash: "0x123...",
      newPosition: amount,
    });
  };

  return {
    tokenData,
    getTokenBySymbol,
    getVaultById,
    getTotalPortfolioValue,
    getTotalInvested,
    getTotalYield,
    simulateInvestment,
    isConnected: !!address,
    userAddress: address,
  };
};

// Individual token balance hook for components that need real-time balance updates
export const useTokenBalance = (symbol: string) => {
  const { address } = useClient();
  const config = TOKEN_CONFIGS.find(c => c.symbol === symbol);

  if (!config) {
    throw new Error(`Token configuration not found for symbol: ${symbol}`);
  }

  return useIndividualTokenBalance(config, address as `0x${string}` | undefined);
};
