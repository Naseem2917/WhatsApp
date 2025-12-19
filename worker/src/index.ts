/**
 * WhatsApp Worker - Cloudflare Worker for AI Features
 * Handles Gemini API calls securely with API key stored in Cloudflare Secrets
 */

export interface Env {
    GEMINI_API_KEY: string;
    ENVIRONMENT: string;
}

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper to create JSON response
function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
        },
    });
}

// Error response helper
function errorResponse(message: string, status = 400): Response {
    return jsonResponse({ error: message }, status);
}

// Gemini API call helper
async function callGemini(apiKey: string, prompt: string): Promise<string> {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                },
            }),
        }
    );

    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// API Route Handlers
async function handleConversationSummary(request: Request, env: Env): Promise<Response> {
    try {
        const { messages } = await request.json() as { messages: Array<{ sender: string; content: string; timestamp: string }> };

        if (!messages || !Array.isArray(messages)) {
            return errorResponse('Messages array is required');
        }

        const conversationText = messages
            .map((m) => `[${m.timestamp}] ${m.sender}: ${m.content}`)
            .join('\n');

        const prompt = `Analyze this conversation and provide a concise summary. Extract:
1. Key decisions made
2. Important dates/deadlines mentioned
3. Action items or tasks assigned
4. Main topics discussed

Conversation:
${conversationText}

Provide the summary in a structured format with clear sections. Be concise but comprehensive.`;

        const summary = await callGemini(env.GEMINI_API_KEY, prompt);
        return jsonResponse({ summary });
    } catch (error) {
        console.error('Summary error:', error);
        return errorResponse('Failed to generate summary', 500);
    }
}

async function handleImportanceDetection(request: Request, env: Env): Promise<Response> {
    try {
        const { messages, userId } = await request.json() as {
            messages: Array<{ id: string; sender: string; content: string; timestamp: string }>;
            userId: string;
        };

        if (!messages || !Array.isArray(messages)) {
            return errorResponse('Messages array is required');
        }

        const unreadMessages = messages
            .filter(m => m.sender !== userId)
            .map((m) => `ID:${m.id} - ${m.content}`)
            .join('\n');

        if (!unreadMessages) {
            return jsonResponse({ importantMessages: [] });
        }

        const prompt = `Analyze these unread messages and identify which ones are IMPORTANT and need a response.
Consider a message important if it:
- Contains a question that requires an answer
- Has a deadline or time-sensitive request
- Contains important information or news
- Expresses urgency or is marked as important
- Requests action or decision

Messages:
${unreadMessages}

Return ONLY a JSON array of important message IDs like: ["id1", "id2"]
If no messages are important, return: []`;

        const result = await callGemini(env.GEMINI_API_KEY, prompt);

        // Extract JSON array from response
        const match = result.match(/\[[\s\S]*?\]/);
        const importantIds = match ? JSON.parse(match[0]) : [];

        return jsonResponse({ importantMessages: importantIds });
    } catch (error) {
        console.error('Importance detection error:', error);
        return errorResponse('Failed to detect important messages', 500);
    }
}

async function handleTripPlanner(request: Request, env: Env): Promise<Response> {
    try {
        const { messages, participants } = await request.json() as {
            messages: Array<{ sender: string; content: string }>;
            participants: Array<{ name: string; location: string }>;
        };

        if (!messages || !participants) {
            return errorResponse('Messages and participants are required');
        }

        const conversationText = messages
            .map((m) => `${m.sender}: ${m.content}`)
            .join('\n');

        const participantInfo = participants
            .map((p) => `${p.name} (from: ${p.location})`)
            .join(', ');

        const prompt = `You are a trip planner assistant. Based on this group chat conversation about planning a trip, create a structured trip plan.

Participants: ${participantInfo}

Conversation:
${conversationText}

Create a trip plan with:
1. **Destination**: Where they're going (extract from conversation)
2. **Date/Time**: When they plan to meet/travel
3. **Meeting Point**: Suggested common meeting location
4. **Departure Schedule**: For each participant, suggest:
   - Departure time from their location
   - Recommended transport mode
   - Estimated arrival time
5. **Checklist**: Things to prepare/bring
6. **Notes**: Any important points from the conversation

Format the response as a structured plan that's easy to read. If information is missing, note what needs to be decided.`;

        const plan = await callGemini(env.GEMINI_API_KEY, prompt);
        return jsonResponse({ tripPlan: plan });
    } catch (error) {
        console.error('Trip planner error:', error);
        return errorResponse('Failed to create trip plan', 500);
    }
}

