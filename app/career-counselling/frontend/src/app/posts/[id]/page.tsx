"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Heart,
  ArrowLeft,
  Loader2,
  Users2,
  Pencil,
  X,
  MoreVertical,
  Flag,
  BadgeCheck,
} from "lucide-react";
import axios from "axios";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Post } from "@/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import CommentsSection from "@/components/shared/comments-section";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import "yet-another-react-lightbox/styles.css";

function PostDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);


  useEffect(() => {
    if (postId) fetchPostAndComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const fetchPostAndComments = async () => {
    setLoading(true);
    try {
      const postRes = await axios.get(`/api/posts/${postId}`);
      setPost(postRes.data);
      // track view count
      axios.post(`/api/posts/${postId}/view`).catch(() => { });
      // track in user history (DB-backed, per-user)
      const _token = localStorage.getItem("token");
      if (_token && postRes.data?.title) {
        fetch("/api/activity/view", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${_token}` },
          body: JSON.stringify({ type: "post", itemId: postId, title: postRes.data.title || postRes.data.content?.slice(0, 60) }),
        }).catch(() => { });
      }
    } catch {
      // handled below
    } finally {
      setLoading(false);
    }
  };


  const handleLike = async () => {
    if (!post) return;
    const userId = user?._id || "";
    const isLiked = post.likedBy?.includes(userId);
    setPost({
      ...post,
      likes: isLiked ? post.likes - 1 : post.likes + 1,
      likedBy: isLiked
        ? post.likedBy.filter((id) => id !== userId)
        : [...post.likedBy, userId],
    });
    try {
      await axios.post(`/api/posts/${postId}/like`);
    } catch {
      fetchPostAndComments();
    }
  };


  const openEdit = () => {
    if (!post) return;
    setEditTitle(post.title || "");
    setEditContent(post.content || "");
    setEditTags((post.tags || []).join(", "));
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!post) return;
    setSavingEdit(true);
    try {
      const token = localStorage.getItem("token");
      const tags = editTags.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await axios.put(
        `/api/posts/${postId}`,
        { title: editTitle, content: editContent, tags },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPost(res.data);
      setEditOpen(false);
    } catch {
      // ignore
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-muted-foreground">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Post not found</h3>
            <p className="text-muted-foreground mb-4">This post doesn't exist or has been removed.</p>
            <Button onClick={() => router.push("/communities")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Communities
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userId = user?._id || "";
  const isLiked = post.likedBy?.includes(userId);
  const isAuthor = !!userId && userId === post.authorId;
  const canReport = !!post.communityId && !isAuthor;

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post.communityId || !reportReason.trim()) return;
    setReportSubmitting(true);
    try {
      await axios.post(`/api/communities/${post.communityId}/reports`, {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/20">
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-8">

        {/* Edit modal */}
        {editOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Edit Post</h2>
                <button onClick={() => setEditOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Title</label>
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Content</label>
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[140px] resize-none rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Tags (comma-separated)</label>
                  <Input value={editTags} onChange={(e) => setEditTags(e.target.value)} className="rounded-xl" placeholder="e.g. career, advice" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={savingEdit || !editContent.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2">
                  {savingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* Community breadcrumb */}
        {post.communityId && (
          <div className="flex items-center gap-2 mb-5">
            <Link
              href={`/communities/${post.communityName || post.communityId}`}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <Users2 className="h-4 w-4" />
              c/{post.communityName || post.communityId}
            </Link>
          </div>
        )}

        {/* Post Card */}
        <Card className="mb-5 rounded-2xl border-gray-100 shadow-sm relative">
          <CardContent className="p-6">
            {/* Author row */}
            <div className="flex items-center gap-3 mb-4">
              <Link href={`/profile/${post.authorId}`}>
                <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity">
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold">
                    {post.authorInitials || "U"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Link href={`/profile/${post.authorId}`} className="font-semibold text-sm hover:text-indigo-600 transition-colors">{post.authorName || "Anonymous"}</Link>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(post.createdAt).toLocaleString(undefined, {
                    year: "numeric", month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
              {isAuthor && (
                <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5 rounded-xl border-gray-200 hover:border-indigo-300 text-gray-600">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
              {canReport && (
                <div className="relative ml-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowOverflowMenu((v) => !v);
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                    aria-label="Post options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {showOverflowMenu && (
                    <div
                      className="absolute right-0 mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[140px]"
                      onMouseLeave={() => setShowOverflowMenu(false)}
                    >
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowOverflowMenu(false);
                          setShowReport(true);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-rose-50 text-rose-600"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        Report
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-3 break-all">{post.title}</h1>

            {/* Content */}
            <p className="text-base text-gray-700 mb-4 whitespace-pre-wrap leading-relaxed break-all">
              {post.content}
            </p>

            {/* Media */}
            {post.media && post.media.length > 0 && (
              <>
                <div className={`grid gap-3 mb-4 ${post.media.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                  {post.media.map((item, i) => (
                    <div
                      key={i}
                      className={`rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center ${(post.media?.length || 0) > 1 ? "h-64" : ""}`}
                    >
                      {item.type === "image" ? (
                        <img
                          src={item.url}
                          alt=""
                          className={`w-full cursor-pointer hover:opacity-90 transition-opacity ${(post.media?.length || 0) === 1 ? "max-h-[600px] h-auto object-contain" : "h-full object-cover"}`}
                          loading="lazy"
                          onClick={() => {
                            setLightboxIndex(i);
                            setLightboxOpen(true);
                          }}
                        />
                      ) : (
                        <video
                          src={item.url}
                          controls
                          className={`w-full ${(post.media?.length || 0) === 1 ? "max-h-[600px] h-auto object-contain" : "h-full object-cover"}`}
                          preload="metadata"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <Lightbox
                  open={lightboxOpen}
                  close={() => setLightboxOpen(false)}
                  index={lightboxIndex}
                  slides={post.media
                    .filter((item) => item.type === "image")
                    .map((item) => ({ src: item.url }))}
                  plugins={[Fullscreen, Zoom, Slideshow]}
                />
              </>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <Separator className="my-4" />

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className="gap-2 hover:bg-red-50"
              >
                <Heart
                  className={`h-4 w-4 transition-colors ${isLiked ? "fill-red-500 text-red-500" : "text-gray-500"}`}
                />
                <span className="text-sm font-medium">{post.likes} Likes</span>
              </Button>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {post.commentsCount ?? 0} Comments
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report modal */}
        {showReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowReport(false)}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-80 max-w-full" onClick={(e) => e.stopPropagation()}>
              {reportDone ? (
                <div className="text-center py-4">
                  <BadgeCheck className="h-10 w-10 text-green-500 mx-auto mb-2" />
                  <p className="font-semibold text-gray-800">Report submitted</p>
                  <p className="text-sm text-gray-400 mt-1">Moderators will review it shortly.</p>
                  <button
                    onClick={() => { setShowReport(false); setReportDone(false); setReportReason(""); }}
                    className="mt-4 text-sm text-indigo-600 hover:underline"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReport}>
                  <h3 className="font-bold text-gray-800 mb-1">Report Post</h3>
                  <p className="text-xs text-gray-400 mb-3">Tell moderators why this post violates rules.</p>
                  <Textarea
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

        {/* Comments Section */}
        <Card className="rounded-2xl border-gray-100 shadow-sm p-6">
          <CommentsSection
            pageId={post.postId}
            type="post"
            onCommentAdded={() => setPost(prev => prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : prev)}
          />
        </Card>
      </div>
    </div>
  );
}

export default function PostDetailPage() {
  return (
    <ProtectedRoute>
      <PostDetailContent />
    </ProtectedRoute>
  );
}
