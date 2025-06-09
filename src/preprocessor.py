import json
import re
import os
import time
from typing import List, Dict
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.docstore.document import Document

from dotenv import load_dotenv
load_dotenv()


class NigerianHistoryPreprocessor:
    def __init__(self):
        self.data_dir = "data"
        self.processed_data_dir = os.path.join(self.data_dir, "processed")
        self.faiss_index_path = os.path.join(self.data_dir, "faiss_index")
        os.makedirs(self.processed_data_dir, exist_ok=True)
        os.makedirs(self.faiss_index_path, exist_ok=True)

        self.mongo_uri = os.getenv("MONGO_URI", "mongodb+srv://franklin:Uche2006@cluster0.psnxlha.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
        self.mongo_db_name = os.getenv("MONGO_DB_NAME", "nigerian_history_db")
        self.mongo_collection_name = os.getenv("MONGO_COLLECTION_NAME", "raw_documents")
        self.mongo_client = None

        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1500,
            chunk_overlap=200,
            separators=["\n\n", "\n", ". ", "? ", "! ", " ", ""],
            length_function=len,
        )

        print("🤖 Loading embedding model using HuggingFaceEmbeddings...")
        self.embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        print("✅ Embedding model loaded.")

    def _get_mongo_collection(self):
        if self.mongo_client is None:
            try:
                self.mongo_client = MongoClient(self.mongo_uri)
                self.mongo_client.admin.command('ping')
                db = self.mongo_client[self.mongo_db_name]
                collection = db[self.mongo_collection_name]
                print(f"✅ Connected to MongoDB: {self.mongo_db_name}.{self.mongo_collection_name}")
                return collection
            except ConnectionFailure as e:
                print(f"❌ MongoDB connection failed: {e}")
                return None
        return self.mongo_client[self.mongo_db_name][self.mongo_collection_name]

    def load_raw_data_from_mongo(self) -> List[Dict]:
        collection = self._get_mongo_collection()
        if collection is None:
            return []
        try:
            raw_documents = []
            for doc in collection.find({}):
                doc['_id'] = str(doc['_id'])
                raw_documents.append(doc)
            print(f"📄 Loaded {len(raw_documents)} documents from MongoDB.")
            return raw_documents
        except Exception as e:
            print(f"❌ Error loading documents: {e}")
            return []

    def clean_text(self, text: str) -> str:
        if not isinstance(text, str):
            return ""
        text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>') \
                   .replace('&quot;', '"').replace('&#x27;', "'")
        text = re.sub(r'\n\s*\n', '\n', text)
        text = re.sub(r'\s+', ' ', text)

        boilerplate_patterns = [
            r'Skip to main content', r'Toggle navigation', r'Privacy Policy',
            r'Terms of Use', r'All rights reserved', r'© \d{4}', r'\[\d+\]',
            r'Comments\s*\(\d+\)', r'Share this article'
        ]
        for pattern in boilerplate_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)

        text = re.sub(r'\.{2,}', '.', text)
        text = re.sub(r'[\!\?]{2,}', '!', text)
        text = re.sub(r'[\,\;\-]{2,}', ',', text)
        text = re.sub(r'[^a-zA-Z0-9\s.,!?;:"\'\-\(\)\[\]]', '', text)

        return text.strip()

    def chunk_documents(self, documents: List[Dict]) -> List[Dict]:
        chunks = []
        for doc in documents:
            doc_id = doc.get("_id", doc.get("source", "unknown_doc"))
            doc_title = doc.get("title", doc.get("source", "Untitled"))
            raw_content = doc.get('content', '')
            if not raw_content:
                continue
            clean_content = self.clean_text(raw_content)
            if not clean_content:
                continue
            text_chunks = self.text_splitter.split_text(clean_content)

            for i, chunk in enumerate(text_chunks):
                chunks.append({
                    "doc_id": doc_id,
                    "chunk_id": f"{doc_id}_{i}",
                    "source": doc.get('source', 'Unknown'),
                    "title": doc_title,
                    "content": chunk,
                    "chunk_index": i,
                    "type": doc.get('type', 'unknown'),
                    "metadata": {
                        "source": doc.get('source', 'Unknown'),
                        "title": doc_title,
                        "doc_id": doc_id,
                        "chunk_index": i
                    }
                })
            print(f"✅ Chunked: {doc_title} ({len(text_chunks)} chunks)")
        print(f"Total chunks created: {len(chunks)}")
        return chunks

    def filter_quality_chunks(self, chunks: List[Dict]) -> List[Dict]:
        filtered = []
        for chunk in chunks:
            content = chunk.get('content', '')
            if len(content) < 100:
                continue
            alphanum_ratio = len(re.findall(r'[a-zA-Z0-9]', content)) / len(content)
            if alphanum_ratio < 0.5:
                continue
            number_ratio = len(re.findall(r'\d', content)) / len(content)
            if number_ratio > 0.4:
                continue
            filtered.append(chunk)
        print(f"✅ Quality chunks: {len(filtered)} / {len(chunks)}")
        return filtered

    def save_chunks_to_faiss(self, chunks: List[Dict]):
        if not chunks:
            print("⚠️ No chunks to save.")
            return

        langchain_docs = []
        for chunk in chunks:
            langchain_docs.append(
                Document(
                    page_content=chunk['content'],
                    metadata=chunk['metadata']
                )
            )

        print("📦 Saving to FAISS vector store...")
        faiss_store = FAISS.from_documents(langchain_docs, self.embedding_model)
        faiss_store.save_local(self.faiss_index_path)
        print(f"✅ FAISS index saved at: {self.faiss_index_path}")

    def process_all_data(self):
        print("🚀 Starting data preprocessing pipeline...")
        raw_documents = self.load_raw_data_from_mongo()
        if not raw_documents:
            print("❌ No documents to process.")
            return
        chunks = self.chunk_documents(raw_documents)
        filtered_chunks = self.filter_quality_chunks(chunks)
        self.save_chunks_to_faiss(filtered_chunks)
        print("🎉 All data processed and saved!")


if __name__ == "__main__":
    processor = NigerianHistoryPreprocessor()
    processor.process_all_data()

    if os.path.exists(processor.faiss_index_path):
        print(f"\n✅ FAISS index directory exists: {processor.faiss_index_path}")
    else:
        print("\n❌ FAISS index not found.")
