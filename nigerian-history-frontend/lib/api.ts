import axios from "axios";
import { QuestionResponse, FeedbackData, HealthResponse, ApiError } from '../types';


const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create an Axios instance with default configuration
const axiosApi = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
});


interface StreamMetadata {
  type: 'metadata';
  sources: string[];
  relevant_chunks_found: number;
  context_chunks_used: number;
}

interface StreamChunk {
  type: 'chunk';
  content: string;
}

interface StreamEnd {
  type: 'end';
  full_answer: string;
  timestamp: string;
  generation_time: string;
}

type StreamResponsePart = StreamMetadata | StreamChunk | StreamEnd;


// function for streaming responses

export const askQuestionStream = async (question: string, onStreamUpdate: (content: string, sources: string[]) => void, onStreamEnd: (fullAnswer: string) => void, onError: (error: string) => void) => {
  try {
    const response = await fetch(`${API_BASE_URL}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ question })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get readable stream from response.");
    }

    const decoder = new TextDecoder('utf-8')
    let accumulatedContent = '';
    let sources: string[] = [];

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        try {
          const jsonLine = line.startsWith('data: ') ? line.substring(6) : line;
          if (jsonLine.trim() === '') continue;
          
          const parsed: StreamResponsePart = JSON.parse(jsonLine);

          if (parsed.type == 'metadata') {
            sources = (parsed as StreamMetadata).sources;
            onStreamUpdate(accumulatedContent, sources);
          } else if (parsed.type == 'chunk') {
            accumulatedContent += (parsed as StreamChunk).content;
            onStreamUpdate(accumulatedContent, sources);
          } else if (parsed.type == 'end'){
            onStreamEnd((parsed as StreamEnd).full_answer);
            return;
          }
        } catch (e) {
          console.error("Failed to parse JSON line from stream:", line, e);
        }
      }
    }
  } catch (error: any) {
    console.error('Streaming API Error:', error);
    onError(error.message || 'Network error during streaming.');
  }
}




/**
 * Checks the health status of the backend API.
 * @returns A Promise that resolves to a HealthResponse object.
 */
export const checkHealth = async (): Promise<HealthResponse> => {
    try {
      const response = await axiosApi.get<HealthResponse>('/health');
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
      await axiosApi.post('/feedback', feedback);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
};