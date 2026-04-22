"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Reply, MessageSquare } from "lucide-react";
import { Comment } from "@/types";

interface CommentsSectionProps {
  pageId: string | number | undefined;
  type: "blog" | "video" | "post" | "expert";
  title?: string;
  onCommentAdded?: () => void;
}

export default function CommentsSection({
  pageId,
  type,
  title = "Comments",
  onCommentAdded,
}: CommentsSectionProps) {
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const MAX_NESTING_DEPTH = 4;

  // Pagination state
  const [limit, setLimit] = useState(10);
  const [totalComments, setTotalComments] = useState(0);

  const fetchComments = useCallback(async () => {
    if (!pageId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/comments?page_id=${pageId}&type=${type}&limit=${limit}`
      );

      if (!response.ok) {
        if (response.status === 401) {
          setError("Unauthorized. Please log in.");
        } else {
          setError(`Failed to fetch comments: ${response.statusText}`);
        }
        setLoading(false);
        return;
      }

      const data = await response.json();

      // Handle both paginated and non-paginated responses
      if (data.comments && typeof data.total !== "undefined") {
        // Paginated response
        setComments(data.comments);
        setTotalComments(data.total);
      } else if (Array.isArray(data)) {
        // Non-paginated response (array of comments)
        setComments(data.slice(0, limit));
        setTotalComments(data.length);
      } else if (data.data && Array.isArray(data.data)) {
        // Another common format: { data: [...comments] }
        setComments(data.data.slice(0, limit));
        setTotalComments(data.data.length);
      } else {
        // Empty or unexpected format
        console.log("Unexpected data format:", data);
        setComments([]);
        setTotalComments(0);
      }
    } catch (err) {
      console.error(`Error fetching ${type} comments:`, err);
      setError(`Failed to fetch comments. Please try again later.`);
    } finally {
      setLoading(false);
    }
  }, [pageId, type, limit]);

  useEffect(() => {
    if (pageId) {
      fetchComments();
    }
  }, [pageId, type, fetchComments]);

  const handleComment = async () => {
    if (!user) {
      toast.error("You must be logged in to comment");
      return;
    }

    if (!comment.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    const token = localStorage.getItem("token");
    const newComment = {
      content: comment,
      type: type,
      page_id: pageId,
    };

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newComment),
      });

      if (response.ok) {
        const data = await response.json();
        // Keep within current limit window
        setComments((prev) => [data, ...prev.slice(0, limit - 1)]);
        // Increment total comments
        setTotalComments((prev) => prev + 1);
        setComment("");
        if (onCommentAdded) {
          onCommentAdded();
        }
        toast.success("Comment posted successfully");
      } else {
        setError("Failed to post comment");
        toast.error("Failed to post comment");
      }
    } catch (err) {
      console.error("Error posting comment:", err);
      setError("Failed to post comment");
      toast.error("Failed to post comment");
    }
  };

  const handleReply = async (commentId: string) => {
    if (!user) {
      toast.error("You must be logged in to reply");
      return;
    }

    if (!replyContent.trim()) {
      toast.error("Reply cannot be empty");
      return;
    }

    const token = localStorage.getItem("token");
    const reply = {
      content: replyContent,
      type: type,
      page_id: pageId,
      parent_id: commentId,
    };

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reply),
      });

      if (response.ok) {
        const newReply = await response.json();

        // Add the reply to its parent comment
        setComments((prevComments) =>
          prevComments.map((comment) => {
            if (comment.commentID === commentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), newReply],
              };
            }
            return comment;
          })
        );

        // Reset reply state
        setReplyingTo(null);
        setReplyContent("");
        if (onCommentAdded) {
          onCommentAdded();
        }
        toast.success("Reply posted successfully");
      } else {
        const errorData = await response.json();
        if (
          errorData.detail &&
          errorData.detail.includes("Maximum reply nesting depth")
        ) {
          toast.error("Maximum reply nesting depth reached. You cannot reply further.");
        } else {
          setError("Failed to post reply");
          toast.error("Failed to post reply");
        }
      }
    } catch (err) {
      setError("Failed to post reply");
      console.error(err);
      toast.error("Failed to post reply");
    }
  };

  const handleShowMore = () => {
    setLimit((prev) => prev + 10);
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  const renderComment = (comment: Comment, depth: number) => {
    const isReplying = replyingTo === comment.commentID;
    return (
      <div key={comment.commentID} className="group">
        <div
          className={`flex gap-3 py-4 ${depth > 0 ? "border-l-2 border-gray-100" : ""}`}
          style={{ marginLeft: depth * 16, paddingLeft: depth > 0 ? 16 : 0 }}
        >
          <Link href={comment.user?.userId ? `/profile/${comment.user.userId}` : "#"} onClick={(e) => !comment.user?.userId && e.preventDefault()}>
            <Avatar className={`${depth > 0 ? "h-7 w-7" : "h-9 w-9"} shrink-0 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity`}>
              <AvatarImage src={comment.user?.avatar || "/default-avatar.png"} />
              <AvatarFallback className="bg-primary-blue text-white text-sm">
                {comment.user?.name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <Link
                href={comment.user?.userId ? `/profile/${comment.user.userId}` : "#"}
                onClick={(e) => !comment.user?.userId && e.preventDefault()}
                className={`${depth > 0 ? "text-xs" : "text-sm"} font-semibold text-gray-900 hover:text-indigo-600 transition-colors`}
              >
                {comment.user?.name || "Unknown"}
              </Link>
              <span className="text-xs text-gray-400">
                {new Date(comment.createdAt).toLocaleDateString(undefined, {
                  year: "numeric", month: "short", day: "numeric",
                })}
              </span>
            </div>
            <p className={`${depth > 0 ? "text-xs" : "text-sm"} text-gray-700 leading-relaxed break-words whitespace-pre-wrap`}>{comment.content}</p>
            {depth < MAX_NESTING_DEPTH && (
              <button
                className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-primary-blue transition-colors duration-150"
                onClick={() => {
                  if (isReplying) {
                    setReplyingTo(null);
                    setReplyContent("");
                  } else {
                    setReplyingTo(comment.commentID);
                    setReplyContent("");
                  }
                }}
              >
                <Reply className="h-3.5 w-3.5" />
                Reply
              </button>
            )}
            {isReplying && depth < MAX_NESTING_DEPTH && (
              <div className="flex gap-3 mt-3">
                <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                  <AvatarImage src={user?.avatar ? String(user.avatar) : "/avatars/user.jpg"} />
                  <AvatarFallback className="bg-primary-blue text-white text-xs">
                    {user ? user.firstName?.[0] : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    placeholder="Add a reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="min-h-[56px] resize-none border-0 border-b-2 border-gray-200 rounded-none px-0 focus:border-primary-blue focus:ring-0 text-sm placeholder:text-gray-400 transition-colors duration-200"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <Button variant="ghost" size="sm" onClick={() => { setReplyingTo(null); setReplyContent(""); }} className="text-gray-500 text-xs">
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleReply(comment.commentID)}
                      disabled={!replyContent.trim() || !user}
                      className="bg-primary-blue hover:bg-primary-blue/90 text-white text-xs px-4 rounded-full"
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {comment.replies && comment.replies.length > 0 && depth < MAX_NESTING_DEPTH && (
              <div className="mt-3 space-y-3">
                {comment.replies.map((reply) => renderComment(reply, depth + 1))}
              </div>
            )}

            {depth === MAX_NESTING_DEPTH && comment.replies && comment.replies.length > 0 && (
              <div className="mt-2 text-xs text-gray-400 italic">
                Maximum reply depth reached.
              </div>
            )}
          </div>
        </div>
        {depth === 0 && <div className="border-b border-gray-50" />}
      </div>
    );
  };

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="h-5 w-5 text-gray-700" />
        <h2 className="text-lg font-semibold text-gray-900">
          {title}
        </h2>
        <span className="text-sm text-gray-400 font-normal">{totalComments} comments</span>
      </div>

      {/* Comment Compose */}
      <div className="flex gap-3 mb-8">
        <Avatar className="h-9 w-9 shrink-0 mt-0.5">
          <AvatarImage src={user?.avatar ? String(user.avatar) : "/avatars/user.jpg"} />
          <AvatarFallback className="bg-primary-blue text-white text-sm">
            {user ? user.firstName?.[0] : "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            placeholder={user ? "Add a comment..." : "Log in to comment"}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={!user}
            className="min-h-[72px] resize-none border-0 border-b-2 border-gray-200 rounded-none px-0 focus:border-primary-blue focus:ring-0 text-sm placeholder:text-gray-400 transition-colors duration-200"
          />
          {comment.trim() && (
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" size="sm" onClick={() => setComment("")} className="text-gray-500 text-xs">
                Cancelconst MAX_NESTING_DEPTH = 4;
              </Button>
              <Button
                size="sm"
                onClick={handleComment}
                disabled={!comment.trim() || !user}
                className="bg-primary-blue hover:bg-primary-blue/90 text-white text-xs px-4 rounded-full"
              >
                Comment
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-0">
        {loading && comments.length === 0 ? (
          <div className="space-y-5 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="rounded-full bg-gray-200 h-9 w-9 shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-gray-200 rounded w-32" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-10">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mb-3">
              <MessageSquare className="h-7 w-7 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 mb-3">No comments yet. Be the first!</p>
            {!user && (
              <Button variant="outline" size="sm" onClick={() => (window.location.href = "/login")} className="rounded-full text-xs">
                Login to comment
              </Button>
            )}
          </div>
        ) : (
          <>
            {comments.map((comment) => renderComment(comment, 0))}

            {/* Show more */}
            {comments.length < totalComments && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShowMore}
                  className="rounded-full text-xs"
                >
                  Show more
                </Button>
              </div>
            )}
          </>
        )}

        {loading && comments.length > 0 && (
          <div className="py-4 text-center text-xs text-gray-400">Loading more comments...</div>
        )}
      </div>
    </div>
  );
}
