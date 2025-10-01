"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseAbi } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { useClient } from "~~/hooks/scaffold-alchemy/useClient";
import { useWatchBalance } from "~~/hooks/scaffold-alchemy/useWatchBalance";
import { useAccountType } from "~~/hooks/useAccountType";
import { useVault } from "~~/hooks/useVault";

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
    address: "0x62090CD0807c1d2E080f48f18F5893060b1a3C62", // mock USDC sepolia
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
    address: "0x0000000000000000000000000000000000000000", // Sepolia ETH
    decimals: 18,
    status: "coming-soon",
    statusText: "⏳ Coming Soon",
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
    symbol: "WBTC",
    address: "0x1B083D8584dd3e6Ff37d04a6e7e82b5F622f3985", // WBTC sepolia
    decimals: 18,
    status: "coming-soon",
    statusText: "⏳ Coming Soon",
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

// Simplified Account Kit balance hook
const useAccountKitBalance = (config: TokenConfig, userAddress: `0x${string}` | undefined, client: any) => {
  const [balance, setBalance] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!client || !userAddress) {
      setBalance(BigInt(0));
      setIsLoading(false);
      setIsError(false);
      return;
    }

    const fetchBalance = async () => {
      setIsLoading(true);
      setIsError(false);

      try {
        let result;
        if (config.symbol === "ETH") {
          result = await client.getBalance({ address: userAddress });
        } else {
          result = await client.readContract({
            address: config.address,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [userAddress],
          });
        }
        // Treat undefined/null as 0 balance
        setBalance(result || BigInt(0));
      } catch (error) {
        console.error(`❌ Balance error for ${config.symbol}:`, error);
        setIsError(true);
        setBalance(BigInt(0));
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();
  }, [client, userAddress, config.address, config.symbol]);

  return { data: balance, isLoading, isError };
};

const useIndividualTokenBalance = (config: TokenConfig, userAddress: `0x${string}` | undefined) => {
  const { client } = useClient();
  const accountTypeInfo = useAccountType();

  // Use Account Kit client for Smart Accounts
  const accountKitBalance = useAccountKitBalance(config, userAddress, accountTypeInfo.isAccountKit ? client : null);

  // Use Wagmi hooks for EOA
  const {
    data: ethBalance,
    isLoading: ethLoading,
    isError: ethError,
  } = useWatchBalance({
    address: userAddress,
    query: {
      enabled: !!userAddress && !accountTypeInfo.isAccountKit,
    },
  });

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
      enabled: !!userAddress && config.symbol !== "ETH" && !accountTypeInfo.isAccountKit,
    },
  });

  return useMemo(() => {
    // Choose data source based on account type
    const isLoading = accountTypeInfo.isAccountKit
      ? accountKitBalance.isLoading
      : config.symbol === "ETH"
        ? ethLoading
        : tokenLoading;

    const isError = accountTypeInfo.isAccountKit
      ? accountKitBalance.isError
      : config.symbol === "ETH"
        ? ethError
        : tokenError;

    const balance = accountTypeInfo.isAccountKit
      ? accountKitBalance.data
      : config.symbol === "ETH"
        ? ethBalance?.value
        : tokenBalance;

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

    if (isError) {
      return {
        symbol: config.symbol,
        balance: "0",
        balanceFormatted: "Error",
        balanceUSD: "Error",
        isLoading: false,
        isError: true,
      };
    }

    // Treat undefined/null balance as 0
    const actualBalance = balance || BigInt(0);
    const formatted = formatUnits(actualBalance, config.decimals);
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
  }, [
    config.symbol,
    config.decimals,
    accountTypeInfo.isAccountKit,
    accountKitBalance.data,
    accountKitBalance.isLoading,
    accountKitBalance.isError,
    ethBalance,
    ethError,
    ethLoading,
    tokenBalance,
    tokenError,
    tokenLoading,
  ]);
};

