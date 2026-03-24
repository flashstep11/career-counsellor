"use client";

import Link from "next/link";
import { Heart, MessageSquare, Eye, Clock, Pin, Trash2, Flag, BadgeCheck, MoreVertical, Shield, Settings2 } from "lucide-react";
import { Post } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { utcDate } from "@/lib/utils";
import { useState } from "react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

const CREDENTIAL_COLORS: Record<string, string> = {
    "Verified": "bg-blue-100 text-blue-700",
    "Career Counselor": "bg-green-100 text-green-700",
    "Professor": "bg-purple-100 text-purple-700",
    "Industry Expert": "bg-orange-100 text-orange-700",
    "Alumni": "bg-teal-100 text-teal-700",
};

interface PostItemProps {
    post: Post;
    className?: string;
    showCommunity?: boolean;
    isModerator?: boolean;
    isAuthorModerator?: boolean;
    communityId?: string;
    onPin?: () => void;
    onModDelete?: () => void;
    onCredentialsUpdate?: (userId: string, credentials: string[]) => void;
}

export default function PostItem({
    post,
    className,
    showCommunity = false,
    isModerator = false,
    isAuthorModerator = false,
    communityId,
    onPin,
    onModDelete,
    onCredentialsUpdate,
}: PostItemProps) {
    const { user, isAuthenticated } = useAuth();
    const userId = user?._id || "";
    const [likes, setLikes] = useState(post.likes);
    const [likedBy, setLikedBy] = useState<string[]>(post.likedBy || []);
    const isLiked = likedBy.includes(userId);
    const isAuthor = userId === post.authorId;

    // Report modal state
    const [showReport, setShowReport] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [reportDone, setReportDone] = useState(false);

    // Mod menu state
    const [showModMenu, setShowModMenu] = useState(false);

    // Credential management state
    const ALLOWED_CREDENTIALS = ["Verified", "Career Counselor", "Professor", "Industry Expert", "Alumni"];
    const [showCredentials, setShowCredentials] = useState(false);
    const [selectedCredentials, setSelectedCredentials] = useState<string[]>(post.authorCredentials ?? []);
    const [localCredentials, setLocalCredentials] = useState<string[] | null>(null);
    const [credSaving, setCredSaving] = useState(false);
    const [credDone, setCredDone] = useState(false);

    const toggleCred = (cred: string) =>
        setSelectedCredentials((prev) =>
            prev.includes(cred) ? prev.filter((c) => c !== cred) : [...prev, cred]
        );

    const handleSaveCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!communityId) return;
        setCredSaving(true);
        try {
            await axios.put(`/api/communities/${communityId}/members/${post.authorId}/credentials`, {
                credentials: selectedCredentials,
            });
            setCredDone(true);
            setLocalCredentials(selectedCredentials);
            onCredentialsUpdate?.(post.authorId, selectedCredentials);
        } catch {
            // ignore
        } finally {
            setCredSaving(false);
        }
    };

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) return;

        if (isLiked) {
            setLikes((l) => l - 1);
            setLikedBy((lb) => lb.filter((id) => id !== userId));
        } else {
            setLikes((l) => l + 1);
            setLikedBy((lb) => [...lb, userId]);
        }

        try {
            await axios.post(`/api/posts/${post.postId}/like`);
        } catch {
            if (isLiked) {
                setLikes((l) => l + 1);
                setLikedBy((lb) => [...lb, userId]);
            } else {
                setLikes((l) => l - 1);
                setLikedBy((lb) => lb.filter((id) => id !== userId));
            }
        }
    };

    const handleReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reportReason.trim() || !communityId) return;
        setReportSubmitting(true);
        try {
            await axios.post(`/api/communities/${communityId}/reports`, {
                targetId: post.postId,
                targetType: "post",
                reason: reportReason.trim(),
            });
            setReportDone(true);
        } catch {
            // ignore
        } finally {
            setReportSubmitting(false);
        }
    };

    const initials = post.authorInitials || (post.authorName?.charAt(0) || "U").toUpperCase();
    const credentials = localCredentials ?? post.authorCredentials ?? [];

    return (
        <div
            className={`group relative bg-white border rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 p-5 ${post.isPinned ? "border-amber-300 bg-amber-50/30" : "border-gray-100 hover:border-indigo-200"} ${className ?? ""}`}
        >
            {/* Pinned indicator */}
            {post.isPinned && (
                <div className="flex items-center gap-1 text-xs text-amber-600 font-semibold mb-2">
                    <Pin className="h-3.5 w-3.5 fill-amber-400" /> Pinned
                </div>
            )}

            {/* Author row */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3 text-xs text-gray-400">
                <Link href={`/profile/${post.authorId}`} onClick={(e) => e.stopPropagation()}>
                    <div
                        className="h-7 w-7 rounded-full flex items-center justify-center text-white font-bold text-xs cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: "#6366f1" }}
                    >
                        {initials}
                    </div>
                </Link>
                <Link
                    href={`/profile/${post.authorId}`}
                    className="font-medium text-gray-600 hover:text-indigo-600 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                >
                    {post.authorName || "Anonymous"}
                </Link>
                {/* Credential badges */}
                {credentials.map((cred) => (
                    <span
                        key={cred}
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${CREDENTIAL_COLORS[cred] ?? "bg-gray-100 text-gray-600"}`}
                    >
                        <BadgeCheck className="h-2.5 w-2.5" />
                        {cred}
                    </span>
                ))}
                {/* Moderator badge */}
                {isAuthorModerator && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                        <Shield className="h-2.5 w-2.5" />
                        Mod
                    </span>
                )}
                {showCommunity && post.communityDisplayName && (
                    <>
                        <span>in</span>
                        <Link
                            href={`/communities/${post.communityName || post.communityId}`}
                            className="font-semibold text-indigo-500 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            c/{post.communityName}
                        </Link>
                    </>
                )}
                <span className="ml-auto flex items-center gap-1 whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(utcDate(post.createdAt), { addSuffix: true })}
                </span>

                {/* Mod / author action menu */}
                {(isModerator || isAuthor) && (
                    <div className="relative">
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowModMenu((v) => !v); }}
                            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                        >
                            <MoreVertical className="h-4 w-4" />
                        </button>
                        {showModMenu && (
                            <div
                                className="absolute right-0 top-6 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[140px]"
                                onMouseLeave={() => setShowModMenu(false)}
                            >
                                {isModerator && onPin && (
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowModMenu(false); onPin(); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-amber-50 text-amber-700"
                                    >
                                        <Pin className="h-3.5 w-3.5" />
                                        {post.isPinned ? "Unpin" : "Pin to top"}
                                    </button>
                                )}
                                {isModerator && !isAuthor && (
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowModMenu(false); setSelectedCredentials(post.authorCredentials ?? []); setCredDone(false); setShowCredentials(true); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-blue-50 text-blue-600"
                                    >
                                        <Settings2 className="h-3.5 w-3.5" />
                                        Manage credentials
                                    </button>
                                )}
                                {(isModerator || isAuthor) && (
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowModMenu(false); onModDelete?.(); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-red-50 text-red-600"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Delete post
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Title + content */}
            <Link href={`/posts/${post.postId}`}>
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors mb-1.5 line-clamp-2">
                    {post.title}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{post.content}</p>
            </Link>

            {/* Media gallery */}
            {post.media && post.media.length > 0 && (
                <div className={`grid gap-2 mb-3 ${post.media.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                    {post.media.map((item, i) => (
                        <div key={i} className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                            {item.type === "image" ? (
                                <img src={item.url} alt="" className="w-full h-48 object-cover" loading="lazy" />
                            ) : (
                                <video src={item.url} controls className="w-full h-48 object-cover" preload="metadata" />
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {post.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Top Comment */}
            {post.topComment && (
                <div className="flex items-start gap-2 mb-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-[10px] mt-0.5" style={{ backgroundColor: "#6366f1" }}>
                        {post.topComment.authorInitials}
                    </div>
                    <div className="min-w-0">
                        <span className="text-xs font-medium text-gray-600 mr-1.5">{post.topComment.authorName}</span>
                        <span className="text-xs text-gray-500 line-clamp-2">{post.topComment.content}</span>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-5 text-xs text-gray-400">
                <button
                    onClick={handleLike}
                    className={`flex items-center gap-1.5 hover:text-rose-500 transition-colors ${isLiked ? "text-rose-500" : ""}`}
                >
                    <Heart className={`h-4 w-4 ${isLiked ? "fill-rose-500" : ""}`} />
                    <span>{likes}</span>
                </button>

                <Link href={`/posts/${post.postId}`} className="flex items-center gap-1.5 hover:text-indigo-500 transition-colors">
                    <MessageSquare className="h-4 w-4" />
                    <span>{post.commentsCount || 0} comments</span>
                </Link>

                <div className="flex items-center gap-1.5 ml-auto">
                    <Eye className="h-3.5 w-3.5" />
                    <span>{post.views || 0}</span>
                </div>

                {isAuthenticated && communityId && !isAuthor && (
                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowReport(true); }}
                        className="flex items-center gap-1 hover:text-rose-500 transition-colors"
                        title="Report post"
                    >
                        <Flag className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            {/* Report modal */}
            {showReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowReport(false)}>
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-80 max-w-full" onClick={(e) => e.stopPropagation()}>
                        {reportDone ? (
                            <div className="text-center py-4">
                                <BadgeCheck className="h-10 w-10 text-green-500 mx-auto mb-2" />
                                <p className="font-semibold text-gray-800">Report submitted</p>
                                <p className="text-sm text-gray-400 mt-1">Moderators will review it shortly.</p>
                                <button onClick={() => { setShowReport(false); setReportDone(false); setReportReason(""); }} className="mt-4 text-sm text-indigo-600 hover:underline">Close</button>
                            </div>
                        ) : (
                            <form onSubmit={handleReport}>
                                <h3 className="font-bold text-gray-800 mb-1">Report Post</h3>
                                <p className="text-xs text-gray-400 mb-3">Tell moderators why this post violates community rules.</p>
                                <textarea
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    placeholder="Describe the issue..."
                                    rows={3}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                                    required
                                />
                                <div className="flex gap-2 mt-3">
                                    <button type="button" onClick={() => setShowReport(false)} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
                                    <button type="submit" disabled={reportSubmitting || !reportReason.trim()} className="flex-1 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold disabled:opacity-50">
                                        {reportSubmitting ? "Submitting..." : "Submit"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Manage credentials modal */}
            {showCredentials && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCredentials(false)}>
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-80 max-w-full" onClick={(e) => e.stopPropagation()}>
                        {credDone ? (
                            <div className="text-center py-4">
                                <BadgeCheck className="h-10 w-10 text-green-500 mx-auto mb-2" />
                                <p className="font-semibold text-gray-800">Credentials updated</p>
                                <button onClick={() => { setShowCredentials(false); setCredDone(false); }} className="mt-4 text-sm text-indigo-600 hover:underline">Close</button>
                            </div>
                        ) : (
                            <form onSubmit={handleSaveCredentials}>
                                <h3 className="font-bold text-gray-800 mb-1">Manage Credentials</h3>
                                <p className="text-xs text-gray-400 mb-4">Assign verification badges for <span className="font-semibold text-gray-600">{post.authorName}</span>.</p>
                                <div className="space-y-3">
                                    {ALLOWED_CREDENTIALS.map((cred) => (
                                        <label key={cred} className="flex items-center gap-3 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={selectedCredentials.includes(cred)}
                                                onChange={() => toggleCred(cred)}
                                                className="h-4 w-4 rounded border-gray-300 accent-indigo-600"
                                            />
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CREDENTIAL_COLORS[cred] ?? "bg-gray-100 text-gray-600"}`}>{cred}</span>
                                        </label>
                                    ))}
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button type="button" onClick={() => setShowCredentials(false)} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
                                    <button type="submit" disabled={credSaving} className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">
                                        {credSaving ? "Saving..." : "Save"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
