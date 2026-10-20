
import os
from io import BytesIO

from flask import (
    Flask, render_template, request, jsonify,
    send_file
)
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer
)
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch


from dotenv import load_dotenv
from pypdf import PdfReader
from google import genai
from pdf2image import convert_from_bytes
import pytesseract

load_dotenv()

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024  # 20 MB

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

MODEL_NAME = "gemini-3.5-flash-lite"

# OCR tool paths on your Windows computer
TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
POPPLER_PATH = (
    r"C:\Users\surya\Downloads\Release-26.09.0-0"
    r"\poppler-26.09.0\Library\bin"
)


def extract_pdf_text(file_storage):
    """Extract PDF text and use OCR for scanned pages."""
    pdf_bytes = file_storage.read()

    if not pdf_bytes:
        raise ValueError("The uploaded PDF is empty.")

    reader = PdfReader(BytesIO(pdf_bytes))

    if reader.is_encrypted:
        raise ValueError("Password-protected PDFs are not supported.")

    pages = []
    pages_needing_ocr = []

    # Extract selectable text and identify scanned pages.
    for page_number, page in enumerate(reader.pages):
        text = (page.extract_text() or "").strip()
        pages.append(text)

        if not text:
            pages_needing_ocr.append(page_number)

    # OCR only the pages that have no selectable text.
    if pages_needing_ocr:
        if not os.path.isfile(TESSERACT_PATH):
            raise ValueError(
                "Tesseract OCR was not found. "
                "Please check its installation path."
            )

        if not os.path.isdir(POPPLER_PATH):
            raise ValueError(
                "Poppler was not found. Please check its installation path."
            )

        pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

        try:
            images = convert_from_bytes(
                pdf_bytes,
                dpi=200,
                poppler_path=POPPLER_PATH,
                first_page=min(pages_needing_ocr) + 1,
                last_page=max(pages_needing_ocr) + 1
            )

            first_page_number = min(pages_needing_ocr)

            for index, image in enumerate(images):
                page_number = first_page_number + index

                if page_number in pages_needing_ocr:
                    pages[page_number] = (
                        pytesseract.image_to_string(image).strip()
                    )

        except Exception as error:
            raise ValueError(
                f"Could not read scanned PDF pages using OCR: {error}"
            ) from error

    document_text = "\n\n".join(
        text for text in pages if text
    ).strip()

    if not document_text:
        raise ValueError(
            "No readable text was found in this PDF, even after OCR."
        )

    return document_text


def ask_gemini(prompt):
    """Generate a response using the configured Gemini model."""
    if client is None:
        raise RuntimeError(
            "GEMINI_API_KEY is missing. Check your .env file."
        )

    result = client.interactions.create(
        model=MODEL_NAME,
        input=prompt
    )

    answer = getattr(result, "output_text", None)

    if not answer:
        raise RuntimeError("Gemini returned an empty response.")

    return answer.strip()


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/summarize", methods=["POST"])
def summarize():
    uploaded_file = request.files.get("document")
    summary_type = request.form.get(
        "summary_type", "short"
    ).lower()

    if not uploaded_file or not uploaded_file.filename:
        return jsonify({
            "summary": "Please upload a PDF first.",
            "key_points": "No key points available."
        }), 400

    if not uploaded_file.filename.lower().endswith(".pdf"):
        return jsonify({
            "summary": "Please upload a PDF file.",
            "key_points": "No key points available."
        }), 400

    try:
        document_text = extract_pdf_text(uploaded_file)

        if summary_type == "detailed":
            instruction = (
                "Write a detailed, easy-to-understand summary "
                "covering the main topics and important facts."
            )
        elif summary_type == "keypoints":
            instruction = (
                "Write a short overview of the document."
            )
        else:
            instruction = (
                "Write a concise summary in about 4-6 sentences."
            )

        summary_prompt = f"""
You are an AI document summarization assistant.
{instruction}
Use only information from the supplied document.
If information is missing, do not invent it.

DOCUMENT:
{document_text}
"""

        points_prompt = f"""
Extract the most important facts and ideas from this document.
Return 4-8 concise bullet points.
Use only the document's information. Do not invent facts.

DOCUMENT:
{document_text}
"""

        summary = ask_gemini(summary_prompt)
        key_points = ask_gemini(points_prompt)

        return jsonify({
            "summary": summary,
            "key_points": key_points
        })

    except Exception as error:
        app.logger.exception("Document summarization failed")

        return jsonify({
            "summary": f"Unable to generate summary: {error}",
            "key_points": "Unable to generate key points."
        }), 500


