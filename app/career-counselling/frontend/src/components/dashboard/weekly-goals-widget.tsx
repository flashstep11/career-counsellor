"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Target, TrendingUp } from "lucide-react";

interface WeeklyGoal {
  id: number;
  title: string;
  completed: boolean;
}

interface WeeklyGoalsWidgetProps {
  goals: WeeklyGoal[];
}

export function WeeklyGoalsWidget({ goals }: WeeklyGoalsWidgetProps) {
  const completedCount = goals.filter((g) => g.completed).length;
  const completionPercentage = Math.round((completedCount / goals.length) * 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Weekly Goals
          </div>
          <div className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            {completedCount}/{goals.length}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {goals.map((goal) => (
          <div key={goal.id} className="flex items-start gap-3">
            <Checkbox
              checked={goal.completed}
              disabled
              className="mt-0.5"
            />
            <label
              className={`text-sm leading-tight ${
                goal.completed
                  ? "line-through text-muted-foreground"
                  : "text-foreground"
              }`}
            >
              {goal.title}
            </label>
          </div>
        ))}
        
        {completionPercentage === 100 && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-xs text-green-700 dark:text-green-400 font-medium text-center">
              🎉 All goals completed! Great work!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
