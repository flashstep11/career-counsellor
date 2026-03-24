"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useState, useMemo, memo } from "react";

// Memoize individual card to prevent unnecessary renders
const TestimonialCard = memo(({ item }: {
  item: { quote: string; name: string; title: string; }
}) => {
  return (
    <li
      className="w-[350px] max-w-full relative rounded-2xl border border-b-0 flex-shrink-0 border-slate-700 px-8 py-6 md:w-[450px]"
      style={{
        background: "linear-gradient(180deg, var(--slate-800), var(--slate-900)",
      }}
    >
      <blockquote>
        <div
          aria-hidden="true"
          className="user-select-none -z-1 pointer-events-none absolute -left-0.5 -top-0.5 h-[calc(100%_+_4px)] w-[calc(100%_+_4px)]"
        ></div>
        <span className="relative z-20 text-sm leading-[1.6] text-gray-100 font-normal">
          {item.quote}
        </span>
        <div className="relative z-20 mt-6 flex flex-row items-center">
          <span className="flex flex-col gap-1">
            <span className="text-sm leading-[1.6] text-gray-400 font-normal">
              {item.name}
            </span>
            <span className="text-sm leading-[1.6] text-gray-400 font-normal">
              {item.title}
            </span>
          </span>
        </div>
      </blockquote>
    </li>
  );
});

TestimonialCard.displayName = "TestimonialCard";

export const InfiniteMovingCards = ({
  items,
  direction = "left",
  speed = "fast",
  pauseOnHover = true,
  className,
}: {
  items: {
    quote: string;
    name: string;
    title: string;
  }[];
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  pauseOnHover?: boolean;
  className?: string;
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollerRef = React.useRef<HTMLUListElement>(null);
  const [start, setStart] = useState(false);

  // Use CSS variables for animation control
  const cssProperties = useMemo(() => {
    return {
      "--animation-duration": speed === "fast" ? "20s" : speed === "normal" ? "40s" : "80s",
      "--animation-direction": direction === "left" ? "forwards" : "reverse",
    } as React.CSSProperties;
  }, [speed, direction]);

  useEffect(() => {
    let isMounted = true;

    // Improve performance by using requestAnimationFrame
    const frameId = requestAnimationFrame(() => {
      if (!isMounted) return;

      if (scrollerRef.current && containerRef.current) {
        // Clone testimonial items for infinite scrolling effect
        const scrollerContent = Array.from(scrollerRef.current.children);

        // Only clone nodes if we haven't already (check length to avoid duplicate cloning)
        if (scrollerContent.length === items.length) {
          scrollerContent.forEach((item) => {
            const duplicatedItem = item.cloneNode(true);
            scrollerRef.current?.appendChild(duplicatedItem);
          });

          setStart(true);
        }
      }
    });

    return () => {
      isMounted = false;
      cancelAnimationFrame(frameId);
    };
  }, [items.length]);

  // Use the memoized items to prevent recreating the array on each render
  const memoizedItems = useMemo(() => items, [items]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "scroller relative z-20 max-w-7xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]",
        className
      )}
      style={cssProperties}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          "flex min-w-full shrink-0 gap-4 py-4 w-max flex-nowrap",
          start && "animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]"
        )}
      >
        {memoizedItems.map((item, idx) => (
          <TestimonialCard key={`${item.name}-${idx}`} item={item} />
        ))}
      </ul>
    </div>
  );
};
