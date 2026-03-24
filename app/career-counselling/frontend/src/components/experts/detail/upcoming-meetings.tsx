"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, RefreshCw, Ban } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface Meeting {
  _id: string;
  expertId: string;
  userId: string;
  expertName: string;
  userName: string;
  startTime: string;
  endTime: string;
  status: string;
  amount: number;
  isPaid: boolean;
  createdAt: string;
}

interface RefundStatus {
  meetingId: string;
  status: string;
}

interface UpcomingMeetingsProps {
  expertId: string;
}

export default function UpcomingMeetings({ expertId }: UpcomingMeetingsProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refundRequests, setRefundRequests] = useState<Record<string, string>>(
    {}
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(3);

  useEffect(() => {
    if (expertId) {
      fetchMeetings();
      fetchRefundRequests();
    }
  }, [expertId]);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(`/api/meetings/expert/${expertId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const fetchedMeetings = response.data || [];
      setAllMeetings(fetchedMeetings);

      // Calculate total pages
      setTotalPages(
        Math.max(1, Math.ceil(fetchedMeetings.length / itemsPerPage))
      );

      // Set current page meetings
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      setMeetings(fetchedMeetings.slice(startIndex, endIndex));
    } catch (error) {
      console.error("Error fetching meetings:", error);
      toast.error("Failed to load upcoming meetings");
    } finally {
      setLoading(false);
    }
  };

  const fetchRefundRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get("/api/refunds/expert", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Create a map of meetingId -> status
      const refundMap: Record<string, string> = {};
      response.data.forEach((refund: RefundStatus) => {
        refundMap[refund.meetingId] = refund.status;
      });

      setRefundRequests(refundMap);
    } catch (error) {
      console.error("Error fetching refund requests:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Update meetings when page changes
  useEffect(() => {
    if (allMeetings.length > 0) {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      setMeetings(allMeetings.slice(startIndex, endIndex));
    }
  }, [currentPage, allMeetings, itemsPerPage]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Check if a meeting has a refund request
  const getRefundStatus = (meetingId: string) => {
    return refundRequests[meetingId] || null;
  };

  // Render text for earned amount based on refund status
  const renderEarningText = (meeting: Meeting) => {
    const refundStatus = getRefundStatus(meeting._id);

    if (refundStatus === "approved") {
      return (
        <div className="text-sm">
          <span className="text-muted-foreground">Earned:</span>{" "}
          <span className="line-through text-red-500 font-medium">
            ₹{meeting.amount}
          </span>{" "}
          <span className="text-red-500 text-xs">(Refunded)</span>
        </div>
      );
    } else if (refundStatus === "pending") {
      return (
        <div className="text-sm">
          <span className="text-muted-foreground">Earned:</span>{" "}
          <span className="font-medium text-amber-600">₹{meeting.amount}</span>{" "}
          <span className="text-amber-600 text-xs">(Refund Pending)</span>
        </div>
      );
    } else {
      return (
        <div className="text-sm">
          <span className="text-muted-foreground">Earned:</span>{" "}
          <span className="font-medium">₹{meeting.amount}</span>
        </div>
      );
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3 flex flex-row justify-between">
        <CardTitle className="text-lg font-medium">Upcoming Meetings</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => {
            fetchMeetings();
            fetchRefundRequests();
          }}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : allMeetings.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No upcoming meetings scheduled
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <div
                  key={meeting._id}
                  className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${getRefundStatus(meeting._id) === "approved"
                      ? "border-red-200 bg-red-50"
                      : ""
                    }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      <div>
                        <h4 className="font-medium">{meeting.userName}</h4>
                        <p className="text-sm text-muted-foreground">User</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRefundStatus(meeting._id) === "approved" && (
                        <Badge
                          variant="outline"
                          className="bg-red-50 text-red-700 border-red-300"
                        >
                          <Ban className="h-3 w-3 mr-1" /> Refunded
                        </Badge>
                      )}
                      {getRefundStatus(meeting._id) === "pending" && (
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 text-yellow-700 border-yellow-300"
                        >
                          Refund Pending
                        </Badge>
                      )}
                      <Badge
                        variant={
                          meeting.status === "completed" ? "outline" : "default"
                        }
                        className={
                          meeting.status === "completed"
                            ? "bg-green-50 text-green-700 border-green-300"
                            : undefined
                        }
                      >
                        {meeting.status.charAt(0).toUpperCase() +
                          meeting.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground space-x-4 mt-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(meeting.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatTime(meeting.startTime)} -{" "}
                        {formatTime(meeting.endTime)}
                      </span>
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between items-center">
                    {renderEarningText(meeting)}
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-8">
                        View calendar
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 bg-blue-600 hover:bg-blue-700"
                        onClick={() => window.location.href = `/meeting/${meeting._id}`}
                      >
                        Join Video Call
                      </Button>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
