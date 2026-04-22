"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import OnboardingModal from "@/components/shared/onboarding-modal";

export default function OnboardingPage() {
    const { isAuthenticated, user, loading, refreshUser } = useAuth();
    const router = useRouter();

    // If the user has already completed onboarding (e.g. they bookmarked this
    // URL), send them straight to the dashboard.
    useEffect(() => {
        if (!loading && (!isAuthenticated || user?.onboarding_completed === true)) {
            router.replace("/dashboard");
        }
    }, [loading, isAuthenticated, user, router]);

    const handleComplete = async () => {
        await refreshUser();
        router.replace("/dashboard");
    };

    const handleSkip = async () => {
        try {
            const token = localStorage.getItem("token");
            await axios.put(
                "/api/onboarding",
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.info("You can update your preferences anytime from your profile.");
            await refreshUser();
        } catch {
            // Don't block the user — just proceed.
        }
        router.replace("/dashboard");
    };

    if (loading || !isAuthenticated || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
            {/*
        The modal is always open here. Its overlay covers the background
        entirely, so the user never sees any dashboard content.
      */}
            <OnboardingModal
                open={true}
                onComplete={handleComplete}
                onSkip={handleSkip}
            />
        </div>
    );
}
