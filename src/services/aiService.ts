/**
 * AI Service - Frontend client for Cloudflare Worker AI endpoints
 */

// Worker URL - Update this after deployment
// For development, you can use wrangler dev which runs on localhost:8787
const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

interface Message {
    id?: string;
    sender: string;
    content: string;
    timestamp?: string;
    isOwn?: boolean;
}

interface Participant {
    name: string;
    location: string;
}

interface ScheduledMessageResponse {
    success: boolean;
    scheduledMessage: {
        content: string;
        scheduledFor: string;
        recipient: string;
        status: string;
    };
    message: string;
}

/**
 * Get AI-generated summary of a conversation
 */
export async function getConversationSummary(
    messages: Message[]
): Promise<string> {
    try {
        const response = await fetch(`${WORKER_URL}/api/summarize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: messages.map(m => ({
                    sender: m.sender,
                    content: m.content,
                    timestamp: m.timestamp || new Date().toISOString(),
                })),
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to get summary');
        }

        const data = await response.json() as { summary: string };
        return data.summary;
    } catch (error) {
        console.error('AI Summary error:', error);
        throw error;
    }
}

/**
 * Detect important unread messages that need attention
 */
export async function detectImportantMessages(
    messages: Message[],
    currentUserId: string
): Promise<string[]> {
    try {
        const response = await fetch(`${WORKER_URL}/api/importance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: messages.map(m => ({
                    id: m.id,
                    sender: m.sender,
                    content: m.content,
                    timestamp: m.timestamp || new Date().toISOString(),
                })),
                userId: currentUserId,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to detect important messages');
        }

        const data = await response.json() as { importantMessages: string[] };
        return data.importantMessages;
    } catch (error) {
        console.error('AI Importance detection error:', error);
        throw error;
    }
}

/**
 * Generate a trip plan from group chat conversation
 */
export async function generateTripPlan(
    messages: Message[],
    participants: Participant[]
): Promise<string> {
    try {
        const response = await fetch(`${WORKER_URL}/api/trip-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: messages.map(m => ({
                    sender: m.sender,
                    content: m.content,
                })),
                participants,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to generate trip plan');
        }

        const data = await response.json() as { tripPlan: string };
        return data.tripPlan;
    } catch (error) {
        console.error('AI Trip planner error:', error);
        throw error;
    }
}

/**
 * Schedule a message to be sent at a specific time
 */
export async function scheduleMessage(
    messageContent: string,
    scheduledTime: Date,
    recipientName?: string
): Promise<ScheduledMessageResponse> {
    try {
        const response = await fetch(`${WORKER_URL}/api/schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messageContent,
                scheduledTime: scheduledTime.toISOString(),
                recipientName,
            }),
        });

        if (!response.ok) {
            const error = await response.json() as { error: string };
            throw new Error(error.error || 'Failed to schedule message');
        }

        return await response.json() as ScheduledMessageResponse;
    } catch (error) {
        console.error('Schedule message error:', error);
        throw error;
    }
}

/**
 * Get smart reply suggestions based on conversation context
 */
export async function getSmartReplies(
    messages: Message[],
    context?: string
): Promise<string[]> {
    try {
        const response = await fetch(`${WORKER_URL}/api/smart-reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: messages.map(m => ({
                    sender: m.sender,
                    content: m.content,
                    isOwn: m.isOwn,
                })),
                context,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to get smart replies');
        }

        const data = await response.json() as { suggestions: string[] };
        return data.suggestions;
    } catch (error) {
        console.error('Smart reply error:', error);
        throw error;
    }
}

/**
 * Check if AI service is available
 */
export async function checkAIServiceHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${WORKER_URL}/health`);
        return response.ok;
    } catch {
        return false;
    }
}
