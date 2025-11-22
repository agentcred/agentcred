import { expect } from "chai";
import { ethers } from "hardhat";
import { TrustScoreRegistry } from "../typechain-types";

describe("TrustScoreRegistry", function () {
    let reputationRegistry: TrustScoreRegistry;
    let owner: any;
    let auditor: any;
    let user: any;

    const AUDITOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AUDITOR_ROLE"));

    before(async () => {
        [owner, auditor, user] = await ethers.getSigners();
        const reputationRegistryFactory = await ethers.getContractFactory("TrustScoreRegistry");
        reputationRegistry = (await reputationRegistryFactory.deploy()) as TrustScoreRegistry;
        await reputationRegistry.waitForDeployment();

        await reputationRegistry.grantRole(AUDITOR_ROLE, auditor.address);
    });

    it("Should allow auditor to adjust user reputation", async function () {
        const delta = 10;

        await expect(reputationRegistry.connect(auditor).adjustUserReputation(user.address, delta))
            .to.emit(reputationRegistry, "UserReputationUpdated")
            .withArgs(user.address, delta, delta);

        expect(await reputationRegistry.userReputation(user.address)).to.equal(delta);
    });

    it("Should allow auditor to adjust agent reputation", async function () {
        const agentId = 1;
        const delta = -5;

        await expect(reputationRegistry.connect(auditor).adjustAgentReputation(agentId, delta))
            .to.emit(reputationRegistry, "AgentReputationUpdated")
            .withArgs(agentId, -5, delta);

        expect(await reputationRegistry.agentReputation(agentId)).to.equal(-5);
    });

    it("Should not allow non-auditor to adjust reputation", async function () {
        const delta = 10;

        await expect(
            reputationRegistry.connect(user).adjustUserReputation(user.address, delta)
        ).to.be.revertedWithCustomError(reputationRegistry, "AccessControlUnauthorizedAccount");
    });
});
