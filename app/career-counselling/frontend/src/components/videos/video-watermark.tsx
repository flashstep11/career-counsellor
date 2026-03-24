"use client";

import { useState, useEffect } from "react";

interface VideoWatermarkProps {
    phoneNumber?: string;
}

export default function VideoWatermark({ phoneNumber }: VideoWatermarkProps) {
    const [position, setPosition] = useState<{ top: string; left: string }>({
        top: "10%",
        left: "10%",
    });

    // Change position every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            const newTop = `${Math.floor(Math.random() * 70) + 10}%`;
            const newLeft = `${Math.floor(Math.random() * 70) + 10}%`;
            setPosition({ top: newTop, left: newLeft });
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const watermarkText = phoneNumber || "copyrighted";

    return (
        <div
            className="absolute pointer-events-none z-10 text-white opacity-50 bg-gray-700 rounded-lg p-1 select-none transition-all duration-1000"
            style={{
                top: position.top,
                left: position.left,
                textShadow: "1px 1px 2px rgba(0, 0, 0, 0.8)",
            }}
        >
            {watermarkText}
        </div>
    );
}
