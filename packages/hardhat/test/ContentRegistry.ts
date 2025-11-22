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

        await expect(contentRegistry.connect(user).publishContent(contentHash, agentId, uri))
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
            contentRegistry.connect(user).publishContent(contentHash, agentId, uri)
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
        await contentRegistry.connect(user).publishContent(contentHash, 1, "ipfs://test");

        await expect(
            contentRegistry.connect(auditor).updateAuditResult(contentHash, false, 0)
        ).to.emit(contentRegistry, "ContentAudited");
    });

    it("Should allow audit with score = 100", async function () {
        const contentHash = "hash3";
        await contentRegistry.connect(user).publishContent(contentHash, 1, "ipfs://test");

        await expect(
            contentRegistry.connect(auditor).updateAuditResult(contentHash, true, 100)
        ).to.emit(contentRegistry, "ContentAudited");
    });

    it("Should update status to AuditedFail when ok is false", async function () {
        const contentHash = "hash4";
        await contentRegistry.connect(user).publishContent(contentHash, 1, "ipfs://test");

        await contentRegistry.connect(auditor).updateAuditResult(contentHash, false, 25);

        const content = await contentRegistry.contents(contentHash);
        expect(content.status).to.equal(3); // AuditedFail
    });
});
