"use client";

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
    Loader2,
    Wallet,
    Video,
    UserPlus,
    Plus,
    Minus,
    ShoppingCart,
    CheckCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User } from "@/types";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Component for sparkle animations
interface SparkleProps {
    color?: string;
    size?: number;
    style?: React.CSSProperties;
}

const Sparkle = ({ color = "#FFD700", size = 8, style }: SparkleProps) => {
    return (
        <div
            className="sparkle absolute animate-sparkle"
            style={{
                width: size,
                height: size,
                backgroundColor: color,
                borderRadius: '50%',
                ...style,
            }}
        />
    );
};

// Add animation keyframes and styles at the beginning of the component
const generateSparkles = (container: HTMLElement | null) => {
    if (!container) return [];

    const sparkles = [];
    const containerRect = container.getBoundingClientRect();

    // Create multiple sparkles with different positions, sizes, and colors
    for (let i = 0; i < 30; i++) {
        const left = Math.random() * containerRect.width;
        const top = Math.random() * containerRect.height;
        const size = Math.random() * 6 + 2; // Random size between 2-8px
        const delay = Math.random() * 0.5; // Random delay for animation
        const duration = Math.random() * 0.5 + 0.5; // Random duration between 0.5-1s

        // Choose from gold, silver, and primary color variants
        const colors = ['#FFD700', '#C0C0C0', '#FFC107', '#10B981', '#ffffff'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        sparkles.push(
            <Sparkle
                key={i}
                color={color}
                size={size}
                style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    animationDelay: `${delay}s`,
                    animationDuration: `${duration}s`,
                }}
            />
        );
    }

    return sparkles;
};

