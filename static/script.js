// ==========================================
// AI DOCUMENT SUMMARIZER
// FRONTEND JAVASCRIPT
// ==========================================


// ==========================================
// GET HTML ELEMENTS
// ==========================================

const documentInput =
    document.querySelector("#documentInput");

const fileName =
    document.querySelector("#fileName");

const summaryType =
    document.querySelector("#summaryType");

const summarizeButton =
    document.querySelector("#summarizeButton");

const summaryBox =
    document.querySelector("#summaryBox");

const keyPointsBox =
    document.querySelector("#keyPointsBox");

const questionInput =
    document.querySelector("#questionInput");

const askButton =
    document.querySelector("#askButton");

const answerBox =
    document.querySelector("#answerBox");


// ==========================================
// DOCUMENT SELECTION
// ==========================================

documentInput.addEventListener(
    "change",
    function () {

        if (documentInput.files.length > 0) {

            const file =
                documentInput.files[0];

            fileName.innerText =
                "📄 " + file.name;

            console.log(
                "Selected document:",
                file.name
            );

        }

    }
);


// ==========================================
// SUMMARY TYPE SELECTION
// ==========================================

summaryType.addEventListener(
    "change",
    function () {

        console.log(
            "Selected summary type:",
            summaryType.value
        );

    }
);


// ==========================================
// GENERATE SUMMARY
// ==========================================

summarizeButton.addEventListener(
    "click",
    async function () {

        // Get uploaded document

        const document =
            documentInput.files[0];


        // Check document

        if (!document) {

            summaryBox.innerText =
                "📄 Please upload a document first.";

            return;

        }


        // Show loading message

        summaryBox.innerText =
            "✨ Preparing your document...";


        keyPointsBox.innerText =
            "Generating key points...";


        // Disable button

        summarizeButton.disabled = true;

        summarizeButton.innerText =
            "Processing...";


        // Create FormData

        const formData =
            new FormData();


        // Add document

        formData.append(
            "document",
            document
        );


        // Add summary type

        formData.append(
            "summary_type",
            summaryType.value
        );


        console.log(
            "Document:",
            document.name
        );

        console.log(
            "Summary type:",
            summaryType.value
        );


        // ======================================
        // SEND TO FLASK
        // ======================================

        try {

            const response =
                await fetch(
                    "/summarize",
                    {
                        method: "POST",
                        body: formData
                    }
                );


            const data =
                await response.json();


            // Display summary

            summaryBox.innerText =
                data.summary ||
                "No summary was generated.";


            // Display key points

            keyPointsBox.innerText =
                data.key_points ||
                "No key points were generated.";


        }

        catch (error) {

            console.error(
                "Error:",
                error
            );


            summaryBox.innerText =
                "❌ Something went wrong.";

            keyPointsBox.innerText =
                "Unable to generate key points.";

        }


        // Enable button again

        summarizeButton.disabled = false;

        summarizeButton.innerText =
            "✨ Generate Summary";

    }
);


// ==========================================
// FOLLOW-UP QUESTION
// ==========================================

askButton.addEventListener(
    "click",
    async function () {

        const question =
            questionInput.value.trim();


        // Check question

        if (!question) {

            answerBox.innerText =
                "💬 Please enter a question.";

            questionInput.focus();

            return;

        }


        // Check document

        const document =
            documentInput.files[0];

        if (!document) {

            answerBox.innerText =
                "📄 Please upload a document first.";

            return;

        }


        // Show loading

        answerBox.innerText =
            "✨ Finding the answer...";


        askButton.disabled = true;

        askButton.innerText =
            "Thinking...";


        // Create FormData

        const formData =
            new FormData();


        formData.append(
            "document",
            document
        );


        formData.append(
            "question",
            question
        );


        // ======================================
        // SEND QUESTION TO FLASK
        // ======================================

        try {

            const response =
                await fetch(
                    "/ask",
                    {
                        method: "POST",
                        body: formData
                    }
                );


            const data =
                await response.json();


            answerBox.innerText =
                data.answer ||
                "No answer was generated.";

        }

        catch (error) {

            console.error(
                "Error:",
                error
            );


            answerBox.innerText =
                "❌ Something went wrong.";

        }


        // Reset button

        askButton.disabled = false;

        askButton.innerHTML =
            'Ask AI <span>➜</span>';

    }
);


// ==========================================
// PRESS ENTER TO ASK
// ==========================================

questionInput.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Enter") {

            askButton.click();

        }

    }
);