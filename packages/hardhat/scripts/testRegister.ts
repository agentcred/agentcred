import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);

    const identityRegistryAddress = "0xF3106a2Ff8BdBD7ba6CCb68bED46FE29FA244BC4"; // Address from deployedContracts.ts
    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    const identityRegistry = IdentityRegistry.attach(identityRegistryAddress);

    console.log("Calling register('test-uri')...");
    try {
        const tx = await (identityRegistry as any)["register(string)"]("test-uri");
        console.log("Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("Transaction confirmed in block:", receipt.blockNumber);
    } catch (error) {
        console.error("Error calling register:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
