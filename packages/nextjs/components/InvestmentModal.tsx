"use client";

import { useState, useEffect } from "react";
import { type TokenData } from "~~/hooks/useTokenData";

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: TokenData | null;
}

const InvestmentModal = ({ isOpen, onClose, vault }: InvestmentModalProps) => {
  const [investAmount, setInvestAmount] = useState("");
  const [portfolioPercentage, setPortfolioPercentage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Parse available balance for calculations
  const availableBalance = vault ? parseFloat(vault.balance.balanceUSD.replace(/[$,]/g, "")) : 0;
  const currentPosition = vault ? vault.position.invested : 0;
  const apy = 0.082; // 8.2% APY

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setInvestAmount("");
      setPortfolioPercentage(0);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Update slider when amount changes
  useEffect(() => {
    if (investAmount && availableBalance > 0) {
      const amount = parseFloat(investAmount) || 0;
      const percentage = Math.round((amount / availableBalance) * 100);
      setPortfolioPercentage(Math.min(percentage, 100));
    }
  }, [investAmount, availableBalance]);

  const handleAmountChange = (value: string) => {
    setInvestAmount(value);
  };

  const handleSliderChange = (percentage: number) => {
    setPortfolioPercentage(percentage);
    const amount = (availableBalance * percentage) / 100;
    setInvestAmount(amount.toFixed(2));
  };

  const setMaxAmount = () => {
    setInvestAmount(availableBalance.toFixed(2));
    setPortfolioPercentage(100);
  };

  const handleConfirmInvestment = async () => {
    const amount = parseFloat(investAmount);
    
    if (amount <= 0 || amount > availableBalance) {
      alert("Please enter a valid investment amount.");
      return;
    }

    setIsLoading(true);

    // Simulate transaction processing
    setTimeout(() => {
      alert(`Successfully invested $${amount.toFixed(2)} in ${vault?.name}!`);
      setIsLoading(false);
      onClose();
    }, 3000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isConfirmDisabled) {
      handleConfirmInvestment();
    }
  };

  const handleEscapeKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  // Calculations for preview
  const investmentAmount = parseFloat(investAmount) || 0;
  const newTotalPosition = currentPosition + investmentAmount;
  const estimatedYield = investmentAmount * apy;
  const remainingBalance = availableBalance - investmentAmount;
  const isConfirmDisabled = investmentAmount <= 0 || investmentAmount > availableBalance;

  const getRiskBadgeStyles = (riskLevel: string) => {
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

  const getRiskBadgeText = (riskLevel: string) => {
    switch (riskLevel) {
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

  if (!isOpen || !vault) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      onKeyDown={handleEscapeKey}
      tabIndex={-1}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-semibold text-gray-900">
            {vault.emoji} Deposit into {vault.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Vault Information */}
          <div className="bg-blue-50 p-6 rounded-xl mb-6 border-l-4 border-blue-500">
            <h4 className="font-semibold text-gray-900 mb-3">How {vault.name} Works</h4>
            <p className="text-sm text-gray-700 mb-4 leading-relaxed">
              {vault.description}
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center text-green-700">
                <span className="mr-1">✅</span>
                Automatic rebalancing
              </div>
              <div className="flex items-center text-green-700">
                <span className="mr-1">✅</span>
                Risk management
              </div>
              <div className="flex items-center text-green-700">
                <span className="mr-1">✅</span>
                Compound interest
              </div>
            </div>
          </div>

          {/* Vault Stats */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Yield</span>
                <span className="font-semibold text-green-600">{vault.currentYield}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Asset Type</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiskBadgeStyles(vault.riskLevel)}`}>
                  {getRiskBadgeText(vault.riskLevel)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Vault Size</span>
                <span className="font-semibold text-gray-900">{vault.totalDeposits}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Your Current Position</span>
                <span className="font-semibold text-gray-900">{vault.position.investedFormatted}</span>
              </div>
            </div>
          </div>

          {/* Investment Amount Input */}
          <div className="mb-6">
            <label htmlFor="investAmount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount to Invest ({vault.symbol})
            </label>
            <div className="relative">
              <input
                type="number"
                id="investAmount"
                value={investAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="0.00"
                min="0"
                max={availableBalance}
                step="0.01"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  investmentAmount > availableBalance ? "border-red-300" : investmentAmount > 0 ? "border-green-300" : "border-gray-300"
                }`}
              />
              <button
                onClick={setMaxAmount}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
              >
                MAX
              </button>
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Available {vault.symbol} Balance: <strong>{vault.balance.balanceUSD}</strong>
            </div>
          </div>

          {/* Portfolio Percentage Slider */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Portfolio Percentage
            </label>
            <div className="space-y-3">
              <input
                type="range"
                min="0"
                max="100"
                value={portfolioPercentage}
                onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #e5e7eb 0%, #4f46e5 ${portfolioPercentage}%, #e5e7eb ${portfolioPercentage}%)`
                }}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
              <div className="text-center text-sm font-medium text-blue-600">
                {portfolioPercentage}% of available balance
              </div>
            </div>
          </div>

          {/* Investment Preview */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Investment Preview</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Investment Amount</span>
                <span className="font-semibold text-gray-900">${investmentAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">New Total Position</span>
                <span className="font-semibold text-gray-900">${newTotalPosition.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Estimated Annual Yield</span>
                <span className="font-semibold text-green-600">${estimatedYield.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Remaining {vault.symbol} Balance</span>
                <span className="font-semibold text-gray-900">${remainingBalance.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Transaction Fee Info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-yellow-800 font-medium">⚠️ Estimated Gas Fee</span>
              <span className="font-semibold text-yellow-900">~$2.50</span>
            </div>
            <div className="text-xs text-yellow-700">
              Gas fees are paid separately from your investment and may vary based on network conditions.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 font-medium py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmInvestment}
              disabled={isConfirmDisabled || isLoading}
              className={`flex-1 font-medium py-3 px-6 rounded-xl transition-colors ${
                isConfirmDisabled || isLoading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isLoading ? "Processing..." : "Confirm Investment"}
            </button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
              <div className="bg-white rounded-xl p-8 text-center">
                <div className="inline-block w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <div className="text-gray-600">Processing your investment...</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #4f46e5;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #4f46e5;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default InvestmentModal;
