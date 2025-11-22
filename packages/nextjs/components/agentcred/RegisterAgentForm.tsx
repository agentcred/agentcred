"use client";

import { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface RegisterAgentFormProps {
    onSuccess?: () => void;
}

export const RegisterAgentForm = ({ onSuccess }: RegisterAgentFormProps) => {
    const [agentName, setAgentName] = useState("");

    const { writeContractAsync, isPending } = useScaffoldWriteContract("IdentityRegistry");

    const handleRegister = async () => {
        if (!agentName.trim()) return;

        try {
            const tokenURI = `ipfs://agent-${agentName.replace(/\s+/g, "-").toLowerCase()}`;

            await writeContractAsync({
                functionName: "register",
                args: [tokenURI],
            });

            setAgentName("");

            // Reload page to show new agent
            setTimeout(() => {
                if (onSuccess) {
                    onSuccess();
                } else {
                    window.location.reload();
                }
            }, 2000);
        } catch (e) {
            console.error("Error registering agent:", e);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="ENTER_AGENT_NAME"
                        className="block w-full p-4 text-white bg-black border border-white/10 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent placeholder-gray-600 font-mono text-center tracking-widest"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        disabled={isPending}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !isPending && agentName.trim()) {
                                handleRegister();
                            }
                        }}
                    />
                </div>
            </div>

            <button
                className="w-full mt-6 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-cyan-400 font-mono tracking-widest uppercase transition-all hover:text-cyan-300 hover:border-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                onClick={handleRegister}
                disabled={isPending || !agentName.trim()}
            >
                {isPending ? (
                    <>
                        <span className="loading loading-spinner loading-sm"></span>
                        INITIALIZING...
                    </>
                ) : (
                    <>
                        <span>INITIALIZE_IDENTITY</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </>
                )}
            </button>
        </div>
    );
};
