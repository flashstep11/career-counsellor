"use client";

import { useState, useEffect } from "react";
import axios from "axios";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
};

export const useChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize chatbot session
  useEffect(() => {
    const initSession = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        // Just set a brief loading state for UI feedback
        setIsLoading(true);
        
        // Create a new session - system prompt and greeting now process in background
        const response = await axios.post(
          "/api/chatbot/create-session",
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        // Set the session ID immediately so we can start chatting
        setSessionId(response.data.session_id);
        setIsInitialized(true);
        
        // Initial history check - just to make sure UI is responsive immediately
        try {
          const historyResponse = await axios.get(
            `/api/chatbot/history/${response.data.session_id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          
          if (historyResponse.data.history && historyResponse.data.history.length > 0) {
            setMessages(historyResponse.data.history);
          }
        } catch (historyErr) {
          // Ignore history errors - we can still chat without history
          console.warn("Could not load chat history, continuing anyway:", historyErr);
        }
      } catch (err: any) {
        console.error("Failed to create chat session:", err);
        setError("Failed to initialize chat session");
      } finally {
        setIsLoading(false);
      }
    };

    if (!isInitialized) {
      initSession();
    }
  }, [isInitialized]);
  
  // Poll for the greeting message that is generated in the background
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    const checkForGreeting = async () => {
      // Only check if we don't already have messages and we have a session ID
      if (messages.length === 0 && sessionId && isInitialized) {
        try {
          const token = localStorage.getItem("token");
          if (!token) return;
          
          const historyResponse = await axios.get(
            `/api/chatbot/history/${sessionId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          
          if (historyResponse.data.history && historyResponse.data.history.length > 0) {
            setMessages(historyResponse.data.history);
            // Clear the interval once we have messages
            if (intervalId) {
              clearInterval(intervalId);
            }
          }
        } catch (err) {
          // Silently ignore errors during polling
          console.warn("Error polling for greeting:", err);
        }
      } else if (messages.length > 0 && intervalId) {
        // Clear the interval if we already have messages
        clearInterval(intervalId);
      }
    };
    
    if (isInitialized && sessionId) {
      // Check immediately
      checkForGreeting();
      
      // Then set up polling every 1 second for 10 seconds
      intervalId = setInterval(checkForGreeting, 1000);
      
      // Stop polling after 10 seconds regardless
      setTimeout(() => {
        if (intervalId) {
          clearInterval(intervalId);
        }
      }, 10000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isInitialized, sessionId, messages.length]);

  // Send message to chatbot
  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    // Add user message to chat
    const userMessage: Message = { 
      role: "user", 
      content: message,
      timestamp: new Date() 
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("User not authenticated");

      // Send message request
      const response = await axios.post(
        "/api/chatbot/chat",
        {
          message,
          session_id: sessionId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Add assistant message with response
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: response.data.response,
          timestamp: new Date()
        }
      ]);
      
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  return { 
    messages, 
    isLoading, 
    error, 
    sendMessage,
    isInitialized
  };
};