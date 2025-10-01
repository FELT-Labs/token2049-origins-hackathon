"use client";

import { useState } from "react";

interface VaultData {
  id: string;
  name: string;
  symbol: string;
  emoji: string;
  currentYield: string;
  totalDeposits: string;
  userPosition: string;
  earnedYield: string;
  currentValue: string;
  riskLevel: "low" | "medium" | "high";
  status: "active" | "coming-soon";
  description: string;
  targetYield?: string;
}

const vaultData: VaultData[] = [
  {
    id: "usdc",
    name: "USDC Vault",
    symbol: "USDC",
    emoji: "💵",
    currentYield: "8.2%",
    totalDeposits: "$4.2M",
    userPosition: "$750.00",
    earnedYield: "+$25.50",
    currentValue: "$775.50",
    riskLevel: "low",
    status: "active",
    description: "Your USDC is automatically deployed across the best DeFi lending protocols and yield farming opportunities. We continuously optimize to maximize your returns while maintaining stability.",
  },
  {
    id: "eth",
    name: "ETH Vault",
    symbol: "ETH",
    emoji: "⚡",
    currentYield: "~6%",
    totalDeposits: "In Development",
    userPosition: "0.234 ETH",
    earnedYield: "N/A",
    currentValue: "Ready to Invest",
    riskLevel: "medium",
    status: "coming-soon",
    description: "Optimize your ETH holdings through staking rewards, DeFi protocols, and yield strategies while maintaining exposure to ETH price appreciation.",
    targetYield: "~6%",
  },
  {
    id: "btc",
    name: "Bitcoin Vault",
    symbol: "BTC",
    emoji: "₿",
    currentYield: "~4%",
    totalDeposits: "In Development",
    userPosition: "0.0045 BTC",
    earnedYield: "N/A",
    currentValue: "Ready to Invest",
    riskLevel: "medium",
    status: "coming-soon",
    description: "Generate yield on your Bitcoin through wrapped BTC lending and institutional-grade yield strategies while maintaining BTC exposure.",
    targetYield: "~4%",
  },
];

const TokenVaults = () => {
  const [selectedVault, setSelectedVault] = useState<string | null>(null);

  const handleInvestClick = (vaultId: string) => {
    console.log(`Opening investment modal for ${vaultId} vault`);
    // TODO: Implement investment modal
  };

  const handleWithdrawClick = (vaultId: string) => {
    console.log(`Opening withdrawal modal for ${vaultId} vault`);
    // TODO: Implement withdrawal modal
  };

  const getRiskBadgeStyles = (riskLevel: string, status: string) => {
    if (status === "coming-soon") {
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
    
    switch (riskLevel) {
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      case "medium":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRiskBadgeText = (vault: VaultData) => {
    if (vault.status === "coming-soon") {
      return "Coming Soon";
    }
    
    switch (vault.riskLevel) {
      case "low":
        return "Stable Asset";
      case "medium":
        return "Medium Risk";
      case "high":
        return "High Risk";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            🏦 Investment Vaults
          </h2>
          <p className="text-sm text-gray-600">
            Choose a vault based on the asset you want to optimize for. We handle the investment strategies automatically.
          </p>
        </div>

        {/* Vaults Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vaultData.map((vault) => (
            <div
              key={vault.id}
              className={`bg-white rounded-xl border border-gray-200 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                vault.status === "coming-soon" ? "opacity-60" : ""
              }`}
              onMouseEnter={() => setSelectedVault(vault.id)}
              onMouseLeave={() => setSelectedVault(null)}
            >
              {/* Vault Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {vault.emoji} {vault.name}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiskBadgeStyles(
                      vault.riskLevel,
                      vault.status
                    )}`}
                  >
                    {getRiskBadgeText(vault)}
                  </span>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    {vault.status === "active" ? "Current Yield" : "Target Yield"}
                  </div>
                  <div className={`text-sm font-semibold ${
                    vault.status === "active" ? "text-green-600" : "text-yellow-600"
                  }`}>
                    {vault.status === "active" ? vault.currentYield : vault.targetYield}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    {vault.status === "active" ? "Total Deposits" : "Status"}
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {vault.totalDeposits}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className={`p-3 rounded-lg mb-4 text-xs leading-relaxed ${
                vault.status === "active" 
                  ? "bg-blue-50 text-blue-800" 
                  : "bg-yellow-50 text-yellow-800"
              }`}>
                <strong>
                  {vault.status === "active" ? "How it works:" : "Coming soon:"}
                </strong>{" "}
                {vault.description}
              </div>

              {/* Position Info */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {vault.status === "active" ? "Your Position" : `Your ${vault.symbol} Balance`}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {vault.userPosition}
                  </span>
                </div>
                
                {vault.status === "active" && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Earned Yield</span>
                      <span className="text-sm font-medium text-green-600">
                        {vault.earnedYield}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Current Value</span>
                      <span className="text-sm font-medium text-gray-900">
                        {vault.currentValue}
                      </span>
                    </div>
                  </>
                )}

                {vault.status === "coming-soon" && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Ready to Invest</span>
                    <span className="text-sm font-medium text-gray-900">
                      {vault.currentValue}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {vault.status === "active" ? (
                  <>
                    <button
                      onClick={() => handleInvestClick(vault.id)}
                      className="flex-1 bg-blue-600 text-white text-sm font-medium py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      Deposit {vault.symbol}
                    </button>
                    <button
                      onClick={() => handleWithdrawClick(vault.id)}
                      className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2.5 px-4 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                    >
                      Withdraw
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      disabled
                      className="flex-1 bg-gray-100 text-gray-400 text-sm font-medium py-2.5 px-4 rounded-lg cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                    <button
                      disabled
                      className="flex-1 bg-gray-100 text-gray-400 text-sm font-medium py-2.5 px-4 rounded-lg cursor-not-allowed"
                    >
                      Notify Me
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TokenVaults;
