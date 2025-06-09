import requests
from bs4 import BeautifulSoup
import os
import time
from typing import List, Dict, Union
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, DuplicateKeyError
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
import json


# MONGO DB CONNECTION

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://franklin:Uche2006@cluster0.psnxlha.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "nigerian_history_db")
MONGO_COLLECTION_NAME = os.getenv("MONGO_COLLECTION_NAME", "raw_documents")


RAW_WEB_DATA_DIR = "data/raw_web_data"
LOCAL_DOCS_DIR = "src/data/local_docs"

os.makedirs(RAW_WEB_DATA_DIR, exist_ok=True)
os.makedirs(LOCAL_DOCS_DIR, exist_ok=True)

# List of URLs for Nigerian history.
NIGERIAN_HISTORY_URLS = [
    "https://en.wikipedia.org/wiki/History_of_Nigeria",
    "https://www.britannica.com/place/Nigeria/History",
    "https://www.nationalarchivesofnigeria.org.ng",
    "https://www.historicalsocietynigeria.org.ng",
    "https://www.ofemipo.org",
    "https://archivi.ng",
    "https://archive.org/details/ground-work-of-nigerian-history",
    "https://www.familysearch.org/en/wiki/Nigeria_Archives_and_Libraries",
    "https://www.eastview.com/resources/gpa/daily-times",
    "https://www.thehistoryville.com/about-historyville",
    "https://funaab.edu.ng/funaab-ocw/opencourseware/GNS%20102.pdf",
    "https://www.britannica.com/topic/history-of-Nigeria",
    "https://en.wikipedia.org/wiki/History_of_Nigeria",
    "https://en.wikipedia.org/wiki/Virtual_Museum_of_Modern_Nigerian_Art",
    "https://library.columbia.edu/libraries/global/virtual-libraries/african_studies/countries/nigeria/hist.html",
    "https://www.thehistoryville.com/?utm_source=chatgpt.com",
    "https://oldnaija.com/?utm_source=chatgpt.com",
    "https://www.historicalsocietynigeria.org.ng/?utm_source=chatgpt.com",
    "https://archivi.ng/?utm_source=chatgpt.com",
    "https://www.ofemipo.org/?utm_source=chatgpt.com",
    "https://www.onthisday.com/countries/nigeria?utm_source=chatgpt.com",
    "https://www.withinnigeria.com/piece/2024/10/27/10-historical-sites-in-nigeria-and-their-location/?utm_source=chatgpt.com",
]

def get_mongo_collection():
    """Establishes MongoDB connection and returns the collection."""
    try:
        client = MongoClient(MONGO_URI)
        client.admin.command('ping')
        db = client[MONGO_DB_NAME]
        collection = db[MONGO_COLLECTION_NAME]
        print(f"Successfully connected to MongoDB: {MONGO_DB_NAME}.{MONGO_COLLECTION_NAME}")
        return collection
    except ConnectionFailure as e:
        print(f"MongoDB connection failed: {e}")
        print("Please ensure MongoDB is running and accessible at the specified URI.")
        return None
    except Exception as e:
        print(f"An unexpected error occurred during MongoDB connection: {e}")
        return None
    
def insert_document_to_mongo(collection, document: Dict[str, Union[str, Dict]]) -> bool:
    """Inserts a single document into MongoDB"""
    if collection is None:
        print("MongoDb collection not available. Skipping Insertion")
        return False

    try:
        document_id = document.get("source")
        if not document_id:
            print(f"Document missing a 'source' key, cannot ensure uniqueness. Skipping: {document}")
            return False

        result = collection.update_one(
            {"source": document_id},
            {"$set": document},
            upsert=True  
        )

        if result.upserted_id:
            print(f"Inserted new document from source: {document_id}")
        elif result.modified_count > 0:
            print(f"Updated existing document for source: {document_id}")
        else:
            print(f"Document from source: {document_id} already up-to-date or no changes.")
        return True

    except DuplicateKeyError:
        print(f"Duplicate document found for source: {document.get('source')}. Skipping.")
        return False

    except Exception as e:
        print(f"Error inserting document to MongoDB: {e}")
        return False

# --- Web Scraping Functionality ---

