"use client";

import { Address } from "@scaffold-ui/components";
import { formatEther } from "viem";

interface AgentCardProps {
  agentId: number;
  reputation: number;
  stake: bigint;
  owner: string;
}

export const AgentCard = ({ agentId, reputation, stake, owner }: AgentCardProps) => {
  const getReputationColor = (rep: number) => {
    if (rep >= 75) return "badge-success";
    if (rep >= 50) return "badge-warning";
    return "badge-error";
  };

  return (
    <div className="card bg-base-200 shadow-md">
      <div className="card-body">
        <h3 className="card-title">
          Agent #{agentId}
          <div className={`badge ${getReputationColor(reputation)} badge-lg`}>Rep: {reputation}</div>
        </h3>

        <div className="divider my-2"></div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">Stake:</span>
            <span className="text-lg font-bold text-secondary">{formatEther(stake)} USDC</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">Owner:</span>
            <Address address={owner as `0x${string}`} size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
};
