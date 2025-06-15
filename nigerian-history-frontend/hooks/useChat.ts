import { useState, useEffect, useCallback } from 'react';
import { Message } from '../types';
import { askQuestionStream, checkHealth } from '../lib/api';
import { source } from 'framer-motion/client';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeChat = async () => {

      const fixedTimestamp = new Date('2024-01-01T00:00:00.000Z');
      
      setMessages([
        {
          id: 'welcome-1',
          type: 'assistant',
          content: 'How you dey! I be your Nigerian History AI assistant. Abeg give me small time make I ready for you...',
          timestamp: fixedTimestamp, 
        },
      ]);


      setIsInitialized(true);
      
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
              timestamp: fixedTimestamp,
            };
          } else {
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

    if (!isInitialized) {
      initializeChat();
    }

  }, [isInitialized]);

  const sendMessage = useCallback(async (question: string) => {
    if (isLoading) return; 

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;

    const userMessage: Message = {
      id: userMessageId,
      type: 'user',
      content: question,
      timestamp: new Date(), 
    };

    const loadingMessage: Message = {
      id: assistantMessageId,
      type: 'assistant',
      content: ' Let me think about that...',
      timestamp: new Date(),
      isLoading: true,
      sources: []
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setIsLoading(true);
    setApiError(null);


    let receivedSources: string[] = []

    const onStreamUpdate = (newContent: string, newSources: string[]) => {
      setMessages(prevMessages => prevMessages.map(msg => 
        msg.id === assistantMessageId
        ? { ...msg, content: newContent, source: newSources, isLoading: true }
        : msg
      ));
      receivedSources = newSources;
    };

    const onStreamEnd = (fullAnswer: string) => {
      setMessages(prevMessages => prevMessages.map(msg =>
        msg.id === assistantMessageId
          ? { ...msg, content: fullAnswer, sources: receivedSources, isLoading: false, timestamp: new Date() }
          : msg
      ));
      setIsLoading(false);
    };

    const onError = (errorMsg: string) => {
      setMessages(prevMessages => prevMessages.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: 'Sorry, I encountered an error during streaming. Please try again.', isLoading: false, error: errorMsg, timestamp: new Date() }
            : msg
        ));
      setApiError(errorMsg);
      setIsLoading(false);
    };

    try {
      await askQuestionStream(question, onStreamUpdate, onStreamEnd, onError);
    } catch (error: any) {
      console.error('Error initiating stream:', error);
      onError(error.message);
    }
  }, [isLoading]); 

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: 'welcome-1',
        type: 'assistant',
        content: 'How far! I be your Nigerian History AI assistant. Wetin you wan know today?',
        timestamp: new Date(),
      },
    ]);
    setApiError(null);
    setIsLoading(false);
    setIsInitialized(false);
  }, []);

  return {
    messages,
    isLoading,
    apiError,
    sendMessage,
    clearMessages,
  };
  
};