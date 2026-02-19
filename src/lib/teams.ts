
interface TeamsNotificationData {
    title: string;
    message: string;
    link?: string;
    user: string;
    startDate: string;
    endDate: string;
    reason: string;
}

export async function sendTeamsNotification(data: TeamsNotificationData) {
    const webhookUrl = process.env.TEAMS_WEBHOOK_URL;

    if (!webhookUrl) {
        console.warn('TEAMS_WEBHOOK_URL is not defined. Skipping notification.');
        return;
    }

    try {
        // Constructing a proper Adaptive Card payload
        // The Power Automate 'Post card' action expects this specific structure
        const cardPayload = {
            type: "AdaptiveCard",
            body: [
                {
                    type: "TextBlock",
                    size: "Medium",
                    weight: "Bolder",
                    text: data.title
                },
                {
                    type: "TextBlock",
                    text: data.message,
                    wrap: true
                },
                {
                    type: "FactSet",
                    facts: [
                        { title: "User:", value: data.user },
                        { title: "Reason:", value: data.reason },
                        { title: "Start:", value: data.startDate },
                        { title: "End:", value: data.endDate }
                    ]
                }
            ],
            actions: [
                {
                    type: "Action.OpenUrl",
                    title: "View Request",
                    url: data.link || ""
                }
            ],
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            version: "1.4"
        };

        // Note: Some Power Automate triggers expect the card inside 'attachments' or just raw. 
        // Based on the error "Property 'type' must be 'AdaptiveCard'", sending the card object directly is usually correct 
        // IF the Flow parses the whole body as the card.
        // However, if the Flow expects just data to fill a template, this might vary. 
        // Assuming standard 'Post Adaptive Card' flow that takes HTTP Body as the Card.

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(cardPayload),
        });

        if (!response.ok) {
            console.error(`Failed to send Teams notification: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error('Response:', text);
        } else {
            console.log('Teams notification sent successfully');
        }
    } catch (error) {
        console.error('Error sending Teams notification:', error);
    }
}
