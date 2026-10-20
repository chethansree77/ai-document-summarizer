
/* ==========================================
   DOCUMIND AI DOCUMENT SUMMARIZER
   SUMMARY + Q&A + DOWNLOAD + RESET
========================================== */

const documentInput = document.querySelector("#documentInput");
const fileDetails = document.querySelector("#fileDetails");
const fileDetailsName = document.querySelector("#fileDetailsName");
const fileDetailsSize = document.querySelector("#fileDetailsSize");
const fileValidationMessage = document.querySelector("#fileValidationMessage");
const summaryType = document.querySelector("#summaryType");
const summarizeButton = document.querySelector("#summarizeButton");
const summaryBox = document.querySelector("#summaryBox");
const keyPointsBox = document.querySelector("#keyPointsBox");
const questionInput = document.querySelector("#questionInput");
const askButton = document.querySelector("#askButton");
const answerBox = document.querySelector("#answerBox");

const downloadSummaryButton =
    document.querySelector("#downloadSummaryButton");

const downloadReportButton =
    document.querySelector("#downloadReportButton");

const clearButton = document.querySelector("#clearButton");

/* ==========================================
   GENERATED CONTENT
========================================== */

let generatedSummary = "";
let generatedKeyPoints = "";

/* ==========================================
   EMPTY-STATE MESSAGES
========================================== */

const initialSummaryHTML = `
    <div class="empty-answer">
        <div class="empty-icon">▤</div>
        <h4>Your summary starts here</h4>
        <p>Generate a summary to see the main ideas in your PDF.</p>
    </div>
`;

const initialKeyPointsHTML = `
    <div class="empty-answer">
        <div class="empty-icon">☷</div>
        <h4>Your key points appear here</h4>
        <p>Important facts and details will be organized for easy reading.</p>
    </div>
`;

const initialAnswerHTML = `
    <div class="empty-answer">
        <div class="empty-icon">✧</div>
        <h4>Your answer will appear here</h4>
        <p>Upload a document and ask a question to get started.</p>
    </div>
`;

/* ==========================================
   SAFE MARKDOWN FORMATTER
========================================== */

