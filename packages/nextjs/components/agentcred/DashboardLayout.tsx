"use client";

import { ReactNode } from "react";
import { hardhat } from "viem/chains";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  return (
    <div className="h-screen bg-gray-900 text-white selection:bg-cyan-500 selection:text-black overflow-hidden relative flex flex-col">
      {/* Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/30 blur-[120px]" />
      </div>

      {/* Glass Overlay */}
      <div className="relative z-10 flex flex-col h-full backdrop-blur-[0px]">
        {/* Top Bar */}
        <header className="h-16 border-b border-white/10 bg-black/20 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center font-bold text-lg">
              A
            </div>
            <span className="font-bold text-xl tracking-tight">AgentCred</span>
          </div>
          <div className="flex items-center gap-4">
            {isLocalNetwork && <FaucetButton />}
            <RainbowKitCustomConnectButton />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-grow p-4 lg:p-6 lg:overflow-hidden overflow-y-auto flex flex-col">
          <div className="max-w-7xl mx-auto w-full lg:h-full">{children}</div>
        </main>
      </div>
    </div>
  );
};
