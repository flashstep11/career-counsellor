"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Heart, Clock } from "lucide-react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

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
  mediaType?: "image" | "video" | null;
  mediaUrl?: string;
  topComment?: PostComment;
}

interface PostComment {
  commentId: string;
  authorName: string;
  authorInitials: string;
  content: string;
  createdAt: string;
}

interface Filters {
  fields: string[];
  goals: string[];
  educationLevel: string;
  sortBy: string;
}

interface DiscussionFeedProps {
  filters?: Filters;
}

export function DiscussionFeed({ filters }: DiscussionFeedProps = {}) {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [filters]);

  const fetchPosts = async () => {
    try {
      // /api/posts now returns community-scoped posts
      const response = await axios.get(`/api/posts?limit=50`);
      const rawPosts: Post[] = Array.isArray(response.data)
        ? response.data
        : response.data.posts || [];

      // Apply filters if provided
      let filteredPosts = rawPosts;
      if (filters) {
        if (filters.fields && filters.fields.length > 0) {
          filteredPosts = filteredPosts.filter(post =>
            post.tags && post.tags.some(tag =>
              filters.fields.some(field =>
                tag.toLowerCase().includes(field.toLowerCase()) ||
                field.toLowerCase().includes(tag.toLowerCase())
              )
            )
          );
        }
        if (filters.goals && filters.goals.length > 0) {
          filteredPosts = filteredPosts.filter(post => {
            const searchText = `${post.content} ${(post.tags || []).join(' ')}`.toLowerCase();
            return filters.goals.some(goal =>
              searchText.includes(goal.toLowerCase())
            );
          });
        }
        if (filters.sortBy) {
          filteredPosts = [...filteredPosts].sort((a, b) => {
            switch (filters.sortBy) {
              case 'mostRecent': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              case 'mostLiked': return b.likes - a.likes;
              case 'mostViewed': return b.views - a.views;
              case 'mostDiscussed': return (b.commentsCount || 0) - (a.commentsCount || 0);
              default: return 0;
            }
          });
        }
      }
      setPosts(filteredPosts);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (e: React.MouseEvent, postId: string, currentLikes: number, likedBy: string[]) => {
    // CRITICAL: Stop propagation to prevent card click
    e.stopPropagation();

    const userId = user?._id || "";

    // Optimistic UI update
    const prevPosts = posts;
    const isLiked = likedBy.includes(userId);
    const updatedPosts = posts.map((post) => {
      if (post.postId === postId) {
        return {
          ...post,
          likes: isLiked ? currentLikes - 1 : currentLikes + 1,
          likedBy: isLiked
            ? likedBy.filter((id) => id !== userId)
            : [...likedBy, userId],
        };
      }
      return post;
    });
    setPosts(updatedPosts);

    // Send API request in background to internal API, include token if available
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      await axios.post(
        `/api/posts/${postId}/like`,
        {},
        token
          ? { headers: { Authorization: `Bearer ${token}` } }
          : undefined
      );
    } catch (error) {
      console.error("Error liking post:", error);
      // Rollback on error
      setPosts(prevPosts);
    }
  };

  const navigateToPost = (postId: string) => {
    router.push(`/posts/${postId}`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="py-12 text-center">
        <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-3" />
        <p className="text-muted-foreground">
          No discussions yet. Check back later!
        </p>
      </div>
    );
  }

  const leftPosts = posts.filter((_, index) => index % 2 === 0);
  const rightPosts = posts.filter((_, index) => index % 2 === 1);

  const renderPostList = (list: Post[]) => (
    <div className="space-y-0">
      {list.map((post, index) => (
        <div key={post.postId}>
          <div
            className="py-6 hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer group"
            onClick={() => navigateToPost(post.postId)}
          >
            {/* Post Header */}
            <div className="flex items-start gap-3 mb-4">
              <Avatar className="h-10 w-10 ring-1 ring-gray-200">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-sm">
                  {post.authorInitials || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {post.authorName || "Anonymous"}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(post.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Post Content */}
            <div className="ml-13">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap line-clamp-3 leading-relaxed">
                {post.content}
              </p>

              {/* Media Content */}
              {post.mediaType === "image" && post.mediaUrl && (
                <div className="mb-3 rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={post.mediaUrl}
                    alt="Post media"
                    className="w-full h-auto object-cover max-h-[400px]"
                    loading="lazy"
                  />
                </div>
              )}
              {post.mediaType === "video" && post.mediaUrl && (
                <div className="mb-3 rounded-lg overflow-hidden border border-gray-200">
                  <video
                    controls
                    className="w-full h-auto max-h-[400px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <source src={post.mediaUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {post.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className={`text-xs px-2 py-0.5 ${tag.toLowerCase().includes("startup")
                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300"
                        : tag.toLowerCase().includes("master")
                          ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300"
                          : tag.toLowerCase().includes("interview")
                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300"
                            : tag.toLowerCase().includes("career")
                              ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300"
                              : "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Post Actions - Like and Comment Count ONLY */}
              <div className="flex items-center gap-6 mb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleLike(e, post.postId, post.likes, post.likedBy)}
                  className="gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 px-2 -ml-2"
                >
                  <Heart
                    className={`h-4 w-4 transition-colors ${post.likedBy?.includes(user?._id || "")
                      ? "fill-red-500 text-red-500"
                      : "text-gray-500"
                      }`}
                  />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {post.likes}
                  </span>
                </Button>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MessageSquare className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">
                    {post.commentsCount || 0}
                  </span>
                </div>
              </div>

              {/* Top Comment Preview */}
              {post.topComment && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div className="flex items-start gap-2">
                    <Avatar className="h-7 w-7 ring-1 ring-gray-200">
                      <AvatarFallback className="bg-gradient-to-br from-gray-500 to-gray-600 text-white text-xs">
                        {post.topComment.authorInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                          {post.topComment.authorName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(post.topComment.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                        {post.topComment.content}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Subtle Divider between posts */}
          {index < list.length - 1 && (
            <div className="border-b border-gray-100 dark:border-gray-800" />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/70 dark:bg-gray-950/30 shadow-sm overflow-hidden">
        <div className="max-h-[calc(100vh-260px)] overflow-y-auto px-2">
          {renderPostList(leftPosts)}
        </div>
      </div>
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/70 dark:bg-gray-950/30 shadow-sm overflow-hidden">
        <div className="max-h-[calc(100vh-260px)] overflow-y-auto px-2">
          {renderPostList(rightPosts)}
        </div>
      </div>
    </div>
  );
}