export const useTokenData = () => {
  const { address: accountKitAddress } = useClient();
  const { address: wagmiAddress } = useAccount();
  const accountTypeInfo = useAccountType();

  // Use the appropriate address based on account type
  const userAddress = useMemo(() => {
    if (accountTypeInfo.isAccountKit && accountKitAddress) {
      return accountKitAddress;
    }
    if (accountTypeInfo.isEOA && wagmiAddress) {
      return wagmiAddress;
    }
    return accountKitAddress || wagmiAddress;
  }, [accountTypeInfo.isAccountKit, accountTypeInfo.isEOA, accountKitAddress, wagmiAddress]);

  // Get all token balances using hooks (must be called at top level)
  const usdcBalance = useIndividualTokenBalance(TOKEN_CONFIGS[0], userAddress as `0x${string}` | undefined);
  const ethBalance = useIndividualTokenBalance(TOKEN_CONFIGS[1], userAddress as `0x${string}` | undefined);
  const btcBalance = useIndividualTokenBalance(TOKEN_CONFIGS[2], userAddress as `0x${string}` | undefined);

  // Get real vault data for USDC
  const usdcVaultData = useVault({ contractName: "USDCVault", decimals: 6, usdRate: 1 });

  const tokenData = useMemo(() => {
    const balances = [usdcBalance, ethBalance, btcBalance];

    return TOKEN_CONFIGS.map((config, index): TokenData => {
      const balance = balances[index];

      // Use real vault data for USDC, mock data for others
      let position;
      if (config.vaultId === "usdc") {
        const userAssets = parseFloat(usdcVaultData.userAssetsFormatted.replace(/[$,]/g, ""));
        const earnedYield = parseFloat(usdcVaultData.earnedYield.replace(/[$,]/g, ""));
        const deposits = parseFloat(usdcVaultData.userDepositsFormatted.replace(/[$,]/g, ""));
        // For now, we can't distinguish between principal and yield without tracking deposits
        // So we'll show total value as current value and assume no separate yield tracking
        position = {
          vaultId: config.vaultId,
          invested: deposits, // Total position value
          earnedYield: earnedYield, // Would need deposit tracking to calculate this
          currentValue: userAssets,
          investedFormatted: `$${deposits.toFixed(2)}`,
          earnedYieldFormatted: `$${earnedYield.toFixed(2)}`,
          currentValueFormatted: `$${userAssets.toFixed(2)}`,
        };
      } else {
        // Use mock data for ETH and BTC (coming soon)
        const mockPos = MOCK_POSITIONS[config.vaultId as keyof typeof MOCK_POSITIONS];
        position = {
          vaultId: config.vaultId,
          invested: mockPos.invested,
          earnedYield: mockPos.earnedYield,
          currentValue: mockPos.currentValue,
          investedFormatted: `$${mockPos.invested.toFixed(2)}`,
          earnedYieldFormatted: mockPos.earnedYield > 0 ? `+$${mockPos.earnedYield.toFixed(2)}` : "$0.00",
          currentValueFormatted: `$${mockPos.currentValue.toFixed(2)}`,
        };
      }

      return {
        ...config,
        balance,
        position,
        totalDeposits: config.vaultId === "usdc" ? usdcVaultData.totalAssetsFormatted : "In Development",
        vaultStatus: config.status === "eligible" ? "active" : "coming-soon",
      };
    });
  }, [usdcBalance, ethBalance, btcBalance, usdcVaultData]);

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

  // Mock function to simulate withdrawal (in practice, this would interact with smart contracts)
  const simulateWithdrawal = (vaultId: string, percentage: number) => {
    const vault = getVaultById(vaultId);
    if (!vault) {
      return Promise.reject(new Error(`Vault not found: ${vaultId}`));
    }

    const withdrawAmount = (vault.position.currentValue * percentage) / 100;
    console.log(`Simulating withdrawal of ${percentage}% ($${withdrawAmount.toFixed(2)}) from ${vaultId} vault`);

    // In a real app, this would:
    // 1. Call smart contract to withdraw tokens
    // 2. Update user's position
    // 3. Refresh balances
    return Promise.resolve({
      success: true,
      transactionHash: "0x456...",
      withdrawnAmount: withdrawAmount,
      remainingPosition: vault.position.currentValue - withdrawAmount,
      percentage,
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
    simulateWithdrawal,
    isConnected: !!userAddress,
    userAddress: userAddress,
  };
};

// Individual token balance hook for components that need real-time balance updates
export const useTokenBalance = (symbol: string) => {
  const { address: accountKitAddress } = useClient();
  const { address: wagmiAddress } = useAccount();
  const accountTypeInfo = useAccountType();

  const userAddress = useMemo(() => {
    if (accountTypeInfo.isAccountKit && accountKitAddress) {
      return accountKitAddress;
    }
    if (accountTypeInfo.isEOA && wagmiAddress) {
      return wagmiAddress;
    }
    return accountKitAddress || wagmiAddress;
  }, [accountTypeInfo.isAccountKit, accountTypeInfo.isEOA, accountKitAddress, wagmiAddress]);

  const config = TOKEN_CONFIGS.find(c => c.symbol === symbol);

  if (!config) {
    throw new Error(`Token configuration not found for symbol: ${symbol}`);
  }

  return useIndividualTokenBalance(config, userAddress as `0x${string}` | undefined);
};
