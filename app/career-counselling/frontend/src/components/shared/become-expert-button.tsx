"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";

export function BecomeExpertButton() {
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();

  if (!isAuthenticated || !user || user.isExpert || pathname !== "/dashboard") return null;

  return (
    <Link
      href="/become-expert"
      className="fixed top-[92px] right-6 z-[9999] hidden sm:flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-xl hover:shadow-2xl transition-all whitespace-nowrap ring-2 ring-amber-300/60 animate-pulse-glow"
    >
      <Star className="h-4 w-4 fill-white" />
      Become an Expert
    </Link>
  );
}
