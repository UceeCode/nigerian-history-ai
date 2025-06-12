// Define the shape of our data 

/**
 * Represents a single message in the chat interface.
 * Can be from the user or the AI assistant.
 */
export interface Message {
    id: string; 
    type: 'user' | 'assistant'; 
    content: string; 
    timestamp: Date; 
    sources?: string[]; 
    isLoading?: boolean;
    error?: string; 
}

/**
   * Defines the structure of the successful response from the /ask API endpoint.
   * This directly maps to the QuestionResponse Pydantic model in src/api.py.
*/
export interface QuestionResponse {
    question: string; 
    answer: string; 
    sources: string[]; 
    relevant_chunks_found: number; 
    context_chunks_used: number; 
    timestamp: string;
    response_time_ms: number;
}
  
/**
   * Defines the structure of an error response from the API.
   * This typically maps to HTTPException details from FastAPI.
*/
  export interface ApiError {
    detail: string; 
    status_code: number; 
  }
  
/**
   * Defines the structure for potential future topics/suggestions from the API.
*/
export interface TopicsResponse {
    popular_topics: string[]; 
    sample_questions: string[]; 
}
  
/**
   * Defines the structure for potential future statistics/dashboard data from the API.
*/
export interface StatsResponse {
    total_questions: number; 
    knowledge_base_size: number; 
    average_response_time: string; 
    last_updated: string;
    total_feedback?: number; 
}

/**
   * Defines the structure for sending feedback data to the API.
   * Maps to the FeedbackRequest Pydantic model in src/api.py.
*/
export interface FeedbackData {
    question: string; 
    answer: string; 
    rating: number;
    feedback?: string;
}

/**
   * Represents the structure for the health check response from the API.
   * Maps to the HealthResponse Pydantic model in src/api.py.
*/
export interface HealthResponse {
    status: string; 
    message: string; 
    timestamp: string; 
}