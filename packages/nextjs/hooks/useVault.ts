"use client";

import { useMemo } from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-alchemy";
import { useClient } from "~~/hooks/scaffold-alchemy/useClient";
import { useAccountType } from "~~/hooks/useAccountType";
import { ContractName } from "~~/utils/scaffold-alchemy/contract";

export interface VaultData {
  // User position
  userShares: bigint;
  userSharesFormatted: string;
  userAssets: bigint;
  userAssetsFormatted: string;
  userAssetsUSD: string;
  userDeposits: bigint;
  userDepositsFormatted: string;
  userDepositsUSD: string;
  earnedYield: string;

  // Vault stats
  totalAssets: bigint;
  totalAssetsFormatted: string;
  totalAssetsUSD: string;
  underlyingAsset: `0x${string}` | undefined;

  // Loading states
  isLoading: boolean;
  isError: boolean;
}

interface UseVaultParams {
  contractName: ContractName;
  decimals?: number; // Decimals of underlying asset (default: 6 for USDC)
  usdRate?: number; // USD conversion rate (default: 1 for USDC)
}

export const useVault = ({ contractName, decimals = 6, usdRate = 1 }: UseVaultParams): VaultData => {
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

  // Read vault data
  const { data: userShares, isLoading: sharesLoading } = useScaffoldReadContract({
    contractName,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  const { data: userAssets, isLoading: assetsLoading } = useScaffoldReadContract({
    contractName,
    functionName: "convertToAssets",
    args: userShares ? [userShares] : undefined,
    query: {
      enabled: !!userShares && userShares > BigInt(0),
    },
  });

  const { data: totalAssets, isLoading: totalAssetsLoading } = useScaffoldReadContract({
    contractName,
    functionName: "totalAssets",
  });

  const { data: underlyingAsset, isLoading: assetLoading } = useScaffoldReadContract({
    contractName,
    functionName: "asset",
  });

  const { data: userDeposits, isLoading: depositsLoading } = useScaffoldReadContract({
    contractName,
    functionName: "userDeposits",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  return useMemo(() => {
    const isLoading = sharesLoading || assetsLoading || totalAssetsLoading || assetLoading || depositsLoading;
    const isError = false; // Could add error states if needed

    const shares = userShares || BigInt(0);
    const assets = userAssets || BigInt(0);
    const total = totalAssets || BigInt(0);
    const deposits = userDeposits || BigInt(0);

    // Format values
    const sharesFormatted = formatUnits(shares, decimals);
    const assetsFormatted = formatUnits(assets, decimals);
    const totalAssetsFormatted = formatUnits(total, decimals);
    const depositsFormatted = formatUnits(deposits, decimals);

    // Calculate USD values
    const assetsNum = parseFloat(assetsFormatted);
    const totalNum = parseFloat(totalAssetsFormatted);
    const depositsNum = parseFloat(depositsFormatted);

    const earnedYield = formatUnits(BigInt(total) - BigInt(deposits), decimals);

    return {
      // User position
      userShares: shares,
      userSharesFormatted: `${parseFloat(sharesFormatted).toFixed(4)}`,
      userAssets: assets,
      userAssetsFormatted: `$${assetsNum.toFixed(2)}`,
      userAssetsUSD: `$${(assetsNum * usdRate).toFixed(2)}`,
      userDeposits: deposits,
      userDepositsFormatted: `$${depositsNum.toFixed(2)}`,
      userDepositsUSD: `$${(depositsNum * usdRate).toFixed(2)}`,
      earnedYield: earnedYield,

      // Vault stats
      totalAssets: total,
      totalAssetsFormatted: `$${totalNum.toFixed(2)}`,
      totalAssetsUSD: `$${(totalNum * usdRate).toFixed(2)}`,
      underlyingAsset: underlyingAsset as `0x${string}` | undefined,

      // Loading states
      isLoading,
      isError,
    };
  }, [
    userShares,
    userAssets,
    totalAssets,
    underlyingAsset,
    userDeposits,
    sharesLoading,
    assetsLoading,
    totalAssetsLoading,
    assetLoading,
    depositsLoading,
    decimals,
    usdRate,
  ]);
};
