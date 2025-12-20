import { useState } from 'react';
import type { Message } from '../../types';
import {
    getConversationSummary,
    detectImportantMessages,
    generateTripPlan,
    getSmartReplies
} from '../../services/aiService';

interface Participant {
    name: string;
    location: string;
}

interface AIFeaturesPanelProps {
    chatId: string;
    messages: Message[];
    isGroup: boolean;
    currentUserId: string;
    participants?: Participant[];
    onClose: () => void;
    onSummaryGenerated: (summary: string) => void;
    onImportantMessagesDetected: (messageIds: string[]) => void;
    onTripPlanGenerated: (plan: string) => void;
    onSmartRepliesGenerated: (replies: string[]) => void;
    onScheduleMessage: () => void;
    onOpenTripForm?: () => void;
}

export default function AIFeaturesPanel({
    messages,
    isGroup,
    currentUserId,
    participants = [],
    onClose,
    onSummaryGenerated,
    onImportantMessagesDetected,
    onTripPlanGenerated,
    onSmartRepliesGenerated,
    onScheduleMessage,
    onOpenTripForm,
}: AIFeaturesPanelProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSummarize = async () => {
        if (messages.length < 3) {
            setError('Need at least 3 messages to summarize');
            return;
        }
        setLoading('summary');
        setError(null);
        try {
            const formattedMessages = messages.map(m => ({
                sender: m.senderId,
                content: m.content,
                timestamp: m.timestamp.toISOString(),
            }));
            const summary = await getConversationSummary(formattedMessages);
            onSummaryGenerated(summary);
            onClose();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            if (errorMessage.includes('API') || errorMessage.includes('fetch') || errorMessage.includes('network')) {
                setError('AI temporarily unavailable. Try again.');
            } else {
                setError(errorMessage || 'Failed to generate summary');
            }
            console.error('Summarize error:', err);
        } finally {
            setLoading(null);
        }
    };

    const handleDetectImportant = async () => {
        setLoading('important');
        setError(null);
        try {
            const formattedMessages = messages.map(m => ({
                id: m.id,
                sender: m.senderId,
                content: m.content,
                timestamp: m.timestamp.toISOString(),
            }));
            const importantIds = await detectImportantMessages(formattedMessages, currentUserId);
            onImportantMessagesDetected(importantIds);
            onClose();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            if (errorMessage.includes('API') || errorMessage.includes('fetch') || errorMessage.includes('network')) {
                setError('AI temporarily unavailable. Try again.');
            } else {
                setError(errorMessage || 'Failed to detect important messages');
            }
            console.error('Detect important error:', err);
        } finally {
            setLoading(null);
        }
    };

    const handleTripPlan = async () => {
        if (!isGroup) {
            setError('Trip planner is only available for group chats');
            return;
        }
        if (participants.length === 0) {
            setError('No participant locations available');
            return;
        }
        setLoading('trip');
        setError(null);
        try {
            const formattedMessages = messages.map(m => ({
                sender: m.senderId,
                content: m.content,
            }));
            const plan = await generateTripPlan(formattedMessages, participants);
            onTripPlanGenerated(plan);
            onClose();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            if (errorMessage.includes('API') || errorMessage.includes('fetch') || errorMessage.includes('network')) {
                setError('AI temporarily unavailable. Try again.');
            } else {
                setError(errorMessage || 'Failed to generate trip plan');
            }
            console.error('Trip plan error:', err);
        } finally {
            setLoading(null);
        }
    };

    const handleSmartReplies = async () => {
        if (messages.length < 2) {
            setError('Need at least 2 messages for smart replies');
            return;
        }
        setLoading('smart');
        setError(null);
        try {
            const formattedMessages = messages.slice(-10).map(m => ({
                sender: m.senderId,
                content: m.content,
                isOwn: m.senderId === currentUserId,
            }));
            const replies = await getSmartReplies(formattedMessages);
            onSmartRepliesGenerated(replies);
            onClose();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            if (errorMessage.includes('API') || errorMessage.includes('fetch') || errorMessage.includes('network')) {
                setError('AI temporarily unavailable. Try again.');
            } else {
                setError(errorMessage || 'Failed to generate smart replies');
            }
            console.error('Smart replies error:', err);
        } finally {
            setLoading(null);
        }
    };

    const features = [
        {
            id: 'summary',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            label: 'Summarize Chat',
            description: 'Get AI summary of decisions, dates & action items',
            onClick: handleSummarize,
        },
        {
            id: 'important',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
            label: 'Detect Important',
            description: 'Highlight messages that need your attention',
            onClick: handleDetectImportant,
        },
        {
            id: 'smart',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            ),
            label: 'Smart Replies',
            description: 'Get AI-suggested responses',
            onClick: handleSmartReplies,
        },
        {
            id: 'schedule',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            label: 'Schedule Message',
            description: 'Send a message at a specific time',
            onClick: onScheduleMessage,
        },
        ...(isGroup ? [{
            id: 'trip',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
            label: 'Plan Trip',
            description: 'Plan a trip with destination, dates & more',
            onClick: () => {
                if (onOpenTripForm) {
                    onOpenTripForm();
                    onClose();
                } else {
                    handleTripPlan();
                }
            },
        }] : []),
    ];

    return (
        <div className="absolute right-4 top-16 z-50 w-72 rounded-xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--wa-bg-panel)', border: '1px solid var(--wa-border)' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: 'var(--wa-border)' }}>
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--wa-green)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="font-medium" style={{ color: 'var(--wa-text-primary)' }}>AI Features</span>
                </div>
                <button onClick={onClose} className="icon-btn p-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Error message */}
            {error && (
                <div className="px-3 py-2 text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                    {error}
                </div>
            )}

            {/* Feature list */}
            <div className="p-2">
                {features.map((feature) => (
                    <button
                        key={feature.id}
                        onClick={feature.onClick}
                        disabled={loading !== null}
                        className="w-full flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-opacity-50 disabled:opacity-50"
                        style={{
                            backgroundColor: loading === feature.id ? 'var(--wa-bg-hover)' : 'transparent',
                        }}
                    >
                        <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--wa-green)', color: '#ffffff' }}>
                            {loading === feature.id ? (
                                <div className="spinner w-5 h-5" />
                            ) : (
                                feature.icon
                            )}
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-medium text-sm" style={{ color: 'var(--wa-text-primary)' }}>
                                {feature.label}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--wa-text-secondary)' }}>
                                {feature.description}
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Footer hint */}
            <div className="px-3 py-2 text-xs text-center" style={{
                backgroundColor: 'var(--wa-bg-hover)',
                color: 'var(--wa-text-light)'
            }}>
                <span style={{ color: 'var(--wa-green)' }}>⚡</span> AI features run only on request • Powered by Gemini
            </div>
        </div>
    );
}
