import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/shared/navbar";
import Sidebar from "@/components/shared/sidebar";
import { SidebarProvider } from "@/components/shared/sidebar/sidebar-context";
import { SidebarContentWrapper } from "@/components/shared/sidebar/sidebar-content-wrapper";
import Footer from "@/components/shared/footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { BackButton } from "@/components/shared/back-button";
import OnboardingGate from "@/components/shared/onboarding-gate";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AlumNiti",
  description: "Career guidance platform for Indian students",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { url: "/logo.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="icon" href="/logo.png" type="image/png" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#000000" />
        <meta
          name="description"
          content="Career guidance platform for Indian students"
        />
        <meta
          name="keywords"
          content="career, guidance, counselling, students, alumni"
        />
        <meta name="author" content="AlumNiti Team" />
        <meta property="og:title" content="AlumNiti" />
        <meta
          property="og:description"
          content="Career guidance platform for Indian students"
        />
        <meta property="og:image" content="/logo.png" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <SocketProvider>
            <SidebarProvider>
              {/* Collapsible Sidebar – Fixed Left */}
              <Sidebar />

              {/* Top Navbar */}
              <Navbar />

              {/* Main Content – offsets left based on sidebar collapsed state */}
              <SidebarContentWrapper>
                <main className="min-h-screen pt-[80px] bg-gray-50">
                  <div className="px-6">
                    <BackButton />
                    {children}
                  </div>
                </main>

                {/* Footer */}
                <Footer />
              </SidebarContentWrapper>
            </SidebarProvider>

            <OnboardingGate />
            <Toaster />
            <Analytics />
            <SpeedInsights />
            <SonnerToaster position="bottom-right" richColors />
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
