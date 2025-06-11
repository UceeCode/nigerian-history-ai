import os
import numpy as np
from typing import List, Dict, Optional
from datetime import datetime
import time

from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.llms import Ollama
from langchain_community.vectorstores import FAISS 
from langchain.prompts import PromptTemplate
from langchain.schema import BaseOutputParser 
from langchain.docstore.document import Document 

from dotenv import load_dotenv
load_dotenv()


class NigerianHistoryRAG:
    """
    This creates the "brain" of our AI assistant that can find and explain information.
    """
    
    def __init__(self, model_type: str = "ollama", model_name: str = "mistral:7b"):
        self.faiss_index_path = os.path.join("data", "faiss_index")
        self.model_type = model_type
        self.model_name = model_name
        
        print("🤖 Loading embedding model 'all-MiniLM-L6-v2'...")
        self.embedding_model = HuggingFaceEmbeddings(model_name='all-MiniLM-L6-v2')
        print("✅ Embedding model loaded.")
        
        self.llm = self._initialize_llm()
        
        self.vector_store = self._load_vector_store()
        
        self.prompt_template = PromptTemplate(
            template="""You are an expert on Nigerian history. Use the following context to answer the question accurately and informatively.
            If the context doesn't contain enough information, state clearly that you cannot answer based on the provided information.
            Always provide specific dates, names, and events when available.
            Cite sources when mentioning facts. For example: (Source: Wikipedia - History of Nigeria).
            Keep your answer informative but concise.

            Context:
            {context}

            Question: {question}

            Answer:""",
            input_variables=["context", "question"]
        )
        
    def _initialize_llm(self):
        if self.model_type == "ollama":
            return Ollama(model=self.model_name) 
        else:
            raise ValueError(f"Unsupported model type: {self.model_type}")
        
    def _load_vector_store(self):
        print(f"Loading FAISS index from: {self.faiss_index_path}...")

        if not os.path.exists(self.faiss_index_path):
            raise FileNotFoundError(
                f"FAISS index not found at {self.faiss_index_path}. "
            )
        try:
            faiss_vector_store = FAISS.load_local (
                folder_path=self.faiss_index_path,
                embeddings = self.embedding_model,
                allow_dangerous_deserialization=True 
            ) 
            print("✅ FAISS index loaded successfully.")
            return faiss_vector_store
        except Exception as e:
            print(f"Error loading FAISS index: {e}")
            raise
            
    def search_relevant_chunks(self, query: str, top_k: int = 5) -> List[Document]:
        """
        Find the most relevant chunks for a query using the loaded FAISS vector store.
        """
        
        print(f"Searching for top {top_k} relevant chunks for query: '{query[:50]}...'")
        
        relevant_documents = self.vector_store.similarity_search(query, k=top_k)
        
        print(f"✅ Found {len(relevant_documents)} relevant documents.")
        return relevant_documents
    
    def generate_answer(self, question: str, max_context_length: int = 3500) -> Dict:
        """
        Generate an answer to a question using the LLM and retrieved context.
        """
        
        # Step 1: Find relevant information
        relevant_documents = self.search_relevant_chunks(question, top_k = 10)
        
        # Step 2: Prepare context (combine relevant chunks)
        context_parts = []
        context_length = 0
        sources = set()
        
        for doc in relevant_documents:
            source_title = doc.metadata.get('title', 'Unknown Source')
            source_url = doc.metadata.get('source', 'No URL')
            chunk_content = doc.page_content
    
            chunk_text = f"Source: {source_title} ({source_url})\nContent: {chunk_content}\n\n"
            
            if context_length + len(chunk_text) > max_context_length:
                break
            
            context_parts.append(chunk_text)
            context_length += len(chunk_text)
            sources.add(f"{source_title} ({source_url})")
        
        context = "".join(context_parts)
        
        if not context.strip():
            answer = "Abeg no vex, I no too get correct information wey fit answer this your question well."
            print("No context generated from relevant chunks.")
        else:
            # Step 3: Generate answer using the language model      
            print(f"Generating answer using {self.model_type}...")
            if self.model_type == "ollama":
                prompt = self.prompt_template.format(context=context, question=question)
                answer = self.llm.invoke(prompt)
            else:
                answer = "Error: Unsupported LLM type configured."
                
        # Step 4: Prepare response
        response = {
            "question": question,
            "answer": answer,
            "sources": list(sources), 
            "relevant_chunks_found": len(relevant_documents),
            "context_chunks_used": len(context_parts),
            "timestamp": datetime.now().isoformat()
        }

        return response
        
        
    def ask_question(self, question: str) -> Dict:
        
        print(f"\n❓ Question: {question}")
        start_time = time.time()
        
        response = self.generate_answer(question)
        
        end_time = time.time()
        print(f"Answer generated in {end_time - start_time:.2f} seconds.")
        
        return response
    
if __name__ == "__main__":
    print("Starting Nigerian History RAG System...")
    
    rag = NigerianHistoryRAG(model_type="ollama", model_name="mistral:7b")
    
    test_questions = [
        "Who designed the Nigerian flag?", 
        "What is the capital of Nigeria?"
    ]

    print("\n🧪 Testing RAG system...")
    for i, question in enumerate(test_questions):
        response = rag.ask_question(question)
        print(f"\n--- Question {i+1} ---")
        print(f"📋 Question: {response['question']}")
        print(f"📝 Answer: {response['answer']}")
        print(f"📚 Sources: {', '.join(response['sources']) if response['sources'] else 'None'}")
        print(f"Found {response['relevant_chunks_found']} relevant chunks, used {response['context_chunks_used']} in context.")
        print("-" * 80)
        time.sleep(2) 
    
    
        
        
        
        
        
        
        
        