"use client";

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
}

const TokenBalanceRow = ({ token }: TokenBalanceRowProps) => {
  const handleTopUp = () => {
    const amounts: Record<string, string> = {
      'USDC': '$1,000.00',
      'ETH': '1.0 ETH',
      'BTC': '0.01 BTC',
    };
    alert(`Demo: Added ${amounts[token.symbol]} to your ${token.symbol} balance!`);
  };

  return (
    <div className="flex justify-between items-center py-5 px-6 bg-gray-50 rounded-2xl border border-gray-100 transition-all duration-300 hover:bg-gray-100 hover:-translate-y-0.5">
      <div className="flex items-center gap-2 flex-1">
        <div className="text-base font-semibold text-gray-900 min-w-[60px]">{token.symbol}</div>
        <div className="text-xl font-semibold text-gray-900">{token.balance.balanceFormatted}</div>
      </div>
      <div className="flex items-center gap-4">
        <div className={`text-sm font-medium ${token.status === 'eligible' ? 'text-green-500' : 'text-gray-500'} min-w-[160px]`}>
          {token.statusText}
        </div>
        <button 
          className="px-5 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 cursor-pointer transition-all duration-200 hover:bg-gray-200 hover:-translate-y-0.5 min-w-[80px]" 
          onClick={handleTopUp}
        >
          Top Up
        </button>
      </div>
    </div>
  );
};

const TokenBalances = () => {
  const { tokenData, isConnected } = useTokenData();

  if (!isConnected) {
    return null;
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-10 border border-gray-100 mb-6 shadow-sm w-full">
      <div className="flex items-center gap-2 mb-8">
        <h2 className="text-3xl font-semibold text-gray-900">💰 Your Token Balances</h2>
      </div>
      <div className="flex flex-col gap-4 w-full">
        {tokenData.map((token) => (
          <TokenBalanceRow key={token.symbol} token={token} />
        ))}
      </div>
    </div>
  );
};

export default TokenBalances;
