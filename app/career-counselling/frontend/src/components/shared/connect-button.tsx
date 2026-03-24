"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useConnectionStatus } from "@/hooks/use-connection";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Clock } from "lucide-react";

interface ConnectButtonProps {
    /** The user._id (not expertId) of the person to connect with */
    targetUserId: string;
    className?: string;
}

export default function ConnectButton({ targetUserId, className = "" }: ConnectButtonProps) {
    const { user } = useAuth();
    const { status, loading, sendRequest } = useConnectionStatus(
        user ? targetUserId : undefined
    );

    // Don't render for own profile or unauthenticated visitors
    if (!user || user._id === targetUserId) return null;

    if (status === "accepted") {
        return (
            <Button variant="outline" size="sm" disabled className={className}>
                <UserCheck className="h-4 w-4 mr-1.5" />
                Connected
            </Button>
        );
    }

    if (status === "pending") {
        return (
            <Button variant="outline" size="sm" disabled className={className}>
                <Clock className="h-4 w-4 mr-1.5" />
                Pending
            </Button>
        );
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={sendRequest}
            disabled={loading}
            className={className}
        >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Connect
        </Button>
    );
}
