"use client";

import Link from "next/link";
import { Clock, Eye, BookOpen, ChevronRight } from "lucide-react";
import RandomImage from "../shared/random-image";
import { Blog } from "@/types";
import { useEffect, useState } from "react";
import axios from "axios";

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

      {relatedBlogs.map((blog, idx) => (
        <Link key={blog.blogID} href={`/blogs/${blog.blogID}`}>
          <div
            className={`flex gap-3 py-3 hover:bg-gray-50 rounded-xl px-2 transition-colors group ${
              idx < relatedBlogs.length - 1 ? "border-b border-gray-100" : ""
            }`}
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
      ))}
    </div>
  );
}