def fetch_web_content(url: str, save_to_file: bool = True) -> Union[Dict[str, str], None]:
    """
    Fetches content from a given URL and extracts main text.
    Returns a dictionary with 'content' and 'source' (URL), and other metadata.
    """
    
    print(f"Fetching content from: {url}")
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        title = soup.title.string if soup.title else url.split('/')[-1]
        sanitized_title = "".join([c for c in title if c.isalnum() or c in (' ', '.', '_')]).strip()
        filename = f"{sanitized_title[:50]}.html"
        filepath = os.path.join(RAW_WEB_DATA_DIR, filename)
        
        if save_to_file:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(response.text)
            print(f"Saved raw HTML to: {filepath}")
            
        main_content = soup.find('div', class_='mw-parser-output')
        if not main_content:
            main_content = soup.find('main', role='main')
        if not main_content:
            main_content = soup.find('article')
        if not main_content:
            main_content = soup.find('body')
            
        text_content = None
        if main_content:
            for script_or_style in main_content(['script', 'style', 'header', 'footer', 'nav', 'aside', 'form', 'img']):
                script_or_style.decompose()
            text_content = main_content.get_text(separator='\n', strip=True)
            text_content = ' '.join(text_content.split())
            
        if text_content:
            return {
                "content": text_content,
                "source": url,
                "type": "web",
                "title": title,
                "collected_at": int(time.time()),
                "raw_html_path": filepath
            }
        else:
            print(f"Could not extract meaningful text content for {url}")
            return None
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred for {url}: {e}")
        return None
    
def collect_web_data(urls: List[str], collection) -> int:
    """
    Collects text content from a list of URLs and inserts into MongoDB.
    Returns the number of documents successfully inserted/updated.
    """
    
    inserted_count = 0
    
    for url in urls:
        document_data = fetch_web_content(url, save_to_file=True)
        if document_data:
            if insert_document_to_mongo(collection, document_data):
                inserted_count += 1
        time.sleep(1)
    return inserted_count

def collect_local_files(directory: str = LOCAL_DOCS_DIR, collection=None) -> int:
    """
    Collects text content from local files and inserts into MongoDB.
    Returns the number of documents successfully inserted/updated.
    """
    inserted_count = 0
    print(f"Collecting local files from: {directory}")
    for root, _, files in os.walk(directory):
        for file in files:
            filepath = os.path.join(root, file)
            print(f"Processing local file: {filepath}")
            loader = None
            
            # Skip hidden files or temporary files
            if file.startswith('.') or file.startswith('~'):
                print(f"Skipping hidden/temp file: {filepath}")
                continue

            if filepath.endswith(".pdf"):
                loader = PyPDFLoader(filepath)
            elif filepath.endswith(".txt"):
                loader = TextLoader(filepath)
            elif filepath.endswith(".docx"):
                loader = Docx2txtLoader(filepath)
            
            if loader:
                try:
                    documents = loader.load()
                    for i, doc in enumerate(documents):
                        doc_to_insert = {
                            "content": doc.page_content,
                            "source": f"{filepath}#page={i+1}" if filepath.endswith(".pdf") else filepath,
                            "type": "local_file",
                            "file_type": filepath.split('.')[-1],
                            "filename": os.path.basename(filepath),
                            "collected_at": int(time.time()),
                            "metadata": doc.metadata 
                        }
                        if insert_document_to_mongo(collection, doc_to_insert):
                            inserted_count += 1
                    print(f"Successfully processed {filepath}")
                except Exception as e:
                    print(f"Error processing {filepath}: {e}")
            else:
                print(f"Skipping unsupported file type: {filepath}")
    return inserted_count

# --- Main Execution ---

def main():
    print("--- Starting Data Collection ---")

    # 1. Get MongoDB Collection
    mongo_collection = get_mongo_collection()
    if mongo_collection is None:
        print("Exiting data collection due to MongoDB connection issues.")
        return

    # 2. Collect Web Data
    print("\nCollecting data from specified URLs...")
    web_inserted_count = collect_web_data(NIGERIAN_HISTORY_URLS, mongo_collection)
    print(f"Successfully inserted/updated {web_inserted_count} web documents in MongoDB.")
    
    # 3. Collect Local File Data
    print(f"\nCollecting data from local directory: {LOCAL_DOCS_DIR}...")
    local_inserted_count = collect_local_files(LOCAL_DOCS_DIR, mongo_collection)
    print(f"Successfully inserted/updated {local_inserted_count} local documents in MongoDB.")

    print(f"\n--- Data Collection Complete ---")
    print(f"Total documents inserted/updated in MongoDB: {web_inserted_count + local_inserted_count}")
    
if __name__ == "__main__":
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        print("python-dotenv not installed. Using default MongoDB URI and names.")
        print("To use .env file, install it: pip install python-dotenv")

    main()
