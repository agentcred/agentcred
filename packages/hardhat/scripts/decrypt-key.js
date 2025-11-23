const fs = require("fs");
const { ethers } = require("ethers");
const readline = require('readline');

async function main() {
    // 1. Read encrypted key from .env manually to avoid parsing issues
    let encryptedJson;
    try {
        const envContent = fs.readFileSync(".env", "utf8");
        const match = envContent.match(/DEPLOYER_PRIVATE_KEY_ENCRYPTED=(.*)/);
        if (!match) throw new Error("Could not find DEPLOYER_PRIVATE_KEY_ENCRYPTED in .env");
        encryptedJson = match[1].trim();
    } catch (e) {
        console.error("Error reading .env:", e.message);
        process.exit(1);
    }

    // 2. Prompt for password
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Enter your password to decrypt the wallet: ', async (password) => {
        rl.close();

        try {
            console.log("\nDecrypting...");
            const wallet = await ethers.Wallet.fromEncryptedJson(encryptedJson, password);
            console.log("\n✅ Private Key:", wallet.privateKey);
            console.log("⚠️  Keep this safe! Do not commit it to git.\n");
        } catch (e) {
            console.error("\n❌ Error decrypting:", e.message);
            console.log("Make sure the password is correct.");
        }
    });
}

main();
