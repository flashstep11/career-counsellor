"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Clock, ChevronRight, ChevronLeft, BookOpen } from "lucide-react";
import RandomImage from "./random-image";
import { Blog } from "@/types";
import axios from "axios";

interface BlogsCarouselProps {
  title?: string;
  refType?: string;
  typeId?: string;
  limit?: number;
}

export default function BlogsCarousel({
  title = "Related Blogs",
  refType,
  typeId,
  limit = 10,
}: BlogsCarouselProps) {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const params: Record<string, any> = { limit, sortBy: "views" };
        if (refType && refType !== "NA") params.refType = refType;
        if (typeId) params.typeId = typeId;
        const res = await axios.get("/api/blogs", { params });
        const data = res.data;
        const raw: Blog[] = Array.isArray(data) ? data : data.blogs ?? [];
        setBlogs(raw.slice(0, limit));
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, [refType, typeId, limit]);

  const formatTime = (createdAt: string) => {
    const diffDays = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-500" />
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex-none w-72 h-44 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (blogs.length === 0) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-500" />
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <Link
          href="/blogs"
          className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          See all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Cards */}
      <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {blogs.map((blog, i) => (
          <Link
            key={blog.blogID}
            href={`/blogs/${blog.blogID}`}
            className="flex-none w-72 snap-start group"
          >
            <div className="relative h-44 rounded-2xl overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
              {/* Background image */}
              <RandomImage
                alt={blog.heading}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              {/* Top badge */}
              <div className="absolute top-3 left-3">
                <span className="bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
                  Article
                </span>
              </div>

              {/* Bottom content */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="text-white text-sm font-semibold line-clamp-2 leading-snug mb-1.5">
                  {blog.heading}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-xs line-clamp-1">
                    {blog.author
                      ? `${blog.author.firstName} ${blog.author.lastName}`
                      : "Expert"}
                  </span>
                  <div className="flex items-center gap-2 text-white/70 text-xs flex-none">
                    <span className="flex items-center gap-0.5">
                      <Eye className="h-3 w-3" />
                      {(blog.views ?? 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {formatTime(blog.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
