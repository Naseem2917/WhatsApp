import { useState } from 'react';

interface ConversationSummaryModalProps {
    summary: string;
    onClose: () => void;
}

export default function ConversationSummaryModal({ summary, onClose }: ConversationSummaryModalProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(summary);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Parse the summary into sections if it has markdown-like headers
    const formatSummary = (text: string) => {
        const lines = text.split('\n');
        const formatted: JSX.Element[] = [];
        let currentSection: string | null = null;
        let currentItems: string[] = [];

        const flushSection = () => {
            if (currentSection || currentItems.length > 0) {
                formatted.push(
                    <div key={formatted.length} className="mb-4">
                        {currentSection && (
                            <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--wa-green)' }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--wa-green)' }} />
                                {currentSection}
                            </h3>
                        )}
                        {currentItems.length > 0 && (
                            <ul className="space-y-1 pl-4">
                                {currentItems.map((item, idx) => (
                                    <li key={idx} className="text-sm" style={{ color: 'var(--wa-text-primary)' }}>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                );
                currentSection = null;
                currentItems = [];
            }
        };

        lines.forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed) return;

            // Check for headers (markdown style or numbered sections)
            if (trimmed.startsWith('#') || trimmed.startsWith('**') || /^\d+\./.test(trimmed)) {
                flushSection();
                currentSection = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/^\d+\.\s*/, '');
            } else if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
                currentItems.push(trimmed.replace(/^[-•*]\s*/, ''));
            } else {
                currentItems.push(trimmed);
            }
        });

        flushSection();
        return formatted;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div
                className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-xl shadow-2xl overflow-hidden"
                style={{ backgroundColor: 'var(--wa-bg-panel)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--wa-border)' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--wa-green)' }}>
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="font-semibold" style={{ color: 'var(--wa-text-primary)' }}>Conversation Summary</h2>
                            <p className="text-xs" style={{ color: 'var(--wa-text-secondary)' }}>AI-generated summary of this chat</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="icon-btn">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {formatSummary(summary)}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t" style={{ borderColor: 'var(--wa-border)' }}>
                    <span className="text-xs" style={{ color: 'var(--wa-text-light)' }}>
                        Generated by Gemini AI
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopy}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            style={{
                                backgroundColor: 'var(--wa-bg-hover)',
                                color: 'var(--wa-text-primary)'
                            }}
                        >
                            {copied ? (
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Copied!
                                </span>
                            ) : (
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Copy
                                </span>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                            style={{ backgroundColor: 'var(--wa-green)' }}
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
