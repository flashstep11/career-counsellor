"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, TrendingUp, BookOpen, Target, Sparkles } from "lucide-react";

interface DailyInsight {
  icon: typeof Lightbulb;
  title: string;
  message: string;
  category: "tip" | "trend" | "learning" | "goal" | "motivation";
  color: string;
}

const insights: DailyInsight[] = [
  {
    icon: Lightbulb,
    title: "Career Tip",
    message: "Update your profile with recent projects to increase visibility by 40% among mentors.",
    category: "tip",
    color: "from-yellow-500 to-orange-500",
  },
  {
    icon: TrendingUp,
    title: "Trending Now",
    message: "AI & Machine Learning roles have seen a 35% increase this month. Explore courses to upskill!",
    category: "trend",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: BookOpen,
    title: "Learning Path",
    message: "Complete 2 more courses to unlock 'Advanced Learner' badge and attract top mentors.",
    category: "learning",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Target,
    title: "Weekly Goal",
    message: "You're 60% towards your goal! Connect with 3 experts this week to stay on track.",
    category: "goal",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Sparkles,
    title: "Motivation",
    message: "You've made 15 connections this month! Keep networking to expand your opportunities.",
    category: "motivation",
    color: "from-indigo-500 to-purple-500",
  },
  {
    icon: Lightbulb,
    title: "Profile Boost",
    message: "Add a professional bio to make your profile stand out. Profiles with bios get 3x more views!",
    category: "tip",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: TrendingUp,
    title: "Hot Opportunity",
    message: "5 new startups are looking for interns in your field. Check the opportunities section!",
    category: "trend",
    color: "from-teal-500 to-blue-500",
  },
  {
    icon: BookOpen,
    title: "Resource Alert",
    message: "New webinar on 'Breaking Into Tech' available. Perfect match for your career interests!",
    category: "learning",
    color: "from-pink-500 to-rose-500",
  },
];

export function DailyInsightWidget() {
  const [todayInsight, setTodayInsight] = useState<DailyInsight | null>(null);

  useEffect(() => {
    // Get consistent daily insight based on date
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
    );
    const insightIndex = dayOfYear % insights.length;
    setTodayInsight(insights[insightIndex]);
  }, []);

  if (!todayInsight) {
    return (
      <Card className="bg-white rounded-xl shadow-sm border-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-full animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const Icon = todayInsight.icon;

  return (
    <Card className="bg-white rounded-xl shadow-sm border-0 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Icon with gradient background */}
          <div
            className={`flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br ${todayInsight.color} flex items-center justify-center shadow-md`}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Daily Insight
              </h3>
              <span className="text-xs text-gray-500">• {todayInsight.title}</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {todayInsight.message}
            </p>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className={`mt-4 h-1 rounded-full bg-gradient-to-r ${todayInsight.color} opacity-30`} />
      </CardContent>
    </Card>
  );
}
