"use client";

import { Address } from "viem";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { UserCircleIcon, ShieldCheckIcon, BoltIcon } from "@heroicons/react/24/outline";

interface AgentDashboardCardProps {
    agentId: number;
    reputation: number;
    stake: bigint;
    totalContents: number;
    failedContents: number;
}

export const AgentDashboardCard = ({ agentId, reputation, stake, totalContents, failedContents }: AgentDashboardCardProps) => {
    const { address } = useAccount();

    // Calculate Trust Level
    let trustLevel = "Neutral";
    let trustColor = "text-gray-400";
    let borderColor = "border-gray-500/30";

    if (reputation > 10) {
        trustLevel = "Trusted";
        trustColor = "text-cyan-400";
        borderColor = "border-cyan-500/50";
    } else if (reputation < -5) {
        trustLevel = "Untrusted";
        trustColor = "text-red-400";
        borderColor = "border-red-500/50";
    }

    return (
        <div className={`relative bg-black/40 backdrop-blur-xl border ${borderColor} rounded-2xl p-6 overflow-hidden group transition-all duration-300 hover:border-opacity-80`}>
            {/* Holographic Gradient Effect */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center shadow-lg">
                        <span className="text-3xl">🤖</span>
                    </div>
                    <div className="text-right">
                        <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">Trust Score</div>
                        <div className={`text-3xl font-bold font-mono ${trustColor}`}>
                            {reputation > 0 ? "+" : ""}{reputation}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="text-xs text-gray-500 mb-1">Agent ID</div>
                        <div className="font-mono text-lg">#{agentId.toString().padStart(4, '0')}</div>
                    </div>

                    <div>
                        <div className="text-xs text-gray-500 mb-1">Owner</div>
                        <div className="font-mono text-sm truncate opacity-80">{address}</div>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                    <ShieldCheckIcon className="w-3 h-3" /> Staked Balance
                                </div>
                                <div className="text-xl font-bold text-white">
                                    {Number(formatEther(stake)).toFixed(0)} <span className="text-sm font-normal text-gray-500">CRED</span>
                                </div>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-bold border ${borderColor} ${trustColor} bg-opacity-10`}>
                                {trustLevel.toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
