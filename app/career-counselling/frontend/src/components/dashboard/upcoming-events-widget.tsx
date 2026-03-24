"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, MapPin, User, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { format } from "date-fns";

interface Meeting {
  id: string;
  expertName: string;
  topic: string;
  date: string;
  time: string;
  platform: string;
  color: string;
}

export function UpcomingEventsWidget({ transparent = false }: { transparent?: boolean }) {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const { user } = useAuth();

  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const response = await axios.get(`${apiUrl}/api/meetings/my`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const fetchedMeetings = response.data.meetings || [];
        const now = new Date();

        // Filter upcoming, sort by closest first, take top 3
        const upcoming = fetchedMeetings
          .filter((m: any) => new Date(m.endTime) > now && m.status !== 'cancelled')
          .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
          .slice(0, 3)
          .map((m: any, idx: number) => {
            const mDate = new Date(m.startTime);
            const colors = [
              "from-blue-500 to-cyan-500",
              "from-purple-500 to-pink-500",
              "from-green-500 to-emerald-500"
            ];
            return {
              id: m._id || m.id,
              expertName: m.expertName || "Expert",
              topic: "Career Guidance Session",
              date: format(mDate, 'MMM d'),
              time: format(mDate, 'p'),
              platform: m.meetingLink ? "Jitsi Meet" : "Pending link",
              color: colors[idx % colors.length],
            };
          });

        setMeetings(upcoming);
      } catch (error) {
        console.error("Failed to fetch upcoming widget meetings", error);
      }
    };

    if (user) fetchUpcomingEvents();
  }, [user]);

  if (meetings.length === 0) {
    const empty = (
      <div className="text-center py-4 min-h-[160px] flex flex-col justify-center items-center">
        <Calendar className="h-10 w-10 text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">No upcoming meetings</p>
      </div>
    );
    return transparent ? empty : (
      <Card className="bg-white rounded-xl shadow-sm border-0">
        <CardContent className="p-4">{empty}</CardContent>
      </Card>
    );
  }

  const nextMeeting = meetings[0];

  const inner = (
    <div className="p-0">
      {/* Next Meeting - Featured */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-indigo-600" />
          <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
            Upcoming Meetings
          </h3>
        </div>

        {/* Main Meeting Card */}
        <div
          className={`relative rounded-lg overflow-hidden bg-gradient-to-br ${nextMeeting.color} p-3 mb-2 cursor-pointer hover:shadow-lg transition-shadow`}
          onClick={() => router.push("/meetings")}
        >
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-sm font-bold text-white leading-tight pr-2">
                {nextMeeting.topic}
              </h4>
              <span className="px-2 py-0.5 bg-white/30 backdrop-blur-sm rounded text-xs font-semibold text-white uppercase">
                Meeting
              </span>
            </div>

            <div className="space-y-1 text-white/90 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-medium">{nextMeeting.date} at {nextMeeting.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                <span>{nextMeeting.platform}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                <span>with {nextMeeting.expertName}</span>
              </div>
            </div>
          </div>

          {/* Decorative circle */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full" />
        </div>
      </div>

      {/* Other Meetings - Compact List */}
      {meetings.length > 1 && (
        <div className="space-y-1.5">
          {meetings.slice(1, 2).map((meeting) => (
            <div
              key={meeting.id}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors group ${transparent ? "hover:bg-white/20" : "hover:bg-gray-50"}`}
              onClick={() => router.push("/meetings")}
            >
              <div className={`flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br ${meeting.color} flex items-center justify-center shadow-sm`}>
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate transition-colors group-hover:text-blue-600 ${transparent ? "text-gray-800" : "text-gray-900"}`}>
                  {meeting.topic}
                </p>
                <p className="text-xs text-gray-500">
                  {meeting.date} • {meeting.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View All Button */}
      {meetings.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/meetings")}
          className={`w-full mt-2 text-xs gap-1 h-7 ${transparent
            ? "text-gray-700 hover:text-blue-700 hover:bg-white/30"
            : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
            }`}
        >
          View all meetings
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );

  return transparent ? inner : (
    <Card className="bg-white rounded-xl shadow-sm border-0 overflow-hidden">
      <CardContent className="p-4">{inner}</CardContent>
    </Card>
  );
}
