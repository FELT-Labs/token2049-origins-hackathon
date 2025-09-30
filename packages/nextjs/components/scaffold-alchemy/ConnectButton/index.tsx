"use client";

// @refresh reset
import { Balance } from "../Balance";
import { AddressInfoDropdown } from "./AddressInfoDropdown";
import { AddressQRCodeModal } from "./AddressQRCodeModal";
import { useAuthModal, useChain } from "@account-kit/react";
import { Address } from "viem";
import { useNetworkColor } from "~~/hooks/scaffold-alchemy";
import { useClient } from "~~/hooks/scaffold-alchemy/useClient";
import scaffoldConfig from "~~/scaffold.config";
import { getBlockExplorerAddressLink } from "~~/utils/scaffold-alchemy";

export const ConnectButton = () => {
  const { chain } = useChain();
  const networkColor = useNetworkColor();
  const { openAuthModal } = useAuthModal();
  const { address } = useClient();
  const connected = !!address;

  if (!connected) {
    return (
      <button 
        className="px-6 py-3 bg-apple-text-primary text-white font-medium rounded-apple-md transition-all duration-300 ease-apple hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-apple-md text-sm" 
        onClick={openAuthModal} 
        type="button"
      >
        Login
      </button>
    );
  }

  if (!address) {
    return <></>;
  }

  const blockExplorerAddressLink = getBlockExplorerAddressLink(scaffoldConfig.targetNetworks[0], address);

  return (
    <>
      <div className="flex flex-col items-center mr-3">
        <Balance address={address as Address} className="min-h-0 h-auto text-apple-text-primary font-medium" />
        <span className="text-xs font-medium text-apple-text-secondary" style={{ color: networkColor }}>
          {chain.name}
        </span>
      </div>
      <AddressInfoDropdown
        address={address as Address}
        displayName=""
        blockExplorerAddressLink={blockExplorerAddressLink}
      />
      <AddressQRCodeModal address={address as Address} modalId="qrcode-modal" />
    </>
  );
};
