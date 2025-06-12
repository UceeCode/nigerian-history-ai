// hooks/useChat.ts
// Custom hook to manage chat functionality - HYDRATION SAFE VERSION

import { useState, useEffect, useCallback } from 'react';
import { Message } from '../types';
import { askQuestion, checkHealth } from '../lib/api';

export const useChat = () => {
  // --- State Management ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // --- Initial Welcome Message & Health Check ---
  useEffect(() => {
    const initializeChat = async () => {
      // Create a fixed timestamp that will be the same on server and client
      const fixedTimestamp = new Date('2024-01-01T00:00:00.000Z');
      
      // Set an initial welcome message with a predictable timestamp
      setMessages([
        {
          id: 'welcome-1',
          type: 'assistant',
          content: 'How you dey! I be your Nigerian History AI assistant. Abeg give me small time make I ready for you...',
          timestamp: fixedTimestamp, // Use fixed timestamp to avoid hydration mismatch
        },
      ]);

      // Mark as initialized to prevent further re-renders
      setIsInitialized(true);
      
      // Start loading after setting initial state
      setIsLoading(true);

      try {
        const healthResponse = await checkHealth();
        let welcomeContent = '';
        let welcomeError: string | undefined = undefined;

        if (healthResponse.status === 'healthy') {
          welcomeContent = 'I don ready to help you learn about Nigeria\'s rich history from the olden days of kingdoms to how we dey today. Wetin you wan know?';
        } else {
          welcomeContent = `I'm currently experiencing some issues: "${healthResponse.message}". You can still try asking questions, but responses might be delayed or unavailable.`;
          welcomeError = healthResponse.message;
        }

        setMessages((prev) => {
          const newMessages = [...prev];
          // Update the content of the first message
          if (newMessages.length > 0 && newMessages[0].id === 'welcome-1') {
            newMessages[0] = {
              ...newMessages[0],
              content: welcomeContent,
              isLoading: false,
              error: welcomeError,
              // Keep the same timestamp to avoid hydration issues
              timestamp: fixedTimestamp,
            };
          } else {
            // Fallback in case message array is empty or ID changed
            newMessages.push({
                id: 'welcome-final',
                type: 'assistant',
                content: welcomeContent,
                timestamp: fixedTimestamp,
                isLoading: false,
                error: welcomeError,
            });
          }
          return newMessages;
        });

      } catch (err: any) {
        console.error("Health check failed critically:", err);
        setApiError(err.message || "Cannot connect to the AI service. Please ensure the backend API is running.");
        setMessages((prev) => {
          const newMessages = [...prev];
           if (newMessages.length > 0 && newMessages[0].id === 'welcome-1') {
                newMessages[0] = {
                  ...newMessages[0],
                  content: `I'm unable to connect to the AI service at the moment. Error: ${err.message || 'Unknown error'}. Please try again later.`,
                  isLoading: false,
                  error: err.message,
                  timestamp: fixedTimestamp, 
                };
            } else {
                newMessages.push({
                    id: 'welcome-error-final',
                    type: 'assistant',
                    content: `I'm unable to connect to the AI service at the moment. Error: ${err.message || 'Unknown error'}. Please try again later.`,
                    timestamp: fixedTimestamp,
                    isLoading: false,
                    error: err.message,
                });
            }
          return newMessages;
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Only initialize once
    if (!isInitialized) {
      initializeChat();
    }

  }, [isInitialized]); // Depend on isInitialized to prevent re-runs

  const sendMessage = useCallback(async (question: string) => {
    if (isLoading) return; // Prevent multiple simultaneous requests

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;

    // Add user message (this happens after hydration, so Date.now() is safe)
    const userMessage: Message = {
      id: userMessageId,
      type: 'user',
      content: question,
      timestamp: new Date(), // Safe to use new Date() here since it's post-hydration
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setApiError(null);

    // Add loading assistant message
    const loadingMessage: Message = {
      id: assistantMessageId,
      type: 'assistant',
      content: 'Let me think about that...',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, loadingMessage]);

    try {
      const response = await askQuestion(question);
      
      // Update the loading message with the actual response
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? {
              ...msg,
              content: response.answer,
              sources: response.sources,
              isLoading: false,
              timestamp: new Date(), // Update timestamp when response arrives
            }
          : msg
      ));
    } catch (error: any) {
      console.error('Error asking question:', error);
      
      // Update the loading message with error
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? {
              ...msg,
              content: 'Sorry, I encountered an error while processing your question. Please try again.',
              isLoading: false,
              error: error.message,
              timestamp: new Date(),
            }
          : msg
      ));
      
      setApiError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const clearMessages = useCallback(() => {
    // Reset to a default welcome message with current timestamp (safe since user-initiated)
    setMessages([
      {
        id: 'welcome-1',
        type: 'assistant',
        content: 'How far! I be your Nigerian History AI assistant. Wetin you wan know today?',
        timestamp: new Date(), // Safe since this is user-initiated action
      },
    ]);
    setApiError(null);
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    apiError,
    sendMessage,
    clearMessages,
  };
};