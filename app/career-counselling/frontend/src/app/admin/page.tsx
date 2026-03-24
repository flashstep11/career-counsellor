"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Trash,
  Edit,
  User,
  BookOpen,
  Video as VideoIcon,
  ClipboardList,
  CheckCircle,
  AlertCircle,
  FileText,
  RefreshCw,
  DollarSign,
  Calendar,
} from "lucide-react";
import { useRoleCheck } from "@/hooks/useRoleCheck";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import axios from "axios";
import { Textarea } from "@/components/ui/textarea";

// Module-level interfaces used by both AdminDashboard and dialog components
interface ExpertApplication {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  currentPosition: string;
  organization: string;
  education: string;
  bio: string;
  specialization: string;
  meetingCost: number;
  fileId: string;
  applicationDate: string;
  status: "pending" | "approved" | "rejected";
  reviewDate?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

interface RefundRequest {
  _id: string;
  meetingId: string;
  expertId: string;
  userId: string;
  reason: string;
  amount: number;
  status: "pending" | "approved" | "denied";
  requestedAt: string;
  processedAt?: string;
  adminNotes?: string;
  fileId?: string;
  userName?: string;
  userEmail?: string;
  expertName?: string;
  meetingDetails?: any;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { isAuthorized, loading } = useRoleCheck(["admin"]);
  const [activeTab, setActiveTab] = useState("overview");

  const [experts, setExperts] = useState<Expert[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalExperts, setTotalExperts] = useState(0);
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [totalVideos, setTotalVideos] = useState(0);
  const [activities, setActivities] = useState<any[]>([]);
  const [expertApplications, setExpertApplications] = useState<
    ExpertApplication[]
  >([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefundsLoading, setIsRefundsLoading] = useState(false);

  interface User {
    _id: number;
    firstName: string;
    lastName: string;
    email: string;
    isAdmin: boolean;
    isExpert: boolean;
    status?: string;
  }

  interface Expert {
    _id: number;
    firstName: string;
    lastName: string;
    email: string;
    specialization: string;
    rating: number;
    studentsGuided?: number;
  }

  interface Video {
    id: number;
    title: string;
    creator: string;
    published: string;
    views: number;
  }

  useEffect(() => {
    if (!loading) {
      if (!isAuthorized) {
        toast.error("You must be an admin to access this page");
        router.push("/");
      } else {
        fetchData();
        fetchExpertApplications();
      }
    }
  }, [isAuthorized, loading, router]);

  useEffect(() => {
    if (activeTab === "applications" && isAuthorized && !loading) {
      fetchExpertApplications();
    }
  }, [activeTab, isAuthorized, loading]);

  useEffect(() => {
    if (activeTab === "refunds" && isAuthorized && !loading) {
      fetchRefundRequests();
    }
  }, [activeTab, isAuthorized, loading]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const statsResponse = await axios.get("/api/admin/dashboard", {
        headers,
      });

      if (statsResponse.data) {
        setTotalUsers(statsResponse.data.totalUsers || 0);
        setTotalExperts(statsResponse.data.totalExperts || 0);
        setTotalBlogs(statsResponse.data.totalBlogs || 0);
        setTotalVideos(statsResponse.data.totalVideos || 0);
        setActivities(statsResponse.data.activities || []);
      }

      const usersResponse = await axios.get("/api/admin/users", { headers });
      setUsers(usersResponse.data.users || []);

      const expertsResponse = await axios.get("/api/admin/experts", {
        headers,
      });
      setExperts(expertsResponse.data.experts || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      if (axios.isAxiosError(error)) {
        toast.error(
          `Failed to load dashboard data: ${error.response?.data?.detail || error.message
          }`
        );
      } else {
        toast.error("Failed to load dashboard data");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExpertApplications = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/admin/expert-applications", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setExpertApplications(response.data || []);
    } catch (error) {
      console.error("Error fetching expert applications:", error);
      toast.error("Failed to load expert applications");
    }
  };

  const fetchRefundRequests = async () => {
    setIsRefundsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/refunds", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Refund Requests:", response.data);

      setRefundRequests(response.data || []);
    } catch (error) {
      console.error("Error fetching refund requests:", error);
      toast.error("Failed to load refund requests");
    } finally {
      setIsRefundsLoading(false);
    }
  };

