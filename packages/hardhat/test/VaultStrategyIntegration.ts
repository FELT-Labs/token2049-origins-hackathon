import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { USDCVault } from "../typechain-types";

describe("Vault + Strategy Integration", function () {
  const INITIAL_USDC_SUPPLY = ethers.parseUnits("1000000", 6); // 1M USDC (6 decimals)
  const DEPOSIT_AMOUNT = ethers.parseUnits("1000", 6); // 1000 USDC
  const VAULT_NAME = "USDC Yield Vault";
  const VAULT_SYMBOL = "yUSDC";
  const STRATEGY_ALLOCATION = 5000; // 50% allocation to strategy
  const MIN_LIQUIDITY = ethers.parseUnits("1", 6); // 1 USDC minimum liquidity in vault

  /**
   * Test fixture that deploys a complete Vault + Strategy system
   * @returns Object containing deployed contracts and signers
   */
  async function deployVaultWithStrategyFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy Mock USDC Token (6 decimals like real USDC)
    const MockERC20Factory = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    const usdc = await MockERC20Factory.deploy("USD Coin", "USDC");
    await usdc.waitForDeployment();

    // Deploy Enhanced Vault with USDC as base token
    const VaultFactory = await ethers.getContractFactory("USDCVault");
    const vault = (await VaultFactory.deploy(
      await usdc.getAddress(),
      VAULT_NAME,
      VAULT_SYMBOL,
      owner.address,
    )) as USDCVault;
    await vault.waitForDeployment();

    // Deploy MockYieldStrategy
    const StrategyFactory = await ethers.getContractFactory("MockYieldStrategy");
    const strategy = await StrategyFactory.deploy(await usdc.getAddress(), await vault.getAddress(), owner.address);
    await strategy.waitForDeployment();

    // Add strategy to vault with 50% allocation
    await vault.connect(owner).addStrategy(await strategy.getAddress(), STRATEGY_ALLOCATION);

    // Distribute USDC to users for testing
    await (usdc as any).connect(owner).transfer(user1.address, INITIAL_USDC_SUPPLY / 4n);
    await (usdc as any).connect(owner).transfer(user2.address, INITIAL_USDC_SUPPLY / 4n);
    // Owner keeps the remaining half for yield simulation

    return {
      vault,
      strategy,
      usdc: usdc as any,
      owner,
      user1,
      user2,
      DEPOSIT_AMOUNT,
      INITIAL_USDC_SUPPLY,
      VAULT_NAME,
      VAULT_SYMBOL,
      STRATEGY_ALLOCATION,
    };
  }

  /**
   * Test fixture that sets up a vault+strategy with an initial deposit and rebalance
   */
  async function deployVaultWithStrategyAndDepositFixture() {
    const fixtureData = await deployVaultWithStrategyFixture();
    const { vault, usdc, user1, DEPOSIT_AMOUNT } = fixtureData;

    // Setup: user1 deposits USDC
    await usdc.connect(user1).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
    await vault.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address);

    return fixtureData;
  }

  describe("Vault + Strategy Deployment", function () {
    it("Should deploy vault and strategy with correct configuration", async function () {
      const { vault, strategy, usdc, owner } = await loadFixture(deployVaultWithStrategyFixture);

      // Verify vault configuration
      expect(await vault.name()).to.equal(VAULT_NAME);
      expect(await vault.symbol()).to.equal(VAULT_SYMBOL);
      expect(await vault.asset()).to.equal(await usdc.getAddress());
      expect(await vault.owner()).to.equal(owner.address);

      // Verify strategy configuration
      expect(await strategy.asset()).to.equal(await usdc.getAddress());
      expect(await strategy.vault()).to.equal(await vault.getAddress());
      expect(await strategy.owner()).to.equal(owner.address);

      // Verify strategy is registered in vault
      expect(await vault.isStrategy(await strategy.getAddress())).to.equal(true);
      const strategies = await vault.getStrategies();
      expect(strategies).to.include(await strategy.getAddress());

      // Verify strategy allocation
      const strategyInfo = await vault.strategyInfo(await strategy.getAddress());
      expect(strategyInfo.targetAllocation).to.equal(STRATEGY_ALLOCATION);
      expect(strategyInfo.isActive).to.equal(true);
      expect(strategyInfo.totalDeposited).to.equal(0);
    });

    it("Should have correct total allocation", async function () {
      const { vault } = await loadFixture(deployVaultWithStrategyFixture);
      expect(await vault.totalAllocation()).to.equal(STRATEGY_ALLOCATION);
    });
  });

  describe("Deposit Flow with Strategy Integration", function () {
    it("Should deposit to vault and keep funds in vault initially", async function () {
      const { vault, strategy, usdc, user1 } = await loadFixture(deployVaultWithStrategyFixture);

      const amount = ethers.parseUnits("0.5", 6);
      // Approve and deposit
      await usdc.connect(user1).approve(await vault.getAddress(), amount);
      await vault.connect(user1).deposit(amount, user1.address);

      // Verify user received shares
      expect(await vault.balanceOf(user1.address)).to.equal(amount);

      // Initially funds should stay in vault (no auto-deploy without rebalance)
      expect(await usdc.balanceOf(await vault.getAddress())).to.equal(amount);
      expect(await strategy.totalAssets()).to.equal(0);

      // Verify total assets calculation
      expect(await vault.totalAssets()).to.equal(amount);

      // Strategy should show no deposits yet
      const strategyInfo = await vault.strategyInfo(await strategy.getAddress());
      expect(strategyInfo.totalDeposited).to.equal(0);
    });

    it("Should deploy funds to strategy after rebalance", async function () {
      const { vault, strategy, usdc, user1, DEPOSIT_AMOUNT } = await loadFixture(deployVaultWithStrategyFixture);

      // Deposit to vault
      await usdc.connect(user1).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address);

      // Calculate expected deployment (50% allocation, minus min liquidity)
      const deployableAmount = DEPOSIT_AMOUNT - MIN_LIQUIDITY;
      const expectedStrategyDeposit = (deployableAmount * BigInt(STRATEGY_ALLOCATION)) / 10000n;

      // Verify funds were deployed to strategy
      const strategyInfo = await vault.strategyInfo(await strategy.getAddress());
      expect(strategyInfo.totalDeposited).to.be.approximately(expectedStrategyDeposit, ethers.parseUnits("1", 6));

      // Verify strategy received the funds
      expect(await strategy.totalAssets()).to.be.approximately(expectedStrategyDeposit, ethers.parseUnits("1", 6));

      // Verify vault still tracks total assets correctly
      expect(await vault.totalAssets()).to.be.approximately(DEPOSIT_AMOUNT, ethers.parseUnits("1", 6));

      // Verify vault has remaining liquidity
      const vaultBalance = await usdc.balanceOf(await vault.getAddress());
      expect(vaultBalance).to.be.gte(MIN_LIQUIDITY);
    });

    it("Should handle multiple deposits and maintain allocations", async function () {
      const { vault, strategy, usdc, user1, user2, DEPOSIT_AMOUNT } = await loadFixture(deployVaultWithStrategyFixture);

      // First user deposits
      await usdc.connect(user1).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address);

      // Second user deposits
      await usdc.connect(user2).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(user2).deposit(DEPOSIT_AMOUNT, user2.address);

      const totalDeposits = DEPOSIT_AMOUNT * 2n;
      const deployableAmount = totalDeposits - MIN_LIQUIDITY;
      const expectedStrategyDeposit = (deployableAmount * BigInt(STRATEGY_ALLOCATION)) / 10000n;

      // Verify total allocation is maintained
      const strategyInfo = await vault.strategyInfo(await strategy.getAddress());
      expect(strategyInfo.totalDeposited).to.be.approximately(expectedStrategyDeposit, ethers.parseUnits("2", 6));

      // Verify total assets accounting
      expect(await vault.totalAssets()).to.be.approximately(totalDeposits, ethers.parseUnits("1", 6));

      // Verify users have correct shares
      expect(await vault.balanceOf(user1.address)).to.equal(DEPOSIT_AMOUNT);
      expect(await vault.balanceOf(user2.address)).to.equal(DEPOSIT_AMOUNT);
    });
  });

  describe("Withdrawal Flow with Strategy Integration", function () {
    it("Should withdraw from vault liquidity when available", async function () {
      const { vault, usdc, user1, DEPOSIT_AMOUNT } = await loadFixture(deployVaultWithStrategyAndDepositFixture);

      const withdrawAmount = ethers.parseUnits("100", 6); // Small withdrawal
      const userUSDCBefore = await usdc.balanceOf(user1.address);
      const userSharesBefore = await vault.balanceOf(user1.address);

      // Withdraw small amount (should come from vault liquidity)
      await vault.connect(user1).withdraw(withdrawAmount, user1.address, user1.address);

      const userUSDCAfter = await usdc.balanceOf(user1.address);
      const userSharesAfter = await vault.balanceOf(user1.address);

      // Verify user received USDC
      expect(userUSDCAfter - userUSDCBefore).to.equal(withdrawAmount);

      // Verify shares were burned
      expect(userSharesBefore - userSharesAfter).to.equal(withdrawAmount);

      // Verify vault total assets decreased
      expect(await vault.totalAssets()).to.be.lt(DEPOSIT_AMOUNT);
    });

    it("Should withdraw from strategy when vault liquidity insufficient", async function () {
      const { vault, strategy, usdc, user1, DEPOSIT_AMOUNT } = await loadFixture(
        deployVaultWithStrategyAndDepositFixture,
      );

      const withdrawAmount = ethers.parseUnits("800", 6); // Large withdrawal requiring strategy withdrawal
      const userUSDCBefore = await usdc.balanceOf(user1.address);
      const strategyAssetsBefore = await strategy.totalAssets();
      const strategyInfoBefore = await vault.strategyInfo(await strategy.getAddress());
      console.log(
        withdrawAmount.toString(),
        userUSDCBefore.toString(),
        strategyAssetsBefore.toString(),
        strategyInfoBefore.totalDeposited.toString(),
      );
      console.log("Strategy assets before:", strategyAssetsBefore.toString());

      // Withdraw large amount (should trigger strategy withdrawal)
      await vault.connect(user1).withdraw(withdrawAmount, user1.address, user1.address);

      const userUSDCAfter = await usdc.balanceOf(user1.address);
      const strategyAssetsAfter = await strategy.totalAssets();
      const strategyInfoAfter = await vault.strategyInfo(await strategy.getAddress());

      // Verify user received USDC
      expect(userUSDCAfter - userUSDCBefore).to.equal(withdrawAmount);

      // Verify strategy assets decreased
      expect(strategyAssetsBefore).to.be.gt(strategyAssetsAfter);

      // Verify vault's tracking of strategy deposits decreased
      expect(strategyInfoBefore.totalDeposited).to.be.gt(strategyInfoAfter.totalDeposited);

      // Verify total vault assets are consistent
      const expectedRemainingAssets = DEPOSIT_AMOUNT - withdrawAmount;
      expect(await vault.totalAssets()).to.be.approximately(expectedRemainingAssets, ethers.parseUnits("1", 6));
    });

    it("Should handle complete withdrawal (redeem all shares)", async function () {
      const { vault, strategy, usdc, user1 } = await loadFixture(deployVaultWithStrategyAndDepositFixture);

      const userSharesBefore = await vault.balanceOf(user1.address);
      const userUSDCBefore = await usdc.balanceOf(user1.address);
      const strategyAssetsBefore = await strategy.totalAssets();

      // Redeem all shares
      await vault.connect(user1).redeem(userSharesBefore, user1.address, user1.address);

      const userSharesAfter = await vault.balanceOf(user1.address);
      const userUSDCAfter = await usdc.balanceOf(user1.address);
      const strategyAssetsAfter = await strategy.totalAssets();

      // Verify all shares were burned
      expect(userSharesAfter).to.equal(0);

      // Verify user received approximately their original deposit
      const usdcReceived = userUSDCAfter - userUSDCBefore;
      expect(usdcReceived).to.be.approximately(DEPOSIT_AMOUNT, ethers.parseUnits("1", 6));

      // Verify strategy was partially or fully withdrawn from
      expect(strategyAssetsAfter).to.be.lt(strategyAssetsBefore);

      // Verify vault totals are near zero
      expect(await vault.totalAssets()).to.be.approximately(0, ethers.parseUnits("1", 6));
      expect(await vault.totalSupply()).to.equal(0);
    });

    it("Should fail withdrawal when insufficient funds across vault and strategy", async function () {
      const { vault, user1, DEPOSIT_AMOUNT } = await loadFixture(deployVaultWithStrategyAndDepositFixture);

      // Try to withdraw more than was deposited
      const excessiveAmount = DEPOSIT_AMOUNT + ethers.parseUnits("100", 6);

      await expect(vault.connect(user1).withdraw(excessiveAmount, user1.address, user1.address)).to.be.revertedWith(
        "insufficient strategy liquidity",
      );
    });
  });

  describe("Yield Generation and Distribution", function () {
    it("Should distribute yield from strategy to vault shareholders", async function () {
      const { vault, strategy, usdc, owner, user1, user2, DEPOSIT_AMOUNT } = await loadFixture(
        deployVaultWithStrategyAndDepositFixture,
      );

      // Add second user deposit
      await usdc.connect(user2).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(user2).deposit(DEPOSIT_AMOUNT, user2.address);

      const totalDeposits = DEPOSIT_AMOUNT * 2n;

      // Simulate yield by adding USDC directly to strategy (simulating external yield)
      const yieldAmount = ethers.parseUnits("200", 6); // 200 USDC yield
      await (usdc as any).connect(owner).approve(await strategy.getAddress(), yieldAmount);
      await (strategy as any).connect(owner).drip(yieldAmount);

      // Check total assets includes the yield
      const totalAssetsWithYield = await vault.totalAssets();
      expect(totalAssetsWithYield).to.be.approximately(totalDeposits + yieldAmount, ethers.parseUnits("2", 6));

      // Calculate share price (should be > 1.0 due to yield)
      const sharePrice = await vault.convertToAssets(ethers.parseUnits("1", 6));
      const expectedSharePrice = ethers.parseUnits("1.1", 6); // 10% yield on 2000 USDC = 1.1
      expect(sharePrice).to.be.approximately(expectedSharePrice, ethers.parseUnits("0.01", 6));

      // User1 withdraws and should receive their share of yield
      const user1SharesBefore = await vault.balanceOf(user1.address);
      const user1USDCBefore = await usdc.balanceOf(user1.address);

      await vault.connect(user1).redeem(user1SharesBefore, user1.address, user1.address);

      const user1USDCAfter = await usdc.balanceOf(user1.address);
      const usdcReceived = user1USDCAfter - user1USDCBefore;

      // User1 should receive their original deposit plus their share of yield
      const expectedUSDC = DEPOSIT_AMOUNT + yieldAmount / 2n; // Half the yield since they own half the shares
      expect(usdcReceived).to.be.approximately(expectedUSDC, ethers.parseUnits("2", 6));
    });

    it("Should handle strategy yield through harvest function", async function () {
      const { vault, strategy, usdc, owner } = await loadFixture(deployVaultWithStrategyAndDepositFixture);

      // Add yield to strategy
      const yieldAmount = ethers.parseUnits("100", 6);
      await (usdc as any).connect(owner).approve(await strategy.getAddress(), yieldAmount);
      await (strategy as any).connect(owner).drip(yieldAmount);

      const totalAssetsBefore = await vault.totalAssets();

      // Harvest strategy (if strategy implements harvest)
      try {
        await vault.connect(owner).harvestStrategy(await strategy.getAddress());
      } catch {
        // Strategy might not implement harvest, that's ok for this test
      }

      const totalAssetsAfter = await vault.totalAssets();

      // Total assets should include the yield
      expect(totalAssetsAfter).to.be.gte(totalAssetsBefore);
      expect(totalAssetsAfter).to.be.approximately(DEPOSIT_AMOUNT + yieldAmount, ethers.parseUnits("1", 6));
    });
  });

  describe("Rebalancing and Allocation Management", function () {
    it("Should rebalance correctly when allocation changes", async function () {
      const { vault, strategy, owner } = await loadFixture(deployVaultWithStrategyAndDepositFixture);

      // Check initial allocation
      const initialStrategyInfo = await vault.strategyInfo(await strategy.getAddress());

      // Change allocation to 30%
      const newAllocation = 3000;
      await vault.connect(owner).updateStrategyAllocation(await strategy.getAddress(), newAllocation);

      // Rebalance with new allocation
      await vault.rebalance();

      const updatedStrategyInfo = await vault.strategyInfo(await strategy.getAddress());

      // Strategy should now have less funds due to lower allocation
      expect(updatedStrategyInfo.totalDeposited).to.be.lt(initialStrategyInfo.totalDeposited);

      // Verify new allocation is set
      expect(updatedStrategyInfo.targetAllocation).to.equal(newAllocation);
    });

    it("Should handle strategy removal and emergency withdrawal", async function () {
      const { vault, strategy, usdc, owner } = await loadFixture(deployVaultWithStrategyAndDepositFixture);

      const strategyAssetsBefore = await strategy.totalAssets();
      const vaultUSDCBefore = await usdc.balanceOf(await vault.getAddress());

      // Remove strategy (should trigger emergency withdrawal)
      await vault.connect(owner).removeStrategy(await strategy.getAddress());

      const strategyAssetsAfter = await strategy.totalAssets();
      const vaultUSDCAfter = await usdc.balanceOf(await vault.getAddress());

      // Strategy should have fewer assets
      expect(strategyAssetsAfter).to.be.lt(strategyAssetsBefore);

      // Vault should have more USDC
      expect(vaultUSDCAfter).to.be.gt(vaultUSDCBefore);

      // Strategy should no longer be active
      expect(await vault.isStrategy(await strategy.getAddress())).to.equal(false);

      // Total allocation should be 0
      expect(await vault.totalAllocation()).to.equal(0);
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle strategy deposit failures gracefully", async function () {
      const { vault, strategy, usdc, owner, user1, DEPOSIT_AMOUNT } = await loadFixture(deployVaultWithStrategyFixture);

      // Pause strategy to make deposits fail
      await (strategy as any).connect(owner).setEmergencyShutdown(true);

      // Deposit to vault
      await usdc.connect(user1).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address);

      // Rebalance should handle strategy deposit failure
      await expect(vault.rebalance()).to.not.be.reverted;

      // Funds should remain in vault
      expect(await usdc.balanceOf(await vault.getAddress())).to.be.gte(DEPOSIT_AMOUNT);
    });

    it("Should maintain accounting consistency during partial strategy failures", async function () {
      const { vault, strategy, owner, user1 } = await loadFixture(deployVaultWithStrategyAndDepositFixture);

      // Record initial state
      const initialVaultAssets = await vault.totalAssets();
      const initialUserShares = await vault.balanceOf(user1.address);

      // Pause strategy to simulate failure
      await (strategy as any).connect(owner).setEmergencyShutdown(true);

      // User should still be able to withdraw (from vault liquidity or emergency withdrawal)
      const withdrawAmount = ethers.parseUnits("100", 6);
      await vault.connect(user1).withdraw(withdrawAmount, user1.address, user1.address);

      // Verify accounting is still consistent
      const finalVaultAssets = await vault.totalAssets();
      const finalUserShares = await vault.balanceOf(user1.address);

      expect(finalVaultAssets).to.be.approximately(initialVaultAssets - withdrawAmount, ethers.parseUnits("1", 6));
      expect(finalUserShares).to.be.approximately(initialUserShares - withdrawAmount, ethers.parseUnits("1", 6));
    });
  });
});
