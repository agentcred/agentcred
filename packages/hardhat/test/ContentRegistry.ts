import { expect } from "chai";
import { ethers } from "hardhat";
import { ContentRegistry } from "../typechain-types";

describe("ContentRegistry", function () {
    let contentRegistry: ContentRegistry;
    let owner: any;
    let auditor: any;
    let user: any;

    const AUDITOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AUDITOR_ROLE"));

    before(async () => {
        [owner, auditor, user] = await ethers.getSigners();
        const contentRegistryFactory = await ethers.getContractFactory("ContentRegistry");
        contentRegistry = (await contentRegistryFactory.deploy()) as ContentRegistry;
        await contentRegistry.waitForDeployment();

        await contentRegistry.grantRole(AUDITOR_ROLE, auditor.address);
    });

    it("Should allow a user to publish content", async function () {
        const contentHash = "hash1";
        const agentId = 1;
        const uri = "ipfs://content1";

        await expect(contentRegistry.connect(user).publishContent(contentHash, user.address, agentId, uri))
            .to.emit(contentRegistry, "ContentPublished")
            .withArgs(contentHash, user.address, agentId, uri);

        const content = await contentRegistry.contents(contentHash);
        expect(content.contentHash).to.equal(contentHash);
        expect(content.author).to.equal(user.address);
        expect(content.agentId).to.equal(agentId);
        expect(content.status).to.equal(0); // Pending
        expect(content.uri).to.equal(uri);
    });

    it("Should not allow publishing duplicate content", async function () {
        const contentHash = "hash1";
        const agentId = 1;
        const uri = "ipfs://content1";

        await expect(
            contentRegistry.connect(user).publishContent(contentHash, user.address, agentId, uri)
        ).to.be.revertedWith("Content already exists");
    });

    it("Should allow auditor to update audit result", async function () {
        const contentHash = "hash1";
        const score = 85;

        await expect(contentRegistry.connect(auditor).updateAuditResult(contentHash, true, score))
            .to.emit(contentRegistry, "ContentAudited")
            .withArgs(contentHash, true, score);

        const content = await contentRegistry.contents(contentHash);
        expect(content.status).to.equal(2); // AuditedOk
        expect(content.auditScore).to.equal(score);
    });

    it("Should not allow non-auditor to update audit result", async function () {
        const contentHash = "hash1";
        const score = 85;

        await expect(
            contentRegistry.connect(user).updateAuditResult(contentHash, true, score)
        ).to.be.revertedWithCustomError(contentRegistry, "AccessControlUnauthorizedAccount");
    });

    // Edge cases
    it("Should reject audit for non-existent content", async function () {
        await expect(
            contentRegistry.connect(auditor).updateAuditResult("nonexistent", true, 50)
        ).to.be.revertedWith("Content does not exist");
    });

    it("Should reject audit with score > 100", async function () {
        await expect(
            contentRegistry.connect(auditor).updateAuditResult("hash1", true, 101)
        ).to.be.revertedWith("Score must be between 0 and 100");
    });

    it("Should allow audit with score = 0", async function () {
        const contentHash = "hash2";
        await contentRegistry.connect(user).publishContent(contentHash, user.address, 1, "ipfs://test");

        await expect(
            contentRegistry.connect(auditor).updateAuditResult(contentHash, false, 0)
        ).to.emit(contentRegistry, "ContentAudited");
    });

    it("Should allow audit with score = 100", async function () {
        const contentHash = "hash3";
        await contentRegistry.connect(user).publishContent(contentHash, user.address, 1, "ipfs://test");

        await expect(
            contentRegistry.connect(auditor).updateAuditResult(contentHash, true, 100)
        ).to.emit(contentRegistry, "ContentAudited");
    });

    it("Should update status to AuditedFail when ok is false", async function () {
        const contentHash = "hash4";
        await contentRegistry.connect(user).publishContent(contentHash, user.address, 1, "ipfs://test");

        await contentRegistry.connect(auditor).updateAuditResult(contentHash, false, 25);

        const content = await contentRegistry.contents(contentHash);
        expect(content.status).to.equal(3); // AuditedFail
    });

    describe("Score-Based Slashing", function () {
        let agentStaking: any;
        let mockToken: any;
        const agentId = 5;

        before(async function () {
            // Deploy MockToken
            const mockTokenFactory = await ethers.getContractFactory("MockToken");
            mockToken = await mockTokenFactory.deploy();
            await mockToken.waitForDeployment();

            // Deploy AgentStaking with treasury
            const agentStakingFactory = await ethers.getContractFactory("AgentStaking");
            agentStaking = await agentStakingFactory.deploy(await mockToken.getAddress(), auditor.address);
            await agentStaking.waitForDeployment();

            // Grant auditor role to ContentRegistry
            await agentStaking.grantRole(ethers.keccak256(ethers.toUtf8Bytes("AUDITOR_ROLE")), await contentRegistry.getAddress());

            // Set AgentStaking in ContentRegistry
            await contentRegistry.connect(owner).setAgentStaking(await agentStaking.getAddress());

            // Stake tokens for agent
            await mockToken.mint(user.address, ethers.parseEther("1000"));
            await mockToken.connect(user).approve(await agentStaking.getAddress(), ethers.parseEther("1000"));
            await agentStaking.connect(user).stake(agentId, ethers.parseEther("1000"));
        });

        it("Should set AgentStaking address", async function () {
            expect(await contentRegistry.agentStaking()).to.equal(await agentStaking.getAddress());
        });

        it("Should not slash with passing score (51-100)", async function () {
            const contentHash = "slashTest1";
            await contentRegistry.connect(user).publishContent(contentHash, user.address, agentId, "ipfs://test");

            const stakeBefore = await agentStaking.stakes(agentId);
            await contentRegistry.connect(auditor).updateAuditResult(contentHash, false, 51);
            const stakeAfter = await agentStaking.stakes(agentId);

            expect(stakeAfter).to.equal(stakeBefore); // No slash
        });

        it("Should slash 5% with mild fail (21-50)", async function () {
            const contentHash = "slashTest2";
            await contentRegistry.connect(user).publishContent(contentHash, user.address, agentId, "ipfs://test");

            const stakeBefore = await agentStaking.stakes(agentId);
            await contentRegistry.connect(auditor).updateAuditResult(contentHash, false, 30);
            const stakeAfter = await agentStaking.stakes(agentId);

            const expectedSlash = stakeBefore * BigInt(500) / BigInt(10000); // 5%
            expect(stakeBefore - stakeAfter).to.equal(expectedSlash);
        });

        it("Should slash 15% with bad fail (1-20)", async function () {
            const contentHash = "slashTest3";
            await contentRegistry.connect(user).publishContent(contentHash, user.address, agentId, "ipfs://test");

            const stakeBefore = await agentStaking.stakes(agentId);
            await contentRegistry.connect(auditor).updateAuditResult(contentHash, false, 10);
            const stakeAfter = await agentStaking.stakes(agentId);

            const expectedSlash = stakeBefore * BigInt(1500) / BigInt(10000); // 15%
            expect(stakeBefore - stakeAfter).to.equal(expectedSlash);
        });

        it("Should slash 30% with critical failure (0)", async function () {
            const contentHash = "slashTest4";
            await contentRegistry.connect(user).publishContent(contentHash, user.address, agentId, "ipfs://test");

            const stakeBefore = await agentStaking.stakes(agentId);
            await contentRegistry.connect(auditor).updateAuditResult(contentHash, false, 0);
            const stakeAfter = await agentStaking.stakes(agentId);

            const expectedSlash = stakeBefore * BigInt(3000) / BigInt(10000); // 30%
            expect(stakeBefore - stakeAfter).to.equal(expectedSlash);
        });

        it("Should not slash when audit passes (ok=true)", async function () {
            const contentHash = "slashTest5";
            await contentRegistry.connect(user).publishContent(contentHash, user.address, agentId, "ipfs://test");

            const stakeBefore = await agentStaking.stakes(agentId);
            await contentRegistry.connect(auditor).updateAuditResult(contentHash, true, 90);
            const stakeAfter = await agentStaking.stakes(agentId);

            expect(stakeAfter).to.equal(stakeBefore); // No slash on pass
        });
    });
});
