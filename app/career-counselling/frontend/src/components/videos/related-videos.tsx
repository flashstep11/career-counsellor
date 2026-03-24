"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Eye, Play, ChevronRight, Video } from "lucide-react";
import RandomImage from "../shared/random-image";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface RelatedVideosProps {
  currentVideoId: string | number;
}

interface Video {
  videoID: string;
  title: string;
  thumbnail?: string;
  duration: string;
  views: number;
  expertID: string;
  expertName?: string;
  expertAvatar?: string;
}

export default function RelatedVideos({ currentVideoId }: RelatedVideosProps) {
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(5); // Number of related videos per page

  useEffect(() => {
    const fetchRelatedVideos = async () => {
      if (!currentVideoId) return;

      setLoading(true);
      try {
        const response = await fetch(
          `/api/videos/${currentVideoId}/related?page=${currentPage}&limit=${itemsPerPage}`
        );
        if (!response.ok) throw new Error("Failed to fetch related videos");

        const data = await response.json();

        // Handle both paginated and non-paginated responses
        const videosData = data.videos || data;
        setRelatedVideos(videosData);

        // Set total pages if available in response
        if (data.totalPages) {
          setTotalPages(data.totalPages);
        } else if (data.total) {
          setTotalPages(Math.ceil(data.total / itemsPerPage));
        } else {
          // If server doesn't support pagination yet, calculate pages from returned data
          setTotalPages(
            Math.max(1, Math.ceil(videosData.length / itemsPerPage))
          );
        }
      } catch (err) {
        console.error("Error fetching related videos:", err);
        setError("Failed to load related videos");
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedVideos();
  }, [currentVideoId, currentPage, itemsPerPage]);

  // Format views count similar to expert-videos.tsx
  const formatViews = (views: number): string => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    } else {
      return views.toString();
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading && relatedVideos.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b-2 border-gray-900">
          <Video className="h-5 w-5 text-gray-800" />
          <h3 className="font-bold text-lg text-gray-900">Similar Videos</h3>
        </div>
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="flex gap-3 py-2">
            <div className="flex-none w-36 h-20 rounded-xl bg-gray-100 animate-pulse" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3.5 bg-gray-100 rounded animate-pulse w-full" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 pb-3 border-b-2 border-gray-900">
          <Video className="h-5 w-5 text-gray-800" />
          <h3 className="font-bold text-lg text-gray-900">Similar Videos</h3>
        </div>
        <p className="text-sm text-red-500 py-2">{error}</p>
      </div>
    );
  }

  if (relatedVideos.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 pb-3 border-b-2 border-gray-900">
          <Video className="h-5 w-5 text-gray-800" />
          <h3 className="font-bold text-lg text-gray-900">Similar Videos</h3>
        </div>
        <p className="text-sm text-gray-500 py-2">No similar videos available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Panel header */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-gray-900">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-gray-800" />
          <h3 className="font-bold text-lg text-gray-900">Similar Videos</h3>
        </div>
        <Link
          href="/videos"
          className="flex items-center gap-0.5 text-xs text-blue-600 hover:underline font-medium"
        >
          See all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {relatedVideos.map((video, idx) => (
        <Link key={video.videoID} href={`/videos/${video.videoID}`}>
          <div
            className={`flex gap-3 py-3 hover:bg-gray-50 rounded-xl px-2 transition-colors group ${
              idx < relatedVideos.length - 1 ? "border-b border-gray-100" : ""
            }`}
          >
            {/* Thumbnail */}
            <div className="relative flex-none w-36 h-20 rounded-xl overflow-hidden bg-gray-100">
              <RandomImage
                alt={video.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {/* Play overlay — slightly visible always */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/40 transition-colors">
                <div className="bg-white/80 group-hover:bg-white rounded-full p-1.5 transition-colors">
                  <Play className="h-4 w-4 text-gray-900 fill-gray-900" />
                </div>
              </div>
              {video.duration && (
                <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-medium leading-tight">
                  {video.duration}
                </span>
              )}
            </div>

            {/* Metadata */}
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <h4 className="text-sm font-semibold line-clamp-2 leading-snug text-gray-900 group-hover:text-blue-700 transition-colors">
                {video.title}
              </h4>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1.5">
                <span className="line-clamp-1 font-medium">{video.expertName || "Expert"}</span>
                <span>·</span>
                <span className="flex items-center gap-0.5 flex-none">
                  <Eye className="h-3 w-3" />
                  {formatViews(video.views)}
                </span>
              </div>
            </div>
          </div>
        </Link>
      ))}
      {/* Pagination UI */}
      {totalPages > 1 && (
        <Pagination className="mt-4">
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

            {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
              // Simplified pagination for sidebar (showing fewer page numbers)
              let pageNum = i + 1;
              if (totalPages > 3) {
                if (currentPage > 2) {
                  pageNum = currentPage - 2 + i;
                }
                // Ensure we don't go beyond total pages
                if (pageNum > totalPages) {
                  pageNum = totalPages - (2 - i);
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
      {loading && relatedVideos.length > 0 && (
        <div className="text-xs text-center text-gray-400 py-1">
          Loading more…
        </div>
      )}
    </div>
  );
}
