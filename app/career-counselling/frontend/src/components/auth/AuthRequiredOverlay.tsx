"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { X, LogIn, UserPlus } from "lucide-react";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  redirectTo: string;
  onClose?: () => void;
  dismissible?: boolean;
};

export default function AuthRequiredOverlay({
  open,
  title = "Sign in required",
  description = "You need to be signed in to continue.",
  redirectTo,
  onClose,
  dismissible = true,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg max-w-md w-full p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
        {dismissible && onClose ? (
          <button
            onClick={onClose}
            className="absolute right-3 top-3 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        <div className="text-center">
          <div className="mx-auto mb-6 bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center">
            <LogIn className="h-10 w-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-gray-600 mb-6">{description}</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/register?redirect=${encodeURIComponent(redirectTo)}`}
              passHref
            >
              <Button
                className="flex items-center gap-2 px-6 py-5"
                onClick={onClose}
              >
                <UserPlus className="h-5 w-5" />
                <span>Sign up</span>
              </Button>
            </Link>
            <Link href={`/login?redirect=${encodeURIComponent(redirectTo)}`} passHref>
              <Button
                variant="outline"
                className="flex items-center gap-2 px-6 py-5"
                onClick={onClose}
              >
                <LogIn className="h-5 w-5" />
                <span>Sign in</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
