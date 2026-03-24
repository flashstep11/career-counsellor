"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import {
  SendHorizontal,
  Bot,
  Loader2,
  Sparkles,
  X,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  User,
  CornerDownLeft,
  School,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatbot } from "@/hooks/useChatbot";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { format } from "date-fns";
import MarkdownViewer from "@/components/shared/markdown-viewer";

const CHATBOT_NAME = "CareerMind AI";
// System prompt is now handled on the backend

interface ChatbotProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function Chatbot({ isOpen, onOpenChange }: ChatbotProps) {
  const { isAuthenticated, user } = useAuth();
  const { messages, sendMessage, isLoading, error, isInitialized } =
    useChatbot();
  const [input, setInput] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonAnimation = useAnimation();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  // Sync with parent control when provided
  useEffect(() => {
    if (isOpen !== undefined) {
      setIsChatOpen(isOpen);
    }
  }, [isOpen]);

  // Notify parent component when chat is opened/closed
  const handleChatOpenToggle = (open: boolean) => {
    setIsChatOpen(open);
    if (onOpenChange) {
      onOpenChange(open);
    }
  };

  // Check if mobile device
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll to bottom when loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [isLoading]);

  // No need to send a welcome message - backend handles this

  // Auto-focus input when chat opens
  useEffect(() => {
    if (isChatOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isChatOpen]);

  // Button hover animation
  useEffect(() => {
    const pulseAnimation = async () => {
      // Don't start animation immediately, wait for component to fully mount
      const startPulse = async () => {
        try {
          while (true) {
            await buttonAnimation.start({
              scale: 1.05,
              transition: { duration: 1.5, ease: "easeInOut" },
            });
            await buttonAnimation.start({
              scale: 1,
              transition: { duration: 1.5, ease: "easeInOut" },
            });
          }
        } catch (e) {
          // Catch any errors from animation interruptions
          console.log("Animation interrupted or component unmounted");
        }
      };

      // Use setTimeout to ensure component is mounted
      const timer = setTimeout(() => {
        startPulse();
      }, 10);

      return () => clearTimeout(timer);
    };

    if (!isChatOpen) {
      const cleanupAnimation = pulseAnimation();
      return () => {
        // Cleanup function for the animation
        cleanupAnimation.then((cleanup) => cleanup && cleanup());
      };
    } else {
      buttonAnimation.stop();
      buttonAnimation.set({ scale: 1 });
    }
  }, [buttonAnimation, isChatOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput("");
    await sendMessage(message);
  };

  const toggleChatSize = () => {
    setIsExpanded(!isExpanded);
  };

  // Format timestamp
  const formatMessageTime = (timestamp?: Date) => {
    if (!timestamp) return "";
    return format(new Date(timestamp), "h:mm a");
  };

  return (
    <>
      {/* Darkened overlay when chatbot is open */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 dark:bg-black/50 z-50"
            onClick={() => handleChatOpenToggle(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
      {/* Floating chat button */}
      <motion.div
        className="fixed bottom-6 right-6 z-[60]"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <motion.div animate={buttonAnimation}>
          <Button
            onClick={() => handleChatOpenToggle(!isChatOpen)}
            className={`rounded-full shadow-lg ${
              isChatOpen
                ? "bg-gray-700 hover:bg-gray-800"
                : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            } text-white w-14 h-14 relative p-0 overflow-hidden`}
          >
            {isChatOpen ? (
              <X className="h-6 w-6 absolute" />
            ) : (
              <>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-600/40 to-purple-600/40"
                  animate={{
                    rotate: [0, 360],
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                <MessageCircle className="h-6 w-6 relative z-10" />
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
      {/* Chat panel */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 250 }}
            className={`fixed bottom-24 right-6 z-[60] ${
              isExpanded || isMobile
                ? "w-[calc(100vw-48px)] h-[calc(100vh-180px)] max-w-4xl"
                : "w-full max-w-md h-[450px]"
            } ${isMobile ? "left-6" : ""}`}
            style={{ maxHeight: "calc(100vh - 180px)" }}
          >
            <div
              ref={chatContainerRef}
              className={`flex flex-col h-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden ${
                isDarkMode ? "shadow-blue-900/10" : "shadow-blue-900/20"
              }`}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/40 dark:to-purple-950/40 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-30 blur-sm"></div>
                      <div className="relative bg-white dark:bg-gray-800 rounded-full p-2">
                        <motion.div
                          animate={{
                            rotate: [0, 10, -10, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        >
                          <Sparkles className="h-5 w-5 text-blue-500" />
                        </motion.div>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                        {CHATBOT_NAME}
                        <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                          Beta
                        </span>
                      </h2>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Your career guidance assistant
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!isMobile && (
                      <Button
                        onClick={toggleChatSize}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      onClick={() => handleChatOpenToggle(false)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {isAuthenticated ? (
                <>
                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50 dark:bg-gray-900">
                    <AnimatePresence initial={false}>
                      {messages.map((message, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{
                            duration: 0.3,
                            delay: (0.05 * index) % 3, // Stagger effect
                          }}
                          className={`flex ${
                            message.role === "assistant"
                              ? "justify-start"
                              : "justify-end"
                          } mb-4`}
                        >
                          <div
                            className={`flex max-w-[90%] sm:max-w-[80%] ${
                              message.role === "assistant"
                                ? "flex-row"
                                : "flex-row-reverse"
                            }`}
                          >
                            {/* Avatar */}
                            <div
                              className={`flex flex-col ${
                                message.role === "assistant" ? "mr-3" : "ml-3"
                              } justify-end pb-1`}
                            >
                              <div
                                className={`
                                flex items-center justify-center
                                ${
                                  message.role === "assistant"
                                    ? "bg-gradient-to-br from-blue-500 to-purple-500"
                                    : "bg-gray-200 dark:bg-gray-700"
                                }
                                rounded-full w-8 h-8
                              `}
                              >
                                {message.role === "assistant" ? (
                                  <Bot className="h-4 w-4 text-white" />
                                ) : (
                                  <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                )}
                              </div>
                            </div>

                            {/* Message content */}
                            <div
                              className={`flex flex-col space-y-1 ${
                                message.role === "assistant"
                                  ? "items-start"
                                  : "items-end"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                  {message.role === "assistant"
                                    ? CHATBOT_NAME
                                    : "You"}
                                </p>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                  {formatMessageTime(message.timestamp)}
                                </span>
                              </div>

                              <div
                                className={`
                                  p-3 rounded-2xl
                                  ${
                                    message.role === "assistant"
                                      ? "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm"
                                      : "bg-blue-500 text-white"
                                  }
                                  break-words overflow-hidden overflow-wrap-anywhere
                                `}
                              >
                                {message.role === "assistant" ? (
                                  <div className="w-full break-words overflow-wrap-anywhere">
                                    <MarkdownViewer
                                      content={message.content}
                                      className="text-sm w-full prose-sm prose-headings:text-gray-900 dark:prose-headings:text-white prose-code:text-sm prose-pre:max-w-full"
                                    />
                                  </div>
                                ) : (
                                  <div className="text-sm break-words overflow-wrap-anywhere w-full">
                                    <MarkdownViewer
                                      content={message.content}
                                      className="text-sm w-full text-white prose-pre:max-w-full"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {/* Loading indicator */}
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-start gap-3"
                      >
                        <div className="flex flex-col mr-3 justify-end pb-1">
                          <div className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-full w-8 h-8 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="flex space-x-1">
                              <motion.div
                                animate={{
                                  opacity: [0.4, 1, 0.4],
                                  scale: [0.8, 1, 0.8],
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  delay: 0,
                                }}
                                className="w-2 h-2 bg-blue-500 rounded-full"
                              />
                              <motion.div
                                animate={{
                                  opacity: [0.4, 1, 0.4],
                                  scale: [0.8, 1, 0.8],
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  delay: 0.2,
                                }}
                                className="w-2 h-2 bg-blue-500 rounded-full"
                              />
                              <motion.div
                                animate={{
                                  opacity: [0.4, 1, 0.4],
                                  scale: [0.8, 1, 0.8],
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  delay: 0.4,
                                }}
                                className="w-2 h-2 bg-blue-500 rounded-full"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Error message */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm"
                      >
                        Error: {error}
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
                    <form onSubmit={handleSubmit} className="relative">
                      <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        className="pr-12 py-6 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isLoading}
                      />
                      <div className="absolute right-2 bottom-0 top-0 flex items-center">
                        <Button
                          type="submit"
                          size="icon"
                          disabled={isLoading || !input.trim()}
                          className={`rounded-lg h-9 w-9 ${
                            input.trim()
                              ? "bg-blue-500 hover:bg-blue-600 text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : input.trim() ? (
                            <SendHorizontal className="h-4 w-4" />
                          ) : (
                            <CornerDownLeft className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </form>
                    <div className="mt-2 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {CHATBOT_NAME} provides general guidance. For specific
                        advice, consult an expert.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                // Not authenticated view
                (<div className="flex flex-col items-center justify-center flex-1 p-6 text-center bg-gray-50 dark:bg-gray-900 overflow-scroll pt-24">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                    }}
                    className="flex flex-col items-center max-w-md"
                  >
                    <div className="relative w-20 h-20 mb-4">
                      <motion.div
                        className="absolute inset-0 bg-blue-400/20 dark:bg-blue-500/20 rounded-full blur-xl"
                        animate={{
                          scale: [1, 1.2, 1],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                      <div className="relative h-full w-full flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-md">
                        <Sparkles className="h-8 w-8 text-blue-500" />
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      Sign in to use AI Career Guidance
                    </h3>

                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Get personalized career advice, college recommendations,
                      and expert insights with our AI assistant.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                      <Button
                        onClick={() => {
                          handleChatOpenToggle(false);
                          window.location.href = "/login";
                        }}
                        variant="outline"
                        className="flex-1 py-6"
                      >
                        Login
                      </Button>
                      <Button
                        onClick={() => {
                          handleChatOpenToggle(false);
                          window.location.href = "/register";
                        }}
                        className="flex-1 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      >
                        Sign Up
                      </Button>
                    </div>

                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                      <div className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                        <Bot className="h-5 w-5 text-blue-500 mb-2" />
                        <p className="text-xs text-center text-gray-600 dark:text-gray-400">
                          Career path guidance
                        </p>
                      </div>
                      <div className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                        <School className="h-5 w-5 text-blue-500 mb-2" />
                        <p className="text-xs text-center text-gray-600 dark:text-gray-400">
                          College recommendations
                        </p>
                      </div>
                      <div className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                        <User className="h-5 w-5 text-blue-500 mb-2" />
                        <p className="text-xs text-center text-gray-600 dark:text-gray-400">
                          Personalized advice
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>)
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
