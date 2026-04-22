"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  FileText,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Eye,
  Heart,
  Clock,
  Save,
  Loader2,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

interface BlogData {
  blogID: string;
  heading: string;
  body: string;
  refType: string;
  typeId?: string | null;
  views: number;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

export function BlogManagement() {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<BlogData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBlog, setCurrentBlog] = useState<BlogData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    heading: "",
    body: "",
    refType: "NA" as "NA" | "college" | "collegebranch",
    typeId: "",
  });

  useEffect(() => {
    fetchBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.expertId]);

  const fetchBlogs = async () => {
    if (!user?.expertId) return;
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/experts/${user.expertId}/blogs?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch blogs");
      const data = await response.json();
      setBlogs(data.blogs || []);
    } catch (error) {
      console.error("Error fetching blogs:", error);
      toast.error("Failed to load blogs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (blog?: BlogData) => {
    if (blog) {
      setIsEditing(true);
      setCurrentBlog(blog);
      setFormData({
        heading: blog.heading,
        body: blog.body,
        refType: (blog.refType as "NA" | "college" | "collegebranch") || "NA",
        typeId: blog.typeId || "",
      });
    } else {
      setIsEditing(false);
      setCurrentBlog(null);
      setFormData({ heading: "", body: "", refType: "NA", typeId: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.heading.trim() || !formData.body.trim()) {
      toast.error("Please fill in heading and content");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `/api/blogs/${currentBlog?.blogID}` : "/api/blogs";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          heading: formData.heading,
          body: formData.body,
          refType: formData.refType,
          typeId: formData.typeId || null,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to save blog");
      }

      toast.success(isEditing ? "Blog updated" : "Blog published successfully");
      setIsDialogOpen(false);
      fetchBlogs();
    } catch (error: unknown) {
      console.error("Error saving blog:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save blog");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (blogId: string) => {
    if (!confirm("Are you sure you want to delete this blog?")) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/blogs/${blogId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete blog");
      toast.success("Blog deleted");
      setBlogs((prev) => prev.filter((b) => b.blogID !== blogId));
    } catch (error) {
      console.error("Error deleting blog:", error);
      toast.error("Failed to delete blog");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Blog Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Write and manage your blog articles
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Write New Blog
        </Button>
      </div>

      {/* Blog List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-5/6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No blogs yet</h3>
            <p className="text-gray-600 mb-4">
              Start sharing your insights by writing your first blog post
            </p>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Write Your First Blog
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {blogs.map((blog) => (
            <Card key={blog.blogID} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-lg text-gray-900 line-clamp-1">
                        {blog.heading}
                      </h3>
                      {blog.refType && blog.refType !== "NA" && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {blog.refType}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {blog.body.replace(/[#*_`>[\]]/g, "").slice(0, 150).trim()}…
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/blogs/${blog.blogID}`} target="_blank">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenDialog(blog)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(blog.blogID)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Stats & Date */}
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{blog.views?.toLocaleString() ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    <span>{blog.likes ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    <Clock className="h-4 w-4" />
                    <span>
                      {formatDistanceToNow(new Date(blog.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Blog Post" : "Write New Blog Post"}
            </DialogTitle>
            <DialogDescription>
              Share your knowledge and insights with your audience
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="heading">
                Heading <span className="text-red-500">*</span>
              </Label>
              <Input
                id="heading"
                placeholder="Enter an engaging title for your blog..."
                value={formData.heading}
                onChange={(e) => setFormData({ ...formData, heading: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">
                Content <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="body"
                placeholder="Write your blog content here... (Markdown supported)"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                rows={14}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500">
                Markdown is supported. Use ** for bold, * for italic, # for headings, etc.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEditing ? "Save Changes" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
