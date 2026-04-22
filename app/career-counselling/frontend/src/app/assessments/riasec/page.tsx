"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { MoveRight, CheckCircle2, Mail, Send } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// RIASEC test questions
const questions = [
  // Realistic (R) questions
  {
    id: "R1",
    text: "I find satisfaction in working with my hands, tools, or machines",
    type: "R",
  },
  {
    id: "R2",
    text: "I enjoy building, fixing, or repairing physical objects",
    type: "R",
  },
  {
    id: "R3",
    text: "I prefer spending time outdoors and engaging in hands-on activities",
    type: "R",
  },
  {
    id: "R4",
    text: "I like solving practical, concrete problems rather than theoretical ones",
    type: "R",
  },
  {
    id: "R5",
    text: "I'm drawn to working with plants, animals, or natural materials",
    type: "R",
  },

  // Investigative (I) questions
  {
    id: "I1",
    text: "I enjoy investigating problems and finding solutions through analysis",
    type: "I",
  },
  {
    id: "I2",
    text: "I'm fascinated by scientific research and discovery",
    type: "I",
  },
  {
    id: "I3",
    text: "I find satisfaction in collecting and analyzing information and data",
    type: "I",
  },
  {
    id: "I4",
    text: "I work best when I can think independently and solve complex problems",
    type: "I",
  },
  {
    id: "I5",
    text: "I'm curious about how things work and enjoy exploring new concepts",
    type: "I",
  },

  // Artistic (A) questions
  {
    id: "A1",
    text: "I express myself best through creative arts like music, writing, or visual media",
    type: "A",
  },
  {
    id: "A2",
    text: "I value opportunities for self-expression and originality",
    type: "A",
  },
  {
    id: "A3",
    text: "I'm drawn to activities that allow me to be imaginative and innovative",
    type: "A",
  },
  {
    id: "A4",
    text: "I prefer environments that offer flexibility and room for creativity",
    type: "A",
  },
  {
    id: "A5",
    text: "I enjoy creating original works or developing new ideas",
    type: "A",
  },

  // Social (S) questions
  {
    id: "S1",
    text: "I find fulfillment in teaching, mentoring, or assisting others",
    type: "S",
  },
  {
    id: "S2",
    text: "I'm good at perceiving emotions and understanding different perspectives",
    type: "S",
  },
  {
    id: "S3",
    text: "I enjoy collaborative work and building meaningful connections",
    type: "S",
  },
  {
    id: "S4",
    text: "I'm motivated by opportunities to make a positive difference in people's lives",
    type: "S",
  },
  {
    id: "S5",
    text: "I value developing relationships and fostering community",
    type: "S",
  },

  // Enterprising (E) questions
  {
    id: "E1",
    text: "I excel at influencing, leading, or persuading others",
    type: "E",
  },
  {
    id: "E2",
    text: "I enjoy promoting ideas and convincing others of their value",
    type: "E",
  },
  {
    id: "E3",
    text: "I'm energized by competition and achieving challenging goals",
    type: "E",
  },
  {
    id: "E4",
    text: "I'm comfortable taking strategic risks to achieve success",
    type: "E",
  },
  {
    id: "E5",
    text: "I find satisfaction in organizing projects and directing teams",
    type: "E",
  },

  // Conventional (C) questions
  {
    id: "C1",
    text: "I excel at organizing information and maintaining accurate records",
    type: "C",
  },
  {
    id: "C2",
    text: "I appreciate clear guidelines, procedures, and structured environments",
    type: "C",
  },
  {
    id: "C3",
    text: "I have a strong eye for detail and value precision",
    type: "C",
  },
  {
    id: "C4",
    text: "I prefer well-defined tasks with clear expectations",
    type: "C",
  },
  {
    id: "C5",
    text: "I enjoy working with numbers, data, and systematic processes",
    type: "C",
  },
];

