import { createPublicClient, createWalletClient, http, parseAbiItem } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import { program } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import * as dotenv from "dotenv";

// Import deployed contracts
// @ts-ignore
import deployedContracts from "../nextjs/contracts/deployedContracts";

dotenv.config();

const CHAIN_ID = 31337;
const RPC_URL = "http://127.0.0.1:8545";

// Default private key for Hardhat Account #0
const DEFAULT_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const account = privateKeyToAccount((process.env.PRIVATE_KEY || DEFAULT_PK) as `0x${string}`);

const publicClient = createPublicClient({
    chain: hardhat,
    transport: http(RPC_URL),
});

const walletClient = createWalletClient({
    account,
    chain: hardhat,
    transport: http(RPC_URL),
});

async function getContract(contractName: string) {
    const contracts = deployedContracts[CHAIN_ID];
    if (!contracts || !contracts[contractName]) {
        throw new Error(`Contract ${contractName} not found on chain ${CHAIN_ID}`);
    }
    return contracts[contractName];
}

program
    .name("agentcred-cli")
    .description("CLI to interact with AgentCred contracts")
    .version("0.0.1");

program
    .command("list")
    .description("List available contracts")
    .action(() => {
        const contracts = deployedContracts[CHAIN_ID];
        if (!contracts) {
            console.log(chalk.red("No contracts found."));
            return;
        }
        console.log(chalk.green("Available contracts:"));
        Object.keys(contracts).forEach((name) => {
            console.log(`- ${name} (${contracts[name].address})`);
        });
    });

program
    .command("read <contract> <function> [args...]")
    .description("Call a read-only function")
    .action(async (contractName, functionName, args) => {
        try {
            const contract = await getContract(contractName);
            console.log(chalk.blue(`Calling ${contractName}.${functionName} with args:`, args));

            const result = await publicClient.readContract({
                address: contract.address,
                abi: contract.abi,
                functionName: functionName,
                args: args,
            });

            console.log(chalk.green("Result:"), result);
        } catch (error: any) {
            console.error(chalk.red("Error:"), error.message || error);
        }
    });

program
    .command("write <contract> <function> [args...]")
    .description("Call a write function")
    .action(async (contractName, functionName, args) => {
        try {
            const contract = await getContract(contractName);
            console.log(chalk.blue(`Sending tx to ${contractName}.${functionName} with args:`, args));

            const hash = await walletClient.writeContract({
                address: contract.address,
                abi: contract.abi,
                functionName: functionName,
                args: args,
            });

            console.log(chalk.yellow("Transaction sent:"), hash);

            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            console.log(chalk.green("Transaction confirmed!"), "Block:", receipt.blockNumber);
        } catch (error: any) {
            console.error(chalk.red("Error:"), error.message || error);
        }
    });

program
    .command("interactive")
    .description("Start interactive mode")
    .action(async () => {
        console.log(chalk.bold("AgentCred CLI - Interactive Mode"));

        while (true) {
            const { action } = await inquirer.prompt([
                {
                    type: "list",
                    name: "action",
                    message: "What do you want to do?",
                    choices: ["List Contracts", "Read Contract", "Write Contract", "Exit"],
                },
            ]);

            if (action === "Exit") break;

            if (action === "List Contracts") {
                const contracts = deployedContracts[CHAIN_ID];
                Object.keys(contracts).forEach((name) => {
                    console.log(`- ${name}`);
                });
                continue;
            }

            const contracts = deployedContracts[CHAIN_ID];
            const { contractName } = await inquirer.prompt([
                {
                    type: "list",
                    name: "contractName",
                    message: "Select contract:",
                    choices: Object.keys(contracts),
                },
            ]);

            const contract = contracts[contractName];
            const abi = contract.abi;

            // Filter functions based on action
            const functions = abi.filter((item: any) =>
                item.type === "function" &&
                (action === "Read Contract"
                    ? ["pure", "view"].includes(item.stateMutability)
                    : ["nonpayable", "payable"].includes(item.stateMutability))
            );

            const { functionName } = await inquirer.prompt([
                {
                    type: "list",
                    name: "functionName",
                    message: "Select function:",
                    choices: functions.map((f: any) => f.name),
                },
            ]);

            const selectedFunc = functions.find((f: any) => f.name === functionName);
            const args = [];

            if (selectedFunc.inputs.length > 0) {
                console.log(chalk.cyan(`Enter arguments for ${functionName}:`));
                for (const input of selectedFunc.inputs) {
                    const { value } = await inquirer.prompt([
                        {
                            type: "input",
                            name: "value",
                            message: `${input.name} (${input.type}):`,
                        },
                    ]);
                    args.push(value);
                }
            }

            try {
                if (action === "Read Contract") {
                    const result = await publicClient.readContract({
                        address: contract.address,
                        abi: contract.abi,
                        functionName: functionName,
                        args: args,
                    });
                    console.log(chalk.green("Result:"), result);
                } else {
                    const hash = await walletClient.writeContract({
                        address: contract.address,
                        abi: contract.abi,
                        functionName: functionName,
                        args: args,
                    });
                    console.log(chalk.yellow("Tx Hash:"), hash);
                    await publicClient.waitForTransactionReceipt({ hash });
                    console.log(chalk.green("Confirmed!"));
                }
            } catch (error: any) {
                console.error(chalk.red("Error:"), error.message);
            }
        }
    });

program.parse();
