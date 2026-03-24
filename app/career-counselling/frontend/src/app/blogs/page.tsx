"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { BlogCard } from "@/components/blogs/blog-card";
import BlogFilters from "@/components/blogs/blog-filters";
import FeaturedBlog from "@/components/blogs/featured-blog";
import RandomImage from "@/components/shared/random-image";
import { Blog } from "@/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TrendingUp, History, BookOpen, Play } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { SkeletonCardGrid } from "@/components/shared/loading-indicator";
import VideosCarousel from "@/components/shared/videos-carousel";
import ExpertsCarousel from "@/components/shared/experts-carousel";

export default function BlogsPage() {
  const [filters, setFilters] = useState({
    category: "all",
    college: "all",
    branch: "all",
    sortBy: "recent",
  });
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBlogs, setTotalBlogs] = useState(0);
  const ITEMS_PER_PAGE = 12;

  const [featuredBlog, setFeaturedBlog] = useState<Blog | null>(null);
  const [trendingBlogs, setTrendingBlogs] = useState<Blog[]>([]);
  const [lastViewedBlogs, setLastViewedBlogs] = useState<
    { blogID: string; heading: string; views: number; createdAt: string }[]
  >([]);

  // Reset filters function
  const resetFilters = () => {
    setFilters({
      category: "all",
      college: "all",
      branch: "all",
      sortBy: "recent",
    });
    setCurrentPage(1);
  };

  const fetchBlogs = useCallback(async () => {
    setLoading(true);

    try {
      // Prepare query parameters
      const params: any = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        sortBy: filters.sortBy || "recent",
      };

      // Add refType filter if category is selected
      if (filters.category && filters.category !== "all") {
        params.refType = filters.category;

        // Add typeId filter if college or branch is selected
        if (filters.category === "college" && filters.college && filters.college !== "all") {
          params.typeId = filters.college;
        } else if (filters.category === "collegebranch" && filters.branch && filters.branch !== "all") {
          params.typeId = filters.branch;
        }
      }

      const response = await axios.get("/api/blogs/", { params });

      // Handle both paginated and non-paginated responses
      if (response.data.blogs && typeof response.data.total !== "undefined") {
        // Paginated response
        setBlogs(response.data.blogs);
        setTotalBlogs(response.data.total);
        setTotalPages(Math.ceil(response.data.total / ITEMS_PER_PAGE));
      } else {
        // Non-paginated response (array of blogs)
        const newBlogs = Array.isArray(response.data) ? response.data : [];
        setBlogs(newBlogs);
        setTotalBlogs(newBlogs.length);
        setTotalPages(Math.ceil(newBlogs.length / ITEMS_PER_PAGE));
      }
    } catch (error) {
      console.error("Error fetching blogs:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, ITEMS_PER_PAGE]);

  const fetchTrendingBlogs = useCallback(async () => {
    try {
      const res = await axios.get("/api/blogs/", { params: { limit: 10, sortBy: "views" } });
      const data = res.data;
      const raw: Blog[] = Array.isArray(data) ? data : data.blogs ?? [];
      setTrendingBlogs(raw.slice(0, 10));
      if (raw.length > 0) setFeaturedBlog(raw[0]);
    } catch {
      // non-critical
    }
  }, []);

  // Load last viewed from DB on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("/api/activity/recent", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { type: string; itemId: string; title: string; viewedAt: string }[]) => {
        const blogs = data
          .filter((h) => h.type === "blog")
          .slice(0, 8)
          .map((h) => ({ blogID: h.itemId, heading: h.title, views: 0, createdAt: h.viewedAt }));
        setLastViewedBlogs(blogs);
      })
      .catch(() => {});
  }, []);

  // Initial load and when filters/page change
  useEffect(() => {
    fetchBlogs();
  }, [currentPage, filters, fetchBlogs]);

  useEffect(() => {
    fetchTrendingBlogs();
  }, [fetchTrendingBlogs]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="container mx-auto px-4 pt-8 pb-8">

      {/* ── Continue Reading (Last Viewed) ────────────────────────── */}
      {currentPage === 1 && lastViewedBlogs.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <History className="h-5 w-5 text-gray-500" />
            <h2 className="text-xl font-bold">Continue Reading</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {lastViewedBlogs.map((b) => (
              <Link
                key={b.blogID}
                href={`/blogs/${b.blogID}`}
                className="flex-none w-64 snap-start group"
              >
                <div className="relative h-36 rounded-2xl overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                  <RandomImage alt={b.heading} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Resume
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-xs font-semibold line-clamp-2 leading-snug">{b.heading}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Trending Blogs ─────────────────────────────────────────── */}
      {currentPage === 1 && trendingBlogs.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-bold">Trending Blogs</h2>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {trendingBlogs.map((blog, idx) => (
              <Link
                key={blog.blogID}
                href={`/blogs/${blog.blogID}`}
                className="flex-none w-72 snap-start group"
              >
                <div className="relative h-44 rounded-2xl overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                  <RandomImage alt={blog.heading} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  {/* Rank watermark */}
                  <div className="absolute top-3 left-3 text-4xl font-black text-white/20 leading-none select-none">#{idx + 1}</div>
                  {/* Badge */}
                  <div className="absolute top-3 right-3 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    🔥 Trending
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-sm font-semibold line-clamp-2 leading-snug mb-0.5">{blog.heading}</p>
                    <p className="text-white/60 text-xs">
                      {blog.author ? `${blog.author.firstName} ${blog.author.lastName}` : "Expert"} · {(blog.views ?? 0).toLocaleString()} views
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Browse All ─────────────────────────────────────────────── */}
      {currentPage === 1 && (
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="h-5 w-5 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-700">Browse All</h2>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-1/4 overflow-y-auto pr-2">
          <div className="pb-16 sticky top-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Filters</h2>
              <Button
                variant="default"
                size="sm"
                onClick={resetFilters}
                className="bg-black text-white hover:bg-gray-800 text-xs"
              >
                Reset All
              </Button>
            </div>
            <BlogFilters filters={filters} onChange={setFilters} />
          </div>
        </aside>

        <main className="lg:w-3/4 relative">
          {loading && blogs.length === 0 ? (
            <SkeletonCardGrid
              count={9}
              columns="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              className="py-4"
            />
          ) : (
            <>
              {/* Loading overlay for filter changes */}
              {loading && (
                <div className="absolute inset-0 flex justify-center items-center z-10 bg-white/80">
                  <div className="w-full">
                    <SkeletonCardGrid
                      count={9}
                      columns="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                      className="opacity-70"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {blogs.map((blog) => (
                  <BlogCard key={blog.blogID} blog={blog} />
                ))}
              </div>

              {blogs.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    No blogs found matching your filters.
                  </p>
                </div>
              )}

              {/* Pagination UI */}
              {totalPages > 1 && (
                <Pagination className="mt-8">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1)
                            handlePageChange(currentPage - 1);
                        }}
                        className={
                          currentPage <= 1
                            ? "opacity-50 pointer-events-none"
                            : ""
                        }
                      />
                    </PaginationItem>

                    {/* First page */}
                    {currentPage >= 3 && (
                      <PaginationItem>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(1);
                          }}
                        >
                          1
                        </PaginationLink>
                      </PaginationItem>
                    )}

                    {/* Ellipsis if not showing first page */}
                    {currentPage >= 3 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}

                    {/* Pages around current page */}
                    {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                      let pageNum = currentPage - 1 + i;
                      // Adjust if we're at the start
                      if (currentPage <= 2) {
                        pageNum = i + 1;
                      }
                      // Adjust if we're at the end
                      else if (currentPage >= totalPages - 1) {
                        pageNum = totalPages - 2 + i;
                      }

                      // Skip if page number is out of range
                      if (pageNum <= 0 || pageNum > totalPages) {
                        return null;
                      }

                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handlePageChange(pageNum);
                            }}
                            isActive={currentPage === pageNum}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }).filter(Boolean)}

                    {/* Ellipsis if not showing last page */}
                    {currentPage < totalPages - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}

                    {/* Last page */}
                    {totalPages > 3 && currentPage < totalPages - 1 && (
                      <PaginationItem>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(totalPages);
                          }}
                        >
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    )}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages)
                            handlePageChange(currentPage + 1);
                        }}
                        className={
                          currentPage >= totalPages
                            ? "opacity-50 pointer-events-none"
                            : ""
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Bottom Carousels ───────────────────────────────────────── */}
      <section className="mt-12 space-y-10 border-t border-gray-100 pt-8">
        <VideosCarousel title="Related Videos" />
        <ExpertsCarousel title="Related Experts" />
      </section>
    </div>
  );
}