// Career suggestions by type
const careerSuggestions = {
  R: [
    "Mechanical Engineer",
    "Electrician",
    "Construction Manager",
    "Carpenter",
    "Automotive Technician",
    "Civil Engineer",
    "Surveyor",
    "Aircraft Mechanic",
    "Agriculture Manager",
    "Plumber",
  ],
  I: [
    "Software Developer",
    "Physician",
    "Research Scientist",
    "Data Analyst",
    "Chemist",
    "Mathematician",
    "Biologist",
    "Medical Researcher",
    "Environmental Scientist",
    "Computer Systems Analyst",
  ],
  A: [
    "Graphic Designer",
    "Writer/Author",
    "Musician",
    "Interior Designer",
    "Photographer",
    "Fashion Designer",
    "Architect",
    "Actor",
    "Animator",
    "Art Director",
  ],
  S: [
    "Teacher",
    "Counselor",
    "Social Worker",
    "Nurse",
    "Physical Therapist",
    "Human Resources Specialist",
    "School Psychologist",
    "Speech Pathologist",
    "Career Advisor",
    "Occupational Therapist",
  ],
  E: [
    "Marketing Manager",
    "Sales Director",
    "Lawyer",
    "Financial Advisor",
    "Real Estate Agent",
    "Public Relations Specialist",
    "Entrepreneur",
    "Project Manager",
    "Management Consultant",
    "Insurance Agent",
  ],
  C: [
    "Accountant",
    "Financial Analyst",
    "Administrative Assistant",
    "Auditor",
    "Logistics Coordinator",
    "Database Administrator",
    "Paralegal",
    "Bank Teller",
    "Office Manager",
    "Bookkeeper",
  ],
};

// RIASEC type descriptions
const typeDescriptions = {
  R: "Realistic individuals are practical, physical, hands-on problem solvers who like working with tools, machines, plants, or animals. They prefer concrete tasks over abstract thinking.",
  I: "Investigative individuals are analytical, intellectual, and scientific. They enjoy research, solving complex problems, and understanding how things work.",
  A: "Artistic individuals are creative, original, and independent. They excel in fields that allow self-expression, creativity, and working without restrictive rules.",
  S: "Social individuals are helpers and communicators. They enjoy working with people, teaching, counseling and providing assistance to others.",
  E: "Enterprising individuals are energetic, ambitious, and confident. They excel at leadership, persuasion, and enjoy taking risks to achieve goals.",
  C: "Conventional individuals are organized, detail-oriented, and methodical. They prefer structured environments with clear rules and procedures.",
};

// Type color mapping
const typeColors = {
  R: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    accent: "bg-blue-600",
    border: "border-blue-200",
  },
  I: "bg-purple-100 text-purple-800 border-purple-200",
  A: "bg-pink-100 text-pink-800 border-pink-200",
  S: "bg-green-100 text-green-800 border-green-200",
  E: "bg-amber-100 text-amber-800 border-amber-200",
  C: "bg-indigo-100 text-indigo-800 border-indigo-200",
};

// Full type names
const typeNames = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};

