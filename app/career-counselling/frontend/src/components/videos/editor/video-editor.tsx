"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  Save,
  X,
  Tag as TagIcon,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Video } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarkdownViewer from "@/components/shared/markdown-viewer";
import axios from "axios";

interface VideoEditorProps {
  video?: Video; // Optional for edit mode
  isEdit?: boolean;
}

interface Option {
  value: string;
  label: string;
}

export default function VideoEditor({
  video,
  isEdit = false,
}: VideoEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    youtubeUrl: "",
    tags: [] as string[],
    previewDuration: 120,
    refType: "NA" as "college" | "collegebranch" | "NA",
    typeId: "",
  });
  const [tagInput, setTagInput] = useState("");
  const [collegeOptions, setCollegeOptions] = useState<Option[]>([]);
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [enhancingContent, setEnhancingContent] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("write");

  // Clear any pending timeout on unmount
  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  // Populate form when editing
  useEffect(() => {
    if (isEdit && video) {
      setFormData({
        title: video.title,
        description: video.description,
        youtubeUrl: video.youtubeUrl,
        tags: video.tags || [],
        previewDuration: video.previewDuration || 120,
        refType: video.refType || "NA",
        typeId: video.typeId || "",
      });
    }
  }, [isEdit, video]);

  // Load college or branch options when refType changes
  useEffect(() => {
    if (formData.refType === "NA") {
      setSelectedOption(null);
      return;
    }

    setLoadingOptions(true);
    const endpoint =
      formData.refType === "college"
        ? "/api/colleges/options"
        : "/api/branches/options";

    axios
      .get<Option[]>(endpoint)
      .then((res) => {
        if (formData.refType === "college") {
          setCollegeOptions(res.data);
        } else {
          setBranchOptions(res.data);
        }

        if (isEdit && formData.typeId) {
          const match = res.data.find((opt) => opt.value === formData.typeId);
          if (match) setSelectedOption(match);
        }
      })
      .catch(() => {
        toast.error(`Failed to load ${formData.refType} options`);
      })
      .finally(() => {
        setLoadingOptions(false);
      });
  }, [formData.refType, isEdit, formData.typeId]);

  // Centralized notification
  const showNotification = (type: "success" | "error", message: string) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }

    setNotification({ type, message });
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 1500);
  };

  // Form field handlers
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((fd) => ({ ...fd, [name]: value }));
  };

  // Handle content enhancement with AI
  const handleEnhanceContent = async () => {
    if (!formData.description.trim()) {
      showNotification("error", "Please add some content to enhance");
      return;
    }

    try {
      setEnhancingContent(true);
      const token = localStorage.getItem("token");

      if (!token) {
        showNotification("error", "You must be logged in to enhance content");
        return;
      }

      const response = await fetch("/api/chatbot/enhance-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: formData.description,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to enhance content");
      }

      const data = await response.json();
      setFormData((prev) => ({ ...prev, description: data.enhanced_content }));
      showNotification("success", "Content enhanced successfully!");
    } catch (error) {
      console.error("Error enhancing content:", error);
      showNotification("error", "Failed to enhance content. Please try again.");
    } finally {
      setEnhancingContent(false);
    }
  };

  const handleSelectChange = (value: string) => {
    setFormData((fd) => ({ ...fd, refType: value as any, typeId: "" }));
    setSelectedOption(null);
  };

  const handleOptionSelect = (value: string) => {
    setFormData((fd) => ({ ...fd, typeId: value }));
    const opts =
      formData.refType === "college" ? collegeOptions : branchOptions;
    setSelectedOption(opts.find((o) => o.value === value) || null);
  };

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (t && !formData.tags.includes(t)) {
      setFormData((fd) => ({ ...fd, tags: [...fd.tags, t] }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((fd) => ({
      ...fd,
      tags: fd.tags.filter((t) => t !== tag),
    }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Submit with custom validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    // Custom required-field check
    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
      !formData.youtubeUrl.trim() ||
      (formData.refType !== "NA" && !formData.typeId.trim())
    ) {
      showNotification("error", "Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showNotification("error", "You must be logged in");
        router.push("/login");
        return;
      }

      // Normalize YouTube URLs
      let yt = formData.youtubeUrl.trim();
      if (!yt.startsWith("http")) yt = "https://" + yt;
      if (yt.includes("youtube.com/watch?v=")) {
        const id = new URL(yt).searchParams.get("v");
        yt = `https://www.youtube.com/embed/${id}`;
      } else if (yt.includes("youtu.be/")) {
        const id = yt.split("youtu.be/")[1].split("?")[0];
        yt = `https://www.youtube.com/embed/${id}`;
      }

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        youtubeUrl: yt,
        previewDuration: Number(formData.previewDuration),
        tags: formData.tags.filter((t) => t.trim() !== ""),
        refType: formData.refType,
        typeId: formData.refType === "NA" ? null : formData.typeId.trim(),
      };

      const endpoint = isEdit ? `/api/videos/${video?.videoID}` : "/api/videos";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        let msg = "Failed to save video";
        try {
          const err = JSON.parse(txt);
          msg = err.detail || err.message || msg;
        } catch {
          // ignore parse error
        }
        throw new Error(msg);
      }

      await res.json();
      if (isEdit) {
        showNotification("success", "Video updated successfully!");
        setTimeout(() => router.push(`/videos/${video?.videoID}`), 3500);
      } else {
        showNotification("success", "Video created successfully!");
        // reset form
        setFormData({
          title: "",
          description: "",
          youtubeUrl: "",
          tags: [],
          previewDuration: 120,
          refType: "NA",
          typeId: "",
        });
        setTagInput("");
        setSelectedOption(null);
      }
    } catch (err: any) {
      showNotification(
        "error",
        err.message || "An error occurred while saving the video"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      {/* Centralized notification */}
      {notification && (
        <div
          className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50
            px-6 py-4 rounded-lg shadow-lg flex items-center
            ${
              notification.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="h-6 w-6 mr-3" />
          ) : (
            <X className="h-6 w-6 mr-3" />
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Edit Video" : "Add New Video"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
              />
            </div>

            {/* YouTube URL */}
            <div className="space-y-2">
              <label htmlFor="youtubeUrl" className="text-sm font-medium">
                YouTube URL
              </label>
              <Input
                id="youtubeUrl"
                name="youtubeUrl"
                value={formData.youtubeUrl}
                onChange={handleInputChange}
                type="url"
              />
              <p className="text-xs text-gray-500">
                Paste the full YouTube embed URL
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Tabs defaultValue="write" onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="write">Write</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="write">
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={10}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleEnhanceContent}
                    disabled={enhancingContent}
                    className="mt-2"
                  >
                    {enhancingContent ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Enhance Content
                      </>
                    )}
                  </Button>
                </TabsContent>
                <TabsContent value="preview">
                  <div className="border rounded-md p-4 min-h-[15rem]">
                    <MarkdownViewer content={formData.description} />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Preview Duration */}
            <div className="space-y-2">
              <label htmlFor="previewDuration" className="text-sm font-medium">
                Preview Duration (seconds)
              </label>
              <Input
                id="previewDuration"
                name="previewDuration"
                value={formData.previewDuration}
                onChange={handleInputChange}
                type="number"
                min={0}
              />
              <p className="text-xs text-gray-500">
                Non-premium users preview length
              </p>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Add a tag and press Enter"
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  <TagIcon className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((t) => (
                    <Badge key={t} className="flex items-center gap-1">
                      {t}
                      <button type="button" onClick={() => handleRemoveTag(t)}>
                        <X className="h-3 w-3 text-red-500" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Reference Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Reference Type</label>
              <Select
                value={formData.refType}
                onValueChange={handleSelectChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a reference type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NA">None (General Video)</SelectItem>
                  <SelectItem value="college">College Specific</SelectItem>
                  <SelectItem value="collegebranch">Branch Specific</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* College/Branch Selector */}
            {formData.refType !== "NA" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {formData.refType === "college"
                    ? "Select College"
                    : "Select Branch"}
                </label>
                {loadingOptions ? (
                  <div className="flex items-center gap-2 p-2 border rounded">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading options...</span>
                  </div>
                ) : (
                  <Select
                    value={formData.typeId}
                    onValueChange={handleOptionSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose one" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-auto">
                      {(formData.refType === "college"
                        ? collegeOptions
                        : branchOptions
                      ).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedOption && (
                  <p className="text-xs text-gray-500">
                    Selected: {selectedOption.label}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEdit ? "Update" : "Publish"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
