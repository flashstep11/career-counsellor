"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  Eye,
  FileText,
  MessageSquare,
  Video,
  Calendar,
  DollarSign,
  Settings,
  Edit,
  Save,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  LineChart as LineChartIcon,
  Star,
  MoreHorizontal,
  Loader2,
  Pencil,
  FilePlus,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import type { Expert } from "@/types";
import ExpertPosts from "@/components/experts/detail/expert-posts";
import MarkdownViewer from "@/components/shared/markdown-viewer";
import UpcomingMeetings from "@/components/experts/detail/upcoming-meetings";
import { VideoManagement } from "@/components/experts/video-management";
import { BlogManagement } from "@/components/experts/blog-management";
import AvailabilitySettings from "@/components/experts/detail/availability-settings";

interface ExpertDashboardProps {
  expert: Expert;
  expertInitials: string;
}

interface Analytics {
  views: {
    profileViews: number;
    videoViews: number;
    blogReads: number;
    postViews: number;
    totalEngagement: number;
  };
  content: {
    videosCount: number;
    blogsCount: number;
    postsCount: number;
  };
  performance: {
    followersCount: number;
    ratings: {
      average: number;
      distribution: { rating: number; count: number }[];
    };
    meetings: {
      completed: number;
      upcoming: number;
      cancellationRate: number;
    };
    earnings: {
      total: number;
      thisMonth: number;
      previousMonth: number;
      growth: number;
    };
    monthlyViews: { month: string; views: number }[];
    contentEngagement: { type: string; count: number }[];
  };
}

interface EarningsSession {
  meetingId: string;
  studentName: string;
  startTime: string;
  status: string;
  baseCost: number;
  extensionEarnings: number;
  totalEarned: number;
}

interface EarningsData {
  totalEarnings: number;
  baseEarnings: number;
  extensionEarnings: number;
  thisMonth: number;
  lastMonth: number;
  chart: { month: string; fullMonth: string; base: number; extensions: number; total: number; sessions: number }[];
  sessions: EarningsSession[];
}

