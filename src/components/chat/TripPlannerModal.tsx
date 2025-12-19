import { useState } from 'react';

interface TripPlannerModalProps {
    tripPlan: string;
    onClose: () => void;
}

export default function TripPlannerModal({ tripPlan, onClose }: TripPlannerModalProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(tripPlan);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Parse the trip plan into sections
    const formatTripPlan = (text: string) => {
        const lines = text.split('\n');
        const formatted: JSX.Element[] = [];
        let currentSection: string | null = null;
        let currentContent: string[] = [];

        const getSectionIcon = (section: string) => {
            const sectionLower = section.toLowerCase();
            if (sectionLower.includes('destination')) {
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                );
            }
            if (sectionLower.includes('date') || sectionLower.includes('time')) {
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                );
            }
            if (sectionLower.includes('departure') || sectionLower.includes('schedule')) {
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            }
            if (sectionLower.includes('checklist') || sectionLower.includes('prepare')) {
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                );
            }
            if (sectionLower.includes('meeting')) {
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                );
            }
            return (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
        };

        const flushSection = () => {
            if (currentSection || currentContent.length > 0) {
                formatted.push(
                    <div key={formatted.length} className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--wa-bg-hover)' }}>
                        {currentSection && (
                            <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--wa-green)' }}>
                                {getSectionIcon(currentSection)}
                                {currentSection}
                            </h3>
                        )}
                        {currentContent.length > 0 && (
                            <div className="space-y-1 pl-6">
                                {currentContent.map((item, idx) => (
                                    <p key={idx} className="text-sm" style={{ color: 'var(--wa-text-primary)' }}>
                                        {item}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>
                );
                currentSection = null;
                currentContent = [];
            }
        };

        lines.forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed) return;

            // Check for headers
            if (trimmed.startsWith('#') || trimmed.startsWith('**') || /^\d+\./.test(trimmed)) {
                flushSection();
                currentSection = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/^\d+\.\s*/, '');
            } else if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
                currentContent.push('• ' + trimmed.replace(/^[-•*]\s*/, ''));
            } else {
                currentContent.push(trimmed);
            }
        });

        flushSection();
        return formatted;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div
                className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-xl shadow-2xl overflow-hidden"
                style={{ backgroundColor: 'var(--wa-bg-panel)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--wa-border)' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--wa-green)' }}>
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="font-semibold" style={{ color: 'var(--wa-text-primary)' }}>Trip Plan</h2>
                            <p className="text-xs" style={{ color: 'var(--wa-text-secondary)' }}>AI-generated from group discussion</p>
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
                    {formatTripPlan(tripPlan)}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t" style={{ borderColor: 'var(--wa-border)' }}>
                    <span className="text-xs" style={{ color: 'var(--wa-text-light)' }}>
                        Powered by Gemini AI
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
                                    Copy Plan
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
