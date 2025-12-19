/**
 * AISuggestionBar Component
 * 
 * Shows AI-generated suggestions above the message input.
 * Appears when incoming message has actionable intent.
 */

import type { AIChatActionResponse } from '../../services/aiService';

interface AISuggestionBarProps {
    suggestion: AIChatActionResponse;
    onAccept: () => void;
    onDismiss: () => void;
}

export default function AISuggestionBar({ suggestion, onAccept, onDismiss }: AISuggestionBarProps) {
    // Don't show if no action suggested
    if (suggestion.suggestedAction === 'none') return null;

    const getIcon = () => {
        switch (suggestion.intent) {
            case 'meeting':
                return '📅';
            case 'reminder':
                return '⏰';
            case 'question':
                return '💬';
            case 'plan':
                return '📋';
            default:
                return '💡';
        }
    };

    const getMessage = () => {
        switch (suggestion.suggestedAction) {
            case 'reply':
                return suggestion.suggestedText
                    ? `Reply: "${suggestion.suggestedText.substring(0, 50)}${suggestion.suggestedText.length > 50 ? '...' : ''}"`
                    : 'Suggested reply available';
            case 'schedule_message':
                return 'Schedule a follow-up message?';
            case 'create_reminder':
                return 'Create a reminder for this?';
            case 'summarize':
                return 'Summarize this conversation?';
            default:
                return 'AI suggestion available';
        }
    };

    return (
        <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2 animate-fade-in"
            style={{
                backgroundColor: 'rgba(37, 211, 102, 0.1)',
                border: '1px solid var(--wa-green)'
            }}
        >
            <span className="text-lg">{getIcon()}</span>
            <p className="flex-1 text-sm truncate" style={{ color: 'var(--wa-text-primary)' }}>
                {getMessage()}
            </p>
            <div className="flex gap-2 flex-shrink-0">
                <button
                    onClick={onAccept}
                    className="px-3 py-1 rounded text-sm font-medium transition-colors"
                    style={{ backgroundColor: 'var(--wa-green)', color: 'white' }}
                >
                    Accept
                </button>
                <button
                    onClick={onDismiss}
                    className="px-3 py-1 rounded text-sm transition-colors hover:bg-black/10"
                    style={{ color: 'var(--wa-text-secondary)' }}
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
}
