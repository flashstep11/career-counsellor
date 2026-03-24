"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MoreVertical,
  UserCircle,
  RefreshCw,
  FileQuestion,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { toast } from "sonner";
import { FileUploader } from "../file-uploader";
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

interface RefundFormData {
  meetingId: string;
  reason: string;
  file?: File | null;
}

export default function UpcomingMeetings() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refundRequestData, setRefundRequestData] = useState<RefundFormData>({
    meetingId: "",
    reason: "",
    file: null,
  });
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  const [refundRequests, setRefundRequests] = useState<Record<string, string>>(
    {}
  );

  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(3);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    if (user) {
      fetchMeetings();
      fetchRefundRequests();
    }
  }, [user]);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await axios.get(`${apiUrl}/api/meetings/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Fetched meetings:", response.data);

      const fetchedMeetings = response.data.meetings || [];
      setAllMeetings(fetchedMeetings);

      // Calculate total pages
      setTotalPages(
        Math.max(1, Math.ceil(fetchedMeetings.length / itemsPerPage))
      );

      // Set current page meetings
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      setMeetings(fetchedMeetings.slice(startIndex, endIndex));

      fetchRefundRequests(); // Fetch refund requests after fetching meetings
    } catch (error) {
      console.error("Error fetching meetings:", error);
      toast.error("Failed to load your meetings");
    } finally {
      setLoading(false);
    }
  };

  const fetchRefundRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get("/api/refunds/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Create a map of meetingId -> status
      const refundMap: Record<string, string> = {};
      response.data.forEach((refund: any) => {
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

  const handleRefundRequest = (meetingId: string) => {
    setRefundRequestData({
      meetingId,
      reason: "",
      file: null,
    });
    setIsRefundDialogOpen(true);
  };

  const handleSubmitRefund = async () => {
    if (!refundRequestData.reason.trim()) {
      toast.error("Please provide a reason for the refund request");
      return;
    }

    setIsSubmittingRefund(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      // Send as a string instead of JSON object - backend expects Form data
      const jsonString = JSON.stringify({
        meetingId: refundRequestData.meetingId,
        reason: refundRequestData.reason,
      });

      formData.append("refund_data", jsonString);

      if (refundRequestData.file) {
        formData.append("file", refundRequestData.file);
      }

      console.log("Sending refund request with data:", {
        meetingId: refundRequestData.meetingId,
        reason: refundRequestData.reason,
        hasFile: !!refundRequestData.file,
      });

      await axios.post("/api/refunds", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Refund request submitted successfully");
      setIsRefundDialogOpen(false);

      // Update refund requests status
      fetchRefundRequests();
    } catch (error) {
      console.error("Error submitting refund request:", error);
      toast.error("Failed to submit refund request");
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const getRefundStatus = (meetingId: string) => {
    return refundRequests[meetingId] || null;
  };

  const renderRefundBadge = (meetingId: string) => {
    const status = getRefundStatus(meetingId);
    if (!status) return null;

    let badgeVariant = "outline";
    let badgeText = "Refund requested";
    let badgeColor = "bg-gray-100 text-gray-700 border-gray-300";

    if (status === "pending") {
      badgeVariant = "outline";
      badgeText = "Refund pending";
      badgeColor = "bg-yellow-50 text-yellow-700 border-yellow-300";
    } else if (status === "approved") {
      badgeVariant = "outline";
      badgeText = "Refund approved";
      badgeColor = "bg-green-50 text-green-700 border-green-300";
    } else if (status === "denied") {
      badgeVariant = "outline";
      badgeText = "Refund denied";
      badgeColor = "bg-red-50 text-red-700 border-red-300";
    }

    return (
      <Badge variant="outline" className={`${badgeColor} ml-2`}>
        {badgeText}
      </Badge>
    );
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

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-3 flex flex-row justify-between">
        <div>
          <CardTitle className="text-xl font-semibold">Your Meetings</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={fetchMeetings}
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
            <p className="text-muted-foreground">No meetings scheduled yet</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => (window.location.href = "/experts")}
            >
              Find an expert
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <div
                  key={meeting._id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-5 w-5 text-primary" />
                      <div>
                        <h4 className="font-medium">{meeting.expertName}</h4>
                        <p className="text-sm text-muted-foreground">Expert</p>
                      </div>
                    </div>
                    <div className="flex items-center">
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
                      {renderRefundBadge(meeting._id)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 ml-2"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled>
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={Boolean(getRefundStatus(meeting._id))}
                            onClick={() => handleRefundRequest(meeting._id)}
                          >
                            Request refund
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                    <div className="text-sm">
                      <span className="text-muted-foreground">Payment:</span>{" "}
                      <span className="font-medium">₹{meeting.amount}</span>
                    </div>
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

      {/* Refund Request Dialog */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request a Refund</DialogTitle>
            <DialogDescription>
              Please provide a reason for your refund request. Our team will
              review it as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for refund</Label>
              <Textarea
                id="reason"
                placeholder="Please explain why you're requesting a refund..."
                value={refundRequestData.reason}
                onChange={(e) =>
                  setRefundRequestData({
                    ...refundRequestData,
                    reason: e.target.value,
                  })
                }
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">Supporting document (optional)</Label>
              <FileUploader
                onFileSelect={(file) =>
                  setRefundRequestData({
                    ...refundRequestData,
                    file,
                  })
                }
                accept=".pdf,.jpg,.jpeg,.png"
                maxSize={20971520} // 20MB
              />
              <p className="text-xs text-muted-foreground">
                Upload any document that supports your refund claim. Max size:
                20MB. Supported formats: PDF, JPG, PNG.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRefundDialogOpen(false)}
              disabled={isSubmittingRefund}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitRefund} disabled={isSubmittingRefund}>
              {isSubmittingRefund ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                "Submit Refund Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
