"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { format } from "date-fns";
import { Calendar, Clock, Search, Users, ExternalLink, RefreshCw } from "lucide-react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Define the shape of our Meeting object based on backend model
interface Meeting {
    _id: string; // The ID from backend usually maps to _id
    id?: string;
    expertId: string;
    userId: string;
    startTime: string;
    endTime: string;
    status: string;
    meetingLink?: string;
    isPaid: boolean;
    amount: number;
}

export default function MeetingsDashboard() {
    const { user, isAuthenticated } = useAuth();
    const router = useRouter();

    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isAuthenticated && user) {
            fetchMeetings();
        }
    }, [isAuthenticated, user]);

    const fetchMeetings = async () => {
        setLoading(true);
        setError(null);
        try {
            // Use existing backend endpoint
            const token = localStorage.getItem("token");
            const apiUrl = "";
            const response = await axios.get(`${apiUrl}/api/meetings/my`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const fetchedMeetings = response.data.meetings || [];
            setMeetings(Array.isArray(fetchedMeetings) ? fetchedMeetings : []);
        } catch (err: any) {
            console.error("Failed to fetch meetings:", err);
            setError("Failed to load your meetings. Please try again later.");
            // Fallback to empty array on error so UI doesn't crash completely
            setMeetings([]);
        } finally {
            setLoading(false);
        }
    };

    const now = new Date();

    // Filter for upcoming and past meetings
    const upcomingMeetings = meetings.filter((m) => new Date(m.endTime) > now)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const pastMeetings = meetings.filter((m) => new Date(m.endTime) <= now)
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()); // descending

    const MeetingCard = ({ meeting, isPast }: { meeting: Meeting, isPast: boolean }) => {
        const startDate = new Date(meeting.startTime);
        const endDate = new Date(meeting.endTime);

        // Status color mapping
        const getStatusColor = (status: string) => {
            switch (status?.toLowerCase()) {
                case 'scheduled': return 'bg-blue-100 text-blue-700';
                case 'completed': return 'bg-green-100 text-green-700';
                case 'cancelled': return 'bg-red-100 text-red-700';
                default: return 'bg-gray-100 text-gray-700';
            }
        };

        // Time-gating: allow joining only within 10 minutes before start
        const nowMs = now.getTime();
        const startMs = startDate.getTime();
        const minutesUntilStart = (startMs - nowMs) / (1000 * 60);
        const canJoin = !isPast && minutesUntilStart <= 10; // joinable 10 min before start

        // Human-readable countdown
        const getCountdown = () => {
            if (minutesUntilStart <= 0) return "Starting now";
            if (minutesUntilStart < 60) return `Starts in ${Math.ceil(minutesUntilStart)} min`;
            const hours = Math.floor(minutesUntilStart / 60);
            const mins = Math.ceil(minutesUntilStart % 60);
            if (hours < 24) return `Starts in ${hours}h ${mins > 0 ? `${mins}m` : ''}`;
            const days = Math.floor(hours / 24);
            return `Starts in ${days} day${days > 1 ? 's' : ''}`;
        };

        return (
            <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">

                        <div className="flex-1 space-y-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-1">Career Guidance Session</h3>
                                    <div className="flex items-center text-sm text-gray-500 gap-2">
                                        <Users className="h-4 w-4" />
                                        <span>Expert ID: {meeting.expertId?.slice(0, 8)}...</span>
                                    </div>
                                </div>
                                <Badge className={getStatusColor(meeting.status)} variant="secondary">
                                    {meeting.status ? meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1) : 'Scheduled'}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Calendar className="h-4 w-4 text-indigo-500" />
                                    <span>{format(startDate, 'PPP')}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Clock className="h-4 w-4 text-indigo-500" />
                                    <span>{format(startDate, 'p')} - {format(endDate, 'p')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions Column */}
                        {(!isPast || !user?.isExpert) && (
                            <div className="flex flex-col sm:items-end justify-center gap-2 border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-4 min-w-[160px]">
                                {isPast ? (
                                    !user?.isExpert && (
                                        <Button className="w-full" variant="outline" onClick={() => router.push(`/experts/${meeting.expertId}`)}>
                                            Book Again
                                        </Button>
                                    )
                                ) : canJoin ? (
                                    <Button className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push(`/meeting/${meeting._id || meeting.id}`)}>
                                        Join Meeting <ExternalLink className="h-4 w-4" />
                                    </Button>
                                ) : (
                                    <div className="w-full text-center space-y-1">
                                        <Button className="w-full gap-2" variant="outline" disabled>
                                            <Clock className="h-4 w-4" /> {getCountdown()}
                                        </Button>
                                        <p className="text-xs text-gray-400">Join opens 10 min before</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    const EmptyState = ({ type }: { type: 'upcoming' | 'past' }) => (
        <div className="text-center py-16 px-4 border-2 border-dashed border-gray-200 rounded-2xl bg-white/50">
            <div className="h-16 w-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
                No {type} meetings found
            </h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-6">
                {type === 'upcoming'
                    ? user?.isExpert
                        ? "You don't have any scheduled sessions right now."
                        : "You don't have any scheduled sessions with experts right now."
                    : user?.isExpert
                        ? "You haven't completed any sessions yet."
                        : "You haven't completed any expert sessions yet."}
            </p>
            {!user?.isExpert && (
                <Button
                    className="px-6 rounded-full bg-indigo-600 hover:bg-indigo-700 h-12 text-md"
                    onClick={() => router.push('/experts')}
                >
                    <Search className="h-4 w-4 mr-2" />
                    Find a Mentor
                </Button>
            )}
        </div>
    );

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Your Meetings</h1>
                            <p className="text-gray-500 mt-2 text-lg">Manage your upcoming and past expert sessions</p>
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                            {user?.isExpert && user.expertId && (
                                <Button
                                    onClick={() => router.push(`/experts/${user.expertId}`)}
                                    variant="default"
                                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto"
                                >
                                    <Calendar className="h-4 w-4" />
                                    Edit Schedule
                                </Button>
                            )}
                            <Button
                                onClick={fetchMeetings}
                                variant="outline"
                                className="gap-2 shrink-0 bg-white w-full sm:w-auto"
                                disabled={loading}
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 text-sm border border-red-100 flex items-center">
                            {error}
                        </div>
                    )}

                    <Tabs defaultValue="upcoming" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8 bg-white shadow-sm border border-gray-100 p-1 h-12 rounded-xl">
                            <TabsTrigger value="upcoming" className="rounded-lg text-base font-medium data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                                Upcoming ({upcomingMeetings.length})
                            </TabsTrigger>
                            <TabsTrigger value="past" className="rounded-lg text-base font-medium data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900">
                                Past ({pastMeetings.length})
                            </TabsTrigger>
                        </TabsList>

                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <Card key={i} className="overflow-hidden border-gray-100">
                                        <CardContent className="p-6">
                                            <div className="flex flex-col sm:flex-row gap-4">
                                                <div className="flex-1 space-y-3">
                                                    <Skeleton className="h-6 w-3/4 max-w-[300px]" />
                                                    <Skeleton className="h-4 w-1/2" />
                                                    <div className="flex gap-4 pt-2">
                                                        <Skeleton className="h-4 w-24" />
                                                        <Skeleton className="h-4 w-32" />
                                                    </div>
                                                </div>
                                                <Skeleton className="h-10 w-full sm:w-[140px] rounded-lg mt-auto" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <>
                                <TabsContent value="upcoming" className="space-y-4 outline-none focus:ring-0">
                                    {upcomingMeetings.length > 0 ? (
                                        upcomingMeetings.map((meeting) => (
                                            <MeetingCard key={meeting._id || meeting.id} meeting={meeting} isPast={false} />
                                        ))
                                    ) : (
                                        <EmptyState type="upcoming" />
                                    )}
                                </TabsContent>

                                <TabsContent value="past" className="space-y-4 outline-none focus:ring-0">
                                    {pastMeetings.length > 0 ? (
                                        pastMeetings.map((meeting) => (
                                            <MeetingCard key={meeting._id || meeting.id} meeting={meeting} isPast={true} />
                                        ))
                                    ) : (
                                        <EmptyState type="past" />
                                    )}
                                </TabsContent>
                            </>
                        )}
                    </Tabs>
                </div>
            </div>
        </ProtectedRoute>
    );
}
