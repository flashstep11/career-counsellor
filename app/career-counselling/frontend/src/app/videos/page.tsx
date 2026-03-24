"use client";

import axios from "axios";
import { useEffect, useState, useCallback } from "react";
import VideoCard from "@/components/videos/video-card";
import VideoFilters from "@/components/videos/video-filters";
import FeaturedVideo from "@/components/videos/featured-video";
import RandomImage from "@/components/shared/random-image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Video } from "@/types";
import { TrendingUp, History, Play } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  SkeletonImage,
  SkeletonText,
  SkeletonCardGrid,
  SkeletonCircle
} from "@/components/shared/loading-indicator";
import BlogsCarousel from "@/components/shared/blogs-carousel";
import ExpertsCarousel from "@/components/shared/experts-carousel";

export default function VideosPage() {
  const [filters, setFilters] = useState({
    category: "",
    college: "",
    branch: "",
    sortBy: "recent",
  });
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(""); // State for user role

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(12); // Number of videos per page
  const [featuredVideo, setFeaturedVideo] = useState<Video | null>(null);

  // Trending and last-viewed
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [lastViewedVideos, setLastViewedVideos] = useState<
    { videoID: string; title: string; views: number; createdAt: string }[]
  >([]);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      // Construct query parameters based on filter selections
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy: filters.sortBy || "recent",
      };

      // Add category filter
      if (filters.category && filters.category !== "all") {
        params.category = filters.category;
      }

      // Add college filter if category is college
      if (filters.category === "college" && filters.college && filters.college !== "all") {
        params.typeId = filters.college;
        params.refType = "college";
      }

      // Add branch filter if category is collegebranch
      if (filters.category === "collegebranch" && filters.branch && filters.branch !== "all") {
        params.typeId = filters.branch;
        params.refType = "collegebranch";
      }

      const response = await axios.get("/api/videos", { params });

      // Handle both paginated and non-paginated responses
      if (response.data.videos && typeof response.data.total !== "undefined") {
        // Paginated response
        setVideos(response.data.videos);
        setTotalPages(Math.ceil(response.data.total / itemsPerPage));

        // Set featured video if on first page
        if (currentPage === 1 && response.data.videos.length > 0) {
          const featured =
            response.data.videos.find((v: Video) => v.featured) ||
            response.data.videos[0];
          setFeaturedVideo(featured);
        }
      } else {
        // Non-paginated response (array of videos)
        const allVideos = Array.isArray(response.data) ? response.data : [];

        // Find a featured video or use the first one
        const featured =
          allVideos.find((v: Video) => v.featured) ||
          (allVideos.length > 0 ? allVideos[0] : null);
        setFeaturedVideo(featured);

        // Filter out the featured video from the regular list if needed
        const regularVideos = featured
          ? allVideos.filter((v: Video) => v.videoID !== featured.videoID)
          : allVideos;

        // Apply client-side pagination if server doesn't support it
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedVideos = regularVideos.slice(
          startIndex,
          startIndex + itemsPerPage
        );

        setVideos(paginatedVideos);
        setTotalPages(Math.ceil(regularVideos.length / itemsPerPage));
      }
    } catch (error) {
      console.error("Failed to fetch videos", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, itemsPerPage]);

  const fetchTrendingVideos = useCallback(async () => {
    try {
      const res = await axios.get("/api/videos", {
        params: { limit: 8, sortBy: "views" },
      });
      const data = res.data;
      const raw: Video[] = Array.isArray(data)
        ? data
        : data.videos ?? [];
      setTrendingVideos(raw.slice(0, 8));
    } catch {
      // non-critical — skip silently
    }
  }, []);

  const fetchUserRole = useCallback(async () => {
    try {
      const response = await axios.get("/api/role", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setRole(response.data.role);
    } catch (error) {
      console.error("Failed to fetch user role", error);
    }
  }, []);

  // Load last viewed from DB on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("/api/activity/recent", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { type: string; itemId: string; title: string; viewedAt: string }[]) => {
        const videos = data
          .filter((h) => h.type === "video")
          .slice(0, 8)
          .map((h) => ({ videoID: h.itemId, title: h.title, views: 0, createdAt: h.viewedAt }));
        setLastViewedVideos(videos);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchVideos();
    fetchUserRole();
    fetchTrendingVideos();
  }, [currentPage, filters, itemsPerPage, fetchVideos, fetchUserRole, fetchTrendingVideos]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset filters function
  const resetFilters = () => {
    setFilters({
      category: "",
      college: "",
      branch: "",
      sortBy: "recent",
    });
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto px-4 pt-2 pb-8">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-3xl font-bold">Video Library</h1>
      </div>

      {/* Featured Video - only shown on first page and when videos are found */}
      {currentPage === 1 && featuredVideo && videos.length > 0 && (
        <div className="mb-8">
          <FeaturedVideo video={featuredVideo} />
        </div>
      )}

      {/* ── Last Viewed Videos ─────────────────────────────────────── */}
      {currentPage === 1 && lastViewedVideos.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <History className="h-5 w-5 text-gray-500" />
            <h2 className="text-xl font-bold">Continue Watching</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {lastViewedVideos.map((v) => (
              <Link
                key={v.videoID}
                href={`/videos/${v.videoID}`}
                className="flex-none w-64 snap-start group"
              >
                <div className="relative h-36 rounded-2xl overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                  <RandomImage alt={v.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-11 w-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                      <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                  {/* Resume pill */}
                  <div className="absolute top-2 left-2 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Resume
                  </div>
                  {/* Title */}
                  <div className="absolute bottom-2 left-3 right-3">
                    <p className="text-white text-xs font-semibold line-clamp-2 leading-snug">{v.title}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Trending / Most Viewed Videos ──────────────────────────── */}
      {currentPage === 1 && trendingVideos.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <h2 className="text-xl font-bold">Trending Now</h2>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {trendingVideos.map((video, idx) => (
              <Link
                key={video.videoID}
                href={`/videos/${video.videoID}`}
                className="flex-none w-72 snap-start group"
              >
                <div className="relative h-40 rounded-2xl overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                  <RandomImage alt={video.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  {/* Rank number */}
                  <div className="absolute top-3 left-3 text-4xl font-black text-white/20 leading-none select-none">
                    #{idx + 1}
                  </div>

                  {/* Play */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-11 w-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                      <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Trending badge */}
                  <div className="absolute top-3 right-3 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    🔥 Trending
                  </div>

                  {/* Bottom info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-sm font-semibold line-clamp-1 leading-snug mb-0.5">{video.title}</p>
                    <p className="text-white/60 text-xs">{(video.views ?? 0).toLocaleString()} views</p>
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
            {loading && videos.length === 0 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <SkeletonText className="h-5 w-24 mb-2" />
                  <div className="h-10 w-full rounded-md bg-gray-200 animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <SkeletonText className="h-5 w-32 mb-2" />
                  <div className="h-10 w-full rounded-md bg-gray-200 animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <SkeletonText className="h-5 w-28 mb-2" />
                  <div className="h-10 w-full rounded-md bg-gray-200 animate-pulse"></div>
                </div>
              </div>
            ) : (
              <VideoFilters filters={filters} onChange={setFilters} />
            )}
          </div>
        </aside>

        <main className="lg:w-3/4 relative">
          {loading && videos.length === 0 ? (
            <div className="space-y-8">
              {/* Featured video skeleton */}
              {currentPage === 1 && (
                <div className="mb-8">
                  <div className="rounded-lg overflow-hidden">
                    <SkeletonImage height="h-[500px]" className="w-full" />
                    <div className="p-4 space-y-4">
                      <SkeletonText className="h-8 w-3/4" />
                      <div className="flex items-center space-x-2">
                        <SkeletonCircle size="h-10 w-10" />
                        <SkeletonText className="h-4 w-32" />
                      </div>
                      <SkeletonText className="h-4 w-full" />
                      <SkeletonText className="h-4 w-5/6" />
                    </div>
                  </div>
                </div>
              )}

              {/* Video grid skeleton */}
              <SkeletonCardGrid
                count={9}
                columns="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              />

              {/* Pagination skeleton */}
              <div className="mt-8 flex justify-center">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-md bg-gray-200 animate-pulse"></div>
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="h-10 w-10 rounded-md bg-gray-200 animate-pulse flex items-center justify-center"></div>
                  ))}
                  <div className="h-10 w-10 rounded-md bg-gray-200 animate-pulse"></div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Loading overlay for filter changes */}
              {loading && (
                <div className="absolute inset-0 flex justify-center items-center z-10 bg-white/80">
                  <div className="w-full">
                    <SkeletonCardGrid
                      count={9}
                      columns="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                    />
                  </div>
                </div>
              )}

              {videos.length === 0 && !loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    No videos found matching your filters.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.map((video) => (
                    <VideoCard key={video.videoID} video={video} />
                  ))}
                </div>
              )}

              {/* Pagination UI */}
              {totalPages > 1 && (
                <Pagination className="mt-8">
                  <PaginationContent>
                    {currentPage > 1 && (
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(currentPage - 1);
                          }}
                        />
                      </PaginationItem>
                    )}

                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      // Simple pagination logic for showing relevant page numbers
                      let pageNum = i + 1;
                      if (totalPages > 5) {
                        if (currentPage >= 3) {
                          pageNum = currentPage - 3 + i;
                        }
                        // Ensure we don't go beyond total pages
                        if (pageNum > totalPages) {
                          pageNum = totalPages - (4 - i);
                        }
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
                    })}

                    {currentPage < totalPages && (
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(currentPage + 1);
                          }}
                        />
                      </PaginationItem>
                    )}
                  </PaginationContent>
                </Pagination>
              )}
          </>
          )}
        </main>
      </div>

      {/* ── Bottom Carousels: Related Blogs + Related Experts ──────── */}
      <section className="mt-16 space-y-10 border-t border-gray-100 pt-10">
        <BlogsCarousel title="Related Blogs" />
        <ExpertsCarousel title="Related Experts" />
      </section>
    </div>
  );
}
