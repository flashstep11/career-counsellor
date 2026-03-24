"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare,
  Heart,
  Send,
  ArrowLeft,
  Loader2,
  Users2,
  Pencil,
  X,
} from "lucide-react";
import axios from "axios";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Post } from "@/types";
import { Input } from "@/components/ui/input";

interface Comment {
  commentID: string;
  content: string;
  userID: string;
  createdAt: string;
  parent_id?: string;
  user?: { name?: string; avatar?: string; userId?: string };
}

function PostDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (postId) fetchPostAndComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const fetchPostAndComments = async () => {
    setLoading(true);
    try {
      const postRes = await axios.get(`/api/posts/${postId}`);
      setPost(postRes.data);
      await fetchComments();
      // track view count
      axios.post(`/api/posts/${postId}/view`).catch(() => { });
      // track in user history (DB-backed, per-user)
      const _token = localStorage.getItem("token");
      if (_token && postRes.data?.title) {
        fetch("/api/activity/view", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${_token}` },
          body: JSON.stringify({ type: "post", itemId: postId, title: postRes.data.title || postRes.data.content?.slice(0, 60) }),
        }).catch(() => {});
      }
    } catch {
      // handled below
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const res = await axios.get(`/api/comments?page_id=${postId}&type=post&limit=50`);
      setComments(res.data.comments || []);
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
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

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      await axios.post(`/api/comments`, {
        content: newComment,
        type: "post",
        page_id: postId,
        parent_id: null,
      });
      setNewComment("");
      await fetchComments();
      if (post) setPost({ ...post, commentsCount: (post.commentsCount || 0) + 1 });
    } catch {
      // ignore
    } finally {
      setSubmittingComment(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

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
        <Card className="mb-5 rounded-2xl border-gray-100 shadow-sm">
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
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-3">{post.title}</h1>

            {/* Content */}
            <p className="text-base text-gray-700 mb-4 whitespace-pre-wrap leading-relaxed">
              {post.content}
            </p>

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
                  {post.commentsCount || comments.length} Comments
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card className="rounded-2xl border-gray-100 shadow-sm">
          <CardHeader>
            <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add Comment */}
            <div className="space-y-3">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[100px] resize-none rounded-xl"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submittingComment}
                  className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                >
                  {submittingComment ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Posting...</>
                  ) : (
                    <><Send className="h-4 w-4" /> Post Comment</>
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Comments List */}
            {loadingComments ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-400 mb-2" />
                <p className="text-sm text-muted-foreground">Loading comments...</p>
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment) => {
                  const name = comment.user?.name || comment.userID;
                  const initials = name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  return (
                    <div key={comment.commentID} className="flex gap-4">
                      <Link href={comment.user?.userId ? `/profile/${comment.user.userId}` : `#`}>
                        <Avatar className="h-9 w-9 shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
                          <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Link
                            href={comment.user?.userId ? `/profile/${comment.user.userId}` : `#`}
                            className="font-semibold text-sm hover:text-indigo-600 transition-colors"
                          >
                            {name}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString(undefined, {
                              year: "numeric", month: "short", day: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-muted-foreground">No comments yet. Be the first!</p>
              </div>
            )}
          </CardContent>
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
