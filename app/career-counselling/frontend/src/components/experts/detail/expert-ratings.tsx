"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface Rating {
  id: string;
  expertId: string;
  userId: string;
  rating: number;
  comment?: string;
  isAnonymous?: boolean;
  createdAt: string;
  updatedAt: string;
  userDetails?: {
    name?: string;
    initials?: string;
  };
  userName?: string;
  userAvatar?: string | null;
}

interface ExpertRatingsProps {
  expertId: string;
  className?: string;
}

export default function ExpertRatings({
  expertId,
  className = "",
}: ExpertRatingsProps) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(5);

  useEffect(() => {
    const fetchRatings = async () => {
      setLoading(true);
      try {
        // Use the new endpoint that supports user information with anonymity
        const response = await fetch(
          `/api/experts/${expertId}/ratings/with-user-info?skip=${
            (currentPage - 1) * itemsPerPage
          }&limit=${itemsPerPage}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch ratings");
        }

        const data = await response.json();
        setRatings(data);

        // Set total pages based on response headers or rough calculation
        const totalCount = parseInt(
          response.headers.get("X-Total-Count") || "0"
        );
        if (totalCount) {
          setTotalPages(Math.ceil(totalCount / itemsPerPage));
        } else {
          // If no header, estimate based on if we got a full page or not
          setTotalPages(
            data.length <= itemsPerPage ? currentPage : currentPage + 1
          );
        }
      } catch (err) {
        console.error("Error fetching expert ratings:", err);
        setError("Failed to load ratings");
      } finally {
        setLoading(false);
      }
    };

    fetchRatings();
  }, [expertId, currentPage, itemsPerPage]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Get initials for avatar
  const getInitials = (name: string = "User") => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading && ratings.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-xl">Expert Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading ratings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-xl">Expert Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (ratings.length === 0 && !loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-xl">Expert Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No ratings available yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-xl">Expert Reviews</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {ratings.map((rating) => (
            <div
              key={rating.id}
              className="border-b border-gray-100 last:border-b-0 pb-6 last:pb-0"
            >
              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {rating.isAnonymous
                      ? "AN"
                      : rating.userName
                      ? getInitials(rating.userName)
                      : rating.userDetails?.initials ||
                        getInitials(rating.userDetails?.name || "User")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {rating.isAnonymous
                          ? "Anonymous User"
                          : rating.userName ||
                            rating.userDetails?.name ||
                            "User"}
                      </p>
                      <div className="flex items-center mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < rating.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(rating.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  {rating.comment && (
                    <p className="mt-3 text-gray-700">{rating.comment}</p>
                  )}
                </div>
              </div>
            </div>
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
        {loading && ratings.length > 0 && (
          <div className="py-4 text-center text-gray-500">
            Loading more reviews...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
