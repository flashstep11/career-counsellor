"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Users, Network, Loader2, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PostItem from "@/components/communities/post-item";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Link from "next/link";
import { Post, Connection } from "@/types";

function authHeader() {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

interface ConnectionUser {
    connection: Connection;
    otherUserId: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
    isExpert?: boolean;
    type?: string;
}

interface FollowerUser {
    id: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
    isExpert?: boolean;
    type?: string;
}

export default function NetworkPage() {
    return (
        <ProtectedRoute>
            <NetworkContent />
        </ProtectedRoute>
    );
}

function NetworkContent() {
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [connections, setConnections] = useState<ConnectionUser[]>([]);
    const [followers, setFollowers] = useState<FollowerUser[]>([]);
    const [following, setFollowing] = useState<FollowerUser[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [loadingConnections, setLoadingConnections] = useState(true);
    const [loadingFollowers, setLoadingFollowers] = useState(true);
    const [loadingFollowing, setLoadingFollowing] = useState(true);
    const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

    const fetchNetworkFeed = useCallback(async () => {
        setLoadingPosts(true);
        try {
            const res = await axios.get("/api/posts/network-feed", {
                headers: authHeader(),
            });
            setPosts(res.data ?? []);
        } catch {
            setPosts([]);
        } finally {
            setLoadingPosts(false);
        }
    }, []);

    const fetchConnections = useCallback(async () => {
        setLoadingConnections(true);
        try {
            const res = await axios.get("/api/connections?status=accepted", {
                headers: authHeader(),
            });
            const conns: Connection[] = res.data ?? [];
            // For each connection, determine the other user and fetch their profile
            const enriched = await Promise.all(
                conns.map(async (conn) => {
                    const otherUserId =
                        conn.requester_id === user?._id ? conn.target_id : conn.requester_id;
                    try {
                        const uRes = await axios.get(`/api/users/${otherUserId}`, {
                            headers: authHeader(),
                        });
                        const u = uRes.data;
                        return {
                            connection: conn,
                            otherUserId,
                            firstName: u.firstName,
                            lastName: u.lastName,
                            profilePicture: u.profile_picture_url || u.profilePicture,
                            isExpert: u.isExpert,
                            type: u.type,
                        } as ConnectionUser;
                    } catch {
                        return { connection: conn, otherUserId } as ConnectionUser;
                    }
                })
            );
            setConnections(enriched);
        } catch {
            setConnections([]);
        } finally {
            setLoadingConnections(false);
        }
    }, [user?._id]);

    const handleDisconnect = async (otherUserId: string, connectionId: string) => {
        setDisconnectingId(connectionId);
        try {
            await axios.delete(`/api/connections/${otherUserId}`, {
                headers: authHeader(),
            });
            setConnections((prev) => prev.filter((c) => c.connection.connectionId !== connectionId));
        } catch {
            // no-op; keep current state on failure
        } finally {
            setDisconnectingId(null);
        }
    };

    const fetchFollowers = useCallback(async () => {
        setLoadingFollowers(true);
        try {
            const res = await axios.get("/api/users/me/followers?skip=0&limit=100", {
                headers: authHeader(),
            });
            const followerUsers = (res.data ?? []).map((u: any) => ({
                id: u.id ?? u._id,
                firstName: u.firstName,
                lastName: u.lastName,
                profilePicture: u.profile_picture_url || u.profilePicture,
                isExpert: u.isExpert,
                type: u.type,
            })) as FollowerUser[];
            setFollowers(followerUsers);
        } catch {
            setFollowers([]);
        } finally {
            setLoadingFollowers(false);
        }
    }, []);

    const fetchFollowing = useCallback(async () => {
        setLoadingFollowing(true);
        try {
            const res = await axios.get("/api/users/me/following?skip=0&limit=100", {
                headers: authHeader(),
            });
            const followingUsers = (res.data ?? []).map((u: any) => ({
                id: u.id ?? u._id,
                firstName: u.firstName,
                lastName: u.lastName,
                profilePicture: u.profile_picture_url || u.profilePicture,
                isExpert: u.isExpert,
                type: u.type,
            })) as FollowerUser[];
            setFollowing(followingUsers);
        } catch {
            setFollowing([]);
        } finally {
            setLoadingFollowing(false);
        }
    }, []);

    useEffect(() => {
        fetchNetworkFeed();
        fetchConnections();
        fetchFollowers();
        fetchFollowing();
    }, [fetchNetworkFeed, fetchConnections, fetchFollowers, fetchFollowing]);

    const initials = (c: ConnectionUser) =>
        `${c.firstName?.charAt(0) ?? ""}${c.lastName?.charAt(0) ?? ""}`.toUpperCase() || "?";
    const followerInitials = (f: FollowerUser) =>
        `${f.firstName?.charAt(0) ?? ""}${f.lastName?.charAt(0) ?? ""}`.toUpperCase() || "?";

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50/30">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="max-w-6xl mx-auto px-4 py-12">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Network className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight">My Network</h1>
                    </div>
                    <p className="text-blue-200 text-lg max-w-xl">
                        Posts and updates from your connections.
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
                <Tabs defaultValue="feed">
                    <TabsList className="mb-6">
                        <TabsTrigger value="feed" className="flex items-center gap-2">
                            <Network className="h-4 w-4" /> Network Feed
                        </TabsTrigger>
                        <TabsTrigger value="connections" className="flex items-center gap-2">
                            <Users className="h-4 w-4" /> Connections ({connections.length})
                        </TabsTrigger>
                        <TabsTrigger value="followers" className="flex items-center gap-2">
                            <Users className="h-4 w-4" /> Followers ({followers.length})
                        </TabsTrigger>
                        <TabsTrigger value="following" className="flex items-center gap-2">
                            <Users className="h-4 w-4" /> Following ({following.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Network Feed Tab ── */}
                    <TabsContent value="feed">
                        {loadingPosts ? (
                            <div className="flex justify-center py-16">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : posts.length === 0 ? (
                            <Card>
                                <CardContent className="py-16 text-center">
                                    <Network className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No posts yet</h3>
                                    <p className="text-gray-500 text-sm max-w-sm mx-auto">
                                        When your connections post in communities, their posts will appear here.
                                        Connect with more people to grow your feed.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {posts.map((post) => (
                                    <PostItem key={post.postId} post={post} showCommunity communityId={post.communityId} />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* ── Connections Tab ── */}
                    <TabsContent value="connections">
                        {loadingConnections ? (
                            <div className="flex justify-center py-16">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : connections.length === 0 ? (
                            <Card>
                                <CardContent className="py-16 text-center">
                                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No connections yet</h3>
                                    <p className="text-gray-500 text-sm max-w-sm mx-auto">
                                        Visit expert or user profiles and hit <strong>Connect</strong> to start building
                                        your network.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {connections.map((c) => (
                                    <Link key={c.connection.connectionId} href={`/profile/${c.otherUserId}`}>
                                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                            <CardContent className="p-5 flex items-center gap-4">
                                                <Avatar className="h-12 w-12">
                                                    <AvatarImage src={c.profilePicture || undefined} alt={c.firstName} />
                                                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                                                        {initials(c)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-900 truncate">
                                                        {c.firstName} {c.lastName}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <UserCheck className="h-3.5 w-3.5 text-green-500" />
                                                        <span className="text-xs text-green-600">Connected</span>
                                                        {c.isExpert && (
                                                            <Badge variant="default" className="text-xs ml-1 py-0">Expert</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="shrink-0"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleDisconnect(c.otherUserId, c.connection.connectionId);
                                                    }}
                                                    disabled={disconnectingId === c.connection.connectionId}
                                                >
                                                    {disconnectingId === c.connection.connectionId ? "Removing..." : "Unconnect"}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* ── Followers Tab ── */}
                    <TabsContent value="followers">
                        {loadingFollowers ? (
                            <div className="flex justify-center py-16">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : followers.length === 0 ? (
                            <Card>
                                <CardContent className="py-16 text-center">
                                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No followers yet</h3>
                                    <p className="text-gray-500 text-sm max-w-sm mx-auto">
                                        When people follow you, they’ll appear here.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {followers.map((f) => (
                                    <Link key={f.id} href={`/profile/${f.id}`}>
                                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                            <CardContent className="p-5 flex items-center gap-4">
                                                <Avatar className="h-12 w-12">
                                                    <AvatarImage src={f.profilePicture || undefined} alt={f.firstName} />
                                                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                                                        {followerInitials(f)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-900 truncate">
                                                        {f.firstName} {f.lastName}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <UserCheck className="h-3.5 w-3.5 text-blue-500" />
                                                        <span className="text-xs text-blue-600">Follower</span>
                                                        {f.isExpert && (
                                                            <Badge variant="default" className="text-xs ml-1 py-0">Expert</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* ── Following Tab ── */}
                    <TabsContent value="following">
                        {loadingFollowing ? (
                            <div className="flex justify-center py-16">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : following.length === 0 ? (
                            <Card>
                                <CardContent className="py-16 text-center">
                                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Not following anyone</h3>
                                    <p className="text-gray-500 text-sm max-w-sm mx-auto">
                                        When you follow people, they’ll appear here.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {following.map((f) => (
                                    <Link key={f.id} href={`/profile/${f.id}`}>
                                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                            <CardContent className="p-5 flex items-center gap-4">
                                                <Avatar className="h-12 w-12">
                                                    <AvatarImage src={f.profilePicture || undefined} alt={f.firstName} />
                                                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                                                        {followerInitials(f)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-900 truncate">
                                                        {f.firstName} {f.lastName}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                                                        <span className="text-xs text-indigo-600">Following</span>
                                                        {f.isExpert && (
                                                            <Badge variant="default" className="text-xs ml-1 py-0">Expert</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
