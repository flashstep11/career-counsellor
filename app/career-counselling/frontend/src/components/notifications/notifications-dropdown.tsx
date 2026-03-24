"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Layers, UserCheck, X } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Notification, NotificationBatch } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { useToast } from "@/hooks/use-toast";
import { utcDate } from "@/lib/utils";

// ─── Markdown stripper ───────────────────────────────────────────────────────
const stripMarkdown = (markdown: string): string => {
  if (!markdown) return "";
  let text = markdown;
  text = text.replace(/#+\s*(.*)$/gm, "$1");
  text = text.replace(/^>\s+/gm, "");
  text = text.replace(/^(\s*(\*|-|\+)\s+)|(^\s*\d+\.\s+)/gm, "");
  text = text.replace(/```[\s\S]*?```/g, "");
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");
  text = text.replace(/~~(.*?)~~/g, "$1");
  text = text.replace(/`(.*?)`/g, "$1");
  text = text.replace(/!\[(.*?)\]\(.*?\)/g, "$1");
  text = text.replace(/\[(.*?)\]\(.*?\)/g, "$1");
  text = text.replace(/<[^>]*>/g, "");
  text = text.replace(/\s+/g, " ").trim();
  return text;
};

// ─── Batch label helper ───────────────────────────────────────────────────────
function batchLabel(batch: NotificationBatch): string {
  const count = batch.entityIds.length;
  const name = batch.actorName;
  if (batch.eventType === "new_video") {
    return count === 1
      ? `${name} uploaded a new video`
      : `${name} uploaded ${count} new videos`;
  }
  if (batch.eventType === "new_blog") {
    return count === 1
      ? `${name} published a new blog`
      : `${name} published ${count} new blogs`;
  }
  if (batch.eventType === "new_post") {
    return count === 1
      ? `${name} posted in a community`
      : `${name} made ${count} posts in communities`;
  }
  return count === 1
    ? `${name} posted new content`
    : `${name} posted ${count} new updates`;
}

// ─── Merge helper ─────────────────────────────────────────────────────────────
type MergedItem =
  | { kind: "individual"; data: Notification; sortKey: string }
  | { kind: "batch"; data: NotificationBatch; sortKey: string };

function mergeAndSort(
  notifications: Notification[],
  batches: NotificationBatch[]
): MergedItem[] {
  const items: MergedItem[] = [
    ...notifications.map((n) => ({
      kind: "individual" as const,
      data: n,
      sortKey: n.createdAt,
    })),
    ...batches.map((b) => ({
      kind: "batch" as const,
      data: b,
      sortKey: b.updatedAt,
    })),
  ];
  return items.sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1));
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const {
    liveNotifications,
    liveBatches,
    unreadCount,
    markRead,
    markBatchRead,
    setNotifications,
    setLiveBatches,
  } = useSocket();
  const { toast } = useToast();

  // ── REST fetch (history + batches) ──────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [notifRes, batchRes] = await Promise.all([
        axios.get("/api/notifications", { headers, params: { limit: 50 } }),
        axios.get("/api/notifications/batches", { headers, params: { limit: 50 } }),
      ]);
      setNotifications(notifRes.data as Notification[]);
      setLiveBatches(batchRes.data as NotificationBatch[]);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [isAuthenticated, setNotifications, setLiveBatches]);

  useEffect(() => { if (!authLoading) fetchAll(); }, [fetchAll, authLoading]);
  useEffect(() => { if (isOpen) fetchAll(); }, [isOpen, fetchAll]);

  // ── Toasts ──────────────────────────────────────────────────────────────────
  // Individual direct notifications (follow, meeting, …)
  useEffect(() => {
    const newest = liveNotifications[0];
    if (newest && !newest.read) {
      toast({ title: "New notification", description: newest.content });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveNotifications.length]);

  // New batch (notification_batch_new) → show one toast, suppress subsequent updates
  useEffect(() => {
    const newest = liveBatches[0];
    if (newest && !newest.isRead) {
      toast({ title: "New from an expert you follow", description: batchLabel(newest) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveBatches.length]);

  // ── Merged list ─────────────────────────────────────────────────────────────
  const mergedItems = useMemo(
    () => mergeAndSort(liveNotifications, liveBatches),
    [liveNotifications, liveBatches]
  );

  // ── Click handlers ──────────────────────────────────────────────────────────
  const handleIndividualClick = async (notification: Notification) => {
    if (!notification.read) {
      markRead(notification.notificationId);
      const token = localStorage.getItem("token");
      axios
        .put(`/api/notifications/${notification.notificationId}`, { read: true }, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(console.error);
    }

    const { referenceType, referenceId, sourceUserId, sourceUserDetails } = notification;
    if (referenceType === "expert" && referenceId) {
      router.push(`/experts/${referenceId}`);
    } else if (referenceType === "blog" && referenceId) {
      router.push(`/blogs/${referenceId}`);
    } else if (referenceType === "video" && referenceId) {
      router.push(`/videos/${referenceId}`);
    } else if (notification.type === "community_post" && referenceId) {
      // Look up the post to find which community it belongs to
      try {
        const postRes = await axios.get(`/api/posts/${referenceId}`);
        const communityId = postRes.data?.communityId;
        router.push(communityId ? `/communities/${communityId}` : "/communities");
      } catch {
        router.push("/communities");
      }
    } else if (referenceType === "post" && sourceUserId) {
      const expertId =
        (sourceUserDetails as any)?.expertId ||
        (await axios
          .get(`/api/by-user/${sourceUserId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          })
          .then((r) => r.data?.expertId)
          .catch(() => null));
      if (expertId) router.push(`/experts/${expertId}`);
    }
    setIsOpen(false);
  };

  const handleBatchClick = async (batch: NotificationBatch) => {
    if (!batch.isRead) {
      markBatchRead(batch.batchId);
      const token = localStorage.getItem("token");
      axios
        .put(`/api/notifications/batches/${batch.batchId}/read`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(console.error);
    }
    // Navigate to the expert's profile page
    if (batch.actorExpertId) {
      router.push(`/experts/${batch.actorExpertId}`);
    }
    setIsOpen(false);
  };

  // ── Connection request actions ─────────────────────────────────────────────
  const [actingOn, setActingOn] = useState<string | null>(null);

  const handleConnectionAction = async (
    e: React.MouseEvent,
    notification: Notification,
    accept: boolean
  ) => {
    e.stopPropagation();
    const connectionId = notification.referenceId;
    if (!connectionId) return;
    setActingOn(notification.notificationId);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `/api/connections/${connectionId}/${accept ? "accept" : "decline"}`,
        {},
        { headers }
      );
      // Mark the notification read and update its content locally
      markRead(notification.notificationId);
      axios.put(`/api/notifications/${notification.notificationId}`, { read: true }, { headers }).catch(() => { });
      setNotifications(
        liveNotifications.map((n) =>
          n.notificationId === notification.notificationId
            ? { ...n, read: true, content: accept ? "Connection accepted." : "Connection declined." }
            : n
        )
      );
    } catch {
      toast({ title: "Error", description: "Failed to respond to request.", variant: "destructive" });
    } finally {
      setActingOn(null);
    }
  };

  // ── Mark all as read ─────────────────────────────────────────────────────────
  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setIsLoading(true);
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await Promise.all([
        axios.post("/api/notifications/read-all", {}, { headers }),
        axios.post("/api/notifications/batches/read-all", {}, { headers }),
      ]);
      setNotifications(liveNotifications.map((n) => ({ ...n, read: true })));
      setLiveBatches(liveBatches.map((b) => ({ ...b, isRead: true })));
      toast({ title: "All notifications marked as read" });
    } catch {
      toast({ title: "Error", description: "Failed to mark all as read.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative w-9 h-9 p-0 rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-blue-600"
              variant="default"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 mt-2">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="font-medium">Notifications</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-blue-600 hover:text-blue-800"
              onClick={markAllAsRead}
              disabled={isLoading}
            >
              {isLoading ? "Marking…" : "Mark all as read"}
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[420px] overflow-scroll">
          {mergedItems.length === 0 ? (
            <div className="text-center p-4 text-gray-500">No notifications yet</div>
          ) : (
            mergedItems.map((item) => {
              if (item.kind === "batch") {
                const batch = item.data;
                return (
                  <div
                    key={`batch-${batch.batchId}`}
                    className={`px-4 py-3 hover:bg-slate-50 cursor-pointer border-b last:border-b-0 transition-colors ${!batch.isRead ? "bg-blue-50" : ""
                      }`}
                    onClick={() => handleBatchClick(batch)}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${!batch.isRead ? "bg-blue-600" : "bg-transparent"
                          }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Layers className="h-3 w-3 text-blue-500 flex-shrink-0" />
                          <p className="text-sm font-medium truncate">{batchLabel(batch)}</p>
                        </div>
                        {batch.entityIds.length > 1 && (
                          <p className="text-xs text-blue-600 mt-0.5">
                            {batch.entityIds.length} items — tap to view
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(utcDate(batch.updatedAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              const notification = item.data;
              return (
                <div
                  key={`notif-${notification.notificationId}`}
                  className={`px-4 py-3 hover:bg-slate-50 cursor-pointer border-b last:border-b-0 transition-colors ${!notification.read ? "bg-blue-50" : ""
                    }`}
                  onClick={() => handleIndividualClick(notification)}
                >
                  <div className="flex gap-3">
                    <div
                      className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${!notification.read ? "bg-blue-600" : "bg-transparent"
                        }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm line-clamp-2 break-words">
                        {stripMarkdown(notification.content)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(utcDate(notification.createdAt), { addSuffix: true })}
                      </p>
                      {notification.type === "connection_request" && notification.read === false && (
                        <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            className="h-7 px-3 text-xs"
                            disabled={actingOn === notification.notificationId}
                            onClick={(e) => handleConnectionAction(e, notification, true)}
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-3 text-xs"
                            disabled={actingOn === notification.notificationId}
                            onClick={(e) => handleConnectionAction(e, notification, false)}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
