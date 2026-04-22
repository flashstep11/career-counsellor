"use client";

import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, X, Image as ImageIcon, Video, FileUp } from "lucide-react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CreatePostProps {
  onPostCreated?: () => void;
}

export function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddTag = () => {
    if (tagInput.trim() && tags.length < 5) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setTags(tags.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("File size should be less than 10MB");
      return;
    }

    // Check file type
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      toast.error("Please select an image or video file");
      return;
    }

    setMediaFile(file);
    setMediaType(isImage ? "image" : "video");

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setMediaPreview(previewUrl);
  };

  const handleRemoveMedia = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handlePost = async () => {
    if (!content.trim()) {
      toast.error("Please write something to post");
      return;
    }

    setIsPosting(true);
    try {
      const token = localStorage.getItem("token");
      
      // If there's a media file, we need to upload it as FormData
      let requestBody;
      let headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };

      if (mediaFile) {
        const formData = new FormData();
        formData.append("content", content.trim());
        if (tags.length > 0) {
          formData.append("tags", JSON.stringify(tags));
        }
        formData.append("media", mediaFile);
        formData.append("mediaType", mediaType || "");
        requestBody = formData;
        // Don't set Content-Type for FormData, browser will set it with boundary
      } else {
        headers["Content-Type"] = "application/json";
        requestBody = JSON.stringify({
          content: content.trim(),
          tags: tags.length > 0 ? tags : undefined,
        });
      }

      const response = await fetch(`/api/posts`, {
        method: "POST",
        headers,
        body: requestBody,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to create post");
      }

      toast.success("Post created successfully!");
      setContent("");
      setTags([]);
      handleRemoveMedia();
      
      // Call the callback to refresh the feed
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create post");
    } finally {
      setIsPosting(false);
    }
  };

  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user?.email?.[0].toUpperCase() || "U";

  return (
    <Card className="bg-white rounded-xl shadow-sm border-0 overflow-hidden mb-6">
      <CardContent className="p-6">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 ring-1 ring-gray-200">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-sm">
              {userInitials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="What's on your mind? Share your thoughts, questions, or insights..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] resize-none text-sm border-gray-200 focus:border-blue-400 focus:ring-blue-400"
              disabled={isPosting}
            />

            {/* Media Preview */}
            {mediaPreview && (
              <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                {mediaType === "image" ? (
                  <img
                    src={mediaPreview}
                    alt="Upload preview"
                    className="w-full h-auto max-h-[400px] object-cover"
                  />
                ) : (
                  <video
                    src={mediaPreview}
                    controls
                    className="w-full h-auto max-h-[400px]"
                  />
                )}
                <button
                  onClick={handleRemoveMedia}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                  disabled={isPosting}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isPosting}
            />

            {/* Tags Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add tags (e.g., Career, Tech, Education)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="text-sm"
                  disabled={isPosting || tags.length >= 5}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || tags.length >= 5 || isPosting}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>

              {/* Display tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs"
                    >
                      <span>{tag}</span>
                      <button
                        onClick={() => handleRemoveTag(index)}
                        className="hover:bg-blue-100 rounded-full p-0.5"
                        disabled={isPosting}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {tags.length >= 5 && (
                <p className="text-xs text-gray-500">Maximum 5 tags allowed</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              {/* Media Upload Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={triggerFileInput}
                  disabled={isPosting || !!mediaFile}
                  className="gap-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                >
                  <ImageIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Photo/Video</span>
                </Button>
                {mediaFile && (
                  <span className="text-xs text-gray-500">
                    {mediaType === "image" ? "📷" : "🎥"} {mediaFile.name}
                  </span>
                )}
              </div>

              {/* Post Button */}
              <Button
                onClick={handlePost}
                disabled={!content.trim() || isPosting}
                className="gap-2"
              >
                {isPosting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    Post
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
