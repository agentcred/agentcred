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
        <div className="bg-base-100 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4">Stats</h3>

            <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                    <div className="flex items-center gap-2">
                        <ChartBarIcon className="h-5 w-5 text-info" />
                        <span className="text-sm">Total Audits</span>
                    </div>
                    <span className="text-2xl font-bold">{totalAudits}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                    <div className="flex items-center gap-2">
                        <ShieldCheckIcon className="h-5 w-5 text-success" />
                        <span className="text-sm">Success Rate</span>
                    </div>
                    <span className="text-2xl font-bold text-success">{successRate}%</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                    <div className="flex items-center gap-2">
                        <BanknotesIcon className="h-5 w-5 text-error" />
                        <span className="text-sm">Total Slashed</span>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-error">
                            {formatEther(totalSlashed)}
                        </div>
                        <div className="text-xs opacity-60">USDC</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
