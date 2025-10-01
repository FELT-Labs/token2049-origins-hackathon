import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-alchemy";
import { useAccountType } from "~~/hooks/useAccountType";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/scaffold-alchemy";
import { useState, useEffect } from "react";

export const CounterUI = () => {
  const { writeContractAsync: writeYourContractAsync } = useScaffoldWriteContract({ contractName: "Counter" });
  const { data: count, refetch: refetchCount } = useScaffoldReadContract({
    contractName: "Counter",
    functionName: "x",
  });
  
  const accountTypeInfo = useAccountType();
  
  // EOA transaction hooks
  const { writeContractAsync: writeContractEOA, data: eoaTxHash } = useWriteContract();
  const { data: deployedContractData } = useDeployedContractInfo({ contractName: "Counter" });
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Wait for EOA transaction confirmation
  const { isLoading: isConfirming, isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: eoaTxHash,
  });

  // Refetch count when EOA transaction is confirmed
  useEffect(() => {
    if (txConfirmed) {
      console.log("✅ EOA transaction confirmed, refetching count");
      refetchCount();
    }
  }, [txConfirmed, refetchCount]);

  const handleIncrement = async () => {
    if (isProcessing || isConfirming) return;
    
    try {
      setIsProcessing(true);
      
      // Use Account Kit (Smart Account) for AA transactions
      if (accountTypeInfo.isAccountKit || accountTypeInfo.type === "ACCOUNT_KIT") {
        console.log("🔐 Using Account Kit (Smart Account) for increment");
        await writeYourContractAsync({
          functionName: "increment",
        });
        refetchCount();
      }
      // Use wagmi for EOA transactions
      else if (accountTypeInfo.isEOA && deployedContractData) {
        console.log("👤 Using EOA wallet for increment");
        const hash = await writeContractEOA({
          address: deployedContractData.address,
          abi: deployedContractData.abi,
          functionName: "increment",
        });
        console.log("Transaction hash:", hash);
        // refetchCount will be called when transaction is confirmed via useEffect
      }
      // Fallback: try Account Kit method
      else {
        console.log("🔄 Fallback: Using Account Kit method");
        await writeYourContractAsync({
          functionName: "increment",
        });
        refetchCount();
      }
    } catch (e) {
      console.error("Error incrementing:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecrement = async () => {
    if (isProcessing || isConfirming) return;
    
    try {
      setIsProcessing(true);
      
      // Use Account Kit (Smart Account) for AA transactions
      if (accountTypeInfo.isAccountKit || accountTypeInfo.type === "ACCOUNT_KIT") {
        console.log("🔐 Using Account Kit (Smart Account) for decrement");
        await writeYourContractAsync({
          functionName: "decrement",
        });
        refetchCount();
      }
      // Use wagmi for EOA transactions
      else if (accountTypeInfo.isEOA && deployedContractData) {
        console.log("👤 Using EOA wallet for decrement");
        const hash = await writeContractEOA({
          address: deployedContractData.address,
          abi: deployedContractData.abi,
          functionName: "decrement",
        });
        console.log("Transaction hash:", hash);
        // refetchCount will be called when transaction is confirmed via useEffect
      }
      // Fallback: try Account Kit method
      else {
        console.log("🔄 Fallback: Using Account Kit method");
        await writeYourContractAsync({
          functionName: "decrement",
        });
        refetchCount();
      }
    } catch (e) {
      console.error("Error decrementing:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const getAccountTypeDisplay = () => {
    if (accountTypeInfo.loading) return "Detecting...";
    
    switch (accountTypeInfo.type) {
      case "ACCOUNT_KIT":
        return "🔐 Smart Account (Account Kit)";
      case "SMART_CONTRACT":
        return "📄 Smart Contract Account";
      case "EOA":
        return "👤 EOA (Externally Owned Account)";
      default:
        return "❓ Unknown Account Type";
    }
  };

  const getAccountTypeColor = () => {
    switch (accountTypeInfo.type) {
      case "ACCOUNT_KIT":
        return "text-blue-600";
      case "SMART_CONTRACT":
        return "text-purple-600";
      case "EOA":
        return "text-green-600";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="flex flex-col items-center border-2 border-base-300 rounded-xl p-6">
      <div className="text-sm mb-2 font-semibold uppercase text-base-content/70">Your Counter</div>
      <div className="text-4xl font-bold mb-4">X: {count?.toString() || "0"}</div>
      
      {/* Account Type Display */}
      <div className="mb-4 p-3 bg-base-200 rounded-lg">
        <div className="text-xs text-base-content/60 mb-1">Connected Account Type:</div>
        <div className={`text-sm font-medium ${getAccountTypeColor()}`}>
          {getAccountTypeDisplay()}
        </div>
        {accountTypeInfo.address && (
          <div className="text-xs text-base-content/50 mt-1 font-mono">
            {accountTypeInfo.address.slice(0, 6)}...{accountTypeInfo.address.slice(-4)}
          </div>
        )}
        <div className="text-xs text-base-content/40 mt-1">
          Has Code: {accountTypeInfo.hasCode ? "✅ Yes" : "❌ No"}
        </div>
        {(isProcessing || isConfirming) && (
          <div className="text-xs text-blue-600 mt-1 font-medium">
            {isProcessing ? "⏳ Processing transaction..." : "⏳ Confirming transaction..."}
          </div>
        )}
      </div>
      
      <div className="flex gap-4">
        <button 
          className={`btn btn-primary ${(isProcessing || isConfirming) ? 'loading' : ''}`}
          onClick={handleIncrement}
          disabled={isProcessing || isConfirming || accountTypeInfo.loading}
        >
          {isProcessing || isConfirming ? "Processing..." : "Increment"}
        </button>
        <button 
          className={`btn btn-secondary ${(isProcessing || isConfirming) ? 'loading' : ''}`}
          onClick={handleDecrement}
          disabled={isProcessing || isConfirming || accountTypeInfo.loading}
        >
          {isProcessing || isConfirming ? "Processing..." : "Decrement"}
        </button>
      </div>
      
      {/* Transaction Method Indicator */}
      <div className="mt-2 text-xs text-base-content/60">
        {accountTypeInfo.type === "ACCOUNT_KIT" && "Using Account Kit (Gasless transactions)"}
        {accountTypeInfo.type === "EOA" && "Using EOA wallet (Gas required)"}
        {accountTypeInfo.type === "SMART_CONTRACT" && "Using Smart Contract account"}
        {accountTypeInfo.type === "UNKNOWN" && "Connect wallet to interact"}
      </div>
    </div>
  );
};