export default function ExpertDashboard({
  expert,
  expertInitials,
}: ExpertDashboardProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [postRefreshTrigger, setPostRefreshTrigger] = useState(0);
  const [profileForm, setProfileForm] = useState({
    firstName: expert.userDetails.firstName,
    lastName: expert.userDetails.lastName,
    bio: expert.bio,
    currentPosition: expert.currentPosition,
    organization: expert.organization,
    available: expert.available,
    meetingCost: expert.meetingCost,
  });

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28DFF"];

  const [blogContent, setBlogContent] = useState({
    heading: "",
    body: "",
  });
  const [blogActiveTab, setBlogActiveTab] = useState("write");
  const [isSubmittingBlog, setIsSubmittingBlog] = useState(false);
  const [blogError, setBlogError] = useState<string | null>(null);
  const [showBlogDialog, setShowBlogDialog] = useState(false);
  // Dedicated meeting settings (cost + availability) — editable without opening full profile edit
  const [meetingSettings, setMeetingSettings] = useState({
    meetingCost: expert.meetingCost,
    available: expert.available,
    sessionDurationMinutes: (expert as any).sessionDurationMinutes ?? 60,
  });
  const [isSavingMeetingSettings, setIsSavingMeetingSettings] = useState(false);

  // Earnings data from /api/meetings/my-earnings
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);

  const handleBlogSubmit = async () => {
    if (!blogContent.heading.trim() || !blogContent.body.trim()) {
      setBlogError("Blog title and content cannot be empty");
      return;
    }

    try {
      setIsSubmittingBlog(true);
      setBlogError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("You must be logged in to create a blog");
        return;
      }

      const response = await fetch("/api/blogs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          heading: blogContent.heading,
          body: blogContent.body,
          refType: "NA",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to create blog");
      }

      const data = await response.json();
      setBlogContent({ heading: "", body: "" });
      setBlogActiveTab("write");
      setShowBlogDialog(false);
      toast.success("Blog created successfully!");

      // Redirect to the blog page
      window.location.href = `/blogs/${data.blogID}`;
    } catch (err) {
      setBlogError(
        err instanceof Error
          ? err.message
          : "Failed to create blog. Please try again."
      );
    } finally {
      setIsSubmittingBlog(false);
    }
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("token");
        const response = await fetch(
          `/api/experts/${expert.expertID}/analytics`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) throw new Error("Failed to load analytics data");
        const data = await response.json();
        setAnalytics(data);

        // Fetch real earnings data
        try {
          const earningsRes = await fetch("/api/meetings/my-earnings", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (earningsRes.ok) {
            const ed = await earningsRes.json();
            setEarningsData(ed);
          }
        } catch {
          // earnings fetch failure is non-fatal
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
        toast.error("Failed to load analytics data. Please try again later.");
        // For development or fallback purposes only - in production this should be removed or handled differently
        setAnalytics({
          views: {
            profileViews: 0,
            videoViews: 0,
            blogReads: 0,
            postViews: 0,
            totalEngagement: 0,
          },
          content: {
            videosCount: 0,
            blogsCount: 0,
            postsCount: 0,
          },
          performance: {
            followersCount: 0,
            ratings: {
              average: expert.rating || 0,
              distribution: [
                { rating: 1, count: 0 },
                { rating: 2, count: 0 },
                { rating: 3, count: 0 },
                { rating: 4, count: 0 },
                { rating: 5, count: 0 },
              ],
            },
            meetings: {
              completed: 0,
              upcoming: 0,
              cancellationRate: 0,
            },
            earnings: {
              total: 0,
              thisMonth: 0,
              previousMonth: 0,
              growth: 0,
            },
            monthlyViews: [
              { month: "Jan", views: 0 },
              { month: "Feb", views: 0 },
              { month: "Mar", views: 0 },
              { month: "Apr", views: 0 },
              { month: "May", views: 0 },
              { month: "Jun", views: 0 },
            ],
            contentEngagement: [
              { type: "Videos", count: 0 },
              { type: "Blogs", count: 0 },
              { type: "Posts", count: 0 },
              { type: "Meetings", count: 0 },
            ],
          },
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [expert.expertID, expert.rating]);

  const handleSaveMeetingSettings = async () => {
    setIsSavingMeetingSettings(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/experts/${expert.expertID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(meetingSettings),
      });
      if (!response.ok) throw new Error("Failed to update meeting settings");
      toast.success("Meeting settings saved!");
      // Keep profile form in sync
      setProfileForm((prev) => ({
        ...prev,
        meetingCost: meetingSettings.meetingCost,
        available: meetingSettings.available,
      }));
    } catch {
      toast.error("Failed to save meeting settings. Please try again.");
    } finally {
      setIsSavingMeetingSettings(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/experts/${expert.expertID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileForm),
      });

      if (!response.ok) throw new Error("Failed to update profile");

      // Update was successful
      toast.success("Profile updated successfully!");
      setIsEditingProfile(false);

      // Force page refresh to show updated data
      window.location.reload();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !analytics) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header with consistent left margin - shifted upward */}
      <div className="flex justify-between items-center px-6 mt-8">
        <h2 className="text-4xl font-bold text-gray-900">Expert Dashboard</h2>
        {!isEditingProfile ? (
          <Button
            onClick={() => setIsEditingProfile(true)}
            variant="outline"
            className="gap-2"
          >
            <Pencil className="h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsEditingProfile(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} className="gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Profile Editing Section */}
      {isEditingProfile && (
        <Card className="mb-6 border-blue-200 shadow-md">
          <CardHeader>
            <CardTitle>Edit Your Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={profileForm.firstName}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      firstName: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={profileForm.lastName}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, lastName: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentPosition">Current Position</Label>
                <Input
                  id="currentPosition"
                  value={profileForm.currentPosition}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      currentPosition: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  value={profileForm.organization}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      organization: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meetingCost">
                  Session Cost (coins per hour)
                </Label>
                <Input
                  id="meetingCost"
                  type="number"
                  value={profileForm.meetingCost}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      meetingCost: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="available">Available for consultations</Label>
                  <Switch
                    id="available"
                    checked={profileForm.available}
                    onCheckedChange={(checked) =>
                      setProfileForm({ ...profileForm, available: checked })
                    }
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Toggle this to show your availability status to potential
                  clients
                </p>
              </div>

              <div className="col-span-1 md:col-span-2 space-y-2">
                <Label htmlFor="bio">Bio / About</Label>
                <Textarea
                  id="bio"
                  value={profileForm.bio}
                  rows={6}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, bio: e.target.value })
                  }
                  className="resize-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats - Big Number, Small Label format */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-6">
        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-4xl font-bold text-gray-900 mb-1">
                  {analytics.performance.followersCount}
                </h3>
                <p className="text-sm font-medium text-gray-500">
                  Total Followers
                </p>
                <p className="text-xs text-green-600 mt-1 font-medium">+14% this month</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-blue-600 stroke-[2]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-4xl font-bold text-gray-900 mb-1">
                  {analytics.views.totalEngagement.toLocaleString()}
                </h3>
                <p className="text-sm font-medium text-gray-500">
                  Total Engagement
                </p>
                <p className="text-xs text-green-600 mt-1 font-medium">
                  +8.2% this month
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Eye className="h-6 w-6 text-green-600 stroke-[2]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-4xl font-bold text-gray-900 mb-1">
                  {earningsData
                    ? earningsData.sessions.filter((s) => s.status === "completed").length
                    : analytics.performance.meetings.completed}
                </h3>
                <p className="text-sm font-medium text-gray-500">
                  Sessions Completed
                </p>
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  {analytics.performance.meetings.upcoming} upcoming
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-6 w-6 text-amber-600 stroke-[2]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-4xl font-bold text-gray-900 mb-1">
                  {(earningsData?.totalEarnings ?? analytics.performance.earnings.total).toLocaleString()}
                </h3>
                <p className="text-sm font-medium text-gray-500">
                  Total Earnings (coins)
                </p>
                {earningsData && earningsData.extensionEarnings > 0 && (
                  <p className="text-xs text-blue-600 mt-1 font-medium">
                    +{earningsData.extensionEarnings.toLocaleString()} from extensions
                  </p>
                )}
                <p className="text-xs text-green-600 mt-1 font-medium">
                  +{analytics.performance.earnings.growth}% growth
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-6 w-6 text-purple-600 stroke-[2]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-6">
        {/* Main Analytics Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* Upcoming Meetings */}
          <UpcomingMeetings expertId={expert.expertID} />

          {/* Earnings Breakdown */}
          {earningsData && (
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-2xl font-semibold text-gray-900">
                    Earnings Breakdown
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                {/* Mini KPI row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border bg-purple-50 p-4 text-center">
                    <p className="text-2xl font-bold text-purple-700">
                      {earningsData.totalEarnings.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Total Earned</p>
                  </div>
                  <div className="rounded-lg border bg-green-50 p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">
                      {earningsData.thisMonth.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">This Month</p>
                  </div>
                  <div className="rounded-lg border bg-blue-50 p-4 text-center">
                    <p className="text-2xl font-bold text-blue-700">
                      {earningsData.extensionEarnings.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">From Extensions</p>
                  </div>
                </div>

                {/* 12-month bar chart */}
                {earningsData.chart.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-3">
                      Monthly Earnings — Last 12 Months
                    </p>
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={earningsData.chart} barSize={16}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 12 }} />
                          <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
                          <Tooltip
                            formatter={(value: number, name: string) => [
                              `${value.toLocaleString()} coins`,
                              name === "base" ? "Base" : "Extensions",
                            ]}
                            contentStyle={{ backgroundColor: "#FFF", borderColor: "#E5E7EB" }}
                          />
                          <Legend
                            formatter={(value) => (value === "base" ? "Base" : "Extensions")}
                          />
                          <Bar dataKey="base" stackId="a" fill="#a855f7" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="extensions" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Per-session table */}
                {earningsData.sessions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-3">Session History</p>
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Student</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500">Base</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500">Extension</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500">Total</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-500">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {earningsData.sessions.slice(0, 10).map((s) => (
                            <tr key={s.meetingId} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-600">
                                {new Date(s.startTime).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "2-digit",
                                })}
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-900">{s.studentName}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{s.baseCost}</td>
                              <td className="px-4 py-3 text-right text-blue-600">
                                {s.extensionEarnings > 0 ? `+${s.extensionEarnings}` : "—"}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                {s.totalEarned}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge
                                  variant="outline"
                                  className={
                                    s.status === "completed"
                                      ? "border-green-300 text-green-700 bg-green-50"
                                      : s.status === "cancelled"
                                      ? "border-red-300 text-red-700 bg-red-50"
                                      : "border-amber-300 text-amber-700 bg-amber-50"
                                  }
                                >
                                  {s.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {earningsData.sessions.length > 10 && (
                        <div className="px-4 py-2 bg-gray-50 text-xs text-gray-400 text-center">
                          +{earningsData.sessions.length - 10} more sessions
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Views Chart with increased padding */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-semibold text-gray-900">
                  Profile Engagement
                </CardTitle>
                <div className="flex items-center gap-2">
                  <LineChartIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-500">Last 6 months</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[300px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.performance.monthlyViews}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip
                      formatter={(value) => [`${value} views`, "Engagement"]}
                      contentStyle={{
                        backgroundColor: "#FFF",
                        borderColor: "#E5E7EB",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="views"
                      stroke="#2563EB"
                      strokeWidth={2}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Content Stats with increased padding */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-semibold text-gray-900">
                  Content Performance
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs font-normal">
                    Total:{" "}
                    {analytics.content.videosCount +
                      analytics.content.blogsCount +
                      analytics.content.postsCount}{" "}
                    items
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.performance.contentEngagement}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="type" stroke="#6B7280" />
                      <YAxis stroke="#6B7280" />
                      <Tooltip
                        formatter={(value) => [
                          `${value.toLocaleString()} views`,
                          "Content Views",
                        ]}
                        contentStyle={{
                          backgroundColor: "#FFF",
                          borderColor: "#E5E7EB",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#3B82F6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-5 border rounded-lg hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Video className="h-6 w-6 text-blue-600 stroke-[2]" />
                      </div>
                      <div>
                        <h4 className="text-2xl font-bold text-gray-900">{analytics.content.videosCount}</h4>
                        <p className="text-sm font-medium text-gray-500">Videos</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-sm font-medium">
                      {analytics.views.videoViews.toLocaleString()} views
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-5 border rounded-lg hover:border-green-300 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-6 w-6 text-green-600 stroke-[2]" />
                      </div>
                      <div>
                        <h4 className="text-2xl font-bold text-gray-900">{analytics.content.blogsCount}</h4>
                        <p className="text-sm font-medium text-gray-500">Blogs</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-sm font-medium">
                      {analytics.views.blogReads.toLocaleString()} reads
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-5 border rounded-lg hover:border-amber-300 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="h-6 w-6 text-amber-600 stroke-[2]" />
                      </div>
                      <div>
                        <h4 className="text-2xl font-bold text-gray-900">{analytics.content.postsCount}</h4>
                        <p className="text-sm font-medium text-gray-500">Posts</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-sm font-medium">
                      {analytics.views.postViews.toLocaleString()} views
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Your Content - Posts, Videos, Blogs */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-semibold text-gray-900">Your Content</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Tabs defaultValue="posts" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="posts" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Posts
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {analytics.content.postsCount}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="videos" className="gap-2">
                    <Video className="h-4 w-4" />
                    Videos
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {analytics.content.videosCount}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="blogs" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Blogs
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {analytics.content.blogsCount}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="posts" className="space-y-4">
                  <ExpertPosts
                    key={postRefreshTrigger}
                    expertId={expert.expertID}
                    expertName={`${expert.userDetails.firstName} ${expert.userDetails.lastName}`}
                    expertInitials={expertInitials}
                    isExpertLoggedIn={true}
                  />
                </TabsContent>

                <TabsContent value="videos" className="space-y-4">
                  <VideoManagement expertId={expert.expertID} />
                </TabsContent>

                <TabsContent value="blogs" className="space-y-4">
                  <BlogManagement />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Side Analytics */}
        <div className="space-y-8">
          {/* Content Creation Actions */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-semibold text-gray-900">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start hover:bg-blue-50"
                variant="outline"
                onClick={() => (window.location.href = "/blogs/create")}
              >
                <FilePlus className="h-4 w-4 mr-2" />
                Create New Blog
              </Button>

              <Button
                className="w-full justify-start hover:bg-blue-50"
                variant="outline"
                onClick={() => (window.location.href = "/videos/create")}
              >
                <Video className="h-4 w-4 mr-2" />
                Upload New Video
              </Button>
              <Button
                className="w-full justify-start hover:bg-blue-50"
                variant="outline"
                onClick={() =>
                  (window.location.href = "https://calendar.google.com/")
                }
              >
                <Calendar className="h-4 w-4 mr-2" />
                Manage Schedule
              </Button>
            </CardContent>
          </Card>

          {/* Meeting Settings */}
          <Card className="bg-white shadow-sm border-blue-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Meeting Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Session duration */}
              <div className="space-y-2">
                <Label htmlFor="msDuration" className="text-sm font-medium text-gray-700">
                  Session Length
                </Label>
                <select
                  id="msDuration"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={meetingSettings.sessionDurationMinutes}
                  onChange={(e) =>
                    setMeetingSettings((prev) => ({
                      ...prev,
                      sessionDurationMinutes: Number(e.target.value),
                    }))
                  }
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes (1 hour)</option>
                  <option value={90}>90 minutes</option>
                  <option value={120}>120 minutes (2 hours)</option>
                </select>
                <p className="text-xs text-gray-400">Each bookable slot will be this long.</p>
              </div>

              {/* Session cost */}
              <div className="space-y-2">
                <Label htmlFor="msCost" className="text-sm font-medium text-gray-700">
                  Session Cost <span className="text-gray-400 font-normal">(coins / session)</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="msCost"
                    type="number"
                    min={0}
                    className="w-full"
                    value={meetingSettings.meetingCost}
                    onChange={(e) =>
                      setMeetingSettings((prev) => ({
                        ...prev,
                        meetingCost: Number(e.target.value),
                      }))
                    }
                  />
                  <span className="text-sm text-gray-500 shrink-0">coins</span>
                </div>
                <p className="text-xs text-gray-400">Students pay this per 1-hour session.</p>
              </div>

              {/* Accept bookings toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3 bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">Accept new bookings</p>
                  <p className="text-xs text-gray-500">Disable to pause incoming session requests</p>
                </div>
                <Switch
                  checked={meetingSettings.available}
                  onCheckedChange={(checked) =>
                    setMeetingSettings((prev) => ({ ...prev, available: checked }))
                  }
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSaveMeetingSettings}
                disabled={isSavingMeetingSettings}
              >
                {isSavingMeetingSettings ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" />Save Meeting Settings</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Ratings Overview */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-gray-900">
                  Ratings Overview
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">
                    {expert.rating.toFixed(1)}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.performance.ratings.distribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      dataKey="count"
                      nameKey="rating"
                      label={({ rating, count }) => (count > 0 ? `${rating}⭐` : "")}
                    >
                      {analytics.performance.ratings.distribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${value} ratings`,
                        `${name} stars`,
                      ]}
                      contentStyle={{
                        backgroundColor: "#FFF",
                        borderColor: "#E5E7EB",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-2 text-center">
                <p className="text-sm text-gray-500">
                  Based on{" "}
                  {analytics.performance.ratings.distribution.reduce(
                    (acc, curr) => acc + curr.count,
                    0
                  )}{" "}
                  ratings
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Availability Schedule */}
      <div className="mt-6">
        <AvailabilitySettings
          expertId={expert.expertID}
          initialAvailability={(expert as any).availability}
        />
      </div>


    </div>
  );
}
