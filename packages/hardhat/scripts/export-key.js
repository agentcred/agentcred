const fs = require("fs");
const { ethers } = require("ethers");
require("dotenv").config();
// const password = process.env.DEPLOYER_PRIVATE_KEY_PASSWORD; // dotenv might fail on complex files

async function main() {
    if (!process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED) {
        console.log("No encrypted key found in .env");
        return;
    }

    console.log("Decrypting wallet...");
    try {
        const envContent = fs.readFileSync(".env", "utf8");

        const matchJson = envContent.match(/DEPLOYER_PRIVATE_KEY_ENCRYPTED=(.*)/);
        if (!matchJson) throw new Error("Could not find DEPLOYER_PRIVATE_KEY_ENCRYPTED in .env");
        const encryptedJson = matchJson[1].trim();

        const matchPass = envContent.match(/DEPLOYER_PRIVATE_KEY_PASSWORD=(.*)/);
        const password = matchPass ? matchPass[1].trim() : process.env.DEPLOYER_PRIVATE_KEY_PASSWORD;

        if (!password) throw new Error("Could not find DEPLOYER_PRIVATE_KEY_PASSWORD");

        const wallet = await ethers.Wallet.fromEncryptedJson(encryptedJson, password);
        console.log("\n✅ Private Key:", wallet.privateKey);
        console.log("⚠️  Keep this safe! Do not commit it to git.\n");
    } catch (e) {
        console.error("Error decrypting:", e.message);
    }
}

main();
