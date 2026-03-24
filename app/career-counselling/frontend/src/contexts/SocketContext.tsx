"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Notification, NotificationBatch } from "@/types";

// Dynamic import for socket.io-client to avoid TypeScript issues
const importSocketIO = async () => {
    const socketIO = await import("socket.io-client");
    return socketIO;
};

interface SocketContextType {
    /** Direct (non-batched) notifications: follow, meeting, etc. Newest first. */
    liveNotifications: Notification[];
    /** Batched content notifications: new_video, new_blog. Newest-updated first. */
    liveBatches: NotificationBatch[];
    /** Combined unread count (individual + batches). */
    unreadCount: number;
    /** Mark an individual notification as read locally. */
    markRead: (notificationId: string) => void;
    /** Mark a notification batch as read locally. */
    markBatchRead: (batchId: string) => void;
    /** Replace the full individual notification list (called after REST fetch). */
    setNotifications: (notifications: Notification[]) => void;
    /** Replace the full batch list (called after REST fetch). */
    setLiveBatches: (batches: NotificationBatch[]) => void;
    /** Emit a custom socket event. No-op if socket is not connected. */
    emitEvent: (event: string, data: unknown) => void;
    /** Subscribe to a custom socket event. Returns cleanup function. */
    onEvent: (event: string, handler: (...args: any[]) => void) => () => void;
    /** Increments each time the socket successfully connects/reconnects. Use as a useEffect dep to re-register listeners. */
    socketReady: number;
}

const SocketContext = createContext<SocketContextType>({
    liveNotifications: [],
    liveBatches: [],
    unreadCount: 0,
    markRead: () => { },
    markBatchRead: () => { },
    setNotifications: () => { },
    setLiveBatches: () => { },
    emitEvent: () => { },
    onEvent: () => () => { },
    socketReady: 0,
});

export function SocketProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();
    const [liveNotifications, setLiveNotifications] = useState<Notification[]>([]);
    const [liveBatches, setLiveBatchesState] = useState<NotificationBatch[]>([]);
    const [socketReady, setSocketReady] = useState(0);
    const socketRef = useRef<any>(null);

    const unreadCount =
        liveNotifications.filter((n) => !n.read).length +
        liveBatches.filter((b) => !b.isRead).length;

    useEffect(() => {
        const setupSocket = async () => {
            if (!isAuthenticated) {
                if (socketRef.current) {
                    socketRef.current.disconnect();
                    socketRef.current = null;
                }
                setLiveNotifications([]);
                setLiveBatchesState([]);
                return;
            }

            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            if (!token) return;

            if (socketRef.current?.connected) return;

            // Dynamic import of socket.io-client
            const { io } = await importSocketIO();
            const socket = io(
                process.env.NEXT_PUBLIC_SOCKET_URL ?? "",
                {
                    auth: { token },
                    transports: ["websocket", "polling"],
                    reconnectionAttempts: 5,
                    reconnectionDelay: 2000,
                }
            );

            socketRef.current = socket;

            socket.on("connect", () => {
                console.log("[Socket] connected:", socket.id);
                setSocketReady((n) => n + 1);
            });

            // Individual direct notifications (follow, meeting, refund…)
            socket.on("notification", (data: Notification) => {
                setLiveNotifications((prev) => [data, ...prev]);
            });

            // New batch: a fresh window was opened for this actor+type → show toast
            socket.on("notification_batch_new", (data: NotificationBatch) => {
                setLiveBatchesState((prev) => [data, ...prev]);
            });

            // Updated batch: entity added to an existing window → silently update count
            socket.on("notification_batch_updated", (data: NotificationBatch) => {
                setLiveBatchesState((prev) =>
                    prev.map((b) => (b.batchId === data.batchId ? data : b))
                );
            });

            socket.on("connect_error", (err: any) => {
                console.warn("[Socket] connect error:", err.message);
            });

            socket.on("disconnect", (reason: any) => {
                console.log("[Socket] disconnected:", reason);
            });
        };

        setupSocket();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setLiveNotifications([]);
            setLiveBatchesState([]);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    const markRead = useCallback((notificationId: string) => {
        setLiveNotifications((prev) =>
            prev.map((n) => (n.notificationId === notificationId ? { ...n, read: true } : n))
        );
    }, []);

    const markBatchRead = useCallback((batchId: string) => {
        setLiveBatchesState((prev) =>
            prev.map((b) => (b.batchId === batchId ? { ...b, isRead: true } : b))
        );
    }, []);

    const setNotifications = useCallback((notifications: Notification[]) => {
        setLiveNotifications(notifications);
    }, []);

    const setLiveBatches = useCallback((batches: NotificationBatch[]) => {
        setLiveBatchesState(batches);
    }, []);

    const emitEvent = useCallback((event: string, data: unknown) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit(event, data);
        }
    }, []);

    const onEvent = useCallback((event: string, handler: (...args: any[]) => void) => {
        const socket = socketRef.current;
        if (socket) {
            socket.on(event, handler);
        }
        return () => {
            if (socketRef.current) {
                socketRef.current.off(event, handler);
            }
        };
    }, []);

    return (
        <SocketContext.Provider
            value={{
                liveNotifications,
                liveBatches,
                unreadCount,
                markRead,
                markBatchRead,
                setNotifications,
                setLiveBatches,
                emitEvent,
                onEvent,
                socketReady,
            }}
        >
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