async function handleScheduledMessage(request: Request, env: Env): Promise<Response> {
    try {
        const { messageContent, scheduledTime, recipientName } = await request.json() as {
            messageContent: string;
            scheduledTime: string;
            recipientName?: string;
        };

        if (!messageContent || !scheduledTime) {
            return errorResponse('Message content and scheduled time are required');
        }

        // Parse and validate the scheduled time
        const scheduleDate = new Date(scheduledTime);
        if (isNaN(scheduleDate.getTime())) {
            return errorResponse('Invalid scheduled time format');
        }

        if (scheduleDate.getTime() <= Date.now()) {
            return errorResponse('Scheduled time must be in the future');
        }

        // In a real implementation, this would store in a database/queue
        // For now, we return the scheduled message details
        return jsonResponse({
            success: true,
            scheduledMessage: {
                content: messageContent,
                scheduledFor: scheduleDate.toISOString(),
                recipient: recipientName || 'Unknown',
                status: 'scheduled',
            },
            message: `Message scheduled for ${scheduleDate.toLocaleString()}`,
        });
    } catch (error) {
        console.error('Schedule message error:', error);
        return errorResponse('Failed to schedule message', 500);
    }
}

async function handleSmartReply(request: Request, env: Env): Promise<Response> {
    try {
        const { messages, context } = await request.json() as {
            messages: Array<{ sender: string; content: string; isOwn: boolean }>;
            context?: string;
        };

        if (!messages || !Array.isArray(messages)) {
            return errorResponse('Messages array is required');
        }

        const conversationText = messages
            .slice(-10) // Last 10 messages for context
            .map((m) => `${m.isOwn ? 'You' : m.sender}: ${m.content}`)
            .join('\n');

        const prompt = `Based on this conversation, suggest 3 short, natural reply options.
${context ? `Context: ${context}` : ''}

Conversation:
${conversationText}

Provide exactly 3 reply suggestions, one per line. Keep each reply under 50 characters.
Make them conversational and appropriate for the context.
Just provide the replies, no numbering or explanations.`;

        const result = await callGemini(env.GEMINI_API_KEY, prompt);
        const suggestions = result.split('\n').filter(s => s.trim()).slice(0, 3);

        return jsonResponse({ suggestions });
    } catch (error) {
        console.error('Smart reply error:', error);
        return errorResponse('Failed to generate replies', 500);
    }
}

// Main request handler
export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        // Health check
        if (path === '/health') {
            return jsonResponse({ status: 'ok', environment: env.ENVIRONMENT });
        }

        // Check for API key
        if (!env.GEMINI_API_KEY) {
            return errorResponse('API key not configured', 500);
        }

        // Route handling
        if (request.method === 'POST') {
            switch (path) {
                case '/api/summarize':
                    return handleConversationSummary(request, env);
                case '/api/importance':
                    return handleImportanceDetection(request, env);
                case '/api/trip-plan':
                    return handleTripPlanner(request, env);
                case '/api/schedule':
                    return handleScheduledMessage(request, env);
                case '/api/smart-reply':
                    return handleSmartReply(request, env);
                default:
                    return errorResponse('Not found', 404);
            }
        }

        return errorResponse('Method not allowed', 405);
    },
};
