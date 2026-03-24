"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronLeft, X, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";

interface Question {
  id: number;
  question: string;
  type: "single" | "multiple" | "text";
  options?: string[];
  placeholder?: string;
}

const questions: Question[] = [
  {
    id: 1,
    question: "Is this your first time looking for a mentor?",
    type: "single",
    options: ["Yes", "No"],
  },
  {
    id: 2,
    question: "What is your primary goal for mentorship?",
    type: "multiple",
    options: [
      "Career guidance and planning",
      "Skill development and learning",
      "Job/internship search assistance",
      "College/university selection",
      "Industry insights and networking",
      "Personal development",
    ],
  },
  {
    id: 3,
    question: "Which field or industry are you most interested in?",
    type: "single",
    options: [
      "Technology & Software",
      "Business & Management",
      "Healthcare & Medicine",
      "Engineering",
      "Finance & Accounting",
      "Creative Arts & Design",
      "Education & Research",
      "Law & Legal Services",
      "Other",
    ],
  },
  {
    id: 4,
    question: "What is your current education level?",
    type: "single",
    options: [
      "High School",
      "Undergraduate",
      "Postgraduate",
      "Professional",
      "Other",
    ],
  },
  {
    id: 5,
    question: "How often would you like to connect with your mentor?",
    type: "single",
    options: [
      "Once a week",
      "Bi-weekly (twice a month)",
      "Once a month",
      "As needed (flexible)",
    ],
  },
  {
    id: 6,
    question: "Any specific topics or skills you want guidance on? (Optional)",
    type: "text",
    placeholder: "e.g., Resume building, Interview preparation, Career switch...",
  },
];

interface FindMentorQuestionnaireProps {
  onClose: () => void;
}

export function FindMentorQuestionnaire({ onClose }: FindMentorQuestionnaireProps) {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [isSearching, setIsSearching] = useState(false);

  const question = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleSingleAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  };

  const handleMultipleAnswer = (value: string) => {
    const currentAnswers = (answers[question.id] as string[]) || [];
    if (currentAnswers.includes(value)) {
      setAnswers((prev) => ({
        ...prev,
        [question.id]: currentAnswers.filter((v) => v !== value),
      }));
    } else {
      setAnswers((prev) => ({
        ...prev,
        [question.id]: [...currentAnswers, value],
      }));
    }
  };

  const handleTextAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleFinish = async () => {
    setIsSearching(true);
    try {
      // Save preferences to localStorage for forum filters
      const preferences = {
        fields: Array.isArray(answers[3]) ? answers[3] : [answers[3]].filter(Boolean),
        goals: Array.isArray(answers[2]) ? answers[2] : [answers[2]].filter(Boolean),
        educationLevel: answers[4] as string || "",
        specificTopics: answers[6] as string || "",
      };
      localStorage.setItem("mentorPreferences", JSON.stringify(preferences));
      
      // Send answers to backend to find matching mentors
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/experts/match`,
        { preferences: answers }
      );
      
      // Navigate to experts page with filters applied
      router.push("/experts?matched=true");
    } catch (error) {
      console.error("Error finding mentors:", error);
      // Still navigate to experts page even if matching fails
      router.push("/experts");
    } finally {
      setIsSearching(false);
      onClose();
    }
  };

  const canProceed = () => {
    const answer = answers[question.id];
    if (question.type === "text") return true; // Text is optional
    if (question.type === "multiple") {
      return Array.isArray(answer) && answer.length > 0;
    }
    return !!answer;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white shadow-2xl border-0 relative overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        {/* Progress bar */}
        <div className="h-2 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <CardHeader className="pb-6 pt-8 px-8 bg-gradient-to-br from-purple-50 via-pink-50 to-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900">Find Your Perfect Mentor</h2>
            <span className="text-sm font-medium text-gray-500">
              {currentQuestion + 1} of {questions.length}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Answer a few questions to help us match you with the right mentors
          </p>
        </CardHeader>

        <CardContent className="p-8 min-h-[300px]">
          {/* Question */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              {question.id}. {question.question}
            </h3>

            {/* Single choice */}
            {question.type === "single" && (
              <RadioGroup
                value={answers[question.id] as string}
                onValueChange={handleSingleAnswer}
                className="space-y-3"
              >
                {question.options?.map((option) => (
                  <div
                    key={option}
                    className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer"
                  >
                    <RadioGroupItem value={option} id={option} />
                    <Label htmlFor={option} className="flex-1 cursor-pointer font-medium">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {/* Multiple choice */}
            {question.type === "multiple" && (
              <div className="space-y-3">
                {question.options?.map((option) => {
                  const isChecked = (answers[question.id] as string[] || []).includes(option);
                  return (
                    <div
                      key={option}
                      className={`flex items-center space-x-3 p-4 border-2 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer ${
                        isChecked ? "border-blue-500 bg-blue-50" : "border-gray-200"
                      }`}
                      onClick={() => handleMultipleAnswer(option)}
                    >
                      <Checkbox
                        id={option}
                        checked={isChecked}
                        onCheckedChange={() => handleMultipleAnswer(option)}
                      />
                      <Label htmlFor={option} className="flex-1 cursor-pointer font-medium">
                        {option}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Text input */}
            {question.type === "text" && (
              <Input
                value={(answers[question.id] as string) || ""}
                onChange={(e) => handleTextAnswer(e.target.value)}
                placeholder={question.placeholder}
                className="text-base p-4 h-auto"
              />
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentQuestion === 0}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            {!isLastQuestion ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={!canProceed() || isSearching}
                className="gap-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                {isSearching ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Find Mentors
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
