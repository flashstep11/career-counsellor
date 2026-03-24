"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Reply, MessageSquare } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Comment } from "@/types";

interface CommentsSectionProps {
  pageId: string | number | undefined;
  type: "blog" | "video" | "post" | "expert";
  title?: string;
}

export default function CommentsSection({
  pageId,
  type,
  title = "Comments",
}: CommentsSectionProps) {
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10); // Number of comments per page
  const [totalComments, setTotalComments] = useState(0);

  const fetchComments = useCallback(async () => {
    if (!pageId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/comments?page_id=${pageId}&type=${type}&page=${currentPage}&limit=${itemsPerPage}`
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
        setTotalPages(Math.ceil(data.total / itemsPerPage));
      } else if (Array.isArray(data)) {
        // Non-paginated response (array of comments)
        setComments(data);
        setTotalComments(data.length);
        setTotalPages(Math.ceil(data.length / itemsPerPage));
      } else if (data.data && Array.isArray(data.data)) {
        // Another common format: { data: [...comments] }
        setComments(data.data);
        setTotalComments(data.data.length);
        setTotalPages(Math.ceil(data.data.length / itemsPerPage));
      } else {
        // Empty or unexpected format
        console.log("Unexpected data format:", data);
        setComments([]);
        setTotalComments(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error(`Error fetching ${type} comments:`, err);
      setError(`Failed to fetch comments. Please try again later.`);
    } finally {
      setLoading(false);
    }
  }, [pageId, currentPage, type, itemsPerPage]);

  useEffect(() => {
    if (pageId) {
      fetchComments();
    }
  }, [pageId, currentPage, type, fetchComments]);

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
        // If we're on the first page, add the new comment to the top
        if (currentPage === 1) {
          setComments((prev) => [data, ...prev.slice(0, itemsPerPage - 1)]);
        }
        // Increment total comments
        setTotalComments((prev) => prev + 1);
        // Recalculate total pages
        setTotalPages(Math.ceil((totalComments + 1) / itemsPerPage));
        setComment("");
        // If we're not on the first page, go to the first page to see the new comment
        if (currentPage !== 1) {
          setCurrentPage(1);
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
        toast.success("Reply posted successfully");
      } else {
        setError("Failed to post reply");
        toast.error("Failed to post reply");
      }
    } catch (err) {
      setError("Failed to post reply");
      console.error(err);
      toast.error("Failed to post reply");
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

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
                Cancel
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
            {comments.map((comment) => (
              <div key={comment.commentID} className="group">
                {/* Main comment row */}
                <div className="flex gap-3 py-4">
                  <Link href={comment.user?.userId ? `/profile/${comment.user.userId}` : "#"} onClick={(e) => !comment.user?.userId && e.preventDefault()}>
                    <Avatar className="h-9 w-9 shrink-0 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity">
                      <AvatarImage src={comment.user?.avatar || "/default-avatar.png"} />
                      <AvatarFallback className="bg-primary-blue text-white text-sm">
                        {comment.user?.name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    {/* Meta row */}
                    <div className="flex items-baseline gap-2 mb-1">
                      <Link
                        href={comment.user?.userId ? `/profile/${comment.user.userId}` : "#"}
                        onClick={(e) => !comment.user?.userId && e.preventDefault()}
                        className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                      >
                        {comment.user?.name || "Unknown"}
                      </Link>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.createdAt).toLocaleDateString(undefined, {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </span>
                    </div>
                    {/* Content */}
                    <p className="text-sm text-gray-700 leading-relaxed">{comment.content}</p>
                    {/* Actions */}
                    <button
                      className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-primary-blue transition-colors duration-150"
                      onClick={() => {
                        if (replyingTo === comment.commentID) {
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

                    {/* Reply compose */}
                    {replyingTo === comment.commentID && (
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

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-3 space-y-3 border-l-2 border-gray-100 pl-4">
                        {comment.replies.map((reply) => (
                          <div key={reply.commentID} className="flex gap-3">
                            <Link href={reply.user?.userId ? `/profile/${reply.user.userId}` : "#"} onClick={(e) => !reply.user?.userId && e.preventDefault()}>
                              <Avatar className="h-7 w-7 shrink-0 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity">
                                <AvatarImage src={reply.user?.avatar || "/default-avatar.png"} />
                                <AvatarFallback className="bg-primary-blue text-white text-xs">
                                  {reply.user?.name?.[0] || "U"}
                                </AvatarFallback>
                              </Avatar>
                            </Link>
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2 mb-0.5">
                                <Link
                                  href={reply.user?.userId ? `/profile/${reply.user.userId}` : "#"}
                                  onClick={(e) => !reply.user?.userId && e.preventDefault()}
                                  className="text-xs font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                                >
                                  {reply.user?.name || "Unknown"}
                                </Link>
                                <span className="text-xs text-gray-400">
                                  {new Date(reply.createdAt).toLocaleDateString(undefined, {
                                    year: "numeric", month: "short", day: "numeric",
                                  })}
                                </span>
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed">{reply.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Divider between top-level comments */}
                <div className="border-b border-gray-50" />
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination className="mt-6">
                <PaginationContent>
                  {currentPage > 1 && (
                    <PaginationItem>
                      <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }} />
                    </PaginationItem>
                  )}
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5) {
                      if (currentPage >= 3) pageNum = currentPage - 3 + i;
                      if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                    }
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(pageNum); }} isActive={currentPage === pageNum}>
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  {currentPage < totalPages && (
                    <PaginationItem>
                      <PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }} />
                    </PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
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
