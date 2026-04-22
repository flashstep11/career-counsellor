"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import axios from "axios";
import Image from "next/image";
import { CheckCircle, ChartLine, Compass, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
});

export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, loading, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      const payload = {
        email: values.email,
        password: values.password,
      };

      const response = await axios.post("/api/login", payload);
      localStorage.setItem("token", response.data.token); // Set token in local storage
      window.dispatchEvent(new Event("user-authenticated")); // Dispatch custom event

      // Show success toast
      toast.success("Login successful");

      // Redirect to dashboard page instead of profile
      window.location.href = "/dashboard";
    } catch (error: Error | unknown) {
      console.error(
        "Error logging in:",
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { detail?: string } } })?.response
            ?.data?.detail || "Unknown error"
      );

      // Show specific error message based on error response
      const errorDetail = (
        error as {
          response?: { data?: { detail?: string } };
        }
      )?.response?.data?.detail;

      if (errorDetail?.includes("Invalid email or password")) {
        toast.error("Invalid email or password");
      } else {
        toast.error("Failed to login. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-gradient-to-br from-primary-lavender/10 to-primary-blue/5 px-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-primary-blue/10 rounded-full blur-2xl"></div>
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-primary-lavender/20 rounded-full blur-3xl"></div>

      <div className="container mx-auto max-w-6xl flex flex-col lg:flex-row gap-8 items-center lg:items-stretch relative z-10">
        {/* Login Form Card */}
        <Card className="w-full max-w-md border border-gray-200 shadow-lg backdrop-blur-sm bg-white/80">
          <CardHeader className="space-y-2 pb-2">
            <div className="flex justify-center mb-2">
              <Image
                src="/logo.png"
                alt="AlumNiti Logo"
                width={60}
                height={60}
                className="h-12 w-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%234f46e5' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cpath d='M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20'%3E%3C/path%3E%3Cpath d='M2 12h20'%3E%3C/path%3E%3C/svg%3E";
                }}
              />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-primary-blue">
              Welcome Back
            </CardTitle>
            <p className="text-center text-gray-500 text-sm">
              Sign in to continue your career journey
            </p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your email"
                          {...field}
                          className="border-gray-300 focus:border-primary-blue focus:ring focus:ring-primary-blue/20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          {...field}
                          className="border-gray-300 focus:border-primary-blue focus:ring focus:ring-primary-blue/20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-primary-blue hover:bg-primary-blue/90 text-white transition-all"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-4 text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-primary-blue hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-secondary-darkGray">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="text-primary-blue font-medium hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Information Cards - Visible on desktop */}
        <div className="hidden lg:flex flex-col space-y-4 w-full max-w-md">
          <Card className="border border-gray-200 shadow-md backdrop-blur-sm bg-white/80 transition-all hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <ChartLine className="h-5 w-5 text-primary-blue" />
                <CardTitle className="text-lg font-semibold text-primary-blue">
                  Personalized Career Path
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Sign in to access your personalized career roadmap based on your
                skills, interests, and goals. Our AI-powered platform helps you
                navigate your professional journey with confidence.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-md backdrop-blur-sm bg-white/80 transition-all hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Compass className="h-5 w-5 text-primary-blue" />
                <CardTitle className="text-lg font-semibold text-primary-blue">
                  Career Guidance & Resources
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Get exclusive access to expert advice, industry insights, and
                educational resources tailored to your career aspirations. Stay
                ahead with the latest trends in your field.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-md backdrop-blur-sm bg-white/80 transition-all hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-primary-blue" />
                <CardTitle className="text-lg font-semibold text-primary-blue">
                  Track Your Progress
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Monitor your growth with our progress tracking tools. Set
                milestones, celebrate achievements, and identify areas for
                improvement to accelerate your professional development.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
