import { useMemo } from "react";
import { alchemyEnhancedApiActions } from "@account-kit/infra";
import { UseSmartAccountClientProps, useLogout, useSmartAccountClient } from "@account-kit/react";
import { Alchemy, Network } from "alchemy-sdk";
import scaffoldConfig from "~~/scaffold.config";
import { RPC_CHAIN_NAMES } from "~~/utils/scaffold-alchemy";

export const useClient = (
  config: UseSmartAccountClientProps = {
    type: "LightAccount",
  },
) => {
  const { logout } = useLogout();
  let client: any, address: any;
  try {
    const val = useSmartAccountClient(config);
    client = val.client;
    address = val.address;
  } catch (ex) {
    console.error(ex);
    logout();
  }

  // Memoize the Alchemy instance and enhanced client to prevent unnecessary re-renders
  const enhancedClient = useMemo(() => {
    if (!client) return null;

    const alchemy = new Alchemy({
      url: client.transport.alchemyRpcUrl,
      network: RPC_CHAIN_NAMES[scaffoldConfig.targetNetworks[0].id] as Network,
    });
    const enhancedApiDecorator = alchemyEnhancedApiActions(alchemy);
    return client.extend(enhancedApiDecorator);
  }, [client]);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      client: enhancedClient,
      origClient: client,
      address,
    }),
    [enhancedClient, client, address],
  );
};

export type Client = ReturnType<typeof useClient>["client"];
