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
      <div className="flex items-center flex-col flex-grow pt-10 max-w-6xl mx-auto px-5">
        <div className="w-full">
          <h1 className="text-center mb-8">
            <span className="block text-2xl mb-2 text-apple-text-secondary font-medium tracking-apple">Welcome to</span>
            <span className="block text-4xl font-semibold text-apple-text-primary tracking-apple-tight">💰 YieldVault</span>
          </h1>
          <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row mb-8">
            {isConnected ? (
              <>
                <p className="my-2 font-medium text-apple-text-secondary">Connected Address:</p>
                <Address address={address} />
              </>
            ) : (
              <button 
                className="px-8 py-4 bg-apple-text-primary text-white font-medium rounded-apple-md transition-all duration-300 ease-apple hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-apple-md my-4" 
                onClick={openAuthModal}
              >
                Login and start investing!
              </button>
            )}
          </div>

          {isConnected && (
            <>
              <div className="mb-8">
                <TokenBalances />
              </div>
              <div className="mb-8">
                <CounterUI />
              </div>
            </>
          )}

          <div className="text-center space-y-4 mt-12">
            <p className="text-lg text-apple-text-secondary">
              Get started by editing{" "}
              <code className="italic bg-apple-bg-hover text-apple-text-primary font-semibold px-2 py-1 rounded-apple-sm max-w-full break-words break-all inline-block">
                packages/nextjs/app/page.tsx
              </code>
            </p>
            <p className="text-lg text-apple-text-secondary">
              Edit your smart contract{" "}
              <code className="italic bg-apple-bg-hover text-apple-text-primary font-semibold px-2 py-1 rounded-apple-sm max-w-full break-words break-all inline-block">
                Counter.sol
              </code>{" "}
              in{" "}
              <code className="italic bg-apple-bg-hover text-apple-text-primary font-semibold px-2 py-1 rounded-apple-sm max-w-full break-words break-all inline-block">
                packages/hardhat/contracts
              </code>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
