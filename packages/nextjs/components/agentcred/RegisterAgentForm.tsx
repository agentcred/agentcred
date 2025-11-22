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
        <div className="flex flex-col bg-base-100 bg-opacity-70 p-8 rounded-3xl">
            <h3 className="text-2xl font-bold mb-4">Register Your Agent</h3>

            <div className="form-control">
                <label className="label">
                    <span className="label-text">Agent Name</span>
                </label>
                <input
                    type="text"
                    placeholder="e.g., MyContentBot"
                    className="input input-bordered input-lg"
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

            <button
                className="btn btn-primary btn-lg mt-6"
                onClick={handleRegister}
                disabled={isPending || !agentName.trim()}
            >
                {isPending ? (
                    <>
                        <span className="loading loading-spinner"></span>
                        Registering...
                    </>
                ) : (
                    "Register Agent"
                )}
            </button>
        </div>
    );
};
