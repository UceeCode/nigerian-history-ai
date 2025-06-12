'use client'; 

import { useState, useEffect, useRef } from 'react';
import { BookOpen, Clock, Star, MessageCircle, Send, Loader2, RefreshCw } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { submitFeedback } from '../lib/api';
import { TopicsResponse, StatsResponse, FeedbackData, Message } from '../types';
import ReactMarkdown from 'react-markdown';
import flagpng from '../app/assets/flag-icon.png';
import Image from 'next/image';

export default function Home() {
  const { messages, isLoading, apiError, sendMessage, clearMessages } = useChat();

  const [currentQuestion, setCurrentQuestion] = useState('');
  const [topics, setTopics] = useState<TopicsResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [lastAssistantMessage, setLastAssistantMessage] = useState<Message | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setTopics({
          popular_topics: ['Pre-Colonial Era', 'Colonial Period', 'Independence', 'Military Rule', 'Fourth Republic'],
          sample_questions: [
            'Who was the first governor-general of Nigeria?',
            'When did Nigeria gain independence?',
            'Tell me about the Nigerian Civil War.',
            'What were the major ethnic groups in pre-colonial Nigeria?',
            'Who designed the Nigerian flag?',
            'When was Lagos capital of Nigeria?',
          ],
        });
        setStats({
          total_questions: 1250,
          knowledge_base_size: 2500,
          average_response_time: '2.5s',
          last_updated: new Date().toISOString(),
          total_feedback: 150,
        });
      } catch (err) {
        console.error('Error loading initial data (topics/stats):', err);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    const latestAssistantMessage = messages
      .filter(m => m.type === 'assistant' && !m.isLoading && !m.error)
      .pop();
    setLastAssistantMessage(latestAssistantMessage || null);
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentQuestion.trim()) {
      await sendMessage(currentQuestion);
      setCurrentQuestion('');
      setShowFeedbackForm(false);
    }
  };

  const handleSampleQuestion = (question: string) => {
    setCurrentQuestion(question);
  };

  const handleFeedbackSubmit = async () => {
    if (!lastAssistantMessage || feedbackRating === 0) {
      alert('Please provide a rating and ensure there is an AI response to rate.');
      return;
    }

    const feedbackData: FeedbackData = {
      question: messages.find(msg => msg.id === lastAssistantMessage.id.replace('assistant-', 'user-'))?.content || 'N/A',
      answer: lastAssistantMessage.content,
      rating: feedbackRating,
      feedback: feedbackText,
    };

    try {
      await submitFeedback(feedbackData);
      alert('Thank you for your feedback!');
      setShowFeedbackForm(false);
      setFeedbackRating(0);
      setFeedbackText('');
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      alert(`Failed to submit feedback: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 font-sans antialiased flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 to-emerald-700 text-white shadow-xl p-4">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-4 nav-logo">
            <div className="">
              <Image
              src={flagpng}
              alt='img'
              width={100}
              height={100}
              />
            </div>
            <div>
              <h2 className="text-2xl md:text-2xl font-bold">The History Oracle of Naija</h2>
              <p className="text-green-100 text-sm md:text-base">
                Your Smart Padi for Naija&apos;s Rich History
              </p>
            </div>
          </div>

          {stats && (
            <div className="hidden md:flex items-center space-x-9 text-sm gap-2">
              <div className="flex items-center space-x-5">
                <BookOpen className="w-4 h-4" />
                <span>{stats.knowledge_base_size?.toLocaleString() || 'N/A'} Sources</span>
              </div>
              <div className="flex items-center space-x-5">
                <Clock className="w-4 h-4" />
                <span>{stats.average_response_time || 'N/A'}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-8 max-w-7xl flex-grow flex flex-col lg:flex-row gap-8 main">
        {/* Sidebar */}
        <div className="lg:w-1/4 space-y-10 flex-shrink-0 firstbar">
          {topics && (
            <div className="bg-white rounded-xl shadow-lg p-6 sidebar">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2 text-green-600" />
                Try These Questions
              </h3>
              <div className="space-y-2">
                {topics.sample_questions.slice(0, 6).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSampleQuestion(question)}
                    className="w-full text-left p-3 text-sm bg-gray-50 hover:bg-green-50 hover:text-green-700 rounded-lg transition-all duration-200 border border-transparent hover:border-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 first-btn"
                    disabled={isLoading}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* {topics && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <Star className="w-5 h-5 mr-2 text-green-600" />
                Popular Topics
              </h3>
              <div className="space-y-2">
                {topics.popular_topics.map((topic, index) => (
                  <div key={index} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-700">{topic}</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      {index < 3 ? 'Trending' : 'Popular'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )} */}

          <button
            onClick={clearMessages}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl transition-colors duration-200 text-sm font-medium flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-gray-400 clear-btn"
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Clear Chat</span>
          </button>
        </div>

        {/* Main Chat Area */}
        <div className="lg:w-3/4 flex-grow flex flex-col">
          <div className="bg-white rounded-xl shadow-xl overflow-hidden flex-grow flex flex-col">
            {/* Chat Messages Display */}
            <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white no-scrollbar message-display">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl break-words chats ${
                      message.type === 'user'
                        ? 'bg-green-600 text-white rounded-br-none'
                        : 'bg-white border border-gray-200 text-gray-800 shadow-sm rounded-bl-none'
                    } ${message.error ? 'border-red-500 bg-red-50 text-red-800' : ''}`}
                  >
                    {message.isLoading ? (
                      <div className="flex items-center space-x-3 animate-pulse">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <div className="w-2 h-2 bg-green-600 rounded-full delay-100"></div>
                        <div className="w-2 h-2 bg-green-600 rounded-full delay-200"></div>
                        <span className="text-sm ml-5">{message.content}</span>
                      </div>
                    ) : (
                      <>
                        <div className={`prose prose-sm max-w-none ${message.type === 'user' ? 'prose-invert' : ''}`}>
                          <ReactMarkdown
                            components={{
        
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                              li: ({ children }) => <li className="mb-1">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              em: ({ children }) => <em className="italic">{children}</em>,
                              code: ({ children }) => (
                                <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm font-mono">
                                  {children}
                                </code>
                              ),
                              pre: ({ children }) => (
                                <pre className="bg-gray-100 text-gray-800 p-2 rounded text-sm font-mono overflow-x-auto">
                                  {children}
                                </pre>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>

                        {/* Sources */}
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-2 font-medium">📚 Sources:</p>
                            <div className="flex flex-wrap gap-1">
                              {message.sources.map((source, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                                >
                                  {source}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Error Message */}
                        {message.error && (
                          <p className="text-xs text-red-600 mt-2">
                            <span className="font-semibold">Error:</span> {message.error}
                          </p>
                        )}
                      </>
                    )}

                    <p className={`text-xs mt-2 ${message.type === 'user' ? 'text-green-100' : 'text-gray-500'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="border-t border-gray-200 p-4 bg-white">
              {apiError && (
                <div className="mb-4 text-red-600 text-sm p-3 bg-red-50 border border-red-200 rounded-lg">
                  <span className="font-semibold">API Error:</span> {apiError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex space-x-4 items-center input-form">
                <input
                  type="text"
                  value={currentQuestion}
                  onChange={(e) => setCurrentQuestion(e.target.value)}
                  placeholder={isLoading ? 'Thinking...' : 'Ask me about Nigerian history...'}
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-800 disabled:bg-gray-100 disabled:text-gray-500 chat-form"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !currentQuestion.trim()}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-green-500 chat-btn"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  <span className="hidden sm:inline">{isLoading ? 'Sending...' : 'Send'}</span>
                </button>
              </form>

              {/* Feedback Section
              {lastAssistantMessage && !isLoading && !lastAssistantMessage.error && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  {!showFeedbackForm ? (
                    <span className="font-medium">Was this answer helpful?</span>
                  ) : (
                    <span className="font-medium">Provide feedback for the last answer:</span>
                  )}
                  
                  <div className="flex-grow flex items-center gap-2 flex-wrap">
                    {!showFeedbackForm && (
                      <>
                        <button
                          onClick={() => { setFeedbackRating(5); setShowFeedbackForm(true); }}
                          className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 transition-colors duration-200 text-xs flex items-center space-x-1"
                        >
                          👍 Yes
                        </button>
                        <button
                          onClick={() => { setFeedbackRating(1); setShowFeedbackForm(true); }}
                          className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 transition-colors duration-200 text-xs flex items-center space-x-1"
                        >
                          👎 No
                        </button>
                      </>
                    )}
                    {showFeedbackForm && (
                      <>
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`cursor-pointer w-5 h-5 transition-colors ${
                                feedbackRating >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`}
                              onClick={() => setFeedbackRating(star)}
                            />
                          ))}
                        </div>
                        <input
                          type="text"
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Optional: Add comments"
                          className="flex-grow border border-blue-300 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                        />
                        <button
                          onClick={handleFeedbackSubmit}
                          disabled={feedbackRating === 0}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                        >
                          Submit
                        </button>
                        <button
                          onClick={() => setShowFeedbackForm(false)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )} */}

              <p className="text-xs text-gray-500 mt-4 text-center my-info">
                Powered by AI trained on verified Nigerian historical sources.
                <br/>
                Built by <a href="https://www.linkedin.com/in/franklin-n/" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">Franklin</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}