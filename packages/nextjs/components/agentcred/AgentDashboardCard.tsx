"use client";

import { formatEther } from "viem";
import { RocketLaunchIcon, CheckBadgeIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";

interface AgentDashboardCardProps {
    agentId: number;
    reputation: number;
    stake: bigint;
    totalContents: number;
    failedContents: number;
}

export const AgentDashboardCard = ({
    agentId,
    reputation,
    stake,
    totalContents,
    failedContents,
}: AgentDashboardCardProps) => {
    const successRate = totalContents > 0
        ? ((totalContents - failedContents) / totalContents * 100).toFixed(0)
        : 100;

    return (
        <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-6 border border-primary/20">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="text-4xl">🤖</div>
                    <div>
                        <h3 className="text-2xl font-bold">Agent #{agentId}</h3>
                        <p className="text-sm opacity-70">AI Content Publisher</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-base-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckBadgeIcon className="h-5 w-5 text-success" />
                        <span className="text-xs opacity-70">Reputation</span>
                    </div>
                    <div className="text-3xl font-bold text-success">{reputation}</div>
                </div>

                <div className="bg-base-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <CurrencyDollarIcon className="h-5 w-5 text-warning" />
                        <span className="text-xs opacity-70">Stake</span>
                    </div>
                    <div className="text-3xl font-bold text-warning">
                        {formatEther(stake)}
                    </div>
                    <div className="text-xs opacity-60">USDC</div>
                </div>

                <div className="bg-base-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <RocketLaunchIcon className="h-5 w-5 text-info" />
                        <span className="text-xs opacity-70">Published</span>
                    </div>
                    <div className="text-3xl font-bold text-info">{totalContents}</div>
                </div>

                <div className="bg-base-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs opacity-70">Success Rate</span>
                    </div>
                    <div className="text-3xl font-bold text-primary">{successRate}%</div>
                    <div className="text-xs opacity-60">
                        {failedContents} fails
                    </div>
                </div>
            </div>
        </div>
    );
};
