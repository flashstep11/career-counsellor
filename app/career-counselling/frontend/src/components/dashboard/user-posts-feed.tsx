"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  Heart,
  Clock,
  Edit,
  Trash2,
  Save,
  X,
  Users2,
  Loader2,
} from "lucide-react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Post {
  postId: string;
  title?: string;
  content: string;
  authorId?: string;
  authorName?: string;
  authorInitials?: string;
  communityId?: string;
  communityName?: string;
  communityDisplayName?: string;
  createdAt: string;
  updatedAt: string;
  likes: number;
  likedBy: string[];
  views: number;
  tags?: string[];
  commentsCount?: number;
}

export function UserPostsFeed() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");

  useEffect(() => {
    if (user) fetchUserPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchUserPosts = async () => {
    if (!user) { setLoading(false); return; }
    try {
      const res = await axios.get("/api/posts?limit=100");
      const allPosts: Post[] = Array.isArray(res.data) ? res.data : res.data.posts || [];
      // Show only posts authored by the current user
      const mine = allPosts.filter((p) => p.authorId === user._id);
      setPosts(mine);
    } catch {
      toast.error("Failed to load your posts");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (post: Post) => {
    setEditingPostId(post.postId);
    setEditTitle(post.title || "");
    setEditContent(post.content);
    setEditTags((post.tags || []).join(", "));
  };

  const handleCancelEdit = () => {
    setEditingPostId(null);
  };

  const handleSaveEdit = async (postId: string) => {
    try {
      const token = localStorage.getItem("token");
      const tags = editTags.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await axios.put(
        `/api/posts/${postId}`,
        { title: editTitle, content: editContent, tags },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPosts((prev) =>
        prev.map((p) => (p.postId === postId ? { ...p, ...res.data } : p))
      );
      setEditingPostId(null);
      toast.success("Post updated!");
    } catch {
      toast.error("Failed to update post");
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Delete this post?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts((prev) => prev.filter((p) => p.postId !== postId));
      toast.success("Post deleted");
    } catch {
      toast.error("Failed to delete post");
    }
  };

  const handleLike = async (e: React.MouseEvent, postId: string, currentLikes: number, likedBy: string[]) => {
    e.stopPropagation();
    const userId = user?._id || "";
    const isLiked = likedBy.includes(userId);
    setPosts((prev) =>
      prev.map((p) =>
        p.postId === postId
          ? {
            ...p,
            likes: isLiked ? currentLikes - 1 : currentLikes + 1,
            likedBy: isLiked ? likedBy.filter((id) => id !== userId) : [...likedBy, userId],
          }
          : p
      )
    );
    try {
      const token = localStorage.getItem("token");
      await axios.post(`/api/posts/${postId}/like`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      fetchUserPosts();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="py-12 text-center">
        <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-3" />
        <p className="text-muted-foreground text-sm">
          You haven't posted anything yet.{" "}
          <span
            className="text-indigo-600 cursor-pointer hover:underline"
            onClick={() => router.push("/communities")}
          >
            Explore communities to get started!
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {posts.map((post, index) => (
        <div key={post.postId}>
          <div
            className={`py-6 transition-colors ${editingPostId !== post.postId ? "hover:bg-gray-50/50 cursor-pointer" : ""
              }`}
            onClick={() => editingPostId !== post.postId && router.push(`/posts/${post.postId}`)}
          >
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
              <Avatar className="h-10 w-10 ring-1 ring-gray-200 shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-sm">
                  {post.authorInitials || (user?.firstName?.[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900">
                      {post.authorName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "You"}
                    </span>
                    <Badge variant="secondary" className="text-xs px-2 py-0">You</Badge>
                    {post.communityName && (
                      <span
                        className="text-xs text-indigo-500 font-medium hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/communities/${post.communityName || post.communityId}`);
                        }}
                      >
                        <Users2 className="h-3 w-3 inline mr-0.5" />
                        c/{post.communityName}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">·</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  {/* Action buttons */}
                  {editingPostId !== post.postId && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(post)}
                        className="h-7 px-2 hover:bg-indigo-50"
                      >
                        <Edit className="h-3.5 w-3.5 text-indigo-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(post.postId)}
                        className="h-7 px-2 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content — edit mode or view mode */}
            <div className="ml-13">
              {editingPostId === post.postId ? (
                <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                  <Input
                    placeholder="Title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="rounded-xl font-semibold"
                  />
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[100px] text-sm resize-none rounded-xl"
                    placeholder="Post content..."
                  />
                  <Input
                    placeholder="Tags (comma separated)"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    className="rounded-xl text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(post.postId)}
                      className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                    >
                      <Save className="h-3.5 w-3.5" /> Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="gap-1 rounded-lg"
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {post.title && (
                    <p className="font-semibold text-gray-900 mb-1 line-clamp-1">{post.title}</p>
                  )}
                  <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap leading-relaxed line-clamp-3">
                    {post.content}
                  </p>
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {post.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 border-indigo-100">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleLike(e, post.postId, post.likes, post.likedBy)}
                      className="gap-2 hover:bg-red-50 h-8 px-2 -ml-2"
                    >
                      <Heart
                        className={`h-4 w-4 transition-colors ${post.likedBy?.includes(user?._id || "")
                            ? "fill-red-500 text-red-500"
                            : "text-gray-500"
                          }`}
                      />
                      <span className="text-sm font-medium text-gray-600">{post.likes}</span>
                    </Button>
                    <div className="flex items-center gap-2 text-gray-500">
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-sm font-medium">{post.commentsCount || 0}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {index < posts.length - 1 && <div className="border-b border-gray-100" />}
        </div>
      ))}
    </div>
  );
}
