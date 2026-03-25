"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, MessageSquare, ThumbsUp, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Post {
  _id: string;
  postId: string;
  title: string;
  content: string;
  communityName?: string;
  communityDisplayName?: string;
  communityId?: string;
  likes?: number;
  commentsCount?: number;
  createdAt: string;
  media?: { fileId: string; url: string; type: string }[];
}

interface ExpertPostsProps {
  expertId: string;
  expertName: string;
  expertInitials: string;
  isExpertLoggedIn?: boolean;
  userId?: string;
}

export default function ExpertPosts({
  expertId,
  expertName,
  userId,
}: ExpertPostsProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      // We need the userId to fetch posts. If not provided, try to get it from the expert endpoint
      let authorId = userId;
      if (!authorId) {
        try {
          const apiUrl = "";
          const res = await fetch(`${apiUrl}/api/experts/${expertId}`);
          if (res.ok) {
            const data = await res.json();
            authorId = data.userId;
          }
        } catch (err) {
          console.error("Error fetching expert:", err);
        }
      }

      if (!authorId) {
        setLoading(false);
        return;
      }

      try {
        const apiUrl = "";
        const res = await fetch(`${apiUrl}/api/users/${authorId}/posts?limit=20`);
        if (res.ok) {
          const data = await res.json();
          setPosts(data || []);
        }
      } catch (err) {
        console.error("Error fetching expert posts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [expertId, userId]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="py-10 flex flex-col items-center text-center gap-3">
        <div className="h-14 w-14 bg-gray-100 rounded-2xl flex items-center justify-center">
          <MessageSquare className="h-7 w-7 text-gray-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 mb-1">No Posts Yet</h3>
          <p className="text-sm text-gray-500 max-w-xs">
            {expertName} hasn&apos;t posted anything in communities yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Link key={post.postId || post._id} href={`/posts/${post.postId || post._id}`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-gray-200">
            <CardContent className="p-5">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">
                    {post.title}
                  </h3>
                  {(post.communityDisplayName || post.communityName) && (
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {post.communityDisplayName || post.communityName}
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-gray-600 line-clamp-2">
                  {post.content}
                </p>

                {post.media && post.media.length > 0 && post.media[0].type === "image" && (
                  <div className="rounded-lg overflow-hidden">
                    <img
                      src={post.media[0].url}
                      alt="Post image"
                      className="w-full h-40 object-cover"
                    />
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(post.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    {post.likes || 0}
                  </span>
                  {post.commentsCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {post.commentsCount}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
