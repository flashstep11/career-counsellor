"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CreateCommunityModalProps {
    onClose: () => void;
    onCreated: () => void;
}

const ICON_COLORS = [
    "#6366f1", "#ec4899", "#f59e0b", "#10b981",
    "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6",
];

export default function CreateCommunityModal({ onClose, onCreated }: CreateCommunityModalProps) {
    const router = useRouter();
    const [form, setForm] = useState({
        name: "",
        displayName: "",
        description: "",
        iconColor: "#6366f1",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!form.name.trim() || !form.displayName.trim() || !form.description.trim()) {
            setError("All fields are required.");
            return;
        }
        setLoading(true);
        try {
            const res = await axios.post("/api/communities", {
                name: form.name.toLowerCase().replace(/\s+/g, "-"),
                displayName: form.displayName,
                description: form.description,
                iconColor: form.iconColor,
            });
            onCreated();
            router.push(`/communities/${res.data.name}`);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to create community.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <X className="h-5 w-5 text-gray-500" />
                </button>

                <div className="mb-5">
                    <h2 className="text-xl font-bold text-gray-900">Create a Community</h2>
                    <p className="text-sm text-gray-500 mt-1">Build a space for people to discuss shared interests.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Community Name (slug)</label>
                        <div className="flex items-center gap-1">
                            <span className="text-gray-400 text-sm font-medium">c/</span>
                            <Input
                                placeholder="career-advice"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="rounded-lg"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Lowercase, no spaces. Used in the URL.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                        <Input
                            placeholder="Career Advice"
                            value={form.displayName}
                            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                            className="rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <Textarea
                            placeholder="What is this community about?"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="rounded-lg resize-none min-h-[80px]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Icon Color</label>
                        <div className="flex gap-2 flex-wrap">
                            {ICON_COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setForm({ ...form, iconColor: color })}
                                    className="h-8 w-8 rounded-full transition-all border-2"
                                    style={{
                                        backgroundColor: color,
                                        borderColor: form.iconColor === color ? "#111" : "transparent",
                                        transform: form.iconColor === color ? "scale(1.15)" : "scale(1)",
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 font-semibold transition-all"
                    >
                        {loading ? "Creating..." : "Create Community"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
