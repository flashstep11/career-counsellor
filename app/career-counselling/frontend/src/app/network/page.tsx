"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Users, Network, Loader2, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [loadingConnections, setLoadingConnections] = useState(true);

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

    useEffect(() => {
        fetchNetworkFeed();
        fetchConnections();
    }, [fetchNetworkFeed, fetchConnections]);

    const initials = (c: ConnectionUser) =>
        `${c.firstName?.charAt(0) ?? ""}${c.lastName?.charAt(0) ?? ""}`.toUpperCase() || "?";

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
                                    <PostItem key={post.postId} post={post} showCommunity />
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
                                                    <AvatarImage src={c.profilePicture ?? ""} alt={c.firstName} />
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
