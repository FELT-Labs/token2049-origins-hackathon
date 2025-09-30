"use client";

import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { formatUnits, parseAbi } from "viem";
import { useClient } from "~~/hooks/scaffold-alchemy/useClient";
import { useWatchBalance } from "~~/hooks/scaffold-alchemy/useWatchBalance";

interface TokenConfig {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
  status: "eligible" | "coming-soon";
  statusText: string;
}

// ERC20 ABI for balanceOf function
const ERC20_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
]);

// Token contracts (using mainnet addresses, will work for demo)
const TOKEN_CONFIGS: TokenConfig[] = [
  {
    symbol: "USDC",
    address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USDC mainnet
    decimals: 6,
    status: "eligible",
    statusText: "✅ Eligible for investing"
  }
];

interface TokenBalanceRowProps {
  config: TokenConfig;
  userAddress: `0x${string}`;
}

const TokenBalanceRow = ({ config, userAddress }: TokenBalanceRowProps) => {
  const { data: balance, isLoading, isError } = useReadContract({
    address: config.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [userAddress],
  });

  const formattedBalance = useMemo(() => {
    if (isLoading) return "Loading...";
    if (isError) return "Error";
    if (!balance) return "0";
    
    const formatted = formatUnits(balance, config.decimals);
    const numBalance = parseFloat(formatted);
    
    if (config.symbol === "USDC") {
      return `$${numBalance.toFixed(2)}`;
    }
    return `${numBalance.toFixed(4)} ${config.symbol}`;
  }, [balance, isLoading, isError, config.symbol, config.decimals]);

  const handleTopUp = () => {
    const amounts: Record<string, string> = {
      'USDC': '$1,000.00',
      'WBTC': '0.01 BTC',
    };
    alert(`Demo: Added ${amounts[config.symbol]} to your ${config.symbol} balance!`);
  };

  return (
    <div className="flex justify-between items-center p-5 bg-apple-bg-tertiary rounded-apple-lg border border-apple-border transition-all duration-300 ease-apple hover:bg-apple-bg-hover hover:-translate-y-0.5">
      <div className="flex items-center gap-4">
        <div className="text-sm font-semibold text-apple-text-primary tracking-apple-normal min-w-[60px]">{config.symbol}</div>
        <div className="text-xl font-semibold text-apple-text-primary tracking-apple-normal">{formattedBalance}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className={`text-xs font-medium ${config.status === 'eligible' ? 'text-apple-success' : 'text-apple-text-secondary'}`}>
          {config.statusText}
        </div>
        <button 
          className="px-4 py-2 bg-apple-bg-hover border border-apple-border-hover rounded-apple-sm text-sm font-medium text-apple-text-primary cursor-pointer transition-all duration-200 ease-apple hover:bg-apple-border-hover hover:-translate-y-0.5" 
          onClick={handleTopUp}
        >
          Top Up
        </button>
      </div>
    </div>
  );
};

const ETHBalanceRow = ({ userAddress }: { userAddress: `0x${string}` }) => {
  const { data: balance, isLoading, isError } = useWatchBalance({
    address: userAddress,
  });

  const formattedBalance = useMemo(() => {
    if (isLoading) return "Loading...";
    if (isError) return "Error";
    if (!balance) return "0 ETH";
    
    const formatted = formatUnits(balance.value, 18);
    const numBalance = parseFloat(formatted);
    return `${numBalance.toFixed(4)} ETH`;
  }, [balance, isLoading, isError]);

  const handleTopUp = () => {
    alert("Demo: Added 0.5 ETH to your ETH balance!");
  };

  return (
    <div className="flex justify-between items-center p-5 bg-apple-bg-tertiary rounded-apple-lg border border-apple-border transition-all duration-300 ease-apple hover:bg-apple-bg-hover hover:-translate-y-0.5">
      <div className="flex items-center gap-4">
        <div className="text-sm font-semibold text-apple-text-primary tracking-apple-normal min-w-[60px]">ETH</div>
        <div className="text-xl font-semibold text-apple-text-primary tracking-apple-normal">{formattedBalance}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-xs font-medium text-apple-text-secondary">⏳ Coming soon</div>
        <button 
          className="px-4 py-2 bg-apple-bg-hover border border-apple-border-hover rounded-apple-sm text-sm font-medium text-apple-text-primary cursor-pointer transition-all duration-200 ease-apple hover:bg-apple-border-hover hover:-translate-y-0.5" 
          onClick={handleTopUp}
        >
          Top Up
        </button>
      </div>
    </div>
  );
};

const TokenBalances = () => {
  const { address } = useClient();

  if (!address) {
    return null;
  }

  return (
    <div className="bg-apple-bg-secondary backdrop-blur-apple rounded-apple-xl p-8 border border-apple-border mb-6 shadow-apple-sm animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-3xl font-semibold text-apple-text-primary tracking-apple-tight">💰 Your Token Balances</h2>
      </div>
      <div className="flex flex-col gap-3 mb-8">
        {TOKEN_CONFIGS.map((config) => (
          <TokenBalanceRow key={config.symbol} config={config} userAddress={address as `0x${string}`} />
        ))}
        <ETHBalanceRow userAddress={address as `0x${string}`} />
      </div>
    </div>
  );
};

export default TokenBalances;
