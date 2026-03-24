"use client";

import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { useState } from "react";

interface SystemShareButtonProps {
    url: string;
    title: string;
    text?: string;
    variant?: "outline" | "default";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
}

const SystemShareButton = ({
    url,
    title,
    text = "",
    variant = "outline",
    size = "sm",
    className = "",
}: SystemShareButtonProps) => {
    const [shareAvailable, setShareAvailable] = useState(
        typeof navigator !== "undefined" && !!navigator.share
    );

    // Fallback for copying to clipboard when Web Share API isn't available
    const fallbackCopyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(url);
            // You could add a toast notification here
            alert("Link copied to clipboard!");
        } catch (err) {
            console.error("Failed to copy link:", err);
        }
    };

    const handleShare = async () => {
        // Check if the Web Share API is available
        if (navigator.share) {
            try {
                await navigator.share({
                    title,
                    text,
                    url,
                });
            } catch (err) {
                console.error("Error sharing:", err);
            }
        } else {
            // Fallback for browsers that don't support the Web Share API
            fallbackCopyToClipboard();
        }
    };

    return (
        <Button
            variant={variant}
            size={size}
            className={`hover:text-primary-blue hover:border-primary-blue transition-colors ${className}`}
            onClick={handleShare}
        >
            <Share2 className="h-4 w-4 mr-2" />
            Share
        </Button>
    );
};

export default SystemShareButton;