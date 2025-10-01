import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("MockYieldStrategy", function () {
  const INITIAL_USDC_SUPPLY = ethers.parseUnits("1000000", 6); // 1M USDC
  const STRATEGY_NAME_PREFIX = "Mock ";
  const STRATEGY_SYMBOL_PREFIX = "m";

  /**
   * Test fixture that deploys MockYieldStrategy with USDC
   */
  async function deployMockYieldStrategyFixture() {
    const [owner, vault, user1, user2] = await ethers.getSigners();

    // Deploy Mock USDC Token
    const MockERC20Factory = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    const usdc = await MockERC20Factory.deploy("USD Coin", "USDC");
    await usdc.waitForDeployment();

    // Deploy MockYieldStrategy
    const MockYieldStrategyFactory = await ethers.getContractFactory("MockYieldStrategy");
    const strategy = await MockYieldStrategyFactory.deploy(
      await usdc.getAddress(),
      vault.address, // Using vault signer as vault address for simplicity
      owner.address,
    );
    await strategy.waitForDeployment();

    // Distribute USDC to accounts
    await (usdc as any).connect(owner).transfer(user1.address, INITIAL_USDC_SUPPLY / 4n);
    await (usdc as any).connect(owner).transfer(user2.address, INITIAL_USDC_SUPPLY / 4n);
    await (usdc as any).connect(owner).transfer(vault.address, INITIAL_USDC_SUPPLY / 4n);

    return {
      strategy: strategy as any,
      usdc: usdc as any,
      owner,
      vault,
      user1,
      user2,
      INITIAL_USDC_SUPPLY,
    };
  }

  /**
   * Test fixture with strategy that has some initial deposits
   */
  async function deployStrategyWithDepositsFixture() {
    const fixtureData = await deployMockYieldStrategyFixture();
    const { strategy, usdc, vault } = fixtureData;

    const depositAmount = ethers.parseUnits("10000", 6); // 10K USDC

    // Vault deposits into strategy
    await usdc.connect(vault).approve(await strategy.getAddress(), depositAmount);
    await strategy.connect(vault).deposit(depositAmount, vault.address);

    return { ...fixtureData, depositAmount };
  }

  describe("Deployment", function () {
    it("Should deploy with correct parameters", async function () {
      const { strategy, usdc, vault, owner } = await loadFixture(deployMockYieldStrategyFixture);

      expect(await strategy.asset()).to.equal(await usdc.getAddress());
      expect(await strategy.vault()).to.equal(vault.address);
      expect(await strategy.owner()).to.equal(owner.address);

      // Check name and symbol construction
      const expectedName = STRATEGY_NAME_PREFIX + (await usdc.name()) + " Strategy";
      const expectedSymbol = STRATEGY_SYMBOL_PREFIX + (await usdc.symbol()) + "STRAT";

      expect(await strategy.name()).to.equal(expectedName);
      expect(await strategy.symbol()).to.equal(expectedSymbol);
    });

    it("Should start with zero total assets and shares", async function () {
      const { strategy } = await loadFixture(deployMockYieldStrategyFixture);

      expect(await strategy.totalAssets()).to.equal(0);
      expect(await strategy.totalSupply()).to.equal(0);
    });

    it("Should have correct decimals matching underlying asset", async function () {
      const { strategy, usdc } = await loadFixture(deployMockYieldStrategyFixture);

      expect(await strategy.decimals()).to.equal(await usdc.decimals());
    });
  });

  describe("Access Control", function () {
    it("Should only allow vault to deposit", async function () {
      const { strategy, usdc, user1 } = await loadFixture(deployMockYieldStrategyFixture);

      const depositAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);

      await expect(strategy.connect(user1).deposit(depositAmount, user1.address)).to.be.revertedWith(
        "BaseStrategy: caller not vault",
      );
    });

    it("Should only allow vault to withdraw", async function () {
      const { strategy, user1 } = await loadFixture(deployStrategyWithDepositsFixture);

      await expect(
        strategy.connect(user1).withdraw(ethers.parseUnits("100", 6), user1.address, user1.address),
      ).to.be.revertedWith("BaseStrategy: caller not vault");
    });

    it("Should only allow vault to mint", async function () {
      const { strategy, usdc, user1 } = await loadFixture(deployMockYieldStrategyFixture);

      const shareAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await strategy.getAddress(), shareAmount);

      await expect(strategy.connect(user1).mint(shareAmount, user1.address)).to.be.revertedWith(
        "BaseStrategy: caller not vault",
      );
    });

    it("Should only allow vault to redeem", async function () {
      const { strategy, user1 } = await loadFixture(deployStrategyWithDepositsFixture);

      await expect(
        strategy.connect(user1).redeem(ethers.parseUnits("100", 6), user1.address, user1.address),
      ).to.be.revertedWith("BaseStrategy: caller not vault");
    });
  });

  describe("Deposit Functionality", function () {
    it("Should allow vault to deposit assets", async function () {
      const { strategy, usdc, vault } = await loadFixture(deployMockYieldStrategyFixture);

      const depositAmount = ethers.parseUnits("1000", 6);

      await usdc.connect(vault).approve(await strategy.getAddress(), depositAmount);

      const tx = await strategy.connect(vault).deposit(depositAmount, vault.address);

      expect(await strategy.totalAssets()).to.equal(depositAmount);
      expect(await strategy.balanceOf(vault.address)).to.equal(depositAmount); // 1:1 for first deposit
      expect(await usdc.balanceOf(await strategy.getAddress())).to.equal(depositAmount);

      await expect(tx)
        .to.emit(strategy, "Deposit")
        .withArgs(vault.address, vault.address, depositAmount, depositAmount);
    });

    it("Should calculate shares correctly for subsequent deposits", async function () {
      const { strategy, usdc, vault, owner } = await loadFixture(deployMockYieldStrategyFixture);

      const firstDeposit = ethers.parseUnits("1000", 6);
      const yieldAmount = ethers.parseUnits("200", 6); // 20% yield
      const secondDeposit = ethers.parseUnits("600", 6);

      // First deposit (1:1 ratio)
      await usdc.connect(vault).approve(await strategy.getAddress(), firstDeposit);
      await strategy.connect(vault).deposit(firstDeposit, vault.address);

      // Simulate yield via drip
      await usdc.connect(owner).approve(await strategy.getAddress(), yieldAmount);
      await strategy.connect(owner).drip(yieldAmount);

      // Second deposit should get fewer shares due to increased asset value
      const expectedShares = await strategy.previewDeposit(secondDeposit);

      await usdc.connect(vault).approve(await strategy.getAddress(), secondDeposit);
      const sharesBefore = await strategy.balanceOf(vault.address);
      await strategy.connect(vault).deposit(secondDeposit, vault.address);
      const sharesAfter = await strategy.balanceOf(vault.address);

      const actualShares = sharesAfter - sharesBefore;
      expect(actualShares).to.be.approximately(expectedShares, 1); // Allow 1 wei rounding
      expect(actualShares).to.be.lt(secondDeposit); // Should get fewer shares due to yield
    });

    it("Should allow vault to mint shares", async function () {
      const { strategy, usdc, vault } = await loadFixture(deployMockYieldStrategyFixture);

      const sharesToMint = ethers.parseUnits("1000", 6);
      const expectedAssets = await strategy.previewMint(sharesToMint);

      await usdc.connect(vault).approve(await strategy.getAddress(), expectedAssets);

      const tx = await strategy.connect(vault).mint(sharesToMint, vault.address);

      expect(await strategy.balanceOf(vault.address)).to.equal(sharesToMint);
      expect(await strategy.totalAssets()).to.equal(expectedAssets);

      await expect(tx)
        .to.emit(strategy, "Deposit")
        .withArgs(vault.address, vault.address, expectedAssets, sharesToMint);
    });
  });

  describe("Withdrawal Functionality", function () {
    it("Should allow vault to withdraw assets", async function () {
      const { strategy, usdc, vault, depositAmount } = await loadFixture(deployStrategyWithDepositsFixture);

      const withdrawAmount = ethers.parseUnits("5000", 6);
      const initialBalance = await usdc.balanceOf(vault.address);

      const tx = await strategy.connect(vault).withdraw(withdrawAmount, vault.address, vault.address);

      expect(await usdc.balanceOf(vault.address)).to.equal(initialBalance + withdrawAmount);
      expect(await strategy.totalAssets()).to.equal(depositAmount - withdrawAmount);

      await expect(tx).to.emit(strategy, "Withdraw");
    });

    it("Should allow vault to redeem shares", async function () {
      const { strategy, usdc, vault, depositAmount } = await loadFixture(deployStrategyWithDepositsFixture);

      const sharesToRedeem = ethers.parseUnits("3000", 6);
      const expectedAssets = await strategy.previewRedeem(sharesToRedeem);
      const initialBalance = await usdc.balanceOf(vault.address);

      const tx = await strategy.connect(vault).redeem(sharesToRedeem, vault.address, vault.address);

      expect(await usdc.balanceOf(vault.address)).to.equal(initialBalance + expectedAssets);
      expect(await strategy.balanceOf(vault.address)).to.equal(depositAmount - sharesToRedeem);

      await expect(tx).to.emit(strategy, "Withdraw");
    });

    it("Should handle partial withdrawals correctly", async function () {
      const { strategy, usdc, vault, depositAmount } = await loadFixture(deployStrategyWithDepositsFixture);

      const withdrawAmount = depositAmount / 2n;
      const expectedRemainingAssets = depositAmount - withdrawAmount;

      await strategy.connect(vault).withdraw(withdrawAmount, vault.address, vault.address);

      expect(await strategy.totalAssets()).to.equal(expectedRemainingAssets);
      expect(await usdc.balanceOf(await strategy.getAddress())).to.equal(expectedRemainingAssets);
    });

    it("Should fail withdrawal if insufficient liquidity", async function () {
      const { strategy, vault, depositAmount } = await loadFixture(deployStrategyWithDepositsFixture);

      const excessiveAmount = depositAmount + ethers.parseUnits("1", 6);

      await expect(
        strategy.connect(vault).withdraw(excessiveAmount, vault.address, vault.address),
      ).to.be.revertedWithCustomError(strategy, "ERC4626ExceededMaxWithdraw");
    });
  });

  describe("Yield Simulation", function () {
    it("Should allow owner to drip yield", async function () {
      const { strategy, usdc, owner, depositAmount } = await loadFixture(deployStrategyWithDepositsFixture);

      const yieldAmount = ethers.parseUnits("500", 6);

      await usdc.connect(owner).approve(await strategy.getAddress(), yieldAmount);

      const tx = await strategy.connect(owner).drip(yieldAmount);

      expect(await strategy.totalAssets()).to.equal(depositAmount + yieldAmount);

      await expect(tx)
        .to.emit(strategy, "Dripped")
        .withArgs(yieldAmount, depositAmount + yieldAmount);
    });

    it("Should not allow non-owner to drip yield", async function () {
      const { strategy, usdc, user1 } = await loadFixture(deployStrategyWithDepositsFixture);

      const yieldAmount = ethers.parseUnits("100", 6);
      await usdc.connect(user1).approve(await strategy.getAddress(), yieldAmount);

      await expect(strategy.connect(user1).drip(yieldAmount)).to.be.revertedWithCustomError(
        strategy,
        "OwnableUnauthorizedAccount",
      );
    });

    it("Should increase share price when yield is added", async function () {
      const { strategy, usdc, vault, owner } = await loadFixture(deployStrategyWithDepositsFixture);

      const initialShares = await strategy.balanceOf(vault.address);
      const initialPricePerShare = await strategy.convertToAssets(ethers.parseUnits("1", 6));

      const yieldAmount = ethers.parseUnits("1000", 6); // 10% yield
      await usdc.connect(owner).approve(await strategy.getAddress(), yieldAmount);
      await strategy.connect(owner).drip(yieldAmount);

      const newPricePerShare = await strategy.convertToAssets(ethers.parseUnits("1", 6));

      expect(newPricePerShare).to.be.greaterThan(initialPricePerShare);
      expect(await strategy.balanceOf(vault.address)).to.equal(initialShares); // Shares unchanged
    });

    it("Should allow owner to skim assets", async function () {
      const { strategy, usdc, owner, user1, depositAmount } = await loadFixture(deployStrategyWithDepositsFixture);

      const skimAmount = ethers.parseUnits("200", 6);
      const initialBalance = await usdc.balanceOf(user1.address);

      await strategy.connect(owner).skim(user1.address, skimAmount);

      expect(await usdc.balanceOf(user1.address)).to.equal(initialBalance + skimAmount);
      expect(await strategy.totalAssets()).to.equal(depositAmount - skimAmount);
    });

    it("Should not allow zero amount drip", async function () {
      const { strategy, owner } = await loadFixture(deployStrategyWithDepositsFixture);

      await expect(strategy.connect(owner).drip(0)).to.be.revertedWith("amount=0");
    });

    it("Should not allow skim to zero address", async function () {
      const { strategy, owner } = await loadFixture(deployStrategyWithDepositsFixture);

      await expect(strategy.connect(owner).skim(ethers.ZeroAddress, ethers.parseUnits("100", 6))).to.be.revertedWith(
        "to=0",
      );
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to set emergency shutdown", async function () {
      const { strategy, owner } = await loadFixture(deployMockYieldStrategyFixture);

      const tx = await strategy.connect(owner).setEmergencyShutdown(true);

      expect(await strategy.paused()).to.equal(true);

      await expect(tx).to.emit(strategy, "EmergencyShutdownUpdated").withArgs(true);
    });

    it("Should prevent deposits when emergency shutdown is active", async function () {
      const { strategy, usdc, vault, owner } = await loadFixture(deployMockYieldStrategyFixture);

      await strategy.connect(owner).setEmergencyShutdown(true);

      const depositAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(vault).approve(await strategy.getAddress(), depositAmount);

      await expect(strategy.connect(vault).deposit(depositAmount, vault.address)).to.be.revertedWithCustomError(
        strategy,
        "EnforcedPause",
      );
    });

    it("Should still allow withdrawals when paused", async function () {
      const { strategy, vault, owner } = await loadFixture(deployStrategyWithDepositsFixture);

      await strategy.connect(owner).setEmergencyShutdown(true);

      const withdrawAmount = ethers.parseUnits("1000", 6);

      // Should not revert
      await expect(strategy.connect(vault).withdraw(withdrawAmount, vault.address, vault.address)).to.not.be.reverted;
    });

    it("Should allow owner to emergency withdraw to vault", async function () {
      const { strategy, usdc, vault, owner } = await loadFixture(deployStrategyWithDepositsFixture);

      const vaultBalanceBefore = await usdc.balanceOf(vault.address);

      const tx = await strategy.connect(owner).emergencyWithdrawToVault();

      const vaultBalanceAfter = await usdc.balanceOf(vault.address);

      expect(vaultBalanceAfter).to.be.greaterThan(vaultBalanceBefore);
      expect(await usdc.balanceOf(await strategy.getAddress())).to.equal(0);

      await expect(tx).to.emit(strategy, "EmergencyWithdrawn");
    });

    it("Should return zero for maxDeposit when paused", async function () {
      const { strategy, owner, vault } = await loadFixture(deployMockYieldStrategyFixture);

      expect(await strategy.maxDeposit(vault.address)).to.equal(ethers.MaxUint256);

      await strategy.connect(owner).setEmergencyShutdown(true);
      expect(await strategy.maxDeposit(vault.address)).to.equal(0);
    });

    it("Should return zero for maxMint when paused", async function () {
      const { strategy, owner, vault } = await loadFixture(deployMockYieldStrategyFixture);

      expect(await strategy.maxMint(vault.address)).to.equal(ethers.MaxUint256);

      await strategy.connect(owner).setEmergencyShutdown(true);
      expect(await strategy.maxMint(vault.address)).to.equal(0);
    });
  });

  describe("Harvest Functionality", function () {
    it("Should allow owner to harvest (no-op in mock)", async function () {
      const { strategy, owner, depositAmount } = await loadFixture(deployStrategyWithDepositsFixture);

      const tx = await strategy.connect(owner).harvest();

      await expect(tx).to.emit(strategy, "Harvest").withArgs(0, depositAmount); // Mock returns 0 PnL
    });

    it("Should not allow non-owner to harvest", async function () {
      const { strategy, user1 } = await loadFixture(deployStrategyWithDepositsFixture);

      await expect(strategy.connect(user1).harvest()).to.be.revertedWithCustomError(
        strategy,
        "OwnableUnauthorizedAccount",
      );
    });
  });

  describe("ERC4626 Preview Functions", function () {
    it("Should preview deposits accurately", async function () {
      const { strategy, usdc, vault } = await loadFixture(deployStrategyWithDepositsFixture);

      const depositAmount = ethers.parseUnits("500", 6);
      const previewShares = await strategy.previewDeposit(depositAmount);

      await usdc.connect(vault).approve(await strategy.getAddress(), depositAmount);
      const sharesBefore = await strategy.balanceOf(vault.address);

      await strategy.connect(vault).deposit(depositAmount, vault.address);

      const actualShares = (await strategy.balanceOf(vault.address)) - sharesBefore;
      expect(actualShares).to.equal(previewShares);
    });

    it("Should preview withdrawals accurately", async function () {
      const { strategy, vault } = await loadFixture(deployStrategyWithDepositsFixture);

      const withdrawAmount = ethers.parseUnits("3000", 6);
      const previewShares = await strategy.previewWithdraw(withdrawAmount);

      const sharesBefore = await strategy.balanceOf(vault.address);
      await strategy.connect(vault).withdraw(withdrawAmount, vault.address, vault.address);
      const sharesAfter = await strategy.balanceOf(vault.address);

      const actualSharesBurned = sharesBefore - sharesAfter;
      expect(actualSharesBurned).to.equal(previewShares);
    });
  });

  describe("Edge Cases", function () {
    it("Should prevent direct ETH transfers", async function () {
      const { strategy, owner } = await loadFixture(deployMockYieldStrategyFixture);

      await expect(
        owner.sendTransaction({
          to: await strategy.getAddress(),
          value: ethers.parseEther("1"),
        }),
      ).to.be.revertedWith("BaseStrategy: no ETH");
    });

    it("Should handle zero amount deposits", async function () {
      const { strategy, usdc, vault } = await loadFixture(deployMockYieldStrategyFixture);

      await usdc.connect(vault).approve(await strategy.getAddress(), 0);

      // Zero deposits should work but do nothing
      await strategy.connect(vault).deposit(0, vault.address);
      expect(await strategy.balanceOf(vault.address)).to.equal(0);
    });

    it("Should handle rounding correctly for small amounts", async function () {
      const { strategy, usdc, vault } = await loadFixture(deployMockYieldStrategyFixture);

      const smallAmount = 1n; // 1 wei
      await usdc.connect(vault).approve(await strategy.getAddress(), smallAmount);

      await strategy.connect(vault).deposit(smallAmount, vault.address);
      expect(await strategy.balanceOf(vault.address)).to.equal(smallAmount);

      // Should be able to withdraw the same amount
      await strategy.connect(vault).withdraw(smallAmount, vault.address, vault.address);
      expect(await strategy.balanceOf(vault.address)).to.equal(0);
    });
  });
});
