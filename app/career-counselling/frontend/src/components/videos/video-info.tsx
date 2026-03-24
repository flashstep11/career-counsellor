import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, Share2, Flag, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { Video } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ExpertHoverCard from "@/components/experts/expert-hover-card";
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
import { useState, useEffect } from "react";
import SystemShareButton from "../shared/system-share-button";

interface VideoInfoProps {
  video: Video;
}

export default function VideoInfo({ video }: VideoInfoProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(video.likes || 0);

  // Check if the current user is the owner of the video or an admin
  const isOwner = user && (user._id === video.userId || user.isAdmin);

  // Check if the current user has liked this video
  useEffect(() => {
    const checkIfLiked = async () => {
      try {
        if (!user) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await fetch(
          `/api/videos/${video.videoID}/like/check`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setIsLiked(data.liked);
          setLikeCount(data.likes);
        }
      } catch (error) {
        console.error("Error checking like status:", error);
      }
    };

    checkIfLiked();
  }, [video.videoID, user]);

  // Handle like/unlike
  const handleLike = async () => {
    if (!user) {
      toast.error("You must be logged in to like videos");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/videos/${video.videoID}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to update like");
      }

      const data = await response.json();
      setIsLiked(!isLiked);
      setLikeCount(data.likes);
    } catch (error) {
      toast.error("Failed to update like");
      console.error("Error liking video:", error);
    }
  };

  const handleEdit = () => {
    router.push(`/videos/${video.videoID}/edit`);
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);

      // Store video data for potential undo
      const videoToDelete = { ...video };

      // Show toast with undo option
      toast("Video deleted", {
        description: "Your video has been removed",
        action: {
          label: "Undo",
          onClick: () => {
            setIsDeleting(false);
            toast.success("Video restored successfully");
          },
        },
        duration: 5000, // 5 seconds before permanent deletion
        onAutoClose: async () => {
          // Permanently delete the video after toast disappears
          try {
            const token = localStorage.getItem("token");
            const response = await fetch(`/api/videos/${video.videoID}`, {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            });

            if (!response.ok) {
              throw new Error("Failed to delete video");
            }

            router.push("/videos");
          } catch (error) {
            console.error("Error deleting video:", error);
            toast.error("Failed to delete video. Please try again.");
            setIsDeleting(false);
          }
        },
      });
    } catch (error) {
      console.error("Error deleting video:", error);
      toast.error("Failed to delete video. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{video.title}</h1>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <Link href={`/profile/${video.userId}`}>
              <Avatar className="cursor-pointer hover:opacity-80 transition-opacity">
                <AvatarFallback>
                  {`${video.expertDetails.userDetails.firstName[0]}${video.expertDetails.userDetails.lastName[0]}`}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div>
              {/* Details of the expert who is featured in the video with hover card */}
              <ExpertHoverCard expertId={video.expertDetails.expertID}>
                <Link href={`/profile/${video.userId}`} className="font-semibold hover:text-indigo-600 transition-colors">
                  {`${video.expertDetails.userDetails.firstName} ${video.expertDetails.userDetails.lastName}`}
                </Link>
              </ExpertHoverCard>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className={`space-x-2 ${
              isLiked ? "text-primary-blue border-primary-blue" : ""
            }`}
            onClick={handleLike}
          >
            <Heart
              className={`h-4 w-4 ${isLiked ? "fill-primary-blue" : ""}`}
            />
            <span>{likeCount > 0 ? likeCount : "Like"}</span>
          </Button>
          <SystemShareButton
            url={typeof window !== "undefined" ? window.location.href : ""}
            title={video.title}
            text="Check this out!"
          />

          {isOwner && (
            <>
              <Button
                variant="outline"
                className="space-x-2"
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      your video from the platform.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