  const handleUpdateApplicationStatus = async (
    applicationId: string,
    status: "approved" | "rejected",
    rejectionReason?: string
  ) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `/api/admin/expert-applications/${applicationId}/status`,
        {
          status,
          rejectionReason,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(
        `Application ${status === "approved" ? "approved" : "rejected"
        } successfully`
      );
      fetchExpertApplications();
    } catch (error) {
      console.error(
        `Error ${status === "approved" ? "approving" : "rejecting"
        } application:`,
        error
      );
      toast.error(
        `Failed to ${status === "approved" ? "approve" : "reject"} application`
      );
    }
  };

  const handleUpdateRefundStatus = async (
    refundId: string,
    status: "approved" | "denied",
    adminNotes?: string
  ) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `/api/refunds/${refundId}`,
        {
          status,
          adminNotes: adminNotes || undefined,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(
        `Refund request ${status === "approved" ? "approved" : "denied"
        } successfully`
      );
      fetchRefundRequests();
    } catch (error) {
      console.error(
        `Error ${status === "approved" ? "approving" : "denying"
        } refund request:`,
        error
      );
      toast.error(
        `Failed to ${status === "approved" ? "approve" : "deny"} refund request`
      );
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-primary-blue" />
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary-blue" />
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Manage users, content, and site settings
          </p>
        </div>
        <Badge variant="outline" className="mt-2 md:mt-0 px-3 py-1">
          Admin: {user?.firstName} {user?.lastName}
        </Badge>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-8">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Users</span>
          </TabsTrigger>
          <TabsTrigger value="experts" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Experts</span>
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span>Applications</span>
          </TabsTrigger>
          <TabsTrigger value="refunds" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span>Refunds</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Users
                </CardTitle>
                <CardDescription className="text-3xl font-bold">
                  {totalUsers}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("users")}
                  >
                    View All Users
                  </Button>
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Experts
                </CardTitle>
                <CardDescription className="text-3xl font-bold">
                  {totalExperts}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("experts")}
                  >
                    View All Experts
                  </Button>
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Blogs
                </CardTitle>
                <CardDescription className="text-3xl font-bold">
                  {totalBlogs}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/blogs")}
                  >
                    View All Blogs
                  </Button>
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Videos
                </CardTitle>
                <CardDescription className="text-3xl font-bold">
                  {totalVideos}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/videos")}
                  >
                    View All Videos
                  </Button>
                  <VideoIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col md:flex-row justify-between md:items-center space-y-2 md:space-y-0">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest actions on the platform</CardDescription>
              </div>
              <ViewAllActivitiesDialog activities={activities} />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.length > 0 ? (
                  activities.slice(0, 5).map((activity, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center border-b pb-2 last:border-0"
                    >
                      <div>
                        <p className="font-medium">{activity.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.userName ? `${activity.userName} • ` : ''}
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline">{activity.activityType}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No recent activities</p>
                )}
              </div>
              {activities.length > 5 && (
                <div className="mt-4 text-center">
                  <ViewAllActivitiesDialog activities={activities} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-col md:flex-row justify-between md:items-center space-y-2 md:space-y-0">
              <div>
                <CardTitle>Users Management</CardTitle>
                <CardDescription>
                  Manage all users on the platform
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-8 w-[250px]"
                  />
                </div>
                <AddUserDialog />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.isAdmin ? (
                          <Badge variant="default" className="bg-blue-500">
                            Admin
                          </Badge>
                        ) : user.isExpert ? (
                          <Badge
                            variant="outline"
                            className="border-amber-500 text-amber-500"
                          >
                            Expert
                          </Badge>
                        ) : (
                          <Badge variant="outline">User</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            user.status === "suspended"
                              ? "bg-red-50 text-red-700 border-red-300"
                              : user.status === "inactive"
                                ? "bg-gray-50 text-gray-700 border-gray-300"
                                : "bg-green-50 text-green-700 border-green-300"
                          }
                        >
                          {user.status
                            ? user.status.charAt(0).toUpperCase() +
                            user.status.slice(1)
                            : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <EditUserDialog user={user} />
                        <DeleteUserDialog
                          userName={`${user.firstName} ${user.lastName}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experts">
          <Card>
            <CardHeader className="flex flex-col md:flex-row justify-between md:items-center space-y-2 md:space-y-0">
              <div>
                <CardTitle>Experts Management</CardTitle>
                <CardDescription>
                  Manage experts and their permissions
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search experts..."
                    className="pl-8 w-[250px]"
                  />
                </div>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Add Expert
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expert</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {experts.map((expert) => {
                    // Determine if the expert is verified (using same criteria as other components)
                    const isVerified = expert.rating >= 4.0 || (expert.studentsGuided && expert.studentsGuided > 10);

                    return (
                      <TableRow key={expert._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary-blue/10 flex items-center justify-center text-primary-blue">
                              {expert.firstName[0]}
                              {expert.lastName[0]}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                {expert.firstName} {expert.lastName}
                                {isVerified && (
                                  <span title="Verified Expert">
                                    <CheckCircle className="h-4 w-4 fill-blue-600 text-white" />
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {expert.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{expert.specialization}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-300"
                            >
                              Active
                            </Badge>
                            {isVerified && (
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-300 flex items-center gap-1"
                              >
                                <CheckCircle className="h-3 w-3 fill-blue-600 text-white" />
                                <span>Verified</span>
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{expert.rating} / 5</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card>
            <CardHeader className="flex flex-col md:flex-row justify-between md:items-center space-y-2 md:space-y-0">
              <div>
                <CardTitle>Expert Applications</CardTitle>
                <CardDescription>
                  Manage expert applications and approvals
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search applications..."
                    className="pl-8 w-[250px]"
                  />
                </div>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={fetchExpertApplications}
                >
                  <ShieldCheck className="h-4 w-4" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Credentials</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Application Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expertApplications.length > 0 ? (
                    expertApplications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary-blue/10 flex items-center justify-center text-primary-blue">
                              {application.firstName[0]}
                              {application.lastName[0]}
                            </div>
                            <div>
                              {application.firstName} {application.lastName}
                              <p className="text-xs text-muted-foreground">
                                {application.email}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {application.currentPosition} at{" "}
                                {application.organization}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>
                              <span className="font-semibold">Education:</span>{" "}
                              {application.education}
                            </p>
                            <p>
                              <span className="font-semibold">
                                Specialization:
                              </span>{" "}
                              {application.specialization}
                            </p>
                            <Button
                              variant="link"
                              size="sm"
                              className="text-blue-600 p-0 h-auto"
                              onClick={() =>
                                window.open(
                                  `/api/files/${application.fileId}`,
                                  "_blank"
                                )
                              }
                            >
                              View Document
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {application.status === "pending" && (
                            <Badge
                              variant="outline"
                              className="bg-yellow-50 text-yellow-700 border-yellow-300"
                            >
                              Pending
                            </Badge>
                          )}
                          {application.status === "approved" && (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-300"
                            >
                              Approved
                            </Badge>
                          )}
                          {application.status === "rejected" && (
                            <Badge
                              variant="outline"
                              className="bg-red-50 text-red-700 border-red-300"
                            >
                              Rejected
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(
                            application.applicationDate
                          ).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          {application.status === "pending" && (
                            <>
                              <ApproveApplicationDialog
                                application={application}
                                onApprove={() =>
                                  handleUpdateApplicationStatus(
                                    application.id,
                                    "approved"
                                  )
                                }
                              />
                              <RejectApplicationDialog
                                application={application}
                                onReject={(reason) =>
                                  handleUpdateApplicationStatus(
                                    application.id,
                                    "rejected",
                                    reason
                                  )
                                }
                              />
                            </>
                          )}
                          <ViewApplicationDialog application={application} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-6 text-muted-foreground"
                      >
                        No expert applications found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refunds">
          <Card>
            <CardHeader className="flex flex-col md:flex-row justify-between md:items-center space-y-2 md:space-y-0">
              <div>
                <CardTitle>Refund Requests</CardTitle>
                <CardDescription>
                  Manage user refund requests for expert sessions
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search refunds..."
                    className="pl-8 w-[250px]"
                  />
                </div>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={fetchRefundRequests}
                >
                  <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Expert</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refundRequests.length > 0 ? (
                    refundRequests.map((refund) => (
                      <TableRow key={refund._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary-blue/10 flex items-center justify-center text-primary-blue">
                              {refund.userName?.[0]}
                              {refund.userName?.split(" ")[1]?.[0]}
                            </div>
                            <div>
                              {refund.userName}
                              <p className="text-xs text-muted-foreground">
                                {refund.userEmail}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              {refund.expertName}
                              <p className="text-xs text-muted-foreground">
                                {refund.meetingDetails?.topic}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{refund.amount} coins</TableCell>
                        <TableCell>
                          {new Date(refund.requestedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {refund.status === "pending" && (
                            <Badge
                              variant="outline"
                              className="bg-yellow-50 text-yellow-700 border-yellow-300"
                            >
                              Pending
                            </Badge>
                          )}
                          {refund.status === "approved" && (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-300"
                            >
                              Approved
                            </Badge>
                          )}
                          {refund.status === "denied" && (
                            <Badge
                              variant="outline"
                              className="bg-red-50 text-red-700 border-red-300"
                            >
                              Denied
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          {refund.status === "pending" && (
                            <>
                              <ApproveRefundDialog
                                refund={refund}
                                onApprove={(notes) =>
                                  handleUpdateRefundStatus(
                                    refund._id,
                                    "approved",
                                    notes
                                  )
                                }
                              />
                              <RejectRefundDialog
                                refund={refund}
                                onReject={(notes) =>
                                  handleUpdateRefundStatus(
                                    refund._id,
                                    "denied",
                                    notes
                                  )
                                }
                              />
                            </>
                          )}
                          <ViewRefundDialog refund={refund} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-6 text-muted-foreground"
                      >
                        No refund requests found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Dialog components for user management

function AddUserDialog() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "user",
  });

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post("/api/admin/users", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("User created successfully");
      window.location.reload();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Failed to create user");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account. They will receive an email to set their
            password.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">First Name</label>
              <Input
                placeholder="First Name"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name</label>
              <Input
                placeholder="Last Name"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              placeholder="Email address"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium">Role</label>
            <select
              className="w-full p-2 border rounded-md"
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
            >
              <option value="user">User</option>
              <option value="expert">Expert</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create User</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add proper type for the user parameter
interface EditUserProps {
  user: {
    _id: number;
    id?: number;
    firstName: string;
    lastName: string;
    email: string;
    isAdmin: boolean;
    isExpert: boolean;
  };
}

function EditUserDialog({ user }: EditUserProps) {
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.isAdmin ? "admin" : user.isExpert ? "expert" : "user",
    status: "active",
  });

  const handleSubmit = async () => {
    try {
      const userId = user._id || user.id;

      if (!userId) {
        toast.error("Invalid user ID");
        console.error("Invalid user ID:", user);
        return;
      }

      const token = localStorage.getItem("token");
      await axios.put(`/api/users/${userId}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("User updated successfully");
      window.location.reload();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user details and permissions.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">First Name</label>
              <Input
                placeholder="First Name"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name</label>
              <Input
                placeholder="Last Name"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              placeholder="Email address"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium">Role</label>
            <select
              className="w-full p-2 border rounded-md"
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
            >
              <option value="user">User</option>
              <option value="expert">Expert</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              className="w-full p-2 border rounded-md"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add proper type for DeleteUserDialog component
interface DeleteUserProps {
  userName: string;
}

function DeleteUserDialog({ userName }: DeleteUserProps) {
  const handleDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/admin/users/${userName}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("User deleted successfully");
      window.location.reload();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 text-red-600"
        >
          <Trash className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {userName}? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Dialog components for expert application management
interface ExpertApplicationProps {
  application: {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    currentPosition: string;
    organization: string;
    education: string;
    bio: string;
    specialization: string;
    meetingCost: number;
    fileId: string;
    applicationDate: string;
    status: "pending" | "approved" | "rejected";
    reviewDate?: string;
    reviewedBy?: string;
    rejectionReason?: string;
  };
  onApprove?: () => void;
}

interface RejectApplicationProps extends ExpertApplicationProps {
  onReject: (reason: string) => void;
}

function ViewApplicationDialog({ application }: ExpertApplicationProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
          <Search className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Expert Application Details</DialogTitle>
          <DialogDescription>
            Application from {application.firstName} {application.lastName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Personal Information
              </h3>
              <p>
                <span className="font-medium">Name:</span>{" "}
                {application.firstName} {application.lastName}
              </p>
              <p>
                <span className="font-medium">Email:</span> {application.email}
              </p>
              <p>
                <span className="font-medium">Current Position:</span>{" "}
                {application.currentPosition}
              </p>
              <p>
                <span className="font-medium">Organization:</span>{" "}
                {application.organization}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Professional Details
              </h3>
              <p>
                <span className="font-medium">Education:</span>{" "}
                {application.education}
              </p>
              <p>
                <span className="font-medium">Specialization:</span>{" "}
                {application.specialization}
              </p>
              <p>
                <span className="font-medium">Session Cost:</span>
                {application.meetingCost} coins per hour
              </p>
              <p>
                <span className="font-medium">Application Date:</span>{" "}
                {new Date(application.applicationDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Professional Bio</h3>
            <div className="p-4 bg-gray-50 rounded-md">{application.bio}</div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Credentials</h3>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() =>
                window.open(`/api/files/${application.fileId}`, "_blank")
              }
            >
              <FileText className="h-4 w-4" />
              View Proof Document
            </Button>
          </div>

          {application.status !== "pending" && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Review Information</h3>
              <p>
                <span className="font-medium">Status:</span>
                <Badge
                  className={
                    application.status === "approved"
                      ? "bg-green-100 text-green-800 ml-2"
                      : "bg-red-100 text-red-800 ml-2"
                  }
                >
                  {application.status.charAt(0).toUpperCase() +
                    application.status.slice(1)}
                </Badge>
              </p>
              {application.reviewDate && (
                <p>
                  <span className="font-medium">Review Date:</span>{" "}
                  {new Date(application.reviewDate).toLocaleDateString()}
                </p>
              )}
              {application.rejectionReason && (
                <div>
                  <p className="font-medium">Rejection Reason:</p>
                  <div className="p-3 bg-red-50 rounded-md text-red-800 mt-1">
                    {application.rejectionReason}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApproveApplicationDialog({
  application,
  onApprove,
}: ExpertApplicationProps) {
  if (!onApprove) return null;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 text-green-600"
        >
          <CheckCircle className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve Expert Application</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to approve the expert application from{" "}
            {application.firstName} {application.lastName}? This will create a
            new expert profile for this user.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onApprove}
            className="bg-green-600 hover:bg-green-700"
          >
            Approve Application
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RejectApplicationDialog({
  application,
  onReject,
}: RejectApplicationProps) {
  const [rejectionReason, setRejectionReason] = useState("");

  const handleReject = () => {
    if (rejectionReason.trim() === "") {
      toast.error("Please provide a reason for rejection");
      return;
    }
    onReject(rejectionReason);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 text-red-600"
        >
          <AlertCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Expert Application</DialogTitle>
          <DialogDescription>
            Provide a reason for rejecting the application from{" "}
            {application.firstName} {application.lastName}. This will be visible
            to the applicant.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <label className="text-sm font-medium">Rejection Reason</label>
            <Textarea
              placeholder="Please provide a detailed reason for the rejection..."
              className="mt-2 resize-none h-32"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleReject}>
            Reject Application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Dialog components for refund request management
interface RefundRequestProps {
  refund: RefundRequest;
  onApprove?: (notes: string) => void;
  onReject?: (notes: string) => void;
}

function ViewRefundDialog({ refund }: RefundRequestProps) {
  console.log(refund);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
          <Search className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Refund Request Details</DialogTitle>
          <DialogDescription>
            Refund request from {refund.userName || "User"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">User Information</h3>
              <p>
                <span className="font-medium">User ID:</span> {refund.userId}
              </p>
              {refund.userName && (
                <p>
                  <span className="font-medium">Name:</span> {refund.userName}
                </p>
              )}
              {refund.userEmail && (
                <p>
                  <span className="font-medium">Email:</span> {refund.userEmail}
                </p>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Meeting Information
              </h3>
              <p>
                <span className="font-medium">Meeting ID:</span>{" "}
                {refund.meetingId}
              </p>
              <p>
                <span className="font-medium">Expert ID:</span>{" "}
                {refund.expertId}
              </p>
              {refund.expertName && (
                <p>
                  <span className="font-medium">Expert Name:</span>{" "}
                  {refund.expertName}
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Refund Details</h3>
            <p>
              <span className="font-medium">Amount:</span> {refund.amount} coins
            </p>
            <p>
              <span className="font-medium">Request Date:</span>{" "}
              {new Date(refund.requestedAt).toLocaleDateString()}
            </p>
            <div>
              <p className="font-medium mb-1">Reason for refund:</p>
              <div className="p-3 bg-gray-50 rounded-md mt-1">
                {refund.reason}
              </div>
            </div>
            {refund.fileId && (
              <div className="mt-2">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() =>
                    window.open(`/api/files/${refund.fileId}`, "_blank")
                  }
                >
                  <FileText className="h-4 w-4" />
                  View Supporting Document
                </Button>
              </div>
            )}
          </div>

          {refund.status !== "pending" && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Review Information</h3>
              <p>
                <span className="font-medium">Status:</span>
                <Badge
                  className={
                    refund.status === "approved"
                      ? "bg-green-100 text-green-800 ml-2"
                      : "bg-red-100 text-red-800 ml-2"
                  }
                >
                  {refund.status.charAt(0).toUpperCase() +
                    refund.status.slice(1)}
                </Badge>
              </p>
              {refund.processedAt && (
                <p>
                  <span className="font-medium">Processed Date:</span>{" "}
                  {new Date(refund.processedAt).toLocaleDateString()}
                </p>
              )}
              {refund.adminNotes && (
                <div>
                  <p className="font-medium">Admin Notes:</p>
                  <div className="p-3 bg-gray-50 rounded-md mt-1">
                    {refund.adminNotes}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApproveRefundDialog({ refund, onApprove }: RefundRequestProps) {
  const [adminNotes, setAdminNotes] = useState("");

  const handleApprove = () => {
    if (onApprove) {
      onApprove(adminNotes);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 text-green-600"
        >
          <CheckCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Refund Request</DialogTitle>
          <DialogDescription>
            Approving this refund will return {refund.amount} coins to the user
            and deduct it from the expert.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <label className="text-sm font-medium">
              Admin Notes (Optional)
            </label>
            <Textarea
              placeholder="Add any notes about this approval..."
              className="mt-2 resize-none h-32"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={handleApprove}
          >
            Approve Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectRefundDialog({ refund, onReject }: RefundRequestProps) {
  const [adminNotes, setAdminNotes] = useState("");

  const handleReject = () => {
    if (adminNotes.trim() === "") {
      toast.error("Please provide notes for rejection");
      return;
    }
    if (onReject) {
      onReject(adminNotes);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 text-red-600"
        >
          <AlertCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Refund Request</DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting this refund request. This will
            be visible to the user.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <label className="text-sm font-medium">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Explain why you're rejecting this refund request..."
              className="mt-2 resize-none h-32"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive" onClick={handleReject}>
            Reject Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewAllActivitiesDialog({ activities }: { activities: any[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          View All Activities
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>All Recent Activities</DialogTitle>
          <DialogDescription>
            View all recent activities on the platform.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
          {activities.length > 0 ? (
            activities.map((activity, index) => (
              <div
                key={index}
                className="flex justify-between items-center border-b pb-2 last:border-0"
              >
                <div>
                  <p className="font-medium">{activity.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {activity.userName ? `${activity.userName} • ` : ""}
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
                <Badge variant="outline">{activity.activityType}</Badge>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No recent activities
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
