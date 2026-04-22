"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Loader2, MessageCircle, Search, Send, WifiOff } from "lucide-react";
import { toast } from "sonner";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { cn, utcDate } from "@/lib/utils";
import type { ChatConversation, ChatMessage } from "@/types";

function authHeader() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function currentUserId(user: unknown): string {
  const value = user as { _id?: string; id?: string } | null;
  return value?._id ?? value?.id ?? "";
}

function displayName(user?: { firstName?: string | null; lastName?: string | null }) {
  const name = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
  return name || "Connection";
}

function initials(user?: { firstName?: string | null; lastName?: string | null }) {
  const value = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();
  return value || "?";
}

function messageTime(value: string) {
  return utcDate(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function errorDetail(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: string } | undefined;
    return data?.detail ?? fallback;
  }
  return fallback;
}

interface ReceiveMessagePayload {
  message_id?: string;
  sender_id?: string;
  receiver_id?: string;
  content?: string;
  timestamp?: string;
  message?: ChatMessage;
}

function normalizeSocketMessage(payload: ChatMessage | ReceiveMessagePayload): ChatMessage | null {
  const wrapped = payload as ReceiveMessagePayload;
  if (wrapped.message) return wrapped.message;

  const direct = payload as ChatMessage;
  if (direct.senderId && direct.recipientId) return direct;

  if (!wrapped.sender_id || !wrapped.receiver_id || !wrapped.content || !wrapped.timestamp) {
    return null;
  }

  return {
    _id: wrapped.message_id,
    id: wrapped.message_id,
    messageId: wrapped.message_id ?? `${wrapped.sender_id}:${wrapped.receiver_id}:${wrapped.timestamp}`,
    senderId: wrapped.sender_id,
    recipientId: wrapped.receiver_id,
    content: wrapped.content,
    conversationKey: [wrapped.sender_id, wrapped.receiver_id].sort().join(":"),
    participants: [wrapped.sender_id, wrapped.receiver_id],
    readBy: [],
    createdAt: wrapped.timestamp,
    updatedAt: wrapped.timestamp,
  };
}

function conversationPreview(conversation: ChatConversation, myId: string) {
  if (!conversation.lastMessage) return "Start the conversation";
  const prefix = conversation.lastMessage.senderId === myId ? "You: " : "";
  return `${prefix}${conversation.lastMessage.content}`;
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatContent />
    </ProtectedRoute>
  );
}

