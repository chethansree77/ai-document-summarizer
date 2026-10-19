
import streamlit as st
from pypdf import PdfReader
from google import genai
from dotenv import load_dotenv
from pdf2image import convert_from_bytes
from pdf2image.exceptions import (
    PDFInfoNotInstalledError,
    PDFPageCountError,
)
import pytesseract
import os

load_dotenv()


# ==========================================
# CONFIGURATION
# ==========================================

TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

POPPLER_PATH = (
    r"C:\Users\surya\Downloads\Release-26.09.0-0"
    r"\poppler-26.09.0\Library\bin"
)

# Tell Python where the Tesseract program is installed.
pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH


# ==========================================
# PAGE CONFIGURATION
# ==========================================

st.set_page_config(
    page_title="AI Document Summarizer",
    page_icon="📄",
    layout="wide"
)


# ==========================================
# TITLE
# ==========================================

st.title("📄 AI Document Summarizer")

st.write(
    "Upload a document, generate a summary, "
    "and ask questions about your document."
)

st.info(
    "📄 Text-based PDFs are extracted directly. "
    "Scanned PDFs are processed using OCR."
)


# ==========================================
# GEMINI CLIENT
# ==========================================

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    st.error("❌ GEMINI_API_KEY is not set.")
    st.stop()

client = genai.Client(api_key=api_key)


# ==========================================
# UPLOAD DOCUMENT
# ==========================================

uploaded_file = st.file_uploader(
    "📄 Upload your PDF document",
    type=["pdf"],
    help="Only PDF files are supported."
)


# ==========================================
# EXTRACT TEXT / OCR
# ==========================================

document_text = ""

if uploaded_file:
    try:
        # Read the uploaded PDF using its bytes.
        pdf_bytes = uploaded_file.getvalue()

        # First, try normal text extraction.
        from io import BytesIO

        pdf_reader = PdfReader(BytesIO(pdf_bytes))

        extracted_pages = []

        for page in pdf_reader.pages:
            page_text = page.extract_text() or ""
            extracted_pages.append(page_text.strip())

        document_text = "\n\n".join(
            text for text in extracted_pages if text
        ).strip()

        # If no selectable text exists, try OCR.
        if not document_text:
            st.warning(
                "🔎 No selectable text found. "
                "Trying OCR on the scanned PDF..."
            )

            with st.spinner(
                "📖 Converting PDF pages and reading text with OCR..."
            ):
                images = convert_from_bytes(
                    pdf_bytes,
                    dpi=200,
                    poppler_path=POPPLER_PATH
                )

                ocr_pages = []

                for page_number, image in enumerate(images, start=1):
                    page_text = pytesseract.image_to_string(
                        image,
                        lang="eng"
                    ).strip()

                    if page_text:
                        ocr_pages.append(
                            f"Page {page_number}:\n{page_text}"
                        )

                document_text = "\n\n".join(ocr_pages).strip()

                if document_text:
                    st.success(
                        "✅ OCR completed! Text was extracted "
                        "from the scanned PDF."
                    )

        # Stop if both normal extraction and OCR find no text.
        if not document_text:
            st.error(
                "❌ No readable text was found in this PDF, "
                "even after OCR. The PDF may contain only images, "
                "or the text may be too unclear to recognize."
            )
            st.stop()

        st.success("✅ Document text extracted successfully.")

    except PDFInfoNotInstalledError:
        st.error(
            "❌ Poppler could not be found. Check POPPLER_PATH "
            "and make sure pdfinfo.exe and pdftoppm.exe are present."
        )
        st.stop()

    except PDFPageCountError:
        st.error(
            "❌ Could not determine the PDF page count. "
            "Please check whether the PDF is valid or password-protected."
        )
        st.stop()

    except pytesseract.TesseractNotFoundError:
        st.error(
            "❌ Tesseract OCR was not found. Check TESSERACT_PATH."
        )
        st.stop()

    except Exception as e:
        st.error(
            "❌ Unable to process this PDF. "
            "Check that it is a valid, uncorrupted PDF.\n\n"
            f"Technical details: {e}"
        )
        st.stop()


# ==========================================
# SUMMARY SECTION
# ==========================================

if uploaded_file:

    st.divider()
    st.header("📝 Generate Summary")

    summary_type = st.selectbox(
        "Select Summary Type",
        [
            "Short Summary",
            "Detailed Summary",
            "Key Points"
        ]
    )

    if st.button(
        "✨ Generate Summary",
        key="summary_button"
    ):

        if summary_type == "Short Summary":
            instruction = """
Create a short and clear summary of this document.

Keep it around 4-6 sentences.

Focus only on the most important information.
"""

        elif summary_type == "Detailed Summary":
            instruction = """
Create a detailed but easy-to-understand summary
of this document.

Explain the major topics and important information clearly.
"""

        else:
            instruction = """
Extract the most important points from this document.

Return the result as a clear bullet-point list.
"""

        prompt = f"""
You are an AI document summarization assistant.

{instruction}

IMPORTANT:
Use only the information contained in the document.

Document:

{document_text}
"""

        with st.spinner("✨ Generating summary..."):
            try:
                interaction = client.interactions.create(
                    model="gemini-3.5-flash-lite",
                    input=prompt
                )

                summary = interaction.output_text

                st.subheader("📋 Document Summary")
                st.write(summary)

            except Exception as e:
                st.error(f"❌ Gemini Error: {str(e)}")


# ==========================================
# ASK QUESTIONS SECTION
# ==========================================

if uploaded_file:

    st.divider()
    st.header("💬 Ask About Your Document")

    st.write(
        "Ask a question and Gemini will answer using the uploaded document."
    )

    question = st.text_input(
        "Enter your question",
        placeholder=(
            "e.g., Could you explain the key concepts "
            "and requirements discussed in this document?"
        )
    )

    if st.button("🤖 Ask AI", key="question_button"):

        if not question.strip():
            st.warning("💬 Please enter a question.")

        else:
            question_prompt = f"""
You are an AI assistant that answers questions
about an uploaded document.

Use ONLY the information contained in the document.

If the answer cannot be found in the document,
say:

"I could not find the answer in the uploaded document."

Do not make up information.

DOCUMENT:

{document_text}

USER QUESTION:

{question}
"""

            with st.spinner("🔎 Searching the document..."):
                try:
                    interaction = client.interactions.create(
                        model="gemini-3.5-flash-lite",
                        input=question_prompt
                    )

                    answer = interaction.output_text

                    st.subheader("🤖 AI Answer")
                    st.write(answer)

                except Exception as e:
                    st.error(f"❌ Gemini Error: {str(e)}")
