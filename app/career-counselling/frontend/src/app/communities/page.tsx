"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Plus, Search, TrendingUp, Loader2, Users2 } from "lucide-react";
import { Community } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CommunityCard from "@/components/communities/community-card";
import CreateCommunityModal from "@/components/communities/create-community-modal";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

export default function CommunitiesPage() {
    const { isAuthenticated } = useAuth();
    const [communities, setCommunities] = useState<Community[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);

    const fetchCommunities = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get("/api/communities?limit=100");
            setCommunities(res.data);
        } catch {
            setCommunities([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCommunities();
    }, [fetchCommunities]);

    const filtered = communities.filter(
        (c) =>
            c.displayName.toLowerCase().includes(search.toLowerCase()) ||
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.description.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50/30">
            {/* Hero header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <div className="max-w-6xl mx-auto px-4 py-14 sm:py-20">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-12 w-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                                    <Users2 className="h-6 w-6 text-white" />
                                </div>
                                <h1 className="text-4xl font-extrabold tracking-tight">Communities</h1>
                            </div>
                            <p className="text-indigo-200 text-lg max-w-md">
                                Find your tribe. Join communities, share knowledge, and grow together.
                            </p>
                        </div>
                        {isAuthenticated && (
                            <Button
                                onClick={() => setShowModal(true)}
                                className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold rounded-xl px-5 py-2.5 shadow-lg gap-2 text-sm"
                            >
                                <Plus className="h-4 w-4" />
                                Create Community
                            </Button>
                        )}
                    </div>

                    {/* Search bar */}
                    <div className="mt-8 max-w-lg relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-300 pointer-events-none" />
                        <Input
                            placeholder="Search communities..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 bg-white/15 border-white/30 text-white placeholder:text-indigo-300 rounded-xl focus-visible:ring-white/50 focus-visible:border-white"
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-10">
                {/* Stats bar */}
                {!loading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                        <TrendingUp className="h-4 w-4 text-indigo-400" />
                        <span>
                            {filtered.length} {filtered.length === 1 ? "community" : "communities"}
                            {search && ` matching "${search}"`}
                        </span>
                    </div>
                )}

                {/* Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden">
                                <Skeleton className="h-1.5 w-full" />
                                <div className="p-5 space-y-3">
                                    <div className="flex gap-3 items-start">
                                        <Skeleton className="h-12 w-12 rounded-xl" />
                                        <div className="flex-1 space-y-1.5">
                                            <Skeleton className="h-4 w-3/4" />
                                            <Skeleton className="h-3 w-1/2" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-3 w-full" />
                                    <Skeleton className="h-3 w-4/5" />
                                    <div className="flex gap-4 pt-1">
                                        <Skeleton className="h-3 w-20" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filtered.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filtered.map((c) => (
                            <CommunityCard key={c.communityId} community={c} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="h-20 w-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-5">
                            <Users2 className="h-10 w-10 text-indigo-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                            {search ? "No communities found" : "No communities yet"}
                        </h3>
                        <p className="text-gray-400 text-sm max-w-xs mb-6">
                            {search
                                ? `We couldn't find any communities matching "${search}". Try a different search.`
                                : "Be the first to create a community and start the conversation!"}
                        </p>
                        {isAuthenticated && !search && (
                            <Button
                                onClick={() => setShowModal(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Create First Community
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {showModal && (
                <CreateCommunityModal
                    onClose={() => setShowModal(false)}
                    onCreated={() => {
                        setShowModal(false);
                        fetchCommunities();
                    }}
                />
            )}
        </div>
    );
}
