# 📄 AI Document Summarizer

An AI-powered application that helps users summarize PDF documents and ask questions about their content using Generative AI.

## ✨ Features

- Upload and read PDF documents.
- Generate AI-powered summaries using the Google Gemini API.
- Ask questions about uploaded PDF content.
- Extract text from scanned PDFs using Optical Character Recognition (OCR).
- Support for text-based and scanned PDF documents.
- Use a Streamlit interface for document summarization and question answering.
- Include a Flask web application for document summarization.
  
## 🛠️ Technologies Used

- Python
- Streamlit
- Google Gemini API
- PyPDF
- Flask

## 📁 Project Structure

```text
ai_document_summarizer/
├── streamlit_app.py
├── app.py
├── requirements.txt
├── templates/
├── static/
└── .gitignore
```

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd ai_document_summarizer
```

### 2. Create and activate a virtual environment

On Windows PowerShell:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure the Gemini API key

Create a `.env` file in the project root and add:

```text
GEMINI_API_KEY=your_gemini_api_key_here
```

Replace the placeholder with your own API key. Never upload your real `.env` file to GitHub.

### 5. Run the Streamlit application

```bash
python -m streamlit run streamlit_app.py
```

## 🔐 Security

Store API keys in environment variables and keep secret files out of version control.

## 👩‍💻 Author

Chethana Sai Sree

[GitHub Profile](https://github.com/chethansree77)


## 🖥️ Application Screenshots

### 1. Application Homepage

![AI Document Summarizer homepage](screenshots/app-home.png)

### 2. Generated Document Summary

![AI-generated document summary](screenshots/summary-result.png)

### 3. Document Question and Answer

![Document question and answer feature](screenshots/question-answer.png)

### 4. OCR Text Extraction from a Scanned PDF

![OCR successfully extracting text from a scanned PDF](screenshots/ocr-result.png)

### 5. AI Summary of a Scanned PDF

![AI-generated summary of OCR-extracted document text](screenshots/ocr-summary-result.png)

