"use client";

import { useState, useEffect } from "react";
import { parseUnits } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type TokenData } from "~~/hooks/useTokenData";
import { useScaffoldWriteContract, useDeployedContractInfo } from "~~/hooks/scaffold-alchemy";
import { useAccountType } from "~~/hooks/useAccountType";
import { useClient } from "~~/hooks/scaffold-alchemy/useClient";
import { useVault } from "~~/hooks/useVault";

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: TokenData | null;
}

const WithdrawalModal = ({ isOpen, onClose, vault }: WithdrawalModalProps) => {
  const [withdrawalPercentage, setWithdrawalPercentage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Get user address and account type
  const { address } = useClient();
  const accountTypeInfo = useAccountType();

  // Get contract info
  const { data: vaultInfo } = useDeployedContractInfo({ contractName: "USDCVault" });

  // Get vault data for user position
  const vaultData = useVault({ contractName: "USDCVault", decimals: 6, usdRate: 1 });

  // AA transaction hooks
  const { writeContractAsync: withdrawAA } = useScaffoldWriteContract({ contractName: "USDCVault" });

  // EOA transaction hooks
  const { writeContractAsync: writeEOA, data: eoaTxHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: eoaTxHash,
  });

  // Get position data from vault data hook
  const totalPosition = parseFloat(vaultData.userAssetsFormatted.replace(/[$,]/g, ""));
  const principalAmount = vault?.position.invested || 0;
  const earnedYield = vault?.position.earnedYield || 0;
  const currentBalance = vault ? parseFloat(vault.balance.balance) : 0;
  const currentYield = vault?.currentYield || "0%";

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setWithdrawalPercentage(0);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Handle EOA transaction confirmation
  useEffect(() => {
    if (txConfirmed) {
      console.log("✅ Withdrawal confirmed");
      setIsLoading(false);
      onClose();
    }
  }, [txConfirmed, onClose]);

  const handleSliderChange = (percentage: number) => {
    setWithdrawalPercentage(percentage);
  };

  const setPercentage = (percentage: number) => {
    setWithdrawalPercentage(percentage);
  };

  const handleConfirmWithdrawal = async () => {
    if (withdrawalPercentage === 0) {
      alert("Please select a withdrawal percentage.");
      return;
    }

    if (!vault || !address || !vaultInfo) {
      alert("Vault information not available.");
      return;
    }

    const withdrawAmount = (totalPosition * withdrawalPercentage) / 100;
    let confirmMessage = '';

    if (withdrawalPercentage === 100) {
      confirmMessage = `withdraw your entire position of $${withdrawAmount.toFixed(2)} (100%)`;
    } else {
      confirmMessage = `withdraw ${withdrawalPercentage}% of your position ($${withdrawAmount.toFixed(2)})`;
    }

    if (!confirm(`Are you sure you want to ${confirmMessage}?`)) {
      return;
    }

    // Calculate assets to withdraw (in USDC wei with 6 decimals)
    const assetsToWithdraw = parseUnits(withdrawAmount.toFixed(6), 6);

    setIsLoading(true);

    try {
      if (accountTypeInfo.isAccountKit || accountTypeInfo.type === "ACCOUNT_KIT") {
        console.log("🔐 Using Account Kit for withdrawal");
        await withdrawAA({
          functionName: "withdraw",
          args: [assetsToWithdraw, address, address],
        });
        console.log("✅ AA Withdrawal complete");
        setIsLoading(false);
        onClose();
      } else if (accountTypeInfo.isEOA && vaultInfo) {
        console.log("👤 Using EOA wallet for withdrawal");
        const hash = await writeEOA({
          address: vaultInfo.address,
          abi: vaultInfo.abi,
          functionName: "withdraw",
          args: [assetsToWithdraw, address, address],
        });
        console.log("Withdrawal transaction hash:", hash);
        // Will close modal in useEffect when txConfirmed
      } else {
        console.log("🔄 Fallback: Using Account Kit method for withdrawal");
        await withdrawAA({
          functionName: "withdraw",
          args: [assetsToWithdraw, address, address],
        });
        setIsLoading(false);
        onClose();
      }
    } catch (error) {
      console.error("Withdrawal error:", error);
      setIsLoading(false);
      alert("Withdrawal failed. Please try again.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && withdrawalPercentage > 0) {
      handleConfirmWithdrawal();
    }
  };

  const handleEscapeKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  // Calculations
  const withdrawAmount = (totalPosition * withdrawalPercentage) / 100;
  const remainingPosition = totalPosition - withdrawAmount;
  const newBalance = currentBalance + withdrawAmount;
  const isConfirmDisabled = withdrawalPercentage === 0;

  const getButtonText = () => {
    if (withdrawalPercentage === 0) {
      return "Select Amount to Withdraw";
    } else if (withdrawalPercentage === 100) {
      return "Confirm Full Withdrawal";
    } else {
      return `Withdraw ${withdrawalPercentage}% ($${withdrawAmount.toFixed(2)})`;
    }
  };

  const getButtonStyles = () => {
    if (isConfirmDisabled) {
      return "bg-gray-300 text-gray-500 cursor-not-allowed";
    } else if (withdrawalPercentage === 100) {
      return "bg-yellow-600 text-white hover:bg-yellow-700";
    } else {
      return "bg-blue-600 text-white hover:bg-blue-700";
    }
  };

  if (!isOpen || !vault) return null;

  // Additional safeguard: Don't render modal if no position available
  if (totalPosition <= 0) {
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Position to Withdraw
            </h3>
            <p className="text-gray-600 mb-6">
              You do not have any position in this vault to withdraw. Please invest first to build a position.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-blue-600 text-white font-medium py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            💵 Withdraw from {vault.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Position Breakdown */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-4">Your Position Breakdown</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Position Value</span>
                <span className="font-semibold text-gray-900">${totalPosition.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">├ Principal Amount</span>
                <span className="font-semibold text-gray-900">${principalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">└ Earned Yield</span>
                <span className="font-semibold text-green-600">${earnedYield.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Yield</span>
                <span className="font-semibold text-green-600">{currentYield}</span>
              </div>
            </div>
          </div>

          {/* Percentage Slider */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-4">Select Withdrawal Percentage</h4>
            
            {/* Percentage Display */}
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-blue-600 mb-2">{withdrawalPercentage}%</div>
              <div className="text-lg text-gray-700">
                Withdraw <span className="font-semibold text-green-600">${withdrawAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Slider */}
            <div className="mb-6">
              <input
                type="range"
                min="0"
                max="100"
                value={withdrawalPercentage}
                onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                onKeyPress={handleKeyPress}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${withdrawalPercentage}%, #e5e7eb ${withdrawalPercentage}%, #e5e7eb 100%)`
                }}
              />
            </div>

            {/* Quick Percentage Buttons */}
            <div className="flex gap-2 justify-between mb-4">
              <button
                onClick={() => setPercentage(25)}
                className="flex-1 bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                25%
              </button>
              <button
                onClick={() => setPercentage(50)}
                className="flex-1 bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                50%
              </button>
              <button
                onClick={() => setPercentage(75)}
                className="flex-1 bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                75%
              </button>
              <button
                onClick={() => setPercentage(100)}
                className="flex-1 bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                100%
              </button>
            </div>

            {/* Summary Info */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Remaining Position</span>
                <span className="font-semibold text-gray-900">${remainingPosition.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">New {vault.symbol} Balance</span>
                <span className="font-semibold text-gray-900">${newBalance.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Full Withdrawal Warning */}
          {withdrawalPercentage === 100 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="text-red-800 font-semibold mb-2">
                ⚠️ Full Withdrawal Impact
              </div>
              <div className="text-sm text-red-700">
                You will lose future yield opportunities. Consider partial withdrawal to maintain your position.
              </div>
            </div>
          )}

          {/* Transaction Fee Info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-yellow-800 font-medium">⚠️ Estimated Gas Fee</span>
              <span className="font-semibold text-yellow-900">~$1.80</span>
            </div>
            <div className="text-xs text-yellow-700">
              Gas fees are deducted separately and may vary based on network conditions.
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
              onClick={handleConfirmWithdrawal}
              disabled={isConfirmDisabled || isLoading || isConfirming}
              className={`flex-1 font-medium py-3 px-6 rounded-xl transition-colors ${getButtonStyles()}`}
            >
              {isLoading || isConfirming ? "Processing..." : getButtonText()}
            </button>
          </div>

          {/* Loading State */}
          {(isLoading || isConfirming) && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
              <div className="bg-white rounded-xl p-8 text-center">
                <div className="inline-block w-10 h-10 border-4 border-gray-200 border-t-yellow-600 rounded-full animate-spin mb-4"></div>
                <div className="text-gray-600">Processing your withdrawal...</div>
                {accountTypeInfo.isEOA && (
                  <div className="text-sm text-gray-500 mt-2">
                    Please confirm the transaction in your wallet
                  </div>
                )}
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

        .slider:focus {
          outline: none;
        }

        .slider:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
        }
      `}</style>
    </div>
  );
};

export default WithdrawalModal;
