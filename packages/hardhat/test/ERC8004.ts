import { expect } from "chai";
import { ethers } from "hardhat";
import { IdentityRegistry, ReputationRegistry, ValidationRegistry } from "../typechain-types";

describe("ERC-8004 Registries", function () {
    let identityRegistry: IdentityRegistry;
    let reputationRegistry: ReputationRegistry;
    let validationRegistry: ValidationRegistry;
    let owner: any;
    let agentOwner: any;
    let client: any;
    let validator: any;

    before(async () => {
        [owner, agentOwner, client, validator] = await ethers.getSigners();

        // Deploy Identity Registry
        const identityFactory = await ethers.getContractFactory("IdentityRegistry");
        identityRegistry = (await identityFactory.deploy()) as IdentityRegistry;
        await identityRegistry.waitForDeployment();

        // Deploy Reputation Registry
        const reputationFactory = await ethers.getContractFactory("ReputationRegistry");
        reputationRegistry = (await reputationFactory.deploy(await identityRegistry.getAddress())) as ReputationRegistry;
        await reputationRegistry.waitForDeployment();

        // Deploy Validation Registry
        const validationFactory = await ethers.getContractFactory("ValidationRegistry");
        validationRegistry = (await validationFactory.deploy(await identityRegistry.getAddress())) as ValidationRegistry;
        await validationRegistry.waitForDeployment();
    });

    describe("Identity Registry", function () {
        it("Should register an agent", async function () {
            const tokenURI = "ipfs://agent1";
            await expect(identityRegistry.connect(agentOwner)["register(string)"](tokenURI))
                .to.emit(identityRegistry, "Registered")
                .withArgs(1, tokenURI, agentOwner.address);

            expect(await identityRegistry.ownerOf(1)).to.equal(agentOwner.address);
            expect(await identityRegistry.tokenURI(1)).to.equal(tokenURI);
        });

        it("Should set metadata", async function () {
            const key = "agentName";
            const value = ethers.toUtf8Bytes("MyAgent");

            await expect(identityRegistry.connect(agentOwner).setMetadata(1, key, value))
                .to.emit(identityRegistry, "MetadataSet")
                .withArgs(1, key, key, value);

            expect(await identityRegistry.getMetadata(1, key)).to.equal(ethers.hexlify(value));
        });
    });

    describe("Reputation Registry", function () {
        it("Should give feedback", async function () {
            const agentId = 1;
            const score = 90;
            const tag1 = ethers.keccak256(ethers.toUtf8Bytes("tag1"));
            const tag2 = ethers.keccak256(ethers.toUtf8Bytes("tag2"));
            const fileuri = "ipfs://feedback";
            const filehash = ethers.keccak256(ethers.toUtf8Bytes("content"));
            const auth = "0x"; // Mock auth

            await expect(reputationRegistry.connect(client).giveFeedback(agentId, score, tag1, tag2, fileuri, filehash, auth))
                .to.emit(reputationRegistry, "NewFeedback")
                .withArgs(agentId, client.address, score, tag1, tag2, fileuri, filehash);
        });

        it("Should get summary", async function () {
            const agentId = 1;
            const clients = [client.address];

            const [count, averageScore] = await reputationRegistry.getSummary(agentId, clients, ethers.ZeroHash, ethers.ZeroHash);

            expect(count).to.equal(1);
            expect(averageScore).to.equal(90);
        });
    });

    describe("Validation Registry", function () {
        const requestHash = ethers.keccak256(ethers.toUtf8Bytes("request"));

        it("Should create validation request", async function () {
            const agentId = 1;
            const requestUri = "ipfs://request";

            await expect(validationRegistry.connect(agentOwner).validationRequest(validator.address, agentId, requestUri, requestHash))
                .to.emit(validationRegistry, "ValidationRequest")
                .withArgs(validator.address, agentId, requestUri, requestHash);
        });

        it("Should submit validation response", async function () {
            const response = 100;
            const responseUri = "ipfs://response";
            const responseHash = ethers.keccak256(ethers.toUtf8Bytes("response"));
            const tag = ethers.keccak256(ethers.toUtf8Bytes("tag"));

            await expect(validationRegistry.connect(validator).validationResponse(requestHash, response, responseUri, responseHash, tag))
                .to.emit(validationRegistry, "ValidationResponse")
                .withArgs(validator.address, 1, requestHash, response, responseUri, tag);
        });

        // Edge cases
        it("Should reject response from non-validator", async function () {
            const requestHash2 = ethers.keccak256(ethers.toUtf8Bytes("request2"));
            await validationRegistry.connect(agentOwner).validationRequest(validator.address, 1, "ipfs://test", requestHash2);

            await expect(
                validationRegistry.connect(client).validationResponse(requestHash2, 50, "", ethers.ZeroHash, ethers.ZeroHash)
            ).to.be.revertedWith("Not authorized validator");
        });

        it("Should reject response to non-existent request", async function () {
            const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("fake"));
            await expect(
                validationRegistry.connect(validator).validationResponse(fakeHash, 50, "", ethers.ZeroHash, ethers.ZeroHash)
            ).to.be.revertedWith("Request not found");
        });

        it("Should reject response with score > 100", async function () {
            const requestHash3 = ethers.keccak256(ethers.toUtf8Bytes("request3"));
            await validationRegistry.connect(agentOwner).validationRequest(validator.address, 1, "ipfs://test", requestHash3);

            await expect(
                validationRegistry.connect(validator).validationResponse(requestHash3, 101, "", ethers.ZeroHash, ethers.ZeroHash)
            ).to.be.revertedWith("Response must be 0-100");
        });
    });

    describe("Identity Registry Edge Cases", function () {
        it("Should reject metadata update from non-owner", async function () {
            await expect(
                identityRegistry.connect(client).setMetadata(1, "test", ethers.toUtf8Bytes("value"))
            ).to.be.revertedWith("Not agent owner");
        });

        it("Should allow registration with empty URI", async function () {
            await expect(
                identityRegistry.connect(client)["register()"]()
            ).to.emit(identityRegistry, "Registered");
        });
    });

    describe("Reputation Registry Edge Cases", function () {
        it("Should reject feedback with score > 100", async function () {
            await expect(
                reputationRegistry.connect(client).giveFeedback(1, 101, ethers.ZeroHash, ethers.ZeroHash, "", ethers.ZeroHash, "0x")
            ).to.be.revertedWith("Score must be between 0 and 100");
        });

        it("Should allow feedback with score = 0", async function () {
            await expect(
                reputationRegistry.connect(client).giveFeedback(1, 0, ethers.ZeroHash, ethers.ZeroHash, "", ethers.ZeroHash, "0x")
            ).to.emit(reputationRegistry, "NewFeedback");
        });

        it("Should allow feedback with score = 100", async function () {
            await expect(
                reputationRegistry.connect(client).giveFeedback(1, 100, ethers.ZeroHash, ethers.ZeroHash, "", ethers.ZeroHash, "0x")
            ).to.emit(reputationRegistry, "NewFeedback");
        });
    });
});
