"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Video,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Eye,
  Heart,
  MessageSquare,
  Clock,
  Upload,
  Link as LinkIcon,
  Loader2,
  Star,
  StarOff,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface VideoData {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnail?: string;
  views: number;
  likes: number;
  comments: number;
  createdAt: string;
  duration?: string;
  tags?: string[];
}

interface VideoManagementProps {
  expertId: string;
}

export function VideoManagement({ expertId }: VideoManagementProps) {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<VideoData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileVideoId, setProfileVideoId] = useState<string | null>(null);
  const [settingProfileVideo, setSettingProfileVideo] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    videoUrl: "",
    thumbnail: "",
    tags: "",
  });

  useEffect(() => {
    fetchVideos();
    fetchCurrentProfileVideo();
  }, [expertId]);

  /** Load which video is currently set as the profile video */
  const fetchCurrentProfileVideo = async () => {
    try {
      const res = await fetch(`/api/experts/${expertId}/profile-video`);
      if (res.status === 204 || !res.ok) return;
      const data = await res.json();
      setProfileVideoId(data.videoID ?? null);
    } catch {
      // silently ignore — no profile video set
    }
  };

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/videos/my-videos", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch videos");

      const data = await response.json();
      setVideos(data);
    } catch (error) {
      console.error("Error fetching videos:", error);
      toast.error("Failed to load videos");
    } finally {
      setIsLoading(false);
    }
  };

  /** Set or unset a video as the profile video */
  const handleSetProfileVideo = async (videoId: string) => {
    setSettingProfileVideo(videoId);
    try {
      const token = localStorage.getItem("token");
      // If already the profile video, clear it; otherwise set it
      const newVideoId = profileVideoId === videoId ? null : videoId;

      const res = await fetch(`/api/experts/${expertId}/profile-video`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ video_id: newVideoId }),
      });

      if (!res.ok) throw new Error("Failed to update profile video");

      setProfileVideoId(newVideoId);
      toast.success(
        newVideoId
          ? "Profile video set successfully!"
          : "Profile video cleared."
      );
    } catch (error) {
      console.error("Error setting profile video:", error);
      toast.error("Failed to update profile video");
    } finally {
      setSettingProfileVideo(null);
    }
  };

  const handleOpenDialog = (video?: VideoData) => {
    if (video) {
      setIsEditing(true);
      setCurrentVideo(video);
      setFormData({
        title: video.title,
        description: video.description,
        videoUrl: video.videoUrl,
        thumbnail: video.thumbnail || "",
        tags: video.tags?.join(", ") || "",
      });
    } else {
      setIsEditing(false);
      setCurrentVideo(null);
      setFormData({
        title: "",
        description: "",
        videoUrl: "",
        thumbnail: "",
        tags: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.videoUrl) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `/api/videos/${currentVideo?.id}` : "/api/videos";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          videoUrl: formData.videoUrl,
          thumbnail: formData.thumbnail,
          tags: formData.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag),
        }),
      });

      if (!response.ok) throw new Error("Failed to save video");

      toast.success(isEditing ? "Video updated successfully" : "Video uploaded successfully");
      setIsDialogOpen(false);
      fetchVideos();
    } catch (error) {
      console.error("Error saving video:", error);
      toast.error("Failed to save video");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm("Are you sure you want to delete this video?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/videos/${videoId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete video");

      // If the deleted video was the profile video, clear it
      if (profileVideoId === videoId) setProfileVideoId(null);
      toast.success("Video deleted successfully");
      fetchVideos();
    } catch (error) {
      console.error("Error deleting video:", error);
      toast.error("Failed to delete video");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Video Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Upload and manage your educational videos. Mark one as your{" "}
            <span className="text-blue-600 font-medium">Profile Video</span> to
            feature it at the top of your public profile.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Upload Video
        </Button>
      </div>

      {/* Video Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-video bg-gray-200" />
              <CardContent className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Video className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No videos yet
            </h3>
            <p className="text-gray-600 mb-4">
              Start sharing your knowledge by uploading your first video
            </p>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Upload Your First Video
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => {
            const isProfileVideo = profileVideoId === video.id;
            const isSetting = settingProfileVideo === video.id;

            return (
              <Card
                key={video.id}
                className={`overflow-hidden hover:shadow-lg transition-shadow ${
                  isProfileVideo ? "ring-2 ring-blue-500 ring-offset-1" : ""
                }`}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gray-100">
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                      <Video className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  {video.duration && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 text-white text-xs rounded">
                      {video.duration}
                    </div>
                  )}
                  {/* Profile video badge */}
                  {isProfileVideo && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-full shadow">
                      <Star className="h-3 w-3 fill-white" />
                      Profile Video
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  {/* Title & Actions */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">
                      {video.title}
                    </h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(video)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(video.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {video.description}
                  </p>

                  {/* Tags */}
                  {video.tags && video.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {video.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{video.views.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      <span>{video.likes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>{video.comments}</span>
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                      <Clock className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>

                  {/* Set as Profile Video button */}
                  <Button
                    variant={isProfileVideo ? "default" : "outline"}
                    size="sm"
                    className={`w-full gap-2 text-xs ${
                      isProfileVideo
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "border-blue-300 text-blue-600 hover:bg-blue-50"
                    }`}
                    onClick={() => handleSetProfileVideo(video.id)}
                    disabled={isSetting}
                  >
                    {isSetting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : isProfileVideo ? (
                      <StarOff className="h-3 w-3" />
                    ) : (
                      <Star className="h-3 w-3" />
                    )}
                    {isProfileVideo ? "Remove as Profile Video" : "Set as Profile Video"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Video" : "Upload New Video"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update your video details below"
                : "Fill in the details to upload your video"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Video Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Introduction to Machine Learning"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="videoUrl">
                Video URL <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="videoUrl"
                    placeholder="https://youtube.com/watch?v=... or direct video URL"
                    value={formData.videoUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, videoUrl: e.target.value })
                    }
                    className="pl-10"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                YouTube, Vimeo, or direct video file URLs supported
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumbnail">Thumbnail URL (Optional)</Label>
              <Input
                id="thumbnail"
                placeholder="https://example.com/thumbnail.jpg"
                value={formData.thumbnail}
                onChange={(e) =>
                  setFormData({ ...formData, thumbnail: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe what viewers will learn from this video..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (Optional)</Label>
              <Input
                id="tags"
                placeholder="e.g., Machine Learning, AI, Python (comma-separated)"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEditing ? "Updating..." : "Uploading..."}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {isEditing ? "Update Video" : "Upload Video"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
