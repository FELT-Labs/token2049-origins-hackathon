"use client";

import { useState } from "react";
import InvestmentModal from "./InvestmentModal";
import WithdrawalModal from "./WithdrawalModal";
import { type TokenData, useTokenData } from "~~/hooks/useTokenData";

const TokenVaults = () => {
  const { tokenData } = useTokenData();
  const [isInvestmentModalOpen, setIsInvestmentModalOpen] = useState(false);
  const [selectedVaultForInvestment, setSelectedVaultForInvestment] = useState<TokenData | null>(null);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [selectedVaultForWithdrawal, setSelectedVaultForWithdrawal] = useState<TokenData | null>(null);

  const handleInvestClick = (vaultId: string) => {
    const vault = tokenData.find(v => v.vaultId === vaultId);
    if (vault) {
      setSelectedVaultForInvestment(vault);
      setIsInvestmentModalOpen(true);
    }
  };

  const handleWithdrawClick = (vaultId: string) => {
    const vault = tokenData.find(v => v.vaultId === vaultId);
    if (vault) {
      setSelectedVaultForWithdrawal(vault);
      setIsWithdrawalModalOpen(true);
    }
  };

  const handleCloseInvestmentModal = () => {
    setIsInvestmentModalOpen(false);
    setSelectedVaultForInvestment(null);
  };

  const handleCloseWithdrawalModal = () => {
    setIsWithdrawalModalOpen(false);
    setSelectedVaultForWithdrawal(null);
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

  const getRiskBadgeText = (vault: TokenData) => {
    if (vault.vaultStatus === "coming-soon") {
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
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">🏦 Investment Vaults</h2>
          <p className="text-sm text-gray-600">
            Choose a vault based on the asset you want to optimize for. We handle the investment strategies
            automatically.
          </p>
        </div>

        {/* Vaults Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tokenData.map(vault => (
            <div
              key={vault.vaultId}
              className={`bg-white rounded-xl border border-gray-200 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                vault.vaultStatus === "coming-soon" ? "opacity-60" : ""
              }`}
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
                      vault.vaultStatus,
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
                    {vault.vaultStatus === "active" ? "Current Yield" : "Target Yield"}
                  </div>
                  <div
                    className={`text-sm font-semibold ${
                      vault.vaultStatus === "active" ? "text-green-600" : "text-yellow-600"
                    }`}
                  >
                    {vault.vaultStatus === "active" ? vault.currentYield : vault.targetYield}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    {vault.vaultStatus === "active" ? "Total Deposits" : "Status"}
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{vault.totalDeposits}</div>
                </div>
              </div>

              {/* Description */}
              <div
                className={`p-3 rounded-lg mb-4 text-xs leading-relaxed ${
                  vault.vaultStatus === "active" ? "bg-blue-50 text-blue-800" : "bg-yellow-50 text-yellow-800"
                }`}
              >
                <strong>{vault.vaultStatus === "active" ? "How it works:" : "Coming soon:"}</strong> {vault.description}
              </div>

              {/* Position Info */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {vault.vaultStatus === "active" ? "Your Position" : `Your ${vault.symbol} Balance`}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {vault.vaultStatus === "active" ? vault.position.investedFormatted : vault.balance.balanceFormatted}
                  </span>
                </div>

                {vault.vaultStatus === "active" && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Earned Yield</span>
                      <span className="text-sm font-medium text-green-600">{vault.position.earnedYieldFormatted}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Current Value</span>
                      <span className="text-sm font-medium text-gray-900">{vault.position.currentValueFormatted}</span>
                    </div>
                  </>
                )}

                {vault.vaultStatus === "coming-soon" && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Ready to Invest</span>
                    <span className="text-sm font-medium text-gray-900">Ready to Invest</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {vault.vaultStatus === "active" ? (
                  <>
                    <button
                      onClick={() => handleInvestClick(vault.vaultId)}
                      className="flex-1 bg-blue-600 text-white text-sm font-medium py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      Deposit {vault.symbol}
                    </button>
                    <button
                      onClick={() => handleWithdrawClick(vault.vaultId)}
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

      {/* Investment Modal */}
      <InvestmentModal
        isOpen={isInvestmentModalOpen}
        onClose={handleCloseInvestmentModal}
        vault={selectedVaultForInvestment}
      />

      {/* Withdrawal Modal */}
      <WithdrawalModal
        isOpen={isWithdrawalModalOpen}
        onClose={handleCloseWithdrawalModal}
        vault={selectedVaultForWithdrawal}
      />
    </div>
  );
};

export default TokenVaults;
