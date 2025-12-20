import { useState } from 'react';
import { scheduleMessage } from '../../services/aiService';
import { createScheduledMessage } from '../../services/scheduledMessageService';

interface ScheduleMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    chatId?: string;
    senderId?: string;
    recipientName?: string;
    onScheduleSuccess?: (scheduledTime: Date, content: string) => void;
}

export default function ScheduleMessageModal({
    isOpen,
    onClose,
    chatId,
    senderId,
    recipientName,
    onScheduleSuccess,
}: ScheduleMessageModalProps) {
    const [messageContent, setMessageContent] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!messageContent.trim()) {
            setError('Please enter a message');
            return;
        }

        if (!scheduledDate || !scheduledTime) {
            setError('Please select date and time');
            return;
        }

        const dateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        if (isNaN(dateTime.getTime())) {
            setError('Invalid date/time');
            return;
        }

        if (dateTime.getTime() <= Date.now()) {
            setError('Scheduled time must be in the future');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await scheduleMessage(messageContent.trim(), dateTime, recipientName);

            // Save to Firestore for persistence (Firebase Functions will send it)
            if (chatId && senderId) {
                await createScheduledMessage(
                    chatId,
                    senderId,
                    messageContent.trim(),
                    dateTime,
                    recipientName
                );
            }

            setSuccess(result.message);
            onScheduleSuccess?.(dateTime, messageContent.trim());

            // Reset form after success
            setTimeout(() => {
                setMessageContent('');
                setScheduledDate('');
                setScheduledTime('');
                setSuccess(null);
                onClose();
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to schedule message');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getMinDate = () => {
        const now = new Date();
        return now.toISOString().split('T')[0];
    };

    const getMinTime = () => {
        if (scheduledDate === getMinDate()) {
            const now = new Date();
            return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        }
        return '00:00';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-md rounded-lg shadow-xl overflow-hidden"
                style={{ backgroundColor: 'var(--wa-bg-panel)', border: '1px solid var(--wa-border)' }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between p-4"
                    style={{ backgroundColor: 'var(--wa-bg-deeper)', borderBottom: '1px solid var(--wa-border)' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--wa-green)' }}>
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold" style={{ color: 'var(--wa-text-primary)' }}>Schedule Message</h2>
                            {recipientName && (
                                <p className="text-sm" style={{ color: 'var(--wa-text-secondary)' }}>To: {recipientName}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-black/10 transition-colors"
                        style={{ color: 'var(--wa-icon)' }}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Limitation Banner */}
                    <div
                        className="p-3 rounded-lg text-sm flex items-start gap-2"
                        style={{ backgroundColor: 'var(--wa-green)', color: 'white' }}
                    >
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Background scheduling is limited due to free-tier constraints. Messages will send when app is open.</span>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {success}
                        </div>
                    )}

                    {/* Message Input */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--wa-text-secondary)' }}>
                            Message
                        </label>
                        <textarea
                            value={messageContent}
                            onChange={(e) => setMessageContent(e.target.value)}
                            placeholder="Type your message..."
                            className="w-full rounded-lg py-3 px-4 min-h-[100px] resize-none focus:outline-none"
                            style={{
                                backgroundColor: 'var(--wa-bg-input)',
                                color: 'var(--wa-text-primary)',
                                border: '1px solid var(--wa-border)'
                            }}
                            maxLength={500}
                        />
                        <p className="text-xs mt-1 text-right" style={{ color: 'var(--wa-text-light)' }}>
                            {messageContent.length}/500
                        </p>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--wa-text-secondary)' }}>
                                Date
                            </label>
                            <input
                                type="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                min={getMinDate()}
                                className="w-full rounded-lg py-3 px-4 focus:outline-none"
                                style={{
                                    backgroundColor: 'var(--wa-bg-input)',
                                    color: 'var(--wa-text-primary)',
                                    border: '1px solid var(--wa-border)'
                                }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--wa-text-secondary)' }}>
                                Time
                            </label>
                            <input
                                type="time"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                min={getMinTime()}
                                className="w-full rounded-lg py-3 px-4 focus:outline-none"
                                style={{
                                    backgroundColor: 'var(--wa-bg-input)',
                                    color: 'var(--wa-text-primary)',
                                    border: '1px solid var(--wa-border)'
                                }}
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting || !messageContent.trim() || !scheduledDate || !scheduledTime}
                        className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        style={{ backgroundColor: 'var(--wa-green)', color: 'white' }}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Scheduling...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Schedule Message
                            </>
                        )}
                    </button>

                    <p className="text-xs text-center" style={{ color: 'var(--wa-text-light)' }}>
                        The message will be sent automatically at the scheduled time.
                    </p>
                </form>
            </div>
        </div>
    );
}
