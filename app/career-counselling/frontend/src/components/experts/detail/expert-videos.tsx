"use client";

import { useState, useEffect } from "react";
import RandomImage from "@/components/shared/random-image";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Clock, Eye } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface Video {
  videoID: string;
  title: string;
  description: string;
  url: string;
  thumbnail?: string;
  duration: string;
  views: number;
  createdAt: string;
  expertID: string;
  featured: boolean;
}

interface ExpertVideosProps {
  expertId: string | number;
}

export default function ExpertVideos({ expertId }: ExpertVideosProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(4);

  useEffect(() => {
    const fetchExpertVideos = async () => {
      setLoading(true);
      setError(null);

      try {
        // Update API call to support pagination
        const response = await axios.get(
          `/api/experts/${expertId}/videos?page=${currentPage}&limit=${itemsPerPage}`
        );

        // Check if response has pagination structure, otherwise handle as array
        const videosData = response.data.videos || response.data;
        setVideos(videosData);

        // Set total pages if available in response
        if (response.data.totalPages) {
          setTotalPages(response.data.totalPages);
        } else if (response.data.total) {
          setTotalPages(Math.ceil(response.data.total / itemsPerPage));
        } else {
          // If server doesn't support pagination yet, calculate pages from returned data
          setTotalPages(
            Math.max(1, Math.ceil(videosData.length / itemsPerPage))
          );
        }
      } catch (err) {
        console.error("Error fetching expert videos:", err);
        setError("Failed to load videos. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (expertId) {
      fetchExpertVideos();
    }
  }, [expertId, currentPage, itemsPerPage]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading && videos.length === 0) {
    return <div className="py-4 text-center">Loading videos...</div>;
  }

  if (error) {
    return <div className="py-4 text-center text-red-600">{error}</div>;
  }

  if (videos.length === 0 && !loading) {
    return (
      <div className="py-4 text-center text-gray-500">
        No videos published yet.
      </div>
    );
  }

  // Helper function to format views count
  const formatViews = (views: number): string => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    } else {
      return views.toString();
    }
  };

  // Helper function to calculate time since upload
  const getTimeSince = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 1) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)} weeks ago`;
    } else if (diffDays < 365) {
      return `${Math.floor(diffDays / 30)} months ago`;
    } else {
      return `${Math.floor(diffDays / 365)} years ago`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
        {videos.map((video) => (
          <Card key={video.videoID} className="overflow-hidden">
            <Link href={`/videos/${video.videoID}`}>
              <div className="relative h-48 group">
                <RandomImage
                  alt={video.title}
                  fill
                  className="object-cover"
                ></RandomImage>
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors flex items-center justify-center">
                  <Play className="h-12 w-12 text-white" />
                </div>
                {video.featured && (
                  <div className="absolute top-2 right-2 bg-primary-blue text-white px-2 py-1 rounded text-sm">
                    Featured
                  </div>
                )}
                <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                  {video.duration}
                </div>
              </div>
            </Link>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">{video.title}</h3>
              <div className="flex items-center text-sm text-gray-500 space-x-4">
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{formatViews(video.views)} views</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{getTimeSince(video.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Pagination UI */}
      {totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            {/* Previous Button */}
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) handlePageChange(currentPage - 1);
                }}
                className={
                  currentPage <= 1 ? "opacity-50 pointer-events-none" : ""
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

            {/* Next Button */}
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
      {loading && videos.length > 0 && (
        <div className="py-4 text-center text-gray-500">
          Loading more videos...
        </div>
      )}
    </div>
  );
}