export default function RiasecTestPage() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [results, setResults] = useState<Record<string, number> | null>(null);
  const [topTypes, setTopTypes] = useState<string[]>([]);
  const [direction, setDirection] = useState<"next" | "prev" | null>(null);
  const [showUserInfoDialog, setShowUserInfoDialog] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    // Reset direction after animation completes
    const timer = setTimeout(() => {
      setDirection(null);
    }, 500);

    return () => clearTimeout(timer);
  }, [currentQuestion]);

  const handleAnswer = (questionId: string, value: number) => {
    setAnswers({
      ...answers,
      [questionId]: value,
    });
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      calculateResults();
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleNextQuestion = () => {
    setDirection("next");
    nextQuestion();
  };

  const handlePrevQuestion = () => {
    setDirection("prev");
    prevQuestion();
  };

  const calculateResults = () => {
    // Calculate scores for each RIASEC type
    const typeScores: Record<string, number> = {
      R: 0,
      I: 0,
      A: 0,
      S: 0,
      E: 0,
      C: 0,
    };

    Object.entries(answers).forEach(([questionId, value]) => {
      const question = questions.find((q) => q.id === questionId);
      if (question) {
        typeScores[question.type] += value;
      }
    });

    // Normalize scores to percentages (max 5 questions per type × 5 points = 25 max points)
    const normalizedScores: Record<string, number> = {};
    Object.entries(typeScores).forEach(([type, score]) => {
      normalizedScores[type] = Math.round((score / 25) * 100);
    });

    // Sort types by score to find top 3
    const sortedTypes = Object.entries(normalizedScores)
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type);

    setResults(normalizedScores);
    setTopTypes(sortedTypes.slice(0, 3));
  };

  const resetTest = () => {
    setAnswers({});
    setCurrentQuestion(0);
    setResults(null);
    setTopTypes([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getOptionId = (questionId: string, value: number) =>
    `${questionId}_${value}`;

  const handleSubmitResults = () => {
    // If user is not authenticated, show dialog to collect user info
    if (!isAuthenticated) {
      setShowUserInfoDialog(true);
      return;
    }

    // If user is authenticated, open email with prefilled information
    openEmailWithResults();
  };

  const handleUserInfoSubmit = () => {
    // Validate user info
    if (!userInfo.name || !userInfo.email) {
      toast.error("Please provide your name and email");
      return;
    }

    // Close dialog and open email
    setShowUserInfoDialog(false);
    openEmailWithResults();
  };

  const openEmailWithResults = () => {
    try {
      // Prepare email content
      const subject = "RIASEC Assessment Results";
      const name = isAuthenticated
        ? `${user?.firstName} ${user?.lastName}`
        : userInfo.name;
      const email = isAuthenticated ? user?.email : userInfo.email;
      const phone = userInfo.phone || "Not provided";

      // Create email body with formatted results
      let body = `Dear Aditya Jain Pansari,\n\n`;
      body += `Please find my RIASEC assessment results below:\n\n`;
      body += `Name: ${name}\n`;
      body += `Email: ${email}\n`;
      body += `Phone: ${phone}\n\n`;
      body += `Holland Code: ${topTypes.join("-")}\n\n`;
      body += `Detailed Results:\n`;

      Object.entries(typeNames).forEach(([type, name]) => {
        body += `${name} (${type}): ${results?.[type]}%\n`;
      });

      body += `\nTop Career Matches:\n`;
      topTypes.slice(0, 3).forEach((type) => {
        body += `\n${typeNames[type as keyof typeof typeNames]}:\n`;
        careerSuggestions[type as keyof typeof careerSuggestions]
          .slice(0, 5)
          .forEach((career) => {
            body += `- ${career}\n`;
          });
      });

      body += `\nThank you for your assistance with my career exploration.\n\nBest regards,\n${name}`;

      // Encode for mailto link
      const mailtoLink = `mailto:aditya.jain.pansari@research.iiit.ac.in?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;

      // Open email client
      window.location.href = mailtoLink;

      toast.success("Opening email client...");
    } catch (error) {
      console.error("Error opening email client:", error);
      toast.error("Failed to open email client. Please try again later.");
    }
  };

  // Current question being displayed
  const question = questions[currentQuestion];

  // Calculate progress percentage
  const progressPercentage = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mt-6 bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-blue-600">
            RIASEC Career Assessment
          </h1>
          <p className="mt-3 text-gray-600 max-w-3xl">
            Discover your Holland Code personality type and find career paths
            that match your interests. This assessment categorizes you into one
            or more of the six types: Realistic, Investigative, Artistic,
            Social, Enterprising, and Conventional.
          </p>
        </div>

        {!results ? (
          <Card className="shadow-lg border-t-4 border-t-blue-500">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-white pb-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <CardTitle className="text-xl text-blue-800">
                    Question {currentQuestion + 1} of {questions.length}
                  </CardTitle>
                  <CardDescription>
                    Rate how much you agree with each statement
                  </CardDescription>
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  {Math.round(progressPercentage)}% Complete
                </div>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </CardHeader>
            <CardContent className="pt-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion}
                  initial={{ opacity: 0, x: direction === "next" ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction === "next" ? -20 : 20 }}
                  transition={{ duration: 0.3 }}
                  className="mb-8"
                >
                  <h3 className="text-xl font-medium mb-6 text-gray-800">
                    {question.text}
                  </h3>

                  <RadioGroup
                    value={answers[question.id]?.toString()}
                    onValueChange={(value) =>
                      handleAnswer(question.id, parseInt(value))
                    }
                    className="grid grid-cols-1 md:grid-cols-5 gap-4"
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <div
                        key={value}
                        className="flex flex-col items-center gap-2"
                      >
                        <RadioGroupItem
                          value={value.toString()}
                          id={getOptionId(question.id, value)}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={getOptionId(question.id, value)}
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white shadow-sm p-4 hover:bg-blue-50 hover:border-blue-200 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 [&:has([data-state=checked])]:border-blue-500 [&:has([data-state=checked])]:bg-blue-50 cursor-pointer w-full h-full min-h-[100px] transition-all duration-200"
                        >
                          <span className="text-xl font-bold text-blue-600">
                            {value}
                          </span>
                          <span className="text-sm text-center font-medium mt-2">
                            {value === 1
                              ? "Strongly Disagree"
                              : value === 2
                              ? "Disagree"
                              : value === 3
                              ? "Neutral"
                              : value === 4
                              ? "Agree"
                              : "Strongly Agree"}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </motion.div>
              </AnimatePresence>

              <div className="flex justify-between pt-4 border-t border-gray-100">
                <Button
                  onClick={handlePrevQuestion}
                  variant="outline"
                  disabled={currentQuestion === 0}
                  className="font-medium"
                >
                  Previous
                </Button>

                <Button
                  onClick={handleNextQuestion}
                  disabled={!answers[question.id]}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium flex items-center gap-2"
                >
                  {currentQuestion === questions.length - 1
                    ? "See Results"
                    : "Next"}
                  <MoveRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">Your RIASEC Results</CardTitle>
                <CardDescription>
                  Your Holland Code is{" "}
                  <span className="font-bold">{topTypes.join("-")}</span>. This
                  represents your top personality types from the assessment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(typeNames).map(([type, name]) => (
                    <div key={type} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                              typeColors[type as keyof typeof typeColors]
                            }`}
                          >
                            {type}
                          </div>
                          <span className="font-medium">{name}</span>
                        </div>
                        <span className="font-bold">{results[type]}%</span>
                      </div>
                      <Progress value={results[type]} className="h-3" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Types Description */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topTypes.slice(0, 3).map((type, index) => (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card
                    className={`border-2 ${
                      type === "R"
                        ? "border-blue-200"
                        : type === "I"
                        ? "border-purple-200"
                        : type === "A"
                        ? "border-pink-200"
                        : type === "S"
                        ? "border-green-200"
                        : type === "E"
                        ? "border-amber-200"
                        : "border-indigo-200"
                    }`}
                  >
                    <CardHeader
                      className={`${
                        type === "R"
                          ? "bg-blue-50"
                          : type === "I"
                          ? "bg-purple-50"
                          : type === "A"
                          ? "bg-pink-50"
                          : type === "S"
                          ? "bg-green-50"
                          : type === "E"
                          ? "bg-amber-50"
                          : "bg-indigo-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center mr-1 ${
                            type === "R"
                              ? "bg-blue-100 text-blue-800"
                              : type === "I"
                              ? "bg-purple-100 text-purple-800"
                              : type === "A"
                              ? "bg-pink-100 text-pink-800"
                              : type === "S"
                              ? "bg-green-100 text-green-800"
                              : type === "E"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-indigo-100 text-indigo-800"
                          }`}
                        >
                          {type}
                        </div>
                        <CardTitle>
                          {typeNames[type as keyof typeof typeNames]}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="text-gray-600 mb-4">
                        {
                          typeDescriptions[
                            type as keyof typeof typeDescriptions
                          ]
                        }
                      </p>

                      <div>
                        <h4 className="font-bold mb-2">Suggested Careers:</h4>
                        <ul className="list-inside space-y-1">
                          {careerSuggestions[
                            type as keyof typeof careerSuggestions
                          ]
                            .slice(0, 5)
                            .map((career) => (
                              <li key={career} className="flex items-start">
                                <CheckCircle2 className="h-4 w-4 mr-2 mt-1 text-green-500 flex-shrink-0" />
                                <span>{career}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <Button
                onClick={resetTest}
                variant="outline"
                className="font-medium"
              >
                Retake Assessment
              </Button>

              <Button onClick={handleSubmitResults} className="font-medium">
                Submit Results
              </Button>

              <Link href="/">
                <Button className="font-medium">Return to Home</Button>
              </Link>
            </div>
          </div>
        )}

        {!results && (
          <div className="mt-8 text-sm text-center text-gray-500">
            <p>This assessment takes about 5-7 minutes to complete.</p>
            <p className="mt-1">
              Your results are calculated instantly and are not stored on our
              servers.
            </p>
          </div>
        )}
      </div>
      <Dialog open={showUserInfoDialog} onOpenChange={setShowUserInfoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Your Results</DialogTitle>
            <DialogDescription>
              Please provide your name and email to submit your RIASEC
              assessment results.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={userInfo.name}
                onChange={(e) =>
                  setUserInfo({ ...userInfo, name: e.target.value })
                }
                placeholder="Your Name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={userInfo.email}
                onChange={(e) =>
                  setUserInfo({ ...userInfo, email: e.target.value })
                }
                placeholder="Your Email"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                value={userInfo.phone}
                onChange={(e) =>
                  setUserInfo({ ...userInfo, phone: e.target.value })
                }
                placeholder="Your Phone Number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUserInfoSubmit}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
