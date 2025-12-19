interface SmartRepliesPanelProps {
    replies: string[];
    onSelectReply: (reply: string) => void;
    onClose: () => void;
}

export default function SmartRepliesPanel({ replies, onSelectReply, onClose }: SmartRepliesPanelProps) {
    if (replies.length === 0) return null;

    return (
        <div
            className="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-hide"
            style={{ backgroundColor: 'var(--wa-bg-hover)' }}
        >
            {/* AI indicator */}
            <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                style={{ backgroundColor: 'var(--wa-green)', color: '#ffffff' }}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI
            </div>

            {/* Suggestion chips */}
            {replies.map((reply, index) => (
                <button
                    key={index}
                    onClick={() => onSelectReply(reply)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm transition-all hover:scale-105"
                    style={{
                        backgroundColor: 'var(--wa-bg-panel)',
                        color: 'var(--wa-text-primary)',
                        border: '1px solid var(--wa-border)',
                    }}
                >
                    {reply}
                </button>
            ))}

            {/* Close button */}
            <button
                onClick={onClose}
                className="flex-shrink-0 p-1 rounded-full transition-colors"
                style={{ color: 'var(--wa-text-light)' }}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}
