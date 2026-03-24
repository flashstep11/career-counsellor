"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface WelcomeHeaderProps {
  userName?: string;
  userLastName?: string;
  profilePictureUrl?: string | null;
  unreadReplies?: number;
  upcomingMeetingsToday?: number;
  onFindMentor?: () => void;
}

export function WelcomeHeader({
  userName,
  userLastName,
  profilePictureUrl,
  unreadReplies = 0,
  upcomingMeetingsToday = 0,
}: WelcomeHeaderProps) {
  const router = useRouter();

  const initials =
    `${userName?.[0] ?? ""}${userLastName?.[0] ?? ""}`.toUpperCase() || "U";

  return (
    <div className="h-full flex flex-col justify-center">
      {/* Avatar row */}
      <div className="flex items-center gap-4 mb-4">
        <Avatar className="h-16 w-16 ring-4 ring-white shadow-md flex-shrink-0">
          <AvatarImage
            src={profilePictureUrl ?? ""}
            alt={userName ?? "User"}
          />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          Welcome back{userName ? `, ${userName}` : ""}!{" "}
          <span className="animate-wave inline-block origin-[70%_70%] text-3xl">👋</span>
        </h1>
      </div>

      <p className="text-gray-600 text-sm mb-5">
        {unreadReplies > 0 || upcomingMeetingsToday > 0 ? (
          <>
            You have{" "}
            {unreadReplies > 0 && (
              <>
                <span className="font-semibold text-blue-600">
                  {unreadReplies} unread {unreadReplies === 1 ? "reply" : "replies"}
                </span>
                {upcomingMeetingsToday > 0 && " and "}
              </>
            )}
            {upcomingMeetingsToday > 0 && (
              <span className="font-semibold text-indigo-600">
                {upcomingMeetingsToday} upcoming{" "}
                {upcomingMeetingsToday === 1 ? "meeting" : "meetings"} today
              </span>
            )}
          </>
        ) : (
          "Track your career exploration progress and discover new opportunities."
        )}
      </p>

      <div>
        <Button
          variant="outline"
          size="lg"
          className="bg-white shadow-md hover:shadow-xl transition-all border-purple-200 text-gray-700 font-semibold group h-9 px-4 text-sm"
          onClick={() => router.push("/profile")}
        >
          <UserCircle className="h-4 w-4 mr-2 text-purple-600 group-hover:scale-110 transition-transform" />
          Update Profile
        </Button>
      </div>

      <style jsx>{`
        @keyframes wave {
          0% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
          60% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-wave {
          animation: wave 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
