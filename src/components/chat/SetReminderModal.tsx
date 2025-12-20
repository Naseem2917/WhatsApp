/**
 * SetReminderModal Component
 * 
 * Modal for setting a reminder on a message.
 */

import { useState } from 'react';
import { createReminder } from '../../services/reminderService';

interface SetReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    messageId: string;
    messageContent: string;
    chatId: string;
    chatName?: string;
    userId: string;
}

export default function SetReminderModal({
    isOpen,
    onClose,
    messageId,
    messageContent,
    chatId,
    chatName,
    userId,
}: SetReminderModalProps) {
    const [reminderDate, setReminderDate] = useState('');
    const [reminderTime, setReminderTime] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const getMinDate = () => {
        const now = new Date();
        return now.toISOString().split('T')[0];
    };

    const getMinTime = () => {
        if (reminderDate === getMinDate()) {
            const now = new Date();
            return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        }
        return '00:00';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!reminderDate || !reminderTime) {
            setError('Please select date and time');
            return;
        }

        const dateTime = new Date(`${reminderDate}T${reminderTime}`);
        if (isNaN(dateTime.getTime())) {
            setError('Invalid date/time');
            return;
        }

        if (dateTime.getTime() <= Date.now()) {
            setError('Reminder time must be in the future');
            return;
        }

        setIsSubmitting(true);

        try {
            await createReminder(
                userId,
                chatId,
                messageId,
                messageContent,
                dateTime,
                chatName
            );

            setSuccess(true);
            setTimeout(() => {
                setReminderDate('');
                setReminderTime('');
                setSuccess(false);
                onClose();
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to set reminder');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setReminderDate('');
        setReminderTime('');
        setError(null);
        setSuccess(false);
        onClose();
    };

    // Quick time shortcuts
    const setQuickReminder = (minutes: number) => {
        const date = new Date(Date.now() + minutes * 60 * 1000);
        setReminderDate(date.toISOString().split('T')[0]);
        setReminderTime(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={handleClose}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-sm rounded-lg shadow-xl overflow-hidden"
                style={{ backgroundColor: 'var(--wa-bg-panel)', border: '1px solid var(--wa-border)' }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between p-4"
                    style={{ backgroundColor: 'var(--wa-bg-deeper)', borderBottom: '1px solid var(--wa-border)' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f59e0b' }}>
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold" style={{ color: 'var(--wa-text-primary)' }}>Set Reminder</h2>
                            <p className="text-xs" style={{ color: 'var(--wa-text-secondary)' }}>Get notified about this message</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
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
                    {/* Message Preview */}
                    <div
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: 'var(--wa-bg-input)', border: '1px solid var(--wa-border)' }}
                    >
                        <p className="text-xs mb-1" style={{ color: 'var(--wa-text-secondary)' }}>Message:</p>
                        <p className="text-sm line-clamp-3" style={{ color: 'var(--wa-text-primary)' }}>
                            {messageContent}
                        </p>
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
                            Reminder set successfully!
                        </div>
                    )}

                    {/* Quick Time Options */}
                    <div>
                        <p className="text-xs mb-2" style={{ color: 'var(--wa-text-secondary)' }}>Quick options:</p>
                        <div className="grid grid-cols-4 gap-2">
                            <button
                                type="button"
                                onClick={() => setQuickReminder(30)}
                                className="px-2 py-2 text-xs rounded-lg transition-colors hover:opacity-80"
                                style={{ backgroundColor: 'var(--wa-bg-input)', color: 'var(--wa-text-primary)', border: '1px solid var(--wa-border)' }}
                            >
                                30 min
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickReminder(60)}
                                className="px-2 py-2 text-xs rounded-lg transition-colors hover:opacity-80"
                                style={{ backgroundColor: 'var(--wa-bg-input)', color: 'var(--wa-text-primary)', border: '1px solid var(--wa-border)' }}
                            >
                                1 hour
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickReminder(180)}
                                className="px-2 py-2 text-xs rounded-lg transition-colors hover:opacity-80"
                                style={{ backgroundColor: 'var(--wa-bg-input)', color: 'var(--wa-text-primary)', border: '1px solid var(--wa-border)' }}
                            >
                                3 hours
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickReminder(1440)}
                                className="px-2 py-2 text-xs rounded-lg transition-colors hover:opacity-80"
                                style={{ backgroundColor: 'var(--wa-bg-input)', color: 'var(--wa-text-primary)', border: '1px solid var(--wa-border)' }}
                            >
                                Tomorrow
                            </button>
                        </div>
                    </div>

                    {/* Custom Date & Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--wa-text-secondary)' }}>
                                Date
                            </label>
                            <input
                                type="date"
                                value={reminderDate}
                                onChange={(e) => setReminderDate(e.target.value)}
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
                                value={reminderTime}
                                onChange={(e) => setReminderTime(e.target.value)}
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
                        disabled={isSubmitting || !reminderDate || !reminderTime || success}
                        className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        style={{ backgroundColor: '#f59e0b', color: 'white' }}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Setting...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                Set Reminder
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
