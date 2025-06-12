import axios, { AxiosError } from "axios";
import { QuestionResponse, FeedbackData, HealthResponse, ApiError } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create an Axios instance with default configuration
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 345000,
    headers: {
      'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    (config) => {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => {
      console.error('❌ API Request Error:', error);
      return Promise.reject(error);
    }
);


// Add a response interceptor for logging successful responses and centralized error handling
apiClient.interceptors.response.use(
    (response) => {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
      return response;
    },
    (error: AxiosError<ApiError>) => { 
      console.error('❌ API Response Error:', error.response?.status, error.message);
  
      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (error.response) {
        errorMessage = error.response.data?.detail || `Server error: ${error.response.status}`;
        if (error.response.status === 503) {
            errorMessage = 'The AI service is currently unavailable. Please wait a moment and try again.';
        } else if (error.response.status === 400) {
            errorMessage = error.response.data?.detail || 'Bad request. Please check your input.';
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your internet connection or if the API is running.';
      } else {
        errorMessage = `Request setup error: ${error.message}`;
      }
      
      return Promise.reject(new Error(errorMessage));
    }
);

// --- API Functions ---

/**
 * Sends a question to the Nigerian History AI assistant.
 * @param question The user's question string.
 * @param maxSources Optional: Maximum number of sources to request in the response (defaults to 5).
 * @returns A Promise that resolves to a QuestionResponse object.
 */
export const askQuestion = async (
    question: string,
    maxSources: number = 5 
  ): Promise<QuestionResponse> => {
    try {
      const response = await apiClient.post<QuestionResponse>('/ask', {
        question,
        max_sources: maxSources, 
      });
      return response.data;
    } catch (error) {
      throw error;
    }
};

/**
 * Checks the health status of the backend API.
 * @returns A Promise that resolves to a HealthResponse object.
 */
export const checkHealth = async (): Promise<HealthResponse> => {
    try {
      const response = await apiClient.get<HealthResponse>('/health');
      return response.data; 
    } catch (error) {
      console.error('Error fetching health status:', error);
      throw error;
    }
};
  
  /**
   * Submits user feedback for an AI-generated answer.
   * @param feedback The FeedbackData object containing question, answer, rating, and optional feedback.
   * @returns A Promise that resolves when the feedback is successfully submitted.
   */
export const submitFeedback = async (feedback: FeedbackData): Promise<void> => {
    try {
      await apiClient.post('/feedback', feedback);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
};