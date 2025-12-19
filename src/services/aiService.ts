/**
 * AI Service - Frontend client for Cloudflare Worker with Gemini API
 * 
 * This service sends requests to your Cloudflare Worker which returns:
 * { success: true, text: "AI response text", raw: {...} }
 */

// Worker URL from environment or fallback
const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://whatsapp.khannaseem1704.workers.dev';

interface Message {
    id?: string;
    sender?: string;
    senderId?: string;
    content: string;
    timestamp?: string;
    isOwn?: boolean;
}

interface Participant {
    name: string;
    location: string;
}

// Response format from YOUR Worker
interface WorkerResponse {
    success?: boolean;
    text?: string;
    error?: string;
    raw?: unknown;
}

/**
 * Helper function to extract text from Worker response
 */
function extractWorkerText(response: WorkerResponse): string {
    if (response.error) {
        throw new Error(response.error);
    }

    if (!response.text) {
        throw new Error('No response from AI');
    }

    return response.text.trim();
}

/**
 * Helper function to make AI API calls
 */
async function callGeminiAPI(prompt: string, systemInstruction: string): Promise<string> {
    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                systemInstruction,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})) as WorkerResponse;
            throw new Error(errorData.error || `API error: ${response.status}`);
        }

        const data = await response.json() as WorkerResponse;
        return extractWorkerText(data);
    } catch (error) {
        console.error('AI API call failed:', error);
        throw error instanceof Error ? error : new Error('AI service unavailable');
    }
}

/**
 * Get AI-generated summary of a conversation
 */
export async function getConversationSummary(messages: Message[]): Promise<string> {
    if (messages.length < 3) {
        throw new Error('Need at least 3 messages to summarize');
    }

    const conversation = messages
        .map(m => `${m.sender || m.senderId || 'User'}: ${m.content}`)
        .join('\n');

    const systemInstruction = `You are a conversation summarizer. Analyze the chat and provide a concise summary highlighting:
- Key decisions made
- Important dates/times mentioned  
- Action items or tasks
- Main topics discussed
Format the response with clear sections using markdown headers.`;

    const prompt = `Summarize this conversation:\n\n${conversation}`;

    return await callGeminiAPI(prompt, systemInstruction);
}

/**
 * Detect important unread messages that need attention
 */
export async function detectImportantMessages(
    messages: Message[],
    currentUserId: string
): Promise<string[]> {
    if (messages.length === 0) {
        return [];
    }

    const messagesWithIds = messages
        .filter(m => m.id)
        .map(m => `[ID:${m.id}] ${m.sender || m.senderId}: ${m.content}`)
        .join('\n');

    const systemInstruction = `You are analyzing chat messages to find important ones that need attention. Identify messages that:
- Ask direct questions
- Request action or response
- Mention deadlines or urgency
- Contain important information

Return ONLY a JSON array of message IDs that are important. 
Example format: ["id1", "id2", "id3"]
If no messages are important, return: []`;

    const prompt = `Current user ID: ${currentUserId}\n\nFind important messages in this chat:\n\n${messagesWithIds}\n\nReturn ONLY the JSON array of IDs, nothing else.`;

    try {
        const result = await callGeminiAPI(prompt, systemInstruction);

        // Parse the JSON array from the response
        const match = result.match(/\[.*\]/s);
        if (match) {
            return JSON.parse(match[0]) as string[];
        }
        return [];
    } catch (error) {
        console.error('Failed to detect important messages:', error);
        return [];
    }
}

/**
 * Generate a trip plan from group chat conversation
 */
export async function generateTripPlan(
    messages: Message[],
    participants: Participant[]
): Promise<string> {
    if (messages.length === 0) {
        throw new Error('No conversation to analyze');
    }

    const conversation = messages
        .map(m => `${m.sender || m.senderId}: ${m.content}`)
        .join('\n');

    const participantList = participants
        .map(p => `- ${p.name} (from ${p.location})`)
        .join('\n');

    const systemInstruction = `You are a trip planning assistant. Based on the group chat discussion, create a comprehensive trip plan including:
- Suggested destination based on the conversation
- Proposed dates/times from the discussion
- Departure schedule from each participant's location
- Things each person should prepare
- Meeting points
- Estimated budget if discussed

Format with clear sections using markdown headers and bullet points.`;

    const prompt = `Group members:\n${participantList}\n\nConversation about the trip:\n${conversation}\n\nCreate a detailed trip plan based on this discussion.`;

    return await callGeminiAPI(prompt, systemInstruction);
}

/**
 * Get smart reply suggestions based on conversation context
 */
