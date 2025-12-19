/**
 * WhatsApp Clone - Cloudflare Worker with AI Features
 * Uses Google Gemini API for AI capabilities
 */

export default {
    async fetch(request, env, ctx) {
        const MODEL_NAME = "gemini-2.0-flash";

        // CORS Headers
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        // Handle Preflight (OPTIONS) requests
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        // Health check endpoint
        if (path === "/health" && request.method === "GET") {
            return new Response(JSON.stringify({ status: "ok" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Only allow POST for API endpoints
        if (request.method !== "POST" && path.startsWith("/api/")) {
            return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
        }

        try {
            const apiKey = env.GEMINI_API_KEY;

            if (!apiKey) {
                return new Response(JSON.stringify({ error: "API Key missing" }), {
                    status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            // Route to appropriate handler
            switch (path) {
                case "/api/summarize":
                    return await handleSummarize(request, apiKey, MODEL_NAME, corsHeaders);

                case "/api/importance":
                    return await handleImportance(request, apiKey, MODEL_NAME, corsHeaders);

                case "/api/smart-reply":
                    return await handleSmartReply(request, apiKey, MODEL_NAME, corsHeaders);

                case "/api/trip-plan":
                    return await handleTripPlan(request, apiKey, MODEL_NAME, corsHeaders);

                case "/api/schedule":
                    return await handleSchedule(request, corsHeaders);

                default:
                    // Generic Gemini endpoint for backward compatibility
                    return await handleGeneric(request, apiKey, MODEL_NAME, corsHeaders);
            }

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
    }
};

// Helper function to call Gemini API
async function callGemini(apiKey, model, prompt, systemInstruction) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
        }
    };

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// Summarize conversation
async function handleSummarize(request, apiKey, model, corsHeaders) {
    const body = await request.json();
    const messages = body.messages || [];

    if (messages.length === 0) {
        return new Response(JSON.stringify({ error: "No messages provided" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    const conversation = messages.map(m => `${m.sender}: ${m.content}`).join("\n");

    const systemInstruction = `You are a conversation summarizer. Analyze the chat and provide a concise summary highlighting:
- Key decisions made
- Important dates/times mentioned
- Action items or tasks
- Main topics discussed
Format the response with clear sections.`;

    const prompt = `Summarize this conversation:\n\n${conversation}`;

    const summary = await callGemini(apiKey, model, prompt, systemInstruction);

    return new Response(JSON.stringify({ summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
}

// Detect important messages
async function handleImportance(request, apiKey, model, corsHeaders) {
    const body = await request.json();
    const messages = body.messages || [];
    const userId = body.userId;

    if (messages.length === 0) {
        return new Response(JSON.stringify({ importantMessages: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    const messagesWithIds = messages.map(m => `[ID:${m.id}] ${m.sender}: ${m.content}`).join("\n");

    const systemInstruction = `You are analyzing chat messages to find important ones that need attention. Identify messages that:
- Ask direct questions
- Request action or response
- Mention deadlines or urgency
- Contain important information
Return ONLY a JSON array of message IDs that are important. Example: ["id1", "id2"]`;

    const prompt = `Find important messages in this chat:\n\n${messagesWithIds}\n\nReturn ONLY the JSON array of IDs.`;

    const result = await callGemini(apiKey, model, prompt, systemInstruction);

    // Parse the JSON array from the response
    let importantMessages = [];
    try {
        const match = result.match(/\[.*\]/s);
        if (match) {
            importantMessages = JSON.parse(match[0]);
        }
    } catch (e) {
        console.error("Failed to parse importance result:", e);
    }

    return new Response(JSON.stringify({ importantMessages }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
}

// Generate smart replies
async function handleSmartReply(request, apiKey, model, corsHeaders) {
    const body = await request.json();
    const messages = body.messages || [];

    if (messages.length === 0) {
        return new Response(JSON.stringify({ suggestions: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    const recentMessages = messages.slice(-5).map(m =>
        `${m.isOwn ? "You" : m.sender}: ${m.content}`
    ).join("\n");

    const systemInstruction = `Generate 3 natural, contextual reply suggestions based on the conversation. 
Keep replies short (under 10 words each), casual, and appropriate.
Return ONLY a JSON array of 3 strings. Example: ["Sure!", "I'll check and let you know", "Thanks!"]`;

    const prompt = `Recent conversation:\n${recentMessages}\n\nGenerate 3 reply suggestions as a JSON array.`;

    const result = await callGemini(apiKey, model, prompt, systemInstruction);

    let suggestions = [];
    try {
        const match = result.match(/\[.*\]/s);
        if (match) {
            suggestions = JSON.parse(match[0]);
        }
    } catch (e) {
        suggestions = ["👍", "Okay!", "Got it"];
    }

    return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
}

// Generate trip plan
async function handleTripPlan(request, apiKey, model, corsHeaders) {
    const body = await request.json();
    const messages = body.messages || [];
    const participants = body.participants || [];

    const conversation = messages.map(m => `${m.sender}: ${m.content}`).join("\n");
    const participantList = participants.map(p => `- ${p.name} (from ${p.location})`).join("\n");

    const systemInstruction = `You are a trip planning assistant. Based on the group chat discussion, create a comprehensive trip plan including:
- Suggested destination
- Proposed dates/times
- Departure schedule from each participant's location
- Things to prepare
- Meeting points
Format with clear sections and bullet points.`;

    const prompt = `Group members:\n${participantList}\n\nConversation about the trip:\n${conversation}\n\nCreate a detailed trip plan.`;

    const tripPlan = await callGemini(apiKey, model, prompt, systemInstruction);

    return new Response(JSON.stringify({ tripPlan }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
}

// Handle scheduled message (just validates and returns success)
async function handleSchedule(request, corsHeaders) {
    const body = await request.json();
    const { messageContent, scheduledTime, recipientName } = body;

    if (!messageContent || !scheduledTime) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // Return success - actual scheduling is handled by Firestore
    return new Response(JSON.stringify({
        success: true,
        scheduledMessage: {
            content: messageContent,
            scheduledFor: scheduledTime,
            recipient: recipientName || "Unknown",
            status: "pending"
        },
        message: `Message scheduled for ${new Date(scheduledTime).toLocaleString()}`
    }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
}

// Generic handler for backward compatibility
async function handleGeneric(request, apiKey, model, corsHeaders) {
    const body = await request.json();
    const userMessage = body.prompt || body.text;
    const systemInstruction = body.systemInstruction || "You are a helpful AI assistant.";

    if (!userMessage) {
        return new Response(JSON.stringify({ error: "No prompt provided" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: userMessage }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] }
    };

    const geminiResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await geminiResponse.json();

    if (data.error) {
        return new Response(JSON.stringify({ error: data.error.message }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
}
