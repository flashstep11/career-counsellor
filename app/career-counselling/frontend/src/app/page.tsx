"use client";

import HeroSection from "@/components/landing/hero-section";
import FeaturesSection from "@/components/landing/features-section";
import StatsSection from "@/components/landing/stats-section";
import CTASection from "@/components/landing/cta-section";
import dynamic from "next/dynamic";
import { Suspense } from "react";
// Lazy load heavy components to improve initial page load
const MapSection = dynamic(() => import("@/components/landing/map-section"), {
  loading: () => (
    <div className="py-20 flex justify-center items-center">
      <div className="animate-pulse text-center">
        <div className="h-8 w-64 bg-blue-100 rounded mx-auto mb-4"></div>
        <div className="h-40 w-full max-w-2xl bg-blue-50 rounded mx-auto"></div>
      </div>
    </div>
  ),
  ssr: false, // Disable server-side rendering for this component
});

const TestimonialsSection = dynamic(
  () => import("@/components/landing/testimonials-section"),
  {
    loading: () => (
      <div className="py-20 flex justify-center items-center">
        <div className="animate-pulse text-center">
          <div className="h-8 w-64 bg-blue-100 rounded mx-auto mb-4"></div>
          <div className="h-20 w-full max-w-2xl bg-blue-50 rounded mx-auto"></div>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export default function LandingPage() {
  return (
    <div className="w-full overflow-hidden">
      {/* Main Content */}
      <main>
        <HeroSection />
        <FeaturesSection />
        <Suspense fallback={null}>
          <MapSection />
        </Suspense>
        <StatsSection />
        <Suspense fallback={null}>
          <TestimonialsSection />
        </Suspense>
        <CTASection />
      </main>

      {/* Floating back-to-top button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-8 right-8 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-10"
        aria-label="Back to top"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      </button>
    </div>
  );
}
