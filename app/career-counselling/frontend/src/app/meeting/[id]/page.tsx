"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ArrowLeft, Clock, Coins, Plus, CheckCircle, Maximize2, Minimize2 } from "lucide-react";
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

    const [meetingInfo, setMeetingInfo] = useState<MeetingInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [meetingActive, setMeetingActive] = useState(false);

    // Extend states — direct REST call (no sockets)
    const [showExtendConfirm, setShowExtendConfirm] = useState(false);
    const [extendPending, setExtendPending] = useState(false);
    const [extendError, setExtendError] = useState<string | null>(null);
    const [extendSuccess, setExtendSuccess] = useState(false);

    const initRef = useRef(false);
    const apiRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const meetingActiveRef = useRef(false);

    const handleLeave = useCallback(() => {
        meetingActiveRef.current = false;
        setMeetingActive(false);
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
            meetingActiveRef.current = true;
            setMeetingActive(true);
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

    // ── Navigation guard ──
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (meetingActiveRef.current) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        const handleClick = (e: MouseEvent) => {
            if (!meetingActiveRef.current) return;
            const anchor = (e.target as HTMLElement).closest("a");
            if (!anchor) return;
            const href = anchor.getAttribute("href");
            if (!href || href.startsWith("http") || href.startsWith("//") || href === `/meeting/${meetingId}`) return;
            const leave = window.confirm("You are in an active meeting. Leaving will end the call.\n\nDo you want to leave?");
            if (!leave) { e.preventDefault(); e.stopPropagation(); }
            else {
                meetingActiveRef.current = false;
                setMeetingActive(false);
                if (apiRef.current) { apiRef.current.dispose(); apiRef.current = null; }
                if (timerRef.current) clearInterval(timerRef.current);
            }
        };
        const handlePopState = () => {
            if (!meetingActiveRef.current) return;
            const leave = window.confirm("You are in an active meeting. Going back will end the call.\n\nDo you want to leave?");
            if (!leave) window.history.pushState(null, "", window.location.href);
            else {
                meetingActiveRef.current = false;
                setMeetingActive(false);
                if (apiRef.current) { apiRef.current.dispose(); apiRef.current = null; }
                if (timerRef.current) clearInterval(timerRef.current);
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        document.addEventListener("click", handleClick, true);
        window.addEventListener("popstate", handlePopState);
        window.history.pushState(null, "", window.location.href);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            document.removeEventListener("click", handleClick, true);
            window.removeEventListener("popstate", handlePopState);
        };
    }, [meetingId]);

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
                const apiUrl = "";
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

    // Init Jitsi
    useEffect(() => {
        if (!meetingInfo || !containerRef.current) return;
        initJitsi(meetingInfo);
        return () => { if (apiRef.current) { apiRef.current.dispose(); apiRef.current = null; } };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [meetingInfo?.roomName]);

    // Auto-leave when timer hits 0
    useEffect(() => {
        if (timeLeft === 0) handleLeave();
    }, [timeLeft, handleLeave]);

    // Escape key exits fullscreen
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && isFullscreen) setIsFullscreen(false); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isFullscreen]);

    // ── Extend meeting via direct REST call ──
    const handleExtendMeeting = async () => {
        if (!meetingInfo || extendPending) return;
        setExtendError(null);
        setExtendPending(true);

        try {
            const token = localStorage.getItem("token");
            const apiUrl = "";
            const res = await fetch(`${apiUrl}/api/meetings/${meetingId}/extend`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ durationMinutes: 30 }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || "Failed to extend meeting");
            }

            // Success — update timer and wallet
            setExtendSuccess(true);
            setShowExtendConfirm(false);
            if (data.newEndTime) {
                setMeetingInfo(prev => prev ? { ...prev, endTime: data.newEndTime } : prev);
                startCountdown(data.newEndTime);
            }
            if (data.newWalletBalance !== undefined) {
                setWalletBalance(data.newWalletBalance);
            }
            setTimeout(() => setExtendSuccess(false), 3000);
        } catch (err) {
            setExtendError(err instanceof Error ? err.message : "Extension failed");
        } finally {
            setExtendPending(false);
        }
    };

    const nearEnd = timeLeft !== null && timeLeft <= 300;
    const canAffordExtension = meetingInfo ? walletBalance >= meetingInfo.extensionCost30min : false;

    if (authLoading || isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700">Connecting to meeting...</h2>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] p-4">
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

    const videoWrapperClass = isFullscreen
        ? "fixed inset-0 z-[5000] bg-gray-950 flex flex-col"
        : "relative w-full bg-gray-950 rounded-xl overflow-hidden shadow-2xl border border-gray-800";

    const videoContainerStyle = isFullscreen
        ? { width: "100%", height: "100%" }
        : { width: "100%", height: "65vh", minHeight: "400px", maxHeight: "700px" };

    return (
        <div className="py-6 max-w-6xl mx-auto space-y-4">
            {/* Page header — inline mode only */}
            {!isFullscreen && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => {
                            if (meetingActive) {
                                const leave = window.confirm("You are in an active meeting. Leaving will end the call.\n\nDo you want to leave?");
                                if (!leave) return;
                            }
                            handleLeave();
                        }}>
                            <ArrowLeft className="h-4 w-4 mr-1" />Back
                        </Button>
                        <h1 className="text-xl font-semibold text-gray-800">Meeting Room</h1>
                    </div>
                    {meetingInfo && !meetingInfo.isOwner && timeLeft !== null && (
                        <div className="flex items-center gap-3">
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold
                                ${timeLeft <= 60 ? "bg-red-100 text-red-700 animate-pulse"
                                    : timeLeft <= 300 ? "bg-orange-100 text-orange-700"
                                        : "bg-gray-100 text-gray-700"}`}>
                                <Clock className="h-4 w-4" />
                                {timeLeft <= 0 ? "Session ended" : formatTimeLeft(timeLeft)}
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm">
                                <Coins className="h-3.5 w-3.5 text-yellow-500" />
                                {walletBalance} coins
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Video container */}
            <div className={videoWrapperClass} style={videoContainerStyle}>
                <div ref={containerRef} className="w-full h-full" />

                {/* Fullscreen toggle */}
                <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="absolute top-3 left-3 z-50 p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                    title={isFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen"}
                >
                    {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                </button>

                {/* Fullscreen HUD */}
                {isFullscreen && meetingInfo && !meetingInfo.isOwner && timeLeft !== null && (
                    <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg backdrop-blur-sm
                            ${timeLeft <= 60 ? "bg-red-600/90 text-white animate-pulse"
                                : timeLeft <= 300 ? "bg-orange-500/90 text-white"
                                    : "bg-black/60 text-gray-100"}`}>
                            <Clock className="h-4 w-4" />
                            {timeLeft <= 0 ? "Session ended" : formatTimeLeft(timeLeft)}
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 text-gray-200 text-xs backdrop-blur-sm">
                            <Coins className="h-3.5 w-3.5 text-yellow-400" />
                            {walletBalance} coins
                        </div>
                    </div>
                )}

                {/* Extend button (compact, always visible when not near end) */}
                {meetingInfo && !meetingInfo.isOwner && !nearEnd && meetingInfo.extensionCost30min > 0 && !extendPending && !showExtendConfirm && (
                    <div className={`absolute ${isFullscreen ? "top-4 right-28" : "top-3 right-14"} z-50`}>
                        <button
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/60 text-gray-200 text-xs backdrop-blur-sm hover:bg-black/80 transition-colors"
                            onClick={() => { setShowExtendConfirm(true); setExtendError(null); }}
                        >
                            <Plus className="h-3 w-3" />Extend session
                        </button>
                    </div>
                )}

                {/* Extend success flash */}
                {extendSuccess && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-600/90 text-white text-sm font-semibold shadow-lg backdrop-blur-sm">
                            <CheckCircle className="h-4 w-4" />Session extended by 30 minutes!
                        </div>
                    </div>
                )}

                {/* Extend panel (near end or button clicked) */}
                {meetingInfo && !meetingInfo.isOwner && (nearEnd || showExtendConfirm) && (
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
                        <div className={`rounded-2xl shadow-2xl p-4 backdrop-blur-md border
                            ${timeLeft !== null && timeLeft <= 60
                                ? "bg-red-900/80 border-red-500"
                                : "bg-gray-900/80 border-orange-500/60"}`}>
                            {nearEnd && (
                                <p className="text-white text-sm font-medium mb-3 text-center">
                                    {timeLeft !== null && timeLeft <= 0
                                        ? "⏱️ Session time is up"
                                        : `⏳ Session ends in ${formatTimeLeft(timeLeft ?? 0)}`}
                                </p>
                            )}

                            {extendPending ? (
                                <div className="flex flex-col items-center gap-2 py-1">
                                    <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                                    <p className="text-gray-300 text-xs text-center">Extending meeting…</p>
                                </div>
                            ) : showExtendConfirm ? (
                                <div className="space-y-2">
                                    <p className="text-gray-300 text-xs text-center">
                                        Extend by <strong>30 minutes</strong> for{" "}
                                        <strong className="text-yellow-400">{meetingInfo.extensionCost30min} coins</strong>
                                        {" "}(you have {walletBalance})
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
                                            onClick={handleExtendMeeting}
                                            disabled={!canAffordExtension}
                                        >
                                            <Plus className="h-4 w-4 mr-1" />Extend 30 min
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <Button
                                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
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

            {/* Below-video info — inline mode only */}
            {!isFullscreen && meetingInfo && (
                <div className="flex items-center justify-between text-sm text-gray-500 px-1">
                    <p>
                        {meetingInfo.isOwner ? "You are the host" : "You are a participant"} •{" "}
                        Press the <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 text-xs font-mono">⤢</kbd> button to expand
                    </p>
                    {!meetingInfo.isOwner && meetingInfo.extensionCost30min > 0 && !nearEnd && !extendPending && !showExtendConfirm && (
                        <Button
                            variant="outline" size="sm" className="text-xs"
                            onClick={() => { setShowExtendConfirm(true); setExtendError(null); }}
                        >
                            <Plus className="h-3 w-3 mr-1" />Extend Session
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
