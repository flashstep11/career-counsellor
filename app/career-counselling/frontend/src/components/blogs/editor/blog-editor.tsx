"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Blog } from "@/types";
import axios from "axios";
import MarkdownViewer from "@/components/shared/markdown-viewer";

interface BlogEditorProps {
  blog?: Blog; // Optional for editing mode
  isEdit?: boolean;
}

// Define option type for dropdowns
interface Option {
  value: string;
  label: string;
}

export default function BlogEditor({ blog, isEdit = false }: BlogEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("write");
  const [formData, setFormData] = useState({
    heading: "",
    body: "",
    refType: "NA" as "college" | "collegebranch" | "NA",
    typeId: "",
  });
  const [enhancingContent, setEnhancingContent] = useState(false);

  // State for dropdown options
  const [collegeOptions, setCollegeOptions] = useState<Option[]>([]);
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);

  // If in edit mode, populate the form with existing blog data
  useEffect(() => {
    if (isEdit && blog) {
      setFormData({
        heading: blog.heading,
        body: blog.body,
        refType: blog.refType,
        typeId: blog.typeId || "",
      });

      // If editing and has a typeId, we'll need to find the corresponding option later
    }
  }, [isEdit, blog]);

  // Fetch college and branch options when refType changes
  useEffect(() => {
    const fetchOptions = async () => {
      if (formData.refType === "NA") {
        setSelectedOption(null);
        return;
      }

      setLoadingOptions(true);

      try {
        const endpoint =
          formData.refType === "college"
            ? "/api/colleges/options"
            : "/api/branches/options";

        const response = await axios.get(endpoint);
        const options = response.data;

        if (formData.refType === "college") {
          setCollegeOptions(options);
        } else {
          setBranchOptions(options);
        }

        // If we have a typeId and are in edit mode, find the corresponding option
        if (isEdit && formData.typeId) {
          const matchingOption = options.find(
            (option: Option) => option.value === formData.typeId
          );
          if (matchingOption) {
            setSelectedOption(matchingOption);
          }
        }
      } catch (error) {
        console.error(`Error fetching ${formData.refType} options:`, error);
        toast.error(`Failed to load ${formData.refType} options`);
      } finally {
        setLoadingOptions(false);
      }
    };

    if (formData.refType !== "NA") {
      fetchOptions();
    }
  }, [formData.refType, isEdit, formData.typeId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (value: string) => {
    setFormData({
      ...formData,
      refType: value as "college" | "collegebranch" | "NA",
      typeId: "", // Reset typeId when refType changes
    });
    setSelectedOption(null);
  };

  const handleOptionSelect = (value: string) => {
    setFormData({ ...formData, typeId: value });

    const options =
      formData.refType === "college" ? collegeOptions : branchOptions;
    const selected = options.find((option) => option.value === value);
    setSelectedOption(selected || null);
  };

  // Handle content enhancement with AI
  const handleEnhanceContent = async () => {
    if (!formData.body.trim()) {
      toast.error("Please add some content to enhance");
      return;
    }

    try {
      setEnhancingContent(true);
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("You must be logged in to enhance content");
        return;
      }

      const response = await fetch("/api/chatbot/enhance-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: formData.body,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to enhance content");
      }

      const data = await response.json();
      setFormData({ ...formData, body: data.enhanced_content });
      toast.success("Content enhanced successfully!");
    } catch (error) {
      console.error("Error enhancing content:", error);
      toast.error("Failed to enhance content. Please try again.");
    } finally {
      setEnhancingContent(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Don't proceed if already submitting
    if (loading) return;

    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("You must be logged in to create or edit a blog");
        router.push("/login");
        return;
      }

      const endpoint = isEdit ? `/api/blogs/${blog?.blogID}` : "/api/blogs";

      const method = isEdit ? "PUT" : "POST";

      // Only include typeId if refType is not "NA"
      const payload = {
        heading: formData.heading,
        body: formData.body,
        refType: formData.refType,
        ...(formData.refType !== "NA" && { typeId: formData.typeId }),
      };

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server error:", errorData);
        throw new Error(errorData.detail || "Failed to save blog");
      }

      const data = await response.json();

      toast.success(
        isEdit ? "Blog updated successfully!" : "Blog created successfully!"
      );

      // Redirect to the blog post
      router.push(`/blogs/${data.blogID}`);
    } catch (error) {
      console.error("Error saving blog:", error);
      toast.error("Failed to save blog. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Edit Blog" : "Create New Blog"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="heading" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="heading"
                name="heading"
                value={formData.heading}
                onChange={handleInputChange}
                required
                placeholder="Enter a title for your blog"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="body" className="text-sm font-medium">
                  Content
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleEnhanceContent}
                  disabled={enhancingContent || !formData.body.trim()}
                  className="flex items-center gap-1 text-xs"
                >
                  {enhancingContent ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Enhancing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 text-yellow-500" />
                      <span>Enhance Content</span>
                    </>
                  )}
                </Button>
              </div>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="mb-2">
                  <TabsTrigger value="write">Write</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>

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
                    id="body"
                    name="body"
                    value={formData.body}
                    onChange={handleInputChange}
                    required
                    placeholder="Write your blog content here (supports Markdown)"
                    rows={15}
                    className="font-mono resize-none focus-visible:ring-blue-500"
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500 mt-1">
                      This editor supports Markdown formatting.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="mt-0">
                  <div className="min-h-[350px] border rounded-md p-4 prose prose-blue max-w-none overflow-auto">
                    {formData.body ? (
                      <>
                        <h1>{formData.heading}</h1>
                        <MarkdownViewer content={formData.body} />
                      </>
                    ) : (
                      <p className="text-gray-400">Nothing to preview</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-2">
              <label htmlFor="refType" className="text-sm font-medium">
                Type
              </label>
              <Select
                value={formData.refType}
                onValueChange={handleSelectChange}
              >
                <SelectTrigger id="refType">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NA">General</SelectItem>
                  <SelectItem value="college">College Specific</SelectItem>
                  <SelectItem value="collegebranch">Branch Specific</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.refType !== "NA" && (
              <div className="space-y-2">
                <label htmlFor="typeId" className="text-sm font-medium">
                  {formData.refType === "college"
                    ? "Select College"
                    : "Select Branch"}
                </label>

                {loadingOptions ? (
                  <div className="flex items-center space-x-2 h-10 px-3 border rounded">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-500">
                      Loading options...
                    </span>
                  </div>
                ) : (
                  <Select
                    value={formData.typeId}
                    onValueChange={handleOptionSelect}
                  >
                    <SelectTrigger id="typeId">
                      <SelectValue
                        placeholder={`Select a ${
                          formData.refType === "college" ? "college" : "branch"
                        }`}
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {(formData.refType === "college"
                        ? collegeOptions
                        : branchOptions
                      ).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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

            <div className="flex justify-end space-x-4">
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
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
