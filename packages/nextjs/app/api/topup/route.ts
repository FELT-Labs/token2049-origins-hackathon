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
  "function decimals() public view returns (uint8)",
  "function symbol() public view returns (string)",
];

export async function POST(req: NextRequest) {
  try {
    const { userAddress, tokenSymbol, chainId } = await req.json();

    // Validate input
    if (!userAddress || !tokenSymbol || !chainId) {
      return NextResponse.json(
        { error: "Missing required fields: userAddress, tokenSymbol, chainId" },
        { status: 400 },
      );
    }

    // Only allow USDC topup for now
    if (tokenSymbol !== "USDC") {
      return NextResponse.json({ error: "Only USDC topup is supported" }, { status: 400 });
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

    // Get deployed contracts to find MockERC20 address
    let mockUSDCAddress: string;

    try {
      // Import deployed contracts dynamically
      const deployedContracts = await import("~~/contracts/deployedContracts");
      const chainContracts = deployedContracts.default[chainId];

      if (!chainContracts?.MockERC20) {
        return NextResponse.json({ error: "MockERC20 not deployed on this chain" }, { status: 404 });
      }

      mockUSDCAddress = chainContracts.MockERC20.address;
    } catch (error) {
      console.error("Error getting deployed contracts:", error);
      // Fallback to hardcoded address for Sepolia testnet
      if (chainId === 11155111) {
        mockUSDCAddress = "0x62090CD0807c1d2E080f48f18F5893060b1a3C62";
      } else {
        return NextResponse.json({ error: "MockERC20 not available on this chain" }, { status: 404 });
      }
    }

    // Create contract instance
    const mockUSDC = new ethers.Contract(mockUSDCAddress, MOCK_ERC20_ABI, signer);

    // Get decimals for proper amount calculation
    const decimals = await mockUSDC.decimals();

    // Mint 1000 USDC to the user
    const amount = ethers.parseUnits("1000", decimals);

    console.log(`Minting ${ethers.formatUnits(amount, decimals)} USDC to ${userAddress}`);

    const tx = await mockUSDC.mint(userAddress, amount);
    await tx.wait();

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      amount: "1000",
      token: tokenSymbol,
      message: `Successfully minted 1000 ${tokenSymbol} to ${userAddress}`,
    });
  } catch (error) {
    console.error("Topup error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
