import { useState } from 'react';
import { getConversationSummary, detectImportantMessages, generateTripPlan } from '../../services/aiService';
import type { Message, UserProfile } from '../../types';

interface AIPanelProps {
    isOpen: boolean;
    onClose: () => void;
    messages: Message[];
    currentUserId: string;
    participants?: Array<{ user: UserProfile; location?: string }>;
    isGroup?: boolean;
}

type AIFeature = 'summary' | 'importance' | 'trip';

export default function AIPanel({
    isOpen,
    onClose,
    messages,
    currentUserId,
    participants = [],
    isGroup = false,
}: AIPanelProps) {
    const [activeFeature, setActiveFeature] = useState<AIFeature | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [importantIds, setImportantIds] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleSummary = async () => {
        setActiveFeature('summary');
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const formattedMessages = messages.map(m => ({
                sender: m.senderId === currentUserId ? 'You' : 'Other',
                content: m.content,
                timestamp: m.timestamp.toISOString(),
            }));
            const summary = await getConversationSummary(formattedMessages);
            setResult(summary);
        } catch (err) {
            setError('Failed to generate summary. Make sure the AI service is running.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImportance = async () => {
        setActiveFeature('importance');
        setIsLoading(true);
        setError(null);
        setImportantIds([]);

        try {
            const formattedMessages = messages.map(m => ({
                id: m.id,
                sender: m.senderId === currentUserId ? 'You' : 'Other',
                content: m.content,
                timestamp: m.timestamp.toISOString(),
            }));
            const ids = await detectImportantMessages(formattedMessages, currentUserId);
            setImportantIds(ids);
            if (ids.length === 0) {
                setResult('No important messages requiring your attention.');
            } else {
                setResult(`Found ${ids.length} important message(s) that may need your attention.`);
            }
        } catch (err) {
            setError('Failed to detect important messages.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTripPlan = async () => {
        setActiveFeature('trip');
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const formattedMessages = messages.map(m => ({
                sender: m.senderId === currentUserId ? 'You' : 'Other',
                content: m.content,
            }));
            const participantList = participants.map(p => ({
                name: p.user.displayName,
                location: p.location || p.user.defaultLocation || 'Unknown',
            }));
            const plan = await generateTripPlan(formattedMessages, participantList);
            setResult(plan);
        } catch (err) {
            setError('Failed to generate trip plan.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const reset = () => {
        setActiveFeature(null);
        setResult(null);
        setError(null);
        setImportantIds([]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative w-full max-w-lg bg-dark-900 rounded-2xl shadow-xl border border-dark-700 animate-fade-in max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-dark-700 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        {activeFeature && (
                            <button
                                onClick={reset}
                                className="p-1 text-dark-400 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-white">AI Assistant</h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {!activeFeature ? (
                        /* Feature Selection */
                        <div className="space-y-3">
                            <p className="text-dark-400 text-sm mb-4">
                                Choose an AI-powered feature to help with your conversation:
                            </p>

                            {/* Summary */}
                            <button
                                onClick={handleSummary}
                                className="w-full flex items-center gap-4 p-4 bg-dark-800 hover:bg-dark-700 rounded-xl transition-colors text-left"
                            >
                                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-white font-medium">Conversation Summary</h3>
                                    <p className="text-dark-400 text-sm">Get key points, decisions, and action items</p>
                                </div>
                            </button>

                            {/* Importance Detector */}
                            <button
                                onClick={handleImportance}
                                className="w-full flex items-center gap-4 p-4 bg-dark-800 hover:bg-dark-700 rounded-xl transition-colors text-left"
                            >
                                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-white font-medium">Important Messages</h3>
                                    <p className="text-dark-400 text-sm">Find messages that need your attention</p>
                                </div>
                            </button>

                            {/* Trip Planner - Only for groups */}
                            {isGroup && (
                                <button
                                    onClick={handleTripPlan}
                                    className="w-full flex items-center gap-4 p-4 bg-dark-800 hover:bg-dark-700 rounded-xl transition-colors text-left"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium">Trip Planner</h3>
                                        <p className="text-dark-400 text-sm">Create a trip plan from your group chat</p>
                                    </div>
                                </button>
                            )}
                        </div>
                    ) : (
                        /* Result Display */
                        <div>
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="spinner w-10 h-10 mb-4" />
                                    <p className="text-dark-400">AI is analyzing your conversation...</p>
                                </div>
                            ) : result ? (
                                <div className="space-y-4">
                                    <div className="bg-dark-800 rounded-xl p-4">
                                        <div className="prose prose-invert prose-sm max-w-none">
                                            <pre className="whitespace-pre-wrap text-dark-200 text-sm font-sans leading-relaxed">
                                                {result}
                                            </pre>
                                        </div>
                                    </div>

                                    {activeFeature === 'importance' && importantIds.length > 0 && (
                                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                                            <p className="text-yellow-400 text-sm">
                                                💡 Tip: Scroll through the chat to find highlighted messages that need your response.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
