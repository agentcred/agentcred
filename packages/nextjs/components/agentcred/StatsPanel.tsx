"use client";

import { ChartBarIcon, ShieldCheckIcon, BanknotesIcon } from "@heroicons/react/24/outline";
import { formatEther } from "viem";

interface StatsPanelProps {
    totalAudits: number;
    successRate: number;
    totalSlashed: bigint;
}

export const StatsPanel = ({ totalAudits, successRate, totalSlashed }: StatsPanelProps) => {
    return (
        <div className="space-y-4">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Success Rate</div>
                <div className="flex items-end gap-2">
                    <div className="text-4xl font-bold font-mono text-white">{successRate.toFixed(1)}%</div>
                    <div className="text-sm text-gray-500 mb-1">of audits passed</div>
                </div>
                <div className="w-full bg-gray-800 h-1 mt-4 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                        style={{ width: `${successRate}%` }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Audits</div>
                    <div className="text-2xl font-bold font-mono text-white">{totalAudits}</div>
                </div>
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Slashed</div>
                    <div className="text-2xl font-bold font-mono text-red-400">
                        {Number(formatEther(totalSlashed)).toFixed(0)}
                    </div>
                </div>
            </div>
        </div>
    );
};
