"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Wallet, Clock, AlertCircle, Check, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import axios from "axios";

interface BookMeetingProps {
  calendarUrl: string;
  cost: number;
  disabled?: boolean;
  buttonColor?: string;
  buttonLabel?: string;
  expertId: string;
}

interface Calendar {
  schedulingButton: {
    load: (config: {
      url: string;
      color: string;
      label: string;
      target: HTMLElement;
    }) => void;
  };
}

declare global {
  interface Window {
    calendar?: Calendar;
  }
}

export default function BookMeeting({
  calendarUrl,
  cost,
  disabled = false,
  buttonColor = "#000000",
  buttonLabel = "Book an appointment",
  expertId,
}: BookMeetingProps) {
  const router = useRouter();
  const primaryButtonRef = useRef<HTMLDivElement>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userWallet, setUserWallet] = useState(0);
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // When the component mounts, fetch the user's wallet balance
    const fetchWalletBalance = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await axios.get("/api/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data && response.data.wallet !== undefined) {
          setUserWallet(response.data.wallet);
          setInsufficientFunds(response.data.wallet < cost);
        }
      } catch (error) {
        console.error("Error fetching wallet balance:", error);
      }
    };

    fetchWalletBalance();
  }, [cost]);

  const loadCalendar = useCallback(() => {
    if (
      window.calendar?.schedulingButton &&
      calendarContainerRef.current &&
      !isInitialized.current &&
      !disabled
    ) {
      window.calendar.schedulingButton.load({
        url: calendarUrl,
        color: buttonColor,
        label: "Continue Booking",
        target: calendarContainerRef.current,
      });
      isInitialized.current = true;
    } else if (
      window.calendar?.schedulingButton &&
      calendarContainerRef.current &&
      !isInitialized.current &&
      disabled
    ) {
      calendarContainerRef.current.innerHTML = `<div class="bg-gray-200 text-gray-500 text-center p-2 rounded-md cursor-not-allowed">
        <span>Expert unavailable</span>
      </div>`;
    }
  }, [calendarUrl, buttonColor, disabled]);

  useEffect(() => {
    if (paymentComplete) {
      loadCalendar();
    }
  }, [paymentComplete, loadCalendar]);

  const handleBookMeeting = async () => {
    if (!user) {
      toast.error("You must be logged in to book a meeting");
      return;
    }

    setIsProcessing(true);

    try {
      // Debug info
      console.log("User ID:", user._id);
      console.log("Expert ID:", expertId);
      console.log("Cost:", cost);

      // Book the meeting by creating a meeting record and processing payment
      const token = localStorage.getItem("token");
      let correctExpertId = expertId;

      try {
        const tokenParts = token?.split(".");
        if (tokenParts && tokenParts.length === 3) {
          const tokenPayload = JSON.parse(atob(tokenParts[1]));
          console.log("Token payload:", tokenPayload);
        }
      } catch (e) {
        console.error("Error parsing token:", e);
      }

      console.log("Using expert ID:", correctExpertId);

      const meetingData = {
        expertId: correctExpertId,
        userId: user._id,
        amount: cost,
        startTime: new Date().toISOString(), // Will be updated by the calendar API callback
        endTime: new Date(Date.now() + 3600000).toISOString(), // Placeholder, 1 hour later
        status: "scheduled", // Add status field explicitly
      };

      console.log("Sending meeting data:", meetingData);

      const response = await axios.post("/api/meetings", meetingData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Meeting created response:", response.data);

      // Success - show success message
      toast.success(
        "Payment successful! Please continue with booking your time slot."
      );

      // Update the wallet balance in the UI
      setUserWallet((prev) => prev - cost);

      // Close the dialog and set payment as complete
      setShowConfirmDialog(false);
      setPaymentComplete(true);
    } catch (error: any) {
      console.error("Error booking meeting:", error);
      // Display more detailed error info
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);

        const errorDetail = error.response.data?.detail || "Unknown error";
        toast.error(`Payment failed: ${errorDetail}`);
      } else if (error.request) {
        toast.error("No response received from server. Please try again.");
      } else {
        toast.error(`Request error: ${error.message}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex justify-center flex-col">
      <link
        href="https://calendar.google.com/calendar/scheduling-button-script.css"
        rel="stylesheet"
      />
      <Script
        src="https://calendar.google.com/calendar/scheduling-button-script.js"
        onLoad={() => {
          if (paymentComplete) {
            loadCalendar();
          }
        }}
      />

      {insufficientFunds ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4 flex flex-col gap-3 text-red-700 text-sm shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>
              Insufficient wallet balance. Please add more coins to continue.
            </span>
          </div>
          <Button 
            onClick={() => router.push('/wallet')} 
            className="bg-primary hover:bg-primary/90 text-white w-full mt-2"
          >
            <Wallet className="h-4 w-4 mr-2" /> Top Up Wallet
          </Button>
        </div>
      ) : null}

      <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-3 text-sm">
          <div className="bg-blue-100 p-2 rounded-full">
            <Wallet className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="text-gray-500">Your balance</div>
            <div className="font-medium">{userWallet} coins</div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="bg-purple-100 p-2 rounded-full">
            <Clock className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <div className="text-gray-500">Session cost</div>
            <div className="font-medium">{cost} coins</div>
          </div>
        </div>
      </div>

      {paymentComplete ? (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 text-green-700">
          <Check className="h-5 w-5" />
          <div>
            <p className="font-medium">Payment Complete</p>
            <p className="text-sm text-green-600">
              Please select your preferred time slot below
            </p>
          </div>
        </div>
      ) : null}

      {/* Show primary booking button before payment */}
      {!paymentComplete && (
        <>
          {insufficientFunds ? (
            <Button className="w-full mb-4" variant="outline" disabled={true}>
              Insufficient funds for booking
            </Button>
          ) : (
            <AlertDialog
              open={showConfirmDialog}
              onOpenChange={setShowConfirmDialog}
            >
              <AlertDialogTrigger asChild>
                <Button
                  className="w-full mb-4 py-6 text-base font-medium flex items-center gap-2"
                  variant="default"
                  disabled={disabled || insufficientFunds}
                >
                  <Calendar className="h-5 w-5" />
                  Book an appointment
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md bg-white rounded-xl shadow-lg border-0">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-bold text-gray-800">
                    Confirm Booking
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-600">
                    <div className="my-6 bg-gray-50 rounded-lg p-5 border border-gray-100">
                      <div className="font-medium text-gray-800 mb-3">
                        Booking Summary
                      </div>

                      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                        <span className="text-gray-600">Expert session</span>
                        <span className="font-medium text-gray-800">
                          {cost} coins
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-600">Current balance</span>
                        <span className="font-medium text-gray-800">
                          {userWallet} coins
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <span className="text-gray-600">
                          Balance after payment
                        </span>
                        <span className="font-semibold text-blue-600">
                          {userWallet - cost} coins
                        </span>
                      </div>
                    </div>

                    <span className="block text-sm text-gray-500">
                      After confirming payment, you'll be able to choose an
                      available time slot.
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-3">
                  <AlertDialogCancel className="w-full sm:w-auto mt-0">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBookMeeting}
                    disabled={isProcessing}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4"
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Confirm Payment
                      </span>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </>
      )}

      {/* Container for the calendar button that appears after payment */}
      <div
        ref={calendarContainerRef}
        className={paymentComplete ? "block" : "hidden"}
      />

      <p className="text-xs text-center text-gray-500 mt-3">
        {paymentComplete
          ? "Your payment has been processed. Select a convenient time slot above."
          : "Funds will be deducted from your wallet upon booking confirmation."}
      </p>
    </div>
  );
}
