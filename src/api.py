from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Set
import os
import time 
from datetime import datetime
import uvicorn
import json

from rag_pipeline import NigerianHistoryRAG

app = FastAPI(
    title="Nigerian History AI API",
    description="AI-powered assistant for Nigerian history questions",
    version="1.0.0"
)

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        # "https://yourproductiondomain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],
)

rag_system: Optional[NigerianHistoryRAG] = None

class QuestionRequest(BaseModel):
    """Schema for a user's question request."""
    question: str = Field(..., min_length=5, max_length=500, description="The question about Nigerian history.")
    max_sources: Optional[int] = Field(5, ge=1, le=20, description="Maximum number of unique sources to include in the response.")
    
class QuestionResponse(BaseModel):
    """Schema for the AI's answer response."""
    question: str
    answer: str
    sources: List[str] = Field(..., description="List of unique sources cited in the answer.")
    relevant_chunks_found: int = Field(..., description="Total number of relevant chunks found by the retriever.")
    context_chunks_used: int = Field(..., description="Number of chunks actually included in the LLM's context.")
    timestamp: str = Field(..., description="Timestamp of when the response was generated (ISO format).")
    response_time_ms: float = Field(..., description="Time taken to generate the response in milliseconds.")
    
class HealthResponse(BaseModel):
    """Schema for the health check endpoint."""
    status: str = Field(..., description="Status of the API ('healthy' or 'unhealthy').")
    message: str = Field(..., description="A descriptive message about the health status.")
    timestamp: str = Field(..., description="Timestamp of the health check (ISO format).")

class FeedbackRequest(BaseModel):
    """Schema for user feedback on a generated answer."""
    question: str = Field(..., description="The original question asked.")
    answer: str = Field(..., description="The answer provided by the AI.")
    rating: int = Field(..., ge=1, le=5, description="User's rating of the answer (1-5 stars).")
    feedback: Optional[str] = Field(None, max_length=1000, description="Optional detailed feedback from the user.")
    
@app.on_event("startup")
async def startup_event():
    """
    Initialize the RAG system when the server starts.
    to load models and the FAISS index once.
    """
    
    global rag_system

    print("🚀 Starting Nigerian History AI API...")
    
    try:
        rag_system = NigerianHistoryRAG(model_type="ollama", model_name="mistral:7b")
        
        print("✅ RAG system initialized successfully!")
        
    except Exception as e:
        print(f"❌ Critical Error: RAG system initialization failed: {str(e)}")
        raise RuntimeError(f"Failed to initialize RAG system: {e}") from e
    
@app.get("/health", response_model=HealthResponse, summary="Check API health")
async def health_check():
    """
    **Health Check Endpoint**

    Checks if the API is running and if the RAG system is initialized.
    A quick way to verify the service status.
    """
    if rag_system and rag_system.vector_store: # Check if rag_system and its vector_store are loaded
        status = "healthy"
        message = "Nigerian History AI is running and RAG system is ready!"
    else:
        status = "unhealthy"
        message = "Nigerian History AI is running, but RAG system not fully initialized or failed."
    
    return HealthResponse(
        status=status,
        message=message,
        timestamp=datetime.now().isoformat()
    )
    
@app.post("/ask", response_model=QuestionResponse, summary="Feel free to ask anything about Nigeria’s history, no wahala.")
async def ask_question_endpoint(request: QuestionRequest):
    """
    **Ask a Question about Nigerian History**

    Submits a question to the AI assistant and retrieves an answer
    along with the sources used.

    Args:
        request (QuestionRequest): The question and optional parameters.

    Returns:
        QuestionResponse: The AI's answer, sources, and other metadata.

    Raises:
        HTTPException: If the RAG system isn't ready or the question is invalid.
    """
    
    if rag_system is None or rag_system.vector_store is None:
        raise HTTPException(status_code=503, detail="Service Unavailable: RAG system not initialized. Please try again later.")
    
    try:
        start_time = time.perf_counter() 
        
        response = rag_system.ask_question(request.question)
        
        end_time = time.perf_counter()
        response_time_ms = (end_time - start_time) * 1000
        
        # Ensure sources are unique and limit by max_sources
        unique_sources: Set[str] = set()
        for source_str in response.get("sources", []):
            unique_sources.add(source_str)
        
        limited_sources = list(unique_sources)[:request.max_sources]
        
        return QuestionResponse(
            question=response["question"],
            answer=response["answer"],
            sources=limited_sources,
            relevant_chunks_found=response.get("relevant_chunks_found", 0),
            context_chunks_used=response.get("context_chunks_used", 0),
            timestamp=response.get("timestamp", datetime.now().isoformat()),
            response_time_ms=response_time_ms
        )

    except Exception as e:
        print(f"Error processing question '{request.question}': {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {str(e)}")
    
@app.post("/feedback", status_code=202, summary="Submit feedback on an answer")
async def submit_feedback_endpoint(feedback_request: FeedbackRequest, background_tasks: BackgroundTasks):
    """
    **Submit Feedback on an Answer**

    Allows users to provide ratings and comments on the AI's answers.
    This helps in improving the model over time. Feedback is processed in the background.

    Args:
        feedback_request (FeedbackRequest): The feedback data.
        background_tasks (BackgroundTasks): FastAPI's dependency for running tasks in the background.
    """
    # In a real application, you'd save this feedback to a database (e.g., MongoDB, PostgreSQL)

    def save_feedback_to_log(feedback_data: Dict):
        feedback_log_path = os.path.join("data", "feedback_log.jsonl")
        with open(feedback_log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(feedback_data, ensure_ascii=False) + "\n")
        print(f"📝 Background task: Saved feedback for question: '{feedback_data.get('question', '')}'")

    feedback_data = feedback_request.dict()
    feedback_data["received_at"] = datetime.now().isoformat()
    
    background_tasks.add_task(save_feedback_to_log, feedback_data)
    
    return {"message": "Feedback received and being processed in the background."}

if __name__ == "__main__":
    # To run the FastAPI app:
    # uvicorn src.api:app --host 0.0.0.0 --port 8000 --reload
    # --reload is useful for development to automatically restart on code changes.
    # For production, remove --reload.
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
