# Nigerian History AI Assistant

---

## 📚 Project Overview

The **Nigerian History AI Assistant** is an intelligent AI companion dedicated to answering questions about Nigeria's rich and complex history. Leveraging a sophisticated **Retrieval-Augmented Generation (RAG)** pipeline, this system combines the power of a locally hosted Large Language Model (LLM) with a knowledge base derived from various Nigerian historical sources. It's designed to provide accurate, context-aware, and cited responses, ensuring historical fidelity and user trust.

The project encompasses a full-stack architecture: a robust Python backend handling data processing, RAG orchestration, and API services, complemented by a beautiful, Nigerian-themed Next.js frontend for an intuitive user experience.

## ✨ Key Features

* **Contextual Q&A:** Get precise answers to inquiries based on an extensive knowledge base of Nigerian history, extracted from diverse sources like academic papers, historical documents, and reputable websites.
* **Comprehensive Data Collection:** Web scraping and PDF text extraction process gathers raw historical data.
* **Intelligent Data Preprocessing:** Raw data is retrieved from MongoDB, cleaned, chunked, filtered for quality, and then embedded into a FAISS vector store, optimizing it for retrieval.
* **RAG Pipeline:** Integrates a FAISS vector store with a powerful open-source LLM (Llama 3.2:1b via Ollama) to generate highly relevant and informed responses.
* **Real-time Streaming Responses:** Enjoy a dynamic chat experience as AI answers are streamed character-by-character to the frontend, mimicking a natural conversation flow.
* **API Accessibility:** The core AI functionalities are exposed via a FastAPI backend, allowing for flexible integration.
* **Beautiful UI:** An intuitive and visually appealing user interface built with Next.js, featuring a vibrant Nigerian color theme for an immersive experience.

## ⚙️ Tech Stack

### Backend & AI Pipeline

* **Python:** Primary language for data collection, preprocessing, and RAG pipeline development.
* **LangChain:** Framework for building LLM-powered applications, orchestrating the RAG flow.
* **Ollama:** For running open-source Large Language Models locally (specifically **Llama 3.2:1b**).
* **HuggingFace Embeddings:** Used for generating dense vector representations of text.
* **FAISS:** Facebook AI Similarity Search, an efficient library for similarity search, used as the vector store.
* **MongoDB:** NoSQL database used to store raw collected historical data.
* **FastAPI:** High-performance web framework for the backend API.
* **`python-dotenv`:** For managing environment variables securely.

### Frontend

* **Next.js:** React framework for building the user interface.
* **React:** For interactive UI components.
* **TypeScript:** For type-safe development.
* **Tailwind CSS:** Utility-first CSS framework for rapid styling.
* **`lucide-react`:** For sleek, customizable SVG icons.
* **`react-markdown`:** For rendering Markdown content from AI responses.
