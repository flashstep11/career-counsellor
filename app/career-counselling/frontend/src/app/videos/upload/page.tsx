"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X } from "lucide-react";
import VideoUploadDropzone from "@/components/videos/video-upload-dropzone";

export default function VideoUploadPage() {
  const router = useRouter();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    setUploading(true);
    // Implement upload logic
    setUploading(false);
    router.push("/videos");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Upload Video</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Video Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Video File</CardTitle>
          </CardHeader>
          <CardContent>
            <VideoUploadDropzone
              onFileSelect={(file) => setVideoFile(file)}
              file={videoFile}
            />
          </CardContent>
        </Card>

        {/* Video Details Section */}
        <Card>
          <CardHeader>
            <CardTitle>Video Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Enter video title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Enter video description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Thumbnail</label>
              <div className="border-2 border-dashed rounded-lg p-4">
                {/* Implement thumbnail upload */}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-primary-lavender text-primary-blue px-3 py-1 rounded-full text-sm flex items-center"
                  >
                    {tag}
                    <button
                      onClick={() =>
                        setTags(tags.filter((_, i) => i !== index))
                      }
                      className="ml-2"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                ))}
                <Input
                  placeholder="Add tags"
                  className="w-32"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = e.currentTarget;
                      if (input.value) {
                        setTags([...tags, input.value]);
                        input.value = "";
                      }
                    }
                  }}
                />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleUpload}
              disabled={!videoFile || !title || uploading}
            >
              {uploading ? "Uploading..." : "Upload Video"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
