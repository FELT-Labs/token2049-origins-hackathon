"use client";

import { useAuthModal } from "@account-kit/react";
import type { NextPage } from "next";
import TokenBalances from "~~/components/TokenBalances";
import { CounterUI } from "~~/components/counter/CounterUI";
import { useClient } from "~~/hooks/scaffold-alchemy/useClient";

const Home: NextPage = () => {
  const { address } = useClient();
  const { openAuthModal } = useAuthModal();
  const isConnected = !!address;

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10 max-w-6xl mx-auto px-5">
        <div className="w-full">
          {!isConnected ? (
            <>
              <h1 className="text-center mb-8">
                <span className="block text-2xl mb-2 text-apple-text-secondary font-medium tracking-apple">
                  Welcome to
                </span>
                <span className="block text-4xl font-semibold text-apple-text-primary tracking-apple-tight">
                  💰 YieldVault
                </span>
              </h1>
              <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row mb-8">
                <button
                  className="px-8 py-4 bg-apple-text-primary text-white font-medium rounded-apple-md transition-all duration-300 ease-apple hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-apple-md my-4"
                  onClick={openAuthModal}
                >
                  Login and start investing!
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8">
                <TokenBalances />
              </div>
              <div className="mb-8">
                <CounterUI />
              </div>
            </>
          )}

          
        </div>
      </div>
    </>
  );
};

export default Home;