export default function WalletPage() {
    const { user: authUser } = useAuth();
    const [profile, setProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [coinsToAdd, setCoinsToAdd] = useState(50);
    const [purchasingCoins, setPurchasingCoins] = useState(false);
    const [purchaseSuccess, setPurchaseSuccess] = useState(false);
    const [showSparkles, setShowSparkles] = useState(false);
    const coinContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // If authUser is available from context, use it instead of fetching
        if (authUser) {
            setProfile({
                ...authUser,
                id: authUser.id ? String(authUser.id) : "",
                gender: authUser.gender ? String(authUser.gender) : "",
                category: authUser.category ? String(authUser.category) : "",
                mobileNo: authUser.mobileNo ? String(authUser.mobileNo) : "",
                password: authUser.password ? String(authUser.password) : "",
                isAdmin: authUser.isAdmin === undefined ? false : authUser.isAdmin,
                isExpert: authUser.isExpert === undefined ? false : authUser.isExpert,
                wallet: authUser.wallet || 200, // default value for wallet
                following: (authUser.following as string[]) ?? [],
                followers: (authUser.followers as string[]) ?? [],
                interests: (authUser.interests as string[]) ?? [],
            });
            setLoading(false);
        } else {
            // Fallback to fetching if not available in context
            fetchProfile();
        }
    }, [authUser]);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                return;
            }

            const response = await axios.get("/api/profile", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setProfile(response.data);
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCoins = async () => {
        if (coinsToAdd <= 0) return;

        try {
            setPurchasingCoins(true);

            const token = localStorage.getItem("token");
            const currentWallet = profile?.wallet || 0;

            // In a real application, this would involve a payment processing step
            // For this dummy implementation, we'll just update the wallet value
            const response = await axios.put(
                "/api/profile",
                {
                    wallet: currentWallet + coinsToAdd
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            // Update the local profile state
            setProfile({
                ...profile!,
                wallet: currentWallet + coinsToAdd
            });

            // Show success animations
            setPurchaseSuccess(true);
            setShowSparkles(true);

            // Hide animations after some time
            setTimeout(() => {
                setPurchaseSuccess(false);
            }, 3000);

            setTimeout(() => {
                setShowSparkles(false);
            }, 1500);


        } catch (error) {
            console.error("Error adding coins:", error);
            toast.error("Failed to add coins to your wallet");
        } finally {
            setPurchasingCoins(false);
        }
    };

    const incrementCoins = () => {
        setCoinsToAdd(prev => prev + 10);
    };

    const decrementCoins = () => {
        setCoinsToAdd(prev => (prev > 10 ? prev - 10 : 10));
    };

    // If loading, show a loading indicator
    if (loading) {
        return (
            <div className="flex justify-center items-center h-[70vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // If no profile, show an error message
    if (!profile) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-2xl font-bold text-red-600">
                    Profile information could not be loaded. Please try again later.
                </h1>
            </div>
        );
    }

    // The actual wallet content
    const walletContent = (
        <div className="container mx-auto px-4 py-8 max-w-4xl mt-6">
            {/* Wallet Hero */}
            <div className="bg-gradient-to-r from-primary to-primary/80 rounded-lg shadow-lg mb-8 p-8 text-white relative overflow-hidden">
                <div className="flex items-center space-x-4">
                    <div className="bg-white p-3 rounded-full relative" ref={coinContainerRef}>
                        <Wallet className="h-12 w-12 text-primary" />
                        {showSparkles && generateSparkles(coinContainerRef.current)}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">My Wallet</h1>
                        <p className="text-sm mt-1 opacity-80">
                            Manage your coins and purchase more
                        </p>
                        <div className="flex items-center space-x-3 mt-2">
                            <Badge variant="secondary" className={`text-lg flex items-center px-4 py-1 ${purchaseSuccess ? 'relative' : ''}`}>
                                <Wallet className="h-4 w-4 mr-2" />
                                {profile.wallet || 0} coins

                                {/* Animated coin indicator on successful purchase */}
                                {purchaseSuccess && (
                                    <span className="absolute -right-2 -top-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full animate-bounce-in">
                                        +{coinsToAdd}
                                    </span>
                                )}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Success overlay animation */}
                {purchaseSuccess && (
                    <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center animate-fade-in-out pointer-events-none">
                        <div className="bg-white p-3 rounded-full animate-scale-up">
                            <CheckCircle className="h-12 w-12 text-green-500" />
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Add Coins Card */}
                <div className="col-span-2">
                    <Card className="shadow-lg border-0 h-full">
                        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                            <CardTitle className="text-xl text-primary">
                                Add Coins to Your Wallet
                            </CardTitle>
                            <CardDescription>
                                Purchase coins to unlock premium features
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="mb-6">
                                <p className="text-sm text-gray-500 mb-4">
                                    Select the number of coins you want to purchase. Each coin costs ₹0.1
                                </p>

                                <div className="flex items-center space-x-4 mb-6">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={decrementCoins}
                                        disabled={coinsToAdd <= 10}
                                    >
                                        <Minus className="h-4 w-4" />
                                    </Button>

                                    <div className="relative flex-1">
                                        <Input
                                            type="number"
                                            min="10"
                                            value={coinsToAdd}
                                            onChange={(e) => setCoinsToAdd(Math.max(10, parseInt(e.target.value) || 10))}
                                            className="pr-16 text-center font-medium"
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                                            coins
                                        </div>

                                    </div>

                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={incrementCoins}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-md mb-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-500">Coins to purchase</span>
                                        <span className="font-medium">{coinsToAdd} coins</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-500">Price per coin</span>
                                        <span className="font-medium">₹0.1</span>
                                    </div>
                                    <Separator className="my-2" />
                                    <div className="flex justify-between items-center text-lg font-semibold">
                                        <span>Total Amount</span>
                                        <span>₹{(coinsToAdd * 0.1).toFixed(2)}</span>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleAddCoins}
                                    className={`w-full hover:bg-primary/90 relative overflow-hidden ${purchaseSuccess ? 'bg-green-500' : 'bg-primary'} transition-colors duration-300`}
                                    disabled={purchasingCoins}
                                >
                                    {purchasingCoins ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Processing...
                                        </>
                                    ) : purchaseSuccess ? (
                                        <>
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Purchase Successful!
                                        </>
                                    ) : (
                                        <>
                                            <ShoppingCart className="h-4 w-4 mr-2" />
                                            Purchase Coins
                                        </>
                                    )}

                                    {/* Button sparkle effect */}
                                    {showSparkles && (
                                        <div className="absolute inset-0 pointer-events-none">
                                            {Array.from({ length: 12 }).map((_, i) => {
                                                const randomLeft = Math.random() * 100;
                                                const randomDelay = Math.random() * 0.5;
                                                return (
                                                    <div
                                                        key={i}
                                                        className="absolute w-1 h-1 rounded-full bg-white animate-sparkle"
                                                        style={{
                                                            left: `${randomLeft}%`,
                                                            top: '50%',
                                                            animationDelay: `${randomDelay}s`
                                                        }}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Benefits Card */}
                <div className="col-span-1">
                    <Card className="shadow-lg border-0 h-full">
                        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                            <CardTitle className="text-lg text-primary">
                                Benefits
                            </CardTitle>
                            <CardDescription>
                                What you can do with coins
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <div className="bg-primary/10 p-2 rounded-full">
                                        <Video className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium">Watch Premium Videos</h3>
                                        <p className="text-sm text-gray-500">
                                            Access exclusive educational content and career guidance videos
                                        </p>
                                    </div>
                                </div>

                                <Separator />

                                <div className="flex items-start space-x-3">
                                    <div className="bg-primary/10 p-2 rounded-full">
                                        <UserPlus className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium">Meet with Experts</h3>
                                        <p className="text-sm text-gray-500">
                                            Schedule one-on-one sessions with career counselors and industry experts
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );

    // Wrap the content with ProtectedRoute
    return <ProtectedRoute>{walletContent}</ProtectedRoute>;
}