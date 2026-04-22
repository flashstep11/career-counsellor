"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import OnboardingModal from "./onboarding-modal";
import { usePathname } from "next/navigation";

const ONBOARDING_SKIP_KEY = "alumniti_onboarding_skipped";

export default function OnboardingGate() {
    const { isAuthenticated, user, loading, refreshUser } = useAuth();
    const pathname = usePathname();
    const [skipped, setSkipped] = useState(false);

    // Check localStorage on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            setSkipped(localStorage.getItem(ONBOARDING_SKIP_KEY) === "true");
        }
    }, []);

    // The /onboarding page handles its own form — don't double-show the modal.
    if (pathname === "/onboarding") return null;

    if (loading || !isAuthenticated || !user) return null;
    if (user.onboarding_completed !== false) return null;
    if (skipped) return null;

    const handleComplete = async () => {
        await refreshUser();
        // Also mark in localStorage so it never shows again even if refreshUser is slow
        localStorage.setItem(ONBOARDING_SKIP_KEY, "true");
    };

    const handleSkip = () => {
        localStorage.setItem(ONBOARDING_SKIP_KEY, "true");
        setSkipped(true);
    };

    return <OnboardingModal open={true} onComplete={handleComplete} onSkip={handleSkip} />;
}
