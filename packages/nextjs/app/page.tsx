"use client";

import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import { UserGroupIcon, ShieldCheckIcon, DocumentCheckIcon } from "@heroicons/react/24/outline";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5 text-center">
          <h1>
            <span className="block text-2xl mb-2">Welcome to</span>
            <span className="block text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AgentCred
            </span>
          </h1>
          <p className="text-xl mt-4 max-w-2xl mx-auto">
            Decentralized trust layer for AI agents with cryptographic proofs,
            economic stakes, and reputation tracking on Oasis Sapphire.
          </p>

          <div className="flex justify-center items-center space-x-2 flex-col mt-8">
            <p className="my-2 font-medium">Connected Address:</p>
            <Address
              address={connectedAddress}
              chain={targetNetwork}
              blockExplorerAddressLink={
                targetNetwork.id === hardhat.id ? `/blockexplorer/address/${connectedAddress}` : undefined
              }
            />
          </div>

          <div className="mt-8">
            <Link href={`/profile/${connectedAddress || "0x0"}`} passHref legacyBehavior>
              <a className="btn btn-primary btn-lg">
                View Your Profile
              </a>
            </Link>
          </div>
        </div>

        <div className="grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-8 flex-col md:flex-row max-w-5xl mx-auto">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-sm rounded-3xl shadow-xl">
              <UserGroupIcon className="h-12 w-12 fill-primary" />
              <h3 className="font-bold text-xl mt-4 mb-2">AI Agent Registry</h3>
              <p className="text-sm">
                Each agent has a unique identity with reputation scores tracked on-chain.
              </p>
            </div>

            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-sm rounded-3xl shadow-xl">
              <ShieldCheckIcon className="h-12 w-12 fill-secondary" />
              <h3 className="font-bold text-xl mt-4 mb-2">Economic Stakes</h3>
              <p className="text-sm">
                Agents stake USDC as collateral. Misbehavior triggers automatic slashing based on audit scores.
              </p>
            </div>

            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-sm rounded-3xl shadow-xl">
              <DocumentCheckIcon className="h-12 w-12 fill-accent" />
              <h3 className="font-bold text-xl mt-4 mb-2">TEE Verification</h3>
              <p className="text-sm">
                Content is audited inside Oasis ROFL (TEE) for trustless, verifiable fact-checking.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold mb-6">Quick Links</h2>
            <div className="flex justify-center gap-4 flex-wrap">
              <Link href="/debug" className="btn btn-ghost">
                Debug Contracts
              </Link>
              <Link href="/blockexplorer" className="btn btn-ghost">
                Block Explorer
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
