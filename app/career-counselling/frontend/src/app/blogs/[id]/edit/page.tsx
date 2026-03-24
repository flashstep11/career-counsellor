"use client";

import BlogEditor from "@/components/blogs/editor/blog-editor";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Blog } from "@/types";
import { Loader2 } from "lucide-react";

export default function EditBlogPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated and is an expert
    if (!authLoading && !user) {
      toast.error("You must be logged in to edit a blog");
      router.push("/login");
      return;
    } else if (!authLoading && user && !user.isExpert && !user.isAdmin) {
      toast.error("Only experts and admins can edit blogs");
      router.push("/blogs");
      return;
    }

    // Fetch the blog data if authenticated
    const fetchBlog = async () => {
      try {
        const response = await fetch(`/api/blogs/${params.id}`);
        if (!response.ok) {
          throw new Error("Blog not found");
        }
        const data = await response.json();

        // Check if the user is the author or an admin
        if (user && user._id !== data.userID && !user.isAdmin) {
          toast.error("You can only edit your own blogs");
          router.push(`/blogs/${params.id}`);
          return;
        }

        setBlog(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch blog");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchBlog();
    }
  }, [user, authLoading, router, params.id]);

  if (authLoading || loading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!blog) {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Edit Blog</h1>
      <BlogEditor blog={blog} isEdit={true} />
    </div>
  );
}
