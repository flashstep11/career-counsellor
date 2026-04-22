"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface RandomImageProps {
  alt: string;
  fill?: boolean;
  className?: string;
}

export default function RandomImage({
  alt,
  fill = true,
  className = "",
}: RandomImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRandomImage = async () => {
      try {
        const randomId = Math.floor(Math.random() * 1000);
        const img = new window.Image();
        img.src = `https://picsum.photos/800/450?random=${randomId}`;
        img.onload = () => {
          setImageUrl(img.src);
          setLoading(false);
        };
      } catch (error) {
        console.error("Error fetching random image", error);
        setLoading(false);
      }
    };

    fetchRandomImage();
  }, []);

  return (
    <div
      className={`relative ${
        fill ? "w-full h-full" : ""
      } flex items-center justify-center`}
    >
      {loading ? (
        <div className="w-10 h-10 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
      ) : (
        <Image
          src={imageUrl!}
          alt={alt}
          fill={fill}
          className={`object-cover ${className}`}
        />
      )}
    </div>
  );
}
