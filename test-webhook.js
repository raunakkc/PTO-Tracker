
// using native fetch

const webhookUrl = "https://default3ea4ee535e074a30bd0de464769a4f.4f.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/d82da84fdab24e74b76a20bac33c1fd2/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=aArKGk_lBs3SXgCo32XRAPBCV8QxeUa99kmh0kU6DgA";

const payload = {
    type: "AdaptiveCard",
    body: [
        {
            type: "TextBlock",
            size: "Medium",
            weight: "Bolder",
            text: "Test Notification (Adaptive Card)"
        },
        {
            type: "TextBlock",
            text: "This is a test message from the PTO Tracker verification script.",
            wrap: true
        },
        {
            type: "FactSet",
            facts: [
                { title: "User:", value: "Test User" },
                { title: "Reason:", value: "TEST_REASON" },
                { title: "Start:", value: "2023-10-27" },
                { title: "End:", value: "2023-10-28" }
            ]
        }
    ],
    actions: [
        {
            type: "Action.OpenUrl",
            title: "View Request",
            url: "http://localhost:3000"
        }
    ],
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.4"
};

console.log("Sending test payload to Teams Webhook...");

fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
})
    .then(async res => {
        console.log(`Status Code: ${res.status}`);
        const text = await res.text();
        console.log(`Response Body: ${text}`);
        if (res.ok) {
            console.log("✅ Success! Check your Teams channel.");
        } else {
            console.error("❌ Failed.");
        }
    })
    .catch(err => {
        console.error("❌ Network Error:", err);
    });
