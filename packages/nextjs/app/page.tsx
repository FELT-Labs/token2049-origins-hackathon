"use client";

import { useAuthModal } from "@account-kit/react";
import type { NextPage } from "next";
import TokenBalances from "~~/components/TokenBalances";
import TokenVaults from "~~/components/TokenVaults";
import { useClient } from "~~/hooks/scaffold-alchemy/useClient";

const Home: NextPage = () => {
  const { address } = useClient();
  const { openAuthModal } = useAuthModal();
  const isConnected = !!address;

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10 max-w-7xl mx-auto px-8">
        <div className="w-full">
          {!isConnected ? (
            <>
              {/* Hero Section */}
              <div className="text-center mb-16 animate-fade-in">
                <h1 className="mb-6">
                  <span className="block text-2xl mb-4 text-apple-text-secondary font-medium tracking-apple">
                    Welcome to
                  </span>
                  <span className="block text-6xl font-bold text-apple-text-primary tracking-apple-tight mb-4">
                    💰 YieldVault
                  </span>
                  <span className="block text-xl text-apple-text-secondary font-medium tracking-apple max-w-2xl mx-auto">
                    Maximize your crypto yields with automated DeFi strategies. Professional-grade investment management
                    made simple.
                  </span>
                </h1>

                <div className="flex justify-center items-center space-x-4 flex-col sm:flex-row mb-12">
                  <button
                    className="px-10 py-5 bg-apple-text-primary text-white font-semibold rounded-apple-lg transition-all duration-300 ease-apple hover:bg-gray-800 hover:-translate-y-1 hover:shadow-apple-lg text-lg my-2"
                    onClick={openAuthModal}
                  >
                    Start Investing Today
                  </button>
                  <button className="px-8 py-5 bg-apple-bg-secondary text-apple-text-primary font-medium rounded-apple-lg transition-all duration-300 ease-apple hover:bg-apple-bg-hover hover:-translate-y-1 hover:shadow-apple-md text-lg my-2 border border-apple-border">
                    Learn More
                  </button>
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid md:grid-cols-3 gap-8 mb-16">
                <div className="bg-apple-bg-secondary backdrop-blur-apple border border-apple-border rounded-apple-xl p-8 text-center hover:-translate-y-2 transition-all duration-300 ease-apple hover:shadow-apple-lg">
                  <div className="text-4xl mb-4">🚀</div>
                  <h3 className="text-xl font-semibold text-apple-text-primary mb-3 tracking-apple-tight">
                    Automated Strategies
                  </h3>
                  <p className="text-apple-text-secondary leading-relaxed">
                    Our AI-powered algorithms continuously optimize your investments across the best DeFi protocols for
                    risk free yield.
                  </p>
                </div>

                <div className="bg-apple-bg-secondary backdrop-blur-apple border border-apple-border rounded-apple-xl p-8 text-center hover:-translate-y-2 transition-all duration-300 ease-apple hover:shadow-apple-lg">
                  <div className="text-4xl mb-4">🔒</div>
                  <h3 className="text-xl font-semibold text-apple-text-primary mb-3 tracking-apple-tight">
                    Secure & Audited
                  </h3>
                  <p className="text-apple-text-secondary leading-relaxed">
                    Your funds are protected by battle-tested smart contracts and comprehensive security audits from
                    leading firms.
                  </p>
                </div>

                <div className="bg-apple-bg-secondary backdrop-blur-apple border border-apple-border rounded-apple-xl p-8 text-center hover:-translate-y-2 transition-all duration-300 ease-apple hover:shadow-apple-lg">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-xl font-semibold text-apple-text-primary mb-3 tracking-apple-tight">
                    Real-time Analytics
                  </h3>
                  <p className="text-apple-text-secondary leading-relaxed">
                    Track your portfolio performance with detailed analytics and transparent reporting on all investment
                    activities.
                  </p>
                </div>
              </div>

              {/* Available Vaults Preview */}
              <div className="mb-16">
                <h2 className="text-3xl font-bold text-center text-apple-text-primary mb-12 tracking-apple-tight">
                  Investment Vaults Available
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-apple-bg-secondary backdrop-blur-apple border border-apple-border rounded-apple-xl p-6 hover:-translate-y-1 transition-all duration-300 ease-apple hover:shadow-apple-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-apple-text-primary">💵 USDC Vault</h3>
                      <span className="px-3 py-1 bg-apple-success/10 text-apple-success rounded-apple-md text-sm font-medium">
                        Active
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-apple-success mb-2">8.2% APY</div>
                    <p className="text-apple-text-secondary text-sm mb-4">
                      Stable asset optimization with automated lending and yield farming strategies.
                    </p>
                    <div className="text-sm text-apple-text-secondary">
                      <div className="flex justify-between">
                        <span>Total Deposits:</span>
                        <span className="font-medium">$4.2M</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-apple-bg-secondary backdrop-blur-apple border border-apple-border rounded-apple-xl p-6 hover:-translate-y-1 transition-all duration-300 ease-apple hover:shadow-apple-lg opacity-60">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-apple-text-primary">⚡ ETH Vault</h3>
                      <span className="px-3 py-1 bg-apple-warning/10 text-apple-warning rounded-apple-md text-sm font-medium">
                        Coming Soon
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-apple-warning mb-2">~12% APY</div>
                    <p className="text-apple-text-secondary text-sm mb-4">
                      ETH staking rewards combined with DeFi yield strategies for maximum returns.
                    </p>
                    <div className="text-sm text-apple-text-secondary">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className="font-medium">In Development</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-apple-bg-secondary backdrop-blur-apple border border-apple-border rounded-apple-xl p-6 hover:-translate-y-1 transition-all duration-300 ease-apple hover:shadow-apple-lg opacity-60">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-apple-text-primary">₿ Bitcoin Vault</h3>
                      <span className="px-3 py-1 bg-apple-warning/10 text-apple-warning rounded-apple-md text-sm font-medium">
                        Coming Soon
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-apple-warning mb-2">~6% APY</div>
                    <p className="text-apple-text-secondary text-sm mb-4">
                      Generate yield on Bitcoin through wrapped BTC lending and institutional strategies.
                    </p>
                    <div className="text-sm text-apple-text-secondary">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className="font-medium">In Development</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-8">
              {/* <CounterUI /> */}
              <TokenBalances />
              <TokenVaults />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Home;
