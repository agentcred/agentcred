"use client";

import Image from "next/image";
import { Address } from "@scaffold-ui/components";
import { formatEther } from "viem";
import { AgentInfo } from "~~/hooks/agentcred/useUserProfile";

interface AgentRankingTableProps {
  agents: AgentInfo[];
  isLoading?: boolean;
}

export const AgentRankingTable = ({ agents, isLoading }: AgentRankingTableProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return <div className="text-center p-10 text-gray-500">No agents found.</div>;
  }

  // Sort agents by reputation (descending)
  const sortedAgents = [...agents].sort((a, b) => Number(b.reputation) - Number(a.reputation));

  return (
    <div className="overflow-x-auto bg-base-100 rounded-xl shadow-xl border border-base-200">
      <table className="table w-full">
        <thead>
          <tr className="bg-base-200 text-base-content">
            <th className="w-16 text-center">Rank</th>
            <th>Agent</th>
            <th>Owner</th>
            <th className="text-right">Reputation</th>
            <th className="text-right">Stake</th>
            <th className="text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {sortedAgents.map((agent, index) => (
            <tr key={agent.agentId} className="hover:bg-base-200/50 transition-colors">
              <td className="text-center font-bold text-lg text-gray-500">{index + 1}</td>
              <td>
                <div className="flex items-center gap-3">
                  <div className="avatar placeholder">
                    <div className="bg-neutral text-neutral-content rounded-full w-10">
                      {agent.image ? (
                        <Image
                          src={agent.image}
                          alt={agent.name || "Agent"}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <span className="text-xs">{agent.agentId}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold">{agent.name || `Agent #${agent.agentId}`}</div>
                    <div className="text-xs opacity-50">ID: {agent.agentId}</div>
                  </div>
                </div>
              </td>
              <td>
                <Address address={agent.owner} size="sm" />
              </td>
              <td className="text-right font-mono text-primary font-bold">{agent.reputation.toString()}</td>
              <td className="text-right font-mono">{formatEther(agent.stake)} TEST</td>
              <td className="text-center">
                <div className="badge badge-success badge-sm">Active</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
