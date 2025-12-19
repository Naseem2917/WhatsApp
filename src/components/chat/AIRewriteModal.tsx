/**
 * AIRewriteModal Component
 * 
 * Modal for AI message rewriting with tone selection.
 * Shows loading state and replaces input text on success.
 */

import { useState } from 'react';
import { rewriteMessage, type RewriteTone } from '../../services/aiService';

interface AIRewriteModalProps {
    isOpen: boolean;
    originalMessage: string;
    onClose: () => void;
    onRewrite: (rewrittenMessage: string) => void;
}

const TONE_OPTIONS: { value: RewriteTone; label: string; emoji: string }[] = [
    { value: 'professional', label: 'Professional', emoji: '💼' },
    { value: 'casual', label: 'Casual', emoji: '😊' },
    { value: 'short', label: 'Short', emoji: '⚡' },
    { value: 'polite', label: 'Polite', emoji: '🙏' },
    { value: 'friendly', label: 'Friendly', emoji: '🤗' },
];

export default function AIRewriteModal({ isOpen, originalMessage, onClose, onRewrite }: AIRewriteModalProps) {
    const [selectedTone, setSelectedTone] = useState<RewriteTone | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const handleToneSelect = async (tone: RewriteTone) => {
        if (!originalMessage.trim()) {
            setError('Please type a message first');
            return;
        }

        setSelectedTone(tone);
        setIsLoading(true);
        setError(null);
        setPreview(null);

        const result = await rewriteMessage(originalMessage, tone);

        setIsLoading(false);

        if (result.success && result.rewrittenMessage) {
            setPreview(result.rewrittenMessage);
        } else {
            setError(result.error || 'Failed to rewrite message');
        }
    };

    const handleApply = () => {
        if (preview) {
            onRewrite(preview);
            handleClose();
        }
    };

    const handleClose = () => {
        setSelectedTone(null);
        setPreview(null);
        setError(null);
        setIsLoading(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div
                className="w-full max-w-sm mx-4 rounded-lg shadow-xl overflow-hidden"
                style={{ backgroundColor: 'var(--wa-bg-panel)' }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-4 py-3"
                    style={{ backgroundColor: 'var(--wa-bg-deeper)', borderBottom: '1px solid var(--wa-border)' }}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-lg">✨</span>
                        <h2 className="font-medium" style={{ color: 'var(--wa-text-primary)' }}>Rewrite with AI</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1 rounded-full hover:bg-black/10"
                        style={{ color: 'var(--wa-icon)' }}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Original Message Preview */}
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--wa-border)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--wa-text-secondary)' }}>Original message:</p>
                    <p className="text-sm" style={{ color: 'var(--wa-text-primary)' }}>
                        {originalMessage || 'No message to rewrite'}
                    </p>
                </div>

                {/* Tone Options */}
                <div className="p-4">
                    <p className="text-xs mb-3" style={{ color: 'var(--wa-text-secondary)' }}>Select a tone:</p>
                    <div className="grid grid-cols-2 gap-2">
                        {TONE_OPTIONS.map(({ value, label, emoji }) => (
                            <button
                                key={value}
                                onClick={() => handleToneSelect(value)}
                                disabled={isLoading}
                                className={`
                                    flex items-center gap-2 px-3 py-2 rounded-lg transition-all
                                    ${selectedTone === value ? 'ring-2 ring-green-500' : ''}
                                    disabled:opacity-50
                                `}
                                style={{
                                    backgroundColor: 'var(--wa-bg-input)',
                                    color: 'var(--wa-text-primary)',
                                    border: '1px solid var(--wa-border)'
                                }}
                            >
                                <span>{emoji}</span>
                                <span className="text-sm">{label}</span>
                                {isLoading && selectedTone === value && (
                                    <div className="spinner w-4 h-4 ml-auto" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="px-4 pb-2">
                        <p className="text-sm text-red-500">{error}</p>
                    </div>
                )}

                {/* Preview */}
                {preview && (
                    <div className="px-4 pb-4">
                        <p className="text-xs mb-1" style={{ color: 'var(--wa-green)' }}>Rewritten:</p>
                        <div
                            className="p-3 rounded-lg text-sm"
                            style={{ backgroundColor: 'var(--wa-bg-input)', color: 'var(--wa-text-primary)' }}
                        >
                            {preview}
                        </div>
                        <button
                            onClick={handleApply}
                            className="w-full mt-3 py-2 rounded-lg font-medium transition-colors"
                            style={{ backgroundColor: 'var(--wa-green)', color: 'white' }}
                        >
                            Use This Message
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