function escapeHTML(text) {
    return String(text ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function formatMarkdown(text) {
    if (!text) {
        return "<p>No content available.</p>";
    }

    let html = escapeHTML(text).replace(/\r\n?/g, "\n");

    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h2>$1</h2>");

    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
    html = html.replace(/_([^_\n]+)_/g, "<em>$1</em>");

    html = html.replace(/\\([\\`*_{}()[\]#+.!|>-])/g, "$1");

    const lines = html.split("\n");
    const output = [];
    let listType = null;

    function closeList() {
        if (listType) {
            output.push(listType === "ol" ? "</ol>" : "</ul>");
            listType = null;
        }
    }

    for (const rawLine of lines) {
        const line = rawLine.trim();

        if (!line) {
            closeList();
            continue;
        }

        const bullet = line.match(/^[-*•]\s+(.+)$/);
        const numbered = line.match(/^\d+[.)]\s+(.+)$/);

        if (bullet || numbered) {
            const nextType = numbered ? "ol" : "ul";

            if (listType !== nextType) {
                closeList();
                output.push(nextType === "ol" ? "<ol>" : "<ul>");
                listType = nextType;
            }

            output.push(
                `<li>${bullet ? bullet[1] : numbered[1]}</li>`
            );
            continue;
        }

        closeList();

        if (/^<h[23]>/.test(line)) {
            output.push(line);
        } else {
            output.push(`<p>${line}</p>`);
        }
    }

    closeList();
    return output.join("\n");
}

/* ==========================================
   DISPLAY HELPERS
========================================== */

function displayFormatted(element, text) {
    if (!element) return;

    element.classList.remove("is-loading");
    element.innerHTML = formatMarkdown(text || "No content available.");
    element.classList.add("content-ready");

    element.style.display = "block";
    element.style.visibility = "visible";
    element.style.opacity = "1";
}

function showLoading(element, message) {
    if (!element) return;

    element.classList.remove("content-ready");
    element.classList.add("is-loading");

    element.innerHTML = `
        <div class="loading-state" role="status" aria-live="polite">
            <span class="loading-spinner" aria-hidden="true"></span>
            <p>${escapeHTML(message)}</p>
            <span class="loading-caption">Please wait a moment...</span>
        </div>
    `;
}

function showMessage(element, message) {
    if (!element) return;

    element.classList.remove("is-loading");
    element.classList.add("content-ready");
    element.textContent = message;

    element.style.display = "block";
    element.style.visibility = "visible";
    element.style.opacity = "1";
}

function setButtonLoading(button, isLoading, loadingText, originalHTML) {
    if (!button) return;

    button.disabled = isLoading;
    button.setAttribute("aria-busy", String(isLoading));

    if (isLoading) {
        button.innerHTML = `
            <span class="button-spinner" aria-hidden="true"></span>
            ${escapeHTML(loadingText)}
        `;
    } else {
        button.innerHTML = originalHTML;
    }
}

/* ==========================================
   DOWNLOAD BUTTON STATE
========================================== */

function updateDownloadButtons() {
    if (downloadSummaryButton) {
        downloadSummaryButton.disabled = !generatedSummary;
    }

    if (downloadReportButton) {
        downloadReportButton.disabled =
            !(generatedSummary && generatedKeyPoints);
    }
}

function resetGeneratedContent() {
    generatedSummary = "";
    generatedKeyPoints = "";
    updateDownloadButtons();
}

/* ==========================================
   CLEAR / RESET
========================================== */

function clearWorkspace() {
    // Do not reset the page while a request is running.
    documentInput.value = "";
    if (fileName) {
    fileName.textContent = "No document selected";
}

if (fileDetails) {
    fileDetails.hidden = true;
}

if (fileDetailsName) {
    fileDetailsName.textContent = "";
}

if (fileDetailsSize) {
    fileDetailsSize.textContent = "";
}

if (fileValidationMessage) {
    fileValidationMessage.textContent = "";
    fileValidationMessage.className = "file-validation-message";
}

    // Clear the selected document.
    documentInput.value = "";
    fileName.textContent = "No document selected";

    // Restore the default summary format.
    summaryType.value = "short";

    // Clear the question input.
    questionInput.value = "";

    // Clear generated text and disable download buttons.
    resetGeneratedContent();

    // Restore initial result panels.
    summaryBox.innerHTML = initialSummaryHTML;
    keyPointsBox.innerHTML = initialKeyPointsHTML;
    answerBox.innerHTML = initialAnswerHTML;

    [summaryBox, keyPointsBox, answerBox].forEach(element => {
        element.classList.remove("is-loading", "content-ready");
        element.style.display = "";
        element.style.visibility = "";
        element.style.opacity = "";
    });

    // Return the page to the document upload area.
    document.querySelector("#uploadSection").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    // Put focus on the file selector for the next document.
    documentInput.focus();

    console.log("DocuMind workspace cleared.");
}

if (clearButton) {
    clearButton.addEventListener("click", clearWorkspace);
}


/* ==========================================
   DOCUMENT SELECTION AND PDF VALIDATION
========================================== */

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function showFileValidation(message, type = "") {
    if (!fileValidationMessage) return;

    fileValidationMessage.textContent = message;
    fileValidationMessage.className = "file-validation-message";

    if (type) {
        fileValidationMessage.classList.add(type);
    }
}

function hideFileDetails() {
    if (fileDetails) fileDetails.hidden = true;
    if (fileDetailsName) fileDetailsName.textContent = "";
    if (fileDetailsSize) fileDetailsSize.textContent = "";

    showFileValidation("");
}

function clearDocumentResults() {
    resetGeneratedContent();

    summaryBox.innerHTML = initialSummaryHTML;
    keyPointsBox.innerHTML = initialKeyPointsHTML;
    answerBox.innerHTML = initialAnswerHTML;

    [summaryBox, keyPointsBox, answerBox].forEach(element => {
        element.classList.remove("is-loading", "content-ready");
        element.style.display = "";
        element.style.visibility = "";
        element.style.opacity = "";
    });
}

function validateSelectedFile(file) {
    if (!file) {
        fileName.textContent = "No document selected";
        hideFileDetails();
        return false;
    }

    if (fileDetails) fileDetails.hidden = false;

    if (fileDetailsName) {
        fileDetailsName.textContent = file.name;
    }

    if (fileDetailsSize) {
        fileDetailsSize.textContent = formatFileSize(file.size);
    }

    const hasPdfExtension = file.name.toLowerCase().endsWith(".pdf");
    const hasPdfType =
        file.type === "" || file.type === "application/pdf";

    if (!hasPdfExtension || !hasPdfType) {
        fileName.textContent = "Invalid document";

        showFileValidation(
            "Please select a PDF file.",
            "error"
        );

        return false;
    }

    if (file.size === 0) {
        fileName.textContent = "Empty document";

        showFileValidation(
            "This file is empty. Please choose another PDF.",
            "error"
        );

        return false;
    }

    if (file.size > MAX_FILE_SIZE) {
        fileName.textContent = "File too large";

        showFileValidation(
            "The PDF exceeds the 20 MB limit. Choose a smaller file.",
            "error"
        );

        return false;
    }

    fileName.textContent = "📄 " + file.name;

    showFileValidation(
        "PDF selected successfully. You can generate your summary.",
        "success"
    );

    return true;
}

documentInput.addEventListener("change", function () {
    const file = documentInput.files[0];

    clearDocumentResults();

    if (!file) {
        fileName.textContent = "No document selected";
        hideFileDetails();
        return;
    }

    if (!validateSelectedFile(file)) {
        documentInput.value = "";
        return;
    }

    console.log("Selected PDF:", file.name);
    console.log("PDF size:", formatFileSize(file.size));
});

/* ==========================================
   SUMMARY TYPE
========================================== */

summaryType.addEventListener("change", function () {
    console.log("Selected summary type:", summaryType.value);
});

/* ==========================================
   GENERATE SUMMARY
========================================== */

summarizeButton.addEventListener("click", async function () {
    const file = documentInput.files[0];

    if (!file) {
        showMessage(summaryBox, "📄 Please upload a document first.");
        documentInput.focus();
        return;
    }

    const originalButtonHTML =
        '<span>✦</span><span>Generate summary</span>' +
        '<span class="button-arrow">→</span>';

    resetGeneratedContent();

    showLoading(
        summaryBox,
        "Reading your document and preparing the summary..."
    );

    showLoading(
        keyPointsBox,
        "Extracting the important points..."
    );

    setButtonLoading(
        summarizeButton,
        true,
        "Generating summary...",
        originalButtonHTML
    );

    const formData = new FormData();
    formData.append("document", file);
    formData.append("summary_type", summaryType.value);

    try {
        const response = await fetch("/summarize", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        console.log("Summary response received:", data);

        if (!response.ok) {
            showMessage(
                summaryBox,
                data.summary || data.error || "Unable to generate summary."
            );

            showMessage(
                keyPointsBox,
                data.key_points || data.error ||
                "Unable to generate key points."
            );

            return;
        }

        generatedSummary = String(data.summary || "").trim();
        generatedKeyPoints = String(data.key_points || "").trim();

        displayFormatted(
            summaryBox,
            generatedSummary || "No summary was generated."
        );

        displayFormatted(
            keyPointsBox,
            generatedKeyPoints || "No key points were generated."
        );

        updateDownloadButtons();

        console.log("Summary and key points displayed.");

    } catch (error) {
        console.error("Summary error:", error);

        resetGeneratedContent();

        showMessage(
            summaryBox,
            "Something went wrong while generating the summary."
        );

        showMessage(keyPointsBox, "Please try again.");

    } finally {
        setButtonLoading(
            summarizeButton,
            false,
            "",
            originalButtonHTML
        );
    }
});

/* ==========================================
   DOWNLOAD SUMMARY AS TXT
========================================== */

if (downloadSummaryButton) {
    downloadSummaryButton.addEventListener("click", async function () {
        if (!generatedSummary) {
            showMessage(summaryBox, "Generate a summary before downloading.");
            return;
        }

        const originalHTML = downloadSummaryButton.innerHTML;

        setButtonLoading(
            downloadSummaryButton,
            true,
            "Preparing download...",
            originalHTML
        );

        try {
            const formData = new FormData();
            formData.append("summary", generatedSummary);

            const response = await fetch("/download-summary", {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(
                    data.error || "Could not download the summary."
                );
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = "document_summary.txt";
            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

        } catch (error) {
            console.error("Summary download error:", error);
            alert(error.message || "Unable to download the summary.");
        } finally {
            setButtonLoading(
                downloadSummaryButton,
                false,
                "",
                originalHTML
            );
        }
    });
}

/* ==========================================
   DOWNLOAD FULL REPORT AS PDF
========================================== */

if (downloadReportButton) {
    downloadReportButton.addEventListener("click", async function () {
        if (!generatedSummary || !generatedKeyPoints) {
            showMessage(
                keyPointsBox,
                "Generate the summary and key points before downloading."
            );
            return;
        }

        const originalHTML = downloadReportButton.innerHTML;

        setButtonLoading(
            downloadReportButton,
            true,
            "Preparing PDF...",
            originalHTML
        );

        try {
            const formData = new FormData();
            formData.append("summary", generatedSummary);
            formData.append("key_points", generatedKeyPoints);

            const response = await fetch("/download-report", {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(
                    data.error || "Could not create the PDF report."
                );
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = "documind_full_report.pdf";
            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

        } catch (error) {
            console.error("PDF download error:", error);
            alert(error.message || "Unable to download the PDF report.");
        } finally {
            setButtonLoading(
                downloadReportButton,
                false,
                "",
                originalHTML
            );
        }
    });
}

/* ==========================================
   FOLLOW-UP QUESTION
========================================== */

askButton.addEventListener("click", async function () {
    const question = questionInput.value.trim();
    const file = documentInput.files[0];

    if (!question) {
        showMessage(answerBox, "💬 Please enter a question.");
        questionInput.focus();
        return;
    }

    if (!file) {
        showMessage(answerBox, "📄 Please upload a document first.");
        documentInput.focus();
        return;
    }

    const originalButtonHTML = 'Ask AI <span>→</span>';

    showLoading(
        answerBox,
        "Finding an answer from your document..."
    );

    setButtonLoading(
        askButton,
        true,
        "Thinking...",
        originalButtonHTML
    );

    const formData = new FormData();
    formData.append("document", file);
    formData.append("question", question);

    try {
        const response = await fetch("/ask", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        console.log("Question response received:", data);

        if (!response.ok) {
            showMessage(
                answerBox,
                data.answer || data.error ||
                "Unable to answer your question."
            );
            return;
        }

        displayFormatted(
            answerBox,
            data.answer || "No answer was generated."
        );

    } catch (error) {
        console.error("Question error:", error);

        showMessage(
            answerBox,
            "Something went wrong while finding the answer."
        );

    } finally {
        setButtonLoading(
            askButton,
            false,
            "",
            originalButtonHTML
        );
    }
});

/* ==========================================
   PRESS ENTER TO ASK
========================================== */

questionInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();

        if (!askButton.disabled) {
            askButton.click();
        }
    }
});

/* ==========================================
   INITIAL STATE
========================================== */

updateDownloadButtons();
