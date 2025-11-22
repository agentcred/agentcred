import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys AgentCred contracts in the correct order
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployAgentCred: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n📦 Deploying AgentCred contracts...\n");

  // 1. Deploy MockToken (for testing)
  const mockToken = await deploy("MockToken", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
  console.log("✅ MockToken deployed to:", mockToken.address);

  // 2. Deploy TrustScoreRegistry (internal reputation)
  const trustScoreRegistry = await deploy("TrustScoreRegistry", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
  console.log("✅ TrustScoreRegistry deployed to:", trustScoreRegistry.address);

  // 3. Deploy AgentStaking (requires MockToken address and treasury)
  // For testing, we'll use the deployer as the initial treasury
  const agentStaking = await deploy("AgentStaking", {
    from: deployer,
    args: [mockToken.address, deployer], // stakingToken, treasury
    log: true,
    autoMine: true,
  });
  console.log("✅ AgentStaking deployed to:", agentStaking.address);

  // 4. Deploy ContentRegistry
  const contentRegistry = await deploy("ContentRegistry", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
  console.log("✅ ContentRegistry deployed to:", contentRegistry.address);

  // 5. Deploy ERC-8004 Registries
  const identityRegistry = await deploy("IdentityRegistry", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
  console.log("✅ IdentityRegistry deployed to:", identityRegistry.address);

  const reputationRegistry = await deploy("ReputationRegistry", {
    from: deployer,
    args: [identityRegistry.address],
    log: true,
    autoMine: true,
  });
  console.log("✅ ReputationRegistry deployed to:", reputationRegistry.address);

  const validationRegistry = await deploy("ValidationRegistry", {
    from: deployer,
    args: [identityRegistry.address], // needs identityRegistry address
    log: true,
    autoMine: true,
  });
  console.log("✅ ValidationRegistry deployed to:", validationRegistry.address);

  // 6. Setup: Link contracts together
  console.log("\n🔗 Linking contracts...\n");

  const agentStakingContract = await hre.ethers.getContract("AgentStaking", deployer);
  const contentRegistryContract = await hre.ethers.getContract("ContentRegistry", deployer);
  const trustScoreRegistryContract = await hre.ethers.getContract("TrustScoreRegistry", deployer);

  // Set IdentityRegistry in AgentStaking
  const setIdentityTx = await agentStakingContract.setIdentityRegistry(identityRegistry.address);
  await setIdentityTx.wait();
  console.log("✅ Set IdentityRegistry in AgentStaking");

  // Set AgentStaking in ContentRegistry
  const setStakingTx = await contentRegistryContract.setAgentStaking(agentStaking.address);
  await setStakingTx.wait();
  console.log("✅ Set AgentStaking in ContentRegistry");

  // Grant AUDITOR_ROLE to deployer (for API endpoint)
  const AUDITOR_ROLE = await contentRegistryContract.AUDITOR_ROLE();
  const grantRoleTx = await contentRegistryContract.grantRole(AUDITOR_ROLE, deployer);
  await grantRoleTx.wait();
  console.log("✅ Granted AUDITOR_ROLE to deployer");

  // Grant AUDITOR_ROLE to ContentRegistry in AgentStaking (so it can slash)
  const AUDITOR_ROLE_STAKING = await agentStakingContract.AUDITOR_ROLE();
  const grantAuditorTx = await agentStakingContract.grantRole(AUDITOR_ROLE_STAKING, contentRegistry.address);
  await grantAuditorTx.wait();
  console.log("✅ Granted AUDITOR_ROLE to ContentRegistry in AgentStaking");

  console.log("\n✨ All contracts deployed and linked!\n");
  console.log("📋 Summary:");
  console.log("  MockToken:", mockToken.address);
  console.log("  TrustScoreRegistry:", trustScoreRegistry.address);
  console.log("  AgentStaking:", agentStaking.address);
  console.log("  ContentRegistry:", contentRegistry.address);
  console.log("  IdentityRegistry:", identityRegistry.address);
  console.log("  ReputationRegistry:", reputationRegistry.address);
  console.log("  ValidationRegistry:", validationRegistry.address);
  console.log("\n💡 Next steps:");
  console.log("  1. Mint some MockToken to your address");
  console.log("  2. Stake for Agent #1");
  console.log("  3. Visit http://localhost:3000/profile/[your-address]");
  console.log("");
};

export default deployAgentCred;

deployAgentCred.tags = ["AgentCred"];
