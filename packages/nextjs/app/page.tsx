"use client";

import { useAuthModal } from "@account-kit/react";
import type { NextPage } from "next";
import { CounterUI } from "~~/components/counter/CounterUI";
import { Address } from "~~/components/scaffold-alchemy";
import { useClient } from "~~/hooks/scaffold-alchemy/useClient";
import TokenBalances from "~~/components/TokenBalances";

const Home: NextPage = () => {
  const { address } = useClient();
  const { openAuthModal } = useAuthModal();
  const isConnected = !!address;

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-2xl mb-2">Welcome to</span>
            <span className="block text-4xl font-bold">Scaffold-Alchemy</span>
          </h1>
          <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row">
            {isConnected ? (
              <>
                <p className="my-2 font-medium">Connected Address:</p>
                <Address address={address} />
              </>
            ) : (
              <button className="btn btn-primary my-4" onClick={openAuthModal}>
                Login and do stuff onchain!
              </button>
            )}
          </div>

          {isConnected && (
            <>
              <div className="mt-8 mb-8">
                <TokenBalances />
              </div>
              <div className="mt-8 mb-8">
                <CounterUI />
              </div>
            </>
          )}

          <p className="text-center text-lg">
            Get started by editing{" "}
            <code className="italic bg-base-300 text-base font-bold max-w-full break-words break-all inline-block">
              packages/nextjs/app/page.tsx
            </code>
          </p>
          <p className="text-center text-lg">
            Edit your smart contract{" "}
            <code className="italic bg-base-300 text-base font-bold max-w-full break-words break-all inline-block">
              Counter.sol
            </code>{" "}
            in{" "}
            <code className="italic bg-base-300 text-base font-bold max-w-full break-words break-all inline-block">
              packages/hardhat/contracts
            </code>
          </p>
        </div>
      </div>
    </>
  );
};

export default Home;
