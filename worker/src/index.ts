/**
 * WhatsApp Clone - Cloudflare Worker with Resilient Multi-Model AI Fallback
 * 
 * Exact PromptWise Fallback Chain:
 * 1. Fast & responsive: gemini-3.5-flash-lite (~900ms)
 * 2. Overload / rate-limit fallback: gemini-3.6-flash
 * 3. High reasoning fallback: gemini-3.7-flash
 */

export interface Env {
    GEMINI_API_KEY: string;
    ENVIRONMENT?: string;
}

const CORS_HEADERS: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-goog-api-key',
};

// ── Model constants (exact PromptWise models) ─────────────────────────────────

const MODEL_LITE = 'gemini-3.5-flash-lite';
const MODEL_MID  = 'gemini-3.6-flash';
const MODEL_HIGH = 'gemini-3.7-flash';

/**
 * Single, optimized fallback chain:
 * 1. Fast & responsive: gemini-3.5-flash-lite (~900ms)
 * 2. Overload / rate-limit fallback: gemini-3.6-flash
 * 3. High reasoning fallback: gemini-3.7-flash
 */
const FALLBACK_MODELS = [MODEL_LITE, MODEL_MID, MODEL_HIGH];

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
            ...extraHeaders,
        },
    });
}

/**
 * Returns true if the HTTP status code signals a transient/overload error
 * that warrants trying the next model in the fallback chain.
 * Non-retryable errors (401, 403, 400, etc.) will NOT trigger a model switch.
 */
function isRetryableStatus(status: number): boolean {
    return [429, 500, 502, 503, 504].includes(status);
}

// ── Core Gemini caller (single model, with timeout & header auth) ─────────────

const REQUEST_TIMEOUT_MS = 20_000; // 20 s per-model timeout

async function callGemini(
    apiKey: string,
    model: string,
    userPrompt: string,
    systemPrompt = ''
): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
        const bodyPayload: Record<string, unknown> = {
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: {
                temperature: 0.3,
            },
        };

        if (systemPrompt) {
            bodyPayload.systemInstruction = { parts: [{ text: systemPrompt }] };
        }

        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey, // Key in header, NOT in URL query string
            },
            body: JSON.stringify(bodyPayload),
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timer);
    }

    if (!response.ok) {
        const errBody = await response.text().catch(() => response.statusText);
        const err = new Error(`Gemini ${response.status}: ${errBody}`) as Error & { status?: number };
        err.status = response.status;
        throw err;
    }

    const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
}

// ── Multi-model caller with immediate fallback ───────────────────────────────

interface ModelCallResult {
    text: string;
    modelUsed: string;
    latencyMs: number;
}

