import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { usePublicClient } from "wagmi";
import { useClient } from "~~/hooks/scaffold-alchemy/useClient";

export type AccountType = "EOA" | "SMART_CONTRACT" | "ACCOUNT_KIT" | "UNKNOWN";

export interface AccountTypeInfo {
  type: AccountType;
  isSmartAccount: boolean;
  isEOA: boolean;
  isAccountKit: boolean;
  address?: string;
  hasCode: boolean;
  loading: boolean;
}

/**
 * Custom hook to detect the type of connected account
 * Distinguishes between:
 * - EOA (Externally Owned Account) - regular wallet addresses
 * - Smart Contract - addresses with bytecode
 * - Account Kit - Alchemy's smart account abstraction
 */
export const useAccountType = (): AccountTypeInfo => {
  const [accountInfo, setAccountInfo] = useState<AccountTypeInfo>({
    type: "UNKNOWN",
    isSmartAccount: false,
    isEOA: false,
    isAccountKit: false,
    hasCode: false,
    loading: true,
  });

  // Account Kit client (AA)
  const { client: accountKitClient, address: accountKitAddress } = useClient();

  // Wagmi account (could be EOA or smart contract)
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();

  // Public client for checking bytecode
  const publicClient = usePublicClient();

  useEffect(() => {
    const detectAccountType = async () => {
      setAccountInfo(prev => ({ ...prev, loading: true }));

      try {
        // Priority 1: Check if Account Kit is connected
        if (accountKitClient && accountKitAddress) {
          setAccountInfo({
            type: "ACCOUNT_KIT",
            isSmartAccount: true,
            isEOA: false,
            isAccountKit: true,
            address: accountKitAddress,
            hasCode: true, // Account Kit accounts are smart contracts
            loading: false,
          });
          return;
        }

        // Priority 2: Check wagmi connection
        if (wagmiConnected && wagmiAddress && publicClient) {
          try {
            // Check if address has bytecode
            const bytecode = await publicClient.getBytecode({ address: wagmiAddress });
            const hasCode = bytecode !== undefined && bytecode !== "0x";

            if (hasCode) {
              setAccountInfo({
                type: "SMART_CONTRACT",
                isSmartAccount: true,
                isEOA: false,
                isAccountKit: false,
                address: wagmiAddress,
                hasCode: true,
                loading: false,
              });
            } else {
              setAccountInfo({
                type: "EOA",
                isSmartAccount: false,
                isEOA: true,
                isAccountKit: false,
                address: wagmiAddress,
                hasCode: false,
                loading: false,
              });
            }
          } catch (error) {
            console.error("Error checking bytecode:", error);
            // Fallback: assume EOA if we can't check bytecode
            setAccountInfo({
              type: "EOA",
              isSmartAccount: false,
              isEOA: true,
              isAccountKit: false,
              address: wagmiAddress,
              hasCode: false,
              loading: false,
            });
          }
          return;
        }

        // No connection detected
        setAccountInfo({
          type: "UNKNOWN",
          isSmartAccount: false,
          isEOA: false,
          isAccountKit: false,
          hasCode: false,
          loading: false,
        });
      } catch (error) {
        console.error("Error detecting account type:", error);
        setAccountInfo({
          type: "UNKNOWN",
          isSmartAccount: false,
          isEOA: false,
          isAccountKit: false,
          hasCode: false,
          loading: false,
        });
      }
    };

    detectAccountType();
  }, [accountKitClient, accountKitAddress, wagmiAddress, wagmiConnected, publicClient]);

  return accountInfo;
};

/**
 * Utility function to check if a specific address is a smart contract
 * Can be used independently of the hook
 */
export const checkAddressType = async (
  address: string,
  publicClient: any,
): Promise<{ isContract: boolean; hasCode: boolean }> => {
  try {
    const bytecode = await publicClient.getBytecode({ address });
    const hasCode = bytecode !== undefined && bytecode !== "0x";
    return {
      isContract: hasCode,
      hasCode,
    };
  } catch (error) {
    console.error("Error checking address type:", error);
    return {
      isContract: false,
      hasCode: false,
    };
  }
};
