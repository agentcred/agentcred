import chalk from "chalk";

// --- Types ---

type Strategy = {
    name: string;
    description: string;
    rules: {
        pass: { user: number; agent: number; slashBps: number };
        softFail: { user: number; agent: number; slashBps: number };
        hardFail: { user: number; agent: number; slashBps: number };
    };
};

type Action = "PASS" | "SOFT_FAIL" | "HARD_FAIL";

type Scenario = {
    name: string;
    actions: Action[];
};

// --- Strategies ---

const strategies: Strategy[] = [
    {
        name: "Current (Balanced)",
        description: "The currently implemented logic.",
        rules: {
            pass: { user: 1, agent: 2, slashBps: 0 },
            softFail: { user: -1, agent: -2, slashBps: 500 }, // 5%
            hardFail: { user: -2, agent: -4, slashBps: 1500 }, // 15%
        },
    },
    {
        name: "High Stakes (Aggressive)",
        description: "Faster growth, but mistakes are fatal.",
        rules: {
            pass: { user: 2, agent: 5, slashBps: 0 },
            softFail: { user: -5, agent: -10, slashBps: 1000 }, // 10%
            hardFail: { user: -10, agent: -20, slashBps: 3000 }, // 30%
        },
    },
    {
        name: "Forgiving (Growth Focused)",
        description: "Encourages participation, penalties are light.",
        rules: {
            pass: { user: 1, agent: 3, slashBps: 0 },
            softFail: { user: 0, agent: -1, slashBps: 100 }, // 1%
            hardFail: { user: -1, agent: -3, slashBps: 500 }, // 5%
        },
    },
];

// --- Scenarios ---

const scenarios: Scenario[] = [
    {
        name: "Good Actor",
        actions: ["PASS", "PASS", "PASS", "PASS", "PASS"],
    },
    {
        name: "Occasional Mistake",
        actions: ["PASS", "PASS", "SOFT_FAIL", "PASS", "PASS"],
    },
    {
        name: "Bad Actor",
        actions: ["PASS", "SOFT_FAIL", "HARD_FAIL", "HARD_FAIL", "HARD_FAIL"],
    },
    {
        name: "Redemption Arc",
        actions: ["HARD_FAIL", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS"],
    },
];

// --- Simulation Engine ---

function runSimulation(strategy: Strategy, scenario: Scenario) {
    let userRep = 0;
    let agentRep = 0;
    let stake = 1000.0;

    console.log(chalk.bold(`\n--- Strategy: ${strategy.name} | Scenario: ${scenario.name} ---`));
    console.log(chalk.dim(strategy.description));
    console.log(`| Step | Action    | User Rep | Agent Rep | Stake   |`);
    console.log(`| ---- | --------- | -------- | --------- | ------- |`);
    console.log(`| 0    | Start     | ${userRep.toString().padEnd(8)} | ${agentRep.toString().padEnd(9)} | ${stake.toFixed(2).padEnd(7)} |`);

    scenario.actions.forEach((action, index) => {
        let rule;
        if (action === "PASS") rule = strategy.rules.pass;
        else if (action === "SOFT_FAIL") rule = strategy.rules.softFail;
        else rule = strategy.rules.hardFail;

        userRep += rule.user;
        agentRep += rule.agent;

        const slashAmount = stake * (rule.slashBps / 10000);
        stake -= slashAmount;

        let actionColor = action === "PASS" ? chalk.green : action === "SOFT_FAIL" ? chalk.yellow : chalk.red;

        console.log(
            `| ${(index + 1).toString().padEnd(4)} | ${actionColor(action.padEnd(9))} | ${userRep.toString().padEnd(8)} | ${agentRep.toString().padEnd(9)} | ${stake.toFixed(2).padEnd(7)} |`
        );
    });
}

// --- Main ---

console.log(chalk.bold.blue("🤖 Reputation Strategy Simulator"));

strategies.forEach((strategy) => {
    scenarios.forEach((scenario) => {
        runSimulation(strategy, scenario);
    });
});
