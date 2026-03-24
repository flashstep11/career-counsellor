"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import {
    Users2,
    Plus,
    ArrowLeft,
    Loader2,
    FileText,
    CalendarDays,
    LogIn,
    Search,
    Pin,
    Shield,
    X,
} from "lucide-react";
import { Community, Post } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PostItem from "@/components/communities/post-item";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { formatDistanceToNow } from "date-fns";

export default function CommunityDetailPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const { onEvent, socketReady } = useSocket();
    const userId = user?._id || "";

    const [community, setCommunity] = useState<Community | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loadingCommunity, setLoadingCommunity] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [joining, setJoining] = useState(false);

    // Search
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Post[] | null>(null);
    const [searching, setSearching] = useState(false);

    const fetchCommunity = useCallback(async () => {
        try {
            const res = await axios.get(`/api/communities/${id}`);
            setCommunity(res.data);
        } catch {
            // not found handled in render
        } finally {
            setLoadingCommunity(false);
        }
    }, [id]);

    const fetchPosts = useCallback(async () => {
        setLoadingPosts(true);
        try {
            const res = await axios.get(`/api/communities/${id}/posts`);
            setPosts(Array.isArray(res.data) ? res.data : []);
        } catch {
            setPosts([]);
        } finally {
            setLoadingPosts(false);
        }
    }, [id]);

    useEffect(() => {
        if (authLoading) return; // wait for auth so the token is in the request header
        fetchCommunity();
        fetchPosts();
    }, [fetchCommunity, fetchPosts, authLoading]);

    // ── Real-time socket listeners ────────────────────────────────────────────
    useEffect(() => {
        const offNewPost = onEvent("community_new_post", (data: { communityId: string; post: Post }) => {
            setCommunity((prev) => {
                if (!prev || prev.communityId !== data.communityId) return prev;
                return { ...prev, postCount: prev.postCount + 1 };
            });
            setPosts((prev) => {
                if (!prev.find((p) => p.postId === data.post.postId)) {
                    return [data.post, ...prev];
                }
                return prev;
            });
        });

        const offPinUpdate = onEvent("community_pin_update", (data: { communityId: string; pinnedPosts: string[] }) => {
            setCommunity((prev) => {
                if (!prev || prev.communityId !== data.communityId) return prev;
                return { ...prev, pinnedPosts: data.pinnedPosts };
            });
            setPosts((prev) =>
                prev.map((p) => ({ ...p, isPinned: data.pinnedPosts.includes(p.postId) }))
            );
        });

        const offBan = onEvent("community_ban", (data: { communityId: string; userId: string }) => {
            setCommunity((prev) => {
                if (!prev || prev.communityId !== data.communityId) return prev;
                if (data.userId === userId) {
                    alert(`You have been banned from ${prev.displayName}.`);
                    router.push("/communities");
                }
                return prev;
            });
        });

        const offRoleUpdate = onEvent("community_role_update", (data: { communityId: string; userId: string; role: string }) => {
            setCommunity((prev) => {
                if (!prev || prev.communityId !== data.communityId) return prev;
                if (data.userId === userId) {
                    return { ...prev, isModerator: data.role === "moderator" };
                }
                return prev;
            });
        });

        const offCredentialsUpdate = onEvent("community_credentials_update", (data: { communityId: string; userId: string; credentials: string[] }) => {
            setPosts((prev) =>
                prev.map((p) => p.authorId === data.userId ? { ...p, authorCredentials: data.credentials } : p)
            );
        });

        return () => {
            offNewPost();
            offPinUpdate();
            offBan();
            offRoleUpdate();
            offCredentialsUpdate();
        };
    }, [onEvent, userId, router, socketReady]);

    const handleJoinLeave = async () => {
        if (!isAuthenticated || !community) return;
        setJoining(true);
        try {
            const endpoint = community.isJoined
                ? `/api/communities/${community.communityId}/leave`
                : `/api/communities/${community.communityId}/join`;
            await axios.post(endpoint);
            setCommunity((prev) =>
                prev
                    ? {
                        ...prev,
                        isJoined: !prev.isJoined,
                        memberCount: prev.isJoined ? prev.memberCount - 1 : prev.memberCount + 1,
                    }
                    : prev
            );
        } catch {
            // ignore
        } finally {
            setJoining(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim() || !community) return;
        setSearching(true);
        try {
            const res = await axios.get(`/api/communities/${community.communityId}/search`, {
                params: { q: searchQuery.trim() },
            });
            setSearchResults(Array.isArray(res.data) ? res.data : []);
        } catch {
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const handlePin = async (postId: string, isPinned: boolean) => {
        if (!community) return;
        try {
            const action = isPinned ? "unpin" : "pin";
            await axios.post(`/api/communities/${community.communityId}/posts/${postId}/${action}`);
            fetchPosts();
            fetchCommunity();
        } catch {
            // ignore
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!community) return;
        try {
            await axios.delete(`/api/posts/${postId}`, {
                params: { community_id: community.communityId },
            });
            setPosts((prev) => prev.filter((p) => p.postId !== postId));
        } catch {
            // ignore
        }
    };

    // Pinned posts come first
    const pinnedIds = new Set(community?.pinnedPosts ?? []);
    const displayedPosts = searchResults !== null ? searchResults : [
        ...posts.filter((p) => pinnedIds.has(p.postId)),
        ...posts.filter((p) => !pinnedIds.has(p.postId)),
    ];

    if (!loadingCommunity && !community) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Community not found</h2>
                    <p className="text-gray-500 mb-4">This community doesn't exist or was removed.</p>
                    <Button onClick={() => router.push("/communities")} variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Communities
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30">
            {/* Community banner */}
            <div
                className="h-24 w-full"
                style={{
                    background: community
                        ? `linear-gradient(135deg, ${community.iconColor}cc, ${community.iconColor}55)`
                        : "linear-gradient(135deg, #6366f133, #6366f155)",
                }}
            />

            <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 -mt-6">
                {/* Community header card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 px-6 py-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {loadingCommunity ? (
                            <>
                                <Skeleton className="h-16 w-16 rounded-2xl" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-6 w-48" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            </>
                        ) : (
                            <>
                                <div
                                    className="h-16 w-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-md"
                                    style={{ backgroundColor: community?.iconColor }}
                                >
                                    {community?.displayName.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-2xl font-extrabold text-gray-900">{community?.displayName}</h1>
                                        {community?.isModerator && (
                                            <span className="flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                                <Shield className="h-3 w-3" /> Moderator
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400 font-medium">c/{community?.name}</p>
                                    <p className="text-gray-600 text-sm mt-1 max-w-xl">{community?.description}</p>
                                </div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
                                    {isAuthenticated && community?.createdBy === userId && (
                                        <Link href={`/communities/${id}/moderator-approvals`}>
                                            <Button size="sm" variant="outline" className="rounded-xl text-sm">
                                                Moderator Approvals
                                            </Button>
                                        </Link>
                                    )}
                                    {isAuthenticated &&
                                        community?.isJoined &&
                                        community?.createdBy !== userId &&
                                        !community?.isModerator && (
                                            <Link href={`/communities/${id}/apply-moderator`}>
                                                <Button size="sm" variant="outline" className="rounded-xl text-sm">
                                                    Apply as Moderator
                                                </Button>
                                            </Link>
                                        )}
                                    {isAuthenticated && community?.isJoined && (
                                        <Link href={`/communities/${id}/submit`}>
                                            <Button
                                                size="sm"
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-1.5 text-sm"
                                            >
                                                <Plus className="h-4 w-4" /> Create Post
                                            </Button>
                                        </Link>
                                    )}
                                    {isAuthenticated && community?.name !== "general" && (
                                        <Button
                                            size="sm"
                                            variant={community?.isJoined ? "outline" : "default"}
                                            onClick={handleJoinLeave}
                                            disabled={joining}
                                            className="rounded-xl text-sm"
                                        >
                                            {joining ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : community?.isJoined ? (
                                                "Leave"
                                            ) : (
                                                "Join"
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Search bar */}
                    <form onSubmit={handleSearch} className="mt-4 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (!e.target.value) setSearchResults(null);
                                }}
                                placeholder="Search posts in this community..."
                                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            />
                        </div>
                        <Button type="submit" size="sm" disabled={searching} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4">
                            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                        </Button>
                        {searchResults !== null && (
                            <Button type="button" size="sm" variant="ghost" onClick={() => { setSearchResults(null); setSearchQuery(""); }} className="rounded-xl">
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </form>
                </div>

                {/* Main two-column layout */}
                <div className="flex flex-col lg:flex-row gap-6 pb-12">
                    {/* Posts feed */}
                    <main className="flex-1 space-y-4">
                        {searchResults !== null && (
                            <p className="text-sm text-gray-500 px-1">
                                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
                            </p>
                        )}
                        {loadingPosts ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-7 w-7 rounded-full" />
                                        <Skeleton className="h-3 w-32" />
                                        <Skeleton className="h-3 w-20 ml-auto" />
                                    </div>
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="h-3 w-full" />
                                    <Skeleton className="h-3 w-4/5" />
                                    <div className="flex gap-4 pt-1">
                                        <Skeleton className="h-3 w-14" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                            ))
                        ) : displayedPosts.length > 0 ? (
                            displayedPosts.map((post) => (
                                <PostItem
                                    key={post.postId}
                                    post={post}
                                    isModerator={community?.isModerator}
                                    isAuthorModerator={community?.community_roles?.[post.authorId] === "moderator"}
                                    communityId={community?.communityId}
                                    onPin={community?.isModerator ? () => handlePin(post.postId, !!post.isPinned) : undefined}
                                    onModDelete={community?.isModerator ? () => handleDeletePost(post.postId) : undefined}
                                    onCredentialsUpdate={community?.isModerator ? (uid, creds) => setPosts((prev) => prev.map((p) => p.authorId === uid ? { ...p, authorCredentials: creds } : p)) : undefined}
                                />
                            ))
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                                <div className="h-16 w-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText className="h-8 w-8 text-indigo-300" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-1">
                                    {searchResults !== null ? "No posts found" : "No posts yet"}
                                </h3>
                                <p className="text-gray-400 text-sm mb-5">
                                    {searchResults !== null ? "Try a different search term." : "Be the first to post in this community!"}
                                </p>
                                {!searchResults && isAuthenticated && community?.isJoined ? (
                                    <Link href={`/communities/${id}/submit`}>
                                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2">
                                            <Plus className="h-4 w-4" /> Create First Post
                                        </Button>
                                    </Link>
                                ) : !searchResults && isAuthenticated && !community?.isJoined && community?.name !== "general" ? (
                                    <Button onClick={handleJoinLeave} disabled={joining} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2">
                                        {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join to Post"}
                                    </Button>
                                ) : !searchResults ? (
                                    <Link href="/login">
                                        <Button variant="outline" className="rounded-xl gap-2">
                                            <LogIn className="h-4 w-4" /> Log in to post
                                        </Button>
                                    </Link>
                                ) : null}
                            </div>
                        )}
                    </main>

                    {/* Sidebar */}
                    <aside className="lg:w-72 space-y-4">
                        {/* Community info */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wider">About</h3>
                            {loadingCommunity ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-3 w-full" />
                                    <Skeleton className="h-3 w-3/4" />
                                </div>
                            ) : (
                                <p className="text-sm text-gray-600 leading-relaxed mb-4">{community?.description}</p>
                            )}
                            <div className="space-y-2.5 text-sm text-gray-500 border-t border-gray-50 pt-4">
                                <div className="flex items-center gap-2">
                                    <Users2 className="h-4 w-4 text-indigo-400" />
                                    <span><strong className="text-gray-700">{community?.memberCount ?? "—"}</strong> members</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-indigo-400" />
                                    <span><strong className="text-gray-700">{community?.postCount ?? "—"}</strong> posts</span>
                                </div>
                                {(community?.pinnedPosts?.length ?? 0) > 0 && (
                                    <div className="flex items-center gap-2">
                                        <Pin className="h-4 w-4 text-indigo-400" />
                                        <span><strong className="text-gray-700">{community?.pinnedPosts?.length}</strong> pinned post{(community?.pinnedPosts?.length ?? 0) !== 1 ? "s" : ""}</span>
                                    </div>
                                )}
                                {community?.createdAt && (
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4 text-indigo-400" />
                                        <span>Created {formatDistanceToNow(new Date(community.createdAt), { addSuffix: true })}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Mod actions panel */}
                        {community?.isModerator && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                                <h3 className="font-bold text-amber-800 mb-2 text-sm flex items-center gap-1.5">
                                    <Shield className="h-4 w-4" /> Moderator Tools
                                </h3>
                                <p className="text-xs text-amber-600 mb-3">Use the pin / ban / delete controls on each post.</p>
                                <Link href={`/communities/${id}/reports`}>
                                    <Button size="sm" variant="outline" className="w-full rounded-xl border-amber-300 text-amber-700 hover:bg-amber-100">
                                        View Reports
                                    </Button>
                                </Link>
                            </div>
                        )}

                        {/* CTA */}
                        {isAuthenticated && community?.isJoined && (
                            <div className="bg-indigo-600 rounded-2xl p-5 text-white">
                                <h3 className="font-bold mb-1">Ready to contribute?</h3>
                                <p className="text-indigo-200 text-xs mb-3">Share your thoughts with the community.</p>
                                <Link href={`/communities/${id}/submit`}>
                                    <Button
                                        size="sm"
                                        className="w-full bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl font-semibold gap-1.5"
                                    >
                                        <Plus className="h-4 w-4" /> Create Post
                                    </Button>
                                </Link>
                            </div>
                        )}

                        {!isAuthenticated && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                                <p className="text-sm text-gray-500 mb-3">Log in to join and post</p>
                                <Link href="/login">
                                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2">
                                        <LogIn className="h-4 w-4" /> Log in
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
}
