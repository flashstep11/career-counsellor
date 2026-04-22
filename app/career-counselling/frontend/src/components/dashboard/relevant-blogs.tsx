"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { Blog } from "@/types";
import axios from "axios";

export function RelevantBlogs() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRelevantBlogs = async () => {
      try {
        setLoading(true);
        // Fetch recent blogs with limit of 5
        const response = await axios.get("/api/blogs", {
          params: {
            limit: 5, 
            sortBy: "recent"
          }
        });

        // Handle both paginated and non-paginated responses
        const blogsData = response.data.blogs || response.data;
        setBlogs(blogsData);
      } catch (err) {
        console.error("Error fetching relevant blogs:", err);
        setError("Failed to load recommended blogs");
      } finally {
        setLoading(false);
      }
    };

    fetchRelevantBlogs();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Recommended Reads</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">{error}</div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No blogs available</div>
        ) : (
          <div className="space-y-4">
            {blogs.map((blog) => {
              const authorName = `${blog.author.firstName} ${blog.author.middleName || ""} ${blog.author.lastName || ""}`.trim();
              const readTime = `${Math.max(1, Math.ceil(blog.body.split(/\s+/).length / 200))} min read`;
              
              return (
                <Link href={`/blogs/${blog.blogID}`} key={blog.blogID}>
                  <div className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                    <Avatar>
                      <AvatarFallback>{authorName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-secondary-darkGray line-clamp-2">
                        {blog.heading}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>{authorName}</span>
                        <span>•</span>
                        <span>{readTime}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
