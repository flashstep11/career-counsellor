"use client";

import Link from "next/link";
import { Clock, Eye, BookOpen, ChevronRight, MoreVertical, Flag, BadgeCheck } from "lucide-react";
import RandomImage from "../shared/random-image";
import { Blog } from "@/types";
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface RelatedBlogsProps {
  currentBlogId: string;
  refType: string;
  typeId?: string;
}

export default function RelatedBlogs({
  currentBlogId,
  refType,
  typeId,
}: RelatedBlogsProps) {
  const [relatedBlogs, setRelatedBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [reportingBlog, setReportingBlog] = useState<Blog | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingBlog || !reportReason.trim()) return;
    setReportSubmitting(true);
    try {
      await axios.post(`/api/blogs/${reportingBlog.blogID}/report`, {
        reason: reportReason.trim(),
      });
      setReportDone(true);
      toast.success("Report submitted");
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || "Failed to submit report");
    } finally {
      setReportSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchRelatedBlogs = async () => {
      try {
        setIsLoading(true);
        const params: any = { limit: 5, refType: refType };
        if (typeId && refType !== "NA") params.typeId = typeId;

        const response = await axios.get("/api/blogs", { params });
        const filteredBlogs = response.data.blogs.filter(
          (blog: Blog) => blog.blogID !== currentBlogId
        );
        setRelatedBlogs(filteredBlogs.slice(0, 5));
      } catch (error) {
        console.error("Error fetching related blogs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentBlogId) fetchRelatedBlogs();
  }, [currentBlogId, refType, typeId]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b-2 border-gray-900">
          <BookOpen className="h-5 w-5 text-gray-800" />
          <h3 className="font-bold text-lg text-gray-900">Related Blogs</h3>
        </div>
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="flex gap-3 py-2 animate-pulse">
            <div className="flex-none w-36 h-20 rounded-xl bg-gray-100" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3.5 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (relatedBlogs.length === 0) return null;

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-gray-900">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-gray-800" />
          <h3 className="font-bold text-lg text-gray-900">Related Blogs</h3>
        </div>
        <Link
          href="/blogs"
          className="flex items-center gap-0.5 text-xs text-blue-600 hover:underline font-medium"
        >
          See all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {relatedBlogs.map((blog, idx) => {
        const canReport = isAuthenticated && user?._id !== blog.userID;
        return (
          <div
            key={blog.blogID}
            className={`relative ${
              idx < relatedBlogs.length - 1 ? "border-b border-gray-100" : ""
            }`}
          >
            {canReport && (
              <div className="absolute top-3 right-2 z-10">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenMenuId((v) => (v === blog.blogID ? null : blog.blogID));
                  }}
                  className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-gray-500 hover:text-gray-700 shadow-sm"
                  aria-label="Blog options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {openMenuId === blog.blogID && (
                  <div
                    className="absolute right-0 mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[140px]"
                    onMouseLeave={() => setOpenMenuId(null)}
                  >
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenMenuId(null);
                        setReportingBlog(blog);
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

            <Link href={`/blogs/${blog.blogID}`} className="block">
              <div
                className={`flex gap-3 py-3 hover:bg-gray-50 rounded-xl px-2 transition-colors group`}
              >
                {/* Thumbnail */}
                <div className="relative flex-none w-36 h-20 rounded-xl overflow-hidden bg-gray-100">
                  <RandomImage
                    alt={blog.heading}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>

                {/* Metadata */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <h4 className="text-sm font-semibold line-clamp-2 leading-snug text-gray-900 group-hover:text-blue-700 transition-colors">
                    {blog.heading}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {(blog.views || 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.max(1, Math.ceil(blog.body.split(/\s+/).length / 200))} min
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        );
      })}

      {/* Report modal */}
      {reportingBlog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setReportingBlog(null); setReportDone(false); setReportReason(""); }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 max-w-full" onClick={(e) => e.stopPropagation()}>
            {reportDone ? (
              <div className="text-center py-4">
                <BadgeCheck className="h-10 w-10 text-green-500 mx-auto mb-2" />
                <p className="font-semibold text-gray-800">Report submitted</p>
                <p className="text-sm text-gray-400 mt-1">Our team will review it shortly.</p>
                <button
                  onClick={() => { setReportingBlog(null); setReportDone(false); setReportReason(""); }}
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
                  <button type="button" onClick={() => { setReportingBlog(null); setReportReason(""); }} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
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