async function callWithModelList(
    apiKey: string,
    models: string[],
    userPrompt: string,
    systemPrompt = ''
): Promise<ModelCallResult> {
    let lastError: Error & { status?: number } = new Error('No models available');

    for (const model of models) {
        const start = Date.now();
        try {
            const text = await callGemini(apiKey, model, userPrompt, systemPrompt);
            return { text, modelUsed: model, latencyMs: Date.now() - start };
        } catch (err: any) {
            lastError = err;

            // Abort = timeout → try next model immediately
            if (err.name === 'AbortError') {
                console.warn(`[Gemini] ${model} timed out. Trying next model…`);
                continue;
            }

            // Retryable server/overload error → try next model immediately
            if (err.status !== undefined && isRetryableStatus(err.status)) {
                console.warn(`[Gemini] ${model} returned ${err.status}. Trying next model…`);
                continue;
            }

            // Non-retryable (401 bad key, 400 bad request, etc.) → stop immediately
            console.error(`[Gemini] ${model} returned non-retryable error ${err.status ?? 'unknown'}. Aborting fallback.`);
            throw err;
        }
    }

    throw lastError;
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default {
    async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: CORS_HEADERS,
            });
        }

        // ── GET /health & GET /api/health ────────────────────────────────────
        if (request.method === 'GET' && (path === '/health' || path === '/api/health')) {
            return jsonResponse({
                status: 'ok',
                success: true,
                message: 'WhatsApp AI Proxy is working',
                models: FALLBACK_MODELS,
                environment: env.ENVIRONMENT || 'production',
            });
        }

        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', {
                status: 405,
                headers: CORS_HEADERS,
            });
        }

        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
            return jsonResponse(
                { error: 'Configuration Error: Missing GEMINI_API_KEY in Cloudflare Worker' },
                500
            );
        }

        try {
            const body = (await request.json().catch(() => ({}))) as Record<string, any>;

            // ── Route: POST /api/summarize ───────────────────────────────────
            if (path === '/api/summarize') {
                const messages = Array.isArray(body.messages) ? body.messages : [];
                let userPrompt = body.prompt || body.query || '';

                if (!userPrompt && messages.length > 0) {
                    const conversation = messages
                        .map((m: any) => `${m.sender || m.senderId || 'User'}: ${m.content}`)
                        .join('\n');
                    userPrompt = `Summarize this conversation:\n\n${conversation}`;
                }

                if (!userPrompt.trim()) {
                    return jsonResponse({ error: 'Messages or prompt is required for summarize.' }, 400);
                }

                const systemPrompt =
                    body.systemPrompt ||
                    body.systemInstruction ||
                    `You are a conversation summarizer. Analyze the chat and provide a concise summary highlighting:
- Key decisions made
- Important dates/times mentioned
- Action items or tasks
- Main topics discussed
Format the response with clear sections using markdown.`;

                const { text, modelUsed, latencyMs } = await callWithModelList(
                    apiKey,
                    FALLBACK_MODELS,
                    userPrompt,
                    systemPrompt
                );

                console.log(`[summarize] model=${modelUsed} latency=${latencyMs}ms`);

                return jsonResponse({
                    success: true,
                    text,
                    summary: text,
                    response: text,
                    modelUsed,
                    latencyMs,
                });
            }

            // ── Route: POST /api/importance ──────────────────────────────────
            if (path === '/api/importance') {
                const messages = Array.isArray(body.messages) ? body.messages : [];
                let userPrompt = body.prompt || '';

                if (!userPrompt && messages.length > 0) {
                    const userId = body.userId;
                    const unread = userId
                        ? messages.filter((m: any) => (m.sender || m.senderId) !== userId)
                        : messages;

                    const formatted = unread
                        .map((m: any) => `[ID:${m.id || 'unknown'}] ${m.sender || m.senderId || 'User'}: ${m.content}`)
                        .join('\n');

                    userPrompt = `Find important messages in this chat:\n\n${formatted}\n\nReturn ONLY the JSON array of IDs.`;
                }

                if (!userPrompt.trim()) {
                    return jsonResponse({ success: true, importantMessages: [] });
                }

                const systemPrompt =
                    body.systemPrompt ||
                    body.systemInstruction ||
                    `You are analyzing chat messages to find important ones that need attention. Identify messages that:
- Ask direct questions
- Request action or response
- Mention deadlines or urgency
- Contain important information
Return ONLY a JSON array of message IDs that are important. Example: ["id1", "id2"]
If none are important, return: []`;

                const { text, modelUsed, latencyMs } = await callWithModelList(
                    apiKey,
                    FALLBACK_MODELS,
                    userPrompt,
                    systemPrompt
                );

                console.log(`[importance] model=${modelUsed} latency=${latencyMs}ms`);

                let importantMessages: string[] = [];
                try {
                    const match = text.match(/\[[\s\S]*?\]/);
                    if (match) {
                        importantMessages = JSON.parse(match[0]);
                    }
                } catch (e) {
                    console.error('Failed to parse importance result:', e);
                }

                return jsonResponse({
                    success: true,
                    text,
                    importantMessages,
                    modelUsed,
                    latencyMs,
                });
            }

            // ── Route: POST /api/smart-reply ─────────────────────────────────
            if (path === '/api/smart-reply') {
                const messages = Array.isArray(body.messages) ? body.messages : [];
                let userPrompt = body.prompt || '';

                if (!userPrompt && messages.length > 0) {
                    const recent = messages.slice(-5).map((m: any) =>
                        `${m.isOwn ? 'You' : (m.sender || 'Other')}: ${m.content}`
                    ).join('\n');
                    userPrompt = `Recent conversation:\n${recent}\n\nGenerate 3 reply suggestions as a JSON array.`;
                }

                if (!userPrompt.trim()) {
                    return jsonResponse({ success: true, suggestions: ['👍', 'Okay!', 'Got it'] });
                }

                const systemPrompt =
                    body.systemPrompt ||
                    body.systemInstruction ||
                    `Generate 3 natural, contextual reply suggestions based on the conversation.
Keep replies short (under 10 words each), casual, and appropriate for WhatsApp.
Return ONLY a JSON array of 3 strings. Example: ["Sure!", "I'll check and let you know", "Thanks!"]`;

                const { text, modelUsed, latencyMs } = await callWithModelList(
                    apiKey,
                    FALLBACK_MODELS,
                    userPrompt,
                    systemPrompt
                );

                console.log(`[smart-reply] model=${modelUsed} latency=${latencyMs}ms`);

                let suggestions: string[] = [];
                try {
                    const match = text.match(/\[[\s\S]*?\]/);
                    if (match) {
                        suggestions = JSON.parse(match[0]);
                    } else {
                        suggestions = text
                            .split('\n')
                            .map((s: string) => s.replace(/^\d+[\.\)]\s*/, '').trim())
                            .filter(Boolean)
                            .slice(0, 3);
                    }
                } catch (e) {
                    suggestions = ['👍', 'Okay!', 'Got it'];
                }

                return jsonResponse({
                    success: true,
                    text,
                    suggestions,
                    modelUsed,
                    latencyMs,
                });
            }

            // ── Route: POST /api/trip-plan ───────────────────────────────────
            if (path === '/api/trip-plan') {
                const messages = Array.isArray(body.messages) ? body.messages : [];
                const participants = Array.isArray(body.participants) ? body.participants : [];
                let userPrompt = body.prompt || '';

                if (!userPrompt && messages.length > 0) {
                    const conversation = messages
                        .map((m: any) => `${m.sender || m.senderId || 'User'}: ${m.content}`)
                        .join('\n');
                    const participantList = participants
                        .map((p: any) => `- ${p.name} (from ${p.location})`)
                        .join('\n');
                    userPrompt = `Group members:\n${participantList}\n\nConversation about the trip:\n${conversation}\n\nCreate a detailed trip plan.`;
                }

                if (!userPrompt.trim()) {
                    return jsonResponse({ error: 'Trip details or messages required.' }, 400);
                }

                const systemPrompt =
                    body.systemPrompt ||
                    body.systemInstruction ||
                    `You are a trip planning assistant. Based on the group chat discussion, create a comprehensive trip plan including:
- Suggested destination
- Proposed dates/times
- Departure schedule from each participant's location
- Things to prepare
- Meeting points
Format with clear sections and markdown bullet points.`;

                const { text, modelUsed, latencyMs } = await callWithModelList(
                    apiKey,
                    FALLBACK_MODELS,
                    userPrompt,
                    systemPrompt
                );

                console.log(`[trip-plan] model=${modelUsed} latency=${latencyMs}ms`);

                return jsonResponse({
                    success: true,
                    text,
                    tripPlan: text,
                    response: text,
                    modelUsed,
                    latencyMs,
                });
            }

            // ── Route: POST /api/schedule ────────────────────────────────────
            if (path === '/api/schedule') {
                const { messageContent, scheduledTime, recipientName } = body;
                if (!messageContent || !scheduledTime) {
                    return jsonResponse({ error: 'Missing required fields: messageContent, scheduledTime' }, 400);
                }

                const scheduleDate = new Date(scheduledTime);
                if (isNaN(scheduleDate.getTime())) {
                    return jsonResponse({ error: 'Invalid scheduled time format' }, 400);
                }

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
            }

            // ── Default Route: POST / or /api/generate or /api/chat ──────────
            const prompt = body.prompt || body.query || body.userPrompt || body.text || '';
            const systemPrompt = body.systemPrompt || body.systemInstruction || '';

            if (!prompt.trim()) {
                return jsonResponse({ error: 'Prompt or query is required.' }, 400);
            }

            const { text, modelUsed, latencyMs } = await callWithModelList(
                apiKey,
                FALLBACK_MODELS,
                prompt,
                systemPrompt
            );

            console.log(`[generate] path=${path} model=${modelUsed} latency=${latencyMs}ms`);

            return jsonResponse({
                success: true,
                text,
                response: text,
                modelUsed,
                latencyMs,
            });

        } catch (err: any) {
            const msg = err?.message || String(err);
            console.error('Worker error:', msg);
            return jsonResponse({ error: `AI Service Error: ${msg}` }, 500);
        }
    },
};
