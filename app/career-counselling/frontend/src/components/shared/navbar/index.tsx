"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Menu,
  User,
  Wallet,
  ShieldCheck,
  GraduationCap,
  Settings,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SearchBar from "./search-bar";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/components/shared/sidebar/sidebar-context";
import NotificationsDropdown from "@/components/notifications/notifications-dropdown";
import Chatbot from "@/components/shared/chatbot";
import { SubscribeButton } from "@/components/subscription/subscribe-button";

export default function Navbar() {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const { setIsCollapsed } = useSidebar();

  // Listen for custom event to toggle chatbot from mobile nav
  useEffect(() => {
    const handleToggleChatbotEvent = () => {
      setIsChatbotOpen((prev) => !prev);
    };

    window.addEventListener("toggle-chatbot", handleToggleChatbotEvent);
    return () =>
      window.removeEventListener("toggle-chatbot", handleToggleChatbotEvent);
  }, []);

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user) return "U";
    return `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""
      }`.toUpperCase();
  };

  return (
    <>
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="w-full px-4 md:px-8">
          <div className="flex items-center justify-between h-[80px] gap-4 md:gap-8">
            {/* Left – Mobile sidebar toggle + Logo */}
            <div className="flex items-center gap-3 min-w-fit flex-shrink-0">
              {/* Mobile menu button (opens sidebar drawer) */}
              <button
                className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
                aria-label="Open navigation menu"
                onClick={() => setIsCollapsed(false)}
              >
                <Menu className="h-5 w-5" />
              </button>

              <Link
                href="/"
                className="flex items-center space-x-3 group min-w-fit flex-shrink-0"
              >
                <div className="p-2 rounded-xl transition-all">
                  <Image
                    src="/logo.png"
                    alt="AlumNiti Logo"
                    width={42}
                    height={42}
                    priority
                    className="transition-transform group-hover:scale-110"
                  />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hidden lg:inline tracking-tight">
                  AlumNiti
                </span>
              </Link>
            </div>

            {/* Center – Search Bar */}
            <div className="flex-1 max-w-3xl mx-auto">
              <SearchBar />
            </div>
            {/* Right – User Controls */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              {/* Authentication Controls */}
              {isAuthenticated && user ? (
                <div className="flex items-center space-x-3">
                  {/* Notifications */}
                  <NotificationsDropdown />

                  {/* User Profile Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="relative h-11 w-11 rounded-full hover:ring-2 hover:ring-blue-200 transition-all"
                      >
                        <Avatar className="h-11 w-11 ring-2 ring-gray-200 shadow-sm">
                          <AvatarImage
                            src={
                              typeof user.profile_picture_url === "string"
                                ? user.profile_picture_url
                                : typeof user.profileImage === "string"
                                  ? user.profileImage
                                  : ""
                            }
                            alt={`${user.firstName} ${user.lastName}`}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-semibold">
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-56"
                      align="end"
                      forceMount
                    >
                      <div className="flex items-center justify-start gap-2 p-2">
                        <div className="flex flex-col space-y-1 leading-none">
                          <p className="font-medium text-sm">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="w-[200px] truncate text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem asChild>
                          <Link href="/profile" className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/wallet" className="cursor-pointer">
                            <Wallet className="mr-2 h-4 w-4" />
                            <span>Wallet</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard" className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                          </Link>
                        </DropdownMenuItem>

                        {user.isAdmin && (
                          <DropdownMenuItem asChild>
                            <Link href="/admin" className="cursor-pointer">
                              <ShieldCheck className="mr-2 h-4 w-4" />
                              <span>Admin Dashboard</span>
                            </Link>
                          </DropdownMenuItem>
                        )}

                        {user.isExpert && (
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/experts/${user.expertId}`}
                              className="cursor-pointer"
                            >
                              <GraduationCap className="mr-2 h-4 w-4" />
                              <span>Expert Dashboard</span>
                            </Link>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuGroup>
                      <DropdownMenuItem className="p-0">
                        <SubscribeButton
                          className="w-full justify-start cursor-pointer rounded px-2 py-1.5 text-sm"
                          showIcon={true}
                        />
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={logout}
                        className="cursor-pointer text-red-600 focus:text-red-600"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-gray-900 transition-colors px-4 py-2 rounded-full hover:bg-gray-100 font-medium text-sm"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2 rounded-full hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md font-medium text-sm"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      {/* Chatbot floating component */}
      <Chatbot isOpen={isChatbotOpen} onOpenChange={setIsChatbotOpen} />
    </>
  );
}
