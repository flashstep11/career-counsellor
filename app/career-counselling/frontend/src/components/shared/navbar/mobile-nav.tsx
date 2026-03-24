"use client";

import Link from "next/link";
import {
  BookOpen,
  School,
  User,
  GraduationCap,
  MessageCircle,
  LayoutDashboard,
  Home,
  Crown,
  ShieldCheck,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import SearchBar from "./search-bar";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SubscribeButton } from "@/components/subscription/subscribe-button";

interface MobileNavProps {
  onClose: () => void;
  isLoggedIn: boolean;
  handleLogout: () => void;
  isAdmin?: boolean;
  isExpert?: boolean;
  expertId?: string;
}

export default function MobileNav({
  onClose,
  isLoggedIn,
  handleLogout,
  isAdmin = false,
  isExpert = false,
  expertId,
}: MobileNavProps) {
  return (
    <div className="flex flex-col h-full relative">
      <div className="flex justify-between items-center mb-4 pl-4 pr-2">
        <div className="text-xl font-bold text-primary-blue mt-2">AlumNiti</div>
        <Button variant="ghost" size="icon" onClick={onClose} className="mt-2">
        </Button>
      </div>
      <div className="px-4 py-2 flex items-center w-full">
        <SearchBar />
      </div>
      <Separator className="my-4" />
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col px-4 mb-4">
          <Accordion type="single" collapsible className="w-full">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-md transition-colors hover:bg-secondary hover:text-primary-blue"
              onClick={onClose}
             >
              <Home className="h-5 w-5" />
              <span className="text-base">Home</span>
            </Link>

            {isLoggedIn && (
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-md transition-colors hover:bg-secondary hover:text-primary-blue"
                onClick={onClose}
               >
                <LayoutDashboard className="h-5 w-5" />
                <span className="text-base">Dashboard</span>
              </Link>
            )}

            <AccordionItem value="colleges" className="border-none">
              <AccordionTrigger className="py-2 px-3 hover:bg-secondary hover:no-underline rounded-md">
                <div className="flex items-center gap-3">
                  <School className="h-5 w-5" />
                  <span className="text-base">Colleges</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-3 pr-3">
                <div className="space-y-2 pt-2 pl-8">
                  <Link
                    href="/colleges"
                    className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-secondary/80"
                    onClick={onClose}
                   >
                    <span className="text-sm">Explore Colleges</span>
                  </Link>
                  <Link
                    href="/colleges/rankings"
                    className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-secondary/80"
                    onClick={onClose}
                   >
                    <span className="text-sm">College Rankings</span>
                  </Link>
                  <Link
                    href="/colleges/branch-predictor"
                    className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-secondary/80"
                    onClick={onClose}
                   >
                    <span className="text-sm">Branch Predictor</span>
                  </Link>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="content" className="border-none py-2">
              <AccordionTrigger className="py-2 px-3 hover:bg-secondary hover:no-underline rounded-md">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5" />
                  <span className="text-base">Content</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-3 pr-3">
                <div className="space-y-2 pt-2 pl-8">
                  <Link
                    href="/blogs"
                    className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-secondary/80"
                    onClick={onClose}
                   >
                    <span className="text-sm">Blogs</span>
                  </Link>
                  <Link
                    href="/videos"
                    className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-secondary/80"
                    onClick={onClose}
                   >
                    <span className="text-sm">Videos</span>
                  </Link>
                  <Link
                    href="/forums"
                    className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-secondary/80"
                    onClick={onClose}
                   >
                    <span className="text-sm">Forums</span>
                  </Link>
                  <Link
                    href="/resources"
                    className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-secondary/80"
                    onClick={onClose}
                   >
                    <span className="text-sm">Resources</span>
                  </Link>
                </div>
              </AccordionContent>
            </AccordionItem>

            <Link
              href="/experts"
              className="flex items-center gap-3 px-3 py-2.5 my-4 rounded-md bg-gradient-to-r from-blue-100 to-purple-100 text-primary-blue transition-colors"
              onClick={onClose}
             >
              <GraduationCap className="h-5 w-5" />
              <span className="text-base font-medium">Experts</span>
            </Link>

            <div className="mt-4 px-3 w-full flex place-content-center">
              <button
                onClick={() => {
                  onClose();
                  setTimeout(() => {
                    const chatbotEvent = new CustomEvent("toggle-chatbot");
                    window.dispatchEvent(chatbotEvent);
                  }, 300);
                }}
                className="flex items-center gap-3 px-3 py-2.5 my-2 rounded-md bg-gradient-to-r from-blue-50 to-purple-50 text-primary-blue transition-colors hover:from-blue-100 hover:to-purple-100"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-base">Chat with AI</span>
              </button>
            </div>
          </Accordion>
        </div>

        <Separator className="my-4" />

        <div className="flex flex-col px-4 pt-2 pb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Account
          </h3>
          {isLoggedIn ? (
            <div className="space-y-3">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex w-full items-center gap-3 px-3 py-3 rounded-md bg-blue-100 text-primary-blue hover:bg-blue-200 transition-colors"
                  onClick={onClose}
                >
                  <ShieldCheck className="h-5 w-5" />
                  <span className="font-medium">Admin Dashboard</span>
                </Link>
              )}
              {isExpert && expertId && (
                <Link
                  href={`/experts/${expertId}`}
                  className="flex w-full items-center gap-3 px-3 py-3 rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                  onClick={onClose}
                >
                  <GraduationCap className="h-5 w-5" />
                  <span className="font-medium">Expert Dashboard</span>
                </Link>
              )}
              <Link
                href="/profile"
                className="flex w-full items-center gap-3 px-3 py-3 rounded-md bg-primary-blue text-white hover:bg-primary-blue/90 transition-colors"
                onClick={onClose}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="font-medium">My Profile</span>
              </Link>
              <Link
                href="/wallet"
                className="flex w-full items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary transition-colors"
                onClick={onClose}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                  <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                </svg>
                <span>My Wallet</span>
              </Link>

             

              <div className="w-full">
                <SubscribeButton className="w-full justify-start py-3 mt-2" />
              </div>

              <div className="mt-6 w-full">
                <Button
                  variant="destructive"
                  className="w-full justify-center py-3 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                  onClick={() => {
                    handleLogout();
                    onClose();
                  }}
                >
                  Logout
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 w-full">
              <Link
                href="/login"
                className="flex w-full items-center justify-center py-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
                onClick={onClose}
               >
                <span className="font-medium">Login</span>
              </Link>
              <Link
                href="/register"
                className="flex w-full items-center justify-center py-3 rounded-md bg-primary-blue text-white hover:bg-primary-blue/90 transition-colors"
                onClick={onClose}
               >
                <span className="font-medium">Sign Up</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
