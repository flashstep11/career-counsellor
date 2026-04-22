"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Clock,
  Eye,
  Heart,
  Edit,
  Trash2,
  MoreVertical,
  Flag,
  BadgeCheck,
} from "lucide-react";
import RelatedBlogs from "@/components/blogs/related-blogs";
import { Skeleton } from "@/components/ui/skeleton";
import MarkdownViewer from "@/components/shared/markdown-viewer";
import { useParams, useRouter } from "next/navigation";
import { Blog } from "@/types";
import RandomImage from "@/components/shared/random-image";
import FollowButton from "@/components/experts/follow";
import ExpertHoverCard from "@/components/experts/expert-hover-card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import CommentsSection from "@/components/shared/comments-section";
import SystemShareButton from "@/components/shared/system-share-button";
import VideosCarousel from "@/components/shared/videos-carousel";
import ExpertsCarousel from "@/components/shared/experts-carousel";

// Loading skeleton component
const BlogSkeleton = () => (
  <div className="container mx-auto px-4 py-12">
    <div className="space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-12 w-3/4" />
      <Skeleton className="h-64 w-full" />
    </div>
  </div>
);

export default function BlogDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const params = useParams();

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const response = await fetch(`/api/blogs/${params.id}`);
        if (!response.ok) {
          throw new Error("Blog not found");
        }
        const data = await response.json();
        setBlog(data);
        setLikeCount(data.likes || 0);

        // Increment view count
        incrementViewCount(data.blogID);

        // Track in user history (DB-backed, per-user)
        const _token = localStorage.getItem("token");
        if (_token && data?.heading) {
          fetch("/api/activity/view", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${_token}` },
            body: JSON.stringify({
              type: "blog",
              itemId: data.blogID || String(params.id),
              title: data.heading,
            }),
          }).catch(() => {});
        }

        // Check if user has liked this blog
        if (user) {
          checkIfLiked(data.blogID);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch blog");
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [params.id, user]);

  // Increment view count when blog is loaded
  const incrementViewCount = async (blogId: string) => {
    try {
      await fetch(`/api/blogs/${blogId}/view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Error incrementing view count:", error);
    }
  };

  // Check if current user has liked this blog
  const checkIfLiked = async (blogId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/blogs/${blogId}/like/check`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.liked);
      }
    } catch (error) {
      console.error("Error checking like status:", error);
    }
  };

  // Handle like/unlike
  const handleLike = async () => {
    if (!blog || !user) {
      toast.error("You must be logged in to like blogs");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/blogs/${blog.blogID}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to update like");
      }

      const data = await response.json();
      setIsLiked(!isLiked);
      setLikeCount(data.likes);
    } catch (error) {
      toast.error("Failed to update like");
      console.error("Error liking blog:", error);
    }
  };

  // Check if the current user is the author of the blog or an admin
  const isOwner = user && blog && (user._id === blog.userID || user.isAdmin);
  const canReport = !!user && !!blog && !isOwner;

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blog || !reportReason.trim()) return;
    setReportSubmitting(true);
    try {
      await fetch(`/api/blogs/${blog.blogID}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason.trim() }),
      });
      setReportDone(true);
      toast.success("Report submitted");
    } catch {
      toast.error("Failed to submit report");
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleEdit = () => {
    router.push(`/blogs/${blog?.blogID}/edit`);
  };

  const handleDelete = async () => {
    if (!blog) return;

    try {
      setIsDeleting(true);

      // Store blog data before deletion for potential undo
      const blogToDelete = { ...blog };

      // Show toast with undo option
      toast("Blog deleted", {
        description: "Your blog has been removed",
        action: {
          label: "Undo",
          onClick: () => {
            setIsDeleting(false);
            toast.success("Blog restored successfully");
          },
        },
        duration: 5000, // 5 seconds before permanent deletion
        onAutoClose: async () => {
          // Permanently delete the blog after toast disappears
          try {
            const token = localStorage.getItem("token");
            const response = await fetch(`/api/blogs/${blog.blogID}`, {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            });

            if (!response.ok) {
              throw new Error("Failed to delete blog");
            }

            router.push("/blogs");
          } catch (error) {
            console.error("Error deleting blog:", error);
            toast.error("Failed to delete blog. Please try again.");
            setIsDeleting(false);
          }
        },
      });
    } catch (error) {
      console.error("Error deleting blog:", error);
      toast.error("Failed to delete blog. Please try again.");
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <BlogSkeleton />;
  }

  if (error || !blog) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Error</h2>
          <p className="text-gray-600 mt-2">{error || "Blog not found"}</p>
          <Button className="mt-4" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const authorName = [
    blog.author.firstName,
    blog.author.middleName,
    blog.author.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-[50vh]">
        <RandomImage
          alt={blog.heading}
          fill
          className="absolute inset-0 object-cover"
        ></RandomImage>
        <div className="absolute inset-0 bg-black/50 flex items-center">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              {blog.refType !== "NA" && (
                <div className="flex items-center space-x-2 mb-4">
                  <span className="bg-white/90 text-primary-blue px-3 py-1 rounded-full text-sm font-medium">
                    {blog.refType}
                  </span>
                </div>
              )}
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {blog.heading}
              </h1>
              <div className="flex items-center space-x-4 text-white/90">
                <div className="flex items-center space-x-2">
                  <CalendarDays className="h-5 w-5" />
                  <span>{formatDate(blog.createdAt)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>
                    {new Date(blog.createdAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Main Content */}
          <div className="lg:w-2/3">
            <article className="prose max-w-none">
              <MarkdownViewer content={blog.body}></MarkdownViewer>
            </article>

            {/* Actions */}
            <div className="flex items-center justify-between mt-8 py-6 border-t border-b relative">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  className={`space-x-2 ${isLiked ? "text-primary-blue border-primary-blue" : ""
                    }`}
                  onClick={handleLike}
                >
                  <Heart
                    className={`h-4 w-4 ${isLiked ? "fill-primary-blue" : ""}`}
                  />
                  <span>{likeCount > 0 ? likeCount : "Like"}</span>
                </Button>

                <SystemShareButton
                  url={
                    typeof window !== "undefined" ? window.location.href : ""
                  }
                  title={blog.heading}
                  text="Read the following blog:"
                />
                {isOwner && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:text-primary-blue hover:border-primary-blue transition-colors"
                      onClick={handleEdit}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete your blog from the platform.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isDeleting}
                          >
                            {isDeleting ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
              {canReport && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowOverflowMenu((v) => !v);
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                    aria-label="Blog options"
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
              <div className="flex items-center space-x-2 text-gray-500">
                <Eye className="h-4 w-4" />
                <span className="text-sm">{blog.views}</span>
              </div>
            </div>

            {/* Comments */}
            <div className="mt-12">
              <CommentsSection pageId={blog.blogID} type="blog" />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:w-1/3">
            {/* Author Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
              <div className="flex items-center space-x-4 mb-4">
                <Link href={`/profile/${blog.userID}`}>
                  <Avatar className="h-12 w-12 ring-2 ring-primary-lavender cursor-pointer hover:opacity-80 transition-opacity">
                    <AvatarFallback className="bg-primary-blue text-white">
                      {authorName[0]}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  {blog.expertId ? (
                    <ExpertHoverCard expertId={blog.expertId}>
                      <Link href={`/profile/${blog.userID}`} className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
                        {authorName}{" "}
                      </Link>
                    </ExpertHoverCard>
                  ) : (
                    <Link href={`/profile/${blog.userID}`} className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
                      {authorName}
                    </Link>
                  )}
                  <p className="text-sm text-gray-500">Content Contributor</p>
                </div>
              </div>
              {blog.userID && (
                <FollowButton
                  targetUserId={blog.userID}
                  className="w-full mt-2"
                />
              )}
            </div>

            {/* Related Blogs */}
            <RelatedBlogs currentBlogId={blog.blogID} category={blog.refType} />
          </div>
        </div>

        {/* ── Bottom Carousels ─────────────────────────────────────── */}
        <div className="container mx-auto px-4">
          <section className="mt-12 space-y-10 border-t border-gray-100 pt-8 pb-12">
            <VideosCarousel
              title="Related Videos"
              refType={blog.refType !== "NA" ? blog.refType : undefined}
              typeId={blog.typeId}
            />
            <ExpertsCarousel title="Suggested Experts" />
          </section>
        </div>
      </div>

      {/* Report modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowReport(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 max-w-full" onClick={(e) => e.stopPropagation()}>
            {reportDone ? (
              <div className="text-center py-4">
                <BadgeCheck className="h-10 w-10 text-green-500 mx-auto mb-2" />
                <p className="font-semibold text-gray-800">Report submitted</p>
                <p className="text-sm text-gray-400 mt-1">Our team will review it shortly.</p>
                <button
                  onClick={() => { setShowReport(false); setReportDone(false); setReportReason(""); }}
                  className="mt-4 text-sm text-indigo-600 hover:underline"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleReport}>
                <h3 className="font-bold text-gray-800 mb-1">Report Blog</h3>
                <p className="text-xs text-gray-400 mb-3">Tell us what’s wrong with this blog.</p>
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
    </div>
  );
}
