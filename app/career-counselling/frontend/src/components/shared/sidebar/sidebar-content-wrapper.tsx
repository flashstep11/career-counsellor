"use client";

import { useSidebar } from "./sidebar-context";
import { cn } from "@/lib/utils";

export function SidebarContentWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isCollapsed } = useSidebar();

    return (
        <div
            className={cn(
                "transition-all duration-300",
                isCollapsed ? "md:ml-16" : "md:ml-64"
            )}
        >
            {children}
        </div>
    );
}
