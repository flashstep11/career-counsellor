"use client";

import { use, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Video } from "@/types";
import MarkdownViewer from "../shared/markdown-viewer";

interface VideoDescriptionProps {
  video: Video;
}

export default function VideoDescription({ video }: VideoDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="mt-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <div className="space-x-2">
            <span>{video.views} views</span>
            <span>•</span>
            <span>
              {new Date(video.createdAt).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        <div
          className={`relative ${!isExpanded && "max-h-20 overflow-hidden"}`}
        >
          <MarkdownViewer content={video.description}></MarkdownViewer>
          {!isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
          )}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-1 mt-2 text-gray-500 hover:text-gray-700"
        >
          <span>{isExpanded ? "Show less" : "Show more"}</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        <div className="mt-4 flex flex-wrap gap-2">
          {video.tags.map((tag: string) => (
            <span
              key={tag}
              className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
