"use client";

import React, { useEffect } from "react";
import { toast } from "sonner";

interface RightClickProtectionProps {
  children: React.ReactNode;
}

export default function RightClickProtection({ children }: RightClickProtectionProps) {
  useEffect(() => {
    // Function to prevent right-click
    const preventRightClick = (e: MouseEvent) => {
      e.preventDefault();
      toast.error("Right-clicking is disabled on this page", {
        duration: 2000,
        position: "bottom-center",
      });
      return false;
    };

    // Function to prevent keyboard shortcuts
    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j")) ||
        (e.ctrlKey && (e.key === "U" || e.key === "u"))
      ) {
        e.preventDefault();
        return false;
      }
    };

    // Function to prevent selecting text on the page
    const preventTextSelection = (e: Event) => {
      // Allow text selection in form fields and interactive elements
      const target = e.target as HTMLElement;
      const isFormField = target.tagName === "INPUT" || 
                          target.tagName === "TEXTAREA" ||
                          target.isContentEditable;
      
      if (!isFormField) {
        e.preventDefault();
        return false;
      }
    };

    // Add event listeners
    document.addEventListener("contextmenu", preventRightClick);
    document.addEventListener("keydown", preventKeyboardShortcuts);
    document.addEventListener("selectstart", preventTextSelection);

    // Additional protection against developer tools
    const devToolsDetection = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      
      if (widthThreshold || heightThreshold) {
        document.body.innerHTML = '<div style="text-align:center;padding:50px;"><h1>Developer Tools Detected</h1><p>Please close developer tools to continue viewing this page.</p></div>';
      }
    };

    // Check for developer tools periodically
    const interval = setInterval(devToolsDetection, 1000);

    // Clean up event listeners
    return () => {
      document.removeEventListener("contextmenu", preventRightClick);
      document.removeEventListener("keydown", preventKeyboardShortcuts);
      document.removeEventListener("selectstart", preventTextSelection);
      clearInterval(interval);
    };
  }, []);

  return <>{children}</>;
}
