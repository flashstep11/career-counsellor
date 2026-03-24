"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Star,
  Building2,
  Clock,
  CheckCircle,
  LogIn,
  UserPlus,
  CalendarCheck,
} from "lucide-react";
import ExpertOverview from "@/components/experts/detail/expert-overview";
import ExpertVideos from "@/components/experts/detail/expert-videos";
import ExpertBlogs from "@/components/experts/detail/expert-blogs";
import ExpertPosts from "@/components/experts/detail/expert-posts";
import ExpertRatings from "@/components/experts/detail/expert-ratings";
import BookingCalendar from "@/components/experts/detail/booking-calendar";
import FollowButton from "@/components/experts/follow";
import ConnectButton from "@/components/shared/connect-button";
import RateExpert from "@/components/experts/detail/rate-expert";
import ProfileVideoPlayer from "@/components/experts/detail/profile-video-player";
import type { Expert } from "@/types/index";
import { SocialLinksDrawer } from "@/components/experts/detail/social-links";
import ExpertDashboard from "@/components/experts/detail/expert-dashboard";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function ExpertDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [expert, setExpert] = useState<Expert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpertLoggedIn, setIsExpertLoggedIn] = useState(false);
  const [isDashboardActive, setIsDashboardActive] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    const fetchExpert = async () => {
      try {
        const response = await fetch(`/api/experts/${id}`);
        if (!response.ok) throw new Error("Expert not found");
        const data = await response.json();
        setExpert(data);

        // Save to lastViewedExperts in localStorage
        try {
          const ud = data.userDetails || {};
          const name = `${ud.firstName || ""} ${ud.lastName || ""}`.trim();
          const stored = localStorage.getItem("lastViewedExperts");
          const prev: { expertID: string; name: string; currentPosition: string; rating: number }[] =
            stored ? JSON.parse(stored) : [];
          const filtered = prev.filter((e) => e.expertID !== data.expertID);
          const updated = [
            { expertID: data.expertID, name, currentPosition: data.currentPosition ?? "", rating: data.rating ?? 0 },
            ...filtered,
          ].slice(0, 20);
          localStorage.setItem("lastViewedExperts", JSON.stringify(updated));
        } catch { /* ignore */ }

        if (user && user.isExpert && user._id === data.userId) {
          setIsExpertLoggedIn(true);
          setIsDashboardActive(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load expert");
      } finally {
        setLoading(false);
      }
    };
    fetchExpert();
  }, [id, user]);

  // Show login prompt for non-authenticated users when page loads
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setShowLoginPrompt(true);
      // Prevent body scrolling when overlay is displayed
      document.body.style.overflow = "hidden";
    }

    // Cleanup function to restore scrolling when component unmounts or overlay is closed
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [loading, isAuthenticated]);

  // Function to handle closing the login prompt
  const handleCloseLoginPrompt = () => {
    setShowLoginPrompt(false);
    document.body.style.overflow = "auto";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !expert) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-red-600">Error</h2>
          <p className="text-gray-600">{error || "Expert not found"}</p>
        </Card>
      </div>
    );
  }

  const initials = `${expert.userDetails.firstName[0]}${expert.userDetails.lastName[0]}`;
  const isVerified = expert.rating >= 4.0 || expert.studentsGuided > 10;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Light blue to white gradient banner */}
      <div className="relative bg-gradient-to-r from-blue-100 to-white py-12">

        {/* Login Overlay */}
        {showLoginPrompt && !isAuthenticated && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
              <div className="text-center">
                <div className="mx-auto mb-6 bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center">
                  <LogIn className="h-10 w-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Sign in required</h2>
                <p className="text-gray-600 mb-6">
                  You need to be signed in to interact with experts, book
                  sessions, and use all the features available on this profile.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/login" passHref>
                    <Button
                      className="flex items-center gap-2 px-6 py-5"
                      onClick={handleCloseLoginPrompt}
                    >
                      <LogIn className="h-5 w-5" />
                      <span>Sign In</span>
                    </Button>
                  </Link>
                  <Link href="/register" passHref>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 px-6 py-5"
                      onClick={handleCloseLoginPrompt}
                    >
                      <UserPlus className="h-5 w-5" />
                      <span>Create Account</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Left-aligned Profile Card within Banner */}
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-xl border-0 bg-white">
              <div className="p-8">
                {/* ── Top row: avatar + info ── */}
                <div className="flex flex-col items-center text-center md:text-left md:flex-row gap-6">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-28 w-28 ring-4 ring-white shadow-xl">
                      <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <Badge
                      variant={expert.available ? "default" : "secondary"}
                      className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 shadow-md"
                    >
                      {expert.available ? "Available" : "Unavailable"}
                    </Badge>
                  </div>

                  {/* Name / position / social */}
                  <div className="flex-1 flex flex-col items-center md:items-start gap-3">
                    {/* Name row + dashboard toggle */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 w-full">
                      <div className="flex items-center gap-2 justify-center md:justify-start">
                        <h1 className="text-3xl font-bold text-gray-900">
                          {`${expert.userDetails.firstName} ${expert.userDetails.lastName}`}
                        </h1>
                        {isVerified && (
                          <div className="flex-shrink-0" title="Verified Expert">
                            <CheckCircle className="h-6 w-6 fill-blue-600 text-white" />
                          </div>
                        )}
                      </div>
                      {isExpertLoggedIn && (
                        <div className="flex justify-center md:justify-start space-x-2">
                          <Button
                            variant={isDashboardActive ? "default" : "outline"}
                            size="sm"
                            onClick={() => setIsDashboardActive(true)}
                            className="rounded-r-none border-r-0"
                          >
                            Dashboard
                          </Button>
                          <Button
                            variant={!isDashboardActive ? "default" : "outline"}
                            size="sm"
                            onClick={() => setIsDashboardActive(false)}
                            className="rounded-l-none"
                          >
                            Public View
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Position / org */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 justify-center md:justify-start">
                        <p className="text-lg text-blue-600 font-semibold">
                          {expert.currentPosition}
                        </p>
                        {isVerified && (
                          <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1 px-2">
                            <CheckCircle className="h-3 w-3 fill-blue-600 text-white" />
                            <span>Verified</span>
                          </Badge>
                        )}
                      </div>
                      <p className="text-base text-gray-600 flex items-center justify-center md:justify-start gap-2">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        {expert.organization}
                      </p>
                    </div>

                    {/* Social + Follow */}
                    <div className="flex items-center justify-center md:justify-start gap-3">
                      <SocialLinksDrawer socialLinks={expert.socialLinks} />
                      {!isExpertLoggedIn && (
                        <FollowButton
                          targetUserId={expert.userId}
                          className="flex-1 md:flex-none"
                        />
                      )}
                      {!isExpertLoggedIn && (
                        <ConnectButton
                          targetUserId={expert.userId}
                          className="flex-1 md:flex-none"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Profile Video — full-width, below top row ── */}
                <div className="mt-6 w-full">
                  <ProfileVideoPlayer expertId={expert.expertID} />
                </div>
              </div>
            </Card>
            {(!isExpertLoggedIn || !isDashboardActive) && (
              <Card id="book-meeting" className="p-6 bg-gradient-to-br from-white to-blue-50 shadow-lg scroll-mt-24">
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
                  </div>

                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3 text-gray-700 justify-center">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">60 minute session</span>
                    </div>
                  </div>

                  {/* Rating Component - only show for non-experts */}
                  {!isExpertLoggedIn && (
                    <div className="mt-4">
                      <RateExpert
                        expertId={expert.expertID}
                        userId={expert.userId}
                        currentRating={expert.rating}
                        onRatingUpdate={(newRating) => {
                          setExpert({
                            ...expert,
                            rating: newRating,
                          });
                        }}
                      />
                    </div>
                  )}

                  {/* Only show booking option if not the expert viewing their own profile */}
                  {!isExpertLoggedIn && (
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
                  )}

                  {/* Booking Calendar Modal */}
                  <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
                    <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
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
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Positioned directly below banner with no gap */}
      <div className="container mx-auto px-4 -mt-4">
        {isExpertLoggedIn && isDashboardActive ? (
          <ExpertDashboard expert={expert} expertInitials={initials} />
        ) : (
          <>
            <div className="mb-6">
              <Card>
                <CardContent className="pt-6">
                  <ExpertOverview expert={expert} />
                </CardContent>
              </Card>
            </div>

            <div className="mb-12">
              <Card>
                <Tabs defaultValue="posts" className="w-full">
                  <TabsList className="w-full justify-start border-b p-2 rounded-lg">
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
                        expertInitials={initials}
                        isExpertLoggedIn={isExpertLoggedIn}
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
          </>
        )}
      </div>
    </div>
  );
}
