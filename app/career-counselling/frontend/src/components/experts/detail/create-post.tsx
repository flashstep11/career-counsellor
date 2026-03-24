"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import MarkdownViewer from "@/components/shared/markdown-viewer";
import { toast } from "sonner";

interface CreatePostProps {
  expertId: string;
  expertInitials: string;
  onPostCreated: () => void;
}

export default function CreatePost({
  expertId,
  expertInitials,
  onPostCreated,
}: CreatePostProps) {
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState("write");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enhancingContent, setEnhancingContent] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError("Post content cannot be empty");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          content,
          expertId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to create post");
      }

      setContent("");
      setActiveTab("write");
      toast.success("Post created successfully!");
      onPostCreated();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create post. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Handle content enhancement with AI
  const handleEnhanceContent = async () => {
    if (!content.trim()) {
      setError("Please add some content to enhance");
      return;
    }

    try {
      setError(null);
      setEnhancingContent(true);
      const token = localStorage.getItem("token");

      if (!token) {
        setError("You must be logged in to enhance content");
        return;
      }

      const response = await fetch("/api/chatbot/enhance-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: content,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to enhance content");
      }

      const data = await response.json();
      setContent(data.enhanced_content);
      toast.success("Content enhanced successfully!");
    } catch (err) {
      console.error("Error enhancing content:", err);
      setError("Failed to enhance content. Please try again.");
    } finally {
      setEnhancingContent(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-blue-100 text-blue-700">
              {expertInitials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="w-full"
            >
              <div className="flex justify-between items-center mb-2">
                <TabsList>
                  <TabsTrigger value="write">Write</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleEnhanceContent}
                  disabled={enhancingContent || !content.trim()}
                  className="flex items-center gap-1 text-xs ml-2"
                >
                  {enhancingContent ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Enhancing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 text-yellow-500" />
                      <span>Enhance</span>
                    </>
                  )}
                </Button>
              </div>

              <TabsContent value="write" className="mt-0 relative">
                {enhancingContent && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 z-10 flex flex-col items-center justify-center">
                    <div className="wheel-and-hamster">
                      <div className="wheel"></div>
                      <div className="hamster">
                        <div className="hamster__body">
                          <div className="hamster__head">
                            <div className="hamster__ear"></div>
                            <div className="hamster__eye"></div>
                            <div className="hamster__nose"></div>
                          </div>
                          <div className="hamster__limb hamster__limb--fr"></div>
                          <div className="hamster__limb hamster__limb--fl"></div>
                          <div className="hamster__limb hamster__limb--br"></div>
                          <div className="hamster__limb hamster__limb--bl"></div>
                          <div className="hamster__tail"></div>
                        </div>
                      </div>
                      <div className="spoke"></div>
                    </div>
                    <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enhancing content with AI...
                    </p>
                  </div>
                )}
                <Textarea
                  placeholder="Share your expertise or updates with your followers..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[120px] resize-none focus-visible:ring-blue-500 h-96"
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500 mt-1">
                    You can use Markdown formatting for rich text.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-0">
                <div className="min-h-[120px] border rounded-md p-3 prose prose-blue max-w-none overflow-auto h-96">
                  {content ? (
                    <MarkdownViewer content={content} />
                  ) : (
                    <p className="text-gray-400">Nothing to preview</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-end border-t bg-gray-50/80 px-6 py-3">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? "Posting..." : "Post"}
        </Button>
      </CardFooter>
    </Card>
  );
}
