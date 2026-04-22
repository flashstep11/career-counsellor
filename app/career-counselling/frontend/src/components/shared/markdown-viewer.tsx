"use client";

import React, { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";

const loadLanguage = async (language: string) => {
  try {
    await import(`prismjs/components/prism-${language}`);
  } catch (e) {
    console.warn(`Prism language '${language}' not found`);
  }
};

interface MarkdownViewerProps {
  content: string;
  className?: string;
  isLoading?: boolean;
}

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  content,
  className,
  isLoading = false,
}) => {
  // Always call useEffect, but conditionally do work inside it
  useEffect(() => {
    if (isLoading) return;

    // Function to extract code block languages from content
    const getCodeLanguages = (content: string) => {
      const languageRegex = /```(\w+)/g;
      const matches = content.matchAll(languageRegex);
      return [...new Set([...matches].map((match) => match[1]))];
    };

    // Load languages and highlight
    const languages = getCodeLanguages(content);
    Promise.all(languages.map(loadLanguage)).then(() => {
      Prism.highlightAll();
    });
  }, [content, isLoading]);

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "prose dark:prose-invert max-w-none break-words",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          // Custom components for markdown elements
          h1: (props) => (
            <h1 className="text-3xl font-bold mb-4 break-words" {...props} />
          ),
          h2: (props) => (
            <h2 className="text-2xl font-bold mb-3 break-words" {...props} />
          ),
          h3: (props) => (
            <h3 className="text-xl font-bold mb-2 break-words" {...props} />
          ),
          p: (props) => <p className="mb-4 break-words" {...props} />,
          ul: (props) => (
            <ul className="list-disc list-inside mb-4 break-words" {...props} />
          ),
          ol: (props) => (
            <ol
              className="list-decimal list-inside mb-4 break-words"
              {...props}
            />
          ),
          code: (props) => (
            <code
              className="bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 break-words whitespace-pre-wrap text-sm"
              {...props}
            />
          ),
          pre: (props) => (
            <pre
              className="bg-gray-100 dark:bg-gray-800 rounded p-4 overflow-x-auto max-w-full whitespace-pre-wrap text-sm"
              {...props}
            />
          ),
          table: (props) => (
            <div className="overflow-x-auto max-w-full">
              <table
                className="border-collapse border border-gray-300 dark:border-gray-700 mb-4"
                {...props}
              />
            </div>
          ),
          blockquote: (props) => (
            <blockquote
              className="border-l-4 border-gray-300 dark:border-gray-700 pl-4 mb-4"
              {...props}
            />
          ),
          a: (props) => (
            <a
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-500 break-words"
              {...props}
            />
          ),
          img: ({ alt, ...props }) => (
            <img
              className="max-w-full h-auto rounded"
              alt={alt ?? ""}
              {...props}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownViewer;
