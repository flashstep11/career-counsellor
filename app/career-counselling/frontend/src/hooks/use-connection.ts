"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { Connection, ConnectionStatus } from "@/types";

function authHeader(): Record<string, string> {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Returns the connection status between the current user and `otherUserId`. */
export function useConnectionStatus(otherUserId: string | undefined) {
    const [status, setStatus] = useState<ConnectionStatus>("none");
    const [connectionId, setConnectionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!otherUserId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/connections/status/${otherUserId}`, {
                headers: authHeader(),
            });
            if (res.ok) {
                const data = await res.json();
                setStatus(data.status ?? "none");
            }
        } catch {
            // non-fatal
        } finally {
            setLoading(false);
        }
    }, [otherUserId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const sendRequest = async () => {
        if (!otherUserId) return;
        try {
            const res = await fetch("/api/connections/request", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeader() },
                body: JSON.stringify({ target_id: otherUserId }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                toast.error(err.detail ?? "Failed to send connection request");
                return;
            }
            const conn: Connection = await res.json();
            setConnectionId(conn.connectionId);
            setStatus("pending");
            toast.success("Connection request sent!");
        } catch {
            toast.error("Failed to send connection request");
        }
    };

    const acceptRequest = async (connId: string) => {
        try {
            const res = await fetch(`/api/connections/${connId}/accept`, {
                method: "POST",
                headers: authHeader(),
            });
            if (!res.ok) {
                toast.error("Failed to accept connection");
                return;
            }
            setStatus("accepted");
            toast.success("Connection accepted!");
        } catch {
            toast.error("Failed to accept connection");
        }
    };

    const declineRequest = async (connId: string) => {
        try {
            const res = await fetch(`/api/connections/${connId}/decline`, {
                method: "POST",
                headers: authHeader(),
            });
            if (!res.ok) {
                toast.error("Failed to decline connection");
                return;
            }
            setStatus("declined");
        } catch {
            toast.error("Failed to decline connection");
        }
    };

    const removeConnection = async () => {
        if (!otherUserId) return;
        try {
            const res = await fetch(`/api/connections/${otherUserId}`, {
                method: "DELETE",
                headers: authHeader(),
            });
            if (!res.ok) {
                toast.error("Failed to remove connection");
                return;
            }
            setStatus("none");
            setConnectionId(null);
            toast.success("Connection removed");
        } catch {
            toast.error("Failed to remove connection");
        }
    };

    return {
        status,
        connectionId,
        loading,
        sendRequest,
        acceptRequest,
        declineRequest,
        removeConnection,
        refresh,
    };
}

/** Returns the list of connections for the current user. */
export function useConnections(statusFilter: ConnectionStatus | "pending" = "accepted") {
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/connections?status=${statusFilter}`, {
                headers: authHeader(),
            });
            if (res.ok) {
                setConnections(await res.json());
            }
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { connections, loading, refresh };
}
