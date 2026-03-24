import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Clock, Eye, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import RandomImage from "../shared/random-image";
import { Blog } from "@/types";

interface FeaturedBlogProps {
  blog: Blog;
}

export default function FeaturedBlog({ blog }: FeaturedBlogProps) {
  const { author } = blog;
  const authorName = `${author.firstName} ${author.middleName || ""} ${
    author.lastName
  }`.trim();

  return (
    <Card className="overflow-hidden">
      <Link href={`/blogs/${blog.blogID}`}>
        <div className="flex flex-col md:flex-row">
          <div className="relative h-64 md:h-auto md:w-1/2">
            <RandomImage
              alt={blog.heading}
              fill
              className="object-cover"
            ></RandomImage>
          </div>
          <CardContent className="flex-1 p-6 md:p-8">
            {blog.refType !== "NA" && (
              <div className="flex items-center space-x-2 mb-4">
                <span className="bg-primary-lavender text-primary-blue px-3 py-1 rounded-full text-sm">
                  {blog.refType}
                </span>
              </div>
            )}
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              {blog.heading}
            </h2>
            <p className="text-gray-600 mb-6 line-clamp-3">
              {blog.body.substring(0, 200)}...
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarFallback>{author.firstName[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{authorName}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(blog.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{blog.views || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Heart className="h-4 w-4" />
                  <span>{blog.likes || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{`${Math.max(
                    1,
                    Math.ceil(blog.body.split(/\s+/).length / 200)
                  )} min read`}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </Link>
    </Card>
  );
}
