"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "sidebar_collapsed";

interface SidebarContextValue {
    isCollapsed: boolean;
    setIsCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
}

export const SidebarContext = createContext<SidebarContextValue>({
    isCollapsed: false,
    setIsCollapsed: () => { },
});

export const useSidebar = () => useContext(SidebarContext);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    // Default: expanded (false). Read from localStorage on mount.
    const [isCollapsed, setIsCollapsedRaw] = useState(false);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored !== null) {
                setIsCollapsedRaw(stored === "true");
            }
        } catch { /* localStorage unavailable */ }
    }, []);

    const setIsCollapsed = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
        setIsCollapsedRaw((prev) => {
            const next = typeof v === "function" ? v(prev) : v;
            try {
                localStorage.setItem(STORAGE_KEY, String(next));
            } catch { /* ignore */ }
            return next;
        });
    }, []);

    return (
        <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
            {children}
        </SidebarContext.Provider>
    );
}
