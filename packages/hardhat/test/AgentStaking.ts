import { expect } from "chai";
import { ethers } from "hardhat";
import { AgentStaking, MockToken } from "../typechain-types";

describe("AgentStaking", function () {
    let agentStaking: AgentStaking;
    let mockToken: MockToken;
    let owner: any;
    let auditor: any;
    let user: any;
    let treasury: any;

    const AUDITOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AUDITOR_ROLE"));

    before(async () => {
        [owner, auditor, user, treasury] = await ethers.getSigners();

        const mockTokenFactory = await ethers.getContractFactory("MockToken");
        mockToken = (await mockTokenFactory.deploy()) as MockToken;
        await mockToken.waitForDeployment();

        const agentStakingFactory = await ethers.getContractFactory("AgentStaking");
        agentStaking = (await agentStakingFactory.deploy(await mockToken.getAddress(), treasury.address)) as AgentStaking;
        await agentStaking.waitForDeployment();

        await agentStaking.grantRole(AUDITOR_ROLE, auditor.address);

        // Mint tokens to user and approve staking contract
        await mockToken.mint(user.address, ethers.parseEther("1000"));
        await mockToken.connect(user).approve(await agentStaking.getAddress(), ethers.parseEther("1000"));
    });

    it("Should allow a user to stake tokens", async function () {
        const agentId = 1;
        const amount = ethers.parseEther("100");

        await expect(agentStaking.connect(user).stake(agentId, amount))
            .to.emit(agentStaking, "Staked")
            .withArgs(agentId, user.address, amount);

        expect(await agentStaking.stakes(agentId)).to.equal(amount);
        expect(await agentStaking.agentOwners(agentId)).to.equal(user.address);
    });

    it("Should allow a user to unstake tokens", async function () {
        const agentId = 1;
        const amount = ethers.parseEther("50");

        await expect(agentStaking.connect(user).unstake(agentId, amount))
            .to.emit(agentStaking, "Unstaked")
            .withArgs(agentId, user.address, amount);

        expect(await agentStaking.stakes(agentId)).to.equal(ethers.parseEther("50"));
    });

    it("Should allow auditor to slash stake and transfer to treasury", async function () {
        const agentId = 1;
        const amount = ethers.parseEther("10");
        const reason = "Bad content";

        const treasuryBalanceBefore = await mockToken.balanceOf(treasury.address);

        await expect(agentStaking.connect(auditor).slash(agentId, amount, reason))
            .to.emit(agentStaking, "Slashed")
            .withArgs(agentId, amount, reason);

        expect(await agentStaking.stakes(agentId)).to.equal(ethers.parseEther("40"));

        // Verify treasury received the slashed funds
        const treasuryBalanceAfter = await mockToken.balanceOf(treasury.address);
        expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(amount);
    });

    it("Should not allow non-auditor to slash stake", async function () {
        const agentId = 1;
        const amount = ethers.parseEther("10");
        const reason = "Bad content";

        await expect(
            agentStaking.connect(user).slash(agentId, amount, reason)
        ).to.be.revertedWithCustomError(agentStaking, "AccessControlUnauthorizedAccount");
    });

    it("Should allow admin to set identity registry", async function () {
        const identityRegistry = "0x0000000000000000000000000000000000000001";

        await expect(agentStaking.connect(owner).setIdentityRegistry(identityRegistry))
            .to.emit(agentStaking, "IdentityRegistryUpdated")
            .withArgs(identityRegistry);

        expect(await agentStaking.identityRegistry()).to.equal(identityRegistry);
    });

    it("Should allow admin to set treasury", async function () {
        const newTreasury = "0x0000000000000000000000000000000000000002";

        await expect(agentStaking.connect(owner).setTreasury(newTreasury))
            .to.emit(agentStaking, "TreasuryUpdated")
            .withArgs(newTreasury);

        expect(await agentStaking.treasury()).to.equal(newTreasury);
    });

    it("Should reject setting treasury to zero address", async function () {
        await expect(
            agentStaking.connect(owner).setTreasury(ethers.ZeroAddress)
        ).to.be.revertedWith("Invalid treasury address");
    });

    // Edge cases
    it("Should reject staking with zero amount", async function () {
        await expect(
            agentStaking.connect(user).stake(2, 0)
        ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should reject unstaking more than staked", async function () {
        await expect(
            agentStaking.connect(user).unstake(1, ethers.parseEther("1000"))
        ).to.be.revertedWith("Insufficient stake");
    });

    it("Should reject slashing more than staked", async function () {
        await expect(
            agentStaking.connect(auditor).slash(1, ethers.parseEther("1000"), "test")
        ).to.be.revertedWith("Insufficient stake to slash");
    });

    it("Should reject unstaking from non-owner", async function () {
        await expect(
            agentStaking.connect(auditor).unstake(1, ethers.parseEther("10"))
        ).to.be.revertedWith("Only the agent owner can unstake");
    });

    it("Should reject staking on existing agent from different owner", async function () {
        // Reset identity registry to test ownership check without registry validation
        await agentStaking.connect(owner).setIdentityRegistry(ethers.ZeroAddress);

        // Agent 2 test
        const agentId = 2;
        const amount = ethers.parseEther("10");

        // First stake by user
        await mockToken.mint(user.address, ethers.parseEther("100"));
        await mockToken.connect(user).approve(await agentStaking.getAddress(), ethers.parseEther("100"));
        await agentStaking.connect(user).stake(agentId, amount);

        // Try to stake by auditor (different owner)
        await expect(
            agentStaking.connect(auditor).stake(agentId, amount)
        ).to.be.revertedWith("Only the agent owner can stake");
    });

    it("Should reject staking for non-existent agent when registry is set", async function () {
        const identityFactory = await ethers.getContractFactory("IdentityRegistry");
        const identityRegistry = await identityFactory.deploy();
        await identityRegistry.waitForDeployment();

        await agentStaking.connect(owner).setIdentityRegistry(await identityRegistry.getAddress());

        await expect(
            agentStaking.connect(user).stake(999, ethers.parseEther("10"))
        ).to.be.revertedWith("Agent not registered");
    });

    it("Should allow staking for registered agent when registry is set", async function () {
        const identityFactory = await ethers.getContractFactory("IdentityRegistry");
        const identityRegistry = await identityFactory.deploy();
        await identityRegistry.waitForDeployment();

        // Register an agent
        await identityRegistry.connect(user)["register(string)"]("ipfs://test");

        await agentStaking.connect(owner).setIdentityRegistry(await identityRegistry.getAddress());

        // Mint tokens and approve
        await mockToken.mint(user.address, ethers.parseEther("100"));
        await mockToken.connect(user).approve(await agentStaking.getAddress(), ethers.parseEther("100"));

        await expect(
            agentStaking.connect(user).stake(1, ethers.parseEther("10"))
        ).to.emit(agentStaking, "Staked");
    });
});
