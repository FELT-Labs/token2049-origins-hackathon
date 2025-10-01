import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys a contract named "Counter" using private key from .env
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
export const CONTRACT_NAME = "Counter";
const deployYourContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  // Get deployer from private key or use default
  const privateKey = process.env.PRIVATE_KEY;
  let deployer: string;

  if (privateKey) {
    const deployerSigner = new hre.ethers.Wallet(privateKey, hre.ethers.provider);
    deployer = deployerSigner.address;
    console.log("🔑 Using private key deployment");
    console.log("📍 Deployer address:", deployer);
  } else {
    const { deployer: namedDeployer } = await getNamedAccounts();
    deployer = namedDeployer;
    console.log("🏠 Using default Hardhat signer");
  }

  console.log(`📦 Deploying ${CONTRACT_NAME}...`);

  // Deploy the Counter contract
  const counterDeployment = await deploy(CONTRACT_NAME, {
    from: deployer,
    args: [3], // Initial value for x
    log: true,
    waitConfirmations: 1,
  });

  const counter = await hre.ethers.getContractAt(CONTRACT_NAME, counterDeployment.address);
  console.log("👋 Initial value of x:", await counter.x());
  console.log("✅ Counter deployed at:", counterDeployment.address);
};

export default deployYourContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags Counter
deployYourContract.tags = ["Counter"];
