"use client";

import { useState, useEffect } from "react";
import RandomImage from "@/components/shared/random-image";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Blog } from "@/types";
import axios from "axios";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface ExpertBlogsProps {
  expertId: string | number;
}

export default function ExpertBlogs({ expertId }: ExpertBlogsProps) {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(3);

  useEffect(() => {
    const fetchExpertBlogs = async () => {
      setLoading(true);
      setError(null);

      try {
        // Update API call to support pagination
        const response = await axios.get(
          `/api/experts/${expertId}/blogs?page=${currentPage}&limit=${itemsPerPage}`
        );

        // Check if response has pagination structure, otherwise handle as array
        const blogsData = response.data.blogs || response.data;
        setBlogs(blogsData);

        // Set total pages if available in response
        if (response.data.totalPages) {
          setTotalPages(response.data.totalPages);
        } else if (response.data.total) {
          setTotalPages(Math.ceil(response.data.total / itemsPerPage));
        } else {
          // If server doesn't support pagination yet, calculate pages from returned data
          setTotalPages(
            Math.max(1, Math.ceil(blogsData.length / itemsPerPage))
          );
        }
      } catch (err) {
        console.error("Error fetching expert blogs:", err);
        setError("Failed to load blogs. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (expertId) {
      fetchExpertBlogs();
    }
  }, [expertId, currentPage, itemsPerPage]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Helper function to strip Markdown
  const stripMarkdown = (markdown: string): string => {
    // Log the input for debugging
    console.log("Stripping Markdown Input:", JSON.stringify(markdown));

    if (!markdown) return "";

    let text = markdown;

    // Block Elements
    text = text.replace(/#+\s*(.*)$/gm, "$1"); // Headers (NO ^ anchor, handles optional space after #)
    text = text.replace(/^>\s+/gm, ""); // Blockquotes (Keep ^ anchor)
    text = text.replace(/^(\s*(\*|-|\+)\s+)|(^\s*\d+\.\s+)/gm, ""); // List items (basic markers)
    text = text.replace(/^- \[( |x)\]\s+/gm, ""); // Task list markers
    text = text.replace(/```[\s\S]*?```/g, ""); // Fenced Code blocks
    text = text.replace(/^(---|___|\*\*\*)\s*$/gm, ""); // Horizontal rules
    text = text.replace(/^\|.*\|$/gm, ""); // Table rows (basic)
    text = text.replace(/^\|?[- :]+\|[-| :]*\|$/gm, ""); // Table separators (basic)
    text = text.replace(/^\s*([^\n]+)\n:\s+(.*)/gm, "$1: $2"); // Definition lists (basic)
    text = text.replace(/^\[\^(\w+)\]:\s*(.*)/gm, ""); // Footnote definitions

    // Inline Elements
    text = text.replace(/(\*\*|__)(.*?)\1/g, "$2"); // Bold
    text = text.replace(/(\*|_)(.*?)\1/g, "$2"); // Italics
    text = text.replace(/~~(.*?)~~/g, "$1"); // Strikethrough
    text = text.replace(/`(.*?)`/g, "$1"); // Inline code
    text = text.replace(/!\[(.*?)\]\(.*?\)/g, "$1"); // Images (keep alt text)
    text = text.replace(/\[(.*?)\]\(.*?\)/g, "$1"); // Links (keep link text)
    text = text.replace(/<[^>]*>/g, ""); // HTML tags
    text = text.replace(/\[\^(\w+)\]/g, ""); // Footnote links
    text = text.replace(/:(.*?):/g, "$1"); // Emoji (remove colons, keep text/unicode)
    text = text.replace(/==(.*?)==/g, "$1"); // Highlight
    text = text.replace(/~(.*?)~/g, "$1"); // Subscript
    text = text.replace(/\^(.*?)\^/g, "$1"); // Superscript

    // Clean up extra whitespace and newlines
    text = text.replace(/\n{2,}/g, "\n"); // Replace multiple newlines with one
    text = text.replace(/\\n/g, " "); // Replace escaped newlines with space
    text = text.replace(/\s+/g, " ").trim(); // Replace multiple spaces with one and trim

    console.log("Stripping Markdown Output:", JSON.stringify(text)); // Log output for comparison
    return text;
  };

  if (loading && blogs.length === 0) {
    return <div className="py-4 text-center">Loading blogs...</div>;
  }

  if (error) {
    return <div className="py-4 text-center text-red-600">{error}</div>;
  }

  if (blogs.length === 0 && !loading) {
    return (
      <div className="py-4 text-center text-gray-500">
        No blogs published yet.
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {blogs.map((blog) => (
        <Card key={blog.blogID}>
          <Link href={`/blogs/${blog.blogID}`}>
            <div className="flex flex-col md:flex-row">
              <div className="relative h-48 md:h-auto md:w-1/3">
                <RandomImage
                  alt={blog.heading}
                  fill
                  className="object-cover rounded-t-lg md:rounded-l-lg md:rounded-t-none"
                ></RandomImage>
              </div>
              <CardContent className="flex-1 p-6">
                <h3 className="text-xl font-semibold mb-3">{blog.heading}</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {stripMarkdown(blog.body.substring(0, 150))}...
                </p>
                <div className="flex items-center text-sm text-gray-500 space-x-4">
                  <div className="flex items-center space-x-1">
                    <CalendarDays className="h-4 w-4" />
                    <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{`${Math.max(
                      1,
                      Math.ceil(blog.body.split(/\s+/).length / 200)
                    )} min read`}</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-primary-blue hover:gap-2 transition-all">
                  <span>Read More</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </div>
          </Link>
        </Card>
      ))}
      {/* Pagination UI */}
      {totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            {/* Previous Button */}
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) handlePageChange(currentPage - 1);
                }}
                className={
                  currentPage <= 1 ? "opacity-50 pointer-events-none" : ""
                }
              />
            </PaginationItem>

            {/* First page */}
            {currentPage >= 3 && (
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(1);
                  }}
                >
                  1
                </PaginationLink>
              </PaginationItem>
            )}

            {/* Ellipsis if not showing first page */}
            {currentPage >= 3 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {/* Pages around current page */}
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
              let pageNum = currentPage - 1 + i;
              // Adjust if we're at the start
              if (currentPage <= 2) {
                pageNum = i + 1;
              }
              // Adjust if we're at the end
              else if (currentPage >= totalPages - 1) {
                pageNum = totalPages - 2 + i;
              }

              // Skip if page number is out of range
              if (pageNum <= 0 || pageNum > totalPages) {
                return null;
              }

              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(pageNum);
                    }}
                    isActive={currentPage === pageNum}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            }).filter(Boolean)}

            {/* Ellipsis if not showing last page */}
            {currentPage < totalPages - 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {/* Last page */}
            {totalPages > 3 && currentPage < totalPages - 1 && (
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(totalPages);
                  }}
                >
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            )}

            {/* Next Button */}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages)
                    handlePageChange(currentPage + 1);
                }}
                className={
                  currentPage >= totalPages
                    ? "opacity-50 pointer-events-none"
                    : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
      {loading && blogs.length > 0 && (
        <div className="py-4 text-center text-gray-500">
          Loading more blogs...
        </div>
      )}
    </div>
  );
}
