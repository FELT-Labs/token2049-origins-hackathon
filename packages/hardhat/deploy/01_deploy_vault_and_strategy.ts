import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys the USDCVault and MockYieldStrategy contracts using private key from .env
 * This script deploys both contracts in sequence and registers the strategy with the vault
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployVaultAndStrategy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const { deploy } = deployments;

  console.log("🚀 Starting Vault and Strategy deployment...");
  console.log("=".repeat(50));

  // Get deployment parameters from environment
  const privateKey = process.env.PRIVATE_KEY;
  const usdcAddress = process.env.USDC_ADDRESS;

  // Vault configuration
  const vaultName = process.env.VAULT_NAME || "USDC Yield Vault";
  const vaultSymbol = process.env.VAULT_SYMBOL || "yUSDC";

  let deployer: string;

  // Get deployer from private key or use default
  if (privateKey) {
    const deployerSigner = new hre.ethers.Wallet(privateKey, hre.ethers.provider);
    deployer = deployerSigner.address;
    console.log("🔑 Using private key deployment");
    console.log("📍 Deployer address:", deployer);
  } else {
    console.log("🏠 Using default Hardhat signer");
    const signers = await hre.ethers.getSigners();
    const deployerSigner = signers[0];
    deployer = deployerSigner.address;
  }

  // ===== STEP 1: Deploy USDC Token =====
  console.log("\n📦 Step 1: Deploy/Get USDC Token");
  console.log("-".repeat(30));

  let usdcTokenAddress: string;

  if (usdcAddress) {
    console.log("💰 Using provided USDC address:", usdcAddress);
    usdcTokenAddress = usdcAddress;
  } else {
    console.log("💰 Deploying MockERC20 as USDC...");

    const usdcDeployment = await deploy("MockERC20", {
      from: deployer,
      args: ["USD Coin", "USDC"],
      log: true,
      waitConfirmations: 1,
    });
    usdcTokenAddress = usdcDeployment.address;

    console.log("✅ MockERC20 (USDC) deployed at:", usdcTokenAddress);
  }

  // ===== STEP 2: Deploy Vault =====
  console.log("\n📦 Step 2: Deploy USDCVault");
  console.log("-".repeat(30));

  const vaultDeployment = await deploy("USDCVault", {
    from: deployer,
    args: [usdcTokenAddress, vaultName, vaultSymbol, deployer],
    log: true,
    waitConfirmations: 1,
  });

  const vaultAddress = vaultDeployment.address;
  const vault = await hre.ethers.getContractAt("USDCVault", vaultAddress);

  console.log("✅ Vault deployment summary:");
  console.log("📍 Vault address:", vaultAddress);
  console.log("💰 Asset (USDC):", await vault.asset());
  console.log("📛 Vault name:", await vault.name());
  console.log("🏷️  Vault symbol:", await vault.symbol());
  console.log("👤 Owner:", await vault.owner());

  // ===== STEP 3: Deploy Strategy =====
  console.log("\n📦 Step 3: Deploy MockYieldStrategy");
  console.log("-".repeat(30));

  const strategyDeployment = await deploy("MockYieldStrategy", {
    from: deployer,
    args: [usdcTokenAddress, vaultAddress, deployer],
    log: true,
    waitConfirmations: 1,
  });

  const strategyAddress = strategyDeployment.address;
  const strategy = await hre.ethers.getContractAt("MockYieldStrategy", strategyAddress);

  console.log("✅ Strategy deployment summary:");
  console.log("📍 Strategy address:", strategyAddress);
  console.log("💰 Asset (USDC):", await strategy.asset());
  console.log("🏦 Vault:", await strategy.vault());
  console.log("👤 Owner:", await strategy.owner());
  console.log("📛 Strategy name:", await strategy.name());
  console.log("🏷️  Strategy symbol:", await strategy.symbol());

  // ===== STEP 4: Register Strategy with Vault =====
  console.log("\n🔗 Step 4: Register Strategy with Vault");
  console.log("-".repeat(30));

  try {
    let tx;
    const vaultOwner = await vault.owner();

    if (vaultOwner.toLowerCase() === deployer.toLowerCase()) {
      if (privateKey) {
        // Use private key signer
        const deployerSigner = new hre.ethers.Wallet(privateKey, hre.ethers.provider);
        const vaultWithSigner = vault.connect(deployerSigner);
        tx = await vaultWithSigner.addStrategy(strategyAddress, 5000); // 50% allocation
      } else {
        // Use default signer
        const signers = await hre.ethers.getSigners();
        const vaultWithSigner = vault.connect(signers[0]);
        tx = await vaultWithSigner.addStrategy(strategyAddress, 5000); // 50% allocation
      }

      await tx.wait();
      console.log("✅ Strategy registered with vault successfully!");
      console.log("📄 Transaction hash:", tx.hash);

      // Verify registration
      const strategies = await vault.getStrategies();
      console.log("📋 Vault strategies count:", strategies.length);
      console.log("✅ Strategy is registered:", await vault.isStrategy(strategyAddress));
    } else {
      console.log("⚠️  Warning: Deployer is not vault owner. Cannot register strategy automatically.");
      console.log("👤 Vault owner:", vaultOwner);
      console.log("🔑 Deployer:", deployer);
      console.log("🔧 Please manually call vault.addStrategy() with the vault owner account.");
    }
  } catch (error) {
    console.log("❌ Failed to register strategy with vault:");
    console.log(error);
    console.log("\n🔧 Manual registration required:");
    console.log(`vault.addStrategy("${strategyAddress}")`);
  }

  // ===== Final Summary =====
  console.log("\n🎉 Deployment Complete!");
  console.log("=".repeat(50));
  console.log("📍 USDC Token:", usdcTokenAddress);
  console.log("📍 Vault Address:", vaultAddress);
  console.log("📍 Strategy Address:", strategyAddress);
  console.log("👤 Owner:", deployer);

  console.log("\n📝 Environment variables for reference:");
  console.log(`export VAULT_ADDRESS=${vaultAddress}`);
  console.log(`export USDC_ADDRESS=${usdcTokenAddress}`);
  console.log(`export STRATEGY_ADDRESS=${strategyAddress}`);

  console.log("\n💡 Next steps:");
  console.log("• Test with: npm run test");
  console.log("• Interact with: npx hardhat console --network <network>");
  console.log("• Fund vault: Transfer USDC and call vault.deposit()");
  console.log("• Generate yield: Call strategy.drip() to simulate yield");
};

export default deployVaultAndStrategy;

// Tags are useful if you have multiple deploy files and only want to run one of them.
deployVaultAndStrategy.tags = ["VaultAndStrategy", "Vault", "Strategy"];
deployVaultAndStrategy.dependencies = []; // No dependencies
