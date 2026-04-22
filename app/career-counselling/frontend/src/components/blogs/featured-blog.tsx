"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Clock, Eye, Heart, MoreVertical, Flag, BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import RandomImage from "../shared/random-image";
import { Blog } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";

interface FeaturedBlogProps {
  blog: Blog;
}

export default function FeaturedBlog({ blog }: FeaturedBlogProps) {
  const { author } = blog;
  const authorName = `${author.firstName} ${author.middleName || ""} ${
    author.lastName
  }`.trim();
  const { user, isAuthenticated } = useAuth();
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const canReport = isAuthenticated && user?._id !== blog.userID;

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim()) return;
    setReportSubmitting(true);
    try {
      await axios.post(`/api/blogs/${blog.blogID}/report`, {
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

  return (
    <Card className="relative overflow-hidden">
      {canReport && (
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowOverflowMenu((v) => !v);
            }}
            className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-gray-500 hover:text-gray-700 shadow-sm"
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
      <Link href={`/blogs/${blog.blogID}`}>
        <div className="flex flex-col md:flex-row">
          <div className="relative h-64 md:h-auto md:w-1/2">
            <RandomImage
              alt={blog.heading}
              fill
              className="object-cover"
            ></RandomImage>
          </div>
          <CardContent className="flex-1 p-6 md:p-8">
            {blog.refType !== "NA" && (
              <div className="flex items-center space-x-2 mb-4">
                <span className="bg-primary-lavender text-primary-blue px-3 py-1 rounded-full text-sm">
                  {blog.refType}
                </span>
              </div>
            )}
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              {blog.heading}
            </h2>
            <p className="text-gray-600 mb-6 line-clamp-3">
              {blog.body.substring(0, 200)}...
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarFallback>{author.firstName[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{authorName}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(blog.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{blog.views || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Heart className="h-4 w-4" />
                  <span>{blog.likes || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{`${Math.max(
                    1,
                    Math.ceil(blog.body.split(/\s+/).length / 200)
                  )} min read`}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </Link>

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
    </Card>
  );
}
