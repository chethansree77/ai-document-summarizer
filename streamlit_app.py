
import streamlit as st
from pypdf import PdfReader
from google import genai
from dotenv import load_dotenv
import os

load_dotenv()


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


# ==========================================
# GEMINI CLIENT
# ==========================================

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:

    st.error("❌ GEMINI_API_KEY is not set.")

    st.stop()


client = genai.Client(
    api_key=api_key
)


# ==========================================
# UPLOAD DOCUMENT
# ==========================================

uploaded_file = st.file_uploader(
    "📄 Upload your document",
    type=["pdf"]
)


# ==========================================
# STORE DOCUMENT TEXT
# ==========================================

document_text = ""


if uploaded_file:

    try:

        pdf_reader = PdfReader(uploaded_file)

        for page in pdf_reader.pages:

            text = page.extract_text()

            if text:
                document_text += text + "\n"


        if not document_text.strip():

            st.error(
                "❌ Could not extract text from this document."
            )

            st.stop()


        st.success(
            f"✅ Document uploaded: {uploaded_file.name}"
        )

        st.info(
            f"📄 Pages: {len(pdf_reader.pages)}"
        )


    except Exception as e:

        st.error(
            f"❌ Error reading document: {str(e)}"
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


        with st.spinner(
            "✨ Generating summary..."
        ):

            try:

                interaction = client.interactions.create(
                    model="gemini-3.5-flash-lite",
                    input=prompt
                )

                summary = interaction.output_text


                st.subheader(
                    "📋 Document Summary"
                )

                st.write(summary)


            except Exception as e:

                st.error(
                    f"❌ Gemini Error: {str(e)}"
                )


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
        placeholder="e.g., Could you explain the key concepts and requirements discussed in this document?"
    )


    if st.button(
        "🤖 Ask AI",
        key="question_button"
    ):

        if not question.strip():

            st.warning(
                "💬 Please enter a question."
            )

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


            with st.spinner(
                "🔎 Searching the document..."
            ):

                try:

                    interaction = client.interactions.create(
                        model="gemini-3.5-flash-lite",
                        input=question_prompt
                    )

                    answer = interaction.output_text


                    st.subheader(
                        "🤖 AI Answer"
                    )

                    st.write(answer)


                except Exception as e:

                    st.error(
                        f"❌ Gemini Error: {str(e)}"
                    )