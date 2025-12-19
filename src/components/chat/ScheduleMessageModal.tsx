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
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-dark-900 rounded-2xl shadow-xl border border-dark-700 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-dark-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Schedule Message</h2>
                            {recipientName && (
                                <p className="text-dark-400 text-sm">To: {recipientName}</p>
                            )}
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
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {success}
                        </div>
                    )}

                    {/* Message Input */}
                    <div>
                        <label className="block text-dark-300 text-sm font-medium mb-2">
                            Message
                        </label>
                        <textarea
                            value={messageContent}
                            onChange={(e) => setMessageContent(e.target.value)}
                            placeholder="Type your message..."
                            className="input-field min-h-[100px] resize-none"
                            maxLength={500}
                        />
                        <p className="text-dark-500 text-xs mt-1 text-right">
                            {messageContent.length}/500
                        </p>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-dark-300 text-sm font-medium mb-2">
                                Date
                            </label>
                            <input
                                type="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                min={getMinDate()}
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="block text-dark-300 text-sm font-medium mb-2">
                                Time
                            </label>
                            <input
                                type="time"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                min={getMinTime()}
                                className="input-field"
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting || !messageContent.trim() || !scheduledDate || !scheduledTime}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="spinner" />
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

                    <p className="text-dark-500 text-xs text-center">
                        The message will be sent automatically at the scheduled time.
                    </p>
                </form>
            </div>
        </div>
    );
}
