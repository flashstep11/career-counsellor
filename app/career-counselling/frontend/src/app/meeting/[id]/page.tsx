"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ArrowLeft, Clock, Coins, Plus, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MeetingInfo {
    roomName: string;
    jwt: string;
    userName: string;
    isOwner: boolean;
    endTime: string;
    extensionCost30min: number;
    walletBalance: number;
}

// Extend Window to hold the External API constructor
declare global {
    interface Window {
        JitsiMeetExternalAPI: any;
    }
}

function formatTimeLeft(seconds: number): string {
    if (seconds <= 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MeetingPage() {
    const params = useParams();
    const meetingId = params?.id as string;
    const router = useRouter();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const { emitEvent, onEvent } = useSocket();

    const [meetingInfo, setMeetingInfo] = useState<MeetingInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [walletBalance, setWalletBalance] = useState<number>(0);

    // Student extend states
    const [showExtendConfirm, setShowExtendConfirm] = useState(false);
    const [extendPending, setExtendPending] = useState(false);   // awaiting expert approval
    const [extendError, setExtendError] = useState<string | null>(null);
    const [extendSuccess, setExtendSuccess] = useState(false);   // briefly show success

    // Expert approval banner state
    const [incomingExtension, setIncomingExtension] = useState<{
        meetingId: string;
        durationMinutes: number;
        extensionCost: number;
    } | null>(null);
    const [respondingExtension, setRespondingExtension] = useState(false);

    const initRef = useRef(false);
    const apiRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const handleLeave = useCallback(() => {
        if (apiRef.current) {
            apiRef.current.dispose();
            apiRef.current = null;
        }
        if (timerRef.current) clearInterval(timerRef.current);
        router.push("/dashboard");
    }, [router]);

    const initJitsi = useCallback((info: MeetingInfo) => {
        if (!containerRef.current) return;
        if (apiRef.current) { apiRef.current.dispose(); apiRef.current = null; }

        const doInit = () => {
            if (!containerRef.current) return;
            apiRef.current = new window.JitsiMeetExternalAPI("8x8.vc", {
                roomName: info.roomName,
                jwt: info.jwt,
                parentNode: containerRef.current,
                width: "100%",
                height: "100%",
                userInfo: { displayName: info.userName },
                configOverwrite: {
                    prejoinPageEnabled: false,
                    disableDeepLinking: true,
                    startWithAudioMuted: false,
                    startWithVideoMuted: false,
                    enableInsecureRoomNameWarning: false,
                    requireDisplayName: false,
                },
                interfaceConfigOverwrite: {
                    SHOW_JITSI_WATERMARK: false,
                    SHOW_BRAND_WATERMARK: false,
                    SHOW_POWERED_BY: false,
                    HIDE_LOBBY_BUTTON: true,
                    TOOLBAR_BUTTONS: [
                        "microphone", "camera", "desktop", "fullscreen",
                        "fodeviceselection", "chat", "participants-pane",
                        "tileview", "hangup",
                    ],
                },
            });
            apiRef.current.addEventListeners({
                readyToClose: handleLeave,
                videoConferenceLeft: handleLeave,
            });
        };

        if (window.JitsiMeetExternalAPI) {
            doInit();
        } else {
            const script = document.createElement("script");
            script.src = "https://8x8.vc/external_api.js";
            script.async = true;
            script.onload = doInit;
            script.onerror = () => setError("Failed to load video SDK.");
            document.head.appendChild(script);
        }
    }, [handleLeave]);

    const startCountdown = useCallback((endTimeIso: string) => {
        if (timerRef.current) clearInterval(timerRef.current);
        const tick = () => {
            const secs = Math.max(0, Math.floor((new Date(endTimeIso).getTime() - Date.now()) / 1000));
            setTimeLeft(secs);
        };
        tick();
        timerRef.current = setInterval(tick, 1000);
    }, []);

    // Fetch meeting info
    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) { router.push(`/login?redirect=/meeting/${meetingId}`); return; }
        if (initRef.current) return;
        initRef.current = true;

        const fetchMeetingInfo = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem("token");
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
                const res = await fetch(`${apiUrl}/api/meetings/${meetingId}/token`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) {
                    let msg = "Failed to join meeting";
                    try { msg = (await res.json()).detail || msg; } catch { /* ignore */ }
                    throw new Error(msg);
                }
                const data = await res.json();
                if (!data.roomName) throw new Error("No meeting room available");
                const info: MeetingInfo = {
                    roomName: data.roomName,
                    jwt: data.jwt || "",
                    userName: data.userName || "Guest",
                    isOwner: data.isOwner || false,
                    endTime: data.endTime,
                    extensionCost30min: data.extensionCost30min || 0,
                    walletBalance: data.walletBalance || 0,
                };
                setMeetingInfo(info);
                setWalletBalance(info.walletBalance);
                if (info.endTime) startCountdown(info.endTime);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load meeting");
            } finally {
                setIsLoading(false);
            }
        };

        if (meetingId) fetchMeetingInfo();
        return () => {
            initRef.current = false;
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [meetingId, isAuthenticated, authLoading, router, startCountdown]);

    // Init Jitsi once meeting info is ready
    useEffect(() => {
        if (!meetingInfo || !containerRef.current) return;
        initJitsi(meetingInfo);
        return () => { if (apiRef.current) { apiRef.current.dispose(); apiRef.current = null; } };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [meetingInfo?.roomName]);

    // Socket listeners for extension approval flow
    useEffect(() => {
        if (!meetingInfo) return;

        if (!meetingInfo.isOwner) {
            // STUDENT: listen for approval/denial/error responses
            const onApproved = (data: any) => {
                if (data.meetingId !== meetingId) return;
                setExtendPending(false);
                setShowExtendConfirm(false);
                setExtendSuccess(true);
                setWalletBalance(data.newWalletBalance);
                setMeetingInfo(prev => prev ? { ...prev, endTime: data.newEndTime, walletBalance: data.newWalletBalance } : prev);
                if (data.newEndTime) startCountdown(data.newEndTime);
                setTimeout(() => setExtendSuccess(false), 3000);
            };
            const onDenied = (data: any) => {
                if (data.meetingId !== meetingId) return;
                setExtendPending(false);
                setExtendError(data.reason || "Expert declined the extension.");
            };
            const onError = (data: any) => {
                if (data.meetingId !== meetingId) return;
                setExtendPending(false);
                setExtendError(data.reason || "Extension request failed.");
            };

            const cleanApproved = onEvent("extension_approved", onApproved);
            const cleanDenied = onEvent("extension_denied", onDenied);
            const cleanError = onEvent("extension_error", onError);
            return () => { cleanApproved(); cleanDenied(); cleanError(); };
        } else {
            // EXPERT: listen for incoming extension requests
            const onIncoming = (data: any) => {
                if (data.meetingId !== meetingId) return;
                setIncomingExtension(data);
            };
            const cleanIncoming = onEvent("extension_request_incoming", onIncoming);
            return () => cleanIncoming();
        }
    }, [meetingInfo, meetingId, onEvent, startCountdown]);

    // Student: send extension request via socket
    const handleRequestExtension = () => {
        if (!meetingInfo || extendPending) return;
        setExtendError(null);
        setExtendPending(true);
        emitEvent("extension_request", { meetingId, durationMinutes: 30 });
    };

    // Expert: respond to incoming extension request
    const handleRespondExtension = (approved: boolean) => {
        if (!incomingExtension) return;
        setRespondingExtension(true);
        emitEvent("extension_respond", { meetingId: incomingExtension.meetingId, approved });
        setIncomingExtension(null);
        setRespondingExtension(false);
    };

    const nearEnd = timeLeft !== null && timeLeft <= 300;
    const canAffordExtension = meetingInfo ? walletBalance >= meetingInfo.extensionCost30min : false;

    if (authLoading || isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700">Connecting to meeting...</h2>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
                <Card className="max-w-md w-full p-6 space-y-4">
                    <div className="flex items-center gap-3 text-red-600 mb-2">
                        <AlertCircle className="h-8 w-8" />
                        <h2 className="text-2xl font-bold">Error Joining</h2>
                    </div>
                    <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
                    <Button onClick={() => router.push("/dashboard")} className="w-full">
                        <ArrowLeft className="mr-2 h-4 w-4" />Return to Dashboard
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-gray-950 relative">
            {/* Full-screen Jitsi container */}
            <div ref={containerRef} className="w-full h-full" />

            {/* ── EXPERT: incoming extension approval banner ── */}
            {meetingInfo?.isOwner && incomingExtension && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
                    <div className="rounded-2xl shadow-2xl p-4 bg-blue-900/90 border border-blue-400/60 backdrop-blur-md">
                        <p className="text-white text-sm font-semibold text-center mb-1">
                            🙋 Student requests a 30-min extension
                        </p>
                        <p className="text-blue-200 text-xs text-center mb-3">
                            Cost to them: <strong className="text-yellow-300">{incomingExtension.extensionCost} coins</strong>
                        </p>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleRespondExtension(false)}
                                disabled={respondingExtension}
                            >
                                <XCircle className="h-4 w-4 mr-1" />Decline
                            </Button>
                            <Button
                                size="sm"
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleRespondExtension(true)}
                                disabled={respondingExtension}
                            >
                                <CheckCircle className="h-4 w-4 mr-1" />Approve
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── STUDENT: session HUD ── */}
            {meetingInfo && !meetingInfo.isOwner && timeLeft !== null && (
                <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg backdrop-blur-sm pointer-events-none
                        ${timeLeft <= 60 ? "bg-red-600/90 text-white animate-pulse"
                            : timeLeft <= 300 ? "bg-orange-500/90 text-white"
                            : "bg-black/60 text-gray-100"}`}
                    >
                        <Clock className="h-4 w-4" />
                        {timeLeft <= 0 ? "Session ended" : formatTimeLeft(timeLeft)}
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 text-gray-200 text-xs backdrop-blur-sm">
                        <Coins className="h-3.5 w-3.5 text-yellow-400" />
                        {walletBalance} coins
                    </div>
                </div>
            )}

            {/* ── STUDENT: compact extend button (outside 5-min window) ── */}
            {meetingInfo && !meetingInfo.isOwner && !nearEnd && meetingInfo.extensionCost30min > 0 && !extendPending && (
                <div className="absolute top-4 right-28 z-50">
                    <button
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/60 text-gray-200 text-xs backdrop-blur-sm hover:bg-black/80 transition-colors"
                        onClick={() => { setShowExtendConfirm(true); setExtendError(null); }}
                    >
                        <Plus className="h-3 w-3" />Extend session
                    </button>
                </div>
            )}

            {/* ── STUDENT: extend success flash ── */}
            {extendSuccess && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-600/90 text-white text-sm font-semibold shadow-lg backdrop-blur-sm">
                        <CheckCircle className="h-4 w-4" />Session extended by 30 minutes!
                    </div>
                </div>
            )}

            {/* ── STUDENT: extend panel (at ≤5 min OR compact button clicked) ── */}
            {meetingInfo && !meetingInfo.isOwner && (nearEnd || showExtendConfirm) && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
                    <div className={`rounded-2xl shadow-2xl p-4 backdrop-blur-md border
                        ${timeLeft !== null && timeLeft <= 60
                            ? "bg-red-900/80 border-red-500"
                            : "bg-gray-900/80 border-orange-500/60"}`}
                    >
                        {nearEnd && (
                            <p className="text-white text-sm font-medium mb-3 text-center">
                                {timeLeft !== null && timeLeft <= 0
                                    ? "⏱️ Session time is up"
                                    : `⏳ Session ends in ${formatTimeLeft(timeLeft ?? 0)}`}
                            </p>
                        )}

                        {extendPending ? (
                            // Awaiting expert approval
                            <div className="flex flex-col items-center gap-2 py-1">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                                <p className="text-gray-300 text-xs text-center">Waiting for expert to approve…</p>
                                <button
                                    className="text-gray-500 text-xs underline mt-1"
                                    onClick={() => { setExtendPending(false); setShowExtendConfirm(false); }}
                                >
                                    Cancel request
                                </button>
                            </div>
                        ) : showExtendConfirm ? (
                            <div className="space-y-2">
                                <p className="text-gray-300 text-xs text-center">
                                    Extend by <strong>30 minutes</strong> for{" "}
                                    <strong className="text-yellow-400">{meetingInfo.extensionCost30min} coins</strong>
                                    {" "}(you have {walletBalance})
                                    <br /><span className="text-gray-400">Expert must approve the request.</span>
                                </p>
                                {extendError && <p className="text-red-400 text-xs text-center">{extendError}</p>}
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline" size="sm"
                                        className="flex-1 text-gray-300 border-gray-600"
                                        onClick={() => { setShowExtendConfirm(false); setExtendError(null); }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                        onClick={handleRequestExtension}
                                        disabled={!canAffordExtension}
                                    >
                                        <Plus className="h-4 w-4 mr-1" />Send Request
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <Button
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold pointer-events-auto"
                                onClick={() => { setShowExtendConfirm(true); setExtendError(null); }}
                                disabled={!canAffordExtension}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                {canAffordExtension
                                    ? `Extend 30 min — ${meetingInfo.extensionCost30min} coins`
                                    : `Insufficient coins (need ${meetingInfo.extensionCost30min})`}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
