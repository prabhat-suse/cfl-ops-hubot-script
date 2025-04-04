// ==UserScript==
// @name         CFL Ops HuBot
// @version      1
// @description  CFL Ops HuBot is a simple chatbot designed to help users understand SUSE’s CFL Operations Hub documentation. It answers questions about process documentation by providing clear summaries and detailed explanations in an easy, interactive way.
// @author       prabhat
// @match        https://sites.google.com/suse.com/cfl-operations-hub*
// @connect      generativelanguage.googleapis.com
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @downloadURL  https://github.com/prabhat-suse/cfl-ops-hubot-script/raw/refs/heads/main/cfl_hubot.user.js
// @updateURL    https://github.com/prabhat-suse/cfl-ops-hubot-script/raw/refs/heads/main/cfl_hubot.user.js
// ==/UserScript==

(function() {
    'use strict';

    // 1. Set Gemini API key
    let apiKey = GM_getValue('geminiApiKey') || 'AIzaSyCdnraAxMGfuJe5mYjQvG2tjMk75-xcV4Y';
    if (!GM_getValue('geminiApiKey')) {
        GM_setValue('geminiApiKey', apiKey); // Store it for future use
    }
    console.log('Using API Key:', apiKey);


 // 2. Add chat UI with a toggle button
    const chatContainer = document.createElement('div');
    chatContainer.innerHTML = `
        <div id="chatbot-container" style="position: fixed; bottom: 20px; right: 20px; z-index: 1000;">
        <!-- Chatbot Button -->
        <button id="chatbot-toggle-btn" style="background-color: #30ba78; color: white; border: none; border-radius: 50%; width: 60px; height: 60px; font-size: 30px; cursor: pointer; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1); display: flex; align-items: center; justify-content: center;">
            🤖
        </button>
        <!-- Chatbox (initially hidden, increased size) -->
        <div id="chatbox" style="display: none; width: 430px; height: 550px; border: 1px solid #ddd; background-color: #efefef; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1); flex-direction: column; border-radius: 10px; font-family: 'SUSE', sans-serif; font-size: 18px;">
            <div id="chatbox-header" style="background-color: #30ba78; color: white; padding: 10px; border-top-left-radius: 10px; border-top-right-radius: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 18px;">
                <strong>CFL Ops HuBot</strong>
                <button id="chatbox-close-btn" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">✖</button>
            </div>
            <div id="chatbox-body" style="flex: 1; overflow-y: scroll; padding: 10px; border-bottom: 1px solid #ddd; font-size: 18px;"></div>
            <textarea id="chatbox-input" style="width: 100%; padding: 10px; box-sizing: border-box; resize: none; height: 70px; max-height: 80px; overflow-y: auto; border: none; outline: none; border-bottom-left-radius: 10px; border-bottom-right-radius: 10px; font-size: 18px;" placeholder="Ask me something..."></textarea>
        </div>
    </div>
    `;
    document.body.appendChild(chatContainer);

    // Add SUSE font from Google Fonts
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=SUSE:wght@400;700&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    // Add CSS for the pulsing animation
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        #chatbot-toggle-btn {
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(styleElement);

    // Toggle chatbox visibility
    const chatbox = document.getElementById('chatbox');
    const toggleBtn = document.getElementById('chatbot-toggle-btn');
    const closeBtn = document.getElementById('chatbox-close-btn');

    toggleBtn.addEventListener('click', () => {
        chatbox.style.display = 'flex'; // Show chatbox
        toggleBtn.style.display = 'none'; // Hide button
    });

    closeBtn.addEventListener('click', () => {
        chatbox.style.display = 'none'; // Hide chatbox
        toggleBtn.style.display = 'flex'; // Show button
    });

    // 3. Handle user input (show thinking dots immediately)
    const inputField = document.getElementById('chatbox-input');
    inputField.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && inputField.value.trim() !== '' && !event.shiftKey) {
            event.preventDefault();
            const userMessage = inputField.value.trim();
            inputField.value = '';
            addMessageToChat('User', userMessage);

            // Show thinking dots immediately
            const chatboxBody = document.getElementById('chatbox-body');
            const messageElement = document.createElement('div');
            messageElement.innerHTML = `<strong style="color: #0c322c">HuBot</strong>: `;
            messageElement.style.marginBottom = '10px';
            chatboxBody.appendChild(messageElement);

            const dots = document.createElement('span');
            dots.textContent = '•••';
            dots.style.color = '#0c322c';
            messageElement.appendChild(dots);
            chatboxBody.scrollTop = chatboxBody.scrollHeight;

            // Fetch response from Gemini API
            getGeminiResponse(userMessage).then(botResponse => {
                // Remove dots and start typing
                dots.remove();
                let i = 0;
                const typingSpeed = 15; // Speed in milliseconds per character

                function typeCharacter() {
                    if (i < botResponse.length) {
                        messageElement.innerHTML = `<strong style="color: #0c322c">HuBot</strong>: <span style="color: #0c322c">${botResponse.substring(0, i + 1)}</span>`;
                        i++;
                        setTimeout(typeCharacter, typingSpeed);
                    } else {
                        chatboxBody.scrollTop = chatboxBody.scrollHeight;
                    }
                }

                typeCharacter();
            }).catch(error => {
                dots.remove();
                messageElement.innerHTML = `<strong style="color: #0c322c">HuBot</strong>: <span style="color: #0c322c">Oops, something went wrong! Check the console for details.</span>`;
                console.error('Error details:', error);
                chatboxBody.scrollTop = chatboxBody.scrollHeight;
            });
        }
    });

    // 4. Display messages in the chatbox
    function addMessageToChat(sender, message) {
        const chatboxBody = document.getElementById('chatbox-body');
        const messageElement = document.createElement('div');
        messageElement.innerHTML = `<strong style="color: #0c322c">${sender}</strong>: <span style="color: #0c322c">${message}</span>`;
        messageElement.style.marginBottom = '10px';
        chatboxBody.appendChild(messageElement);
        chatboxBody.scrollTop = chatboxBody.scrollHeight;
    }

    // 5. Simulate typing effect (not used anymore, but keeping for reference)
    function simulateTyping(sender, message) {
        const chatboxBody = document.getElementById('chatbox-body');
        const messageElement = document.createElement('div');
        messageElement.innerHTML = `<strong style="color: #0c322c">${sender}</strong>: `;
        messageElement.style.marginBottom = '10px';
        chatboxBody.appendChild(messageElement);

        // Add "thinking" dots
        const dots = document.createElement('span');
        dots.textContent = '•••';
        dots.style.color = '#0c322c';
        messageElement.appendChild(dots);

        // Simulate thinking delay
        setTimeout(() => {
            dots.remove(); // Remove thinking dots
            let i = 0;
            const typingSpeed = 15; // Speed in milliseconds per character

            function typeCharacter() {
                if (i < message.length) {
                    messageElement.innerHTML = `<strong style="color: #0c322c">${sender}</strong>: <span style="color: #0c322c">${message.substring(0, i + 1)}</span>`;
                    i++;
                    setTimeout(typeCharacter, typingSpeed);
                } else {
                    chatboxBody.scrollTop = chatboxBody.scrollHeight;
                }
            }

            typeCharacter();
        }, 500); // 1 second thinking delay before typing starts
    }

    // 6. Fetch response from Gemini API with site-specific context
    function getGeminiResponse(userQuery) {
        return new Promise((resolve, reject) => {
            // Include the site content in the prompt
            const prompt = `
            You’re a friendly assistant named HuBot, working for SUSE’s CFL Operations Hub. Your primary goal is to provide accurate answers about question asked related to the documentation at SUSE by first referring to the following documentation from the CFL Operations Hub site. If the user’s query can be answered using the documentation, always use it to provide an accurate response but at first give response to give basic understanding to the user about the query and if the response need in bullet points(like steps question or list items question) then you can give response in bullet points. Only if user asks more details then you can give response with details and explanation. When providing lists (e.g., email contacts), format them as plain text with each item on a "new line", using a simple dash (-) as a bullet point, and avoid using Markdown syntax like * or ** since the output will not be rendered as Markdown. If the query is unrelated to the documentation or the documentation lacks the necessary information, you may use your knowledge to answer the question naturally, without any restrictions on the topic. If the query is unclear, ask for clarification. Whenever user say hi/hello response should friendly one liner greet for example 'Hi there! How can I help you today regarding SUSE's CFL Operations Hub documentation?' or anything similar, but don't include this when you are responding to the users questions.

            Documentation:
            ${siteContent}

            User Query: ${userQuery}
            `;

            const requestUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            const requestData = JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
            });

            console.log('Request URL:', requestUrl);
            console.log('Request Data:', requestData);

            GM_xmlhttpRequest({
                method: 'POST',
                url: requestUrl,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: requestData,
                onload: function(response) {
                    try {
                        console.log('Raw API response:', response.responseText);
                        const result = JSON.parse(response.responseText);
                        if (result.error) {
                            throw new Error(`API Error: ${result.error.message}`);
                        }
                        const reply = result.candidates[0].content.parts[0].text;
                        resolve(reply);
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: function(error) {
                    reject(new Error(`Network error: ${error}`));
                }
            });
        });
    }

    // 7. Hardcode site-specific documentation content
    const siteContent = `
Revenue Recognition
Overview
This section provides a clear and comprehensive explanation of revenue recognition and its application at SUSE. It serves as a guide for team members, detailing the fundamental accounting principle of revenue recognition, why it's crucial for accurate financial reporting, and how SUSE implements it. Specifically, this section covers what revenue recognition is, SUSE's specific revenue recognition policies and examples, the importance of accurate revenue recognition for financial transparency and compliance, and the tools and processes used at SUSE to ensure proper implementation. The goal is to equip team members with the knowledge and resources necessary to understand and apply SUSE's revenue recognition policies effectively.

Revenue Recognition: the process of recognizing the income earned from the sale of goods or services in the company's financial statements. This ensures that income is recorded in the correct accounting period, providing a clear and accurate data of the company’s financial performance.

Importance of Revenue Recognition
- Accurate Financial Reporting: Accurate financial reporting, achieved through consistent revenue recognition, enables comparability across companies and industries for informed decision-making.
- Strategic Decision Making: Accurate revenue recognition ensures reliable financial statements, enabling informed business decisions, improved financial forecasting, and effective cash flow management.
- Avoiding Legal Issues: Aligning with standards helps businesses avoid penalties, maintain compliance, and uphold credibility with regulators and avoid any legal issues.
- Investor Confidence: Transparent accounting ensures accurate financial reporting, building investor trust by showcasing financial health and reliability. This trust can lead to increased investment and higher stock valuation.
- Earn Customer Trust: Accurate revenue recognition gives stakeholders a clear picture of a company's performance and profitability. This transparency builds trust and empowers customers to make well-informed decisions.

Core Phases of Revenue Recognition
Revenue recognition is achieved through three core phases: Booking, Delivery of Service, and Completion of Service. These phases ensure accurate tracking and compliance.
(Booking → Delivery of Services → Completion of Services)

Booking
The phase where a service and product is booked on an agreed Statement of Work (SOW) or Contract.
Bookings signify the customer’s formal agreement to proceed, documented as Total Contract Value (TCV) or Annual Contract Value (ACV).
E.g., A customer commits to 50 consulting hours at $2,000/hour. The total value is $100,000, recorded as a booking.

Delivery of Service
The phase where the actual service or product is provided to the customer as a premium support, consulting, or product subscriptions.
E.g., Out of the 50 consulting hours booked, 10 hours are delivered in January. This delivery is updated in the system.

Completion of Service
The final phase where the service or product delivery is validated and considered complete as per the SOW/Contract.
Revenue is recognized based on the services completed, following IFRS 15 guidelines.
E.g., After all 50 consulting hours are delivered, the total revenue of $100,000 is fully recognised.

Invoiced Revenue:
Invoiced Revenue is the amount a company bills a customer for products or services provided, and this cannot be recognised until it is delivered to the customer. It is an indication of future cash flow.
E.g., Customer may be invoiced for a consulting project, but revenue will only be recognized over the duration of the project, as the consulting work is completed.

Recognised Revenue:
Recognised revenue is the earned amount that has been officially recorded when the goods or services are completed or delivered to the customer.
E.g., If a customer books 50 consulting hours but only 10 hours have been delivered, only for those 10 hours are recognised as revenue.

Revenue Recognition Process at SUSE
SUSE's revenue recognition process is governed by IFRS 15, which dictates that revenue is recognized when goods or services are transferred to the customer at the transaction price. There are two kinds of revenue that can be recognized at SUSE: Consulting Revenue and Premium Revenue.

Consulting Revenue:
Consulting Revenue is classified under two scenarios: In-Arrears Consulting and Prepaid Consulting.

In-Arrear Consulting:
Revenue is recognized only after the successful delivery of services. Consulting hours are delivered which gets invoiced and then revenue is recognized.
Process Flow:
Consulting Delivery → Proof of Delivery → Invoicing → Revenue Recognition
E.g., Customer commits to 50 consulting hours at $2,000/hour. If 10 hours are delivered in January, $20,000 is recognised for that month.

Prepaid Consulting:
Revenue is recognized as the service is delivered, typically in tandem with invoicing. The revenue team will only recognize the revenue once the service has been delivered.
Prepaid consulting is further categorized into:
- Prepaid SOW (Statement of Work)
- Prepaid SKU (Standardized service offering)
Differences: For Prepaid SOW, a request is sent to Finance to invoice the project with the attached SOW and processing form, whereas for Prepaid SKU, the process remains the same but without the finance request step.
Process Flow:
Invoicing → Consulting Delivery → Proof of Delivery → Revenue Recognition
E.g., Customer pays for 50 consulting hours upfront. If 10 hours are delivered in January, $20,000 is recognised for that month.

Premium Support Revenue:
This Revenue generated from providing premium support to the customers.
This Revenue recognition follows a monthly prorated model, that means divided proportionally over the subscription contract period.
E.g., A customer buys a one-year premium support service for $130,000 in January, with the service starting on February 1st, revenue will recognize $10,833 per month starting on February 2nd. If a customer buys a three-year premium support contract for $390,000 in January, with the service also starting on February 1st, the company will recognize $10,833 each month over the course of 36 months.

Invoicing
Invoicing is a critical step in the revenue recognition process, ensuring that SUSE accurately bills customers for delivered services. While invoicing is generally handled by the Finance team, our Ops Hub team is specifically responsible for submitting invoicing requests in two specific cases: In-Arrears Consulting and Prepaid SOW.

Scope of Invoicing in Revenue Recognition
Our team is involved in invoicing for the following revenue recognition scenarios:

In-Arrears Consulting:
Invoicing is requested multiple times throughout the project, after each phase of service delivery.
Consulting services are delivered first, and only after successful completion and customer acknowledgment do we submit an invoice request to Finance with approved timesheet and processing form for the delivered hours.
Revenue is recognized only for the portion of services that have been delivered and invoiced.

Prepaid SOW:
Invoicing is requested only once at the time of project booking.
When a new prepaid SOW project is booked, our team submits an invoice request to Finance along with the signed SOW, PO, and processing form before any service delivery occurs.
Once the invoice is processed, revenue is recognized progressively as services are delivered same as Prepaid SKU.

EMEA Revenue Recognition Process (Prepaid SKU & Prepaid SKU)
Project Booking and Execution
Step 1. Project Booking
The process begins when the Project gets booked with a defined scope, timeline, contract value, etc.
Step 2. Project Execution
After booking, assigned consultants begin delivering tasks and log billable hours in Clarizen.
The Project Manager verifies the approved hours and obtains customer acknowledgment (--specific region--) in the timesheet.

Receiving and Preparing Timesheet Data
Step 3. Receive Email from Project Manager
The process begins when the Project Manager sends an email with an attached timesheet.
Step 4. Download the Timesheet
Download the timesheet and review details such as project name, customer details, and consulting hours.

Accessing Project Details
Step 5. Open Clarizen for Project Information
Access Clarizen to retrieve project details based on the information from the timesheet.
Open Clarizen > Global Search
Step 6. Open Salesforce for Invoice Number
Log in to Salesforce and note the invoice number associated with the same project.

Updating Revenue Recognition File
Step 7. Navigate to CFL Operations and Analytics Drive
Go to CFL Operations and Analytics shared drive.
Select the EMEA folder.
Choose the appropriate financial year and quarter.
Open or create the Revenue Recognition file for the selected period.
Step 8. Update Respective Columns in the Revenue Recognition File
- Invoice Number from Salesforce.
- Customer Details, Billable Hours from the timesheet.
- Hourly Rate (calculated by dividing contract value from Clarizen by total hours).

Storing Timesheet for Documentation
Step 9. Navigate to SUSE Services Drive
Access the Consulting Request folder in the SUSE Services Drive.
Select the respective geo.
Choose the region based on the project.
Open the customer folder associated with the project.
Step 10. Create Revenue Recognition Folder
Inside the customer folder, create a new folder named using the Revenue Recognition Date in the following format: REV REC (Month & Date), e.g., "REV REC FEB14".
Step 11. Upload Timesheet for Reference
Upload the downloaded timesheet into the newly created folder for documentation and future reference.

Update the Revenue Forecast
Step 12. Update the Revenue Forecast Google Sheet
Go to the FY24/25 Services Forecasting Documents Drive, select relevant FY folder, EMEA folder, and Quarter folder.
Open the Revenue Forecasting sheet, and update details for the respective customer such as delivered hours, amount & status, as per the timesheet.

Sending Acknowledgment
Step 13. Send Email to Finance Team
Compose an email to the Finance team (to Rostant Hermond Kamgang He) with the Revenue Recognition details.
Email: rostanthermond.kamganghe@suse.com
Attach both the timesheet and the Revenue Recognition file to the email.
Step 14. Acknowledge Project Manager
Send an acknowledgment email to the Project Manager confirming that the revenue recognition request has been processed.

EMEA In-Arrears Revenue Recognition Process
Project Booking and Execution
Step 1. Project Booking
The process begins when the Project Booking with a defined scope, timeline, contract value, etc.
Step 2. Project Execution
Post Booking, assigned consultants start delivering the tasks and log the billable hours in Clarizen.
Project Manager verifies the approved hours, and seeks customer acknowledgment (--specific region--) in the timesheet.

Receiving and Preparing Timesheet Data
Step 3. Receive Email from Project Manager
The Project Manager sends an email with an attached approved timesheet by the customer.
Step 4. Download the Timesheet
Review the details like project name, customer details, consulting hours, etc.

Locate the Project Folder in Google Drive
Step 5. Access the Services Folder in Shared Drive
Navigate to the SUSE Services folder, locate and open Consulting Request folder.
Step 6. Open the Geo-Specific Folder
Within the Consulting Request folder, search and open Geo-Specific folder based on the customer's region (e.g., EMEA, APAC, etc.).
Step 7. Select Region and Customer Folder
After opening the region folder (e.g., EMEA), select the subfolder for the specific region (e.g., North, South).
Within the region folder, search and open the folder specific for the specific customer.

Create and Organize the Revenue Recognition Files
Step 8. Create a New Folder for the Revenue Recognition
Inside the customer folder, create a new folder named using Revenue Recognition Date. Format REV REC (Month & Date), for e.g., "REV REC DEC28".
Step 9. Copy the Processing File
Copy the relevant processing file from the existing Folder for the same customer and paste it into the newly created folder.

Fill in the Revenue Recognition Processing Form
Step 10. Rename and Edit the Processing Form
Rename and open the processing form in the newly created folder and fill the relevant details according to the timesheet (Financial year, consulting hours, etc.).
Step 11. Upload the Timesheet
Upload the downloaded timesheet into the same folder for reference and documentation.

Update the Revenue Forecast
Step 12. Update the Revenue Forecast Google Sheet
Go to the FY24/25 Services Forecasting Documents Drive, select relevant FY folder, GEO folder, and Quarter folder.
Open the Revenue Forecasting sheet, and update details for the respective customer, as per the timesheet and processing form.

Communication and Submission
Step 13. Submit Revenue Recognition Information to Revenue Team
Send an email to the EMEA finance consulting team with attached Timesheet and Completed Processing Form.
Email: emeafinanceconsulting@suse.com and cc Rostant (rostanthermond.kamganghe@suse.com)
Step 14. Acknowledge the Project Manager
Send an Acknowledgement email to the Project Manager to confirm that the Revenue Recognition Request has been processed.

AMS Revenue Recognition Process
Extracting and Preparing Data from Clarizen
Step 1. Access Clarizen Reports
Open Clarizen and navigate to Reports > Global Folder.
Locate and open REV REC REQ Report.
In the filter dialog box, set <Timesheet>.ReportedDate to non-blank and click Run.
Step 2. Export Report from Clarizen
In the report, go to Export and download it as an Excel file.
In the export dialog box, check: 'Split values and units for duration fields' and 'Convert all duration fields to hours' then click on Generate.

Filtering and Preparing Data
Step 3. Filter the Exported Data
Open the exported Excel file and filter data using these criteria in the columns:
- Reported By: Select consultants/PMs from AMS region (refer to Project Planning in Clarizen for names).
- Work Item: Filter to 'Project Billable' only.
- Project: Exclude PTAS and PES projects.
- Reported Date: Filter for the duration that requires revenue recognition.
- Perform AutoSum for all hours in the Duration column.

Preparing Revenue Recognition Request
Step 4. Create Revenue Recognition Sheet
Access the AMS REV REC Drive & navigate to the relevant Financial Year (FY) folder.
Create a new Revenue Request Sheet using the existing processed sheet.
Rename the file in the format: REV REC REQ SUSE - Month YYYY - First Half/Second Half (e.g., REV REC REQ SUSE - March 2025 - First Half).
Step 5. Update Revenue Recognition Sheet
Open the REV REC Sheet, which contains two subsheets: 'Billable Hours' & 'Requests'.
Copy and paste the filtered data into the Billable Hours subsheet.
In the Requests subsheet, using filtered data and Clarizen, update the following:
- Customer
- Billable Hours
- Hourly Rate

Submitting the Revenue Recognition Request
Step 6. Share the Revenue Recognition Request Sheet
Send the Revenue Rec Req Sheet to:
- Bryce Christiansen - bryce.christiansen@suse.com
- Shelby Park - shelby.park@suse.com

Updating Forecasting Sheet
Step 7. Update the Revenue Forecast Google Sheet
Go to the FY24/25 Services Forecasting Documents Drive, select relevant FY folder, LATAM/NA folder, and Quarter folder.
Open the Revenue Forecasting sheet, and update details for the respective customer such as delivered hours, amount & status, as per the Clarizen.

AMS In-Arrears Revenue Recognition Process
Extracting and Preparing Data from Clarizen
Step 1. Access Clarizen Reports
Open Clarizen and navigate to Reports > Global Folder.
Locate and open REV REC REQ Report.
In the filter dialog box, set <Timesheet>.ReportedDate to non-blank and click Run.
Step 2. Export Report from Clarizen
In the report, go to Export and download it as an Excel file.
In the export dialog box, check: 'Split values and units for duration fields' and 'Convert all duration fields to hours' then click on Generate.

Filtering and Preparing Data
Step 3. Filter the Exported Data
Open the exported Excel file and filter data using these criteria in the columns:
- Reported By: Select consultants/PMs from AMS region (refer to Project Planning in Clarizen for names).
- Work Item: Filter to 'Project Billable' only.
- Project: Select only "(In Arrears)" projects.
- Reported Date: Filter for the duration that requires revenue recognition.
- Perform AutoSum for all hours in the Duration column.

Creating In Arrears Booking Request
Step 4. Create In Arrears Booking Request Sheet
Access the AMS REV REC Drive & navigate to the In Arrears folder.
Open the customer name folder, and create a new In Arrears Booking Request Form sheet by copying the earlier processed sheet.
Rename the file in the format:
In Arrears Booking Request - Customer (Product) - Month YYYY
(e.g., In Arrears Booking Request - SCE (NeuVector) - September 2024)
Step 5. Update In Arrears Booking Request Form
Copy and paste the filtered data into the Timesheet subsheet.
Update the details using timesheet data and Clarizen, such as Consultant Name, Total Hours, Per Hour Cost, Dates, Customer, etc.

Submitting the In Arrears Request
Step 6. Share the In Arrears Booking Request Sheet
Send the In Arrears Booking Request Sheet to the Finance Consulting Team at:
financeconsulting@suse.com

Updating Forecasting Sheet
Step 7. Update the Revenue Forecast Google Sheet
Go to the FY24/25 Services Forecasting Documents Drive, select relevant FY folder, LATAM/NA folder, and Quarter folder.
Open the Revenue Forecasting sheet, and update details for the respective customer such as delivered hours, amount & status, as per the Clarizen.

APAC Revenue Recognition Process
Receiving Revenue Recognition Request
Step 1. Receive Email from SEMs/SDMs
The Service Engagement Managers (SEMs) or Service Delivery Managers (SDMs) submit the revenue recognition request via email.
With attached project delivery report, customer's signoff/confirmation of delivery, or service SOW.

Submitting the Revenue Recognition Request
Step 3. Send Email to Finance Team
Submit the request via email to the respective contact based on the region.
For APJ & Hong Kong: Send email to Bryce Christiansen with subject:
[ APJ/HK Rev Recognition ] Project Name - Project SFDC Opportunity ID].
Email: bryce.christiansen@suse.com
For GC (China & Taiwan): Send email to Bella Bi with subject:
[ GC Service Rev Recognition ] Project Name - Project SFDC Opportunity ID]
Email: bella.bi@suse.com
If partially recognized, mention the # of days delivered in the subject and email body.
Attach all supporting documents such as service SOW before sending.

Revenue Processing & Validation
Step 4. Finance Team Review & Confirmation
Bryce Christiansen (APJ/HK) or Bella Bi (GC) reviews the respective request and confirms via email whether the revenue recognition entry has been submitted.
Step 5. Revenue Reflection in PBI
Within 1-2 days, the revenue should reflect in Power BI (PBI). If revenue is not reflected or the amount is incorrect, contact the respective team member (Bryce Christiansen / Bella Bi) for validation.

Completion of Revenue Recognition
Step 6. Final Confirmation
Once the revenue is correctly reflected in PBI, the Revenue Recognition Process is complete.


*****************************
New tab content starts here - Purchase Order

Purchase Order
How to create Purchase Order
PO Initiation
Step 1.  Request via Email
The process begins when authorized personnel (Requestor)  send an email request. This email includes the subcontractor agreement and essential project information, such as the customer, project details, and the amount to be paid.
PO Creation in SAP
Step 2. Open the  SAP Cloud Production
Click on the "Create Purchase Order" dialog box. Next, put the supplier ID in the supplier textbox. The system will then automatically populate the relevant supplier information.

Step 3. Verify & Input Organizational Details
Verify the pre-populated data for the respective supplier, or enter the purchase organization, purchase group and company code (specific to the country).

Step 4: Attaching the Agreement
To attach the subcontractor agreement (Sub SOW), go to the "Services for Object" tab and select "Create Attachment" from the dropdown menu.
After uploading, you'll see a "Document Created" message at the bottom left—this confirms your attachment is on the PO.
Please Note:
For projects within the EMEA region, please ensure that both the Sub-Statement of Work (Sub-SOW) and the Contractor Agreement are attached to your request. These are mandatory documents for processing.
Step 5. Select Payment Terms
In the Delivery/Invoice tab, choose the appropriate payment terms based on the country. For example, 30 days for Australia and 60 days for China.

Step 6. Providing Context: Header Text and Notes
In the "Texts" tab, add header text and notes to clearly describe the purpose of this Purchase Order (PO). Include details like the subcontractor's name, the customer, and the duration or type of service.
For e.g., "SUSE Assist 10 Days to ABB Project Margin 40%".
Margin for APAC will be mentioned in the APAC PO Subcontractor file.
Margin Calculation (For EMEA)
Margin= {[SubContractor Cost (from Sub-SOW)/Contract Value (Clarizon)]-1}*100.

Step 6. Adding Item Details
Click on “Item Overview” plus icon to enter details such as item number, short text, PO quantity, order unit (OUn), and plant from the Sub-SOW sent by the requestor.
Check the currency, always write the currency as mentioned in the Sub-SOW
For the Net Price, enter the amount before tax. This means: take the amount from the Sub-SOW, subtract the tax percentage (also in the Sub-SOW), and enter the result. If tax percentage is not mentioned then the final amount is already excluded of tax.
Select the correct plant for the company code, enter "EA" for the order unit, put the total value in the PO quantity field, put item quantity as 10 and set the "Net Price" to "1.00".

Step 7. Completing Account Assignment
Hit "Enter" on your keyboard, and SAP will automatically move to the "Account Assignment" tab in the Line Item detail section of the PO. Here, provide the general ledger (GL) account and cost center, which are specific to the country of the purchase.

Step 8. Verifying and Saving Your PO
To finalize your PO, click the blue "Check" icon to verify there are no error messages; a green checkmark indicates you're good to go!
Then, simply save your PO by clicking the "Save" button on the lower right-hand side of the screen and keep a note of PO number.

Step 9.  Acknowledgment to the requestor
Once the PO is created, write an email to the requestor confirming the request as per below template:
"Your Purchase Order (PO) has been successfully created. The PO number is [PO Number]. We will send you a confirmation email as soon as it has 	been approved "
PO Approval
Step 9. Approval Process
Once you've submitted your PO, it goes through an approval process, which usually takes less than five days. The approvers may include the service director and the finance team, depending on the PO value. For APAC region, make sure to send the acknowledgement email to the requestor once we created the PO.

Step 10. Receiving the Approval Notification
Once approved, you will receive an email notification.
PO Notification and Invoice Request
Step 11. Download the Approved PO
In SAP, open the "Display Purchase Order" app and search for your PO using the PO number.
Proceed to the 'Messages' tab. Select the relevant Purchase Order (PO) document, then click 'Display Documents.' Download the document as a PDF .

Step 12. Notify the Requester
Email the downloaded PO to the requester, who will then forward it to the subcontractor for invoicing. Once we receive the invoice, we'll process a goods receipt.

Please Note:
If you're working on a project in the Asia-Pacific (APAC) region and need to hire a subcontractor, there's a quick check we need to do first. We use a Google Sheet called 'FY25 APAC Subcontractor PO Tracker'  (Refer Attached Link) to see if the margin' is at least 40%. If it is, great! You can move forward. But if the margin is lower than 40%, we need to get approval from Chen Wei before creating the Purchase Order.
How to Post Goods Receipt
Upon completion of services, the requestor shares the Purchase Order (PO) with the subcontractor, prompting the subcontractor to issue an invoice. Once received, a Goods Receipt is done in the SAP, officially acknowledging the delivered services.
This Goods Receipt then triggers the payment process according to established company terms, leading to payment execution by the accounts payable department.
Step 1: Access the Goods Receipt App
Click on the "Goods Receipt" tile on SAP. Enter the purchase order number in the designated field, and press "Enter" to view the purchase order details ready for goods receipting.

Step 2: Updating the Details
In the goods receipt, update "Qty in Unit of Entry" with the received quantity. If it's already correct, no action is needed. Finally, check "Item OK."
To complete the goods receipt, click the blue "POST" button at the bottom right of the screen. This will generate a goods receipt number— keep a record of this number.

Step 3: Notify Accounts Payable Team
Send an email to the accounts payable team. Include the following documents:
Invoice
Purchase Order
Statement of Work (SOW)
Delivery Report (if applicable)
Goods Receipt/Document Number

For requests in China, also attach the payment request form.
For EMEA & APJ Region : AccountsPayableEMEAAPJ@suse.com
For AMS/CA Region: accounts.payable.us@suse.com

How to Amend a Purchase Order
Purchase Orders can be amended for critical or clerical changes. Critical changes (e.g., value, company code, cost center, plant code) require a manual version update to retrigger approval workflow. Clerical changes (e.g., adding text, attachments) can be saved without a version update or workflow resubmission.
Step 1: Access the Application
Open “Change Purchase Order” tile. Select the “Other Purchase Order" option from the blue heading on the shell bar.
In the pop-up “Select Document” dialog box input the PO number and click the “Other Document”.
Step 2: Amending the Changes
To change the value or quantity, input the new value into the required field in the line item.
PO will display on screen in edit mode. PO must be in edit mode to allow updates. If the line items are greyed this indicates the PO is in display only mode. To put PO into edit mode click on the “Display/Change” option in blue in the shell bar.
Step 3: Verifying and Saving
To check the PO is ready to be saved, click the “Check” option in the blue headings on the shell bar. Execution message will display on the lower right-hand screen.
How to Cancel a Purchase Order
A Purchase Order (PO) can only be cancelled if there are no paid invoices related to any items on it and no goods have been received. If goods have been recorded as received, those records must be cancelled before the PO can be cancelled.
Step 1. Access the Tool
To begin, open the 'Change Purchase Order Advanced' tile within the system. The application will then automatically display the most recently accessed Purchase Order
Step 2. Locate the Specific Purchase Order
Select the “Other Purchase Order” heading from the shell bar to open the search PO dialog box. Enter the specific Purchase Order (PO) number and press enter on your keyboard to display the required PO.
Step 3. Check Order Status
Click on the Status tab from the heading’s tabs in PO Header and the Purchase Order History tab in the Item Details section. Check that the 'Delivered' and 'Invoiced' values in the Header Status are both '0,' or alternatively, verify that the Goods Receipt and Invoice Receipt values within the Item Detail's Purchase Order History tab are also '0'.
Step 4. Prepare the Purchase Order for Cancellation
To prepare the Purchase Order (PO) for cancellation, click the 'Change/Display' button to switch to edit mode. Then, within the header text section, enter a clear statement indicating that the PO is being cancelled and should not be processed further. Finally, update the Header note with a detailed explanation of the reason for the cancellation.
Step 5. Cancel the Selected Item(s)
To cancel specific items within the Purchase Order (PO), first, highlight the line item or row. Then, click the 'Bin' icon located below the overview section. A 'Delete Items' pop-up window will appear. Confirm the cancellation by clicking the 'Yes' option.
Step 6.Save and Verify Cancellation
Next, Click the check icon for errors, if no messages were issued during check, then click the “Save” button on the lower right-hand side of screen. Execution message will display on lower left-hand side of screen to indicate PO has been changed successfully. To ensure the cancellation has been applied, click the 'Other Purchase Order' button and press 'Enter' or select 'Other Document' to refresh the screen. Finally, review the 'Status' tab to confirm all values reflect the cancellation.


How to create a PO Report
Purchase order reports facilitate better budget forecasting and resource allocation, leading to more effective financial planning and improved overall business performance. It also help individuals track their own purchase orders, providing a handy record for future reference and ensuring everyone stays organized and informed.
Step 1: Access the Tile
Select the “Monitor Purchase Order Items New – FX Date “ tile which is used to display and structure PO Data.
Step 2: Creating the Report
"Fx Date" is the only required field in the Monitor, this is the company FX rate per trading period.
Next, refine your report by selecting your desired criteria or adding filters under "Adapt Filter." Once you've set your parameters, click the "GO" button. The report data will then appear on your screen. You can download this data for further analysis.


*****************************
New tab content starts here - Revenue Dashboard

Revenue Dashboard

Process Flow Steps

Step 1.  Check & Update the WW Roll-Up Google Sheet
The WW Services Revenue Forecast Roll-Up Google Sheet contains weekly data for the current quarter, updated every Thursday by Geo Ops member:
Anna K - EMEA
Anna N - APAC
Candice - AMS
If the data is not updated, we reach out to the respective Geo Ops members for an update.
We use a formula (=cell number) in the Current Week column to reference the latest week's data.
Purpose : This will ensure automatic update in the dashboard.
Once confirmed, download the updated Google Sheet : go to File > Download > comma separated value (csv)

Step 2.  Upload Data to Salesforce Analytics Studio
Open Salesforce Analytics Studio and search for the respective quarter’s dataset
Format: WW Services Revenue Forecast Roll-Up - FYXX QX (e.g., FY25 Q2)
Replace Data
Click the dropdown next to the dataset > Select Edit
Click the Replace Data icon (right side of the page)
Upload the downloaded CSV file
Click Next > OK to confirm data replacement
The dashboard will automatically update with this updated data.

Step 3.  Update Reports & Visuals in Analytics Studio
Open Analytics Studio and search for 'Services Revenue' Dashboard.
Click on the relevant quarter’s services forecast tab (e.g., Services FC Q2).
Edit the dashboard and it specific reports & visuals:
To enable dashboard editing, click on the edit option on the top right of the dashboard.
To update a specific report: Double-click on it.
Add the respective week's column, rename it, and format as "Currency Rounded"
Repeat for other required visuals.
Adjust Bar Colors for 'Forecast to Budget (Week-on-Week)' Chart:
Single click on the chart > Right-side format panel opens
Under Conditional Formatting, adjust colors to match existing bars
Click on the Save button.

Step 4.  Notify Geo Ops Team
Go to the Slack channel (team-cfl-operations-team-comms)
Inform the Geo Ops team that the dashboard has been updated.

    
    `;
})();
