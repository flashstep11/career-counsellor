"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, RefreshCw, Ban } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { toast } from "sonner";

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
  const PREVIEW_LIMIT = 3;

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

      const fetchedMeetings = response.data.meetings || [];
      const now = new Date();
      const upcomingMeetings = fetchedMeetings
        .filter((m: Meeting) => new Date(m.endTime) > now)
        .sort((a: Meeting, b: Meeting) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      setAllMeetings(upcomingMeetings);
      setMeetings(upcomingMeetings.slice(0, PREVIEW_LIMIT));
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
                          meeting.status === "completed" || meeting.status === "scheduled" ? "outline" : "default"
                        }
                        className={
                          meeting.status === "completed"
                            ? "bg-green-50 text-green-700 border-green-300"
                            : meeting.status === "scheduled" ? "bg-blue-50 text-blue-700 border-blue-300"
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

            {allMeetings.length > PREVIEW_LIMIT && (
              <div className="mt-4 rounded-md border bg-gray-50 px-4 py-3 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {PREVIEW_LIMIT} of {allMeetings.length} upcoming meetings.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (window.location.href = "/meetings?tab=upcoming")}
                >
                  View all upcoming
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