export async function getSmartReplies(
    messages: Message[],
    _context?: string
): Promise<string[]> {
    if (messages.length === 0) {
        return ['👍', 'Okay!', 'Got it'];
    }

    const recentMessages = messages
        .slice(-5)
        .map(m => `${m.isOwn ? 'You' : (m.sender || 'Other')}: ${m.content}`)
        .join('\n');

    const systemInstruction = `Generate exactly 3 natural, contextual reply suggestions based on the conversation. 
Keep replies short (under 10 words each), casual, and appropriate for WhatsApp.
Return ONLY a JSON array of exactly 3 strings.
Example format: ["Sure, sounds good!", "I'll check and let you know", "Thanks!"]`;

    const prompt = `Recent conversation:\n${recentMessages}\n\nGenerate 3 reply suggestions as a JSON array.`;

    try {
        const result = await callGeminiAPI(prompt, systemInstruction);

        const match = result.match(/\[.*\]/s);
        if (match) {
            const suggestions = JSON.parse(match[0]) as string[];
            return suggestions.slice(0, 3);
        }
        return ['👍', 'Okay!', 'Got it'];
    } catch (error) {
        console.error('Failed to get smart replies:', error);
        return ['👍', 'Okay!', 'Got it'];
    }
}

/**
 * Schedule a message (local validation only - actual scheduling uses Firestore)
 */
export async function scheduleMessage(
    messageContent: string,
    scheduledTime: Date,
    recipientName?: string
): Promise<{ success: boolean; message: string }> {
    if (!messageContent.trim()) {
        throw new Error('Message content is required');
    }

    if (scheduledTime <= new Date()) {
        throw new Error('Scheduled time must be in the future');
    }

    // This just validates - actual persistence is done via Firestore service
    return {
        success: true,
        message: `Message scheduled for ${scheduledTime.toLocaleString()} to ${recipientName || 'recipient'}`
    };
}

/**
 * Check if AI service is available
 */
export async function checkAIServiceHealth(): Promise<boolean> {
    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: 'Hi', systemInstruction: 'Reply with OK' }),
        });
        return response.ok;
    } catch {
        return false;
    }
}

// =====================
// NEW AI FEATURES
// =====================

// Types for AI Message Rewrite
export type RewriteTone = 'professional' | 'casual' | 'short' | 'polite' | 'friendly';

export interface AIRewriteResponse {
    success: boolean;
    rewrittenMessage?: string;
    error?: string;
}

// Types for AI Chat Actions
export interface AIChatActionResponse {
    intent: 'meeting' | 'reminder' | 'question' | 'plan' | 'none';
    suggestedAction: 'reply' | 'schedule_message' | 'create_reminder' | 'summarize' | 'none';
    suggestedText?: string;
}

/**
 * Rewrite a message in a specific tone using AI
 */
export async function rewriteMessage(
    message: string,
    tone: RewriteTone
): Promise<AIRewriteResponse> {
    if (!message.trim()) {
        return { success: false, error: 'Message cannot be empty' };
    }

    try {
        const systemInstruction = `You are a message rewriting assistant. Rewrite messages in the requested tone while preserving the original meaning. Only return the rewritten message with no additional text, quotes, or explanation.`;

        const prompt = `Rewrite the following message in a ${tone} tone:\n\n"${message}"`;

        const result = await callGeminiAPI(prompt, systemInstruction);

        // Clean up the response - remove quotes if present
        const rewrittenMessage = result.replace(/^["']|["']$/g, '').trim();

        return { success: true, rewrittenMessage };
    } catch (error) {
        console.error('AI rewrite error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to rewrite message'
        };
    }
}

/**
 * Analyze incoming message and suggest actions
 */
export async function analyzeMessageIntent(
    message: string
): Promise<AIChatActionResponse> {
    const defaultResponse: AIChatActionResponse = {
        intent: 'none',
        suggestedAction: 'none'
    };

    if (!message.trim() || message.length < 5) {
        return defaultResponse;
    }

    try {
        const systemInstruction = `You are analyzing chat messages to detect intent and suggest helpful actions. Return ONLY a valid JSON object with no other text.`;

        const prompt = `Analyze this incoming chat message and return a JSON object:
Message: "${message}"

Return format:
{
  "intent": "meeting" | "reminder" | "question" | "plan" | "none",
  "suggestedAction": "reply" | "schedule_message" | "create_reminder" | "summarize" | "none",
  "suggestedText": "optional suggested reply text"
}

Rules:
- "meeting": Message is about scheduling a meeting or appointment
- "reminder": Message contains a reminder or deadline
- "question": Message asks a direct question
- "plan": Message discusses planning something
- "none": Casual greetings or simple messages

For suggestedAction:
- "reply": Suggest a helpful reply (include suggestedText)
- "schedule_message": Suggest scheduling a follow-up message
- "none": No action needed

If unsure, return intent and suggestedAction as "none".`;

        const result = await callGeminiAPI(prompt, systemInstruction);

        // Try to parse JSON from the response
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                intent: parsed.intent || 'none',
                suggestedAction: parsed.suggestedAction || 'none',
                suggestedText: parsed.suggestedText || undefined
            };
        }

        return defaultResponse;
    } catch (error) {
        console.error('AI analysis error:', error);
        return defaultResponse;
    }
}
