"use client";

import { formatEther } from "viem";
import { Address } from "@scaffold-ui/components";

interface ProfileStatsProps {
    ensName?: string;
    address: string;
    reputation: number;
    agentCount: number;
    totalStake: bigint;
}

export const ProfileStats = ({ ensName, address, reputation, agentCount, totalStake }: ProfileStatsProps) => {
    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <h2 className="card-title text-3xl mb-4">
                    {ensName || <Address address={address as `0x${string}`} />}
                </h2>

                <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
                    <div className="stat">
                        <div className="stat-title">User Reputation</div>
                        <div className="stat-value text-primary">{reputation}</div>
                        <div className="stat-desc">Trust score</div>
                    </div>

                    <div className="stat">
                        <div className="stat-title">Active Agents</div>
                        <div className="stat-value">{agentCount}</div>
                        <div className="stat-desc">Currently registered</div>
                    </div>

                    <div className="stat">
                        <div className="stat-title">Total Stake</div>
                        <div className="stat-value text-secondary">{formatEther(totalStake)} USDC</div>
                        <div className="stat-desc">Across all agents</div>
                    </div>
                </div>

                <div className="mt-4">
                    <div className="text-sm opacity-70">
                        <span className="font-semibold">Address:</span> <Address address={address as `0x${string}`} />
                    </div>
                </div>
            </div>
        </div>
    );
};
