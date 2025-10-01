"use client";

import { useState } from "react";
import { useTargetNetwork } from "~~/hooks/scaffold-alchemy/useTargetNetwork";
import { useTokenData } from "~~/hooks/useTokenData";

interface TokenBalanceRowProps {
  token: {
    symbol: string;
    balance: {
      balanceFormatted: string;
      isLoading: boolean;
      isError: boolean;
    };
    status: "eligible" | "coming-soon";
    statusText: string;
  };
  userAddress: string;
  onTopUpSuccess: () => void;
}

const TokenBalanceRow = ({ token, userAddress, onTopUpSuccess }: TokenBalanceRowProps) => {
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const { targetNetwork } = useTargetNetwork();

  const handleTopUp = async () => {
    // Only allow USDC topup
    if (token.symbol !== "USDC") {
      alert(`TopUp is only available for USDC. ${token.symbol} is coming soon!`);
      return;
    }

    setIsTopUpLoading(true);

    try {
      const response = await fetch("/api/topup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userAddress,
          tokenSymbol: token.symbol,
          chainId: targetNetwork.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "TopUp failed");
      }

      alert(`Success! ${result.message}\nTransaction: ${result.txHash}`);

      // Trigger balance refresh
      onTopUpSuccess();
    } catch (error) {
      console.error("TopUp error:", error);
      alert(`TopUp failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsTopUpLoading(false);
    }
  };

  return (
    <div className="flex justify-between items-center py-5 px-6 bg-gray-50 rounded-2xl border border-gray-100 transition-all duration-300 hover:bg-gray-100 hover:-translate-y-0.5">
      <div className="flex items-center gap-2 flex-1">
        <div className="text-base font-semibold text-gray-900 min-w-[60px]">{token.symbol}</div>
        <div className="text-xl font-semibold text-gray-900">{token.balance.balanceFormatted}</div>
      </div>
      <div className="flex items-center gap-4">
        <div
          className={`text-sm font-medium ${token.status === "eligible" ? "text-green-500" : "text-gray-500"} min-w-[160px]`}
        >
          {token.statusText}
        </div>
        <button
          className={`px-5 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 cursor-pointer transition-all duration-200 hover:bg-gray-200 hover:-translate-y-0.5 min-w-[80px] ${token.statusText === "⏳ Coming Soon" || isTopUpLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          onClick={handleTopUp}
          disabled={token.statusText === "⏳ Coming Soon" || isTopUpLoading}
        >
          {isTopUpLoading ? "Loading..." : "Top Up"}
        </button>
      </div>
    </div>
  );
};

const TokenBalances = () => {
  const { tokenData, isConnected, userAddress } = useTokenData();
  const [refreshKey, setRefreshKey] = useState(0);

  if (!isConnected) {
    return null;
  }

  const handleTopUpSuccess = () => {
    // Force a re-render to refresh balances
    setRefreshKey(prev => prev + 1);
    // Note: In a more sophisticated setup, you might want to trigger
    // a specific balance refresh or use a more targeted approach
  };

  return (
    <div
      className="bg-white/90 backdrop-blur-sm rounded-3xl p-10 border border-gray-100 mb-6 shadow-sm w-full"
      key={refreshKey}
    >
      <div className="flex items-center gap-2 mb-8">
        <h2 className="text-3xl font-semibold text-gray-900">💰 Your Token Balances</h2>
      </div>
      <div className="flex flex-col gap-4 w-full">
        {tokenData.map(token => (
          <TokenBalanceRow
            key={token.symbol}
            token={token}
            userAddress={userAddress || ""}
            onTopUpSuccess={handleTopUpSuccess}
          />
        ))}
      </div>
    </div>
  );
};

export default TokenBalances;
