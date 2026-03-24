"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Share2, Copy } from "lucide-react";
import { useState } from "react";
import {
  FacebookIcon,
  LinkedinIcon,
  WhatsappIcon,
  EmailIcon,
} from "react-share";
import XIcon from '@mui/icons-material/X';

interface ShareSheetProps {
  url: string;
  title: string;
  customMessage?: string; // New prop for custom message
  variant?: "outline" | "default";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  description?: string;
}

const ShareSheet = ({
  url,
  title,
  customMessage = "", // Default to an empty string
  description = "",
  variant = "outline",
  size = "sm",
  className = "",
}: ShareSheetProps) => {
  const [copyStatus, setCopyStatus] = useState("");

  const handleCopyLink = async () => {
    try {
      // Copy the URL with the custom message appended
      const fullMessage = `${url}`;
      await navigator.clipboard.writeText(fullMessage);

      // Show success message
      setCopyStatus("Copied!");

      // Reset status after 2 seconds
      setTimeout(() => {
        setCopyStatus("");
      }, 2000);
    } catch (err) {
      setCopyStatus("Failed to copy");
      setTimeout(() => {
        setCopyStatus("");
      }, 2000);
    }
  };

  const shareInNewTab = (platform: string) => {
    let shareUrl = '';
    // For Twitter/X, create a message without the URL since it will be appended automatically
    const twitterMessage = `${customMessage}\n${title}`;
    // For other platforms, keep the original message with URL
    const shareMessage = `${customMessage}\n${title}\n\n${url}`;
    const encodedShareMessage = encodeURIComponent(shareMessage);
    console.log(encodeURIComponent(url));

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodedShareMessage}`;
        break;
      case 'x':
        // Only include the message without URL in the text parameter
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(twitterMessage)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/shareArticle/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(shareMessage)}&summary=${encodeURIComponent(description)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedShareMessage}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodedShareMessage}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const iconSize = 80;
  const round = true;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`hover:text-primary-blue hover:border-primary-blue transition-colors ${className}`}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 bg-gray-800 text-white border-gray-700">
        <h4 className="text-sm font-medium mb-4 text-gray-100">Share this content</h4>
        <div className="grid grid-cols-3 gap-1">
          {/* Copy Link Button */}
          <div className="flex flex-col items-center w-full">
            <Button
              variant="ghost"
              className="flex flex-col items-center  h-auto bg-transparent hover:bg-gray-700 w-full"
              onClick={handleCopyLink}
            >
              <Copy size={iconSize} className="mb-1" />
              <span
                className={`text-xs mt-1 ${
                  copyStatus === "Copied!" ? "text-green-300" : "text-gray-200"
                }`}
              >
                {copyStatus || "Copy Link"}
              </span>
            </Button>
          </div>

          {/* Facebook */}
          <div className="flex flex-col items-center w-full">
            <Button
              variant="ghost"
              className="flex flex-col items-center h-auto bg-transparent hover:bg-gray-700 w-full"
              onClick={() => shareInNewTab('facebook')}
            >
              <FacebookIcon size={iconSize} round={round} />
              <span className="text-xs mt-1 text-gray-200">Facebook</span>
            </Button>
          </div>

          {/* X (formerly Twitter) using Material-UI XIcon */}
          <div className="flex flex-col items-center w-full">
            <Button
              variant="ghost"
              className="flex flex-col items-center h-auto bg-transparent hover:bg-gray-700 w-full"
              onClick={() => shareInNewTab('x')}
            >
              <XIcon style={{ fontSize: iconSize, marginBottom: '4px' }} />
              <span className="text-xs mt-1 text-gray-200">X</span>
            </Button>
          </div>

          {/* LinkedIn */}
          <div className="flex flex-col items-center w-full">
            <Button
              variant="ghost"
              className="flex flex-col items-center h-auto bg-transparent hover:bg-gray-700 w-full"
              onClick={() => shareInNewTab('linkedin')}
            >
              <LinkedinIcon size={iconSize} round={round} />
              <span className="text-xs mt-1 text-gray-200">LinkedIn</span>
            </Button>
          </div>

          {/* WhatsApp */}
          <div className="flex flex-col items-center w-full">
            <Button
              variant="ghost"
              className="flex flex-col items-center h-auto bg-transparent hover:bg-gray-700 w-full"
              onClick={() => shareInNewTab('whatsapp')}
            >
              <WhatsappIcon size={iconSize} round={round} />
              <span className="text-xs mt-1 text-gray-200">WhatsApp</span>
            </Button>
          </div>

          {/* Email */}
          <div className="flex flex-col items-center w-full">
            <Button
              variant="ghost"
              className="flex flex-col items-center h-auto bg-transparent hover:bg-gray-700 w-full"
              onClick={() => shareInNewTab('email')}
            >
              <EmailIcon size={iconSize} round={round} />
              <span className="text-xs mt-1 text-gray-200">Email</span>
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ShareSheet;
