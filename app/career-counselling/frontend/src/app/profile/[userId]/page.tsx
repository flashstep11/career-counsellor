"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  Loader2, User as UserIcon, Calendar, MapPin, Mail, Phone, Briefcase,
  GraduationCap, Star, Clock, Users, CalendarCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Post, Expert } from "@/types";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import FollowButton from "@/components/experts/follow";
import ConnectButton from "@/components/shared/connect-button";
import { useConnectionStatus } from "@/hooks/use-connection";
import ExpertOverview from "@/components/experts/detail/expert-overview";
import ExpertVideos from "@/components/experts/detail/expert-videos";
import ExpertBlogs from "@/components/experts/detail/expert-blogs";
import ExpertPosts from "@/components/experts/detail/expert-posts";
import ExpertRatings from "@/components/experts/detail/expert-ratings";
import BookingCalendar from "@/components/experts/detail/booking-calendar";
import RateExpert from "@/components/experts/detail/rate-expert";
import { SocialLinksDrawer } from "@/components/experts/detail/social-links";

export default function UserProfilePage() {
  const { userId } = useParams();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [expert, setExpert] = useState<Expert | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutualCount, setMutualCount] = useState<number | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const { loading: authLoading } = useAuth();
  const isOwnProfile = !!authUser && authUser._id === (userId as string);

  // Connection status (used to gate contact details)
  const { status: connStatus } = useConnectionStatus(isOwnProfile ? "" : (userId as string));
  const isConnected = connStatus === "accepted";

  // Once auth is resolved, redirect immediately if viewing own profile
  useEffect(() => {
    if (!authLoading && isOwnProfile) {
      router.replace("/profile");
    }
  }, [authLoading, isOwnProfile, router]);

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await axios.get(`/api/users/${userId}`);
      const userData: User = response.data;
      setUser(userData);

      // If the user is an expert, fetch full expert-specific data
      if (userData.isExpert) {
        try {
          const byUserRes = await axios.get(`/api/by-user/${userId}`);
          const expertId: string = byUserRes.data.expertId;
          const expertRes = await axios.get(`/api/experts/${expertId}`);
          setExpert(expertRes.data);
        } catch (expertErr: any) {
          // 404 means no expert record exists yet — degrade silently to user view
          if (expertErr?.response?.status !== 404) {
            console.error("Error fetching expert data:", expertErr);
          }
        }
      }
    } catch (err: any) {
      console.error("Error fetching user profile:", err);
      setError(err.response?.data?.detail || "Failed to load user profile");
    }
  }, [userId]);

  const fetchUserPosts = useCallback(async () => {
    try {
      const response = await axios.get(`/api/users/${userId}/posts`);
      setPosts(response.data || []);
    } catch (err: any) {
      console.error("Error fetching user posts:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Skip all data fetching if auth is still loading or it's the user's own profile
  useEffect(() => {
    if (authLoading || isOwnProfile) return;
    if (userId) {
      fetchUserProfile();
      fetchUserPosts();
      // Fetch mutual connections count
      axios
        .get(`/api/connections/mutual/${userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        .then((res) => setMutualCount(res.data.count ?? null))
        .catch(() => setMutualCount(null));
    }
  }, [userId, authLoading, isOwnProfile, fetchUserProfile, fetchUserPosts]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const getUserInitials = (firstName: string, lastName: string) =>
    `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();

  // Show spinner while auth is resolving, data is loading, or redirect is in progress
  if (authLoading || loading || isOwnProfile) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto">
          <UserIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">User Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-red-600">
          User profile could not be loaded.
        </h1>
      </div>
    );
  }

  const expertInitials = expert
    ? `${expert.userDetails.firstName[0]}${expert.userDetails.lastName[0]}`
    : "";
  const isVerified = expert
    ? expert.rating >= 4.0 || expert.studentsGuided > 10
    : false;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      {/* ── Profile Header ── */}
      <Card className="shadow-lg border-0">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={user.profilePicture || ""}
                  alt={`${user.firstName} ${user.lastName}`}
                />
                <AvatarFallback className="text-lg font-semibold bg-primary text-primary-foreground">
                  {getUserInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* User Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {user.firstName} {user.middleName} {user.lastName}
                </h1>
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge variant="secondary" className="text-xs">
                    {user.type.charAt(0).toUpperCase() + user.type.slice(1)}
                  </Badge>
                  {user.isExpert && (
                    <Badge variant="default" className="text-xs">
                      Expert
                    </Badge>
                  )}
                  {isVerified && (
                    <Badge className="bg-blue-100 text-blue-700 text-xs">
                      Verified
                    </Badge>
                  )}
                  {user.isAdmin && (
                    <Badge variant="destructive" className="text-xs">
                      Admin
                    </Badge>
                  )}
                </div>

                {/* Expert position / org */}
                {expert && (
                  <div className="mt-2 space-y-1">
                    <p className="text-base text-blue-600 font-semibold">
                      {expert.currentPosition}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-gray-500" />
                      {expert.organization}
                    </p>
                  </div>
                )}
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  {user.email ? (
                    <span className="text-gray-700">{user.email}</span>
                  ) : (
                    <span className="text-gray-400 italic">Connect to view email</span>
                  )}
                </div>
                {(user.mobileNo || !isConnected) && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    {user.mobileNo ? (
                      <span className="text-gray-700">{user.mobileNo}</span>
                    ) : (
                      <span className="text-gray-400 italic">Connect to view phone</span>
                    )}
                  </div>
                )}
                {user.home_state && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">{user.home_state}</span>
                  </div>
                )}
                {user.category && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">{user.category}</span>
                  </div>
                )}
              </div>

              {/* Mutual connections */}
              {mutualCount !== null && mutualCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Users className="h-4 w-4" />
                  <span>{mutualCount} mutual connection{mutualCount !== 1 ? "s" : ""}</span>
                </div>
              )}

              {/* Verification credentials */}
              {user.credentials && user.credentials.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {user.credentials.map((cred) => (
                    <span key={cred} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      ✓ {cred}
                    </span>
                  ))}
                </div>
              )}

              {/* Reputation score */}
              {typeof user.reputation === "number" && user.reputation > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-amber-600 font-medium">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span>{user.reputation} reputation</span>
                </div>
              )}

              {/* Social links + Follow (expert only, non-owner) */}
              {expert && (
                <div className="flex items-center gap-3 flex-wrap">
                  <SocialLinksDrawer socialLinks={expert.socialLinks} />
                  <FollowButton targetUserId={userId as string} />
                </div>
              )}

              {/* Connect button — available for any user profile (non-owner) */}
              {!isOwnProfile && (
                <ConnectButton targetUserId={userId as string} />
              )}

              {/* Onboarding Info (non-expert users) */}
              {!user.isExpert &&
                (user.grade ||
                  user.preferred_stream ||
                  user.target_college ||
                  user.interests?.length ||
                  user.career_goals) && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg text-primary">
                      Academic Information
                    </h3>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {user.grade && (
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-700">
                            <strong>Grade:</strong> {user.grade}
                          </span>
                        </div>
                      )}
                      {user.preferred_stream && (
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-700">
                            <strong>Stream:</strong> {user.preferred_stream}
                          </span>
                        </div>
                      )}
                      {user.target_college && (
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-700">
                            <strong>Target College:</strong> {user.target_college}
                          </span>
                        </div>
                      )}
                    </div>
                    {user.interests && user.interests.length > 0 && (
                      <div className="mt-3">
                        <strong className="text-sm text-gray-700">
                          Interests:
                        </strong>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {user.interests.map((interest, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs"
                            >
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {user.career_goals && (
                      <div className="mt-3">
                        <strong className="text-sm text-gray-700">
                          Career Goals:
                        </strong>
                        <p className="text-sm text-gray-600 mt-1">
                          {user.career_goals}
                        </p>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Expert Profile Sections ── */}
      {user.isExpert && expert ? (
        <div className="space-y-6">
          {/* Overview + Booking side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="pt-6">
                  <ExpertOverview expert={expert} />
                </CardContent>
              </Card>
            </div>

            <Card className="p-6 bg-gradient-to-br from-white to-blue-50 shadow-lg">
              <div className="flex flex-col h-full space-y-6">
                <div className="text-center space-y-4">
                  <h2 className="text-3xl font-bold text-blue-600">
                    {expert.meetingCost.toLocaleString("en-IN")} coins
                    <span className="text-lg text-gray-600">/hr</span>
                  </h2>
                  <div className="flex items-center justify-center gap-2">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-lg">
                      {expert.rating.toFixed(1)} Rating
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-gray-700">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">60 minute session</span>
                  </div>
                </div>

                <RateExpert
                  expertId={expert.expertID}
                  userId={expert.userId}
                  currentRating={expert.rating}
                  onRatingUpdate={(newRating) =>
                    setExpert({ ...expert, rating: newRating })
                  }
                />

                <div className="mt-auto pt-4">
                  <Button
                    onClick={() => setShowBookingModal(true)}
                    disabled={!expert.available}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <CalendarCheck className="h-5 w-5 mr-2" />
                    Book a Meeting
                  </Button>
                </div>

                {/* Booking Calendar Modal */}
                <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Book a Session</DialogTitle>
                      <DialogDescription>
                        Select a date and time slot to book with {expert.userDetails.firstName}
                      </DialogDescription>
                    </DialogHeader>
                    <BookingCalendar
                      expertId={expert.expertID}
                      meetingCost={expert.meetingCost}
                      disabled={!expert.available}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          </div>

          {/* Content Tabs */}
          <Card>
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="w-full justify-start border-b p-2 rounded-none rounded-t-lg">
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="videos">Videos</TabsTrigger>
                <TabsTrigger value="blogs">Blogs</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>
              <CardContent className="pt-6">
                <TabsContent value="posts">
                  <ExpertPosts
                    expertId={expert.expertID}
                    expertName={`${expert.userDetails.firstName} ${expert.userDetails.lastName}`}
                    expertInitials={expertInitials}
                    userId={expert.userId}
                  />
                </TabsContent>
                <TabsContent value="videos">
                  <ExpertVideos expertId={expert.expertID} />
                </TabsContent>
                <TabsContent value="blogs">
                  <ExpertBlogs expertId={expert.expertID} />
                </TabsContent>
                <TabsContent value="reviews">
                  <ExpertRatings expertId={expert.expertID} />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      ) : (
        /* ── Regular User Posts ── */
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
            <CardTitle className="text-xl text-primary">
              Posts by {user.firstName} {user.lastName}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Calendar className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Posts Yet
                </h3>
                <p className="text-gray-600">
                  {user.firstName} hasn't posted anything yet.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post) => (
                  <Card
                    key={post.postId}
                    className="border hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <Link
                              href={`/posts/${post.postId}`}
                              className="text-lg font-semibold text-primary hover:text-primary/80 transition-colors"
                            >
                              {post.title}
                            </Link>
                            <p className="text-sm text-gray-500 mt-1">
                              {formatDate(post.createdAt)}
                            </p>
                          </div>
                          {post.communityName && (
                            <Badge variant="outline" className="text-xs">
                              {post.communityDisplayName || post.communityName}
                            </Badge>
                          )}
                        </div>

                        <p className="text-gray-700 line-clamp-3">
                          {post.content}
                        </p>

                        {post.media && post.media.length > 0 && (
                          <div className="space-y-2">
                            {post.media.map((media, index) => (
                              <div
                                key={media.fileId}
                                className="rounded-lg overflow-hidden"
                              >
                                {media.type === "image" ? (
                                  <img
                                    src={media.url}
                                    alt={`Post image ${index + 1}`}
                                    className="w-full h-48 object-cover"
                                  />
                                ) : (
                                  <video
                                    src={media.url}
                                    controls
                                    className="w-full h-48 object-cover"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <div className="flex gap-4 text-sm text-gray-500">
                            <span>{post.likes || 0} likes</span>
                            {post.commentsCount !== undefined && (
                              <span>{post.commentsCount} comments</span>
                            )}
                          </div>
                          <Link href={`/posts/${post.postId}`}>
                            <Button variant="outline" size="sm">
                              View Post
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
