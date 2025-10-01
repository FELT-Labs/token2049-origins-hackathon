import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { USDCVault } from "../typechain-types";

describe("USDCVault", function () {
  const INITIAL_USDC_SUPPLY = ethers.parseUnits("1000000", 6); // 1M USDC (6 decimals)
  const DEPOSIT_AMOUNT = ethers.parseUnits("1000", 6); // 1000 USDC
  const VAULT_NAME = "USDC Yield Vault";
  const VAULT_SYMBOL = "yUSDC";

  /**
   * Test fixture that deploys a Vault with USDC as base token
   * @returns Object containing deployed contracts and signers
   */
  async function deployVaultWithUSDCFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy Mock USDC Token (6 decimals like real USDC)
    const MockERC20Factory = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    const usdc = await MockERC20Factory.deploy("USD Coin", "USDC");
    await usdc.waitForDeployment();

    // Deploy Vault with USDC as base token
    const VaultFactory = await ethers.getContractFactory("USDCVault");
    const vault = (await VaultFactory.deploy(
      await usdc.getAddress(),
      VAULT_NAME,
      VAULT_SYMBOL,
      owner.address,
    )) as USDCVault;
    await vault.waitForDeployment();

    // Distribute USDC to users for testing
    await (usdc as any).connect(owner).transfer(user1.address, INITIAL_USDC_SUPPLY / 4n);
    await (usdc as any).connect(owner).transfer(user2.address, INITIAL_USDC_SUPPLY / 4n);
    // Owner keeps the remaining half for yield simulation

    return {
      vault,
      usdc: usdc as any, // Cast to any for now until proper typing
      owner,
      user1,
      user2,
      DEPOSIT_AMOUNT,
      INITIAL_USDC_SUPPLY,
      VAULT_NAME,
      VAULT_SYMBOL,
    };
  }

  /**
   * Test fixture that sets up a vault with an initial deposit from user1
   * @returns Object containing deployed contracts, signers, and initial deposit state
   */
  async function deployVaultWithDepositFixture() {
    const fixtureData = await deployVaultWithUSDCFixture();
    const { vault, usdc, user1, DEPOSIT_AMOUNT } = fixtureData;

    // Setup: user1 deposits USDC
    await usdc.connect(user1).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
    await vault.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address);

    return fixtureData;
  }

  describe("Deployment", function () {
    it("Should deploy with correct parameters", async function () {
      const { vault, usdc, owner, VAULT_NAME, VAULT_SYMBOL } = await loadFixture(deployVaultWithUSDCFixture);

      expect(await vault.name()).to.equal(VAULT_NAME);
      expect(await vault.symbol()).to.equal(VAULT_SYMBOL);
      expect(await vault.asset()).to.equal(await usdc.getAddress());
      expect(await vault.owner()).to.equal(owner.address);
      expect(await vault.decimals()).to.equal(6); // Should inherit from USDC
    });

    it("Should start with zero total assets and supply", async function () {
      const { vault } = await loadFixture(deployVaultWithUSDCFixture);

      expect(await vault.totalAssets()).to.equal(0);
      expect(await vault.totalSupply()).to.equal(0);
    });
  });

  describe("Deposit Functionality", function () {
    it("Should deposit USDC and mint shares 1:1 for first deposit", async function () {
      const { vault, usdc, user1, DEPOSIT_AMOUNT } = await loadFixture(deployVaultWithUSDCFixture);

      // Approve vault to spend user's USDC
      await usdc.connect(user1).approve(await vault.getAddress(), DEPOSIT_AMOUNT);

      const userUSDCBefore = await usdc.balanceOf(user1.address);
      const userSharesBefore = await vault.balanceOf(user1.address);

      // First deposit should mint shares 1:1 with assets
      await vault.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address);

      const userUSDCAfter = await usdc.balanceOf(user1.address);
      const userSharesAfter = await vault.balanceOf(user1.address);
      const vaultUSDCBalance = await usdc.balanceOf(await vault.getAddress());

      // Verify USDC was transferred from user to vault
      expect(userUSDCBefore - userUSDCAfter).to.equal(DEPOSIT_AMOUNT);
      expect(vaultUSDCBalance).to.equal(DEPOSIT_AMOUNT);

      // Verify shares were minted (first deposit should be 1:1)
      expect(userSharesAfter - userSharesBefore).to.equal(DEPOSIT_AMOUNT);
      expect(await vault.totalSupply()).to.equal(DEPOSIT_AMOUNT);
      expect(await vault.totalAssets()).to.equal(DEPOSIT_AMOUNT);
    });

    it("Should calculate correct share price for subsequent deposits", async function () {
      const { vault, usdc, owner, user1, user2, DEPOSIT_AMOUNT } = await loadFixture(deployVaultWithUSDCFixture);

      // Approve vault to spend users' USDC
      await usdc.connect(user1).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
      await usdc.connect(user2).approve(await vault.getAddress(), DEPOSIT_AMOUNT);

      // First deposit
      await vault.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address);

      // Simulate yield by transferring additional USDC to vault
      // This makes the share price > 1
      const yieldAmount = ethers.parseUnits("100", 6); // 100 USDC yield
      await usdc.connect(owner).transfer(await vault.getAddress(), yieldAmount);

      // Second user deposit
      const user2USDCBefore = await usdc.balanceOf(user2.address);
      const user2SharesBefore = await vault.balanceOf(user2.address);

      await vault.connect(user2).deposit(DEPOSIT_AMOUNT, user2.address);

      const user2USDCAfter = await usdc.balanceOf(user2.address);
      const user2SharesAfter = await vault.balanceOf(user2.address);

      // Verify USDC was transferred
      expect(user2USDCBefore - user2USDCAfter).to.equal(DEPOSIT_AMOUNT);

      // User2 should receive fewer shares due to increased share price
      const sharesReceived = user2SharesAfter - user2SharesBefore;
      expect(sharesReceived).to.be.lt(DEPOSIT_AMOUNT);

      // Verify the math: shares = assets * totalSupply / totalAssets
      const expectedShares = (DEPOSIT_AMOUNT * DEPOSIT_AMOUNT) / (DEPOSIT_AMOUNT + yieldAmount);
      expect(sharesReceived).to.be.approximately(expectedShares, 1); // Allow 1 wei difference for rounding
    });

    it("Should prevent deposits when paused", async function () {
      const { vault, usdc, owner, user1, DEPOSIT_AMOUNT } = await loadFixture(deployVaultWithUSDCFixture);

      await usdc.connect(user1).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(owner).setEmergencyShutdown(true);

      await expect(vault.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address)).to.be.revertedWithCustomError(
        vault,
        "EnforcedPause",
      );
    });

    it("Should return zero for maxDeposit when paused", async function () {
      const { vault, owner, user1 } = await loadFixture(deployVaultWithUSDCFixture);

      expect(await vault.maxDeposit(user1.address)).to.equal(ethers.MaxUint256);

      await vault.connect(owner).setEmergencyShutdown(true);
      expect(await vault.maxDeposit(user1.address)).to.equal(0);
    });
  });

  describe("Withdrawal Functionality", function () {
    it("Should withdraw exact USDC amount and burn shares", async function () {
      const { vault, usdc, user1 } = await loadFixture(deployVaultWithDepositFixture);
      const withdrawAmount = ethers.parseUnits("500", 6); // Withdraw 500 USDC

      const userUSDCBefore = await usdc.balanceOf(user1.address);
      const userSharesBefore = await vault.balanceOf(user1.address);
      const vaultUSDCBefore = await usdc.balanceOf(await vault.getAddress());

      await vault.connect(user1).withdraw(withdrawAmount, user1.address, user1.address);

      const userUSDCAfter = await usdc.balanceOf(user1.address);
      const userSharesAfter = await vault.balanceOf(user1.address);
      const vaultUSDCAfter = await usdc.balanceOf(await vault.getAddress());

      // Verify USDC was transferred to user
      expect(userUSDCAfter - userUSDCBefore).to.equal(withdrawAmount);
      expect(vaultUSDCBefore - vaultUSDCAfter).to.equal(withdrawAmount);

      // Verify shares were burned (1:1 for first deposit scenario)
      expect(userSharesBefore - userSharesAfter).to.equal(withdrawAmount);
    });

    it("Should redeem exact shares for USDC", async function () {
      const { vault, usdc, user1 } = await loadFixture(deployVaultWithDepositFixture);
      const redeemShares = ethers.parseUnits("300", 6); // Redeem 300 shares

      const userUSDCBefore = await usdc.balanceOf(user1.address);
      const userSharesBefore = await vault.balanceOf(user1.address);

      await vault.connect(user1).redeem(redeemShares, user1.address, user1.address);

      const userUSDCAfter = await usdc.balanceOf(user1.address);
      const userSharesAfter = await vault.balanceOf(user1.address);

      // Verify shares were burned
      expect(userSharesBefore - userSharesAfter).to.equal(redeemShares);

      // Verify USDC received (1:1 for first deposit scenario)
      expect(userUSDCAfter - userUSDCBefore).to.equal(redeemShares);
    });

    it("Should calculate correct redemption with yield", async function () {
      const { vault, usdc, owner, user1, DEPOSIT_AMOUNT } = await loadFixture(deployVaultWithDepositFixture);

      // Simulate yield by adding USDC to vault
      const yieldAmount = ethers.parseUnits("200", 6); // 200 USDC yield (20% on 1000)
      await usdc.connect(owner).transfer(await vault.getAddress(), yieldAmount);

      const userSharesBefore = await vault.balanceOf(user1.address);
      const userUSDCBefore = await usdc.balanceOf(user1.address);

      // Redeem all shares
      await vault.connect(user1).redeem(userSharesBefore, user1.address, user1.address);

      const userUSDCAfter = await usdc.balanceOf(user1.address);
      const userSharesAfter = await vault.balanceOf(user1.address);

      // All shares should be burned
      expect(userSharesAfter).to.equal(0);

      // User should receive original deposit + yield
      const expectedUSDC = DEPOSIT_AMOUNT + yieldAmount;
      const actualUSDC = userUSDCAfter - userUSDCBefore;
      expect(actualUSDC).to.be.approximately(expectedUSDC, 1); // Allow 1 wei difference for rounding
    });

    it("Should allow withdrawals even when paused", async function () {
      const { vault, owner, user1 } = await loadFixture(deployVaultWithDepositFixture);

      await vault.connect(owner).setEmergencyShutdown(true);

      const withdrawAmount = ethers.parseUnits("100", 6);

      // Should not revert
      await expect(vault.connect(user1).withdraw(withdrawAmount, user1.address, user1.address)).to.not.be.reverted;
    });

    it("Should fail withdrawal if insufficient balance", async function () {
      const { vault, user1, DEPOSIT_AMOUNT } = await loadFixture(deployVaultWithDepositFixture);

      const excessiveAmount = DEPOSIT_AMOUNT + ethers.parseUnits("1", 6);

      await expect(vault.connect(user1).withdraw(excessiveAmount, user1.address, user1.address)).to.be.revertedWith(
        "insufficient strategy liquidity",
      );
    });
  });

  describe("Share Pricing Logic", function () {
    it("Should maintain correct share price calculations", async function () {
      const { vault, usdc, owner, user1, user2, DEPOSIT_AMOUNT } = await loadFixture(deployVaultWithUSDCFixture);

      // Multiple users deposit
      await usdc.connect(user1).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
      await usdc.connect(user2).approve(await vault.getAddress(), DEPOSIT_AMOUNT);

      await vault.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address);
      await vault.connect(user2).deposit(DEPOSIT_AMOUNT, user2.address);

      // Total: 2000 USDC, 2000 shares
      expect(await vault.totalAssets()).to.equal(DEPOSIT_AMOUNT * 2n);
      expect(await vault.totalSupply()).to.equal(DEPOSIT_AMOUNT * 2n);

      // Add yield
      const yieldAmount = ethers.parseUnits("400", 6); // 20% yield
      await usdc.connect(owner).transfer(await vault.getAddress(), yieldAmount);

      // Now: 2400 USDC, 2000 shares → 1.2 USDC per share
      const sharePrice = await vault.convertToAssets(ethers.parseUnits("1", 6));
      const expectedSharePrice = ethers.parseUnits("1.2", 6);
      expect(sharePrice).to.be.approximately(expectedSharePrice, 1); // Allow 1 wei difference for rounding

      // User1 withdraws half their shares (500 shares)
      const sharesToRedeem = ethers.parseUnits("500", 6);
      const expectedUSDC = ethers.parseUnits("600", 6); // 500 * 1.2

      const user1USDCBefore = await usdc.balanceOf(user1.address);
      await vault.connect(user1).redeem(sharesToRedeem, user1.address, user1.address);
      const user1USDCAfter = await usdc.balanceOf(user1.address);

      const actualUSDC = user1USDCAfter - user1USDCBefore;
      expect(actualUSDC).to.be.approximately(expectedUSDC, 1); // Allow 1 wei difference for rounding
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero amount deposits/withdrawals", async function () {
      const { vault, usdc, user1 } = await loadFixture(deployVaultWithUSDCFixture);

      await usdc.connect(user1).approve(await vault.getAddress(), 0);

      // Zero deposits should work but do nothing
      await vault.connect(user1).deposit(0, user1.address);
      expect(await vault.balanceOf(user1.address)).to.equal(0);
    });

    it("Should prevent direct ETH transfers", async function () {
      const { vault, owner } = await loadFixture(deployVaultWithUSDCFixture);

      await expect(
        owner.sendTransaction({
          to: await vault.getAddress(),
          value: ethers.parseEther("1"),
        }),
      ).to.be.revertedWith("Vault doesn't allow direct payments.");
    });

    it("Should handle rounding correctly for small amounts", async function () {
      const { vault, usdc, user1 } = await loadFixture(deployVaultWithUSDCFixture);

      // Deposit small amount
      const smallAmount = 1n; // 1 wei of USDC
      await usdc.connect(user1).approve(await vault.getAddress(), smallAmount);

      await vault.connect(user1).deposit(smallAmount, user1.address);
      expect(await vault.balanceOf(user1.address)).to.equal(smallAmount);

      // Should be able to withdraw the same amount
      await vault.connect(user1).withdraw(smallAmount, user1.address, user1.address);
      expect(await vault.balanceOf(user1.address)).to.equal(0);
    });
  });

  describe("ERC4626 Preview Functions", function () {
    it("Should preview deposits accurately", async function () {
      const { vault, usdc, user2 } = await loadFixture(deployVaultWithDepositFixture);

      const depositAmount = ethers.parseUnits("500", 6);
      const previewShares = await vault.previewDeposit(depositAmount);

      await usdc.connect(user2).approve(await vault.getAddress(), depositAmount);
      const user2SharesBefore = await vault.balanceOf(user2.address);

      await vault.connect(user2).deposit(depositAmount, user2.address);

      const actualShares = (await vault.balanceOf(user2.address)) - user2SharesBefore;
      expect(actualShares).to.equal(previewShares);
    });

    it("Should preview withdrawals accurately", async function () {
      const { vault, user1 } = await loadFixture(deployVaultWithDepositFixture);

      const withdrawAmount = ethers.parseUnits("300", 6);
      const previewShares = await vault.previewWithdraw(withdrawAmount);

      const userSharesBefore = await vault.balanceOf(user1.address);
      await vault.connect(user1).withdraw(withdrawAmount, user1.address, user1.address);
      const userSharesAfter = await vault.balanceOf(user1.address);

      const actualSharesBurned = userSharesBefore - userSharesAfter;
      expect(actualSharesBurned).to.equal(previewShares);
    });
  });
});
