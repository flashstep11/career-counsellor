"use client";

import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Pages that should not show a back button (top-level nav destinations)
const NO_BACK_PATHS = [
  "/",
  "/dashboard",
  "/onboarding",
  "/colleges",
  "/assessments",
  "/predictor",
  "/blogs",
  "/videos",
  "/forums",
  "/profile",
  "/meetings",
  "/admin",
  "/experts",
  "/search",
];

export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  if (NO_BACK_PATHS.includes(pathname)) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => router.back()}
      className="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-2 -ml-2"
    >
      <ArrowLeft className="h-10 w-10" strokeWidth={3} />
      Back
    </Button>
  );
}