@app.route("/ask", methods=["POST"])
def ask():
    uploaded_file = request.files.get("document")
    question = request.form.get("question", "").strip()

    if not uploaded_file or not uploaded_file.filename:
        return jsonify({
            "answer": "Please upload a PDF first."
        }), 400

    if not uploaded_file.filename.lower().endswith(".pdf"):
        return jsonify({
            "answer": "Please upload a PDF file."
        }), 400

    if not question:
        return jsonify({
            "answer": "Please enter a question."
        }), 400

    try:
        document_text = extract_pdf_text(uploaded_file)

        prompt = f"""
You answer questions about an uploaded document.
Use ONLY information in the document.
If the answer is not present, reply:
"I could not find the answer in the uploaded document."
Do not make up information.

DOCUMENT:
{document_text}

QUESTION:
{question}
"""

        answer = ask_gemini(prompt)

        return jsonify({"answer": answer})

    except Exception as error:
        app.logger.exception("Document question failed")

        return jsonify({
            "answer": f"Unable to answer the question: {error}"
        }), 500


@app.errorhandler(413)
def file_too_large(_error):
    message = "The uploaded file is too large. Maximum size is 20 MB."

    return jsonify({
        "summary": message,
        "key_points": "No key points available.",
        "answer": message
    }), 413




@app.route("/download-summary", methods=["POST"])
def download_summary():
    summary = request.form.get("summary", "").strip()

    if not summary:
        return jsonify({"error": "No summary available to download."}), 400

    return send_file(
        BytesIO(summary.encode("utf-8")),
        mimetype="text/plain; charset=utf-8",
        as_attachment=True,
        download_name="document_summary.txt"
    )


@app.route("/download-report", methods=["POST"])
def download_report():
    summary = request.form.get("summary", "").strip()
    key_points = request.form.get("key_points", "").strip()

    if not summary or not key_points:
        return jsonify({
            "error": "Generate a summary and key points first."
        }), 400

    pdf_buffer = BytesIO()
    document = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        rightMargin=0.7 * inch,
        leftMargin=0.7 * inch,
        topMargin=0.7 * inch,
        bottomMargin=0.7 * inch
    )

    styles = getSampleStyleSheet()
    story = [
        Paragraph("DocuMind AI - Document Report", styles["Title"]),
        Spacer(1, 0.25 * inch),
        Paragraph("Document Summary", styles["Heading2"]),
        Spacer(1, 0.1 * inch),
    ]

    for paragraph in summary.splitlines():
        if paragraph.strip():
            story.append(Paragraph(
                paragraph.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"),
                styles["BodyText"]
            ))
            story.append(Spacer(1, 0.08 * inch))

    story.extend([
        Spacer(1, 0.2 * inch),
        Paragraph("Key Takeaways", styles["Heading2"]),
        Spacer(1, 0.1 * inch),
    ])

    for point in key_points.splitlines():
        if point.strip():
            story.append(Paragraph(
                point.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"),
                styles["BodyText"]
            ))
            story.append(Spacer(1, 0.08 * inch))

    document.build(story)
    pdf_buffer.seek(0)

    return send_file(
        pdf_buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name="documind_full_report.pdf"
    )


if __name__ == "__main__":
    app.run(debug=True)
