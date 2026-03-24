"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { User, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProfileStrengthWidgetProps {
  strength: number;
}

export function ProfileStrengthWidget({ strength }: ProfileStrengthWidgetProps) {
  const router = useRouter();

  const getStrengthColor = () => {
    if (strength >= 80) return "text-green-600";
    if (strength >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressColor = () => {
    if (strength >= 80) return "bg-green-500";
    if (strength >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getSuggestion = () => {
    if (strength >= 80) return "Great profile! Keep it updated.";
    if (strength >= 50) return "Add more details to strengthen your profile.";
    return "Complete your profile to get better recommendations.";
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Strength
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{strength}%</span>
            <span className={`text-xs font-medium ${getStrengthColor()}`}>
              {strength >= 80 ? "Excellent" : strength >= 50 ? "Good" : "Needs Work"}
            </span>
          </div>
          <Progress value={strength} className="h-2" />
        </div>
        <p className="text-xs text-muted-foreground">{getSuggestion()}</p>
        <Button
          variant="outline"
          size="sm"
          className="w-full group"
          onClick={() => router.push("/profile")}
        >
          <span>Complete Profile</span>
          <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
