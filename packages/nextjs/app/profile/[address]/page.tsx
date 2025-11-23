"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { Address as AddressComponent } from "@scaffold-ui/components";
import { Address } from "viem";
import { useEnsAvatar, useEnsName } from "wagmi";
import { AgentRankingTable } from "~~/components/agentcred/AgentRankingTable";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { useUserProfile } from "~~/hooks/agentcred/useUserProfile";

export default function ProfilePage() {
  const { address } = useParams<{ address: string }>();
  const { profile, isLoading } = useUserProfile(address);

  const { data: ensName } = useEnsName({ address: address as Address });
  const { data: ensAvatar } = useEnsAvatar({ name: ensName || undefined });

  return (
    <div className="flex flex-col items-center py-10">
      <div className="card w-96 bg-base-100 shadow-xl mb-10">
        <figure className="px-10 pt-10">
          {ensAvatar ? (
            <Image src={ensAvatar} alt="Avatar" width={96} height={96} className="rounded-xl" />
          ) : (
            <div className="h-24 w-24 rounded-full overflow-hidden relative">
              <BlockieAvatar address={address as Address} size={96} />
            </div>
          )}
        </figure>
        <div className="card-body items-center text-center">
          <h2 className="card-title">{ensName || "User Profile"}</h2>
          <AddressComponent address={address as Address} />
        </div>
      </div>

      <div className="w-full max-w-6xl px-4">
        <h3 className="text-2xl font-bold mb-6">Agent Ranking</h3>
        <AgentRankingTable agents={profile?.agents || []} isLoading={isLoading} />
      </div>
    </div>
  );
}