function ChatContent() {
  const { user } = useAuth();
  const { emitEvent, onEvent, socketReady, socketConnected } = useSocket();
  const myId = currentUserId(user);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedOtherId, setSelectedOtherId] = useState("");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const seenSocketMessageIds = useRef<Set<string>>(new Set());

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.otherUser.userId === selectedOtherId),
    [conversations, selectedOtherId]
  );

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((conversation) =>
      displayName(conversation.otherUser).toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await axios.get("/api/chat/conversations", { headers: authHeader() });
      const data: ChatConversation[] = res.data ?? [];
      setConversations(data);

      const urlUser =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("user")
          : null;

      setSelectedOtherId((current) => {
        if (current && data.some((conversation) => conversation.otherUser.userId === current)) {
          return current;
        }
        if (urlUser && data.some((conversation) => conversation.otherUser.userId === urlUser)) {
          return urlUser;
        }
        return data[0]?.otherUser.userId ?? "";
      });
    } catch {
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const fetchMessages = useCallback(async (otherUserId: string) => {
    if (!otherUserId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    try {
      const res = await axios.get(`/api/chat/messages/${otherUserId}`, {
        headers: authHeader(),
        params: { limit: 100 },
      });
      setMessages(res.data ?? []);
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.otherUser.userId === otherUserId
            ? { ...conversation, unreadCount: 0 }
            : conversation
        )
      );
      emitEvent("chat:read", { otherUserId });
    } catch (error: unknown) {
      toast.error(errorDetail(error, "Could not load messages"));
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [emitEvent]);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    if (selectedOtherId) {
      fetchMessages(selectedOtherId);
    }
  }, [fetchMessages, selectedOtherId]);

  useEffect(() => {
    if (!selectedOtherId || !socketConnected) return;
    emitEvent("join_chat", { target_user_id: selectedOtherId });
  }, [emitEvent, selectedOtherId, socketConnected, socketReady]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, selectedOtherId]);

  useEffect(() => {
    const handleIncomingMessage = (payload: ChatMessage | ReceiveMessagePayload) => {
      const message = normalizeSocketMessage(payload);
      if (!message) return;
      if (!message.participants?.includes(myId)) return;

      const messageKey = message.messageId || message.id || message._id;
      if (messageKey) {
        if (seenSocketMessageIds.current.has(messageKey)) return;
        seenSocketMessageIds.current.add(messageKey);
      }

      const otherId = message.senderId === myId ? message.recipientId : message.senderId;
      setMessages((prev) => {
        if (otherId !== selectedOtherId) return prev;
        if (prev.some((item) => item.messageId === message.messageId)) return prev;
        return [...prev, message];
      });

      setConversations((prev) => {
        const next = prev.map((conversation) => {
          if (conversation.otherUser.userId !== otherId) return conversation;
          const isUnread = message.senderId !== myId && otherId !== selectedOtherId;
          return {
            ...conversation,
            lastMessage: message,
            updatedAt: message.createdAt,
            unreadCount: isUnread ? conversation.unreadCount + 1 : conversation.unreadCount,
          };
        });
        return next.sort((a, b) => utcDate(b.updatedAt).getTime() - utcDate(a.updatedAt).getTime());
      });

      if (message.senderId !== myId && otherId === selectedOtherId) {
        axios
          .put(`/api/chat/messages/${otherId}/read`, {}, { headers: authHeader() })
          .catch(() => {});
        emitEvent("chat:read", { otherUserId: otherId });
      }
    };

    const offReceiveMessage = onEvent("receive_message", handleIncomingMessage);
    const offLegacyMessage = onEvent("chat:message", handleIncomingMessage);

    const offError = onEvent("chat:error", (payload: { reason?: string }) => {
      toast.error(payload?.reason ?? "Message could not be sent");
      setSending(false);
    });

    const offChatError = onEvent("chat_error", (payload: { reason?: string }) => {
      toast.error(payload?.reason ?? "Message could not be sent");
      setSending(false);
    });

    return () => {
      offReceiveMessage();
      offLegacyMessage();
      offError();
      offChatError();
    };
  }, [emitEvent, myId, onEvent, selectedOtherId, socketReady]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || !selectedOtherId || sending) return;

    setDraft("");
    setSending(true);

    if (socketConnected) {
      emitEvent("join_chat", { target_user_id: selectedOtherId });
    }

    try {
      const res = await axios.post(
        "/api/chat/messages",
        { recipientId: selectedOtherId, content },
        { headers: authHeader() }
      );
      const message: ChatMessage = res.data;
      setMessages((prev) =>
        prev.some((item) => item.messageId === message.messageId) ? prev : [...prev, message]
      );
      await refreshConversations();
    } catch (error: unknown) {
      toast.error(errorDetail(error, "Message could not be sent"));
      setDraft(content);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 py-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Connected chat</p>
          <h1 className="text-3xl font-bold text-gray-950">Messages</h1>
          <p className="mt-1 text-sm text-gray-500">
            Talk privately with people who are already in your network.
          </p>
        </div>
        {!socketConnected && (
          <div className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <WifiOff className="h-4 w-4" />
            Reconnecting
          </div>
        )}
      </div>

      <div className="grid min-h-[68vh] overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-gray-200 lg:border-b-0 lg:border-r">
          <div className="border-b border-gray-100 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search connections"
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="h-[260px] lg:h-[calc(68vh-74px)]">
            {loadingConversations ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <MessageCircle className="mx-auto mb-3 h-9 w-9 text-gray-300" />
                <p className="font-medium text-gray-800">No connections to message</p>
                <p className="mt-1 text-sm text-gray-500">
                  Accepted connections will appear here.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href="/network">Go to network</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredConversations.map((conversation) => {
                  const active = conversation.otherUser.userId === selectedOtherId;
                  return (
                    <button
                      key={conversation.conversationId}
                      type="button"
                      onClick={() => setSelectedOtherId(conversation.otherUser.userId)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                        active ? "bg-emerald-50" : "hover:bg-gray-50"
                      )}
                    >
                      <Avatar className="h-11 w-11">
                        <AvatarImage
                          src={conversation.otherUser.profilePicture || undefined}
                          alt={displayName(conversation.otherUser)}
                        />
                        <AvatarFallback className="bg-gray-900 text-white">
                          {initials(conversation.otherUser)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold text-gray-950">
                            {displayName(conversation.otherUser)}
                          </span>
                          {conversation.unreadCount > 0 && (
                            <Badge className="bg-emerald-600 text-white">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </span>
                        <span className="mt-1 block truncate text-sm text-gray-500">
                          {conversationPreview(conversation, myId)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </aside>

        <section className="flex min-h-[520px] flex-col">
          {selectedConversation ? (
            <>
              <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                <Avatar className="h-11 w-11">
                  <AvatarImage
                    src={selectedConversation.otherUser.profilePicture || undefined}
                    alt={displayName(selectedConversation.otherUser)}
                  />
                  <AvatarFallback className="bg-gray-900 text-white">
                    {initials(selectedConversation.otherUser)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${selectedConversation.otherUser.userId}`}
                    className="font-semibold text-gray-950 hover:underline"
                  >
                    {displayName(selectedConversation.otherUser)}
                  </Link>
                  <p className="text-sm text-gray-500">
                    {selectedConversation.otherUser.isExpert ? "Expert connection" : "Connection"}
                  </p>
                </div>
              </div>

              <ScrollArea className="flex-1 bg-gray-50/80">
                <div className="space-y-3 px-4 py-5">
                  {loadingMessages ? (
                    <div className="flex justify-center py-16">
                      <Loader2 className="h-7 w-7 animate-spin text-gray-500" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="mx-auto max-w-sm py-16 text-center">
                      <MessageCircle className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                      <p className="font-medium text-gray-900">No messages yet</p>
                      <p className="mt-1 text-sm text-gray-500">
                        Send a note to start the chat.
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const mine = message.senderId === myId;
                      return (
                        <div
                          key={message.messageId}
                          className={cn("flex", mine ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[78%] rounded-md px-3 py-2 text-sm shadow-sm",
                              mine
                                ? "bg-emerald-600 text-white"
                                : "border border-gray-200 bg-white text-gray-900"
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            <p
                              className={cn(
                                "mt-1 text-right text-[11px]",
                                mine ? "text-emerald-50" : "text-gray-400"
                              )}
                            >
                              {messageTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              <div className="border-t border-gray-100 bg-white p-4">
                <div className="flex gap-3">
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Write a message"
                    className="max-h-32 min-h-11 resize-none"
                    disabled={sending}
                  />
                  <Button
                    type="button"
                    onClick={handleSend}
                    disabled={!draft.trim() || sending}
                    className="h-11"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span className="sr-only">Send</span>
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-gray-50/80 px-6 text-center">
              <div className="max-w-sm">
                <MessageCircle className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                <h2 className="text-xl font-semibold text-gray-950">Choose a connection</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Select someone from your network to open a private chat.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
