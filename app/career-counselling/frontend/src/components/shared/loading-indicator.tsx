"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Skeleton UI components for different types of content

export function SkeletonText({ className, width }: { className?: string, width?: string }) {
    return (
        <div className={cn("h-4 bg-gray-200 rounded animate-pulse", width || "w-full", className)} />
    );
}

export function SkeletonCircle({ size = "h-12 w-12", className }: { size?: string, className?: string }) {
    return (
        <div className={cn("rounded-full bg-gray-200 animate-pulse", size, className)} />
    );
}

export function SkeletonImage({ className, height = "h-48" }: { className?: string, height?: string }) {
    return (
        <div className={cn("w-full bg-gray-200 rounded animate-pulse", height, className)} />
    );
}

export function SkeletonCard({ className }: { className?: string }) {
    return (
        <div className={cn("rounded-lg border p-4 space-y-3", className)}>
            <SkeletonText className="h-6 w-2/3" />
            <SkeletonText className="h-4 w-full" />
            <SkeletonText className="h-4 w-5/6" />
            <SkeletonText className="h-4 w-3/4" />
        </div>
    );
}

export function SkeletonCardGrid({ count = 4, columns = "grid-cols-1 md:grid-cols-2 lg:grid-cols-4", className }: { count?: number, columns?: string, className?: string }) {
    return (
        <div className={cn("grid gap-4", columns, className)}>
            {Array(count).fill(0).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}

export function SkeletonList({ count = 5, className }: { count?: number, className?: string }) {
    return (
        <div className={cn("space-y-3", className)}>
            {Array(count).fill(0).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                    <SkeletonCircle size="h-10 w-10" />
                    <div className="space-y-2 flex-1">
                        <SkeletonText className="h-4 w-1/3" />
                        <SkeletonText className="h-3 w-full" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function SkeletonTable({ rows = 5, columns = 4, className }: { rows?: number, columns?: number, className?: string }) {
    return (
        <div className={cn("border rounded-lg overflow-hidden", className)}>
            <div className="grid gap-4 p-4 bg-gray-50 border-b">
                {Array(columns).fill(0).map((_, i) => (
                    <SkeletonText key={i} className="h-5" />
                ))}
            </div>
            <div className="divide-y">
                {Array(rows).fill(0).map((_, rowIndex) => (
                    <div key={rowIndex} className="grid gap-4 p-4">
                        {Array(columns).fill(0).map((_, colIndex) => (
                            <SkeletonText key={colIndex} className="h-4" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Enhanced default LoadingIndicator that can show different skeleton types
export default function LoadingIndicator({
    type = "spinner",
    count,
    columns,
    className
}: {
    type?: "spinner" | "card" | "list" | "table" | "cardGrid",
    count?: number,
    columns?: string | number,
    className?: string
}) {
    if (type === "spinner") {
        return (
            <div className={cn("flex justify-center items-center h-[60vh]", className)}>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (type === "card") {
        return <SkeletonCard className={className} />;
    }

    if (type === "list") {
        return <SkeletonList count={count} className={className} />;
    }

    if (type === "table") {
        return <SkeletonTable rows={count} columns={columns as number} className={className} />;
    }

    if (type === "cardGrid") {
        return <SkeletonCardGrid count={count} columns={columns as string} className={className} />;
    }

    // Default fallback
    return (
        <div className={cn("flex justify-center items-center h-[60vh]", className)}>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
}