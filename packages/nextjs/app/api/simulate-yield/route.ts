// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { getChainById } from "~~/utils/scaffold-alchemy/chainUtils";

// Default hardhat private key (same as in hardhat.config.ts)
const DEPLOYER_PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!DEPLOYER_PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY is not set");
}

// MockERC20 ABI - only the functions we need
const MOCK_ERC20_ABI = [
  "function mint(address to, uint256 amount) external",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function decimals() public view returns (uint8)",
  "function symbol() public view returns (string)",
  "function balanceOf(address account) public view returns (uint256)",
];

// MockYieldStrategy ABI - only the functions we need
const MOCK_YIELD_STRATEGY_ABI = [
  "function drip(uint256 amount) external",
  "function totalAssets() public view returns (uint256)",
  "function asset() public view returns (address)",
];

export async function POST(req: NextRequest) {
  try {
    const { amount, chainId } = await req.json();

    // Validate input
    if (!amount || !chainId) {
      return NextResponse.json({ error: "Missing required fields: amount, chainId" }, { status: 400 });
    }

    // Validate amount is positive
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    // Get chain configuration
    const chain = getChainById(chainId);
    if (!chain) {
      return NextResponse.json({ error: `Chain not found: ${chainId}` }, { status: 404 });
    }

    // Get RPC URL
    const apiKey = process.env.ALCHEMY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ALCHEMY_API_KEY is not set" }, { status: 500 });
    }

    const rpcUrl = `${chain.rpcUrls.alchemy.http[0]}/${apiKey}`;

    // Create provider and signer
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

    // Get deployed contracts to find addresses
    let mockUSDCAddress: string;
    let mockYieldStrategyAddress: string;

    try {
      // Import deployed contracts dynamically
      const deployedContracts = await import("~~/contracts/deployedContracts");
      const chainContracts = deployedContracts.default[chainId];

      if (!chainContracts?.MockERC20) {
        return NextResponse.json({ error: "MockERC20 not deployed on this chain" }, { status: 404 });
      }

      if (!chainContracts?.MockYieldStrategy) {
        return NextResponse.json({ error: "MockYieldStrategy not deployed on this chain" }, { status: 404 });
      }

      mockUSDCAddress = chainContracts.MockERC20.address;
      mockYieldStrategyAddress = chainContracts.MockYieldStrategy.address;
    } catch (error) {
      console.error("Error getting deployed contracts:", error);
      // Fallback to hardcoded addresses for Sepolia testnet
      if (chainId === 11155111) {
        mockUSDCAddress = "0x62090CD0807c1d2E080f48f18F5893060b1a3C62";
        mockYieldStrategyAddress = "0x925d9069FC55236D44640E2226b0aF43495573D3";
      } else {
        return NextResponse.json({ error: "Contracts not available on this chain" }, { status: 404 });
      }
    }

    // Create contract instances
    const mockUSDC = new ethers.Contract(mockUSDCAddress, MOCK_ERC20_ABI, signer);
    const mockYieldStrategy = new ethers.Contract(mockYieldStrategyAddress, MOCK_YIELD_STRATEGY_ABI, signer);

    // Get decimals for proper amount calculation
    const decimals = await mockUSDC.decimals();
    const yieldAmount = ethers.parseUnits(amount.toString(), decimals);

    console.log(`Simulating yield: ${amount} USDC to MockYieldStrategy`);
    console.log(`Strategy address: ${mockYieldStrategyAddress}`);
    console.log(`USDC address: ${mockUSDCAddress}`);

    // Get strategy's total assets before
    const totalAssetsBefore = await mockYieldStrategy.totalAssets();

    // Step 1: Mint USDC to the deployer (signer) first
    console.log(`Minting ${amount} USDC to deployer for yield simulation...`);
    const mintTx = await mockUSDC.mint(signer.address, yieldAmount);
    await mintTx.wait();

    // Step 2: Approve the strategy to spend the USDC
    console.log(`Approving MockYieldStrategy to spend ${amount} USDC...`);
    const approveTx = await mockUSDC.approve(mockYieldStrategyAddress, yieldAmount);
    await approveTx.wait();

    // Step 3: Call drip function to simulate yield
    console.log(`Calling drip function with ${amount} USDC...`);
    const dripTx = await mockYieldStrategy.drip(yieldAmount);
    await dripTx.wait();

    // Get strategy's total assets after
    const totalAssetsAfter = await mockYieldStrategy.totalAssets();

    return NextResponse.json({
      success: true,
      mintTxHash: mintTx.hash,
      approveTxHash: approveTx.hash,
      dripTxHash: dripTx.hash,
      amount: amount,
      yieldSimulated: ethers.formatUnits(yieldAmount, decimals),
      totalAssetsBefore: ethers.formatUnits(totalAssetsBefore, decimals),
      totalAssetsAfter: ethers.formatUnits(totalAssetsAfter, decimals),
      strategyAddress: mockYieldStrategyAddress,
      message: `Successfully simulated ${amount} USDC yield in MockYieldStrategy. Total assets increased from ${ethers.formatUnits(totalAssetsBefore, decimals)} to ${ethers.formatUnits(totalAssetsAfter, decimals)} USDC.`,
    });
  } catch (error) {
    console.error("Yield simulation error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
