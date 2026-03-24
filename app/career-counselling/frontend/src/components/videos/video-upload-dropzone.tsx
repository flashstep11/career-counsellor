"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoUploadDropzoneProps {
  onFileSelect: (file: File) => void;
  file: File | null;
}

export default function VideoUploadDropzone({
  onFileSelect,
  file,
}: VideoUploadDropzoneProps) {
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles[0]) {
        onFileSelect(acceptedFiles[0]);
        // Simulate upload progress
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          setUploadProgress(progress);
          if (progress >= 100) clearInterval(interval);
        }, 500);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".mov", ".avi", ".mkv"],
    },
    maxFiles: 1,
    multiple: false,
  });

  return (
    <div>
      {!file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${
              isDragActive
                ? "border-primary-blue bg-primary-lavender/20"
                : "border-gray-300"
            }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium mb-2">
            {isDragActive
              ? "Drop the video file here"
              : "Drag and drop your video file here"}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            or click to select a file
          </p>
          <p className="text-xs text-gray-400">
            Supported formats: MP4, MOV, AVI, MKV
          </p>
        </div>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Video className="h-8 w-8 text-primary-blue" />
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onFileSelect(null as any);
                setUploadProgress(0);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-4">
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-primary-blue rounded-full transition-all duration-500"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Uploading: {uploadProgress}%
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
