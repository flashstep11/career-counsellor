"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";
import { Crown, Lock, Coins, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";

interface SubscribeButtonProps {
  variant?: "default" | "primary" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
  className?: string;
  showIcon?: boolean;
  text?: string;
}

const SubscribeButton = function ({
  variant = "default",
  size = "default",
  className = "",
  showIcon = true,
  text = "Subscribe",
}: SubscribeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  // If user is already subscribed, don't show the button
  if (user?.type === "paid") {
    return null;
  }

  const handleSubscribeClick = (e: React.MouseEvent) => {
    // Prevent event propagation to parent elements (important for dropdowns)
    e.stopPropagation();

    if (!user) {
      router.push('/login');
      return;
    }

    setShowDialog(true);
  };

  const handleSubscription = async () => {
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem("token");
      
      if (!token) {
        toast.error("Authentication token not found. Please login again.");
        router.push('/login');
        return;
      }
      
      const response = await axios.post('/api/users/subscribe', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log("Subscription response:", response.data);
      
      if (response.data && response.data.success === true) {
        setShowDialog(false);
        toast.success("Subscription successful! You now have premium access.");
        setTimeout(() => {
          window.location.reload();
        }, 2500); 
      } else {
        const errorMsg = response.data?.message || "Failed to subscribe";
        toast.error(errorMsg);
      }
    } catch (error: any) {
      let errorMessage = "Failed to subscribe";
      if (error.response && error.response.data && error.response.data.detail) {
        errorMessage = error.response.data.detail;
      }
      toast.error(errorMessage);
      console.error("Subscription error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert string variants to match the Button component's variants
  const buttonVariant = variant === "primary" ? "default" : variant;

  return (
    <>
      <Button 
        variant={buttonVariant as any}
        size={size}
        className={`${className} ${variant === "primary" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
        onClick={handleSubscribeClick}
      >
        {showIcon && <Crown className="h-4 w-4 mr-2" />}
        {text}
      </Button>

      <Dialog 
        open={showDialog} 
        onOpenChange={(open) => {
          // Only allow manual closing, not automatic closing from parent components
          if (!open) setShowDialog(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Subscribe for Premium Access
            </DialogTitle>
            <DialogDescription>
              Get unlimited access to all videos and premium content.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                <Coins className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Subscription Cost</p>
                <p className="text-2xl font-bold">10,000 coins</p>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {user?.wallet !== undefined && (
                  <p>
                    Your current balance: <span className="font-medium">{user.wallet} coins</span>
                  </p>
                )}
              </div>

              <div className="w-full mt-2 p-4 rounded-lg bg-gray-50">
                <h4 className="font-medium mb-2">Benefits:</h4>
                <ul className="text-sm text-left space-y-2">
                  <li className="flex items-start gap-2">
                    <div className="h-5 w-5 flex items-center justify-center rounded-full bg-green-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                        <path d="M20 6 9 17l-5-5"/>
                      </svg>
                    </div>
                    <span>Full access to all video content</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-5 w-5 flex items-center justify-center rounded-full bg-green-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                        <path d="M20 6 9 17l-5-5"/>
                      </svg>
                    </div>
                    <span>No more preview limitations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-5 w-5 flex items-center justify-center rounded-full bg-green-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                        <path d="M20 6 9 17l-5-5"/>
                      </svg>
                    </div>
                    <span>Premium user badge</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex sm:flex-row flex-col gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDialog(false)}
              className="sm:flex-grow-0 w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            
            {(user?.wallet || 0) < 10000 ? (
              <Button 
                variant="default"
                asChild
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto order-1 sm:order-2"
              >
                <Link href="/wallet" onClick={() => setShowDialog(false)}>
                  <Wallet className="h-4 w-4 mr-2" />
                  Top Up Wallet
                </Link>
              </Button>
            ) : (
              <Button 
                onClick={handleSubscription}
                disabled={isLoading || (user?.wallet || 0) < 10000}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto order-1 sm:order-2"
              >
                {isLoading ? "Processing..." : "Subscribe Now"}
              </Button>
            )}
          </DialogFooter>
          
          {(user?.wallet || 0) < 10000 && (
            <p className="text-xs text-center text-red-500 mt-2">
              <Lock className="inline h-3 w-3 mr-1" />
              Insufficient funds. You need 10,000 coins to subscribe.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export { SubscribeButton };